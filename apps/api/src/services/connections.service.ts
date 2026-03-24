import { getDb } from "../config/firebase-admin";
import type { Connection, User, RSVP } from "@comeoffline/types";
import { computeCompatibility, getMatchLabel } from "@comeoffline/types";

interface AttendeeInfo {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  instagram_handle?: string;
  connected: boolean;
  mutual: boolean;
  sign?: string;
  sign_emoji?: string;
  sign_label?: string;
  sign_color?: string;
  compat_score?: number;
  compat_label?: string;
  compat_emoji?: string;
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

  // Fetch current user's sign_scores for compatibility calculation
  const currentUserDoc = await db.collection("users").doc(currentUserId).get();
  const currentUser = currentUserDoc.exists ? (currentUserDoc.data() as User) : null;
  const myScores = currentUser?.sign_scores;

  const attendees = userDocs
    .filter((doc) => doc.exists)
    .map((doc) => {
      const user = doc.data() as User;
      const hasOutgoing = outgoing.has(doc.id);
      const hasIncoming = incoming.has(doc.id);
      const isMutual = hasOutgoing && hasIncoming;

      const info: AttendeeInfo = {
        id: doc.id,
        name: user.name,
        handle: user.handle,
        vibe_tag: user.vibe_tag,
        instagram_handle: isMutual ? user.instagram_handle : undefined,
        connected: hasOutgoing,
        mutual: isMutual,
        sign: user.sign,
        sign_emoji: user.sign_emoji,
        sign_label: user.sign_label,
        sign_color: user.sign_color,
      };

      // Compute compatibility if both users have sign scores
      if (myScores && user.sign_scores) {
        info.compat_score = computeCompatibility(myScores, user.sign_scores);
        const label = getMatchLabel(info.compat_score);
        info.compat_label = label.text;
        info.compat_emoji = label.emoji;
      }

      return info;
    });

  // Sort by compat_score descending (users with scores first, then the rest)
  attendees.sort((a, b) => (b.compat_score ?? -1) - (a.compat_score ?? -1));

  return attendees;
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

/** Pre-event attendee preview — only for ticket holders */
export async function getEventAttendeePreview(
  eventId: string,
  currentUserId: string,
): Promise<Array<{
  id: string;
  name: string;
  avatar_url?: string;
  avatar_type?: string;
  sign_emoji?: string;
  sign_label?: string;
  sign_color?: string;
  interests?: string[];
}>> {
  const db = await getDb();

  // Verify current user has a confirmed ticket for this event
  const myTicketSnap = await db
    .collection("tickets")
    .where("event_id", "==", eventId)
    .where("user_id", "==", currentUserId)
    .where("status", "in", ["confirmed", "checked_in", "partially_checked_in"])
    .limit(1)
    .get();

  // Also check RSVPs (free events)
  const myRsvpSnap = myTicketSnap.empty
    ? await db
        .collection("events")
        .doc(eventId)
        .collection("rsvps")
        .where("user_id", "==", currentUserId)
        .where("status", "in", ["confirmed", "attended"])
        .limit(1)
        .get()
    : null;

  if (myTicketSnap.empty && (!myRsvpSnap || myRsvpSnap.empty)) {
    return []; // User doesn't have a ticket
  }

  // Fetch all confirmed tickets for this event
  const ticketSnap = await db
    .collection("tickets")
    .where("event_id", "==", eventId)
    .where("status", "in", ["confirmed", "checked_in", "partially_checked_in"])
    .get();

  // Also fetch RSVPs
  const rsvpSnap = await db
    .collection("events")
    .doc(eventId)
    .collection("rsvps")
    .where("status", "in", ["confirmed", "attended"])
    .get();

  const userIds = new Set<string>();
  ticketSnap.docs.forEach((doc) => {
    const uid = doc.data().user_id;
    if (uid !== currentUserId) userIds.add(uid);
  });
  rsvpSnap.docs.forEach((doc) => {
    const uid = (doc.data() as RSVP).user_id;
    if (uid !== currentUserId) userIds.add(uid);
  });

  if (userIds.size === 0) return [];

  // Batch fetch user profiles (max 10 per getAll call)
  const uidArray = [...userIds];
  const chunks: string[][] = [];
  for (let i = 0; i < uidArray.length; i += 10) {
    chunks.push(uidArray.slice(i, i + 10));
  }

  const userDocs = await Promise.all(
    chunks.map((chunk) =>
      db.getAll(...chunk.map((uid) => db.collection("users").doc(uid)))
    ),
  ).then((results) => results.flat());

  return userDocs
    .filter((doc) => doc.exists)
    .map((doc) => {
      const u = doc.data() as User;
      return {
        id: doc.id,
        name: u.name,
        avatar_url: u.avatar_url,
        avatar_type: u.avatar_type,
        sign_emoji: u.sign_emoji,
        sign_label: u.sign_label,
        sign_color: u.sign_color,
        interests: u.interests,
      };
    });
}

/** Get enriched mutual connections for a user */
export async function getEnrichedConnections(userId: string): Promise<Array<{
  user: { id: string; name: string; handle: string; avatar_url?: string; avatar_type?: string; sign_emoji?: string; sign_label?: string; sign_color?: string; instagram_handle?: string };
  event_title: string;
  connected_at: string;
}>> {
  const db = await getDb();
  const connections = await getUserMutualConnections(userId);
  if (connections.length === 0) return [];

  // Batch fetch users
  const toUserIds = [...new Set(connections.map((c) => c.to_user_id))];
  const userChunks: string[][] = [];
  for (let i = 0; i < toUserIds.length; i += 10) {
    userChunks.push(toUserIds.slice(i, i + 10));
  }
  const userDocs = await Promise.all(
    userChunks.map((chunk) =>
      db.getAll(...chunk.map((uid) => db.collection("users").doc(uid)))
    ),
  ).then((results) => results.flat());
  const userMap = new Map(
    userDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as User]),
  );

  // Batch fetch events
  const eventIds = [...new Set(connections.map((c) => c.event_id))];
  const eventChunks: string[][] = [];
  for (let i = 0; i < eventIds.length; i += 10) {
    eventChunks.push(eventIds.slice(i, i + 10));
  }
  const eventDocs = await Promise.all(
    eventChunks.map((chunk) =>
      db.getAll(...chunk.map((eid) => db.collection("events").doc(eid)))
    ),
  ).then((results) => results.flat());
  const eventMap = new Map(
    eventDocs.filter((d) => d.exists).map((d) => [d.id, d.data()?.title as string || "Unknown Event"]),
  );

  return connections
    .filter((c) => userMap.has(c.to_user_id))
    .map((c) => {
      const u = userMap.get(c.to_user_id)!;
      return {
        user: {
          id: c.to_user_id,
          name: u.name,
          handle: u.handle,
          avatar_url: u.avatar_url,
          avatar_type: u.avatar_type,
          sign_emoji: u.sign_emoji,
          sign_label: u.sign_label,
          sign_color: u.sign_color,
          instagram_handle: u.instagram_handle,
        },
        event_title: eventMap.get(c.event_id) || "Unknown Event",
        connected_at: c.window_expires, // close enough to when they connected
      };
    });
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
