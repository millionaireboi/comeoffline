/** Come Offline brand palette — extracted from brand guide and prototypes */
export const palette = {
  // Primary
  nearBlack: "#1A1715",
  gateBlack: "#0E0D0B",
  gateDark: "#161412",
  softBlack: "#2C2520",
  cream: "#FAF6F0",
  warmWhite: "#F5EFE6",
  sand: "#E8DDD0",

  // Accent
  caramel: "#D4A574",
  deepCaramel: "#B8845A",
  gateGlow: "#D4A574",
  highlight: "#E6A97E",

  // Secondary text
  muted: "#9B8E82",
  warmBrown: "#8B6F5A",
  darkBrown: "#3D2E22",

  // Event accents
  blush: "#DBBCAC",
  coral: "#D4836B",
  sage: "#A8B5A0",
  lavender: "#B8A9C9",
  terracotta: "#C4704D",

  // Admin-specific
  green: "#7A9B6F",
  red: "#C75050",
  amber: "#D4A03C",
} as const;

export type PaletteColor = keyof typeof palette;

/** Admin surface colors for dark UI */
export const surfaces = {
  bg: "#0E0D0B",
  surface: "#161412",
  surface2: "#1E1B18",
  surface3: "#262220",
  border: "rgba(155,142,130,0.12)",
  borderLight: "rgba(155,142,130,0.06)",
} as const;

/** Tailwind CSS custom color config (for tailwind.config.ts extend) */
export const tailwindColors = {
  cream: palette.cream,
  "warm-white": palette.warmWhite,
  sand: palette.sand,
  caramel: {
    DEFAULT: palette.caramel,
    deep: palette.deepCaramel,
  },
  terracotta: palette.terracotta,
  "warm-brown": palette.warmBrown,
  "dark-brown": palette.darkBrown,
  "near-black": palette.nearBlack,
  "soft-black": palette.softBlack,
  "gate-black": palette.gateBlack,
  "gate-dark": palette.gateDark,
  muted: palette.muted,
  highlight: palette.highlight,
  coral: palette.coral,
  sage: palette.sage,
  lavender: palette.lavender,
  blush: palette.blush,
} as const;
