import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { createSeedCodes, getSeedCodes } from "../../services/vouch.service";

const router = Router();

/** POST /api/admin/vouch-codes/create — Create seed invite codes */
router.post("/vouch-codes/create", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { count, label } = req.body;

    if (!count || count < 1 || count > 100) {
      res.status(400).json({ success: false, error: "count must be between 1 and 100" });
      return;
    }

    const codes = await createSeedCodes(req.uid!, count, label);
    res.json({ success: true, data: codes });
  } catch (err) {
    console.error("[admin/vouch] create seed codes error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/vouch-codes — Get all seed codes with usage tracking */
router.get("/vouch-codes", requireAdmin, async (_req, res) => {
  try {
    const codes = await getSeedCodes();
    res.json({ success: true, data: codes });
  } catch (err) {
    console.error("[admin/vouch] get seed codes error:", err);

    const error = err as Error;

    // Check if it's a quota error
    if (error.message && error.message.includes('quota')) {
      res.status(429).json({
        success: false,
        error: "Firestore quota exceeded. Data may be cached. Try again in a few minutes.",
        cached: true
      });
      return;
    }

    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
