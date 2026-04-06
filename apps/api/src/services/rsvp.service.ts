import { getDb } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import QRCode from "qrcode";
import crypto from "crypto";
import type { RSVP, Event } from "@comeoffline/types";
import { signQrPayload } from "./ticket.service";

interface RsvpResult {
  success: boolean;
  rsvp?: RSVP;
  error?: string;
}

/** Create an RSVP — assigns pickup point, decrements spots atomically */
export async function createRsvp(
  eventId: string,
  userId: string,
  pickupPointName?: string,
): Promise<RsvpResult> {
  const db = await getDb();
  const eventRef = db.collection("events").doc(eventId);

  return db.runTransaction(async (tx) => {
    const eventDoc = await tx.get(eventRef);
    if (!eventDoc.exists) {
      return { success: false, error: "Event not found" };
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    // Check if event is open for RSVPs
    if (event.status === "announced") {
      return { success: false, error: "Event is collecting interest — join the waitlist" };
    }
    if (event.status !== "upcoming" && event.status !== "listed") {
      return { success: false, error: "Event is not accepting RSVPs" };
    }

    const spotsLeft = event.total_spots - event.spots_taken;
    if (spotsLeft <= 0) {
      return { success: false, error: "Event is sold out" };
    }

    // Check for existing RSVP
    const existingSnap = await tx.get(
      eventRef
        .collection("rsvps")
        .where("user_id", "==", userId)
        .where("status", "==", "confirmed")
        .limit(1),
    );

    if (!existingSnap.empty) {
      return { success: false, error: "You already have an RSVP for this event" };
    }

    // Assign pickup point
    let assignedPickup = "TBD";
    if (event.pickup_points.length > 0) {
      if (pickupPointName) {
        const match = event.pickup_points.find((p) => p.name === pickupPointName);
        assignedPickup = match ? match.name : event.pickup_points[0].name;
      } else {
        // Default to first available pickup point
        assignedPickup = event.pickup_points[0].name;
      }
    }

    // Create RSVP
    const rsvpRef = eventRef.collection("rsvps").doc();
    const rsvpData = {
      user_id: userId,
      event_id: eventId,
      pickup_point: assignedPickup,
      status: "confirmed" as const,
      rsvp_at: FieldValue.serverTimestamp(),
    };

    tx.set(rsvpRef, rsvpData);

    // Also write a ticket document so the booking appears in user bookings and admin views,
    // which query the top-level `tickets` collection exclusively.
    const ticketId = crypto.randomUUID();
    const qrPayload = { ticket_id: ticketId, event_id: eventId };
    const qrSignature = signQrPayload(qrPayload);
    const qrData = JSON.stringify({ ...qrPayload, sig: qrSignature });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: "#0E0D0B", light: "#FAF6F0" },
    });

    tx.set(db.collection("tickets").doc(ticketId), {
      id: ticketId,
      user_id: userId,
      event_id: eventId,
      tier_id: "free",
      tier_name: "Free",
      price: 0,
      quantity: 1,
      status: "confirmed" as const,
      qr_code: qrCode,
      pickup_point: assignedPickup,
      time_slot: null,
      add_ons: null,
      seat_id: null,
      section_id: null,
      section_name: null,
      spot_id: null,
      spot_name: null,
      spot_seat_id: null,
      spot_seat_label: null,
      purchased_at: new Date().toISOString(),
      checked_in_at: null,
    });

    // Increment spots taken
    tx.update(eventRef, {
      spots_taken: FieldValue.increment(1),
    });

    return {
      success: true,
      rsvp: { id: rsvpRef.id, ...rsvpData, rsvp_at: new Date().toISOString() } as RSVP,
    };
  });
}

/** Get user's active RSVP for an event */
export async function getUserRsvp(
  eventId: string,
  userId: string,
): Promise<RSVP | null> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .where("user_id", "==", userId)
    .where("status", "in", ["confirmed", "attended"])
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as RSVP;
}

/** Get all RSVPs for an event (admin) */
export async function getEventRsvps(eventId: string): Promise<RSVP[]> {
  const db = await getDb();
  const snap = await db
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .orderBy("rsvp_at", "desc")
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RSVP);
}

/** Cancel an RSVP */
export async function cancelRsvp(
  eventId: string,
  rsvpId: string,
  userId: string,
): Promise<boolean> {
  const db = await getDb();
  const eventRef = db.collection("events").doc(eventId);
  const rsvpRef = eventRef.collection("rsvps").doc(rsvpId);

  return db.runTransaction(async (tx) => {
    const rsvpDoc = await tx.get(rsvpRef);
    if (!rsvpDoc.exists) return false;

    const data = rsvpDoc.data();
    if (data?.user_id !== userId || data?.status !== "confirmed") return false;

    tx.update(rsvpRef, { status: "cancelled" });
    tx.update(eventRef, { spots_taken: FieldValue.increment(-1) });

    // Also cancel the corresponding ticket document
    const ticketSnap = await tx.get(
      db
        .collection("tickets")
        .where("user_id", "==", userId)
        .where("event_id", "==", eventId)
        .where("tier_id", "==", "free")
        .where("status", "==", "confirmed")
        .limit(1),
    );
    if (!ticketSnap.empty) {
      tx.update(ticketSnap.docs[0].ref, { status: "cancelled" });
    }

    return true;
  });
}
