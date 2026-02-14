import Anthropic from "@anthropic-ai/sdk";
import { db } from "../config/firebase-admin";
import { env } from "../config/env";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are the Come Offline chatbot — the voice of an invite-only, phone-free IRL events community in Bangalore.

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
- Use occasional emoji but don't overdo it

What you know:
- Come Offline hosts curated, phone-free events in Bangalore
- Events include house parties, dinners, creative sessions, festivals
- Entry is invite-only (vouch code) or prove-yourself (chatbot vibe check)
- Phones are locked away at every event
- The community values authenticity, presence, and real conversation

If someone asks to join without a code, guide them through the prove-yourself path by asking personality questions.`;

/** Get system prompt from Firestore settings, fall back to default */
async function getSystemPrompt(): Promise<string> {
  try {
    const doc = await db.collection("settings").doc("chatbot").get();
    if (doc.exists && doc.data()?.system_prompt) {
      return doc.data()!.system_prompt;
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_SYSTEM_PROMPT;
}

/** Send a chat message and get a response */
export async function chat(
  messages: ChatMessage[],
  userId?: string,
): Promise<string> {
  const systemPrompt = await getSystemPrompt();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 300,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "hmm, i'm at a loss for words. try again?";
}

/** Rate limiting: check if user has exceeded message limit */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const doc = await db.collection("rate_limits").doc(key).get();

  if (!doc.exists) {
    await db.collection("rate_limits").doc(key).set({
      count: 1,
      window_start: new Date().toISOString(),
    });
    return true;
  }

  const data = doc.data()!;
  const windowStart = new Date(data.window_start);
  const now = new Date();
  const hoursSinceStart = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60);

  // Reset window after 1 hour
  if (hoursSinceStart > 1) {
    await db.collection("rate_limits").doc(key).set({
      count: 1,
      window_start: now.toISOString(),
    });
    return true;
  }

  // Allow 20 messages per hour
  if (data.count >= 20) {
    return false;
  }

  await db.collection("rate_limits").doc(key).update({
    count: data.count + 1,
  });
  return true;
}
