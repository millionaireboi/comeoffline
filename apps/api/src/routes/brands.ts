import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../middleware/auth";
import { submitBrandInquiry, getBrandInquiries, updateBrandStatus } from "../services/brands.service";

const router = Router();

/** POST /api/brands — Submit brand inquiry (public) */
router.post("/", async (req, res) => {
  try {
    const { name, email, brand, role, interest } = req.body;
    if (!name || !email || !brand) {
      res.status(400).json({ success: false, error: "name, email, and brand are required" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, error: "invalid email format" });
      return;
    }
    if (req.body._hp) {
      res.json({ success: true, data: { id: "ok" } });
      return;
    }
    const inquiry = await submitBrandInquiry(name, email, brand, role || "", interest || "");
    res.json({ success: true, data: inquiry });
  } catch (err) {
    console.error("[brands] submit error:", err);
    res.status(500).json({ success: false, error: "Failed to submit" });
  }
});

/** GET /api/admin/brands — List brand inquiries (admin) */
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const inquiries = await getBrandInquiries(status);
    res.json({ success: true, data: inquiries });
  } catch (err) {
    console.error("[brands] list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch" });
  }
});

/** PUT /api/admin/brands/:id/status — Update brand inquiry status (admin) */
router.put("/:id/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, notes } = req.body;
    if (!["contacted", "in_progress", "closed"].includes(status)) {
      res.status(400).json({ success: false, error: "invalid status" });
      return;
    }
    const updated = await updateBrandStatus(req.params.id as string, req.uid!, status, notes);
    if (!updated) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[brands] update error:", err);
    res.status(500).json({ success: false, error: "Failed to update" });
  }
});

export default router;
