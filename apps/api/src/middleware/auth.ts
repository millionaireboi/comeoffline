import type { Request, Response, NextFunction } from "express";
import { getAuthService } from "../config/firebase-admin";

export interface AuthRequest extends Request {
  uid?: string;
  claims?: Record<string, unknown>;
}

/** Verifies Firebase ID token from Authorization header */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing auth token" });
    return;
  }

  try {
    const auth = await getAuthService();
    const token = header.split("Bearer ")[1];
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.claims = decoded;
    next();
  } catch (err) {
    console.error('[auth] Token verification failed:', err instanceof Error ? err.message : String(err));
    res.status(401).json({ success: false, error: "Invalid auth token" });
  }
}

/** Requires admin custom claim */
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  await requireAuth(req, res, () => {
    if (!req.claims?.admin) {
      res.status(403).json({ success: false, error: "Admin access required" });
      return;
    }
    next();
  });
}
