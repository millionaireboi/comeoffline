import { Router } from "express";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth";
import { getDb } from "../config/firebase-admin";

const router = Router();

/**
 * GET /api/reports — Admin review queue. Enriched with reporter/reported
 * member names + event titles so the operator can act without cross-referencing.
 */
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const db = await getDb();

    let query = db.collection("reports").orderBy("created_at", "desc").limit(200);
    const snap = await query.get();
    let reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>);
    if (status && status !== "all") reports = reports.filter((r) => r.status === status);

    // Batch-enrich user names/handles + event titles
    const userIds = [...new Set(reports.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean))] as string[];
    const eventIds = [...new Set(reports.map((r) => r.event_id).filter(Boolean))] as string[];

    const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
    const [userDocs, eventDocs] = await Promise.all([
      Promise.all(chunk(userIds, 10).map((c) => db.getAll(...c.map((id) => db.collection("users").doc(id))))).then((r) => r.flat()),
      Promise.all(chunk(eventIds, 10).map((c) => db.getAll(...c.map((id) => db.collection("events").doc(id))))).then((r) => r.flat()),
    ]);
    const users = new Map(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()!]));
    const events = new Map(eventDocs.filter((d) => d.exists).map((d) => [d.id, d.data()!]));

    const enriched = reports.map((r) => {
      const reported = users.get(r.reported_user_id as string);
      const reporter = users.get(r.reporter_id as string);
      const event = r.event_id ? events.get(r.event_id as string) : null;
      return {
        ...r,
        reported_user: reported ? { id: r.reported_user_id, name: reported.name, handle: reported.handle, status: reported.status } : null,
        reporter: reporter ? { id: r.reporter_id, name: reporter.name, handle: reporter.handle } : null,
        event_title: event?.title || null,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("[reports] admin list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch reports" });
  }
});

/** PUT /api/reports/:id/status — Resolve or dismiss a report (admin) */
router.put("/:id/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!["open", "resolved", "dismissed"].includes(status)) {
      res.status(400).json({ success: false, error: "status must be open, resolved, or dismissed" });
      return;
    }
    const db = await getDb();
    const ref = db.collection("reports").doc(req.params.id as string);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Report not found" });
      return;
    }
    await ref.update({
      status,
      resolved_at: status === "open" ? null : new Date().toISOString(),
      resolved_by: status === "open" ? null : req.uid,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[reports] status update error:", err);
    res.status(500).json({ success: false, error: "Failed to update report" });
  }
});

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
