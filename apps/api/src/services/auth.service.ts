import { getDb, getAuthService } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { isCodeUsable, recordCodeUsage } from "./vouch.service";
import { evaluateVibeCheck } from "./vibe-check.service";
import type { VouchCode, VouchCodeUsage, DiscoverySource } from "@comeoffline/types";

/** Strip sensitive fields from user data before sending to client */
function sanitizeUser(data: Record<string, unknown>): Record<string, unknown> {
  const { pin_hash, pin_set_at, ...safe } = data;
  return safe;
}

interface ValidateCodeResult {
  valid: boolean;
  token?: string;
  handoff_token?: string;
  user?: Record<string, unknown>;
  error?: string;
}

interface HandoffTokenResult {
  valid: boolean;
  token?: string; // Firebase custom token
  user?: Record<string, unknown>;
  has_seen_welcome?: boolean;
  source?: "landing" | "chatbot";
  error?: string;
}

interface ChatbotEntryResult {
  success: boolean;
  handoff_token?: string;
  user_id?: string;
  error?: string;
}

/** Generates a crypto-random handoff token and stores it in Firestore */
export async function generateHandoffToken(
  userId: string,
  source: "landing" | "chatbot",
  userStatus: "active" | "provisional",
): Promise<string> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.collection("handoff_tokens").doc(token).set({
    token,
    user_id: userId,
    source,
    user_status: userStatus,
    expires_at: expiresAt.toISOString(),
    used: false,
    created_at: FieldValue.serverTimestamp(),
  });

  return token;
}

/** Validates a handoff token and returns a Firebase custom token */
export async function validateHandoffToken(token: string): Promise<HandoffTokenResult> {
  const db = await getDb();
  const auth = await getAuthService();
  const tokenDoc = await db.collection("handoff_tokens").doc(token).get();

  if (!tokenDoc.exists) {
    return { valid: false, error: "Invalid token" };
  }

  const tokenData = tokenDoc.data()!;

  if (tokenData.used) {
    return { valid: false, error: "Token already used" };
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return { valid: false, error: "Token expired" };
  }

  // Mark token as used
  await tokenDoc.ref.update({ used: true, used_at: FieldValue.serverTimestamp() });

  // Fetch user doc
  const userDoc = await db.collection("users").doc(tokenData.user_id).get();
  if (!userDoc.exists) {
    return { valid: false, error: "User not found" };
  }

  const rawData = userDoc.data()!;
  const userData = { id: userDoc.id, ...rawData };

  // Generate Firebase custom token
  const firebaseToken = await auth.createCustomToken(tokenData.user_id);

  return {
    valid: true,
    token: firebaseToken,
    user: sanitizeUser(userData),
    has_seen_welcome: (rawData.has_seen_welcome as boolean) ?? false,
    source: tokenData.source as "landing" | "chatbot",
  };
}

