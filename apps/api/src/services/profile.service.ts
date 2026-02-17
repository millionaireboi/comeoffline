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

  // Fetch stats in parallel — each query is independent and non-critical.
  // If any fails (e.g. missing index), return zeroed stats instead of crashing.
  const [eventResult, connectionsResult, vouchResult] = await Promise.allSettled([
    // Event history via collectionGroup RSVPs
    (async () => {
      const eventHistory: ProfileData["event_history"] = [];
      let eventsAttended = 0;

      const userRsvpsSnap = await db
        .collectionGroup("rsvps")
        .where("user_id", "==", userId)
        .where("status", "in", ["confirmed", "attended"])
        .get();

      const eventIds = [...new Set(userRsvpsSnap.docs.map((doc) =>
        doc.ref.parent.parent!.id
      ))];

      if (eventIds.length > 0) {
        const eventChunks: string[][] = [];
        for (let i = 0; i < eventIds.length; i += 10) {
          eventChunks.push(eventIds.slice(i, i + 10));
        }

        const eventDocs = await Promise.all(
          eventChunks.map((chunk) =>
            db.getAll(...chunk.map((id) => db.collection("events").doc(id)))
          )
        ).then((results) => results.flat());

        const eventMap = new Map(
          eventDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data() as Event])
        );

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

      return { eventHistory, eventsAttended };
    })(),

    // Connections count
    db.collection("connections")
      .where("from_user_id", "==", userId)
      .where("mutual", "==", true)
      .get(),

    // Vouch codes
    db.collection("vouch_codes")
      .where("owner_id", "==", userId)
      .get(),
  ]);

  // Extract results with fallbacks
  const { eventHistory, eventsAttended } = eventResult.status === "fulfilled"
    ? eventResult.value
    : (console.warn("[profile] Event history query failed:", (eventResult as PromiseRejectedResult).reason), { eventHistory: [], eventsAttended: 0 });

  const connectionCount = connectionsResult.status === "fulfilled"
    ? connectionsResult.value.size
    : (console.warn("[profile] Connections query failed:", (connectionsResult as PromiseRejectedResult).reason), 0);

  const vouchCodes = vouchResult.status === "fulfilled"
    ? vouchResult.value.docs.map((d) => d.data() as VouchCode)
    : (console.warn("[profile] Vouch codes query failed:", (vouchResult as PromiseRejectedResult).reason), [] as VouchCode[]);

  const vouchUsed = vouchCodes.filter((c) => c.status === "used").length;

  return {
    user,
    stats: {
      events_attended: eventsAttended,
      connections_made: connectionCount,
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
  updates: Partial<Pick<User,
    | "name" | "handle" | "vibe_tag" | "instagram_handle" | "has_seen_welcome" | "fcm_token"
    | "avatar_url" | "avatar_type" | "area" | "age_range" | "hot_take"
    | "drink_of_choice" | "referral_source" | "has_completed_profile"
    | "has_completed_onboarding" | "onboarding_source"
  >>,
): Promise<void> {
  const db = await getDb();
  await db.collection("users").doc(userId).update(updates);
}

/** Check if a handle is available */
export async function checkHandleAvailable(handle: string): Promise<boolean> {
  const db = await getDb();
  const snap = await db.collection("users").where("handle", "==", handle).limit(1).get();
  return snap.empty;
}
