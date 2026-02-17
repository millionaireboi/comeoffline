import { Router } from "express";
import { validateCode, validateHandoffToken, chatbotEntry } from "../services/auth.service";

const router = Router();

/** POST /api/auth/validate-code — Validate invite/vouch code */
router.post("/validate-code", async (req, res) => {
  try {
    const { code, name, handle, vibe_tag } = req.body;

    if (!code || typeof code !== "string") {
      res.status(400).json({ success: false, error: "Code is required" });
      return;
    }

    const result = await validateCode(code, name, handle, vibe_tag);

    if (!result.valid) {
      res.status(401).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: {
        token: result.token,
        handoff_token: result.handoff_token,
        user: result.user,
      },
    });
  } catch (err) {
    console.error("[auth] validate-code error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/validate-token — Validate a handoff token from landing/chatbot redirect */
router.post("/validate-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ success: false, error: "Token is required" });
      return;
    }

    const result = await validateHandoffToken(token);

    if (!result.valid) {
      res.status(401).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
        has_seen_welcome: result.has_seen_welcome,
        source: result.source,
      },
    });
  } catch (err) {
    console.error("[auth] validate-token error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/chatbot-entry — Create provisional user from chatbot vibe check */
router.post("/chatbot-entry", async (req, res) => {
  try {
    const { name, instagram_handle, vibe_answers } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    const result = await chatbotEntry(name, instagram_handle, vibe_answers);

    if (!result.success) {
      res.status(500).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: {
        handoff_token: result.handoff_token,
        user_id: result.user_id,
      },
    });
  } catch (err) {
    console.error("[auth] chatbot-entry error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
