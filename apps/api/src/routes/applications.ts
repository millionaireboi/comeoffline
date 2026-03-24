import { Router } from "express";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth";
import {
  submitApplication,
  getApplications,
  approveApplication,
  rejectApplication,
} from "../services/applications.service";
import { withCache, invalidateCacheByPrefix, isQuotaError } from "../utils/cache";

const router = Router();

/** POST /api/applications — Submit a prove-yourself application */
router.post("/", async (req, res) => {
  try {
    const { name, answers } = req.body;

    if (!name || !answers || !Array.isArray(answers)) {
      res.status(400).json({ success: false, error: "name and answers are required" });
      return;
    }
    if (typeof name !== "string" || name.length > 100) {
      res.status(400).json({ success: false, error: "name must be a string, max 100 characters" });
      return;
    }
    if (answers.length > 20) {
      res.status(400).json({ success: false, error: "too many answers (max 20)" });
      return;
    }
    for (const a of answers) {
      if (!a || typeof a.question !== "string" || typeof a.answer !== "string") {
        res.status(400).json({ success: false, error: "each answer must have question and answer strings" });
        return;
      }
      if (a.question.length > 500 || a.answer.length > 2000) {
        res.status(400).json({ success: false, error: "answer text too long" });
        return;
      }
    }

    const application = await submitApplication(name, answers);
    res.json({ success: true, data: application });
  } catch (err) {
    console.error("[applications] submit error:", err);
    res.status(500).json({ success: false, error: "Failed to submit application" });
  }
});

/** GET /api/admin/applications — List applications (admin) */
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const applications = await withCache(() => getApplications(status), {
      key: `admin-apps-${status || "all"}`,
      ttl: 3 * 60 * 1000,
    });
    res.json({ success: true, data: applications });
  } catch (err) {
    console.error("[applications] list error:", err);
    const s = isQuotaError(err) ? 429 : 500;
    res.status(s).json({ success: false, error: isQuotaError(err) ? "Firestore quota exceeded. Try again in a few minutes." : "Failed to fetch applications" });
  }
});

/** PUT /api/admin/applications/:id/approve — Approve application */
router.put("/:id/approve", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const result = await approveApplication(id, req.uid!);
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    invalidateCacheByPrefix("admin-apps-");
    res.json({ success: true });
  } catch (err) {
    console.error("[applications] approve error:", err);
    res.status(500).json({ success: false, error: "Failed to approve" });
  }
});

/** PUT /api/admin/applications/:id/reject — Reject application */
router.put("/:id/reject", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const rejected = await rejectApplication(id, req.uid!);
    if (!rejected) {
      res.status(404).json({ success: false, error: "Application not found" });
      return;
    }
    invalidateCacheByPrefix("admin-apps-");
    res.json({ success: true });
  } catch (err) {
    console.error("[applications] reject error:", err);
    res.status(500).json({ success: false, error: "Failed to reject" });
  }
});

export default router;