/** Validates an invite/vouch code and creates or retrieves the user */
export async function validateCode(
  code: string,
  name?: string,
  handle?: string,
  vibeTag?: string,
  source?: DiscoverySource,
  utmParams?: { utm_source?: string; utm_medium?: string; utm_campaign?: string },
): Promise<ValidateCodeResult> {
  const db = await getDb();
  const auth = await getAuthService();
  const normalizedCode = code.toUpperCase().trim();

  // Step 1: Find the code
  const codesSnap = await db
    .collection("vouch_codes")
    .where("code", "==", normalizedCode)
    .limit(1)
    .get();

  if (codesSnap.empty) {
    return { valid: false, error: "Invalid code" };
  }

  const codeDoc = codesSnap.docs[0];
  const codeData = { id: codeDoc.id, ...codeDoc.data() } as VouchCode;

  // Migrate legacy codes missing new fields
  if (!codeData.type) codeData.type = "single";
  if (!codeData.rules) codeData.rules = { max_uses: 1 };
  if (codeData.uses === undefined) codeData.uses = 0;
  if (!codeData.used_by) codeData.used_by = [];

  // Step 1b: Check if a returning user is signing back in with their original code.
  // Only safe for single-use codes — for multi-use codes, multiple users share the same
  // code so we can't know which user is returning. They should use /sign-in instead.
  if (codeData.rules?.max_uses === 1 || codeData.type === "single") {
    const existingUserSnap = await db
      .collection("users")
      .where("invite_code_used", "==", normalizedCode)
      .limit(1)
      .get();

    if (!existingUserSnap.empty) {
      // Returning user — issue a new custom token to sign them back in
      const existingUserDoc = existingUserSnap.docs[0];
      const rawData = existingUserDoc.data();
      const existingUserData = { id: existingUserDoc.id, ...rawData };
      const token = await auth.createCustomToken(existingUserDoc.id);
      const handoffToken = await generateHandoffToken(
        existingUserDoc.id,
        "landing",
        rawData.status === "active" ? "active" : "provisional",
      );
      return { valid: true, token, handoff_token: handoffToken, user: sanitizeUser(existingUserData) };
    }
  }

  // New user — check if code is still usable
  const check = isCodeUsable(codeData, source);
  if (!check.usable) {
    return { valid: false, error: check.reason || "Code is not valid" };
  }

  // Step 2: Create Firebase Auth user
  const displayName = name || `user_${Date.now()}`;
  let userHandle = handle || `@${displayName.toLowerCase().replace(/\s+/g, "_")}`;

  // Ensure handle uniqueness — append random suffix if taken
  for (let attempt = 0; attempt < 3; attempt++) {
    const handleSnap = await db
      .collection("users")
      .where("handle", "==", userHandle)
      .limit(1)
      .get();
    if (handleSnap.empty) break;
    const suffix = crypto.randomBytes(2).toString("hex");
    userHandle = handle
      ? `${handle}_${suffix}`
      : `@${displayName.toLowerCase().replace(/\s+/g, "_")}_${suffix}`;
  }

  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      displayName,
    });
  } catch {
    return { valid: false, error: "Failed to create user" };
  }

  // Step 3: Create user document in Firestore
  const userData = {
    id: firebaseUser.uid,
    name: displayName,
    handle: userHandle,
    vibe_tag: vibeTag || "",
    invite_code_used: normalizedCode,
    vouched_by: codeData.owner_id || null,
    entry_path: codeData.owner_id === "admin" ? "invite" : "vouch",
    vibe_check_answers: [],
    badges: [],
    status: "active",
    has_seen_welcome: false,
    ...(source && { referral_source: source }),
    created_at: FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(firebaseUser.uid).set(userData);

  // Step 4: Record usage on the vouch code
  const usage: VouchCodeUsage = {
    user_id: firebaseUser.uid,
    user_name: displayName,
    used_at: new Date().toISOString(),
    ...(source && { source }),
    ...(utmParams?.utm_source && { utm_source: utmParams.utm_source }),
    ...(utmParams?.utm_medium && { utm_medium: utmParams.utm_medium }),
    ...(utmParams?.utm_campaign && { utm_campaign: utmParams.utm_campaign }),
  };

  try {
    await recordCodeUsage(codeDoc.id, usage, source);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "";
    if (errorMsg.startsWith("CODE_DEPLETED:")) {
      // Code was used up between our check and the transaction — roll back user creation
      console.warn("[auth] Code depleted during redemption, rolling back user:", firebaseUser.uid);
      try {
        await Promise.all([
          auth.deleteUser(firebaseUser.uid),
          db.collection("users").doc(firebaseUser.uid).delete(),
        ]);
      } catch (rollbackErr) {
        console.error("[auth] Rollback failed for user:", firebaseUser.uid, rollbackErr);
      }
      return { valid: false, error: errorMsg.slice("CODE_DEPLETED:".length) };
    }
    // Other usage tracking failures shouldn't block user creation
    console.error("[auth] Failed to record code usage:", err);
  }

  // Step 5: Generate tokens for client sign-in
  try {
    const token = await auth.createCustomToken(firebaseUser.uid);
    const handoffToken = await generateHandoffToken(firebaseUser.uid, "landing", "active");
    return { valid: true, token, handoff_token: handoffToken, user: userData };
  } catch (tokenErr) {
    console.error("[auth] Failed to generate tokens:", tokenErr);
    return { valid: false, error: "Failed to create session. Please try again." };
  }
}

/** Creates a provisional user from chatbot vibe check pass */
export async function chatbotEntry(
  name: string,
  instagramHandle?: string,
  vibeAnswers?: { question: string; answer: string }[],
): Promise<ChatbotEntryResult> {
  // Structured scoring: evaluate the vibe check before creating the user
  if (vibeAnswers && vibeAnswers.length > 0) {
    const vibeScore = await evaluateVibeCheck({
      answers: vibeAnswers,
      name,
      instagram_handle: instagramHandle,
    });

    if (!vibeScore.passed) {
      console.log(`[auth] Vibe check failed for "${name}": ${vibeScore.reasoning} (overall: ${vibeScore.overall})`);
      return { success: false, error: "vibe_check_failed" };
    }

    // Score passed — proceed to create user with score data
    return createChatbotUser(name, instagramHandle, vibeAnswers, vibeScore);
  }

  // No answers (shouldn't happen, but handle gracefully)
  return createChatbotUser(name, instagramHandle, vibeAnswers);
}

