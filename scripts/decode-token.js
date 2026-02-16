#!/usr/bin/env node
/**
 * Script to decode a Firebase token and show its claims
 * Usage: node scripts/decode-token.js <token>
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, "../comeoffline-509fc-firebase-adminsdk-fbsvc-54f699f737.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function decodeToken(token) {
  try {
    const decoded = await admin.auth().verifyIdToken(token);

    console.log("\n📋 Token Info:");
    console.log(`   UID: ${decoded.uid}`);
    console.log(`   Email: ${decoded.email || "(none)"}`);
    console.log(`   Claims:`, decoded);
    console.log(`\n   Has admin claim: ${decoded.admin ? "✅ YES" : "❌ NO"}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

const token = process.argv[2];

if (!token) {
  console.error("Usage: node scripts/decode-token.js <token>");
  console.error("\nTo get your token:");
  console.error("1. Open browser DevTools (F12)");
  console.error("2. Go to Console tab");
  console.error("3. Paste: firebase.auth().currentUser.getIdToken().then(console.log)");
  process.exit(1);
}

decodeToken(token);
