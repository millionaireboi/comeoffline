// Shared UI components — will be populated as components are ported from prototypes

/**
 * Format a date string like "2025-04-28" into "28th April"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${day}${suffix} ${month}`;
}

/**
 * Compact event-card date: "sat, 20 jun · 8:00 pm".
 * People plan by weekday — a raw "2026-06-20" makes them do date math.
 */
export function formatEventDateShort(dateStr: string, time?: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return time ? `${dateStr} · ${time}` : dateStr;
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" }).toLowerCase();
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" }).toLowerCase();
  const base = `${weekday}, ${day} ${month}`;
  return time ? `${base} · ${time.toLowerCase()}` : base;
}
