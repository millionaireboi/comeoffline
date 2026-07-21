export const instrumentSerif = {
  className: "font-[family-name:var(--font-instrument-serif)] font-serif",
  variable: "--font-instrument-serif",
};

export type Tab = "dashboard" | "events" | "bookings" | "discounts" | "links" | "creators" | "check-in" | "validation" | "content" | "applications" | "members" | "safety" | "reports" | "contact" | "brands" | "marketing" | "whatsapp" | "settings";

/** Two-level nav: groups ordered by how often they're needed. A tab lives in
 *  exactly one group; the group row + sub-tab row replace the old flat strip. */
export interface TabGroup {
  key: string;
  label: string;
  emoji: string;
  tabs: Tab[];
}

export const TAB_GROUPS: TabGroup[] = [
  { key: "home", label: "home", emoji: "🏠", tabs: ["dashboard"] },
  { key: "events", label: "events", emoji: "🎪", tabs: ["events", "bookings", "check-in", "content"] },
  { key: "growth", label: "growth", emoji: "📈", tabs: ["links", "discounts", "creators", "marketing"] },
  { key: "people", label: "people", emoji: "👥", tabs: ["members", "applications", "validation", "safety", "reports"] },
  { key: "inbox", label: "inbox", emoji: "📬", tabs: ["contact", "brands"] },
  { key: "system", label: "system", emoji: "⚙️", tabs: ["whatsapp", "settings"] },
];

export const ALL_TABS: Tab[] = TAB_GROUPS.flatMap((g) => g.tabs);

export function isTab(value: string | null): value is Tab {
  return value !== null && (ALL_TABS as string[]).includes(value);
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/** Public landing origin — short links and QR codes are minted against it.
 *  www form: the bare domain 307s to www, and a printed QR shouldn't pay
 *  for two redirect hops per scan. */
export const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || "https://www.comeoffline.com";

export const EVENT_STATUS_COLORS: Record<string, string> = {
  draft: "#7A8B9C",
  announced: "#8B7EC8",
  upcoming: "#D4A574",
  listed: "#D4A574",
  live: "#6B7A63",
  sold_out: "#D4836B",
  completed: "#9B8E82",
  cancelled: "#C86B6B",
};

export const MEMBER_STATUS_COLORS: Record<string, string> = {
  active: "#6B7A63",
  provisional: "#8B7EC8",
  inactive: "#D4836B",
};

export const TICKET_STATUS_COLORS: Record<string, string> = {
  pending_payment: "#D4A03C",
  confirmed: "#A8B5A0",
  cancelled: "#C75050",
  checked_in: "#6B7A63",
  no_show: "#D4836B",
};
