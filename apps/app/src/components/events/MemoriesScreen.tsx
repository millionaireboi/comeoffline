"use client";

import { useState, useEffect } from "react";
import type { Memories, Polaroid, OverheardQuote } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

const STAT_LABELS: Record<string, { emoji: string; label: string }> = {
  attended: { emoji: "👥", label: "attended" },
  phones: { emoji: "📵", label: "phones locked" },
  drinks: { emoji: "🍹", label: "drinks served" },
  hours: { emoji: "⏰", label: "hours offline" },
};

export function MemoriesScreen() {
  const { getIdToken } = useAuth();
  const { currentEvent, setStage } = useAppStore();
  const [memories, setMemories] = useState<Memories | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Polaroid | null>(null);

  useEffect(() => {
    async function fetchMemories() {
      if (!currentEvent) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: Memories }>(
          `/api/events/${currentEvent.id}/memories`,
          { token },
        );
        if (data.data) setMemories(data.data);
      } catch (err) {
        console.error("Failed to load memories:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMemories();
  }, [currentEvent, getIdToken]);

  if (!currentEvent) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-[140px]">
      <Noise />

      {/* Header */}
      <section className="px-5 pb-6 pt-10">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[3px] text-muted">
          the morning after
        </p>
        <h2
          className="animate-fadeSlideUp mb-1 font-serif text-[34px] font-normal leading-none text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          {currentEvent.title} {currentEvent.emoji}
        </h2>
        <p className="animate-fadeSlideUp font-sans text-[15px] italic text-warm-brown" style={{ animationDelay: "0.1s" }}>
          what happened stays — mostly
        </p>
      </section>

      {/* Stats grid */}
      {memories?.stats && (
        <section className="animate-fadeSlideUp px-4 pb-6" style={{ animationDelay: "0.2s" }}>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(STAT_LABELS).map(([key, { emoji, label }]) => {
              const value = memories.stats[key as keyof typeof memories.stats];
              return (
                <div
                  key={key}
                  className="rounded-[16px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                >
                  <span className="mb-2 block text-[22px]">{emoji}</span>
                  <p className="font-serif text-[26px] text-near-black">{value}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Polaroid gallery */}
      {memories?.polaroids && memories.polaroids.length > 0 && (
        <section className="px-4 pb-6">
          <span className="mb-4 block px-1 font-mono text-[10px] uppercase tracking-[2px] text-muted">
            polaroids
          </span>
          <div className="grid grid-cols-2 gap-3">
            {memories.polaroids.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="animate-fadeSlideUp overflow-hidden rounded-[14px] bg-white shadow-[0_2px_8px_rgba(26,23,21,0.06)] transition-transform hover:scale-[1.02]"
                style={{
                  animationDelay: `${0.3 + i * 0.08}s`,
                  transform: `rotate(${photo.rotation}deg)`,
                }}
              >
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2.5">
                  {photo.caption && (
                    <p className="font-caveat text-[15px] text-near-black">{photo.caption}</p>
                  )}
                  {photo.who && (
                    <p className="font-mono text-[9px] text-muted">{photo.who}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Overheard quotes */}
      {memories?.quotes && memories.quotes.length > 0 && (
        <section className="px-4 pb-6">
          <span className="mb-4 block px-1 font-mono text-[10px] uppercase tracking-[2px] text-muted">
            overheard
          </span>
          <div className="flex flex-col gap-3">
            {memories.quotes.map((q, i) => (
              <QuoteCard key={q.id} quote={q} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!memories || (memories.polaroids.length === 0 && memories.quotes.length === 0)) && (
        <section className="animate-fadeSlideUp px-5 py-12 text-center" style={{ animationDelay: "0.3s" }}>
          <span className="mb-4 block text-4xl">📸</span>
          <p className="font-serif text-xl text-warm-brown">memories incoming</p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            our crew is developing the polaroids...
          </p>
        </section>
      )}

      {/* CTAs */}
      <section className="flex flex-col gap-3 px-5 pt-4">
        <button
          onClick={() => setStage("reconnect")}
          className="w-full rounded-[20px] bg-near-black p-5 text-white transition-all hover:-translate-y-0.5"
        >
          <span className="block font-sans text-[17px] font-medium">reconnect with people</span>
          <span className="mt-1 block font-mono text-[11px] text-cream/50">
            find your people from last night
          </span>
        </button>

        <button
          onClick={() => setStage("vouch")}
          className="w-full rounded-[20px] border border-sand bg-white p-5 transition-all hover:-translate-y-0.5"
        >
          <span className="block font-sans text-[15px] font-medium text-near-black">
            claim your vouch codes ✉️
          </span>
          <span className="mt-1 block font-mono text-[11px] text-muted">
            invite someone worthy
          </span>
        </button>
      </section>

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div className="animate-fadeIn fixed inset-0 z-[500] flex items-center justify-center bg-[rgba(10,9,7,0.85)]">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
          >
            ✕
          </button>
          <div className="max-h-[80vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="max-h-[70vh] w-full object-contain"
            />
            <div className="p-4">
              {selectedPhoto.caption && (
                <p className="font-caveat text-lg text-near-black">{selectedPhoto.caption}</p>
              )}
              {selectedPhoto.who && (
                <p className="mt-0.5 font-mono text-[11px] text-muted">{selectedPhoto.who}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuoteCard({ quote, index }: { quote: OverheardQuote; index: number }) {
  return (
    <div
      className="animate-fadeSlideUp rounded-[16px] bg-white p-5 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
      style={{ animationDelay: `${0.35 + index * 0.08}s` }}
    >
      <p className="mb-2 font-caveat text-[18px] leading-relaxed text-near-black">
        &ldquo;{quote.quote}&rdquo;
      </p>
      {quote.context && (
        <p className="font-mono text-[10px] text-muted">
          — {quote.context}
        </p>
      )}
    </div>
  );
}
