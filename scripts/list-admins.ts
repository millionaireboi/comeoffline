#!/usr/bin/env tsx
/**
 * Script to list all Firebase users and their admin status
 * Usage: npx tsx scripts/list-admins.ts
 */

import { auth } from "../apps/api/src/config/firebase-admin";

async function listAdmins() {
  try {
    const listUsersResult = await auth.listUsers();

    console.log("\n📋 Firebase Users:\n");

    if (listUsersResult.users.length === 0) {
      console.log("No users found.");
      return;
    }

    listUsersResult.users.forEach((user) => {
      const isAdmin = user.customClaims?.admin === true;
      const badge = isAdmin ? "👑 ADMIN" : "👤 User ";

      console.log(`${badge} | ${user.email || "(no email)"}`);
      console.log(`         UID: ${user.uid}`);
      if (user.displayName) {
        console.log(`         Name: ${user.displayName}`);
      }
      if (Object.keys(user.customClaims || {}).length > 0) {
        console.log(`         Claims: ${JSON.stringify(user.customClaims)}`);
      }
      console.log("");
    });

    const adminCount = listUsersResult.users.filter(
      (u) => u.customClaims?.admin === true
    ).length;

    console.log(`\nTotal users: ${listUsersResult.users.length}`);
    console.log(`Admin users: ${adminCount}\n`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
    } else {
      console.error("❌ Unknown error occurred");
    }
    process.exit(1);
  }
}

listAdmins();
