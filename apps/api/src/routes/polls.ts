import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getEventPoll, submitVotes, createPoll } from "../services/poll.service";

const router = Router();

/** GET /api/events/:id/poll — Get the community poll for an event */
router.get("/:id/poll", requireAuth, async (req: AuthRequest, res) => {
  try {
    const poll = await getEventPoll(req.params.id as string);
    res.json({ success: true, data: poll });
  } catch (err) {
    console.error("[polls] get error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/events/:id/community-poll — Submit votes */
router.post("/:id/community-poll", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { votes } = req.body;

    if (!votes || !Array.isArray(votes)) {
      res.status(400).json({ success: false, error: "votes array is required" });
      return;
    }

    const result = await submitVotes(req.params.id as string, req.uid!, votes);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[polls] vote error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/events/:id/create-poll — Create a poll (admin) */
router.post("/:id/create-poll", requireAuth, async (req: AuthRequest, res) => {
  try {
    const poll = await createPoll(req.params.id as string);
    res.json({ success: true, data: poll });
  } catch (err) {
    console.error("[polls] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
