import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { listLinks, createLink, updateLink, deleteLink } from "../../services/links.service";

const router = Router();

/** GET /api/admin/links — List all trackable links */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const links = await listLinks();
    res.json({ success: true, data: links });
  } catch (err) {
    console.error("[admin/links] list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/links — Create a trackable link */
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { code, destination, label, campaign } = req.body;

    if (!code || typeof code !== "string") {
      res.status(400).json({ success: false, error: "code is required" });
      return;
    }
    if (!destination || typeof destination !== "string") {
      res.status(400).json({ success: false, error: "destination is required" });
      return;
    }
    if (!label || typeof label !== "string") {
      res.status(400).json({ success: false, error: "label is required" });
      return;
    }
    if (campaign != null && typeof campaign !== "string") {
      res.status(400).json({ success: false, error: "campaign must be a string" });
      return;
    }

    const result = await createLink({
      code,
      destination,
      label,
      campaign: campaign || null,
      created_by: req.uid,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    console.error("[admin/links] create error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** PUT /api/admin/links/:code — Update a link (pause, re-point destination, rename) */
router.put("/:code", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { active, destination, label, campaign } = req.body;

    if (active !== undefined && typeof active !== "boolean") {
      res.status(400).json({ success: false, error: "active must be a boolean" });
      return;
    }
    if (destination !== undefined && typeof destination !== "string") {
      res.status(400).json({ success: false, error: "destination must be a string" });
      return;
    }
    if (label !== undefined && typeof label !== "string") {
      res.status(400).json({ success: false, error: "label must be a string" });
      return;
    }
    if (campaign !== undefined && campaign !== null && typeof campaign !== "string") {
      res.status(400).json({ success: false, error: "campaign must be a string or null" });
      return;
    }

    const result = await updateLink(req.params.code as string, { active, destination, label, campaign });
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/links] update error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/admin/links/:code — Delete a link (scans of printed posters will fall back home) */
router.delete("/:code", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await deleteLink(req.params.code as string);
    if (!result.success) {
      res.status(404).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/links] delete error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
