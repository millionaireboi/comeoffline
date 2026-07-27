/**
 * WhatsApp inbox — inbound message persistence + reply threads.
 *
 * Data model:
 *   whatsapp_conversations/{phone}                one doc per counterparty (rollup for the list view)
 *   whatsapp_conversations/{phone}/messages/{id}  both directions ("in" from the webhook, "out" replies)
 *   whatsapp_optouts/{phone}                      people who replied STOP — campaign audiences skip these
 *
 * Why this exists: a Cloud API number has no phone-app inbox, so before this,
 * replies to campaign blasts only appeared as one console.log line in Cloud Run.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../config/firebase-admin";
import { sendText, normalizeRecipient } from "./whatsapp.service";

export interface InboundWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  image?: { id?: string; caption?: string };
  video?: { id?: string; caption?: string };
  audio?: { id?: string; voice?: boolean };
  document?: { id?: string; filename?: string };
  location?: { latitude?: number; longitude?: number; name?: string };
  reaction?: { emoji?: string; message_id?: string };
}

/** Replies that mean "stop messaging me". Kept deliberately narrow — a reply like
 *  "stop by anytime!" should not opt anyone out, hence the full-string anchor. */
const OPT_OUT_RE = /^\s*(stop|unsubscribe|opt\s*-?\s*out|remove\s+me)\s*[.!]*\s*$/i;
const OPT_IN_RE = /^\s*(start|unstop|resubscribe|opt\s*-?\s*in)\s*[.!]*\s*$/i;

/** Best-effort human-readable text for any inbound message type. */
export function extractInboundText(msg: InboundWebhookMessage): string {
  switch (msg.type) {
    case "text":
      return msg.text?.body ?? "";
    case "button":
      return msg.button?.text ?? "[button]";
    case "interactive":
      return (
        msg.interactive?.button_reply?.title ??
        msg.interactive?.list_reply?.title ??
        "[interactive]"
      );
    case "image":
      return msg.image?.caption ? `[image] ${msg.image.caption}` : "[image]";
    case "video":
      return msg.video?.caption ? `[video] ${msg.video.caption}` : "[video]";
    case "audio":
      return msg.audio?.voice ? "[voice note]" : "[audio]";
    case "document":
      return `[document${msg.document?.filename ? `: ${msg.document.filename}` : ""}]`;
    case "location":
      return `[location${msg.location?.name ? `: ${msg.location.name}` : ""}]`;
    case "reaction":
      return `[reacted ${msg.reaction?.emoji ?? ""}]`;
    default:
      return `[${msg.type}]`;
  }
}

/**
 * Persist one inbound message from the webhook. Idempotent on the wamid —
 * Meta redelivers webhooks, and a redelivery must not double-count unread.
 */
