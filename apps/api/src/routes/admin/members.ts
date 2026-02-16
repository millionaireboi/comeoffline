import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { getUsers } from "../../services/applications.service";

const router = Router();

/** GET /api/admin/members — List all members */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const users = await getUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    console.error("[admin/members] list error:", err);

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

    res.status(500).json({ success: false, error: "Failed to fetch members" });
  }
});

export default router;
