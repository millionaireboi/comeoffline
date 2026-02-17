import { getDb, getAuthService } from "../config/firebase-admin";
import { FieldValue, type DocumentReference, type DocumentData } from "firebase-admin/firestore";
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
    user: userData,
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
): Promise<ValidateCodeResult> {
  const db = await getDb();
  const auth = await getAuthService();
  const normalizedCode = code.toUpperCase().trim();

  // Step 1: Atomically find and claim the code using a transaction
  let codeDocRef: DocumentReference;
  let codeData: DocumentData;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const codesSnap = await transaction.get(
        db.collection("vouch_codes")
          .where("code", "==", normalizedCode)
          .where("status", "==", "unused")
          .limit(1)
      );

      if (codesSnap.empty) {
        throw new Error("INVALID_CODE");
      }

      const doc = codesSnap.docs[0];

      // Atomically mark as used to prevent double-redemption
      transaction.update(doc.ref, {
        status: "used",
        used_at: FieldValue.serverTimestamp(),
      });

      return { ref: doc.ref, data: doc.data() };
    });

    codeDocRef = result.ref;
    codeData = result.data;
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_CODE") {
      return { valid: false, error: "Invalid or used code" };
    }
    throw err;
  }

  // Step 2: Create Firebase Auth user
  const displayName = name || `user_${Date.now()}`;
  const userHandle = handle || `@${displayName.toLowerCase().replace(/\s+/g, "_")}`;

  let firebaseUser;
  try {
    firebaseUser = await auth.createUser({
      displayName,
    });
  } catch {
    // Rollback: restore the code to unused
    await codeDocRef.update({
      status: "unused",
      used_at: FieldValue.delete(),
    });
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
    created_at: FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(firebaseUser.uid).set(userData);

  // Step 4: Update the vouch code with who used it
  await codeDocRef.update({ used_by_id: firebaseUser.uid });

  // Step 5: Generate tokens for client sign-in
  const token = await auth.createCustomToken(firebaseUser.uid);
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
