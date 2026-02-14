import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import {
  addPolaroid,
  addQuote,
  updateEventStats,
  getEventPolaroids,
  getEventQuotes,
  getEventStats,
} from "../../services/memories.service";

const router = Router();

/** GET /api/admin/events/:eventId/content — Get all content for an event */
router.get("/:eventId/content", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const [polaroids, quotes, stats] = await Promise.all([
      getEventPolaroids(eventId),
      getEventQuotes(eventId),
      getEventStats(eventId),
    ]);
    res.json({ success: true, data: { polaroids, quotes, stats } });
  } catch (err) {
    console.error("[admin/content] fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch content" });
  }
});

/** POST /api/admin/events/:eventId/polaroids — Add a polaroid */
router.post("/:eventId/polaroids", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const { url, caption, who, color, rotation } = req.body;

    if (!url) {
      res.status(400).json({ success: false, error: "url is required" });
      return;
    }

    const polaroid = await addPolaroid(eventId, {
      url,
      caption: caption || "",
      who: who || "",
      color: color || "#FAF6F0",
      rotation: rotation ?? Math.random() * 10 - 5,
    });

    res.json({ success: true, data: polaroid });
  } catch (err) {
    console.error("[admin/content] add polaroid error:", err);
    res.status(500).json({ success: false, error: "Failed to add polaroid" });
  }
});

/** POST /api/admin/events/:eventId/quotes — Add an overheard quote */
router.post("/:eventId/quotes", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const { quote, context } = req.body;

    if (!quote) {
      res.status(400).json({ success: false, error: "quote is required" });
      return;
    }

    const result = await addQuote(eventId, {
      quote,
      context: context || "",
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[admin/content] add quote error:", err);
    res.status(500).json({ success: false, error: "Failed to add quote" });
  }
});

/** PUT /api/admin/events/:eventId/stats — Update event stats */
router.put("/:eventId/stats", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const { attended, phones, drinks, hours } = req.body;

    await updateEventStats(eventId, {
      attended: attended ?? 0,
      phones: phones ?? 0,
      drinks: drinks ?? 0,
      hours: hours ?? "0",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[admin/content] update stats error:", err);
    res.status(500).json({ success: false, error: "Failed to update stats" });
  }
});

export default router;
