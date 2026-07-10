import { Router } from "express";
import { recordLinkHit } from "../services/links.service";

const router = Router();

/**
 * POST /api/links/public/:code/hit — Resolve a short link and count the scan.
 *
 * Called server-to-server by the landing app's /l/[code] redirect route, so
 * requests share the landing server's egress IP — mounted exempt from the
 * per-IP general limiter (like /api/events/public) so a burst of poster scans
 * never rate-limits itself. The client's UA/referer are forwarded in the body.
 */
router.post("/:code/hit", async (req, res) => {
  try {
    const { user_agent, referer } = req.body || {};
    const result = await recordLinkHit(req.params.code as string, {
      user_agent: typeof user_agent === "string" ? user_agent.slice(0, 512) : undefined,
      referer: typeof referer === "string" ? referer.slice(0, 512) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[links] hit error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
