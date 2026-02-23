import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.googleAiApiKey);

export interface VibeCheckScore {
  engagement: number;
  creativity: number;
  authenticity: number;
  effort: number;
  overall: number;
  reasoning: string;
  passed: boolean;
}

export interface VibeCheckInput {
  answers: { question: string; answer: string }[];
  name: string;
  instagram_handle?: string;
}

const SCORING_PROMPT = `You are evaluating a vibe check conversation for Come Offline, an invite-only IRL events community in Bangalore.

Score each criterion from 1 to 10:
- engagement: Did they actively participate? (1=ignored questions, 10=enthusiastic and responsive)
- creativity: Were their answers interesting or showed personality? (1=totally generic, 10=very creative/unique)
- authenticity: Did they seem genuine and real? (1=clearly fake or bot-like, 10=very authentic)
- effort: Did they put thought into responses? (1=single word answers, 10=thoughtful and detailed)
- overall: Your gut feeling about this person joining our community (1=hard no, 10=absolutely yes)
- reasoning: One sentence explaining your overall impression

BE GENEROUS. We lean toward passing people — the real curation happens at the event itself.
Only score harshly (below 4) if someone gave single-word answers to everything, was rude/aggressive, or clearly didn't care at all.

Return ONLY valid JSON with these exact keys: engagement, creativity, authenticity, effort, overall, reasoning`;

/** Evaluate a completed vibe check conversation and return structured scores */
export async function evaluateVibeCheck(input: VibeCheckInput): Promise<VibeCheckScore> {
  const conversationText = input.answers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const userContext = `Name: ${input.name}${input.instagram_handle ? `\nInstagram: ${input.instagram_handle}` : ""}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  try {
    const result = await model.generateContent([
      { text: SCORING_PROMPT },
      { text: `${userContext}\n\nConversation:\n${conversationText}` },
    ]);

    const text = result.response.text();
    let scores;
    try {
      scores = JSON.parse(text);
    } catch {
      // Fallback: try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scores = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse scoring response");
      }
    }

    const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n || 5)));

    const engagement = clamp(scores.engagement);
    const creativity = clamp(scores.creativity);
    const authenticity = clamp(scores.authenticity);
    const effort = clamp(scores.effort);
    const overall = clamp(scores.overall);
    const reasoning = String(scores.reasoning || "no reasoning provided").slice(0, 500);

    // Backend pass/fail: lean toward passing
    // Pass if overall >= 4 OR at least 2 criteria are >= 5
    const criteriaAbove5 = [engagement, creativity, authenticity, effort].filter((s) => s >= 5).length;
    const passed = overall >= 4 || criteriaAbove5 >= 2;

    return { engagement, creativity, authenticity, effort, overall, reasoning, passed };
  } catch (err) {
    console.error("[vibe-check] Scoring failed, defaulting to pass:", err);
    // If scoring fails, default to pass — don't block users due to AI errors
    return {
      engagement: 5,
      creativity: 5,
      authenticity: 5,
      effort: 5,
      overall: 5,
      reasoning: "scoring unavailable — defaulted to pass",
      passed: true,
    };
  }
}
