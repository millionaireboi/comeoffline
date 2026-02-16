import { getDb } from "../config/firebase-admin";
import type { User, Event, RSVP, Badge, VouchCode } from "@comeoffline/types";

interface ProfileData {
  user: User;
  stats: {
    events_attended: number;
    connections_made: number;
    vouch_codes_earned: number;
    vouch_codes_used: number;
  };
  event_history: Array<{
    event_id: string;
    title: string;
    emoji: string;
    date: string;
    status: string;
  }>;
  badges: Badge[];
}

/** Get full profile for a user */
export async function getUserProfile(userId: string): Promise<ProfileData | null> {
  const db = await getDb();
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return null;

  const user = { id: userDoc.id, ...userDoc.data() } as User;

  // Get event history - optimized to avoid N+1 query
  // First, get all events this user has RSVPs for using collectionGroup
  const eventHistory: ProfileData["event_history"] = [];
  let eventsAttended = 0;

  // Query all RSVPs for this user across all events using collectionGroup
  const userRsvpsSnap = await db
    .collectionGroup("rsvps")
    .where("user_id", "==", userId)
    .where("status", "in", ["confirmed", "attended"])
    .get();

  // Get unique event IDs from RSVPs
  const eventIds = [...new Set(userRsvpsSnap.docs.map((doc) => {
    // Extract event ID from path: events/{eventId}/rsvps/{rsvpId}
    return doc.ref.parent.parent!.id;
  }))];

  // Batch fetch event details (max 10 per getAll call due to Firestore limits)
  if (eventIds.length > 0) {
    // Split into chunks of 10 for Firestore batch read limits
    const eventChunks: string[][] = [];
    for (let i = 0; i < eventIds.length; i += 10) {
      eventChunks.push(eventIds.slice(i, i + 10));
    }

    // Fetch all event documents in parallel
    const eventDocs = await Promise.all(
      eventChunks.map((chunk) =>
        db.getAll(...chunk.map((id) => db.collection("events").doc(id)))
      )
    ).then((results) => results.flat());

    // Build event map for quick lookup
    const eventMap = new Map(
      eventDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data() as Event])
    );

    // Build event history from RSVPs and event data
    for (const rsvpDoc of userRsvpsSnap.docs) {
      const eventId = rsvpDoc.ref.parent.parent!.id;
      const event = eventMap.get(eventId);
      if (event) {
        const rsvp = rsvpDoc.data() as RSVP;
        eventHistory.push({
          event_id: eventId,
          title: event.title,
          emoji: event.emoji,
          date: event.date,
          status: rsvp.status,
        });
        if (rsvp.status === "attended") eventsAttended++;
      }
    }
  }

  // Get connection count
  const connectionsSnap = await db
    .collection("connections")
    .where("from_user_id", "==", userId)
    .where("mutual", "==", true)
    .get();

  // Get vouch code stats
  const vouchSnap = await db
    .collection("vouch_codes")
    .where("owner_id", "==", userId)
    .get();

  const vouchCodes = vouchSnap.docs.map((d) => d.data() as VouchCode);
  const vouchUsed = vouchCodes.filter((c) => c.status === "used").length;

  return {
    user,
    stats: {
      events_attended: eventsAttended,
      connections_made: connectionsSnap.size,
      vouch_codes_earned: vouchCodes.length,
      vouch_codes_used: vouchUsed,
    },
    event_history: eventHistory.sort((a, b) => b.date.localeCompare(a.date)),
    badges: user.badges || [],
  };
}

/** Update user profile fields */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "handle" | "vibe_tag" | "instagram_handle" | "has_seen_welcome" | "fcm_token">>,
): Promise<void> {
  const db = await getDb();
  await db.collection("users").doc(userId).update(updates);
}
