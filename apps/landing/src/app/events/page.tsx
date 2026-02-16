"use client";

import { useState, useEffect } from "react";
import { P, API_URL } from "@/components/shared/P";
import { GlitchText } from "@/components/events/GlitchText";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { FeedEventDetail } from "@/components/events/FeedEventDetail";
import { Footer } from "@/components/shared/Footer";

export const dynamic = "force-dynamic";

interface PublicEvent {
  id: string;
  title: string;
  tagline: string;
  description: string;
  date: string;
  time: string;
  total_spots: number;
  spots_taken: number;
  accent: string;
  accent_dark: string;
  emoji: string;
  tag: string;
  zones: { name: string; icon: string; desc: string }[];
  dress_code: string;
  includes: string[];
  venue_reveal_date?: string;
  status: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailEvent, setDetailEvent] = useState<PublicEvent | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/events/public`);
        const data = await res.json();
        if (data.success) {
          setEvents(data.data || []);
        } else {
          setError("couldn't load events");
        }
      } catch {
        setError("couldn't reach the server");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      {/* Noise texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-[1] mx-auto max-w-[430px] pb-15">
        {/* Feed header */}
        <section className="relative px-5 pt-20 pb-12">
          <div
            className="pointer-events-none absolute -right-[30px] top-[60px] h-[120px] w-[120px] rounded-full animate-float"
            style={{ background: `radial-gradient(circle, ${P.caramel}15, transparent)` }}
          />
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted">
            invite only {"\u00B7"} est. 2026
          </p>
          <h2
            className="m-0 mb-3 max-w-[340px] font-serif text-[38px] font-normal leading-[1.15] tracking-[-1px] text-near-black"
          >
            <GlitchText />
          </h2>
          <p className="m-0 max-w-[320px] font-sans text-[15px] leading-[1.7] text-warm-brown">
            a community for people who still believe the best connections happen face to face.{" "}
            <span className="text-caramel">bangalore chapter.</span>
          </p>
        </section>

        <div className="flex justify-between px-5 pb-4">
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">upcoming events</span>
          <span className="font-mono text-[11px] text-caramel">
            {loading ? "..." : `${events.length} events`}
          </span>
        </div>

        <section className="flex flex-col gap-4 px-4">
          {loading && (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-sand border-t-caramel" />
              <p className="font-mono text-[11px] text-muted">loading events...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-[20px] border border-dashed p-8 text-center" style={{ borderColor: P.sand }}>
              <p className="mb-1 font-serif text-lg text-warm-brown">{error}</p>
              <p className="font-mono text-[11px] text-muted">try refreshing the page</p>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="rounded-[20px] border border-dashed p-8 text-center" style={{ borderColor: P.sand }}>
              <span className="mb-3 block text-[28px]">{"\u{1F440}"}</span>
              <p className="m-0 mb-1 font-serif text-lg text-warm-brown">nothing yet</p>
              <p className="m-0 font-mono text-[11px] text-muted">we&apos;re cooking something unhinged</p>
            </div>
          )}

          {!loading && !error && events.map((e, i) => (
            <FeedEventCard key={e.id} event={e} index={i} onOpen={setDetailEvent} />
          ))}

          {!loading && !error && events.length > 0 && (
            <div
              className="rounded-[20px] border-[1.5px] border-dashed p-8 text-center"
              style={{
                borderColor: P.sand,
                animation: `fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) ${events.length * 0.12}s both`,
              }}
            >
              <span className="mb-3 block text-[28px]">{"\u{1F440}"}</span>
              <p className="m-0 mb-1 font-serif text-lg text-warm-brown">more coming soon</p>
              <p className="m-0 font-mono text-[11px] text-muted">we&apos;re cooking something unhinged</p>
            </div>
          )}
        </section>
      </div>

      {detailEvent && (
        <FeedEventDetail event={detailEvent} onClose={() => setDetailEvent(null)} />
      )}
      <Footer />
    </div>
  );
}
