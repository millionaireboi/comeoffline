"use client";

import { useState, useEffect } from "react";
import { useInView } from "@/hooks/useInView";
import { P, API_URL } from "@/components/shared/P";

interface PublicEvent {
  id: string;
  title: string;
  date: string;
  emoji: string;
  tag: string;
  total_spots: number;
  spots_taken: number;
  accent: string;
  status: string;
}

export function Events() {
  const [ref, vis] = useInView();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/events/public`);
        const data = await res.json();
        if (data.success && data.data?.length) {
          setEvents(data.data);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative bg-near-black px-5 py-14 sm:px-7 sm:py-18"
    >
      <div className="mx-auto max-w-full sm:max-w-[440px]">
        <div className="mb-6 transition-opacity duration-500" style={{ opacity: vis ? 1 : 0 }}>
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">coming up</span>
          <h2
            className="mt-3 font-serif font-normal text-cream leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            next events
          </h2>
        </div>

        {loading && (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-muted/30 border-t-caramel" />
            <p className="font-mono text-[10px] text-muted">loading...</p>
          </div>
        )}

        {!loading && (error || events.length === 0) && (
          <div
            className="rounded-[18px] border border-dashed p-8 text-center"
            style={{ borderColor: P.cream + "15" }}
          >
            <span className="mb-2 block text-2xl">{"\u{1F440}"}</span>
            <p className="font-serif text-base text-cream" style={{ opacity: 0.7 }}>
              {error ? "couldn\u2019t load events" : "nothing yet"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted">
              {error ? "check back soon" : "we\u2019re cooking something unhinged"}
            </p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="flex flex-col gap-3">
            {events.map((ev, i) => {
              const spotsLeft = ev.total_spots - ev.spots_taken;
              const pct = ev.total_spots > 0 ? Math.round((ev.spots_taken / ev.total_spots) * 100) : 0;
              const accent = ev.accent || P.caramel;

              return (
                <div
                  key={ev.id}
                  className="overflow-hidden rounded-[18px] transition-all duration-600"
                  style={{
                    background: P.cream + "05",
                    border: `1px solid ${P.cream}08`,
                    opacity: vis ? 1 : 0,
                    transform: vis ? "translateY(0)" : "translateY(16px)",
                    transitionDelay: `${i * 0.12}s`,
                  }}
                >
                  <div
                    className="h-[3px]"
                    style={{ background: `linear-gradient(90deg, ${accent}, ${accent}40)` }}
                  />
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{ev.emoji || "\u{1F389}"}</span>
                        <div>
                          <div className="font-sans text-[15px] font-medium text-cream">{ev.title}</div>
                          <div className="font-mono text-[10px] text-muted">{formatDate(ev.date)}</div>
                        </div>
                      </div>
                      {ev.tag && (
                        <span
                          className="rounded-full font-mono text-[9px] uppercase tracking-[1px]"
                          style={{
                            color: accent,
                            background: accent + "15",
                            padding: "4px 10px",
                          }}
                        >
                          {ev.tag}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between">
                        <span className="font-mono text-[10px] text-muted">
                          {spotsLeft} left of {ev.total_spots}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: accent }}>
                          {pct}%
                        </span>
                      </div>
                      <div
                        className="h-[3px] overflow-hidden rounded-[2px]"
                        style={{ background: P.cream + "10" }}
                      >
                        <div
                          className="h-full rounded-[2px] transition-all"
                          style={{
                            width: vis ? `${pct}%` : "0%",
                            background: accent,
                            transitionDuration: "1.2s",
                            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                            transitionDelay: `${0.3 + i * 0.15}s`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-center font-hand text-sm" style={{ color: P.muted + "50" }}>
          you need to be in to RSVP {"\u{1F512}"}
        </p>
      </div>
    </section>
  );
}
