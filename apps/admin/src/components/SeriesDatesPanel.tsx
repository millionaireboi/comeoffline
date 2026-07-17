"use client";

import { useEffect, useState } from "react";
import type { Event } from "@comeoffline/types";
import { eventSeriesKey } from "@comeoffline/types";
import { apiClient } from "@/lib/apiClient";
import { toast } from "@/lib/toast";

interface SeriesDatesPanelProps {
  /** The event being edited — the panel lists its sibling editions */
  event: Event;
}

/** Sibling test: shared series key ("friends house" anywhere in the title),
 *  falling back to an exact title match so ANY event can be run again. */
function isSibling(a: Event, b: Event): boolean {
  const keyA = eventSeriesKey(a.title);
  if (keyA) return eventSeriesKey(b.title) === keyA;
  return a.title.trim().toLowerCase() === b.title.trim().toLowerCase();
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr || "no date";
  return d
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .toLowerCase();
}

/**
 * "All dates of this event" — the admin surface for repeatable IP.
 * Every date is its own event under the hood (own tickets, own capacity,
 * own check-in list); this panel shows the series in one place and adds the
 * next date via the duplicate endpoint (full config copied, sales reset).
 */
export function SeriesDatesPanel({ event }: SeriesDatesPanelProps) {
  const [siblings, setSiblings] = useState<Event[] | null>(null);
  const [newDate, setNewDate] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: Event[] }>("/api/admin/events");
        if (!cancelled && res.success) {
          setSiblings(
            res.data
              .filter((e) => isSibling(event, e))
              .sort((a, b) => (a.date || "").localeCompare(b.date || "")),
          );
        }
      } catch {
        if (!cancelled) setSiblings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id, event.title]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addDate() {
    if (!newDate) {
      toast.error("pick a date first");
      return;
    }
    setAdding(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: Event }>(
        `/api/admin/events/${event.id}/duplicate`,
        { date: newDate },
      );
      if (res.success) {
        setSiblings((prev) => {
          const next = [...(prev ?? []), res.data];
          return next.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        });
        setNewDate("");
        toast.success(`${fmtDate(res.data.date)} added as a draft — publish it from the events list`);
      }
    } catch (err) {
      toast.error(`couldn't add the date — ${err instanceof Error ? err.message : "try again"}`);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
        all dates of this event
      </label>
      <p className="mb-3 text-[11px] text-muted/60">
        each date is its own event — same setup, fresh tickets. they group into a
        &quot;pick your date&quot; row on the site automatically.
      </p>

      {siblings === null ? (
        <p className="font-mono text-[10px] text-muted/40">loading…</p>
      ) : (
        <div className="mb-3 flex flex-col gap-1.5">
          {siblings.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-[12px] ${
                s.id === event.id ? "bg-caramel/10 text-cream" : "bg-white/[0.03] text-muted"
              }`}
            >
              <span className="font-sans">
                {fmtDate(s.date)}
                {s.id === event.id && (
                  <span className="ml-2 font-mono text-[9px] uppercase tracking-[1px] text-caramel">
                    editing
                  </span>
                )}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[1px]">
                {s.status} · {s.spots_taken}/{s.total_spots}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-cream focus:border-caramel/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={addDate}
          disabled={adding || !newDate}
          className="shrink-0 rounded-lg border border-caramel/30 bg-caramel/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[1px] text-caramel transition hover:bg-caramel/20 disabled:opacity-40"
        >
          {adding ? "adding…" : "+ add date"}
        </button>
      </div>
      <p className="mt-1.5 font-mono text-[9px] text-muted/40">
        copies everything from this event onto the new date (tickets, checkout, photos), with sales
        counters reset. lands as a draft so you can tweak before publishing.
      </p>
    </div>
  );
}
