"use client";

import type { Event } from "@comeoffline/types";
import { SpotsBar } from "@/components/ui/SpotsBar";

interface EventDetailProps {
  event: Event;
  onClose: () => void;
  onRsvp?: () => void;
  loading?: boolean;
}

export function EventDetail({ event, onClose, onRsvp, loading }: EventDetailProps) {
  const spotsLeft = event.total_spots - event.spots_taken;

  return (
    <div
      className="animate-fadeIn fixed inset-0 z-[500] flex items-end justify-center"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(10,9,7,0.5)] backdrop-blur-sm"
      />

      {/* Sheet */}
      <div
        className="relative max-h-[90vh] w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-cream"
        style={{ animation: "chatSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Accent line */}
        <div
          className="h-[5px]"
          style={{ background: `linear-gradient(90deg, ${event.accent}, ${event.accent_dark})` }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <span
              className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[1.5px]"
              style={{ color: event.accent_dark, background: event.accent + "25" }}
            >
              {event.tag}
            </span>
            <h2 className="mt-2.5 font-serif text-[32px] font-normal leading-none text-near-black">
              {event.title} {event.emoji}
            </h2>
            <p className="mt-1 font-sans text-[15px] italic text-warm-brown">
              {event.tagline}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base text-warm-brown"
            style={{ background: "rgba(232,221,208,0.5)" }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-6 pb-6 pt-5">
          {/* Date/time */}
          <div className="mb-5 flex flex-wrap gap-4">
            <div className="font-sans text-[13px] text-soft-black">📅 {event.date}</div>
            <div className="font-sans text-[13px] text-soft-black">🕒 {event.time}</div>
          </div>

          {/* Description */}
          <p className="mb-7 font-sans text-[15px] leading-relaxed text-warm-brown">
            {event.description}
          </p>

          {/* Zones */}
          {event.zones.length > 0 && (
            <div className="mb-7">
              <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
                what&apos;s inside
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {event.zones.map((z, i) => (
                  <div
                    key={i}
                    className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                  >
                    <span className="mb-2 block text-[22px]">{z.icon}</span>
                    <p className="mb-0.5 font-sans text-[13px] font-medium text-near-black">
                      {z.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted">{z.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Includes */}
          {event.includes.length > 0 && (
            <div className="mb-7">
              <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
                what&apos;s included
              </span>
              <div className="flex flex-col gap-2">
                {event.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: event.accent_dark }}
                    />
                    <span className="font-sans text-sm text-warm-brown">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dress code */}
          <div
            className="mb-5 flex items-center gap-2.5 rounded-[14px] px-[18px] py-3.5"
            style={{ background: event.accent + "12" }}
          >
            <span className="text-base">👗</span>
            <p className="font-sans text-[13px] text-warm-brown">
              dress code: <strong>{event.dress_code}</strong>
            </p>
          </div>

          <SpotsBar spotsLeft={spotsLeft} totalSpots={event.total_spots} accent={event.accent_dark} />
        </div>

        {/* CTA */}
        <div className="border-t border-sand bg-cream px-6 pb-7 pt-4">
          <button
            onClick={() => onRsvp?.()}
            disabled={spotsLeft === 0 || loading}
            className="w-full rounded-2xl py-[18px] font-sans text-base font-medium transition-opacity"
            style={{
              background: spotsLeft === 0 ? "#E8DDD0" : "#1A1715",
              color: spotsLeft === 0 ? "#9B8E82" : "#fff",
              cursor: spotsLeft === 0 || loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "reserving spot..." : spotsLeft === 0 ? "sold out" : "i'm in →"}
          </button>
        </div>
      </div>
    </div>
  );
}
