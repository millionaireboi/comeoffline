import { Router } from "express";
import { validateCode } from "../services/auth.service";

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
      data: { token: result.token, user: result.user },
    });
  } catch (err) {
    console.error("[auth] validate-code error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
