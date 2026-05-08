// One-off diagnostic: where does a phone number live?
// Usage: npx tsx scripts/lookup-phone.ts <phone>
// Examples:
//   npx tsx scripts/lookup-phone.ts +919663241658
//   npx tsx scripts/lookup-phone.ts 9663241658     (assumes +91)

import { config } from "dotenv";
import { resolve } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

config({ path: resolve(__dirname, "../.env") });

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error("usage: npx tsx scripts/lookup-phone.ts <phone>");
    process.exit(1);
  }

  // Normalize: if 10 digits, assume +91 (India). Otherwise leave as-is.
  const digits = raw.replace(/\D/g, "");
  const candidates = new Set<string>();
  candidates.add(raw);
  if (digits.length === 10) candidates.add(`+91${digits}`);
  if (raw.startsWith("+")) candidates.add(raw);
  if (digits.length === 12 && digits.startsWith("91")) candidates.add(`+${digits}`);

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!sa) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY not in .env");
    process.exit(1);
  }
  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  const db = getFirestore();
  const auth = getAuth();

  console.log(`\nLooking up phone candidates: ${[...candidates].join(", ")}\n`);

  for (const phone of candidates) {
    console.log(`\n========== ${phone} ==========`);

    // 1. users collection
    const usersSnap = await db.collection("users").where("phone_number", "==", phone).get();
    console.log(`\n[users]  ${usersSnap.size} doc(s)`);
    usersSnap.docs.forEach((d) => {
      const u = d.data();
      console.log(`  - id=${d.id}`);
      console.log(`    handle=${u.handle ?? "(none)"}  full_name=${u.full_name ?? "(none)"}`);
      console.log(`    status=${u.status ?? "(none)"}  phone_verified_at=${u.phone_verified_at ?? "(no)"}`);
      console.log(`    created_at=${u.created_at ?? "(none)"}`);
    });

    // 2. phone_otps collection
    const otpsSnap = await db.collection("phone_otps").where("phone", "==", phone).get();
    console.log(`\n[phone_otps]  ${otpsSnap.size} doc(s)`);
    otpsSnap.docs.forEach((d) => {
      const o = d.data();
      console.log(`  - user_id=${d.id}  consumed=${o.consumed}  verified_at=${o.verified_at ?? "(no)"}`);
    });

    // 3. Firebase Auth
    try {
      const u = await auth.getUserByPhoneNumber(phone);
      console.log(`\n[firebase-auth]  FOUND  uid=${u.uid}  disabled=${u.disabled}`);
      console.log(`    email=${u.email ?? "(none)"}  providers=${u.providerData.map((p) => p.providerId).join(",")}`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      console.log(`\n[firebase-auth]  ${code === "auth/user-not-found" ? "not found" : `error: ${code ?? "unknown"}`}`);
    }
  }

  console.log("\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("script error:", err);
  process.exit(1);
});
