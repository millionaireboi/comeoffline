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

function resolveUrl(envValue: string | undefined, fallbackPort: number): string {
  // In production or SSR, use the env value as-is
  if (typeof window === "undefined") return envValue || `http://localhost:${fallbackPort}`;
  // In the browser, replace localhost with the current hostname so mobile network IPs work
  const base = envValue || `http://localhost:${fallbackPort}`;
  if (base.includes("localhost") && window.location.hostname !== "localhost") {
    return base.replace("localhost", window.location.hostname);
  }
  return base;
}

export const API_URL = resolveUrl(process.env.NEXT_PUBLIC_API_URL, 8080);
export const APP_URL = resolveUrl(process.env.NEXT_PUBLIC_APP_URL, 3001);
