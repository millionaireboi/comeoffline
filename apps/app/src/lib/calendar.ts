import type { Event } from "@comeoffline/types";

/**
 * Add-to-calendar helpers. Events store `date` (parseable date string) and
 * `time` (display string like "8:00 PM"); we combine them in the user's local
 * timezone — members and events are both in IST, so local parsing is correct.
 */
function parseEventStart(event: Event): Date | null {
  if (!event.date) return null;
  if (event.time) {
    const combined = new Date(`${event.date} ${event.time}`);
    if (!isNaN(combined.getTime())) return combined;
  }
  const dateOnly = new Date(event.date);
  return isNaN(dateOnly.getTime()) ? null : dateOnly;
}

const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000; // most events run a few hours

function fmtUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function eventLocation(event: Event): string {
  if (event.venue_name) {
    return event.venue_area ? `${event.venue_name}, ${event.venue_area}` : event.venue_name;
  }
  // Venue may still be sealed — the reveal is part of the product
  return event.venue_area || "venue drops on WhatsApp before the event";
}

export function googleCalendarUrl(event: Event): string | null {
  const start = parseEventStart(event);
  if (!start) return null;
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${event.title} — come offline`,
    dates: `${fmtUtc(start)}/${fmtUtc(end)}`,
    details: event.tagline || "see you there. — come offline",
    location: eventLocation(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function icsContent(event: Event): string | null {
  const start = parseEventStart(event);
  if (!start) return null;
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//comeoffline//app//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@comeoffline.com`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(start)}`,
    `DTEND:${fmtUtc(end)}`,
    `SUMMARY:${escapeIcs(`${event.title} — come offline`)}`,
    `DESCRIPTION:${escapeIcs(event.tagline || "see you there. — come offline")}`,
    `LOCATION:${escapeIcs(eventLocation(event))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * One-tap add-to-calendar: .ics download on iOS (opens the native calendar
 * sheet), Google Calendar template everywhere else (default on Android).
 * Returns false when the event has no parseable date.
 */
export function addToCalendar(event: Event): boolean {
  const isIos = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIos) {
    const ics = icsContent(event);
    if (!ics) return false;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/[^\w\s-]/g, "").trim() || "event"}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  }
  const url = googleCalendarUrl(event);
  if (!url) return false;
  window.open(url, "_blank", "noopener");
  return true;
}
