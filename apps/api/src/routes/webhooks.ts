import { Router, type Request, type Response } from "express";
import { verifyWebhookSignature } from "../services/razorpay.service";
import { confirmPayment } from "../services/ticket.service";

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

      if (!result.success) {
        console.warn(`[webhook] confirmPayment for ${ticketId}:`, result.error);
      }
    }

    // Always 200 to prevent Razorpay retries
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[webhook] Razorpay webhook error:", err);
    res.status(200).json({ success: true });
  }
});

export default router;
