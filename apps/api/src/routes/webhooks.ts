import { Router, type Request, type Response } from "express";
import { verifyWebhookSignature } from "../services/razorpay.service";
import { confirmPayment } from "../services/ticket.service";
import { posthog } from "../config/posthog";
import { getDb } from "../config/firebase-admin";

const router = Router();

/** POST /api/webhooks/razorpay — Razorpay payment webhook (no auth, verified via HMAC signature) */
router.post("/razorpay", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!signature) {
      res.status(400).json({ success: false, error: "Missing signature" });
      return;
    }

    const rawBody = (req as any).rawBody as string;

    if (!rawBody) {
      console.error("[webhook] No raw body available for signature verification");
      res.status(400).json({ success: false, error: "Missing body" });
      return;
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[webhook] Invalid Razorpay signature");
      res.status(401).json({ success: false, error: "Invalid signature" });
      return;
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment_link.paid") {
      const paymentLinkEntity = payload.payload.payment_link.entity;
      const ticketId = paymentLinkEntity.notes?.ticket_id;

      if (!ticketId) {
        console.warn("[webhook] payment_link.paid but no ticket_id in notes");
        res.status(200).json({ success: true });
        return;
      }

      console.log(`[webhook] Payment confirmed for ticket: ${ticketId}`);
      const result = await confirmPayment(ticketId);

      if (result.success && posthog) {
        try {
          const db = await getDb();
          const ticketDoc = await db.collection("tickets").doc(ticketId).get();
          const ticket = ticketDoc.data();
          if (ticket) {
            posthog.capture({
              distinctId: ticket.user_id,
              event: "checkout_completed_server",
              properties: {
                event_id: ticket.event_id,
                ticket_id: ticketId,
                tier_id: ticket.tier_id,
                revenue: ticket.price,
                currency: "INR",
                source: "razorpay_webhook",
              },
            });
          }
        } catch (phErr) {
          console.warn("[webhook] PostHog capture failed (non-blocking):", phErr);
        }
      }

      if (!result.success) {
        // Non-retryable errors: ticket already processed or permanently invalid
        // Return 200 to acknowledge — retrying won't help and 24h of failures disables the webhook
        const nonRetryable = [
          "Ticket not found",
          "Ticket is not pending payment",
          "ticket cannot be confirmed",
        ];
        if (nonRetryable.some((msg) => result.error?.includes(msg))) {
          console.warn(`[webhook] confirmPayment non-retryable for ${ticketId}:`, result.error);
          res.status(200).json({ success: true });
          return;
        }

        // Retryable error (e.g. Firestore transient failure, event status issue)
        // Return 500 so Razorpay retries with exponential backoff
        console.error(`[webhook] confirmPayment retryable failure for ${ticketId}:`, result.error);
        res.status(500).json({ success: false, error: "Payment confirmation failed" });
        return;
      }
    }

    // Acknowledge all other events with 200
    res.status(200).json({ success: true });
  } catch (err) {
    // Unexpected errors are retryable — return 500 for Razorpay to retry
    console.error("[webhook] Razorpay webhook error:", err);
    res.status(500).json({ success: false, error: "Internal webhook error" });
  }
});

export default router;
