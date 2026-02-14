import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import {
  getChatbotSettings,
  updateChatbotSettings,
  getVouchSettings,
  updateVouchSettings,
} from "../../services/settings.service";

const router = Router();

/** GET /api/admin/settings/chatbot — Get chatbot settings */
router.get("/chatbot", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const settings = await getChatbotSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error("[settings] chatbot fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

/** PUT /api/admin/settings/chatbot — Update chatbot settings */
router.put("/chatbot", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { system_prompt } = req.body;
    if (!system_prompt) {
      res.status(400).json({ success: false, error: "system_prompt is required" });
      return;
    }
    await updateChatbotSettings({ system_prompt });
    res.json({ success: true });
  } catch (err) {
    console.error("[settings] chatbot update error:", err);
    res.status(500).json({ success: false, error: "Failed to update settings" });
  }
});

/** GET /api/admin/settings/vouch — Get vouch settings */
router.get("/vouch", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const settings = await getVouchSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error("[settings] vouch fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

/** PUT /api/admin/settings/vouch — Update vouch settings */
router.put("/vouch", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { codes_first, codes_repeat, reconnect_hours, noshow_penalty } = req.body;
    await updateVouchSettings({
      ...(codes_first !== undefined && { codes_first }),
      ...(codes_repeat !== undefined && { codes_repeat }),
      ...(reconnect_hours !== undefined && { reconnect_hours }),
      ...(noshow_penalty !== undefined && { noshow_penalty }),
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[settings] vouch update error:", err);
    res.status(500).json({ success: false, error: "Failed to update settings" });
  }
});

export default router;
