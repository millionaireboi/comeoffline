/** Come Offline typography system — from brand guide */

/** Google Fonts import URL */
export const googleFontsUrl =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap";

/** Font family constants */
export const fonts = {
  /** Display / Headlines — Instrument Serif (Regular, Italic) */
  serif: "'Instrument Serif', Georgia, serif",
  /** Body / UI — DM Sans (300–600) */
  sans: "'DM Sans', sans-serif",
  /** Labels / Data — DM Mono (300–500) */
  mono: "'DM Mono', monospace",
  /** Handwritten / Annotations — Caveat (400–700) */
  hand: "'Caveat', cursive",
} as const;

/** Tailwind fontFamily config */
export const tailwindFontFamily = {
  serif: ["Instrument Serif", "Georgia", "serif"],
  sans: ["DM Sans", "sans-serif"],
  mono: ["DM Mono", "monospace"],
  hand: ["Caveat", "cursive"],
} as const;
