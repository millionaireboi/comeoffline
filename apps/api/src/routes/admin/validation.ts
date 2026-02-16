import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { strictLimiter } from "../../middleware/rateLimit";
import { getValidationQueue, validateUser, addAdminNote } from "../../services/validation.service";
import { getPollResults } from "../../services/poll.service";
import type { ValidationDecision } from "@comeoffline/types";

const router = Router();

// In-memory cache for validation queue (2 minute TTL to reduce quota usage)
let validationQueueCache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/** GET /api/admin/validation-queue — Get provisional users pending validation */
router.get("/validation-queue", strictLimiter, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.event_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 30;
    const cacheKey = `${eventId || "all"}_${limit}`;

    // Return cached data if available and fresh
    const cached = validationQueueCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json({
        success: true,
        data: cached.data,
        cached: true,
      });
      return;
    }

    const queue = await getValidationQueue(eventId, limit);

    // Update cache
    validationQueueCache.set(cacheKey, { data: queue, timestamp: Date.now() });

    res.json({ success: true, data: queue });
  } catch (err) {
    console.error("[validation] queue error:", err);

    const error = err as { code?: number; message?: string };

    // Handle quota exhaustion gracefully
    if (error.code === 8 || (error.message && error.message.includes("RESOURCE_EXHAUSTED"))) {
      const cacheKey = (req.query.event_id as string | undefined) || "all";
      const cached = validationQueueCache.get(cacheKey);

      if (cached) {
        console.warn("[validation] Quota exceeded, returning stale cache");
        res.json({
          success: true,
          data: cached.data,
          cached: true,
          stale: true,
        });
        return;
      }

      res.status(429).json({
        success: false,
        error: "Firestore quota exceeded. Try again in a few minutes.",
      });
      return;
    }

    res.status(500).json({ success: false, error: "Internal server error" });
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
    validationQueueCache.clear();

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
