import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { createRsvp, getUserRsvp, cancelRsvp } from "../services/rsvp.service";

const router = Router();

/** POST /api/events/:eventId/rsvp — RSVP to an event */
router.post("/:eventId/rsvp", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pickup_point } = req.body;
    const result = await createRsvp(
      req.params.eventId as string,
      req.uid!,
      pickup_point,
    );

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.rsvp });
  } catch (err) {
    console.error("[rsvp] create error:", err);
    res.status(500).json({ success: false, error: "Failed to create RSVP" });
  }
});

/** GET /api/events/:eventId/rsvp — Get user's RSVP for this event */
router.get("/:eventId/rsvp", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rsvp = await getUserRsvp(req.params.eventId as string, req.uid!);
    res.json({ success: true, data: rsvp });
  } catch (err) {
    console.error("[rsvp] get error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch RSVP" });
  }
});

/** DELETE /api/events/:eventId/rsvp/:rsvpId — Cancel RSVP */
router.delete("/:eventId/rsvp/:rsvpId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cancelled = await cancelRsvp(
      req.params.eventId as string,
      req.params.rsvpId as string,
      req.uid!,
    );

    if (!cancelled) {
      res.status(404).json({ success: false, error: "RSVP not found or already cancelled" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[rsvp] cancel error:", err);
    res.status(500).json({ success: false, error: "Failed to cancel RSVP" });
  }
});

export default router;
