import { db, auth } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface ValidateCodeResult {
  valid: boolean;
  token?: string;
  user?: Record<string, unknown>;
  error?: string;
}

/** Validates an invite/vouch code and creates or retrieves the user */
export async function validateCode(
  code: string,
  name?: string,
  handle?: string,
  vibeTag?: string,
): Promise<ValidateCodeResult> {
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

  return { valid: true, token, user: userData };
}
