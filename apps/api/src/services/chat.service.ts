import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb } from "../config/firebase-admin";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.googleAiApiKey);

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
- Gen-Z energy. Short, punchy. Max 1-2 emojis per message.

Your job:
- Answer questions about Come Offline events and community
- If someone's trying to prove themselves worthy, run a vibe check
- Be conversational, not corporate
- Keep responses short (2-3 sentences max)

What you know:
- Come Offline hosts curated, phone-free events in Bangalore
- Events include house parties, dinners, creative sessions, festivals
- Entry is invite-only (vouch code) or prove-yourself (chatbot vibe check)
- Phones are locked away at every event
- The community values authenticity, presence, and real conversation

VIBE CHECK FLOW (for prove-yourself users):
When someone wants to prove themselves, run a quick vibe check:
1. Ask 2-3 fun personality questions (not corporate). Examples:
   - "what's your go-to move when the aux cord is passed to you?"
   - "describe your ideal saturday night in 5 words"
   - "what's the last thing that made you genuinely laugh out loud?"
2. Ask for their first name
3. Ask for their Instagram handle (just so we know they're real)
4. Make a vibe call based on their energy

PASSING CRITERIA (lean toward passing — real curation happens post-event):
- Pass anyone who engages genuinely and seems fun
- Pass anyone who gives thoughtful/creative answers
- Fail ONLY if they: give single-word answers to everything, are rude/aggressive, clearly don't care

IMPORTANT - When you decide to pass or fail, include one of these EXACT markers at the END of your message:
- [VIBE_CHECK_PASSED] — when you decide they're in
- [VIBE_CHECK_FAILED] — when you decide they're not a fit

Only include the marker when you've collected their name and at least 2 answers and are ready to make a call.
Do NOT include the marker in your early conversational messages.`;

/** Get system prompt from Firestore settings, fall back to default */
async function getSystemPrompt(): Promise<string> {
  try {
    const db = await getDb();
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

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  // Convert messages to Gemini's format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  const chatSession = model.startChat({ history });

  const lastMessage = messages[messages.length - 1];
  const result = await chatSession.sendMessage(lastMessage.content);
  const text = result.response.text();

  return text || "hmm, i'm at a loss for words. try again?";
}

/** Rate limiting: check if user has exceeded message limit */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const db = await getDb();
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
