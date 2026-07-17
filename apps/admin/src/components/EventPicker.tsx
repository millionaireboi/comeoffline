"use client";

import { formatDate } from "@comeoffline/ui";
import { useApi } from "@/hooks/useApi";
import type { Event } from "@comeoffline/types";

interface EventPickerProps {
  value: string;
  /** Called with the selected event id ("" for the empty option) and, when
   *  a real event is picked, the full Event for callers that need title etc. */
  onChange: (eventId: string, event?: Event) => void;
  /** Heading rendered above the select; omit to render the bare select. */
  label?: string;
  /** Text of the empty ("") option. */
  emptyLabel?: string;
  filter?: (event: Event) => boolean;
  selectClassName?: string;
}

const DEFAULT_SELECT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none";

export function EventPicker({
  value,
  onChange,
  label,
  emptyLabel = "Choose event...",
  filter,
  selectClassName,
}: EventPickerProps) {
  const { data: events, loading } = useApi<Event[]>("/api/admin/events", {
    dedupingInterval: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
  const list = filter ? (events || []).filter(filter) : events || [];

  return (
    <div>
      {label && (
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value, list.find((ev) => ev.id === e.target.value))}
        className={selectClassName ?? DEFAULT_SELECT_CLASS}
      >
        <option value="">{loading && !events ? "loading events..." : emptyLabel}</option>
        {list.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.emoji} {ev.title} · {formatDate(ev.date)} · {ev.status}
          </option>
        ))}
      </select>
    </div>
  );
}
