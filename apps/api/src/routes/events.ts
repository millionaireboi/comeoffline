import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getEvents, getEventById } from "../services/events.service";

const router = Router();

/** GET /api/events — List all upcoming events */
router.get("/", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const events = await getEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    console.error("[events] list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
});

/** GET /api/events/:id — Get single event */
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const event = await getEventById(req.params.id as string);
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error("[events] get error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch event" });
  }
});

export default router;
