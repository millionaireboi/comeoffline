import { Router } from "express";
import { requireRole, type AuthRequest } from "../../middleware/auth";
import { getDb } from "../../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();

/**
 * Creator acquisition pipeline — the CRM the creator-ops role works out of.
 * One doc per prospect in `creator_prospects`, moving through stages:
 * reachout → pitched → onboarded | not_interested. Notes are an append-only
 * log so context survives handoffs.
 */

export const STAGES = ["reachout", "pitched", "onboarded", "not_interested"] as const;
type Stage = (typeof STAGES)[number];

interface Prospect {
  id: string;
  name: string;
  ig_handle: string | null;
  phone: string | null;
  email: string | null;
  followers: string | null; // freeform: "12k", "150k" — a signal, not a number to compute on
  stage: Stage;
  notes: { text: string; at: string; by: string | null }[];
  /** Set when onboarded — links the pipeline card to the live creator */
  creator_handle: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const guard = requireRole("creator_ops");

const clean = (v: unknown, max = 120): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** GET /api/admin/prospects — whole pipeline, newest first */
router.get("/", guard, async (_req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const snap = await db.collection("creator_prospects").get();
    const prospects = snap.docs
      .map((d) => d.data() as Prospect)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    res.json({ success: true, data: prospects });
  } catch (err) {
    console.error("[admin/prospects] list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/prospects — add a prospect (starts at reachout) */
router.post("/", guard, async (req: AuthRequest, res) => {
  try {
    const name = clean(req.body?.name, 80);
    if (!name) {
      res.status(400).json({ success: false, error: "name is required" });
      return;
    }
    const db = await getDb();
    const ref = db.collection("creator_prospects").doc();
    const now = new Date().toISOString();
    const note = clean(req.body?.note, 500);
    const prospect: Prospect = {
      id: ref.id,
      name,
      ig_handle: clean(req.body?.ig_handle, 60),
      phone: clean(req.body?.phone, 20),
      email: clean(req.body?.email, 120),
      followers: clean(req.body?.followers, 20),
      stage: "reachout",
      notes: note ? [{ text: note, at: now, by: req.uid ?? null }] : [],
      creator_handle: null,
      created_at: now,
      updated_at: now,
      created_by: req.uid ?? null,
    };
    await ref.set(prospect);
    res.status(201).json({ success: true, data: prospect });
  } catch (err) {
    console.error("[admin/prospects] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** PUT /api/admin/prospects/:id — stage moves + contact edits */
router.put("/:id", guard, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const ref = db.collection("creator_prospects").doc(req.params.id as string);
    if (!(await ref.get()).exists) {
      res.status(404).json({ success: false, error: "prospect not found" });
      return;
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const { stage, name, ig_handle, phone, email, followers, creator_handle } = req.body ?? {};
    if (stage !== undefined) {
      if (!STAGES.includes(stage)) {
        res.status(400).json({ success: false, error: `stage must be one of: ${STAGES.join(", ")}` });
        return;
      }
      updates.stage = stage;
    }
    if (name !== undefined && clean(name, 80)) updates.name = clean(name, 80);
    if (ig_handle !== undefined) updates.ig_handle = clean(ig_handle, 60);
    if (phone !== undefined) updates.phone = clean(phone, 20);
    if (email !== undefined) updates.email = clean(email, 120);
    if (followers !== undefined) updates.followers = clean(followers, 20);
    if (creator_handle !== undefined) updates.creator_handle = clean(creator_handle, 32);
    await ref.update(updates);
    res.json({ success: true, data: (await ref.get()).data() });
  } catch (err) {
    console.error("[admin/prospects] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/prospects/:id/notes — append to the log */
router.post("/:id/notes", guard, async (req: AuthRequest, res) => {
  try {
    const text = clean(req.body?.text, 500);
    if (!text) {
      res.status(400).json({ success: false, error: "text is required" });
      return;
    }
    const db = await getDb();
    const ref = db.collection("creator_prospects").doc(req.params.id as string);
    if (!(await ref.get()).exists) {
      res.status(404).json({ success: false, error: "prospect not found" });
      return;
    }
    await ref.update({
      notes: FieldValue.arrayUnion({ text, at: new Date().toISOString(), by: req.uid ?? null }),
      updated_at: new Date().toISOString(),
    });
    res.status(201).json({ success: true, data: (await ref.get()).data() });
  } catch (err) {
    console.error("[admin/prospects] note error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/admin/prospects/:id */
router.delete("/:id", guard, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const ref = db.collection("creator_prospects").doc(req.params.id as string);
    if (!(await ref.get()).exists) {
      res.status(404).json({ success: false, error: "prospect not found" });
      return;
    }
    await ref.delete();
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/prospects] delete error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