export async function recordInboundMessage(
  msg: InboundWebhookMessage,
  profileName: string | null,
): Promise<void> {
  const db = await getDb();
  const phone = normalizeRecipient(msg.from);
  if (!phone) return;

  const convRef = db.collection("whatsapp_conversations").doc(phone);
  const msgRef = convRef.collection("messages").doc(msg.id);
  if ((await msgRef.get()).exists) return; // webhook redelivery

  const tsMs = parseInt(msg.timestamp, 10) * 1000;
  const at = Number.isFinite(tsMs) ? new Date(tsMs).toISOString() : new Date().toISOString();
  const text = extractInboundText(msg);

  // Link to a member if the phone matches — users store numbers with or without "+".
  let userId: string | null = null;
  let userName: string | null = null;
  for (const candidate of [phone, `+${phone}`]) {
    const match = await db
      .collection("users")
      .where("phone_number", "==", candidate)
      .limit(1)
      .get();
    if (!match.empty) {
      userId = match.docs[0].id;
      userName = (match.docs[0].data() as { name?: string }).name ?? null;
      break;
    }
  }

  await msgRef.set({
    id: msg.id,
    direction: "in",
    type: msg.type,
    text,
    at,
  });

  const optedOut = OPT_OUT_RE.test(text);
  const optedBackIn = OPT_IN_RE.test(text);

  await convRef.set(
    {
      phone,
      ...(profileName ? { profile_name: profileName } : {}),
      user_id: userId,
      user_name: userName,
      last_message_text: text.slice(0, 200),
      last_message_at: at,
      last_direction: "in",
      unread_count: FieldValue.increment(1),
      ...(optedOut ? { opted_out: true } : {}),
      ...(optedBackIn ? { opted_out: false } : {}),
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );

  if (optedOut) {
    await db.collection("whatsapp_optouts").doc(phone).set({
      phone,
      opted_out_at: at,
      source: "inbound_stop",
      text,
    });
    console.log(`[whatsapp-inbox] OPT-OUT recorded for ${phone} ("${text}")`);
  } else if (optedBackIn) {
    await db.collection("whatsapp_optouts").doc(phone).delete().catch(() => {});
    console.log(`[whatsapp-inbox] opt-out cleared for ${phone} ("${text}")`);
  }
}

export interface ConversationSummary {
  phone: string;
  profile_name?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  last_message_text?: string;
  last_message_at?: string;
  last_direction?: "in" | "out";
  unread_count?: number;
  opted_out?: boolean;
}

export async function listConversations(limit = 100): Promise<ConversationSummary[]> {
  const db = await getDb();
  const snap = await db
    .collection("whatsapp_conversations")
    .orderBy("last_message_at", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as ConversationSummary);
}

export interface ThreadMessage {
  id: string;
  direction: "in" | "out";
  type: string;
  text: string;
  at: string;
  sent_by?: string;
  error?: string;
}

/** Fetch a conversation thread (oldest first) and clear its unread counter. */
export async function getThread(
  phone: string,
  limit = 200,
): Promise<{ conversation: ConversationSummary | null; messages: ThreadMessage[] }> {
  const db = await getDb();
  const normalized = normalizeRecipient(phone);
  const convRef = db.collection("whatsapp_conversations").doc(normalized);
  const [convSnap, msgsSnap] = await Promise.all([
    convRef.get(),
    convRef.collection("messages").orderBy("at", "desc").limit(limit).get(),
  ]);
  if (convSnap.exists && ((convSnap.data() as ConversationSummary).unread_count ?? 0) > 0) {
    await convRef.update({ unread_count: 0 }).catch(() => {});
  }
  return {
    conversation: convSnap.exists ? (convSnap.data() as ConversationSummary) : null,
    messages: msgsSnap.docs.map((d) => d.data() as ThreadMessage).reverse(),
  };
}

/**
 * Free-form reply into the 24h customer-service window. Outside the window Meta
 * rejects with 131047 — surfaced as a friendly error so the admin knows to use
 * a template instead.
 */
export async function replyToConversation(
  phone: string,
  text: string,
  sentBy: string,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string; code?: number }> {
  const db = await getDb();
  const normalized = normalizeRecipient(phone);
  const result = await sendText({ to: normalized, body: text });
  if (!result.ok) {
    const windowClosed = result.code === 131047;
    return {
      ok: false,
      code: result.code,
      error: windowClosed
        ? "The 24h reply window has closed (they last messaged over a day ago) — WhatsApp only allows template messages now."
        : result.error,
    };
  }

  const nowIso = new Date().toISOString();
  const convRef = db.collection("whatsapp_conversations").doc(normalized);
  await convRef.collection("messages").doc(result.messageId).set({
    id: result.messageId,
    direction: "out",
    type: "text",
    text,
    at: nowIso,
    sent_by: sentBy,
  });
  await convRef.set(
    {
      phone: normalized,
      last_message_text: text.slice(0, 200),
      last_message_at: nowIso,
      last_direction: "out",
      updated_at: nowIso,
    },
    { merge: true },
  );
  return { ok: true, messageId: result.messageId };
}

/** Phones that have opted out — campaign audience resolution skips these. */
export async function listOptedOutPhones(): Promise<Set<string>> {
  const db = await getDb();
  const snap = await db.collection("whatsapp_optouts").select().get();
  return new Set(snap.docs.map((d) => d.id));
}
