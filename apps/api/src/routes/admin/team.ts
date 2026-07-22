import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { getDb, getAuthService } from "../../config/firebase-admin";

const router = Router();

/**
 * Team member management — founder-only. A team member is a Firebase
 * email/password account with a `role` custom claim; the `team` collection
 * mirrors it for listing (claims aren't queryable). Roles:
 *  - "creator_ops": creator acquisition — creators tab + links + discounts,
 *    no payouts, no member PII, nothing else.
 * Claim changes land on the member's next sign-in (tokens refresh hourly).
 */

const ROLES = new Set(["creator_ops"]);

interface TeamMember {
  uid: string;
  email: string;
  name: string;
  role: string;
  added_at: string;
  added_by?: string;
}

/** GET /api/admin/team */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const snap = await db.collection("team").get();
    res.json({ success: true, data: snap.docs.map((d) => d.data() as TeamMember) });
  } catch (err) {
    console.error("[admin/team] list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/admin/team — onboard a team member.
 * If the email has no Firebase account yet, one is created with the given
 * temp password (share it over a safe channel; they should change it).
 */
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, name, role, temp_password } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ success: false, error: "a valid email is required" });
      return;
    }
    if (!ROLES.has(role)) {
      res.status(400).json({ success: false, error: `role must be one of: ${[...ROLES].join(", ")}` });
      return;
    }

    const auth = await getAuthService();
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      if (!temp_password || typeof temp_password !== "string" || temp_password.length < 8) {
        res.status(400).json({
          success: false,
          error: "no account with that email — provide a temp_password (8+ chars) to create one",
        });
        return;
      }
      const created = await auth.createUser({ email, password: temp_password });
      uid = created.uid;
    }

    // Never let this endpoint grant or clobber a full admin account
    const current = await auth.getUser(uid);
    if (current.customClaims?.admin) {
      res.status(400).json({ success: false, error: "that account is already a full admin" });
      return;
    }
    await auth.setCustomUserClaims(uid, { role });

    const db = await getDb();
    const member: TeamMember = {
      uid,
      email,
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : email.split("@")[0],
      role,
      added_at: new Date().toISOString(),
      added_by: req.uid,
    };
    await db.collection("team").doc(uid).set(member);
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    console.error("[admin/team] add error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/team/:uid/password — set a new password for a team
 *  member (founder types it, shares it safely). Never touches admin
 *  accounts — this resets team seats only. */
router.post("/:uid/password", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ success: false, error: "password must be 8+ chars" });
      return;
    }
    const uid = req.params.uid as string;
    const auth = await getAuthService();
    const user = await auth.getUser(uid).catch(() => null);
    if (!user) {
      res.status(404).json({ success: false, error: "account not found" });
      return;
    }
    if (user.customClaims?.admin) {
      res.status(400).json({ success: false, error: "can't reset an admin account from here" });
      return;
    }
    await auth.updateUser(uid, { password });
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/team] password reset error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** DELETE /api/admin/team/:uid — revoke role + remove from the list */
router.delete("/:uid", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const uid = req.params.uid as string;
    const auth = await getAuthService();
    const user = await auth.getUser(uid).catch(() => null);
    if (user && !user.customClaims?.admin) {
      await auth.setCustomUserClaims(uid, {});
    }
    const db = await getDb();
    await db.collection("team").doc(uid).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/team] remove error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
