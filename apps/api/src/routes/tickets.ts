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
} from "../services/ticket.service";

const router = Router();

/** POST /api/tickets/create — Purchase a ticket */
router.post("/create", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { event_id, tier_id, pickup_point, time_slot_id } = req.body;

    if (!event_id) {
      res.status(400).json({ success: false, error: "event_id is required" });
      return;
    }

    const result = await createTicket(req.uid!, event_id, tier_id, pickup_point, time_slot_id);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // For free events or mock payments, auto-confirm
    if (result.ticket?.status === "pending_payment") {
      // Mock payment: immediately confirm
      const confirmResult = await confirmPayment(result.ticket.id as string);
      if (confirmResult.success) {
        result.ticket.status = "confirmed";
      }
    }

    res.json({ success: true, data: result.ticket });
  } catch (err) {
    console.error("[tickets] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/tickets/confirm-payment — Confirm payment (webhook-ready) */
router.post("/confirm-payment", async (req, res) => {
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
    const { ticket_id } = req.body;

    if (!ticket_id) {
      res.status(400).json({ success: false, error: "ticket_id is required" });
      return;
    }

    const result = await checkInTicket(ticket_id);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error, data: result.ticket });
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
