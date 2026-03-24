import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok", service: "comeoffline-api", timestamp: new Date().toISOString() });
});

/** Diagnostic: verify trust proxy is extracting the correct client IP.
 *  Hit this from your phone/browser and check if `ip` matches your real IP.
 *  If it doesn't, adjust `trust proxy` in index.ts.
 *  TODO: Remove once trust proxy value is confirmed correct. */
router.get("/ip", (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    xForwardedFor: req.headers["x-forwarded-for"],
  });
});

export default router;
