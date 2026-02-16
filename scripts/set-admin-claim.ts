#!/usr/bin/env tsx
/**
 * Script to set admin custom claim on a Firebase user
 * Usage: npx tsx scripts/set-admin-claim.ts <email>
 */

import { auth } from "../apps/api/src/config/firebase-admin";

async function setAdminClaim(email: string) {
  try {
    // Get user by email
    const user = await auth.getUserByEmail(email);

    // Set admin custom claim
    await auth.setCustomUserClaims(user.uid, { admin: true });

    console.log(`✅ Successfully set admin claim for ${email}`);
    console.log(`   User ID: ${user.uid}`);
    console.log("\n⚠️  Note: The user needs to sign out and sign back in for the new claim to take effect.");

    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error("❌ Unknown error occurred");
    }
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: npx tsx scripts/set-admin-claim.ts <email>");
  console.error("Example: npx tsx scripts/set-admin-claim.ts admin@comeoffline.com");
  process.exit(1);
}

setAdminClaim(email);
