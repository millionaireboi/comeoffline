import { getDb } from "../config/firebase-admin";
import crypto from "crypto";

interface PollVote {
  subject_id: string;
  vibed: boolean;
}

/** Create a community poll for an event (targets provisional attendees) */
export async function createPoll(eventId: string) {
  const db = await getDb();
  const pollId = crypto.randomUUID();
  const now = new Date();
  const closesAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

  const pollData = {
    id: pollId,
    event_id: eventId,
    votes: [],
    created_at: now.toISOString(),
    closes_at: closesAt.toISOString(),
  };

  await db.collection("community_polls").doc(pollId).set(pollData);
  return pollData;
}

/** Get the active poll for an event */
export async function getEventPoll(eventId: string) {
  const db = await getDb();
  const snap = await db
    .collection("community_polls")
    .where("event_id", "==", eventId)
    .orderBy("created_at", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;

  const poll = { id: snap.docs[0].id, ...snap.docs[0].data() };

  // Get provisional attendees for this event (people to vote on)
  const ticketSnap = await db
    .collection("tickets")
    .where("event_id", "==", eventId)
    .where("status", "in", ["confirmed", "checked_in"])
    .get();

  const userIds = ticketSnap.docs.map((d) => d.data().user_id as string);

  // Filter to only provisional users
  const subjects: Array<{ id: string; name: string; handle: string; vibe_tag: string }> = [];
  for (const uid of userIds) {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const user = userDoc.data()!;
      if (user.status === "provisional") {
        subjects.push({
          id: uid,
          name: user.name,
          handle: user.handle,
          vibe_tag: user.vibe_tag || "",
        });
      }
    }
  }

  return { ...poll, subjects };
}

/** Submit community poll votes */
export async function submitVotes(
  eventId: string,
  voterId: string,
  votes: PollVote[],
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  // Verify voter is an active member
  const voterDoc = await db.collection("users").doc(voterId).get();
  if (!voterDoc.exists || voterDoc.data()!.status !== "active") {
    return { success: false, error: "Only active members can vote" };
  }

  // Find the poll
  const pollSnap = await db
    .collection("community_polls")
    .where("event_id", "==", eventId)
    .orderBy("created_at", "desc")
    .limit(1)
    .get();

  if (pollSnap.empty) {
    return { success: false, error: "No active poll for this event" };
  }

  const pollDoc = pollSnap.docs[0];
  const poll = pollDoc.data();

  // Check if poll is still open
  if (new Date(poll.closes_at) < new Date()) {
    return { success: false, error: "This poll has closed" };
  }

  // Check if voter already voted
  const existingVotes = (poll.votes || []) as Array<{ voter_id: string }>;
  if (existingVotes.some((v) => v.voter_id === voterId)) {
    return { success: false, error: "You already voted" };
  }

  // Add votes
  const newVotes = votes.map((v) => ({
    voter_id: voterId,
    subject_id: v.subject_id,
    vibed: v.vibed,
  }));

  await pollDoc.ref.update({
    votes: [...existingVotes, ...newVotes],
  });

  return { success: true };
}

/** Get poll results (admin) */
export async function getPollResults(eventId: string) {
  const db = await getDb();
  const pollSnap = await db
    .collection("community_polls")
    .where("event_id", "==", eventId)
    .orderBy("created_at", "desc")
    .limit(1)
    .get();

  if (pollSnap.empty) return null;

  const poll = pollSnap.docs[0].data();
  const votes = (poll.votes || []) as Array<{
    voter_id: string;
    subject_id: string;
    vibed: boolean;
  }>;

  // Aggregate by subject
  const results: Record<string, { vibed: number; total: number }> = {};
  for (const v of votes) {
    if (!results[v.subject_id]) {
      results[v.subject_id] = { vibed: 0, total: 0 };
    }
    results[v.subject_id].total++;
    if (v.vibed) results[v.subject_id].vibed++;
  }

  // Compute approval percentages
  const scoredResults = Object.entries(results).map(([userId, r]) => ({
    user_id: userId,
    approval_rate: r.total > 0 ? Math.round((r.vibed / r.total) * 100) : 0,
    votes_received: r.total,
    vibed_count: r.vibed,
  }));

  return {
    poll_id: pollSnap.docs[0].id,
    event_id: eventId,
    total_voters: new Set(votes.map((v) => v.voter_id)).size,
    closes_at: poll.closes_at,
    results: scoredResults,
  };
}
