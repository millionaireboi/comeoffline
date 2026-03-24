import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { strictLimiter } from "../../middleware/rateLimit";
import { getValidationQueue, validateUser, addAdminNote } from "../../services/validation.service";
import { getPollResults } from "../../services/poll.service";
import type { ValidationDecision } from "@comeoffline/types";
import { withCache, invalidateCacheByPrefix, isQuotaError } from "../../utils/cache";

const router = Router();

/** GET /api/admin/validation-queue — Get provisional users pending validation */
router.get("/validation-queue", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.event_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 30;

    const queue = await withCache(
      () => getValidationQueue(eventId, limit),
      { key: `admin-validation-${eventId || "all"}_${limit}`, ttl: 2 * 60 * 1000 },
    );

    res.json({ success: true, data: queue });
  } catch (err) {
    console.error("[validation] queue error:", err);
    const s = isQuotaError(err) ? 429 : 500;
    res.status(s).json({ success: false, error: isQuotaError(err) ? "Firestore quota exceeded. Try again in a few minutes." : "Internal server error" });
  }
});

/** PUT /api/admin/users/:id/validate — Validate a user */
router.put("/users/:id/validate", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { decision, event_id } = req.body;

    if (!decision || !["approved", "another_chance", "revoked"].includes(decision)) {
      res.status(400).json({ success: false, error: "Valid decision is required" });
      return;
    }

    const result = await validateUser(
      req.params.id as string,
      decision as ValidationDecision,
      req.uid!,
      event_id,
    );

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Invalidate validation queue cache after successful validation
    invalidateCacheByPrefix("admin-validation-");

    res.json({ success: true });
  } catch (err) {
    console.error("[validation] validate error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/events/:id/notes — Add admin note for a user */
router.post("/events/:id/notes", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { user_id, note } = req.body;

    if (!user_id || !note) {
      res.status(400).json({ success: false, error: "user_id and note are required" });
      return;
    }

    await addAdminNote(req.params.id as string, user_id, note, req.uid!);
    res.json({ success: true });
  } catch (err) {
    console.error("[validation] note error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/events/:id/poll-results — Get poll results for event */
router.get("/events/:id/poll-results", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const results = await getPollResults(req.params.id as string);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error("[validation] poll results error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
