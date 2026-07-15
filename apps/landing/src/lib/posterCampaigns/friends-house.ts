import type { PosterBeat, PosterCampaignConfig } from "./types";

/**
 * Friends House (Sat July 18 2026) — the original guerrilla campaign, served
 * at /hi (printed QRs encode that path directly, so it keeps the bare route).
 *
 * NEXT_PUBLIC_POSTER_EVENT_ID still overrides the event id without a code
 * change, kept from the single-campaign era.
 */

function timeLine(hour: number): string | null {
  if (hour >= 23 || hour < 5)
    return "also — it’s past 11pm and you’re scanning friendship posters. you’re in exactly the right place.";
  if (hour >= 5 && hour < 9) return "scanning friendship posters before 9am. respect the hustle.";
  return null;
}

function buildScript(locLine: string | null, late: string | null): PosterBeat[] {
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

export const friendsHouse: PosterCampaignConfig = {
  slug: "friends-house",
  eventId: process.env.NEXT_PUBLIC_POSTER_EVENT_ID || "DypaseoM65w3wljoLvfV",
  meta: {
    title: "friends house — come offline",
    description:
      "the friend's place you don't have yet. a house, a saturday night, board games, a jam corner, snacks all night. byob. everyone walks in solo — that's the point.",
    ogTitle: "🏠 friends house",
    ogDescription: "not a meetup, not networking, not a dating thing. just the friend's place you don't have yet.",
  },
  locations: {
    "church-street": "standing on church street, scanning a poster about not having friends. bold. we like it.",
    indiranagar: "indiranagar, huh. even 100ft road gets lonely sometimes.",
    koramangala: "koramangala. surrounded by forty thousand startup people and still scanning this. we get it.",
    hsr: "hsr layout — home of run clubs and quiet sundays. you’re our people.",
    cafe: "scanning this in a cafe you came to alone. we see you.",
  },
  timeLine,
  buildScript,
  revealButton: "show me the house 🏠",
  whatsapp: {
    number: "919380906810",
    prompt: "“okay but paying a stranger from a poster feels…” fair.",
    button: "say hi on whatsapp instead",
    note: "a real human replies. usually fast.",
    prefill: (code) => `hey! scanned the friends house poster${code ? ` (${code})` : ""} — tell me more?`,
  },
  house: {
    presents: "come offline presents",
    welcome: "come in. lights are on.",
    note: {
      lines: [
        "yep, this is about making friends.",
        "friends house is a house party. games out, someone on the guitar, snacks till 10, carry your own bottle.",
        "the difference? <strong>everyone comes to meet people.</strong>",
        "<strong>so come over this saturday.</strong>",
        "sat, july 18 · 6–10 pm · yeshwanthpur",
      ],
      signoff: "— friends house 🏠",
      scribble: "↓ proof we actually do this",
    },
    title: "friends house",
    emoji: "🏠",
    tagline: "byob, bring your voice too",
    when: "sat, july 18 · 6–10 pm · bangalore",
    ctaWhen: "sat, jul 18 · 6–10 pm",
    lede: `remember when you didn't have to <em>plan</em> friendships?<br />you just knocked on someone's door.<br />sat on the couch.<br />played whatever game was lying around.<br />talked until someone ordered food.<br /><strong>that's the feeling we're trying to bring back.</strong>`,
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
    soloA: "everyone walks in solo. tickets are one per person, so nobody's arriving with an entourage. you scanned a poster on a wall; you're exactly who this is for.",
    photos: [
      {
        src: "/hi/friends-house/photo-1.jpg",
        alt: "ten people laughing together on bean bags at the last friends house",
        caption: "last house. every single person here walked in solo.",
        w: 1280,
        h: 960,
      },
      {
        src: "/hi/friends-house/photo-2.jpg",
        alt: "the friends house living room — bean bags, warm lamps, the games table",
        caption: "the living room. saturday, this is full.",
        w: 1400,
        h: 1050,
      },
    ],
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
  },
};
