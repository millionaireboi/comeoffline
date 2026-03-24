import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import {
  createAdminCodes,
  getAdminCodes,
  updateCode,
  deleteCode,
  createSeedCodes,
} from "../../services/vouch.service";
import type { VouchCodeType, VouchCodeRules } from "@comeoffline/types";
import { withCache, invalidateCache } from "../../utils/cache";

const router = Router();

/** POST /api/admin/vouch-codes/create — Create codes with full rule support */
router.post("/vouch-codes/create", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const {
    count = 1,
    label,
    description,
    type = "single",
    custom_code,
    rules,
  } = req.body;

  if (count < 1 || count > 100) {
    res.status(400).json({ success: false, error: "count must be between 1 and 100" });
    return;
  }

  // Build rules from request
  const codeRules: VouchCodeRules = {
    max_uses: type === "unlimited" ? null : (rules?.max_uses || (type === "single" ? 1 : 10)),
    ...(rules?.expires_at && { expires_at: rules.expires_at }),
    ...(rules?.valid_from && { valid_from: rules.valid_from }),
  };

  // Custom code only allowed for single-code creation
  if (custom_code && count > 1) {
    res.status(400).json({ success: false, error: "Custom code only works when count is 1" });
    return;
  }

  const codes = await createAdminCodes({
    adminId: req.uid!,
    type: type as VouchCodeType,
    rules: codeRules,
    label: label?.trim() || undefined,
    description: description?.trim() || undefined,
    customCode: custom_code?.trim() || undefined,
    count,
  });

  invalidateCache("admin-vouch-codes");
  res.json({ success: true, data: codes });
}));

/** GET /api/admin/vouch-codes — Get all admin codes */
router.get("/vouch-codes", requireAdmin, asyncHandler(async (_req, res) => {
  const codes = await withCache(() => getAdminCodes(), {
    key: "admin-vouch-codes",
    ttl: 5 * 60 * 1000,
  });
  res.json({ success: true, data: codes });
}));

/** PUT /api/admin/vouch-codes/:id — Update code rules/status */
router.put("/vouch-codes/:id", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const codeId = req.params.id as string;
  const { status, rules, label, description } = req.body;

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (rules) updates.rules = rules;
  if (label !== undefined) updates.label = label || null;
  if (description !== undefined) updates.description = description || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: "No updates provided" });
    return;
  }

  await updateCode(codeId, updates as Parameters<typeof updateCode>[1]);
  invalidateCache("admin-vouch-codes");
  res.json({ success: true });
}));

/** DELETE /api/admin/vouch-codes/:id — Delete a code */
router.delete("/vouch-codes/:id", requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const codeId = req.params.id as string;
  await deleteCode(codeId);
  invalidateCache("admin-vouch-codes");
  res.json({ success: true });
}));

export default router;
