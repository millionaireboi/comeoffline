export const P = {
  gateBlack: "#0E0D0B",
  nearBlack: "#1A1715",
  surface: "#161412",
  cream: "#FAF6F0",
  sand: "#E8DDD0",
  warmWhite: "#F5EFE6",
  caramel: "#D4A574",
  deepCaramel: "#B8845A",
  blush: "#DBBCAC",
  coral: "#D4836B",
  sage: "#A8B5A0",
  lavender: "#B8A9C9",
  warmBrown: "#8B6F5A",
  darkBrown: "#3D2E22",
  muted: "#9B8E82",
  highlight: "#C4704D",
} as const;

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
