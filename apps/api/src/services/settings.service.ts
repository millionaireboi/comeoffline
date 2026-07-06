import { getDb } from "../config/firebase-admin";
import type { ChatbotSettings } from "@comeoffline/types";

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

