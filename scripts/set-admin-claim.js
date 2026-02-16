#!/usr/bin/env node
/**
 * Script to set admin custom claim on a Firebase user
 * Usage: node scripts/set-admin-claim.js <email>
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, "../comeoffline-509fc-firebase-adminsdk-fbsvc-54f699f737.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log(`✅ Successfully set admin claim for ${email}`);
    console.log(`   User ID: ${user.uid}`);
    console.log("\n⚠️  Note: The user needs to sign out and sign back in for the new claim to take effect.");

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/set-admin-claim.js <email>");
  console.error("Example: node scripts/set-admin-claim.js admin@comeoffline.com");
  process.exit(1);
}

setAdminClaim(email);
