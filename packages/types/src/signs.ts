// ── Sign System ──────────────────────────────────

export type SignKey = "bandar" | "labrador" | "cat" | "mynah" | "redpanda" | "peacock";

export const SIGN_KEYS: SignKey[] = ["bandar", "labrador", "cat", "mynah", "redpanda", "peacock"];

export interface SignData {
  name: string;
  short: string;
  emoji: string;
  color: string;
  tagline: string;
  desc: string;
  energy: string;
  vibe: string;
  superpower: string;
  best: { sign: SignKey; reason: string };
  worst: { sign: SignKey; reason: string };
}

export const SIGNS: Record<SignKey, SignData> = {
  bandar: {
    name: "the bandar",
    short: "bandar",
    emoji: "\u{1F412}",
    color: "#D4836B",
    tagline: "you don\u2019t cause chaos. chaos just has your number on speed dial.",
    desc: "you\u2019re the one who suggests \u2018one last round\u2019 at 1am, convinces everyone to switch plans mid-auto-ride, and has somehow made friends with the bouncer, the bartender, AND the parking guy. your energy is contagious and slightly illegal. people either love you or need a nap after being around you.",
    energy: "chaotic",
    vibe: "spontaneous",
    superpower: "turning boring into unforgettable",
    best: { sign: "labrador", reason: "someone has to keep you alive" },
    worst: { sign: "bandar", reason: "the city can\u2019t handle two of you" },
  },
  labrador: {
    name: "the labrador",
    short: "labrador",
    emoji: "\u{1F415}",
    color: "#D4A574",
    tagline: "you\u2019ve emotionally adopted everyone you\u2019ve ever met. including that uber driver.",
    desc: "you remember everyone\u2019s birthday, reply to every instagram story with genuine enthusiasm, and have said \u2018aww you guys\u2019 at least 4 times today. your whatsapp is 90% voice notes of you hyping your friends up. the auto guy, the chai wala, your friend\u2019s random cousin \u2014 they all think you\u2019re their best friend.",
    energy: "warm",
    vibe: "wholesome",
    superpower: "making strangers feel like family",
    best: { sign: "cat", reason: "you\u2019ll coax them out of hiding" },
    worst: { sign: "labrador", reason: "you literally love everyone. it\u2019s a problem." },
  },
  cat: {
    name: "the cat",
    short: "cat",
    emoji: "\u{1F408}\u200D\u2B1B",
    color: "#B8A9C9",
    tagline: "shows up once. the whole room remembers it for 6 months.",
    desc: "you left the party without telling anyone and three people texted \u2018wait where did you go??\u2019 your energy is rare and that\u2019s exactly why people want more of it. you\u2019re not antisocial \u2014 you\u2019re selectively social and there\u2019s a massive difference. you\u2019ve irish-exited more gatherings than most people have attended.",
    energy: "mysterious",
    vibe: "selective",
    superpower: "making absence feel magnetic",
    best: { sign: "mynah", reason: "they respect your silence" },
    worst: { sign: "labrador", reason: "they will FIND you and they will hug you" },
  },
  mynah: {
    name: "the mynah",
    short: "mynah",
    emoji: "\u{1F426}",
    color: "#A8B5A0",
    tagline: "you have takes. hot ones. and you\u2019ve got the google reviews to back them up.",
    desc: "you are the group\u2019s unofficial yelp, relationship counselor, and debate team captain. you\u2019ve rated every restaurant within 5km on zomato and have strong feelings about which filter coffee is overrated. your friends come to you before making any decision. the scariest part? you\u2019re almost always right.",
    energy: "opinionated",
    vibe: "analytical",
    superpower: "being right about everything",
    best: { sign: "bandar", reason: "they desperately need your wisdom" },
    worst: { sign: "mynah", reason: "two mynahs is just a podcast nobody asked for" },
  },
  redpanda: {
    name: "the red panda",
    short: "red panda",
    emoji: "\u{1F43E}",
    color: "#DBBCAC",
    tagline: "takes 3 business days to reply but shows up looking like a whole painting.",
    desc: "your friends have learned to double-text you and not take it personally. you move at your own pace and that pace is \u2018eventually, beautifully.\u2019 you need at least 2 hours advance notice, one backup plan, and a confirmed vibe check before committing to anything. but when you show up? it\u2019s worth every minute.",
    energy: "curated",
    vibe: "intentional",
    superpower: "making lateness look elegant",
    best: { sign: "labrador", reason: "they\u2019ll wait for you patiently" },
    worst: { sign: "bandar", reason: "their spontaneous energy gives you palpitations" },
  },
  peacock: {
    name: "the peacock",
    short: "peacock",
    emoji: "\u{1F99A}",
    color: "#E6A97E",
    tagline: "the outfit is planned. the entrance is timed. the playlist is always yours.",
    desc: "you treat every outing like an opening scene in your personal coming-of-age bollywood film. the auto ride has a spotify queue. the coffee order is aesthetic. you\u2019ve practiced your \u2018oh i didn\u2019t see you\u2019 face and honestly it\u2019s perfected. main character energy isn\u2019t a phase for you, it\u2019s a lifestyle.",
    energy: "main character",
    vibe: "cinematic",
    superpower: "making everything aesthetic",
    best: { sign: "redpanda", reason: "aesthetic power couple" },
    worst: { sign: "peacock", reason: "there can only be one protagonist per scene" },
  },
};

