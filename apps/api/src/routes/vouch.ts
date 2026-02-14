import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getUserVouchCodes, generateVouchCodes, hasCodesForEvent } from "../services/vouch.service";

const router = Router();

/** GET /api/vouch-codes — Get current user's vouch codes */
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const codes = await getUserVouchCodes(req.uid!);
    res.json({ success: true, data: codes });
  } catch (err) {
    console.error("[vouch] fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch vouch codes" });
  }
});

/** POST /api/vouch-codes/claim — Claim vouch codes for attending an event */
router.post("/claim", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      res.status(400).json({ success: false, error: "eventId is required" });
      return;
    }

    // Check if already claimed
    const alreadyHas = await hasCodesForEvent(req.uid!, eventId);
    if (alreadyHas) {
      const existing = await getUserVouchCodes(req.uid!);
      res.json({ success: true, data: existing.filter((c) => c.earned_from_event === eventId) });
      return;
    }

    // Generate 2 codes for attending
    const codes = await generateVouchCodes(req.uid!, eventId, 2);
    res.json({ success: true, data: codes });
  } catch (err) {
    console.error("[vouch] claim error:", err);
    res.status(500).json({ success: false, error: "Failed to claim vouch codes" });
  }
});

export default router;
