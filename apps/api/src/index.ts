import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { generalLimiter, authLimiter, adminLimiter, formLimiter } from "./middleware/rateLimit";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import eventsRouter from "./routes/events";
import adminEventsRouter from "./routes/admin/events";
import rsvpRouter from "./routes/rsvp";
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

// Apply general rate limiting to all routes
app.use("/api", generalLimiter);

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/events", rsvpRouter);
app.use("/api/events", memoriesRouter);
app.use("/api/events", connectionsRouter);
app.use("/api/vouch-codes", vouchRouter);
app.use("/api/users", profileRouter);
app.use("/api/chat", chatRouter);
app.use("/api/applications", formLimiter, applicationsRouter);
app.use("/api/admin/events", adminLimiter, adminEventsRouter);
app.use("/api/admin/events", adminLimiter, adminContentRouter);
app.use("/api/admin/applications", adminLimiter, applicationsRouter);
app.use("/api/admin/members", adminLimiter, adminMembersRouter);
app.use("/api/admin/settings", adminLimiter, adminSettingsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/events", pollsRouter);
app.use("/api/admin", adminLimiter, adminValidationRouter);
app.use("/api/admin", adminLimiter, adminDashboardRouter);
app.use("/api/admin", adminLimiter, adminNotificationsRouter);
app.use("/api/admin", adminLimiter, adminVouchRouter);
app.use("/api/contact", formLimiter, contactRouter);
app.use("/api/brands", formLimiter, brandsRouter);
app.use("/api/admin/contact", adminLimiter, contactRouter);
app.use("/api/admin/brands", adminLimiter, brandsRouter);
app.use("/api/admin", adminLimiter, adminUploadRouter);
app.use("/api/admin", adminLimiter, adminFloorplanRouter);
app.use("/api/admin/bookings", adminLimiter, adminBookingsRouter);
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
  const HOLD_MAX_AGE_MS = 10 * 60 * 1000;

  setInterval(async () => {
    try {
      const { getDb } = await import("./config/firebase-admin");
      const { cancelTicket } = await import("./services/ticket.service");
      const db = await getDb();

      const cutoff = new Date(Date.now() - HOLD_MAX_AGE_MS).toISOString();
      const staleSnap = await db
        .collection("tickets")
        .where("status", "==", "pending_payment")
        .where("purchased_at", "<", cutoff)
        .get();

      if (staleSnap.empty) return;

      console.log(`[cleanup] Found ${staleSnap.size} stale pending_payment tickets`);

      for (const doc of staleSnap.docs) {
        const ticket = doc.data();
        try {
          await cancelTicket(doc.id, ticket.user_id);
          console.log(`[cleanup] Cancelled stale ticket ${doc.id}`);
        } catch (err) {
          console.error(`[cleanup] Failed to cancel ticket ${doc.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[cleanup] Hold cleanup error:", err);
    }
  }, HOLD_CLEANUP_INTERVAL_MS);

  console.log("[api] Seat hold cleanup interval started (every 2 min)");
});

export default app;
