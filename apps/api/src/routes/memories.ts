import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getEventMemories } from "../services/memories.service";

const router = Router();

/** GET /api/events/:eventId/memories — Get memories for a completed event */
router.get("/:eventId/memories", requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const memories = await getEventMemories(eventId);
    res.json({ success: true, data: memories });
  } catch (err) {
    console.error("[memories] fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch memories" });
  }
});

export default router;
