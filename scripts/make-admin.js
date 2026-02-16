#!/usr/bin/env node
/**
 * Script to grant admin privileges to a Firebase user
 * Usage: node scripts/make-admin.js <email>
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, "../comeoffline-509fc-firebase-adminsdk-fbsvc-54f699f737.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function makeAdmin(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log(`✅ Successfully granted admin privileges to ${email}`);
    console.log(`   User ID: ${user.uid}`);
    console.log(`   The user needs to sign out and sign back in for changes to take effect.`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/make-admin.js <email>");
  console.error("Example: node scripts/make-admin.js admin@comeoffline.com");
  process.exit(1);
}

makeAdmin(email);
