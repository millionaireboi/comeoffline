import { getDb } from "../config/firebase-admin";
import { getPollResults } from "./poll.service";
import crypto from "crypto";
import type { ValidationDecision } from "@comeoffline/types";

interface QueueItem {
  user_id: string;
  name: string;
  handle: string;
  entry_path: string;
  vibe_tag: string;
  vibe_check_answers: Array<{ question: string; answer: string }>;
  second_chance: boolean;
  events_attended: number;
  signals: {
    reconnect_count: number;
    poll_score: number;
    check_in_time?: string;
    admin_notes: string[];
  };
}

/** Get the validation queue — provisional users who attended an event */
export async function getValidationQueue(eventId?: string, limit = 30): Promise<QueueItem[]> {
  const db = await getDb();

  // Get provisional users with limit (default 30 to stay under Firestore 'in' query limit)
  const usersSnap = await db
    .collection("users")
    .where("status", "==", "provisional")
    .limit(limit)
    .get();

  if (usersSnap.empty) return [];

  const userIds = usersSnap.docs.map((d) => d.id);

  // Batch query all tickets for provisional users
  let ticketsQuery = db
    .collection("tickets")
    .where("user_id", "in", userIds.slice(0, 30)) // Firestore 'in' limit is 30
    .where("status", "in", ["checked_in", "confirmed"]);

  if (eventId) {
    ticketsQuery = ticketsQuery.where("event_id", "==", eventId);
  }

  const ticketsSnap = await ticketsQuery.get();
  const ticketsByUser = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  ticketsSnap.docs.forEach((doc) => {
    const userId = doc.data().user_id;
    if (!ticketsByUser.has(userId)) {
      ticketsByUser.set(userId, []);
    }
    ticketsByUser.get(userId)!.push(doc);
  });

  // Batch query all connections for provisional users
  const connectionsSnap = await db
    .collection("connections")
    .where("from_user_id", "in", userIds.slice(0, 30))
    .where("mutual", "==", true)
    .get();

  const connectionsByUser = new Map<string, number>();
  connectionsSnap.docs.forEach((doc) => {
    const userId = doc.data().from_user_id;
    connectionsByUser.set(userId, (connectionsByUser.get(userId) || 0) + 1);
  });

  // Query poll results ONCE (not per user)
  let pollResultsMap: Map<string, number> = new Map();
  if (eventId) {
    const pollResults = await getPollResults(eventId);
    if (pollResults) {
      pollResults.results.forEach((r) => {
        pollResultsMap.set(r.user_id, r.approval_rate || 0);
      });
    }
  }

  // Batch query all admin notes
  let notesQuery = db.collection("admin_notes").where("user_id", "in", userIds.slice(0, 30));
  if (eventId) {
    notesQuery = notesQuery.where("event_id", "==", eventId);
  }
  const notesSnap = await notesQuery.get();

  const notesByUser = new Map<string, string[]>();
  notesSnap.docs.forEach((doc) => {
    const userId = doc.data().user_id;
    if (!notesByUser.has(userId)) {
      notesByUser.set(userId, []);
    }
    notesByUser.get(userId)!.push(doc.data().note as string);
  });

  // Build queue from batched data
  const queue: QueueItem[] = [];

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    const userId = userDoc.id;

    // Check if they have tickets
    const userTickets = ticketsByUser.get(userId);
    if (!userTickets || userTickets.length === 0) continue;

    // Get check-in time
    const checkedInTicket = userTickets.find((d) => d.data().status === "checked_in");
    const checkInTime = checkedInTicket?.data().checked_in_at;

    queue.push({
      user_id: userId,
      name: user.name,
      handle: user.handle,
      entry_path: user.entry_path,
      vibe_tag: user.vibe_tag || "",
      vibe_check_answers: user.vibe_check_answers || [],
      second_chance: user.second_chance || false,
      events_attended: user.events_attended || 0,
      signals: {
        reconnect_count: connectionsByUser.get(userId) || 0,
        poll_score: pollResultsMap.get(userId) || 0,
        check_in_time: checkInTime,
        admin_notes: notesByUser.get(userId) || [],
      },
    });
  }

  return queue;
}

/** Validate a provisional user (admin decision) */
export async function validateUser(
  userId: string,
  decision: ValidationDecision,
  reviewerId: string,
  eventId?: string,
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { success: false, error: "User not found" };
  }

  const user = userDoc.data()!;

  if (user.status !== "provisional") {
    return { success: false, error: "User is not provisional" };
  }

  const reviewId = crypto.randomUUID();

  // Get signals for the review record
  let pollScore = 0;
  let reconnectCount = 0;

  if (eventId) {
    const pollResults = await getPollResults(eventId);
    if (pollResults) {
      const userResult = pollResults.results.find((r) => r.user_id === userId);
      pollScore = userResult?.approval_rate || 0;
    }
  }

  const connectionsSnap = await db
    .collection("connections")
    .where("from_user_id", "==", userId)
    .where("mutual", "==", true)
    .get();
  reconnectCount = connectionsSnap.size;

  // Store the review
  await db.collection("validation_reviews").doc(reviewId).set({
    id: reviewId,
    user_id: userId,
    event_id: eventId || null,
    decision,
    signals: {
      reconnect_count: reconnectCount,
      poll_score: pollScore,
    },
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  });

  // Apply the decision
  switch (decision) {
    case "approved": {
      await userRef.update({
        status: "active",
        validated_at: new Date().toISOString(),
        validated_by: reviewerId,
      });

      // Generate vouch codes for newly active user
      const settings = await db.collection("settings").doc("vouch").get();
      const codesFirst = settings.exists ? settings.data()!.codes_first || 3 : 3;

      for (let i = 0; i < codesFirst; i++) {
        const code = `CO-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        await db.collection("vouch_codes").doc().set({
          id: crypto.randomUUID(),
          code,
          owner_id: userId,
          status: "unused",
          earned_from_event: eventId || "validation",
        });
      }
      break;
    }
    case "another_chance": {
      await userRef.update({ second_chance: true });
      break;
    }
    case "revoked": {
      await userRef.update({ status: "inactive" });
      break;
    }
  }

  return { success: true };
}

/** Add an admin note for a user at an event */
export async function addAdminNote(
  eventId: string,
  userId: string,
  note: string,
  adminId: string,
): Promise<{ success: boolean }> {
  const db = await getDb();
  const noteId = crypto.randomUUID();
  await db.collection("admin_notes").doc(noteId).set({
    id: noteId,
    user_id: userId,
    event_id: eventId,
    note,
    created_by: adminId,
    created_at: new Date().toISOString(),
  });
  return { success: true };
}
