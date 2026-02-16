import { getDb } from "../config/firebase-admin";
import type { Connection, User, RSVP } from "@comeoffline/types";

interface AttendeeInfo {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  instagram_handle?: string;
  connected: boolean;
  mutual: boolean;
}

/** Get attendees for an event (only users with attended or confirmed RSVPs) */
export async function getEventAttendees(
  eventId: string,
  currentUserId: string,
): Promise<AttendeeInfo[]> {
  const db = await getDb();
  // Get all confirmed/attended RSVPs
  const rsvpSnap = await db
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .where("status", "in", ["confirmed", "attended"])
    .get();

  const userIds = rsvpSnap.docs
    .map((doc) => (doc.data() as RSVP).user_id)
    .filter((uid) => uid !== currentUserId);

  if (userIds.length === 0) return [];

  // Get user profiles
  const userDocs = await Promise.all(
    userIds.map((uid) => db.collection("users").doc(uid).get()),
  );

  // Get existing connections from current user
  const connectionsSnap = await db
    .collection("connections")
    .where("event_id", "==", eventId)
    .where("from_user_id", "==", currentUserId)
    .get();

  const outgoing = new Map(
    connectionsSnap.docs.map((doc) => [doc.data().to_user_id, doc.data() as Connection]),
  );

  // Get incoming connections to current user
  const incomingSnap = await db
    .collection("connections")
    .where("event_id", "==", eventId)
    .where("to_user_id", "==", currentUserId)
    .get();

  const incoming = new Set(
    incomingSnap.docs.map((doc) => doc.data().from_user_id),
  );

  return userDocs
    .filter((doc) => doc.exists)
    .map((doc) => {
      const user = doc.data() as User;
      const hasOutgoing = outgoing.has(doc.id);
      const hasIncoming = incoming.has(doc.id);
      const isMutual = hasOutgoing && hasIncoming;

      return {
        id: doc.id,
        name: user.name,
        handle: user.handle,
        vibe_tag: user.vibe_tag,
        instagram_handle: isMutual ? user.instagram_handle : undefined,
        connected: hasOutgoing,
        mutual: isMutual,
      };
    });
}

/** Create a connection request (one-way until mutual) */
export async function createConnection(
  eventId: string,
  fromUserId: string,
  toUserId: string,
): Promise<{ connection: Connection; mutual: boolean }> {
  const db = await getDb();
  // Check reconnect window — server-side enforcement
  const eventDoc = await db.collection("events").doc(eventId).get();
  if (eventDoc.exists) {
    const eventDate = new Date(eventDoc.data()!.date);
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(deadline.getHours() + 48); // 48-hour window after event day + 1

    if (new Date() > deadline) {
      throw new Error("Reconnect window has closed");
    }
  }

  // Check for existing outgoing connection
  const existingSnap = await db
    .collection("connections")
    .where("event_id", "==", eventId)
    .where("from_user_id", "==", fromUserId)
    .where("to_user_id", "==", toUserId)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const existing = { id: existingSnap.docs[0].id, ...existingSnap.docs[0].data() } as Connection;
    return { connection: existing, mutual: existing.mutual };
  }

  // Check for incoming connection (this would make it mutual)
  const incomingSnap = await db
    .collection("connections")
    .where("event_id", "==", eventId)
    .where("from_user_id", "==", toUserId)
    .where("to_user_id", "==", fromUserId)
    .limit(1)
    .get();

  const isMutual = !incomingSnap.empty;

  // Set reconnect window (48 hours from now)
  const windowExpires = new Date();
  windowExpires.setHours(windowExpires.getHours() + 48);

  // Create connection
  const ref = db.collection("connections").doc();
  const connectionData = {
    event_id: eventId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    mutual: isMutual,
    window_expires: windowExpires.toISOString(),
  };

  await ref.set(connectionData);

  // If mutual, update the other connection too
  if (isMutual) {
    await incomingSnap.docs[0].ref.update({ mutual: true });
  }

  return {
    connection: { id: ref.id, ...connectionData },
    mutual: isMutual,
  };
}

/** Get all mutual connections for a user */
export async function getUserMutualConnections(userId: string): Promise<Connection[]> {
  const db = await getDb();
  const snap = await db
    .collection("connections")
    .where("from_user_id", "==", userId)
    .where("mutual", "==", true)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Connection);
}
