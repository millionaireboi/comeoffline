import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getPublicCreatorPage, getCreatorByUid, computeEarnings } from "../services/creators.service";

const router = Router();

/**
 * GET /api/creators/public/:handle — sanitized page config for /with/<handle>.
 * Called server-side by the landing app (revalidate 60). Never returns rates,
 * payouts, or earnings.
 */
router.get("/public/:handle", async (req, res) => {
  try {
    const page = await getPublicCreatorPage(req.params.handle as string);
    if (!page) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }
    res.json({ success: true, data: page });
  } catch (err) {
    console.error("[creators] public page error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/creators/me — the logged-in member's creator record + earnings.
 * Powers the app's creator studio. 404 for non-creators (the app uses that
 * to hide the studio entry point). Sales are anonymized in the service —
 * never buyer PII.
 */
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const creator = await getCreatorByUid(req.uid as string);
    if (!creator || !creator.active) {
      res.status(404).json({ success: false, error: "not a creator" });
      return;
    }
    const earnings = await computeEarnings(creator);
    res.json({
      success: true,
      data: {
        handle: creator.handle,
        name: creator.name,
        rate_per_ticket: creator.rate_per_ticket,
        activation_sales: creator.activation_sales,
        discount_code: creator.discount_code,
        payouts: creator.payouts ?? [],
        earnings,
      },
    });
  } catch (err) {
    console.error("[creators] me error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
