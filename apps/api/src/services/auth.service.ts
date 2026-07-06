import { getDb, getAuthService } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { evaluateVibeCheck } from "./vibe-check.service";
import { sendPhoneOtp, verifyPhoneOtp } from "./whatsapp-otp.service";
import type { DiscoverySource } from "@comeoffline/types";

/** Strip sensitive fields from user data before sending to client */
function sanitizeUser(data: Record<string, unknown>): Record<string, unknown> {
  const { pin_hash, pin_set_at, ...safe } = data;
  return safe;
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

/** Signs in a returning user by their handle, phone number, or Instagram */
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

  // Check if input looks like a phone number (starts with + or is purely digits, min 7 chars)
  const strippedForPhoneCheck = normalized.replace(/[\s\-()]/g, "");
  const isPhoneInput = /^\+?\d{7,15}$/.test(strippedForPhoneCheck);

  // Search by app handle first, then fall back to phone number, then instagram handle
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

  // Fallback: search by phone_number (E.164 format)
  if (!userDoc && isPhoneInput) {
    // Normalize phone: strip non-digit chars (except leading +), ensure +prefix
    const phoneQuery = strippedForPhoneCheck.startsWith("+") ? strippedForPhoneCheck : `+${strippedForPhoneCheck}`;

    const phoneSnap = await db
      .collection("users")
      .where("phone_number", "==", phoneQuery)
      .limit(2)
      .get();

    if (phoneSnap.size > 1) {
      return { valid: false, error: "Multiple accounts found with this phone number. Please sign in with your handle instead." };
    }

    if (!phoneSnap.empty) {
      userDoc = phoneSnap.docs[0];
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

interface PhoneSignInSendResult {
  ok: boolean;
  error?: string;
  retry_after_seconds?: number;
}

/**
 * Sign-in path: send a WhatsApp OTP to a phone number that already belongs to a user.
 *
 * Unlike the onboarding OTP send (which keys the OTP record by the *currently signed-in*
 * UID), this path looks up the user by phone first and keys the OTP by their UID. That
 * way it shares the same per-user rate limits and storage as the onboarding flow.
 */
export async function sendSignInOtp(phone: string): Promise<PhoneSignInSendResult> {
  const db = await getDb();

  const phoneSnap = await db
    .collection("users")
    .where("phone_number", "==", phone)
    .limit(2)
    .get();

  if (phoneSnap.empty) {
    return { ok: false, error: "No account found with that phone number" };
  }

  if (phoneSnap.size > 1) {
    // Shouldn't happen — uniqueness is enforced at signup — but guard anyway.
    return { ok: false, error: "Multiple accounts share this number. Please sign in with your handle instead." };
  }

  const userDoc = phoneSnap.docs[0];
  const userData = userDoc.data();
  if (userData.status === "inactive") {
    return { ok: false, error: "Account is no longer active" };
  }

  const result = await sendPhoneOtp(userDoc.id, phone);
  if (!result.ok) {
    return { ok: false, error: result.error, retry_after_seconds: result.retry_after_seconds };
  }
  return { ok: true };
}

/** Sign-in path: verify the OTP and mint a Firebase custom token for the matched user. */
export async function signInByPhoneOtp(
  phone: string,
  code: string,
): Promise<HandoffTokenResult> {
  const db = await getDb();
  const auth = await getAuthService();

  const phoneSnap = await db
    .collection("users")
    .where("phone_number", "==", phone)
    .limit(2)
    .get();

  if (phoneSnap.empty) {
    // Generic "Invalid code" so a probe can't tell "wrong code" from "no such phone"
    return { valid: false, error: "Invalid code" };
  }

  if (phoneSnap.size > 1) {
    return { valid: false, error: "Multiple accounts share this number. Please sign in with your handle instead." };
  }

  const userDoc = phoneSnap.docs[0];
  const rawData = userDoc.data()!;

  if (rawData.status === "inactive") {
    return { valid: false, error: "Account is no longer active" };
  }

  const verifyResult = await verifyPhoneOtp(userDoc.id, phone, code);
  if (!verifyResult.ok) {
    return { valid: false, error: verifyResult.error };
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

// ── Open entry (no invite codes) ─────────────────────────────
// One "continue with whatsapp" flow: existing numbers sign in, new numbers
// get an account created on OTP verify. Signup OTPs are keyed by a synthetic
// `signup:{phone}` doc id since no uid exists yet.

const signupOtpKey = (phone: string) => `signup:${phone}`;

/** Send an OTP whether or not an account exists for this phone. */
export async function sendContinueOtp(phone: string): Promise<PhoneSignInSendResult> {
  const db = await getDb();

  const phoneSnap = await db
    .collection("users")
    .where("phone_number", "==", phone)
    .limit(2)
    .get();

  if (phoneSnap.size > 1) {
    return { ok: false, error: "Multiple accounts share this number. Please sign in with your handle instead." };
  }

  if (!phoneSnap.empty) {
    const userDoc = phoneSnap.docs[0];
    if (userDoc.data().status === "inactive") {
      return { ok: false, error: "Account is no longer active" };
    }
    const result = await sendPhoneOtp(userDoc.id, phone);
    return result.ok ? { ok: true } : { ok: false, error: result.error, retry_after_seconds: result.retry_after_seconds };
  }

  // New number — signup-scoped OTP
  const result = await sendPhoneOtp(signupOtpKey(phone), phone);
  return result.ok ? { ok: true } : { ok: false, error: result.error, retry_after_seconds: result.retry_after_seconds };
}

/** Verify the OTP; sign in the matching user or create a fresh account. */
export async function continueByPhoneOtp(
  phone: string,
  code: string,
): Promise<HandoffTokenResult & { is_new?: boolean }> {
  const db = await getDb();
  const auth = await getAuthService();

  const phoneSnap = await db
    .collection("users")
    .where("phone_number", "==", phone)
    .limit(2)
    .get();

  if (phoneSnap.size > 1) {
    return { valid: false, error: "Multiple accounts share this number. Please sign in with your handle instead." };
  }

  // Existing member → normal phone sign-in
  if (!phoneSnap.empty) {
    const result = await signInByPhoneOtp(phone, code);
    return { ...result, is_new: false };
  }

  // New member — verify the signup-scoped OTP, then create the account
  const verifyResult = await verifyPhoneOtp(signupOtpKey(phone), phone, code);
  if (!verifyResult.ok) {
    return { valid: false, error: verifyResult.error };
  }

  // Unique placeholder handle — the post-purchase profile flow collects the real name
  let handle = `@offline_${crypto.randomBytes(3).toString("hex")}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const handleSnap = await db.collection("users").where("handle", "==", handle).limit(1).get();
    if (handleSnap.empty) break;
    handle = `@offline_${crypto.randomBytes(3).toString("hex")}`;
  }

  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({});
  } catch {
    return { valid: false, error: "Failed to create account" };
  }

  const nowIso = new Date().toISOString();
  const userData = {
    id: firebaseUser.uid,
    name: "",
    handle,
    vibe_tag: "",
    entry_path: "open",
    phone_number: phone,
    phone_verified_at: nowIso, // they just proved it — core onboarding skips straight through
    vibe_check_answers: [],
    badges: [],
    status: "active",
    has_seen_welcome: false,
    created_at: FieldValue.serverTimestamp(),
  };
  await db.collection("users").doc(firebaseUser.uid).set(userData);

  // Retire the signup-scoped OTP doc
  await db.collection("phone_otps").doc(signupOtpKey(phone)).delete().catch(() => {});

  const firebaseToken = await auth.createCustomToken(firebaseUser.uid);
  return {
    valid: true,
    token: firebaseToken,
    user: sanitizeUser({ ...userData, created_at: nowIso }),
    has_seen_welcome: false,
    is_new: true,
  };
}
