"use client";

import { useState, useEffect, useCallback } from "react";
import type { Polaroid } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { savePolaroid } from "@/lib/save-photo";
import { Noise } from "@/components/shared/Noise";

interface EventMemories {
  event_id: string;
  event_title: string;
  event_emoji: string;
  event_date: string;
  polaroids: Polaroid[];
}

/**
 * Permanent all-events memories gallery, reachable from the profile.
 * Previously polaroids were only visible inside the live post-event journey —
 * navigate away once and your photos from three events ago were unreachable.
 */
export function MyMemories({ onClose }: { onClose: () => void }) {
  const { getIdToken, loading: authLoading } = useAuth();
  const [memories, setMemories] = useState<EventMemories[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState<Polaroid | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMemories = useCallback(async () => {
    setError(false);
    try {
      const token = await getIdToken();
      if (!token) { setError(true); setLoading(false); return; }
      const res = await apiFetch<{ success: boolean; data: EventMemories[] }>(
        "/api/users/me/memories",
        { token },
      );
      if (res.data) setMemories(res.data);
    } catch (err) {
      console.error("Failed to load memories:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!authLoading) fetchMemories();
  }, [authLoading, fetchMemories]);

  const handleSave = async (photo: Polaroid) => {
    if (saving) return;
    setSaving(true);
    try {
      await savePolaroid(photo);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] overflow-y-auto bg-cream" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}>
      <Noise />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-cream/95 px-5 pb-3 pt-6 backdrop-blur-sm">
        <button onClick={onClose} className="font-mono text-[11px] text-muted">
          {"←"} back
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">my memories</span>
        <div className="w-12" />
      </div>

      <div className="px-5 pb-24 pt-2">
        {loading && (
          <div className="py-12 text-center">
            <p className="font-mono text-[11px] text-muted">developing the polaroids...</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <span className="mb-3 block text-4xl">{"\u{1F614}"}</span>
            <p className="mb-1 font-serif text-xl text-near-black">couldn&apos;t load memories</p>
            <p className="mb-4 font-sans text-sm text-muted">check your connection and try again.</p>
            <button
              onClick={() => { setLoading(true); fetchMemories(); }}
              className="rounded-full bg-near-black px-6 py-2.5 font-mono text-[11px] text-white"
            >
              retry
            </button>
          </div>
        )}

        {!loading && !error && memories.length === 0 && (
          <div className="py-12 text-center">
            <span className="mb-3 block text-4xl">{"\u{1F4F8}"}</span>
            <p className="mb-1 font-serif text-xl text-near-black">no memories yet</p>
            <p className="font-sans text-sm text-muted">
              go to an event. the polaroids find their way here after.
            </p>
          </div>
        )}

        {!loading && !error && memories.map((em) => (
          <section key={em.event_id} className="mb-10">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-serif text-[20px] text-near-black">
                {em.event_title} {em.event_emoji}
              </h3>
              {em.event_date && (
                <span className="font-mono text-[10px] text-muted">
                  {new Date(em.event_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {em.polaroids.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setLightbox(photo)}
                  className="bg-white p-2 pb-3 text-left shadow-[0_2px_12px_rgba(26,23,21,0.08)] transition-transform active:scale-[0.97]"
                  style={{ transform: `rotate(${photo.rotation || (i % 2 === 0 ? -2 : 2)}deg)` }}
                >
                  <div className="aspect-square w-full overflow-hidden" style={{ background: photo.color || "#E8DDD0" }}>
                    <img src={photo.url} alt={photo.caption || ""} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  {photo.caption && (
                    <p className="mt-2 px-1 font-hand text-[13px] leading-tight text-warm-brown">
                      {photo.caption}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[600] flex flex-col items-center justify-center bg-[rgba(10,9,7,0.92)] px-6"
          onClick={() => setLightbox(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[380px] bg-white p-3 pb-4 shadow-2xl">
            <img src={lightbox.url} alt={lightbox.caption || ""} className="w-full" />
            {lightbox.caption && (
              <p className="mt-3 px-1 font-hand text-[15px] text-warm-brown">{lightbox.caption}</p>
            )}
          </div>
          <div className="mt-5 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleSave(lightbox)}
              disabled={saving}
              className="rounded-full bg-cream px-6 py-3 font-sans text-[14px] font-medium text-near-black disabled:opacity-60"
            >
              {saving ? "saving..." : "save photo ↓"}
            </button>
            <button
              onClick={() => setLightbox(null)}
              className="rounded-full border border-white/20 px-6 py-3 font-sans text-[14px] text-cream"
            >
              close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
