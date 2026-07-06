import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getDb } from "../config/firebase-admin";

const router = Router();

const VALID_CONTEXTS = new Set(["connection", "attendee", "reconnect", "other"]);

/**
 * POST /api/reports — Report a member (safety).
 * Stored for admin review; admins can deactivate users from the members tab.
 */
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reported_user_id, context, details, event_id } = req.body;

    if (!reported_user_id || typeof reported_user_id !== "string") {
      res.status(400).json({ success: false, error: "reported_user_id is required" });
      return;
    }
    if (reported_user_id === req.uid) {
      res.status(400).json({ success: false, error: "Cannot report yourself" });
      return;
    }

    const db = await getDb();

    // One open report per reporter+reported pair — repeat taps are no-ops
    const existing = await db
      .collection("reports")
      .where("reporter_id", "==", req.uid)
      .where("reported_user_id", "==", reported_user_id)
      .where("status", "==", "open")
      .limit(1)
      .get();
    if (!existing.empty) {
      res.json({ success: true, data: { id: existing.docs[0].id, duplicate: true } });
      return;
    }

    const ref = await db.collection("reports").add({
      reporter_id: req.uid,
      reported_user_id,
      context: VALID_CONTEXTS.has(context) ? context : "other",
      details: typeof details === "string" ? details.slice(0, 1000) : "",
      event_id: typeof event_id === "string" ? event_id : null,
      status: "open",
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ success: true, data: { id: ref.id } });
  } catch (err) {
    console.error("[reports] create error:", err);
    res.status(500).json({ success: false, error: "Failed to submit report" });
  }
});

export default router;
