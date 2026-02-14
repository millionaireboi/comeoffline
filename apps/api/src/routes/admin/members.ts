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
    res.status(500).json({ success: false, error: "Failed to fetch members" });
  }
});

export default router;
