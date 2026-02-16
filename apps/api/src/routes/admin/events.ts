import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
} from "../../services/events.service";

const router = Router();

/** GET /api/admin/events — List all events (including drafts) */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const events = await getAllEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    console.error("[admin/events] list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
});

/** GET /api/admin/events/:id — Get single event */
router.get("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const event = await getEventById(req.params.id as string);
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error("[admin/events] get error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch event" });
  }
});

/** POST /api/admin/events — Create event */
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const event = await createEvent(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error("[admin/events] create error:", err);
    const message = err instanceof Error ? err.message : "Failed to create event";
    const status = message.includes("required") ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/** PUT /api/admin/events/:id — Update event */
router.put("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const event = await updateEvent(req.params.id as string, req.body);
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error("[admin/events] update error:", err);
    res.status(500).json({ success: false, error: "Failed to update event" });
  }
});

/** PUT /api/admin/events/:id/status — Update event status */
router.put("/:id/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: "Status is required" });
      return;
    }

    const updated = await updateEventStatus(req.params.id as string, status);
    if (!updated) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/events] status error:", err);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
});

export default router;
