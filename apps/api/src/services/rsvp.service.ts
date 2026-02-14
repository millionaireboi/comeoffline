import { db } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { RSVP, Event } from "@comeoffline/types";

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
  const eventRef = db.collection("events").doc(eventId);

  return db.runTransaction(async (tx) => {
    const eventDoc = await tx.get(eventRef);
    if (!eventDoc.exists) {
      return { success: false, error: "Event not found" };
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    // Check if event is open for RSVPs
    if (event.status !== "upcoming") {
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
  const eventRef = db.collection("events").doc(eventId);
  const rsvpRef = eventRef.collection("rsvps").doc(rsvpId);

  return db.runTransaction(async (tx) => {
    const rsvpDoc = await tx.get(rsvpRef);
    if (!rsvpDoc.exists) return false;

    const data = rsvpDoc.data();
    if (data?.user_id !== userId || data?.status !== "confirmed") return false;

    tx.update(rsvpRef, { status: "cancelled" });
    tx.update(eventRef, { spots_taken: FieldValue.increment(-1) });
    return true;
  });
}
