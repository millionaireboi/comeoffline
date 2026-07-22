import { Router } from "express";
import { requireRole, type AuthRequest } from "../../middleware/auth";

// creator_ops mints creators' discount codes, so the role shares this surface
const requireAdmin = requireRole("creator_ops");
import {
  listDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
} from "../../services/discount.service";

const router = Router();

/** GET /api/admin/discounts — List all discount codes */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const codes = await listDiscountCodes();
    res.json({ success: true, data: codes });
  } catch (err) {
    console.error("[admin/discounts] list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/discounts — Create a discount code */
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { code, type, value, event_id, event_title, max_uses, expires_at } = req.body;

    if (!code || typeof code !== "string") {
      res.status(400).json({ success: false, error: "code is required" });
      return;
    }
    if (type !== "percent" && type !== "flat") {
      res.status(400).json({ success: false, error: "type must be 'percent' or 'flat'" });
      return;
    }
    if (typeof value !== "number" || !isFinite(value)) {
      res.status(400).json({ success: false, error: "value must be a number" });
      return;
    }
    if (max_uses != null && (typeof max_uses !== "number" || max_uses < 1)) {
      res.status(400).json({ success: false, error: "max_uses must be a positive number" });
      return;
    }
    if (expires_at != null && isNaN(new Date(expires_at).getTime())) {
      res.status(400).json({ success: false, error: "expires_at must be a valid date" });
      return;
    }

    const result = await createDiscountCode({
      code,
      type,
      value,
      event_id: event_id || null,
      event_title: event_title || null,
      max_uses: max_uses ?? null,
      expires_at: expires_at || null,
      created_by: req.uid,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/discounts] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** PUT /api/admin/discounts/:code — Update a discount code (toggle active, limits, expiry) */
router.put("/:code", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { active, max_uses, expires_at } = req.body;

    if (active !== undefined && typeof active !== "boolean") {
      res.status(400).json({ success: false, error: "active must be a boolean" });
      return;
    }
    if (max_uses !== undefined && max_uses !== null && (typeof max_uses !== "number" || max_uses < 1)) {
      res.status(400).json({ success: false, error: "max_uses must be a positive number or null" });
      return;
    }
    if (expires_at !== undefined && expires_at !== null && isNaN(new Date(expires_at).getTime())) {
      res.status(400).json({ success: false, error: "expires_at must be a valid date or null" });
      return;
    }

    const result = await updateDiscountCode(req.params.code as string, { active, max_uses, expires_at });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/discounts] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/admin/discounts/:code — Delete a discount code */
router.delete("/:code", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await deleteDiscountCode(req.params.code as string);
    if (!result.success) {
      res.status(404).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/discounts] delete error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
