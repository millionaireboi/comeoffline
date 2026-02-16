import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { strictLimiter } from "../../middleware/rateLimit";
import {
  sendToAudience,
  createNotificationRecord,
  getNotificationHistory,
} from "../../services/notification.service";

const router = Router();

/** POST /api/admin/notifications — Send a push notification */
router.post("/notifications", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, body, audience } = req.body;

    if (!title || !body || !audience) {
      res.status(400).json({ success: false, error: "title, body, and audience are required" });
      return;
    }

    const result = await sendToAudience(audience, title, body);

    // Record in history
    await createNotificationRecord(title, body, audience, req.uid!, result.sent, result.failed);

    res.json({
      success: true,
      data: { sent: result.sent, failed: result.failed },
    });
  } catch (err) {
    console.error("[admin/notifications] send error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/notifications — Get notification history */
router.get("/notifications", requireAdmin, async (_req, res) => {
  try {
    const history = await getNotificationHistory();
    res.json({ success: true, data: history });
  } catch (err) {
    console.error("[admin/notifications] history error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