// ── Compatibility Matrix ──────────────────────────
// Symmetric 6x6 matrix (0-100). Complementary energies score HIGH, same-type LOW.

export const COMPAT_MATRIX: Record<SignKey, Record<SignKey, number>> = {
  bandar:   { bandar: 30, labrador: 92, cat: 55, mynah: 78, redpanda: 35, peacock: 62 },
  labrador: { bandar: 92, labrador: 50, cat: 88, mynah: 72, redpanda: 90, peacock: 65 },
  cat:      { bandar: 55, labrador: 88, cat: 25, mynah: 85, redpanda: 72, peacock: 55 },
  mynah:    { bandar: 78, labrador: 72, cat: 85, mynah: 28, redpanda: 58, peacock: 75 },
  redpanda: { bandar: 35, labrador: 90, cat: 72, mynah: 58, redpanda: 45, peacock: 88 },
  peacock:  { bandar: 62, labrador: 65, cat: 55, mynah: 75, redpanda: 88, peacock: 32 },
};

// ── Quiz Questions ──────────────────────────────

export interface QuizOption {
  text: string;
  scores: Partial<Record<SignKey, number>>;
}

export interface QuizQuestion {
  q: string;
  opts: QuizOption[];
}

export const QUESTIONS: QuizQuestion[] = [
  {
    q: "your friends are \u2018planning\u2019 a goa trip. you:",
    opts: [
      { text: "already booked flights. didn\u2019t ask anyone. they\u2019ll adjust.", scores: { bandar: 2, peacock: 1 } },
      { text: "made the whatsapp group, named it \u2018GOA 2026 LESSGOOO \u{1F525}\u2019 and sending reels every hour", scores: { labrador: 2, bandar: 1 } },
      { text: "you\u2019ll believe it when you\u2019re physically at the airport. you\u2019ve seen 14 of these groups die.", scores: { cat: 2, mynah: 1 } },
      { text: "sent a full google doc with itinerary, budget split, and restaurant ratings", scores: { mynah: 2, redpanda: 1 } },
    ],
  },
  {
    q: "swiggy says \u2018arriving in 2 mins\u2019 for the last 20 minutes. you:",
    opts: [
      { text: "already ordered from somewhere else too. double dinner tonight.", scores: { bandar: 2, peacock: 1 } },
      { text: "called the delivery person \u2014 \u2018bhaiya no rush, take your time, all good!\u2019", scores: { labrador: 2, redpanda: 1 } },
      { text: "made maggi 15 minutes ago. you knew this would happen. you always know.", scores: { cat: 2, mynah: 1 } },
      { text: "composing a 4-star zomato review that\u2019s actually a 2-star disguised with politeness", scores: { mynah: 2, peacock: 1 } },
    ],
  },
  {
    q: "you\u2019re at a wedding where you know exactly 1.5 people. you:",
    opts: [
      { text: "somehow end up on the dance floor leading a circle you were not invited to", scores: { bandar: 2, labrador: 1 } },
      { text: "befriended the aunty at your table, her daughter, and now you\u2019re exchanging recipes", scores: { labrador: 2, mynah: 1 } },
      { text: "found a corner with good wifi, ate two plates of biryani, left before anyone noticed", scores: { cat: 2, redpanda: 1 } },
      { text: "observing everything. mentally rating the decor, food, and outfits. debriefing later.", scores: { mynah: 2, peacock: 1 } },
    ],
  },
  {
    q: "the uber driver calls \u2014 \u2018madam/sir cancel maadi please.\u2019 you:",
    opts: [
      { text: "\"no no come only, i\u2019ll give extra 20 rupees\" *argues for 4 minutes*", scores: { bandar: 2, mynah: 1 } },
      { text: "\"oh okay no problem!\" cancel, rebook, get cancelled again, still say \u2018no problem\u2019", scores: { labrador: 2, redpanda: 1 } },
      { text: "you already booked an auto 3 minutes ago as backup. trust issues = survival skills.", scores: { cat: 2, mynah: 1 } },
      { text: "screenshot the cancellation. mentally drafting a tweet about bangalore\u2019s auto mafia.", scores: { peacock: 2, mynah: 1 } },
    ],
  },
  {
    q: "your best friend just got dumped. you\u2019re at their house. you:",
    opts: [
      { text: "\"get up. we\u2019re going out. i know a place. no arguments.\"", scores: { bandar: 2, peacock: 1 } },
      { text: "already there with ice cream, blanket, and a \u2018you deserve better\u2019 speech rehearsed in the auto", scores: { labrador: 2, redpanda: 1 } },
      { text: "sitting quietly next to them. no talking. just existing. that\u2019s enough.", scores: { cat: 2, redpanda: 1 } },
      { text: "pulling up screenshots from 3 months ago \u2014 \u2018i TOLD you about the red flags\u2019", scores: { mynah: 2, bandar: 1 } },
    ],
  },
  {
    q: "it\u2019s sunday morning. your screen time report just dropped. you:",
    opts: [
      { text: "don\u2019t care. already planning something unhinged for tonight.", scores: { bandar: 2, cat: 1 } },
      { text: "shared it in the group chat with \u2018\u{1F62D}\u{1F62D} someone save me\u2019 and now everyone\u2019s comparing", scores: { labrador: 2, peacock: 1 } },
      { text: "yours is suspiciously low because half your apps don\u2019t have notifications on", scores: { cat: 2, redpanda: 1 } },
      { text: "analysing which app took the most time. you will be making a pie chart about this.", scores: { mynah: 2, peacock: 1 } },
    ],
  },
  {
    q: "the compliment that would genuinely break you:",
    opts: [
      { text: "\"you make every boring thing fun. nothing is mid when you\u2019re there.\"", scores: { bandar: 2, labrador: 1 } },
      { text: "\"you make everyone feel like they belong. even the awkward ones.\"", scores: { labrador: 2, redpanda: 1 } },
      { text: "\"i noticed when you left. the whole vibe just... changed.\"", scores: { cat: 2, peacock: 1 } },
      { text: "\"you were right. about everything. i should\u2019ve listened.\"", scores: { mynah: 2, bandar: 1 } },
    ],
  },
];

