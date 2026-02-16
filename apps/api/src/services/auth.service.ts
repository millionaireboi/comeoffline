import { getDb, getAuthService } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

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
    user: userData,
    has_seen_welcome: (rawData.has_seen_welcome as boolean) ?? false,
  };
}

/** Validates an invite/vouch code and creates or retrieves the user */
export async function validateCode(
  code: string,
  name?: string,
  handle?: string,
  vibeTag?: string,
): Promise<ValidateCodeResult> {
  const db = await getDb();
  const auth = await getAuthService();
  const normalizedCode = code.toUpperCase().trim();

  // Look up code in vouch_codes collection
  const codesSnap = await db
    .collection("vouch_codes")
    .where("code", "==", normalizedCode)
    .where("status", "==", "unused")
    .limit(1)
    .get();

  if (codesSnap.empty) {
    return { valid: false, error: "Invalid or used code" };
  }

  const codeDoc = codesSnap.docs[0];
  const codeData = codeDoc.data();

  // Mark code as used
  await codeDoc.ref.update({
    status: "used",
    used_at: FieldValue.serverTimestamp(),
  });

  // Create Firebase Auth user
  const displayName = name || `user_${Date.now()}`;
  const userHandle = handle || `@${displayName.toLowerCase().replace(/\s+/g, "_")}`;

  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      displayName,
    });
  } catch {
    // If user creation fails, un-use the code
    await codeDoc.ref.update({ status: "unused", used_at: null });
    return { valid: false, error: "Failed to create user" };
  }

  // Create user document in Firestore
  const userData = {
    id: firebaseUser.uid,
    name: displayName,
    handle: userHandle,
    vibe_tag: vibeTag || "",
    invite_code_used: normalizedCode,
    vouched_by: codeData.owner_id || null,
    entry_path: codeData.owner_id ? "vouch" : "invite",
    vibe_check_answers: [],
    badges: [],
    status: "active",
    has_seen_welcome: false,
    created_at: FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(firebaseUser.uid).set(userData);

  // Update the vouch code with who used it
  await codeDoc.ref.update({ used_by_id: firebaseUser.uid });

  // Generate custom token for client sign-in
  const token = await auth.createCustomToken(firebaseUser.uid);

  // Generate handoff token for landing→PWA redirect
  const handoffToken = await generateHandoffToken(firebaseUser.uid, "landing", "active");

  return { valid: true, token, handoff_token: handoffToken, user: userData };
}

/** Creates a provisional user from chatbot vibe check pass */
export async function chatbotEntry(
  name: string,
  instagramHandle?: string,
  vibeAnswers?: { question: string; answer: string }[],
): Promise<ChatbotEntryResult> {
  const db = await getDb();
  const auth = await getAuthService();
  const userHandle = `@${name.toLowerCase().replace(/\s+/g, "_")}`;

  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      displayName: name,
    });
  } catch {
    return { success: false, error: "Failed to create user" };
  }

  const userData = {
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

  await db.collection("users").doc(firebaseUser.uid).set(userData);

  // Generate handoff token for chatbot→PWA redirect
  const handoffToken = await generateHandoffToken(firebaseUser.uid, "chatbot", "provisional");

  return { success: true, handoff_token: handoffToken, user_id: firebaseUser.uid };
}
