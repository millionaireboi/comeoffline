import { Router } from "express";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth";
import {
  createTicket,
  confirmPayment,
  cancelTicket,
  getUserTickets,
  getUserEventTicket,
  checkInTicket,
  getEventTickets,
  attachPaymentLink,
} from "../services/ticket.service";
import { createPaymentLink, cancelPaymentLink } from "../services/razorpay.service";
import { getDb } from "../config/firebase-admin";
import { strictLimiter } from "../middleware/rateLimit";

const router = Router();

/** POST /api/tickets/create — Purchase a ticket */
router.post("/create", requireAuth, strictLimiter, async (req: AuthRequest, res) => {
  try {
    const { event_id, tier_id, pickup_point, time_slot_id, add_ons, seat_id, section_id, spot_seat_id } = req.body;

    // Input validation
    if (!event_id || typeof event_id !== "string") {
      res.status(400).json({ success: false, error: "event_id is required" });
      return;
    }
    if (tier_id !== undefined && typeof tier_id !== "string") {
      res.status(400).json({ success: false, error: "Invalid tier_id" });
      return;
    }
    if (add_ons !== undefined) {
      if (!Array.isArray(add_ons)) {
        res.status(400).json({ success: false, error: "add_ons must be an array" });
        return;
      }
      for (const addon of add_ons) {
        if (!addon.addon_id || typeof addon.addon_id !== "string" || typeof addon.quantity !== "number") {
          res.status(400).json({ success: false, error: "Each add-on must have addon_id (string) and quantity (number)" });
          return;
        }
      }
    }

    const result = await createTicket(req.uid!, event_id, tier_id, pickup_point, time_slot_id, add_ons, seat_id, section_id, spot_seat_id);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // For paid events, create a Razorpay Payment Link
    if (result.ticket?.status === "pending_payment") {
      const db = await getDb();
      const [userDoc, eventDoc] = await Promise.all([
        db.collection("users").doc(req.uid!).get(),
        db.collection("events").doc(event_id).get(),
      ]);
      const userName = userDoc.exists ? (userDoc.data()!.name as string) : "Customer";
      const eventTitle = eventDoc.exists ? (eventDoc.data()!.title as string) : "Event";

      console.log("[tickets] Creating payment link:", {
        amount: result.ticket.price,
        ticketId: result.ticket.id,
        eventTitle,
        customerName: userName,
      });

      const linkResult = await createPaymentLink({
        amount: result.ticket.price as number,
        ticketId: result.ticket.id as string,
        eventTitle,
        customerName: userName,
      });

      if (!linkResult.success) {
        // Payment link failed — cancel the ticket so user can retry
        console.error("[tickets] Payment link failed:", linkResult.error);
        await cancelTicket(result.ticket.id as string, req.uid!);
        res.status(502).json({ success: false, error: "Could not create payment link. Please try again." });
        return;
      }

      try {
        await attachPaymentLink(
          result.ticket.id as string,
          linkResult.payment_link_id!,
          linkResult.payment_url!,
        );
      } catch (attachErr) {
        // Payment link was created but we couldn't store it — cancel ticket and kill orphaned link
        console.error("[tickets] attachPaymentLink failed:", attachErr);
        await cancelTicket(result.ticket.id as string, req.uid!);
        cancelPaymentLink(linkResult.payment_link_id!).catch((e) =>
          console.error("[tickets] Failed to cancel orphaned payment link:", e),
        );
        res.status(502).json({ success: false, error: "Could not finalize payment link. Please try again." });
        return;
      }

      result.ticket.payment_url = linkResult.payment_url;
      result.ticket.payment_link_id = linkResult.payment_link_id;
    }

    res.status(201).json({ success: true, data: result.ticket });
  } catch (err) {
    console.error("[tickets] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/tickets/confirm-payment — Confirm payment (admin only) */
router.post("/confirm-payment", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ticket_id } = req.body;

    if (!ticket_id) {
      res.status(400).json({ success: false, error: "ticket_id is required" });
      return;
    }

    const result = await confirmPayment(ticket_id);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[tickets] confirm-payment error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/tickets/mine — Get current user's tickets */
router.get("/mine", requireAuth, async (req: AuthRequest, res) => {
  try {
    const tickets = await getUserTickets(req.uid!);
    res.json({ success: true, data: tickets });
  } catch (err) {
    console.error("[tickets] mine error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/tickets/event/:eventId — Get user's ticket for a specific event */
router.get("/event/:eventId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const ticket = await getUserEventTicket(req.uid!, req.params.eventId as string);
    res.json({ success: true, data: ticket });
  } catch (err) {
    console.error("[tickets] event ticket error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/tickets/:id/status — Check ticket payment status (for polling after payment) */
router.get("/:id/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const ticketDoc = await db.collection("tickets").doc(req.params.id as string).get();

    if (!ticketDoc.exists) {
      res.status(404).json({ success: false, error: "Ticket not found" });
      return;
    }

    const ticket = ticketDoc.data()!;

    if (ticket.user_id !== req.uid) {
      res.status(403).json({ success: false, error: "Not your ticket" });
      return;
    }

    res.json({
      success: true,
      data: { id: ticketDoc.id, status: ticket.status, event_id: ticket.event_id },
    });
  } catch (err) {
    console.error("[tickets] status check error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/tickets/:id — Cancel a ticket */
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await cancelTicket(req.params.id as string, req.uid!);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[tickets] cancel error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/tickets/check-in — Check in a ticket (admin) */
router.post("/check-in", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { ticket_id, event_id, signature, headcount } = req.body;

    if (!ticket_id) {
      res.status(400).json({ success: false, error: "ticket_id is required" });
      return;
    }

    const result = await checkInTicket(ticket_id, {
      event_id,
      signature,
      checked_in_by: req.uid,
      headcount: headcount ? parseInt(headcount, 10) : undefined,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error, error_code: result.error_code, data: result.ticket });
      return;
    }

    res.json({ success: true, data: result.ticket });
  } catch (err) {
    console.error("[tickets] check-in error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/events/:eventId/tickets — Get all tickets for an event (admin) */
router.get("/admin/events/:eventId/tickets", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const tickets = await getEventTickets(req.params.eventId as string);
    res.json({ success: true, data: tickets });
  } catch (err) {
    console.error("[tickets] event tickets error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
