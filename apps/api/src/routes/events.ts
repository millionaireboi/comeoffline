import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getEvents, getEventById, getPublicEvents, getPublicEvent } from "../services/events.service";

const router = Router();

/** GET /api/events/public — List upcoming events (no auth, for landing page) */
router.get("/public", async (_req, res) => {
  try {
    const events = await getPublicEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    console.error("[events] public list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
});

/** GET /api/events/public/:id — Single public event (no auth, for OG/share pages) */
router.get("/public/:id", async (req, res) => {
  try {
    const event = await getPublicEvent(req.params.id as string);
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error("[events] public single error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch event" });
  }
});

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

/** GET /api/events/:id/seating — Lightweight seating data for real-time polling */
router.get("/:id/seating", requireAuth, async (req: AuthRequest, res) => {
  try {
    const event = await getEventById(req.params.id as string);
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: event.seating || null });
  } catch (err) {
    console.error("[events] seating error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch seating" });
  }
});

/** GET /api/events/:id/addon-seating — Live add-on seating data for real-time polling */
router.get("/:id/addon-seating", requireAuth, async (req: AuthRequest, res) => {
  try {
    const event = await getEventById(req.params.id as string);
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }

    // Extract add-on seating from checkout steps
    const addonSeating: Record<string, { enabled: boolean; spots: unknown[]; floor_plan_url?: string; allow_choice: boolean }> = {};
    const steps = event.checkout?.steps || [];
    for (const step of steps) {
      if (step.type !== "addon_select" || !step.add_ons) continue;
      for (const addon of step.add_ons) {
        if (addon.seating?.enabled) {
          addonSeating[addon.id] = addon.seating;
        }
      }
    }

    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: addonSeating });
  } catch (err) {
    console.error("[events] addon-seating error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch addon seating" });
  }
});

export default router;