/** Signs in a returning user by their handle */
export async function signInByHandle(
  handle: string,
): Promise<HandoffTokenResult> {
  const db = await getDb();
  const auth = await getAuthService();

  // Normalize: strip leading @ if present, lowercase
  const normalized = handle.replace(/^@/, "").toLowerCase().trim();
  if (!normalized) {
    return { valid: false, error: "Handle is required" };
  }

  // Search by app handle first, then fall back to instagram handle
  let userDoc = null;
  const handleSnap = await db
    .collection("users")
    .where("handle", "==", normalized)
    .limit(1)
    .get();

  if (!handleSnap.empty) {
    userDoc = handleSnap.docs[0];
  } else {
    // Try with @ prefix
    const handleSnapAt = await db
      .collection("users")
      .where("handle", "==", `@${normalized}`)
      .limit(1)
      .get();

    if (!handleSnapAt.empty) {
      userDoc = handleSnapAt.docs[0];
    }
  }

  // Fallback: search by instagram_handle
  if (!userDoc) {
    const igSnap = await db
      .collection("users")
      .where("instagram_handle", "==", normalized)
      .limit(1)
      .get();

    if (!igSnap.empty) {
      userDoc = igSnap.docs[0];
    } else {
      const igSnapAt = await db
        .collection("users")
        .where("instagram_handle", "==", `@${normalized}`)
        .limit(1)
        .get();

      if (!igSnapAt.empty) {
        userDoc = igSnapAt.docs[0];
      }
    }
  }

  if (!userDoc) {
    return { valid: false, error: "No account found with that handle" };
  }

  const rawData = userDoc.data()!;

  // Don't allow inactive users to sign back in
  if (rawData.status === "inactive") {
    return { valid: false, error: "Account is no longer active" };
  }

  const userData = { id: userDoc.id, ...rawData };
  const firebaseToken = await auth.createCustomToken(userDoc.id);

  return {
    valid: true,
    token: firebaseToken,
    user: sanitizeUser(userData),
    has_seen_welcome: (rawData.has_seen_welcome as boolean) ?? false,
  };
}

async function createChatbotUser(
  name: string,
  instagramHandle?: string,
  vibeAnswers?: { question: string; answer: string }[],
  vibeScore?: { engagement: number; creativity: number; authenticity: number; effort: number; overall: number; reasoning: string; passed: boolean },
): Promise<ChatbotEntryResult> {
  const db = await getDb();
  const auth = await getAuthService();
  let userHandle = `@${name.toLowerCase().replace(/\s+/g, "_")}`;

  // Ensure handle uniqueness — same logic as validateCode path
  for (let attempt = 0; attempt < 3; attempt++) {
    const handleSnap = await db
      .collection("users")
      .where("handle", "==", userHandle)
      .limit(1)
      .get();
    if (handleSnap.empty) break;
    const suffix = crypto.randomBytes(2).toString("hex");
    userHandle = `@${name.toLowerCase().replace(/\s+/g, "_")}_${suffix}`;
  }

  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      displayName: name,
    });
  } catch {
    return { success: false, error: "Failed to create user" };
  }

  const userData: Record<string, unknown> = {
    id: firebaseUser.uid,
    name,
    handle: userHandle,
    vibe_tag: "",
    instagram_handle: instagramHandle || null,
    invite_code_used: "",
    vouched_by: null,
    entry_path: "chatbot",
    vibe_check_answers: vibeAnswers || [],
    badges: [],
    status: "provisional",
    has_seen_welcome: false,
    created_at: FieldValue.serverTimestamp(),
  };

  if (vibeScore) {
    userData.vibe_check_score = {
      engagement: vibeScore.engagement,
      creativity: vibeScore.creativity,
      authenticity: vibeScore.authenticity,
      effort: vibeScore.effort,
      overall: vibeScore.overall,
      reasoning: vibeScore.reasoning,
      passed: vibeScore.passed,
      scored_at: new Date().toISOString(),
    };
  }

  await db.collection("users").doc(firebaseUser.uid).set(userData);

  // Generate handoff token for chatbot→PWA redirect
  const handoffToken = await generateHandoffToken(firebaseUser.uid, "chatbot", "provisional");

  return { success: true, handoff_token: handoffToken, user_id: firebaseUser.uid };
}
