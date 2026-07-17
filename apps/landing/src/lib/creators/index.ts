/**
 * Creator invite pages — /with/<handle>.
 *
 * A creator's bio link. The visitor arrives warm (they watched the reel and
 * clicked on purpose), so the page's job is: recognition → trust → the rooms
 * they'll actually be in → rsvp. Every RSVP hands off with source=creator +
 * utm_campaign=<handle>, so the sale attributes to the creator through the
 * existing ticket attribution — that's what their payout counts on.
 *
 * Onboarding a creator:
 *   1. add a makeCreator({...}) entry to CREATORS below
 *   2. drop their polaroid in public/with/<handle>.jpg (shot in-system:
 *      polaroid crop, film grain — not their press photo)
 *   3. mint /l/<handle> → /with/<handle> (admin → links tab) for their bio;
 *      per-content links get ?p=reel1 / ?p=story — lands in utm_content
 *   4. mint their discount code (their handle, uppercase) in admin → discounts
 */

export interface CreatorRoom {
  /** Upcoming events whose title contains this (case-insensitive) become
   *  cards in "the next few rooms i'll be in" — same trick as poster series.
   *  The cards themselves are the events feed's FeedEventCard, so the event's
   *  own tagline/cover/pricing carry the sell; the creator only adds a tie. */
  titleMatch: string;
  /** The creator's tie, scribbled above the card: "i'll be at this one." /
   *  "i'm running the supper club table." */
  tie: string;
}

export interface CreatorPageConfig {
  /** /with/<handle>, utm_campaign, and (by convention) their discount code */
  handle: string;
  name: string;
  meta: { title: string; description: string };
  /** Caveat line above the headline — the creator's first words, first person */
  heroLine: string;
  /** Instrument Serif hero headline — first person, names the gap directly */
  headline: string;
  /** Rotating seal text: "gate: unlocked by <name>" */
  seal: string;
  /** Their face, shot in-system — polaroid crop, not a glossy headshot.
   *  w/h omitted for remote (storage) urls — rendered as plain img. */
  photo: { src: string; alt: string; caption: string; w?: number; h?: number };
  /** The turn — first person, THEIR voice, our structure
   *  (boring reality → the alternative). May contain <em>. */
  turn: string[];
  turnSign: string;
  /** Events they're actually attending — first upcoming match leads the page */
  rooms: CreatorRoom[];
  roomsTitle: string;
  /** Their discount code, shown nowhere yet but carried for future use */
  discountCode?: string | null;
  /** Past-event polaroids + one or two dry lines from past guests */
  proof: {
    photos: { src: string; alt: string; caption: string; w: number; h: number }[];
    lines: { quote: string; by: string }[];
  };
  /** Objection handling, in voice — the real fear is "will it be awkward" */
  objectionQ: string;
  objectionA: string[];
  /** Quiet friction reassurance — never a feature bullet list */
  friction: string;
  /** Soft close — spots-left lives here, last, never as the headline */
  closeLede: string;
  /** Final Caveat line from the creator */
  close: string;
  whatsapp?: { number: string; prefill: string };
}

type CreatorSpec = Partial<CreatorPageConfig> & Pick<CreatorPageConfig, "handle" | "name">;

/** Per-creator config over shared defaults — the creator personalizes their
 *  voice slots; the structure and the standing copy stay ours. Everything
 *  except handle+name has a template default, so a barely-configured
 *  Firestore creator still renders a complete page. */
export function makeCreator(spec: CreatorSpec): CreatorPageConfig {
  const { handle, name } = spec;
  return {
    photo: {
      src: "/hi/friends-house/photo-2.jpg",
      alt: "the living room at the last house",
      caption: "the room i keep telling you about.",
      w: 1400,
      h: 1050,
    },
    turn: [
      "you’ve seen my feed. i’ve seen your username.",
      "we’ve technically hung out a hundred times — and never actually been in a room.",
      "i’m done doing this over dms. <em>so i’m doing this instead.</em>",
    ],
    rooms: [{ titleMatch: "friends house", tie: "i’ll be at this one." }],
    meta: {
      title: `come offline with ${name}`,
      description: `${name} is saving you a seat — real rooms, real people, no vip rope.`,
    },
    heroLine: "i’m inviting you.",
    headline: "you’ve watched me online.\ncome offline with me.",
    seal: `gate: unlocked by ${name}`,
    turnSign: `— ${name}`,
    roomsTitle: "the next few rooms i’ll be in",
    proof: {
      photos: [
        {
          src: "/hi/friends-house/photo-1.jpg",
          alt: "ten people laughing together on bean bags at the last house",
          caption: "last house. every single person walked in solo.",
          w: 1280,
          h: 960,
        },
        {
          src: "/hi/friends-house/photo-2.jpg",
          alt: "the living room — bean bags, warm lamps, the games table",
          caption: "the living room, mid-saturday.",
          w: 1400,
          h: 1050,
        },
      ],
      lines: [
        { quote: "came solo. left with a group chat that still won’t shut up.", by: "— a story reply, the morning after" },
        { quote: "my sunday was ruined because saturday set the bar.", by: "— someone’s exit text" },
      ],
    },
    objectionQ: "“will it be awkward? will i even know anyone—”",
    objectionA: [
      "you won’t know anyone. that’s the point.",
      "everyone’s arriving the same way you are — including me. no vip rope, no plus-ones, no huddle of people who already know each other.",
    ],
    friction: "the boring parts — where, what to bring, how to find it — land on whatsapp after you rsvp. you just have to show up.",
    closeLede: "the room fills. the door closes.",
    close: "see you there. don’t leave me hanging.",
    whatsapp: { number: "919380906810", prefill: `hey! came from ${name}’s page — tell me more?` },
    ...spec,
  };
}

/** Every live creator page, keyed by handle → served at /with/<handle>. */
export const CREATORS: Record<string, CreatorPageConfig> = Object.fromEntries(
  [
    // "asha" is a placeholder to preview the template — swap in a real
    // creator (and their real photo) before minting any /l/ link at it.
    makeCreator({
      handle: "asha",
      name: "asha",
      photo: {
        src: "/with/asha.jpg",
        alt: "asha laughing on a bean bag at the last friends house",
        caption: "me, losing at codenames. last house.",
        w: 360,
        h: 500,
      },
      turn: [
        "you know my coffee order from a story.",
        "you’ve seen my sunday reset, my desk, my bad parking. i’ve seen your username.",
        "we’ve technically hung out a hundred times — and never actually been in a room.",
        "i’m done doing this over dms. <em>so i’m doing this instead.</em>",
      ],
      rooms: [
        { titleMatch: "friends house", tie: "i’ll be at this one." },
        { titleMatch: "supper club", tie: "i’m running the supper club table." },
      ],
    }),
  ].map((c) => [c.handle, c])
);

export function getCreator(handle: string): CreatorPageConfig | null {
  return CREATORS[handle] ?? null;
}
