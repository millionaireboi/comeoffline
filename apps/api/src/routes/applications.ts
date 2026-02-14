import { Router } from "express";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth";
import {
  submitApplication,
  getApplications,
  approveApplication,
  rejectApplication,
} from "../services/applications.service";

const router = Router();

/** POST /api/applications — Submit a prove-yourself application */
router.post("/", async (req, res) => {
  try {
    const { name, answers } = req.body;

    if (!name || !answers || !Array.isArray(answers)) {
      res.status(400).json({ success: false, error: "name and answers are required" });
      return;
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
    const applications = await getApplications(status);
    res.json({ success: true, data: applications });
  } catch (err) {
    console.error("[applications] list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch applications" });
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
    res.json({ success: true });
  } catch (err) {
    console.error("[applications] reject error:", err);
    res.status(500).json({ success: false, error: "Failed to reject" });
  }
});

export default router;
