/**
 * Seed script: Populates Firestore with 3 test events + a test vouch code.
 * Run with: npx tsx apps/api/src/scripts/seed-events.ts
 */
import { db } from "../config/firebase-admin";

const events = [
  {
    title: "Galentines",
    tagline: "fries before guys, always.",
    description:
      "a whole day dedicated to the girls. no boys allowed. just vibes, fried food, fizzy drinks, and your loudest opinions.",
    date: "Feb 14, 2026",
    time: "5:00 PM onwards",
    total_spots: 40,
    spots_taken: 28,
    accent: "#DBBCAC",
    accent_dark: "#D4836B",
    emoji: "💅",
    tag: "women only",
    zones: [
      { name: "yapping room", icon: "💬", desc: "bring your loudest opinions" },
      { name: "nails & pampering", icon: "💅", desc: "gel, matte, french — you pick" },
      { name: "unlimited mimosas", icon: "🥂", desc: "bottomless, obviously" },
      { name: "fries & pizza bar", icon: "🍟", desc: "carbs are self care" },
    ],
    dress_code: "whatever makes you feel unstoppable",
    includes: [
      "pickup & drop from metro",
      "unlimited food & drinks",
      "nail bar + pampering zone",
      "polaroid wall",
      "curated playlist",
    ],
    venue_name: "The Courtyard",
    venue_area: "Indiranagar, Bangalore",
    venue_address: "123, 12th Main, Indiranagar",
    venue_reveal_date: "2026-02-08",
    pickup_points: [
      { name: "Indiranagar Metro Station, Exit 2", time: "4:15 PM", capacity: 20 },
      { name: "Koramangala BDA Complex", time: "4:00 PM", capacity: 20 },
    ],
    status: "upcoming",
  },
  {
    title: "No Phone House Party",
    tagline: "remember parties before instagram?",
    description:
      "phones locked in pouches at the door. vinyl corner, board games, an actual dance floor, and conversations that go somewhere.",
    date: "Mar 8, 2026",
    time: "8:00 PM onwards",
    total_spots: 60,
    spots_taken: 32,
    accent: "#D4A574",
    accent_dark: "#B8845A",
    emoji: "📵",
    tag: "phone-free",
    zones: [
      { name: "vinyl corner", icon: "🎵", desc: "bring your own records" },
      { name: "board games", icon: "🎲", desc: "from catan to UNO" },
      { name: "dance floor", icon: "💃", desc: "no phones, all moves" },
      { name: "midnight snacks", icon: "🌮", desc: "taco bar + chai" },
    ],
    dress_code: "your unfiltered self",
    includes: [
      "phone pouch at entry",
      "food & drinks all night",
      "vinyl corner",
      "board game collection",
      "ride back home",
    ],
    venue_reveal_date: "2026-03-01",
    pickup_points: [
      { name: "MG Road Metro Station", time: "7:30 PM", capacity: 30 },
      { name: "HSR BDA Complex", time: "7:15 PM", capacity: 30 },
    ],
    status: "upcoming",
  },
  {
    title: "Holi Detox Party",
    tagline: "organic colours, organic chaos.",
    description:
      "organic colors only. a DJ who reads the room, water guns, bhang lassi (and regular ones), and a chill zone for when you need to breathe.",
    date: "Mar 14, 2026",
    time: "10:00 AM onwards",
    total_spots: 80,
    spots_taken: 0,
    accent: "#B8A9C9",
    accent_dark: "#9B8BB0",
    emoji: "🎨",
    tag: "festival",
    zones: [
      { name: "colour zone", icon: "🎨", desc: "organic colours only" },
      { name: "chill zone", icon: "☁️", desc: "breathe between rounds" },
      { name: "drink bar", icon: "🥤", desc: "bhang lassi + fresh juice" },
      { name: "DJ stage", icon: "🎧", desc: "reads the room, not a playlist" },
    ],
    dress_code: "white (sacrifice it to the vibes)",
    includes: [
      "organic colour packs",
      "water guns",
      "drinks & snacks",
      "chill zone with hammocks",
      "ride coordination",
    ],
    venue_reveal_date: "2026-03-10",
    pickup_points: [
      { name: "Whitefield Bus Stand", time: "9:15 AM", capacity: 40 },
      { name: "Indiranagar Metro Station, Exit 2", time: "9:00 AM", capacity: 40 },
    ],
    status: "upcoming",
  },
];

async function seed() {
  console.log("Seeding events...");

  for (const event of events) {
    const ref = await db.collection("events").add(event);
    console.log(`  ✓ Created "${event.title}" → ${ref.id}`);
  }

  // Also seed a test vouch code
  const existingCode = await db
    .collection("vouch_codes")
    .where("code", "==", "OFFLINE")
    .limit(1)
    .get();

  if (existingCode.empty) {
    const codeRef = await db.collection("vouch_codes").add({
      code: "OFFLINE",
      status: "unused",
      owner_id: null,
      earned_from_event: null,
    });
    console.log(`  ✓ Created vouch code "OFFLINE" → ${codeRef.id}`);
  } else {
    console.log(`  ○ Vouch code "OFFLINE" already exists`);
  }

  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
