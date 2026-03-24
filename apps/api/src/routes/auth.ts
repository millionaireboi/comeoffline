import { Router } from "express";
import crypto from "crypto";
import { validateCode, validateHandoffToken, chatbotEntry, signInByHandle } from "../services/auth.service";
import { strictLimiter, signInLimiter } from "../middleware/rateLimit";
import { isValidPin, verifyPin, hashPin } from "../services/pin.service";
import { sendPinResetEmail } from "../services/email.service";
import { getDb } from "../config/firebase-admin";

const router = Router();

/** POST /api/auth/validate-code — Validate invite/vouch code */
router.post("/validate-code", async (req, res) => {
  try {
    const { code, name, handle, vibe_tag, source, utm_source, utm_medium, utm_campaign } = req.body;

    if (!code || typeof code !== "string") {
      res.status(400).json({ success: false, error: "Code is required" });
      return;
    }

    if (name && (typeof name !== "string" || name.length > 100)) {
      res.status(400).json({ success: false, error: "Invalid name" });
      return;
    }

    if (handle && (typeof handle !== "string" || handle.length > 30)) {
      res.status(400).json({ success: false, error: "Invalid handle" });
      return;
    }

    if (vibe_tag && (typeof vibe_tag !== "string" || vibe_tag.length > 50)) {
      res.status(400).json({ success: false, error: "Invalid vibe tag" });
      return;
    }

    const trimmedName = typeof name === "string" ? name.trim() : undefined;
    const trimmedHandle = typeof handle === "string" ? handle.trim() : undefined;

    const utmParams = (utm_source || utm_medium || utm_campaign)
      ? { utm_source, utm_medium, utm_campaign }
      : undefined;

    const result = await validateCode(code, trimmedName, trimmedHandle, vibe_tag, source, utmParams);

    if (!result.valid) {
      res.status(401).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: {
        token: result.token,
        handoff_token: result.handoff_token,
        user: result.user,
      },
    });
  } catch (err) {
    console.error("[auth] validate-code error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/validate-token — Validate a handoff token from landing/chatbot redirect */
router.post("/validate-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ success: false, error: "Token is required" });
      return;
    }

    const result = await validateHandoffToken(token);

    if (!result.valid) {
      res.status(401).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
        has_seen_welcome: result.has_seen_welcome,
        source: result.source,
      },
    });
  } catch (err) {
    console.error("[auth] validate-token error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/sign-in — Sign in returning user by handle + PIN */
router.post("/sign-in", signInLimiter, async (req, res) => {
  try {
    const { handle, pin } = req.body;

    if (!handle || typeof handle !== "string") {
      res.status(400).json({ success: false, error: "Handle is required" });
      return;
    }

    const result = await signInByHandle(handle);

    if (!result.valid) {
      // Use generic message so attacker can't distinguish "no account" from "wrong PIN"
      res.status(401).json({ success: false, error: "Invalid handle or PIN" });
      return;
    }

    // Check if user has a PIN set
    const userData = result.user as Record<string, unknown>;
    const pinHash = userData.pin_hash as string | undefined;

    if (pinHash) {
      // PIN is set — must verify
      if (!pin || typeof pin !== "string" || !isValidPin(pin)) {
        res.status(401).json({ success: false, error: "PIN is required", needs_pin: true });
        return;
      }
      const pinValid = await verifyPin(pin, pinHash);
      if (!pinValid) {
        res.status(401).json({ success: false, error: "Invalid handle or PIN" });
        return;
      }
    }

    // Strip pin_hash from response — never send to client
    delete userData.pin_hash;
    delete userData.pin_set_at;

    res.json({
      success: true,
      data: {
        token: result.token,
        user: userData,
        has_seen_welcome: result.has_seen_welcome,
      },
    });
  } catch (err) {
    console.error("[auth] sign-in error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/forgot-pin — Request a PIN reset code via email */
router.post("/forgot-pin", signInLimiter, async (req, res) => {
  try {
    const { handle } = req.body;

    if (!handle || typeof handle !== "string") {
      // Generic response — don't reveal whether handle exists
      res.json({ success: true, message: "If an account exists with that handle, a reset code has been sent." });
      return;
    }

    const db = await getDb();
    const normalized = handle.replace(/^@/, "").toLowerCase().trim();

    // Find user by handle
    let userDoc = null;
    const snap = await db.collection("users").where("handle", "==", normalized).limit(1).get();
    if (!snap.empty) userDoc = snap.docs[0];
    if (!userDoc) {
      const snap2 = await db.collection("users").where("handle", "==", `@${normalized}`).limit(1).get();
      if (!snap2.empty) userDoc = snap2.docs[0];
    }

    if (!userDoc) {
      // Don't reveal that account doesn't exist
      res.json({ success: true, message: "If an account exists with that handle, a reset code has been sent." });
      return;
    }

    const userData = userDoc.data();
    const email = userData.email as string | undefined;

    if (!email) {
      res.status(400).json({ success: false, error: "No email on file. Contact an admin to reset your PIN." });
      return;
    }

    // Generate 6-digit code, store in Firestore with 10-min expiry
    const code = crypto.randomInt(100000, 999999).toString();
    await db.collection("pin_reset_codes").doc(userDoc.id).set({
      code,
      user_id: userDoc.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      used: false,
      created_at: new Date().toISOString(),
    });

    await sendPinResetEmail(email, code, userData.name || "friend");

    res.json({ success: true, message: "If an account exists with that handle, a reset code has been sent." });
  } catch (err) {
    console.error("[auth] forgot-pin error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/reset-pin — Verify reset code and set new PIN */
router.post("/reset-pin", signInLimiter, async (req, res) => {
  try {
    const { handle, code, new_pin } = req.body;

    if (!handle || typeof handle !== "string") {
      res.status(400).json({ success: false, error: "Handle is required" });
      return;
    }
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      res.status(400).json({ success: false, error: "Invalid reset code" });
      return;
    }
    if (!new_pin || typeof new_pin !== "string" || !isValidPin(new_pin)) {
      res.status(400).json({ success: false, error: "PIN must be exactly 4 digits" });
      return;
    }

    const db = await getDb();
    const normalized = handle.replace(/^@/, "").toLowerCase().trim();

    // Find user
    let userDoc = null;
    const snap = await db.collection("users").where("handle", "==", normalized).limit(1).get();
    if (!snap.empty) userDoc = snap.docs[0];
    if (!userDoc) {
      const snap2 = await db.collection("users").where("handle", "==", `@${normalized}`).limit(1).get();
      if (!snap2.empty) userDoc = snap2.docs[0];
    }

    if (!userDoc) {
      res.status(401).json({ success: false, error: "Invalid code" });
      return;
    }

    // Verify reset code
    const resetDoc = await db.collection("pin_reset_codes").doc(userDoc.id).get();
    if (!resetDoc.exists) {
      res.status(401).json({ success: false, error: "Invalid or expired code" });
      return;
    }

    const resetData = resetDoc.data()!;
    if (resetData.used) {
      res.status(401).json({ success: false, error: "Code already used" });
      return;
    }
    if (new Date(resetData.expires_at) < new Date()) {
      res.status(401).json({ success: false, error: "Code expired" });
      return;
    }
    if (resetData.code !== code) {
      res.status(401).json({ success: false, error: "Invalid code" });
      return;
    }

    // Code valid — mark as used and set new PIN
    const pinHash = await hashPin(new_pin);
    await Promise.all([
      resetDoc.ref.update({ used: true }),
      db.collection("users").doc(userDoc.id).update({
        pin_hash: pinHash,
        pin_set_at: new Date().toISOString(),
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("[auth] reset-pin error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/auth/chatbot-entry — Create provisional user from chatbot vibe check */
router.post("/chatbot-entry", strictLimiter, async (req, res) => {
  try {
    const { name, instagram_handle, vibe_answers } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({ success: false, error: "Name is too long" });
      return;
    }

    if (instagram_handle && (typeof instagram_handle !== "string" || instagram_handle.length > 30)) {
      res.status(400).json({ success: false, error: "Invalid instagram handle" });
      return;
    }

    if (vibe_answers) {
      if (!Array.isArray(vibe_answers) || vibe_answers.length > 20) {
        res.status(400).json({ success: false, error: "Invalid vibe answers" });
        return;
      }
      for (const a of vibe_answers) {
        if (!a.question || !a.answer || a.question.length > 500 || a.answer.length > 500) {
          res.status(400).json({ success: false, error: "Invalid vibe answer format" });
          return;
        }
      }
    }

    const result = await chatbotEntry(name.trim(), instagram_handle, vibe_answers);

    if (!result.success) {
      if (result.error === "vibe_check_failed") {
        res.status(200).json({ success: false, error: "vibe_check_failed" });
        return;
      }
      res.status(500).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      data: {
        handoff_token: result.handoff_token,
        user_id: result.user_id,
      },
    });
  } catch (err) {
    console.error("[auth] chatbot-entry error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
