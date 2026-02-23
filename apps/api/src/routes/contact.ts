import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../middleware/auth";
import { submitContact, getContactSubmissions, markContactRead } from "../services/contact.service";

const router = Router();

/** POST /api/contact — Submit contact form (public) */
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      res.status(400).json({ success: false, error: "name, email, and message are required" });
      return;
    }
    if (typeof name !== "string" || name.length > 100) {
      res.status(400).json({ success: false, error: "name must be a string, max 100 characters" });
      return;
    }
    if (typeof email !== "string" || email.length > 254) {
      res.status(400).json({ success: false, error: "email must be a string, max 254 characters" });
      return;
    }
    if (typeof message !== "string" || message.length > 5000) {
      res.status(400).json({ success: false, error: "message must be a string, max 5000 characters" });
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, error: "invalid email format" });
      return;
    }
    // Honeypot check
    if (req.body._hp) {
      res.json({ success: true, data: { id: "ok" } });
      return;
    }
    const submission = await submitContact(name, email, message);
    res.json({ success: true, data: submission });
  } catch (err) {
    console.error("[contact] submit error:", err);
    res.status(500).json({ success: false, error: "Failed to submit" });
  }
});

/** GET /api/admin/contact — List contact submissions (admin) */
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const submissions = await getContactSubmissions(status);
    res.json({ success: true, data: submissions });
  } catch (err) {
    console.error("[contact] list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch" });
  }
});

/** PUT /api/admin/contact/:id/status — Update contact status (admin) */
router.put("/:id/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!["read", "replied"].includes(status)) {
      res.status(400).json({ success: false, error: "invalid status" });
      return;
    }
    const updated = await markContactRead(req.params.id as string, req.uid!, status);
    if (!updated) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[contact] update error:", err);
    res.status(500).json({ success: false, error: "Failed to update" });
  }
});

export default router;
