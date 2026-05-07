/**
 * Read-only diagnostic for the add-to-home-screen 24h reminder.
 * Run: npx tsx apps/api/src/scripts/diagnose-install-nudges.ts
 */
import { getDb } from "../config/firebase-admin";

const HOURS = 60 * 60 * 1000;

interface UserShape {
  name?: string;
  phone_number?: string;
  phone_verified_at?: string;
  pwa_installed_at?: string;
  add_to_home_screen_sent_at?: string;
  add_to_home_screen_skipped_reason?: string;
  add_to_home_screen_wamid?: string;
}

async function main() {
  const db = await getDb();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * HOURS).toISOString();

  // 1. All tickets in last 7d, broken down by status
  console.log("\n=== TICKETS IN LAST 7 DAYS ===");
  const allTickets = await db.collection("tickets").get();
  const recentTickets = allTickets.docs.filter((d) => {
    const p = (d.data() as { purchased_at?: string }).purchased_at;
    return p && p >= sevenDaysAgo;
  });
  console.log(`Total tickets in DB: ${allTickets.size}`);
  console.log(`Tickets with purchased_at in last 7d: ${recentTickets.length}`);

  const statusBreakdown: Record<string, number> = {};
  for (const d of recentTickets) {
    const s = (d.data() as { status?: string }).status || "(none)";
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
  }
  console.log("Status breakdown of recent tickets:", statusBreakdown);

  // Show a couple raw recent tickets
  console.log("\n=== SAMPLE RECENT TICKETS ===");
  recentTickets
    .sort((a, b) => {
      const ap = (a.data() as { purchased_at?: string }).purchased_at || "";
      const bp = (b.data() as { purchased_at?: string }).purchased_at || "";
      return bp.localeCompare(ap);
    })
    .slice(0, 8)
    .forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      console.log(`  ticket=${d.id}`, {
        user_id: data.user_id,
        status: data.status,
        purchased_at: data.purchased_at,
        event_id: data.event_id,
      });
    });

  // 2. Users with add_to_home_screen_sent_at
  console.log("\n=== USERS NUDGED (add_to_home_screen_sent_at SET) ===");
  const nudgedSnap = await db
    .collection("users")
    .where("add_to_home_screen_sent_at", ">=", sevenDaysAgo)
    .get();
  console.log(`Nudged in last 7d: ${nudgedSnap.size}`);
  nudgedSnap.docs.slice(0, 20).forEach((d) => {
    const u = d.data() as UserShape;
    console.log(`  - uid=${d.id} name=${u.name} sent_at=${u.add_to_home_screen_sent_at} skipped=${u.add_to_home_screen_skipped_reason || "no"} wamid=${u.add_to_home_screen_wamid || "none"}`);
  });

  // 3. Users with pwa_installed_at set
  console.log("\n=== USERS WITH PWA INSTALLED ===");
  const installedSnap = await db
    .collection("users")
    .where("pwa_installed_at", ">=", sevenDaysAgo)
    .get();
  console.log(`Installed PWA in last 7d: ${installedSnap.size}`);

  // 4. Walk all users with phone_verified_at set in last 7d and see their ticket state
  console.log("\n=== RECENTLY-VERIFIED USERS (last 7d) — ticket + nudge state ===");
  const recentVerifiedSnap = await db
    .collection("users")
    .where("phone_verified_at", ">=", sevenDaysAgo)
    .get();
  console.log(`Users phone-verified in last 7d: ${recentVerifiedSnap.size}`);

  for (const userDoc of recentVerifiedSnap.docs) {
    const u = userDoc.data() as UserShape & { phone_verified_at?: string };
    const ticketsForUser = await db
      .collection("tickets")
      .where("user_id", "==", userDoc.id)
      .get();
    const ticketStatuses = ticketsForUser.docs.map((d) => {
      const t = d.data() as { status?: string; purchased_at?: string };
      return `${t.status}@${t.purchased_at?.slice(5, 16)}`;
    });
    console.log(
      `  uid=${userDoc.id} name=${u.name} verified=${u.phone_verified_at?.slice(0, 16)} ` +
        `tickets=[${ticketStatuses.join(", ") || "none"}] ` +
        `nudge_sent=${u.add_to_home_screen_sent_at ? "yes" : "no"} ` +
        `installed=${u.pwa_installed_at ? "yes" : "no"}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
