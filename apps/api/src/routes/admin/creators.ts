import { Router } from "express";
import { requireAdmin, requireRole, type AuthRequest } from "../../middleware/auth";
import { getDb } from "../../config/firebase-admin";
import {
  listCreators,
  createCreator,
  updateCreator,
  recordPayout,
  deleteCreator,
  publishDraft,
  discardDraft,
  listCampaigns,
  upsertCampaign,
  deleteCampaign,
} from "../../services/creators.service";

const router = Router();

/** creator_ops (acquisition role) can work the whole creator surface EXCEPT
 *  money recording (payouts), deletion, and page-draft approval — those stay
 *  founder-only below. */
const ops = requireRole("creator_ops");

/** GET /api/admin/creators/member-options — minimal member list (uid, name,
 *  handle ONLY) for the link-their-account picker. Exists so creator_ops
 *  never needs the PII-heavy members endpoint. */
router.get("/member-options", ops, async (_req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const snap = await db.collection("users").get();
    const options = snap.docs.map((d) => {
      const u = d.data() as { name?: string; handle?: string };
      return { id: d.id, name: u.name ?? "", handle: u.handle ?? "" };
    });
    res.json({ success: true, data: options });
  } catch (err) {
    console.error("[admin/creators] member-options error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/creators — all creators with computed earnings */
router.get("/", ops, async (_req: AuthRequest, res) => {
  try {
    const creators = await listCreators();
    res.json({ success: true, data: creators });
  } catch (err) {
    console.error("[admin/creators] list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/creators — onboard a creator */
router.post("/", ops, async (req: AuthRequest, res) => {
  try {
    const { handle, name, rate_per_ticket, rate_per_100_clicks, activation_sales, discount_code, user_uid, page } = req.body;
    if (!handle || typeof handle !== "string") {
      res.status(400).json({ success: false, error: "handle is required" });
      return;
    }
    if (typeof rate_per_ticket !== "number") {
      res.status(400).json({ success: false, error: "rate_per_ticket is required (number, ₹ per seat)" });
      return;
    }
    const result = await createCreator({
      handle,
      name: typeof name === "string" ? name : handle,
      rate_per_ticket,
      rate_per_100_clicks: typeof rate_per_100_clicks === "number" ? rate_per_100_clicks : undefined,
      activation_sales: typeof activation_sales === "number" ? activation_sales : undefined,
      discount_code: typeof discount_code === "string" ? discount_code : undefined,
      user_uid: typeof user_uid === "string" ? user_uid : undefined,
      page: page && typeof page === "object" ? page : undefined,
      created_by: req.uid,
    });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/creators] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/creators/campaigns — all event campaigns (registered
 *  before the :handle routes so "campaigns" never parses as a handle) */
router.get("/campaigns", ops, async (_req: AuthRequest, res) => {
  try {
    const campaigns = await listCampaigns();
    res.json({ success: true, data: campaigns });
  } catch (err) {
    console.error("[admin/creators] campaigns list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** PUT /api/admin/creators/campaigns — create/update a campaign for an event title */
router.put("/campaigns", ops, async (req: AuthRequest, res) => {
  try {
    const { title_match, commission_per_seat, brief, formats, active } = req.body;
    if (!title_match || typeof title_match !== "string") {
      res.status(400).json({ success: false, error: "title_match is required" });
      return;
    }
    if (typeof commission_per_seat !== "number") {
      res.status(400).json({ success: false, error: "commission_per_seat is required (₹ per seat)" });
      return;
    }
    const result = await upsertCampaign({ title_match, commission_per_seat, brief, formats, active });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/creators] campaign upsert error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/admin/creators/campaigns/:titleMatch */
router.delete("/campaigns/:titleMatch", ops, async (req: AuthRequest, res) => {
  try {
    const result = await deleteCampaign(req.params.titleMatch as string);
    if (!result.success) {
      res.status(404).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/creators] campaign delete error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** PUT /api/admin/creators/:handle — rate, code, uid link, page config, active */
router.put("/:handle", ops, async (req: AuthRequest, res) => {
  try {
    const { name, active, rate_per_ticket, rate_per_100_clicks, activation_sales, discount_code, user_uid, page } = req.body;
    const result = await updateCreator(req.params.handle as string, {
      name,
      active,
      rate_per_ticket,
      rate_per_100_clicks,
      activation_sales,
      discount_code,
      user_uid,
      page,
    });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/creators] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/creators/:handle/payouts — record a manual UPI payment */
router.post("/:handle/payouts", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { amount, date, note } = req.body;
    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ success: false, error: "amount must be a number > 0" });
      return;
    }
    const result = await recordPayout(req.params.handle as string, {
      amount,
      date: typeof date === "string" ? date : undefined,
      note: typeof note === "string" ? note : undefined,
    });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/creators] payout error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/creators/:handle/draft/publish — approve a creator's page draft */
router.post("/:handle/draft/publish", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await publishDraft(req.params.handle as string);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/creators] publish draft error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/admin/creators/:handle/draft — discard a creator's page draft */
router.delete("/:handle/draft", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await discardDraft(req.params.handle as string);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/creators] discard draft error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/admin/creators/:handle */
router.delete("/:handle", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await deleteCreator(req.params.handle as string);
    if (!result.success) {
      res.status(404).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/creators] delete error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
