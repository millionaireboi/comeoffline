/**
 * One-time backfill: creates a `tickets` document for every confirmed RSVP
 * that doesn't already have one. Run ONCE after deploying the rsvp.service fix.
 *
 * Run with:
 *   npx tsx apps/api/src/scripts/backfill-rsvp-tickets.ts
 *
 * Safe to re-run — skips RSVPs that already have a matching ticket.
 */

import "../config/env"; // loads .env before anything else
import { getDb } from "../config/firebase-admin";
import { signQrPayload } from "../services/ticket.service";
import QRCode from "qrcode";
import crypto from "crypto";

async function main() {
  const db = await getDb();

  console.log("Fetching all events...");
  const eventsSnap = await db.collection("events").get();
  console.log(`Found ${eventsSnap.size} events.`);

  let total = 0;
  let created = 0;
  let skipped = 0;

  for (const eventDoc of eventsSnap.docs) {
    const eventId = eventDoc.id;

    const rsvpsSnap = await eventDoc.ref
      .collection("rsvps")
      .where("status", "in", ["confirmed", "attended"])
      .get();

    if (rsvpsSnap.empty) continue;

    console.log(`\nEvent ${eventId}: ${rsvpsSnap.size} RSVP(s) to check`);

    for (const rsvpDoc of rsvpsSnap.docs) {
      total++;
      const rsvp = rsvpDoc.data();
      const userId: string = rsvp.user_id;

      // Check if a ticket already exists for this user+event (free tier)
      const existingSnap = await db
        .collection("tickets")
        .where("user_id", "==", userId)
        .where("event_id", "==", eventId)
        .where("tier_id", "==", "free")
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        skipped++;
        process.stdout.write(".");
        continue;
      }

      // Generate ticket with QR code
      const ticketId = crypto.randomUUID();
      const qrPayload = { ticket_id: ticketId, event_id: eventId };
      const qrSignature = signQrPayload(qrPayload);
      const qrData = JSON.stringify({ ...qrPayload, sig: qrSignature });
      const qrCode = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: "#0E0D0B", light: "#FAF6F0" },
      });

      const purchasedAt =
        rsvp.rsvp_at?.toDate?.()?.toISOString() ?? new Date().toISOString();

      await db.collection("tickets").doc(ticketId).set({
        id: ticketId,
        user_id: userId,
        event_id: eventId,
        tier_id: "free",
        tier_name: "Free",
        price: 0,
        quantity: 1,
        status: rsvp.status === "attended" ? "checked_in" : "confirmed",
        qr_code: qrCode,
        pickup_point: rsvp.pickup_point ?? "TBD",
        time_slot: null,
        add_ons: null,
        seat_id: null,
        section_id: null,
        section_name: null,
        spot_id: null,
        spot_name: null,
        spot_seat_id: null,
        spot_seat_label: null,
        purchased_at: purchasedAt,
        checked_in_at: rsvp.status === "attended" ? purchasedAt : null,
      });

      created++;
      process.stdout.write("+");
    }
  }

  console.log(`\n\nDone.`);
  console.log(`  RSVPs checked : ${total}`);
  console.log(`  Tickets created: ${created}`);
  console.log(`  Already existed: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
