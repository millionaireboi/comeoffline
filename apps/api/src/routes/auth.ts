import { Router } from "express";
import { validateCode, validateHandoffToken, chatbotEntry, signInByHandle } from "../services/auth.service";
import { strictLimiter, signInLimiter } from "../middleware/rateLimit";

const router = Router();

/** POST /api/auth/validate-code — Validate invite/vouch code */
router.post("/validate-code", async (req, res) => {
  try {
    const { code, name, handle, vibe_tag, source, utm_source, utm_medium, utm_campaign } = req.body;

    if (!code || typeof code !== "string") {
      res.status(400).json({ success: false, error: "Code is required" });
      return;
    }

    const utmParams = (utm_source || utm_medium || utm_campaign)
      ? { utm_source, utm_medium, utm_campaign }
      : undefined;

    const result = await validateCode(code, name, handle, vibe_tag, source, utmParams);

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

/** POST /api/auth/sign-in — Sign in returning user by handle */
router.post("/sign-in", signInLimiter, async (req, res) => {
  try {
    const { handle } = req.body;

    if (!handle || typeof handle !== "string") {
      res.status(400).json({ success: false, error: "Handle is required" });
      return;
    }

    const result = await signInByHandle(handle);

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
      },
    });
  } catch (err) {
    console.error("[auth] sign-in error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/chatbot-entry — Create provisional user from chatbot vibe check */
router.post("/chatbot-entry", strictLimiter, async (req, res) => {
  try {
    const { name, instagram_handle, vibe_answers } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({ success: false, error: "Name is too long" });
      return;
    }

    if (instagram_handle && (typeof instagram_handle !== "string" || instagram_handle.length > 30)) {
      res.status(400).json({ success: false, error: "Invalid instagram handle" });
      return;
    }

    if (vibe_answers) {
      if (!Array.isArray(vibe_answers) || vibe_answers.length > 20) {
        res.status(400).json({ success: false, error: "Invalid vibe answers" });
        return;
      }
      for (const a of vibe_answers) {
        if (!a.question || !a.answer || a.question.length > 500 || a.answer.length > 500) {
          res.status(400).json({ success: false, error: "Invalid vibe answer format" });
          return;
        }
      }
    }

    const result = await chatbotEntry(name.trim(), instagram_handle, vibe_answers);

    if (!result.success) {
      if (result.error === "vibe_check_failed") {
        res.status(200).json({ success: false, error: "vibe_check_failed" });
        return;
      }
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
