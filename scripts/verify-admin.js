#!/usr/bin/env node
/**
 * Script to verify admin claim on a Firebase user
 * Usage: node scripts/verify-admin.js <email>
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, "../comeoffline-509fc-firebase-adminsdk-fbsvc-54f699f737.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function verifyAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    console.log(`\n📋 User: ${email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Custom Claims:`, user.customClaims || {});

    if (user.customClaims?.admin) {
      console.log(`\n✅ User HAS admin claim`);
    } else {
      console.log(`\n❌ User DOES NOT have admin claim`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/verify-admin.js <email>");
  process.exit(1);
}

verifyAdminClaim(email);
