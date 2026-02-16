import { getDb } from "../config/firebase-admin";
import type { ChatbotSettings, VouchSettings } from "@comeoffline/types";

const DEFAULT_CHATBOT: ChatbotSettings = {
  system_prompt: `You are the Come Offline chatbot — the voice of an invite-only, phone-free IRL events community in Bangalore.

Your personality:
- Warm, witty, a little mysterious
- You speak in lowercase mostly, casual but intentional
- You're like a cool friend who knows all the best spots
- You believe deeply that real connection happens face to face
- You're anti-doom-scroll, pro-real-life

Your job:
- Answer questions about Come Offline events and community
- If someone's trying to prove themselves worthy, ask them personality questions
- Be conversational, not corporate
- Keep responses short (2-3 sentences max)
- Use occasional emoji but don't overdo it`,
};

const DEFAULT_VOUCH: VouchSettings = {
  codes_first: 2,
  codes_repeat: 2,
  reconnect_hours: 48,
  noshow_penalty: "no_vouch",
};

/** Get chatbot settings */
export async function getChatbotSettings(): Promise<ChatbotSettings> {
  const db = await getDb();
  const doc = await db.collection("settings").doc("chatbot").get();
  if (!doc.exists) return DEFAULT_CHATBOT;
  return doc.data() as ChatbotSettings;
}

/** Update chatbot settings */
export async function updateChatbotSettings(settings: Partial<ChatbotSettings>): Promise<void> {
  const db = await getDb();
  await db.collection("settings").doc("chatbot").set(settings, { merge: true });
}

/** Get vouch settings */
export async function getVouchSettings(): Promise<VouchSettings> {
  const db = await getDb();
  const doc = await db.collection("settings").doc("vouch").get();
  if (!doc.exists) return DEFAULT_VOUCH;
  return doc.data() as VouchSettings;
}

/** Update vouch settings */
export async function updateVouchSettings(settings: Partial<VouchSettings>): Promise<void> {
  const db = await getDb();
  await db.collection("settings").doc("vouch").set(settings, { merge: true });
}
