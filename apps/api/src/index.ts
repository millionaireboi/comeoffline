import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { generalLimiter, authLimiter, adminLimiter, formLimiter } from "./middleware/rateLimit";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import eventsRouter, { publicEventsRouter } from "./routes/events";
import adminEventsRouter from "./routes/admin/events";
import rsvpRouter from "./routes/rsvp";
import waitlistRouter from "./routes/waitlist";
import memoriesRouter from "./routes/memories";
import connectionsRouter from "./routes/connections";
import vouchRouter from "./routes/vouch";
import adminContentRouter from "./routes/admin/content";
import profileRouter from "./routes/profile";
import chatRouter from "./routes/chat";
import applicationsRouter from "./routes/applications";
import adminMembersRouter from "./routes/admin/members";
import adminSettingsRouter from "./routes/admin/settings";
import ticketsRouter from "./routes/tickets";
import pollsRouter from "./routes/polls";
import adminValidationRouter from "./routes/admin/validation";
import adminDashboardRouter from "./routes/admin/dashboard";
import adminNotificationsRouter from "./routes/admin/notifications";
import adminVouchRouter from "./routes/admin/vouch";
import contactRouter from "./routes/contact";
import brandsRouter from "./routes/brands";
import adminUploadRouter from "./routes/admin/upload";
import adminFloorplanRouter from "./routes/admin/floorplan";
import adminBookingsRouter from "./routes/admin/bookings";
import webhooksRouter from "./routes/webhooks";
import { shutdownPostHog } from "./config/posthog";

const app = express();