// ── Quiz Hint Lines (shown below options) ──────

export const QUIZ_HINTS = [
  "just pick what feels right \u2726",
  "the swiggy trauma is real.",
  "wedding survival mode activated.",
  "we\u2019ve all been there. choose your fighter.",
  "no wrong answers. just honest ones.",
  "screen time shame is universal.",
  "last one. this one hits different.",
];

// ── Scoring Utilities ──────────────────────────

export function normalizeScores(rawScores: Record<SignKey, number>): Record<SignKey, number> {
  const total = Object.values(rawScores).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return Object.fromEntries(SIGN_KEYS.map((k) => [k, 1 / 6])) as Record<SignKey, number>;
  }
  return Object.fromEntries(
    Object.entries(rawScores).map(([k, v]) => [k, v / total]),
  ) as Record<SignKey, number>;
}

export function computeCompatibility(
  scoresA: Record<string, number>,
  scoresB: Record<string, number>,
): number {
  const normA = normalizeScores(scoresA as Record<SignKey, number>);
  const normB = normalizeScores(scoresB as Record<SignKey, number>);
  let totalScore = 0;
  for (const signA of SIGN_KEYS) {
    for (const signB of SIGN_KEYS) {
      totalScore += normA[signA] * normB[signB] * COMPAT_MATRIX[signA][signB];
    }
  }
  return Math.round(Math.min(99, Math.max(10, totalScore)));
}

export interface MatchLabel {
  text: string;
  color: string;
  emoji: string;
}

export function getMatchLabel(score: number): MatchLabel {
  if (score >= 85) return { text: "soulmate energy", color: "#8BB67A", emoji: "\u{1F49A}" };
  if (score >= 70) return { text: "great match", color: "#A8B5A0", emoji: "\u2728" };
  if (score >= 55) return { text: "could work", color: "#D4A574", emoji: "\u{1F440}" };
  if (score >= 40) return { text: "spicy tension", color: "#E6A97E", emoji: "\u26A1" };
  return { text: "beautiful disaster", color: "#D4836B", emoji: "\u{1F525}" };
}

export function getWinnerSign(scores: Record<SignKey, number>): SignKey {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as SignKey;
}
