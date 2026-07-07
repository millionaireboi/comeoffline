/**
 * Poster campaign — everything editable about /hi lives here.
 *
 * Copy changes, new poster locations, and pointing the page at a different
 * event should never require touching PosterLanding.tsx.
 */

/** The event the campaign sells — Friends House (Sat July 18 2026).
 *  NEXT_PUBLIC_POSTER_EVENT_ID overrides it for a future campaign without a
 *  code change; if the live fetch fails, /hi still renders with the static
 *  copy below and the CTA still deep-links this id. */
export const POSTER_EVENT_ID = process.env.NEXT_PUBLIC_POSTER_EVENT_ID || "DypaseoM65w3wljoLvfV";

/** Opening line per printed poster — QR encodes /hi?p=<key>.
 *  Add a key per placement; unknown keys silently fall back to no location line. */
export const POSTER_LOCATIONS: Record<string, string> = {
  "church-street": "standing on church street, scanning a poster about not having friends. bold. we like it.",
  indiranagar: "indiranagar, huh. even 100ft road gets lonely sometimes.",
  koramangala: "koramangala. surrounded by forty thousand startup people and still scanning this. we get it.",
  hsr: "hsr layout — home of run clubs and quiet sundays. you’re our people.",
  cafe: "scanning this in a cafe you came to alone. we see you.",
};

/** Late-night / early-morning easter egg lines, keyed by hour ranges. */
export function timeLine(hour: number): string | null {
  if (hour >= 23 || hour < 5)
    return "also — it’s past 11pm and you’re scanning friendship posters. you’re in exactly the right place.";
  if (hour >= 5 && hour < 9) return "scanning friendship posters before 9am. respect the hustle.";
  return null;
}

export interface PosterChoice {
  label: string;
  react: string[]; // lines the poster replies with; may contain <em> markup
  shake?: boolean; // screen-shake on this answer
}

export interface PosterBeat {
  say: string[]; // lines typed one after another; may contain <em> markup
  ask?: PosterChoice[]; // choices shown after the last line
}

/** The Act-1 conversation. `{loc}` / `{time}` slots are injected at runtime. */
export function buildScript(locLine: string | null, late: string | null): PosterBeat[] {
  const beats: (PosterBeat | null)[] = [
    { say: ["so.", "you actually scanned it."] },
    locLine ? { say: [locLine] } : null,
    { say: ["respect. most people smirk and keep walking."] },
    late ? { say: [late] } : null,
    {
      say: ["be honest — when’s the last time you made a <em>new</em> friend?"],
      ask: [
        { label: "college", react: ["so it’s been… a while.", "no judgment.", "okay — mild judgment."] },
        { label: "can’t remember", react: ["yeah.", "that’s kind of the whole problem, isn’t it."] },
        {
          label: "last week, actually",
          shake: true,
          react: ["sure you did.", "and yet here you are. talking to a poster."],
        },
      ],
    },
    {
      say: ["and this saturday — what’s the plan?"],
      ask: [
        {
          label: "scrolling, probably",
          react: ["the scroll. then 1am. then <em>“what did i even do today.”</em>", "we know. we’ve been there."],
        },
        { label: "i have plans", shake: true, react: ["rewatching a show you’ve seen four times is not plans."] },
        {
          label: "why do you care",
          react: [
            "fair. a poster asking about your weekend <em>is</em> weird.",
            "but we asked because we did something about it.",
          ],
        },
      ],
    },
    {
      say: [
        "okay. real talk for a second.",
        "everyone says <em>“just chill at a friend’s place this weekend.”</em>",
        "except half this city moved here for work or college — and doesn’t have that place.",
        "so we got the place.",
      ],
    },
  ];
  return beats.filter((b): b is PosterBeat => b !== null);
}

export const REVEAL_BUTTON = "show me the house";

/** Act-2 static copy — used verbatim, and as the fallback when the events API
 *  is unreachable (a poster scan must never land on an error page). */
export const HOUSE = {
  presents: "come offline presents",
  title: "friends house",
  emoji: "🏠",
  tagline: "byob, bring your voice too",
  when: "sat, july 18 · 6–10 pm · bangalore",
  ctaWhen: "sat, jul 18 · 6–10 pm",
  lede: `here's the thing about bangalore: you moved here for a job or to study, your real friends are in another city, and saturday is the same pub, the same brunch, or delivery-and-a-show alone in your flat. <strong>friends house breaks that loop.</strong> an actual house party — board games that get competitive, someone jamming in the corner, snacks all night, drinks you carried in yourself. you show up not knowing anyone, <em>and that's the whole point</em> — so does everyone else.`,
  schedule: [
    { t: "6:00", text: "doors open. you walk in solo — so does almost everyone else. that's the design, not an accident." },
    { t: "6:15", text: "you're mid–board game with four strangers before your first drink is done. the game does the talking so you don't have to." },
    { t: "8:00", text: "someone picks up the guitar in the jam corner. by 8:30 the whole room is butchering one chorus together. this is historically the moment strangers become friends." },
    { t: "10:00", text: "phones finally come out — to save numbers. you leave with a few of them, and a saturday you'll actually remember on sunday." },
  ],
  rooms: [
    {
      emoji: "🎲",
      name: "the games room",
      desc: "games that get competitive — that's a promise, not a warning. codenames, uno (house rules, obviously), mafia once the room's warmed up. don't know the rules? even better — getting taught by a stranger is the introduction.",
    },
    {
      emoji: "🎸",
      name: "the jam corner",
      desc: "for whoever brought a guitar — or just wants to sing badly. no stage, no pressure, one corner. the whole room butchering one chorus together is usually the exact moment strangers turn into friends.",
    },
    {
      emoji: "🍿",
      name: "the snack situation",
      desc: "all night. refills keep landing on the table from 6 to 10, so nobody's leaving hungry. drinks are the byob part — carry your own bottle, and offering to share it is the oldest friendship move in the book.",
    },
  ],
  soloQ: "“but i'd be showing up <em>alone</em>—”",
  soloA: "everyone walks in solo. that's not a bug, it's the design — tickets are literally one per person, so nobody's arriving with an entourage. you scanned a poster on a wall; you're exactly who this is for.",
  includes: [
    "snacks on refill, all night",
    "the full games shelf + the jam corner setup",
    "one of 15 seats among people who chose strangers over the scroll this saturday",
  ],
  finePrint: [
    { k: "drinks", v: "byob — bring your own bottle" },
    { k: "dress code", v: "none. pyjamas also ok" },
    { k: "headcount", v: "capped at 15 — house party, not a crowd" },
    { k: "venue", v: "yeshwanthpur — exact address on whatsapp" },
  ],
  fineNote: "— the mystery is part of it ↑",
  notA: ["a meetup", "networking", "a dating thing"],
  truth: "it's the friend's place\nyou don't have yet.",
  worstCase: "worst case? you spend one saturday in a good room instead of on your couch.",
  cta: "come make some →",
  footTagline: "yes, that dino. you've met him every time your wifi died. now come meet everyone else.",
  footNote: "you found this on a wall. tell the door the poster sent you.",
};