// Trust proxy (required for correct IP in rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(cors({ origin: env.allowedOrigins, credentials: true }));
app.use(express.json({
  limit: "10mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// Public read-only endpoints — exempt from rate limiting (high traffic, no auth)
app.use("/api/events/public", publicEventsRouter);

// Admin routes — only adminLimiter, exempt from generalLimiter to avoid double-counting
app.use("/api/admin/events", adminLimiter, adminEventsRouter);
app.use("/api/admin/events", adminLimiter, adminContentRouter);
app.use("/api/admin/applications", adminLimiter, applicationsRouter);
app.use("/api/admin/members", adminLimiter, adminMembersRouter);
app.use("/api/admin/settings", adminLimiter, adminSettingsRouter);
app.use("/api/admin", adminLimiter, adminValidationRouter);
app.use("/api/admin", adminLimiter, adminDashboardRouter);
app.use("/api/admin", adminLimiter, adminNotificationsRouter);
app.use("/api/admin", adminLimiter, adminVouchRouter);
app.use("/api/admin/contact", adminLimiter, contactRouter);
app.use("/api/admin/brands", adminLimiter, brandsRouter);
app.use("/api/admin", adminLimiter, adminUploadRouter);
app.use("/api/admin", adminLimiter, adminFloorplanRouter);
app.use("/api/admin/bookings", adminLimiter, adminBookingsRouter);

// Apply general rate limiting to all non-admin routes
app.use("/api", generalLimiter);

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/events", rsvpRouter);
app.use("/api/events", waitlistRouter);
app.use("/api/events", memoriesRouter);
app.use("/api/events", connectionsRouter);
app.use("/api/vouch-codes", vouchRouter);
app.use("/api/users", profileRouter);
app.use("/api/chat", chatRouter);
app.use("/api/applications", formLimiter, applicationsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/events", pollsRouter);
app.use("/api/contact", formLimiter, contactRouter);
app.use("/api/brands", formLimiter, brandsRouter);
app.use("/api/webhooks", webhooksRouter);

// Error handling
app.use(errorHandler);

// Flush PostHog events on shutdown
process.on("SIGTERM", async () => {
  await shutdownPostHog();
  process.exit(0);
});

app.listen(env.port, () => {
  console.log(`[api] comeoffline API running on port ${env.port}`);

  // Proactive cleanup of stale seat holds every 2 minutes
  const HOLD_CLEANUP_INTERVAL_MS = 2 * 60 * 1000;
  const HOLD_MAX_AGE_MS = 16 * 60 * 1000; // Aligned with payment link expiry (16 min)
  const LOCK_TTL_MS = 60 * 1000; // Lock expires after 60s (prevents deadlock if instance crashes)

  setInterval(async () => {
    try {
      const { getDb } = await import("./config/firebase-admin");
      const { cancelTicket, confirmPayment } = await import("./services/ticket.service");
      const { fetchPaymentLinkStatus, cancelPaymentLink } = await import("./services/razorpay.service");
      const db = await getDb();

      // Distributed lock — only one instance runs cleanup at a time
      const lockRef = db.collection("_system").doc("cleanup_lock");
      const now = Date.now();
      const acquired = await db.runTransaction(async (tx) => {
        const lockDoc = await tx.get(lockRef);
        const lockData = lockDoc.data();
        if (lockData && lockData.locked_until > now) {
          return false; // Another instance holds the lock
        }
        tx.set(lockRef, { locked_until: now + LOCK_TTL_MS, acquired_at: new Date().toISOString() });
        return true;
      });

      if (!acquired) return;

      try {
        const cutoff = new Date(Date.now() - HOLD_MAX_AGE_MS).toISOString();
        const staleSnap = await db
          .collection("tickets")
          .where("status", "==", "pending_payment")
          .where("purchased_at", "<", cutoff)
          .get();

        if (staleSnap.empty) return;

        console.log(`[cleanup] Found ${staleSnap.size} stale pending_payment tickets`);
        let confirmed = 0, cancelled = 0, failed = 0;

        for (const doc of staleSnap.docs) {
          const ticket = doc.data();
          try {
            // Reconcile with Razorpay before cancelling — check if user actually paid
            if (ticket.payment_link_id) {
              const linkStatus = await fetchPaymentLinkStatus(ticket.payment_link_id);
              if (linkStatus?.status === "paid") {
                // User paid but webhook was lost — confirm the ticket
                console.log(`[cleanup] Reconciling paid ticket ${doc.id} (webhook was lost)`);
                const result = await confirmPayment(doc.id);
                if (result.success) {
                  confirmed++;
                  continue;
                }
                console.warn(`[cleanup] Reconciliation failed for ${doc.id}:`, result.error);
                // Fall through to cancel if confirmation failed (e.g. seat lost)
              }
            }

            await cancelTicket(doc.id, ticket.user_id);
            cancelled++;
            console.log(`[cleanup] Cancelled stale ticket ${doc.id}`);

            // Cancel the Razorpay payment link to prevent late payments
            if (ticket.payment_link_id) {
              cancelPaymentLink(ticket.payment_link_id).catch((e) =>
                console.error(`[cleanup] Failed to cancel payment link for ${doc.id}:`, e),
              );
            }
          } catch (err) {
            failed++;
            console.error(`[cleanup] Failed to process ticket ${doc.id}:`, err);
          }
        }

        console.log(`[cleanup] Done: ${confirmed} reconciled, ${cancelled} cancelled, ${failed} failed`);

        // Clean up old webhook dedup records (older than 24h)
        const dedupeExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const oldDedupes = await db
          .collection("processed_webhooks")
          .where("processed_at", "<", dedupeExpiry)
          .limit(100)
          .get();
        if (!oldDedupes.empty) {
          const batch = db.batch();
          oldDedupes.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit().catch((e) => console.warn("[cleanup] Dedup cleanup failed:", e));
        }

        // Clean up expired handoff tokens (older than 1h, generous buffer over 15min TTL)
        const handoffExpiry = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const oldHandoffs = await db
          .collection("handoff_tokens")
          .where("expires_at", "<", handoffExpiry)
          .limit(200)
          .get();
        if (!oldHandoffs.empty) {
          const batch2 = db.batch();
          oldHandoffs.docs.forEach((d) => batch2.delete(d.ref));
          await batch2.commit().catch((e) => console.warn("[cleanup] Handoff token cleanup failed:", e));
        }
      } finally {
        // Release lock
        await lockRef.delete().catch(() => {});
      }
    } catch (err) {
      console.error("[cleanup] Hold cleanup error:", err);
    }
  }, HOLD_CLEANUP_INTERVAL_MS);

  console.log("[api] Seat hold cleanup + reconciliation interval started (every 2 min)");
});

export default app;
