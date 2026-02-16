import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { chat, checkRateLimit } from "../services/chat.service";

const router = Router();

/** POST /api/chat/public — Landing page chatbot (no auth, IP-based rate limit) */
router.post("/public", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: "messages array is required" });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const allowed = await checkRateLimit(`ip:${ip}`);
    if (!allowed) {
      res.status(429).json({ success: false, error: "slow down — try again in a bit." });
      return;
    }

    const response = await chat(messages);
    res.json({ success: true, data: { message: response } });
  } catch (err) {
    console.error("[chat] public error:", err);
    res.status(500).json({ success: false, error: "Chat failed — try again" });
  }
});

/** POST /api/chat — Send a message to the chatbot */
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: "messages array is required" });
      return;
    }

    // Rate limit check
    const allowed = await checkRateLimit(req.uid!);
    if (!allowed) {
      res.status(429).json({
        success: false,
        error: "slow down — you've hit the message limit. try again in a bit.",
      });
      return;
    }

    const response = await chat(messages, req.uid);
    res.json({ success: true, data: { message: response } });
  } catch (err) {
    console.error("[chat] error:", err);
    res.status(500).json({ success: false, error: "Chat failed — try again" });
  }
});

export default router;
