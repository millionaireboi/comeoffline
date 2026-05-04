export const instrumentSerif = {
  className: "font-[family-name:var(--font-instrument-serif)] font-serif",
  variable: "--font-instrument-serif",
};

export type Tab = "dashboard" | "events" | "bookings" | "check-in" | "validation" | "content" | "applications" | "members" | "invite-codes" | "contact" | "brands" | "whatsapp" | "settings";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const EVENT_STATUS_COLORS: Record<string, string> = {
  draft: "#7A8B9C",
  announced: "#8B7EC8",
  upcoming: "#D4A574",
  listed: "#D4A574",
  live: "#6B7A63",
  sold_out: "#D4836B",
  completed: "#9B8E82",
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
