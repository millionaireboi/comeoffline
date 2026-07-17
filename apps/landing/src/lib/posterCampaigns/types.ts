/**
 * Poster campaign config — one object per guerrilla landing page.
 *
 * The PosterLanding engine renders any campaign: Act 1 is the typewriter
 * conversation (buildScript), Act 2 is the event sheet (house). Adding a
 * campaign means writing one of these and registering it in ./index.ts —
 * PosterLanding.tsx never changes.
 */

export interface PosterChoice {
  label: string;
  react: string[]; // lines the poster replies with; may contain <em> markup
  shake?: boolean; // screen-shake on this answer
}

export interface PosterBeat {
  say: string[]; // lines typed one after another; may contain <em> markup
  ask?: PosterChoice[]; // choices shown after the last line
}

/** Act-2 static copy — used verbatim, and as the fallback when the events API
 *  is unreachable (a poster scan must never land on an error page). */
export interface HouseCopy {
  presents: string;
  /** One line in the poster's Act-1 voice, shown above the title — stitches
   *  the two acts together. When set it replaces the `presents` eyebrow. */
  welcome?: string;
  title: string;
  emoji: string;
  tagline: string;
  when: string;
  ctaWhen: string;
  lede: string; // may contain <strong>/<em> markup
  schedule: { t: string; text: string }[];
  rooms: { emoji: string; name: string; desc: string }[];
  soloQ: string; // may contain <em> markup
  soloA: string;
  includes: string[];
  /** Past-event polaroids — the trust block. Files live in
   *  public/hi/<slug>/; section is skipped when the list is empty. */
  photos?: { src: string; alt: string; caption: string; w: number; h: number }[];
  /** Handwritten-note hero — a taped paper invite replaces the big-title
   *  hero when set. First line renders as the h1. May contain <em>/<strong>. */
  note?: {
    lines: string[];
    signoff: string;
    /** Scribbled aside under the note, pointing at the polaroid below */
    scribble?: string;
  };
  /** Alternate note shown when the campaign resolves 2+ live dates — lets a
   *  repeatable series drop "this saturday" phrasing without touching the
   *  single-date fallback copy. Omit to reuse `note` as-is. */
  noteMulti?: {
    lines: string[];
    signoff: string;
    scribble?: string;
  };
  /** Date-picker section (rendered only with 2+ live dates) */
  datesTitle?: string;
  datesHint?: string;
  finePrint: { k: string; v: string }[];
  fineNote: string;
  notA: string[];
  truth: string;
  worstCase: string;
  cta: string;
  footTagline: string;
  footNote: string;
}

export interface PosterCampaignConfig {
  /** Route slug (/hi/<slug>) and the default utm_campaign */
  slug: string;
  /** Event the campaign sells — CTA deep-links it even if the live fetch fails */
  eventId: string;
  /** Repeatable-IP mode: every upcoming event whose title contains
   *  `titleMatch` (case-insensitive) becomes a pickable date on the page.
   *  Admin creates the next edition → it appears here, no deploy. `eventId`
   *  stays as the fallback when the list can't be fetched or comes back empty. */
  series?: { titleMatch: string };
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  /** Opening line per printed poster — QR destination carries ?p=<key>.
   *  Unknown keys silently fall back to no location line (still tracked). */
  locations: Record<string, string>;
  /** Late-night / early-morning easter egg lines, keyed by hour */
  timeLine: (hour: number) => string | null;
  /** The Act-1 conversation. locLine/late slots are injected at runtime. */
  buildScript: (locLine: string | null, late: string | null) => PosterBeat[];
  /** Full label of the Act-1 → Act-2 button, emoji included */
  revealButton: string;
  /** wa.me escape hatch for scanners not ready to prepay — captures the
   *  interested-but-skeptical instead of losing them. Omit to hide. */
  whatsapp?: {
    /** Digits only, country code included — goes into wa.me/<number> */
    number: string;
    prompt: string;
    button: string;
    note?: string;
    /** Prefilled message; placement code identifies which poster sent them */
    prefill: (code: string | null) => string;
  };
  house: HouseCopy;
}
