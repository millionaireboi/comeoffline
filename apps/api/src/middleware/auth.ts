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
    const token = header.split("Bearer ")[1] ?? "";
    const segments = token.split(".").length;
    const message = err instanceof Error ? err.message : String(err);
    // Decode the JWT payload (best-effort) to surface aud/iss mismatches without exposing the full token.
    let payloadHint: Record<string, unknown> | null = null;
    if (segments === 3) {
      try {
        const p = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
        payloadHint = {
          iss: p.iss,
          aud: p.aud,
          uid: p.uid ?? p.user_id ?? p.sub,
          exp_in: typeof p.exp === "number" ? p.exp - Math.floor(Date.now() / 1000) : null,
        };
      } catch { /* not a JWT — fall through */ }
    }
    console.error("[auth] Token verification failed:", {
      message,
      tokenLength: token.length,
      tokenSegments: segments, // ID tokens are 3-segment JWTs; custom tokens are also 3 but with different aud
      tokenPreview: token ? `${token.slice(0, 8)}…${token.slice(-6)}` : "<empty>",
      payloadHint,
      hint:
        segments !== 3
          ? "Not a JWT — likely a handoff/custom token leaking into Authorization header"
          : payloadHint?.aud === "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit"
          ? "This is a Firebase CUSTOM token, not an ID token. Frontend must signInWithCustomToken() first."
          : payloadHint && typeof payloadHint.aud === "string" && !String(payloadHint.iss).includes(payloadHint.aud)
          ? "ID token aud (project) does not match this server's Firebase project — check FIREBASE_SERVICE_ACCOUNT_KEY vs NEXT_PUBLIC_FIREBASE_PROJECT_ID"
          : "Token decoded but rejected — could be expired, revoked, or signed by a different project",
    });
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
