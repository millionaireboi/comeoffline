import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getEventAttendees, createConnection } from "../services/connections.service";

const router = Router();

/** GET /api/events/:eventId/attendees — Get attendees with connection status */
router.get("/:eventId/attendees", requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const attendees = await getEventAttendees(eventId, req.uid!);
    res.json({ success: true, data: attendees });
  } catch (err) {
    console.error("[connections] attendees error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch attendees" });
  }
});

/** POST /api/events/:eventId/connect — Send a connection request */
router.post("/:eventId/connect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const { toUserId } = req.body;

    if (!toUserId) {
      res.status(400).json({ success: false, error: "toUserId is required" });
      return;
    }

    if (toUserId === req.uid) {
      res.status(400).json({ success: false, error: "Cannot connect with yourself" });
      return;
    }

    const result = await createConnection(eventId, req.uid!, toUserId);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create connection";
    if (message.includes("window")) {
      res.status(400).json({ success: false, error: message });
      return;
    }
    console.error("[connections] create error:", err);
    res.status(500).json({ success: false, error: "Failed to create connection" });
  }
});

export default router;
