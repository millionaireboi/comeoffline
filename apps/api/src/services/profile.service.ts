import { db } from "../config/firebase-admin";
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
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return null;

  const user = { id: userDoc.id, ...userDoc.data() } as User;

  // Get event history from RSVPs across all events
  const eventsSnap = await db.collection("events").get();
  const eventHistory: ProfileData["event_history"] = [];
  let eventsAttended = 0;

  for (const eventDoc of eventsSnap.docs) {
    const rsvpSnap = await eventDoc.ref
      .collection("rsvps")
      .where("user_id", "==", userId)
      .where("status", "in", ["confirmed", "attended"])
      .limit(1)
      .get();

    if (!rsvpSnap.empty) {
      const event = eventDoc.data() as Event;
      const rsvp = rsvpSnap.docs[0].data() as RSVP;
      eventHistory.push({
        event_id: eventDoc.id,
        title: event.title,
        emoji: event.emoji,
        date: event.date,
        status: rsvp.status,
      });
      if (rsvp.status === "attended") eventsAttended++;
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
  updates: Partial<Pick<User, "name" | "handle" | "vibe_tag" | "instagram_handle">>,
): Promise<void> {
  await db.collection("users").doc(userId).update(updates);
}
