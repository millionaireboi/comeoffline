import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import {
  listCreators,
  createCreator,
  updateCreator,
  recordPayout,
  deleteCreator,
} from "../../services/creators.service";

const router = Router();

/** GET /api/admin/creators — all creators with computed earnings */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const creators = await listCreators();
    res.json({ success: true, data: creators });
  } catch (err) {
    console.error("[admin/creators] list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/creators — onboard a creator */
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { handle, name, rate_per_ticket, activation_sales, discount_code, user_uid, page } = req.body;
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

/** PUT /api/admin/creators/:handle — rate, code, uid link, page config, active */
router.put("/:handle", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, active, rate_per_ticket, activation_sales, discount_code, user_uid, page } = req.body;
    const result = await updateCreator(req.params.handle as string, {
      name,
      active,
      rate_per_ticket,
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
