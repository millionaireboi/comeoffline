"use client";

import { useState, useMemo } from "react";
import type { Event, TicketTier, PostBookingSection } from "@comeoffline/types";

interface EventPreviewProps {
  event: Event;
  onClose: () => void;
  initialView?: "detail" | "countdown";
}

/* ── Spots bar ─────────────────────────────────────── */

function SpotsBar({ spotsLeft, totalSpots, accent }: { spotsLeft: number; totalSpots: number; accent: string }) {
  const pct = totalSpots > 0 ? ((totalSpots - spotsLeft) / totalSpots) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1 flex-1 overflow-hidden rounded-sm bg-[#E8DDD0]">
        <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, background: accent }} />
      </div>
      <span className="whitespace-nowrap font-mono text-[11px] text-[#9B8E82]">{spotsLeft} spots left</span>
    </div>
  );
}

/* ── Enhanced Tier card ───────────────────────────── */

function TierCard({ tier, accent, accentDark }: { tier: TicketTier; accent: string; accentDark: string }) {
  const soldOut = tier.sold >= tier.capacity;
  const remaining = tier.capacity - tier.sold;
  const closed = tier.deadline ? new Date(tier.deadline) < new Date() : false;
  const notYetOpen = tier.opens_at ? new Date(tier.opens_at) > new Date() : false;
  const unavailable = soldOut || closed || notYetOpen;
  const fillPct = ((tier.capacity - remaining) / tier.capacity) * 100;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[18px] border-[1.5px] p-5 text-left"
      style={{
        background: unavailable ? "rgba(232,221,208,0.2)" : "#fff",
        borderColor: unavailable ? "rgba(232,221,208,0.4)" : "rgba(232,221,208,0.6)",
        opacity: unavailable ? 0.6 : 1,
      }}
    >
      {soldOut && (
        <div className="absolute right-3.5 top-3">
          <span className="rounded-full bg-[#E8DDD0]/50 px-2 py-0.5 font-mono text-[9px] text-[#9B8E82]">sold out</span>
        </div>
      )}
      <div className="mb-2 pr-9">
        <p className="font-sans text-base font-medium" style={{ color: unavailable ? "#9B8E82" : "#1A1715" }}>
          {tier.label}
        </p>
        {tier.description && <p className="mt-0.5 font-sans text-xs italic text-[#9B8E82]">{tier.description}</p>}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <span className="font-mono text-2xl font-medium" style={{ color: unavailable ? "#9B8E82" : accentDark }}>
            {tier.price === 0 ? "Free" : `₹${tier.price}`}
          </span>
          {tier.price > 0 && <span className="ml-1 font-sans text-xs text-[#9B8E82]">/ person</span>}
        </div>
        <div className="text-right">
          {!unavailable && (
            <p className="mb-0.5 font-mono text-[11px] text-[#9B8E82]">{remaining} left of {tier.capacity}</p>
          )}
          {tier.deadline && (
            <p className="font-mono text-[10px] text-[#9B8E82]/80">
              ends {new Date(tier.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>
      {!unavailable && (
        <div className="mt-2.5 h-[3px] overflow-hidden rounded-sm bg-[#E8DDD0]/40">
          <div className="h-full rounded-sm" style={{ width: `${fillPct}%`, background: accentDark }} />
        </div>
      )}
    </div>
  );
}

/* ── Section Label helper ─────────────────────────── */

function SectionLabel({ label, sticker, stickerColor, dark, icon }: {
  label: string; sticker?: string; stickerColor?: string; dark?: boolean; icon?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon && <span className="text-sm">{icon}</span>}
      <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#9B8E82]">{label}</span>
      <div className="h-px flex-1" style={{ background: dark ? "rgba(155,142,130,0.2)" : "#E8DDD0" }} />
      {sticker && (
        <span className="shrink-0 font-[family-name:var(--font-caveat)] text-[13px]" style={{ color: stickerColor || "#D4A574", transform: "rotate(-2deg)", display: "inline-block" }}>
          {sticker}
        </span>
      )}
    </div>
  );
}

/* ── Detail view — rich design matching prototype ─── */

function DetailView({ event }: { event: Event }) {
  const spotsLeft = event.total_spots - event.spots_taken;
  const isTicketed = event.ticketing?.enabled && !event.is_free;
  const tiers = event.ticketing?.tiers || [];
  const hasCheckoutWizard = event.checkout?.enabled && (event.checkout?.steps?.length || 0) > 0;
  const accent = event.accent || "#D4A574";
  const accentDark = event.accent_dark || "#B8845A";

  const cheapestPrice = useMemo(() => {
    if (!isTicketed || tiers.length === 0) return null;
    const available = tiers.filter((t) => t.sold < t.capacity);
    if (available.length === 0) return null;
    return Math.min(...available.map((t) => t.price));
  }, [isTicketed, tiers]);

  const sectionTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string }> = [{ id: "overview", label: "overview" }];
    if (isTicketed) tabs.push({ id: "tickets", label: "tickets" });
    if (event.seating?.mode && event.seating.mode !== "none") tabs.push({ id: "seating", label: "seating" });
    return tabs;
  }, [isTicketed, event.seating?.mode]);

  const [activeSection, setActiveSection] = useState("overview");

  const ctaLabel = () => {
    if (spotsLeft === 0) return "sold out. told you to hurry.";
    if (isTicketed) {
      if (hasCheckoutWizard) return "get tickets →";
      return cheapestPrice != null && cheapestPrice < Infinity ? `i'm literally coming · ₹${cheapestPrice}+ →` : "get tickets →";
    }
    return "i'm in →";
  };

  const isRevealed = !!event.venue_name && event.venue_name !== "TBD" && !!event.venue_reveal_date && new Date(event.venue_reveal_date) <= new Date();
  const scheduleSections = event.post_booking?.sections?.filter((s) => s.type === "schedule") || [];

  // Info chips
  const chips: Array<{ icon: string | null; text: string; accent?: boolean }> = [
    { icon: "📅", text: event.date || "" },
    { icon: "🕒", text: event.time || "" },
    { icon: "👥", text: `${spotsLeft}/${event.total_spots}` },
  ];
  if (cheapestPrice != null && cheapestPrice < Infinity) {
    chips.push({ icon: null, text: `₹${cheapestPrice}+`, accent: true });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header — always expanded in preview */}
      <div className="relative shrink-0 overflow-hidden" style={{ padding: "16px 20px 14px", background: `linear-gradient(135deg, ${accent}40 0%, ${accent}15 50%, #FAF6F0 100%)`, borderBottom: `1px solid ${accent}20` }}>
        <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accentDark})` }} />
        {/* Ghost emoji */}
        <div className="pointer-events-none absolute -right-4 -top-[30px] font-serif text-[130px] font-normal leading-[0.9] text-[#1A1715] opacity-[0.03]">{event.emoji}</div>
        {/* Tag + close */}
        <div className="mb-2.5 flex items-center justify-between">
          {event.tag && (
            <span className="rounded-full px-2.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[1.5px]" style={{ color: accentDark, background: accent + "30" }}>
              {event.tag}
            </span>
          )}
        </div>
        {/* Title + Emoji */}
        <div className="mb-2.5 flex items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[28px] font-normal leading-[1.1] tracking-tight text-[#1A1715]">{event.title || "Event Title"}</h2>
            {event.tagline && <p className="mt-0.5 truncate font-sans text-[13px] italic leading-snug text-[#8B6F5A]">{event.tagline}</p>}
          </div>
          <span className="shrink-0 text-[34px] leading-none">{event.emoji}</span>
        </div>
        {/* Info chips */}
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5">
          {chips.map((chip, ci) => (
            <div key={ci} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1" style={{ background: chip.accent ? accentDark + "12" : "#fff", boxShadow: chip.accent ? "none" : "0 1px 2px rgba(26,23,21,0.04)" }}>
              {chip.icon && <span className="text-[10px]">{chip.icon}</span>}
              <span className="text-[11px]" style={{ fontFamily: chip.accent ? "var(--font-dm-mono), monospace" : "var(--font-dm-sans), sans-serif", fontWeight: chip.accent ? 600 : 500, color: chip.accent ? accentDark : "#2C2520" }}>{chip.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      {sectionTabs.length > 1 && (
        <div className="flex shrink-0 gap-0 border-b border-[#E8DDD0]/50 bg-[#FAF6F0] px-6">
          {sectionTabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)} className="cursor-pointer px-4 pb-2.5 pt-3 font-mono text-[11px] uppercase tracking-[1.5px] transition-all" style={{ color: activeSection === tab.id ? accentDark : "#9B8E82", fontWeight: activeSection === tab.id ? 500 : 400, background: "none", border: "none", borderBottom: activeSection === tab.id ? `2px solid ${accentDark}` : "2px solid transparent" }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
        {/* ===== OVERVIEW TAB ===== */}
        {activeSection === "overview" && (
          <div className="relative">
            {/* Ghost watermark */}
            <div className="pointer-events-none absolute -left-2.5 -top-[30px] max-w-full overflow-hidden font-serif text-[200px] font-normal leading-[0.8] tracking-tighter text-[#1A1715] opacity-[0.025]">offline</div>

            {/* Description */}
            {event.description && (
              <p className="relative mb-7 font-sans text-[15px] leading-[1.75] text-[#8B6F5A]">{event.description}</p>
            )}

            {/* Zones — dark section */}
            {event.zones && event.zones.length > 0 && (
              <div className="relative -mx-6 mb-7 overflow-hidden bg-[#1A1715] px-6 py-7">
                <div className="pointer-events-none absolute -top-2.5 right-3 font-serif text-[180px] font-normal leading-[0.9] text-[#FAF6F0] opacity-[0.03]">01</div>
                <SectionLabel label="what's inside" sticker="the good stuff ↓" stickerColor={accent} dark />
                <div className="grid grid-cols-2 gap-2.5">
                  {event.zones.map((z, i) => (
                    <div key={i} className="rounded-2xl border border-[#9B8E82]/[0.12] bg-[#2C2520] p-4">
                      <span className="mb-2.5 block text-2xl">{z.icon}</span>
                      <p className="mb-0.5 font-sans text-[13px] font-medium text-[#FAF6F0]">{z.name}</p>
                      <p className="font-mono text-[10px] leading-snug text-[#9B8E82]">{z.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What's included */}
            {event.includes && event.includes.length > 0 && (
              <div className="mb-7">
                <SectionLabel label="what's included" sticker="you literally just show up" stickerColor="#D4A574" />
                <div className="rounded-2xl border border-[#E8DDD0]/40 bg-white p-[18px] shadow-[0_1px_4px_rgba(26,23,21,0.03)]">
                  {event.includes.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < event.includes.length - 1 ? "1px solid rgba(232,221,208,0.3)" : "none" }}>
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: accent + "20" }}>
                        <span className="font-mono text-[10px]" style={{ color: accentDark }}>✓</span>
                      </div>
                      <span className="font-sans text-sm text-[#8B6F5A]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dress code */}
            {event.dress_code && (
              <div className="mb-7">
                <div className="flex items-center gap-3.5 rounded-2xl border p-[18px_20px]" style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}08)`, borderColor: accent + "20" }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: accent + "25" }}>👗</div>
                  <div>
                    <p className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px] text-[#9B8E82]">dress code</p>
                    <p className="font-sans text-sm font-medium text-[#1A1715]">{event.dress_code}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Venue */}
            {(event.venue_name || event.venue_reveal_date) && (
              <div className="mb-7">
                <SectionLabel label="venue" />
                {isRevealed ? (
                  <div className="relative overflow-hidden rounded-2xl border border-[#E8DDD0]/40 bg-white p-5 shadow-[0_1px_4px_rgba(26,23,21,0.03)]">
                    <div className="absolute right-3 top-2">
                      <span className="rounded-full bg-[#A8B5A0]/15 px-2 py-0.5 font-mono text-[9px] text-[#A8B5A0]">revealed</span>
                    </div>
                    <div className="absolute bottom-2.5 right-3.5 font-[family-name:var(--font-caveat)] text-xs opacity-70" style={{ color: accent, transform: "rotate(4deg)" }}>screenshot this 📸</div>
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: accent + "15" }}>📍</div>
                      <div>
                        <p className="font-serif text-lg text-[#1A1715]">{event.venue_name}</p>
                        {event.venue_area && <p className="mt-0.5 font-sans text-[13px] text-[#8B6F5A]">{event.venue_area}</p>}
                        {event.venue_address && <p className="mt-0.5 font-mono text-[11px] text-[#9B8E82]">{event.venue_address}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-[#1A1715] p-6 text-center">
                    <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${accent}10, transparent 70%)` }} />
                    <div className="absolute right-4 top-3 font-[family-name:var(--font-caveat)] text-xs text-[#D4A574] opacity-60" style={{ transform: "rotate(3deg)" }}>patience is a virtue</div>
                    <span className="relative mb-2.5 block text-[28px]">🔐</span>
                    <p className="relative mb-1 font-serif text-lg text-[#FAF6F0]">venue sealed</p>
                    <p className="relative font-mono text-[11px] text-[#9B8E82]">
                      {event.venue_reveal_date ? `drops ${new Date(event.venue_reveal_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "dropping soon"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pickup points */}
            {event.pickup_points && event.pickup_points.length > 0 && (
              <div className="mb-7">
                <SectionLabel label="pickup & drop" sticker="we got you" stickerColor="#D4A574" />
                <div className="flex flex-col gap-2.5">
                  {event.pickup_points.map((p, i) => (
                    <div key={i} className="flex items-center gap-3.5 rounded-[14px] border border-[#E8DDD0]/40 bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.03)]">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-base" style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}08)` }}>🚘</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-sans text-[13px] font-medium text-[#1A1715]">{p.name}</p>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px]" style={{ color: accentDark }}>{p.time}</span>
                          {p.capacity > 0 && <span className="font-mono text-[10px] text-[#9B8E82]">{p.capacity} seats</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-center font-mono text-[10px] italic text-[#9B8E82]/80">you&apos;ll pick your point after booking</p>
              </div>
            )}

            {/* Refund policy */}
            {isTicketed && event.ticketing?.refund_policy && (
              <div className="mb-5 rounded-xl bg-[#E8DDD0]/30 px-4 py-3 text-center">
                <p className="font-mono text-[10px] text-[#9B8E82]">📋 {event.ticketing.refund_policy}</p>
              </div>
            )}

            {/* Spots bar */}
            <div className="mb-2">
              <SpotsBar spotsLeft={spotsLeft} totalSpots={event.total_spots} accent={accentDark} />
            </div>

            {/* Schedule sections */}
            {scheduleSections.length > 0 && (
              <div className="mt-5">
                {scheduleSections.map((sec, si) => (
                  <div key={si} className="relative -mx-6 mb-7 overflow-hidden bg-[#1A1715] px-6 py-7">
                    <div className="pointer-events-none absolute -top-2.5 right-3 font-serif text-[160px] font-normal leading-[0.9] text-[#FAF6F0] opacity-[0.03]">{String(si + 2).padStart(2, "0")}</div>
                    <SectionLabel label={sec.title} icon="📋" sticker="loosely. very loosely." stickerColor={accent} dark />
                    <div className="flex flex-col">
                      {sec.items.map((item, ii) => (
                        <div key={ii} className="relative flex items-start gap-3.5 py-2.5" style={{ borderBottom: ii < sec.items.length - 1 ? "1px solid rgba(155,142,130,0.12)" : "none" }}>
                          <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
                            <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: ii === 0 ? accentDark : accent + "40", border: ii === 0 ? "none" : `1.5px solid ${accent}60` }} />
                            {ii < sec.items.length - 1 && <div className="mt-1 min-h-[16px] flex-1" style={{ width: "1.5px", background: "rgba(155,142,130,0.15)" }} />}
                          </div>
                          <span className="font-sans text-[13px] leading-relaxed text-[#FAF6F0]/80">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Organizer message */}
            {event.post_booking?.custom_message && (
              <div className="relative mb-7 overflow-hidden rounded-2xl border p-5" style={{ background: `linear-gradient(135deg, ${accent}10, ${accent}05)`, borderColor: accent + "15" }}>
                <div className="absolute right-3.5 top-2.5 font-[family-name:var(--font-caveat)] text-[11px] text-[#D4A574]" style={{ transform: "rotate(2deg)" }}>from us to you</div>
                <span className="mb-2.5 block font-mono text-[9px] uppercase tracking-[1.5px] text-[#9B8E82]">a note from the team</span>
                <p className="font-[family-name:var(--font-caveat)] text-[17px] leading-relaxed text-[#8B6F5A]">{event.post_booking.custom_message}</p>
              </div>
            )}
          </div>
        )}

        {/* ===== TICKETS TAB ===== */}
        {activeSection === "tickets" && isTicketed && (
          <div className="relative">
            <div className="pointer-events-none absolute -right-2 -top-5 font-serif text-[140px] font-normal leading-[0.9] text-[#1A1715] opacity-[0.03]">₹</div>
            <p className="mb-5 font-[family-name:var(--font-caveat)] text-sm text-[#D4A574]" style={{ transform: "rotate(-0.5deg)", display: "inline-block" }}>early bird gets the best deal. obviously.</p>
            <div className="mb-6 flex flex-col gap-3">
              {tiers.map((tier) => (
                <TierCard key={tier.id} tier={tier} accent={accent} accentDark={accentDark} />
              ))}
            </div>
            {event.ticketing?.refund_policy && (
              <div className="rounded-xl bg-[#E8DDD0]/25 px-4 py-3.5 text-center">
                <p className="font-mono text-[10px] text-[#9B8E82]">{event.ticketing.refund_policy}</p>
              </div>
            )}
          </div>
        )}

        {/* ===== SEATING TAB ===== */}
        {activeSection === "seating" && event.seating && event.seating.mode !== "none" && (
          <div>
            <p className="mb-1.5 font-sans text-sm leading-relaxed text-[#8B6F5A]">
              {event.seating.allow_choice ? "pick your section when you book." : "we'll seat you based on your vibe."}
            </p>
            <p className="mb-6 font-mono text-[10px] text-[#9B8E82]">
              {event.seating.mode === "sections" ? "section-based seating" : event.seating.mode === "seats" ? "assigned seats" : "mixed seating"}
            </p>
            {event.seating.sections && event.seating.sections.length > 0 && (
              <div className="relative -mx-6 overflow-hidden bg-[#1A1715] px-6 py-7">
                <div className="pointer-events-none absolute -top-2.5 left-2.5 font-serif text-[120px] font-normal leading-[0.9] text-[#FAF6F0] opacity-[0.03]">seats</div>
                {/* Stage */}
                <div className="relative mb-6 text-center">
                  <div className="inline-block rounded-b-[20px] border border-t-0 px-10 py-2.5" style={{ background: `linear-gradient(135deg, ${accent}30, ${accentDark}30)`, borderColor: "rgba(155,142,130,0.15)" }}>
                    <span className="font-mono text-[10px] uppercase tracking-[3px] text-[#FAF6F0]">stage</span>
                  </div>
                  <div className="mx-auto mt-0 h-px w-[70%]" style={{ background: "linear-gradient(90deg, transparent, rgba(155,142,130,0.2), transparent)" }} />
                  <span className="mt-2 block font-[family-name:var(--font-caveat)] text-xs text-[#9B8E82]/60">choose wisely. or don&apos;t. we&apos;ll move you anyway.</span>
                </div>
                {/* Section cards */}
                <div className="flex flex-col gap-3">
                  {event.seating.sections.map((sec, i) => {
                    const color = sec.color || accent;
                    return (
                      <div key={sec.id || i} className="relative overflow-hidden rounded-2xl border-[1.5px] bg-[#2C2520] p-[18px_20px]" style={{ borderColor: color + "25", boxShadow: `0 2px 12px ${color}08` }}>
                        <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl" style={{ background: color }} />
                        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 80% 20%, ${color}06, transparent 60%)` }} />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ background: color + "15" }}>{sec.emoji || "🪑"}</div>
                            <div>
                              <p className="font-sans text-sm font-medium text-[#FAF6F0]">{sec.name}</p>
                              {sec.description && <p className="font-mono text-[11px] text-[#9B8E82]">{sec.description}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-medium text-[#FAF6F0]">{sec.capacity}</p>
                            <p className="font-mono text-[9px] text-[#9B8E82]">seats</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA — display only */}
      <div className="relative shrink-0 px-5 pb-6 pt-3">
        <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-[#FAF6F0] to-transparent" />
        <div className="w-full rounded-[18px] py-4 text-center font-sans text-sm font-medium" style={{ background: spotsLeft === 0 ? "#E8DDD0" : "#1A1715", color: spotsLeft === 0 ? "#9B8E82" : "#fff", boxShadow: spotsLeft === 0 ? "none" : "0 4px 24px rgba(26,23,21,0.3), 0 0 0 1px rgba(155,142,130,0.1)" }}>
          {ctaLabel()}
        </div>
      </div>
    </div>
  );
}

/* ── Countdown view — mirrors CountdownScreen.tsx ──── */

function CountdownView({ event }: { event: Event }) {
  const postBooking = event.post_booking;
  const showCountdown = postBooking?.show_countdown ?? true;
  const showVenueProgress = postBooking?.show_venue_progress ?? true;
  const showDailyQuote = postBooking?.show_daily_quote ?? true;

  const now = new Date();
  const eventDate = event.date ? new Date(event.date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const diff = Math.max(0, eventDate.getTime() - now.getTime());
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  const totalDays = event.venue_reveal_date
    ? Math.ceil((eventDate.getTime() - new Date(event.venue_reveal_date).getTime()) / (1000 * 60 * 60 * 24)) + 10
    : 10;
  const venueProgress = ((totalDays - d) / totalDays) * 100;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5EDE4] px-5 pb-20 pt-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#6B7A63]/20 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-[#6B7A63]" />
          <span className="font-mono text-[11px] text-[#6B7A63]">ticket confirmed</span>
        </div>
        <h2 className="mb-1 font-serif text-[32px] font-normal text-[#1A1715]">
          {event.title || "Event"} {event.emoji}
        </h2>
        <p className="font-sans text-sm text-[#9B8E82]">
          {event.date} &middot; {event.time}
        </p>
      </div>

      {/* Ticket card */}
      <div className="mb-5 rounded-[20px] border border-[#E8DDD0] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#9B8E82]">your ticket</span>
            <p className="mt-1 font-sans text-[15px] font-medium text-[#1A1715]">
              {event.ticketing?.tiers?.[0]?.label || "General"}
            </p>
          </div>
          <span className="font-sans text-lg font-semibold text-[#1A1715]">
            {event.ticketing?.tiers?.[0]?.price === 0 ? "Free" : `₹${event.ticketing?.tiers?.[0]?.price || 0}`}
          </span>
        </div>
      </div>

      {/* Organizer message */}
      {postBooking?.custom_message && (
        <div className="mb-5 rounded-[20px] border border-[#D4A574]/15 bg-[#D4A574]/5 p-5">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-[#D4A574]/60">from the host</span>
          <p className="font-serif text-base italic leading-relaxed text-[#6B5E52]">{postBooking.custom_message}</p>
        </div>
      )}

      {/* Countdown */}
      {showCountdown && (
        <div className="mb-5 rounded-3xl bg-white p-8 shadow-[0_2px_12px_rgba(26,23,21,0.04),0_8px_32px_rgba(26,23,21,0.06)]">
          <span className="mb-5 block text-center font-mono text-[10px] uppercase tracking-[3px] text-[#9B8E82]">countdown</span>
          <div className="mb-6 flex justify-center gap-2">
            {[
              { val: d, l: "days" },
              { val: h, l: "hrs" },
              { val: m, l: "min" },
              { val: s, l: "sec" },
            ].map((u, i) => (
              <div key={i} className="min-w-[64px] text-center">
                <div className="mb-1.5 font-mono text-4xl font-medium leading-none text-[#1A1715]">
                  {String(u.val).padStart(2, "0")}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#9B8E82]">{u.l}</div>
              </div>
            ))}
          </div>

          {showVenueProgress && (
            <>
              <div className="-mx-2 mb-5 h-px bg-[#E8DDD0]" />
              <div className="mb-2.5 flex justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#9B8E82]">venue reveal</span>
                <span className="font-mono text-[11px] text-[#D4A574]">{d} days to go</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-[#E8DDD0]">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${Math.min(venueProgress, 100)}%`, background: "linear-gradient(90deg, #D4A574, #B8845A)" }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Post-booking sections */}
      {postBooking?.sections?.map((section, i) => (
        <PostBookingSectionCard key={i} section={section} />
      ))}

      {/* Daily quote */}
      {showDailyQuote && (
        <div className="relative mb-5 overflow-hidden rounded-[20px] bg-white p-7 shadow-[0_1px_4px_rgba(26,23,21,0.03)]">
          <div className="absolute -right-2.5 -top-5 text-[80px] opacity-5">💭</div>
          <span className="mb-3.5 block font-mono text-[10px] uppercase tracking-[2px] text-[#9B8E82]">daily reminder</span>
          <p className="mb-2 font-serif text-xl italic leading-snug text-[#1A1715]">
            &ldquo;you&apos;re holding a rectangle when you could be holding a drink.&rdquo;
          </p>
          <p className="font-mono text-[11px] text-[#9B8E82]">&mdash; come offline</p>
        </div>
      )}

      {/* Screen time nudge */}
      <div className="mb-5 rounded-[20px] bg-[#1A1715] p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xl">📱</span>
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#9B8E82]">screen time today</span>
        </div>
        <p className="mb-1.5 font-serif text-[28px] text-[#F5EDE4]">too much.</p>
        <p className="font-sans text-[13px] text-[#9B8E82]/60">close the app. go outside. we&apos;ll ping you when it&apos;s time.</p>
      </div>

      {/* Venue sealed button */}
      <div className="w-full rounded-[20px] border-[1.5px] border-dashed border-[#D4A574]/25 bg-[#D4A574]/5 p-5 text-center">
        <span className="mb-2 block text-2xl">✉️</span>
        <p className="mb-1 font-sans text-sm font-medium text-[#6B5E52]">venue sealed</p>
        <p className="font-mono text-[11px] text-[#9B8E82]">tap to peek (demo)</p>
      </div>
    </div>
  );
}

/* ── Post-booking section card ─────────────────────── */

function PostBookingSectionCard({ section }: { section: PostBookingSection }) {
  return (
    <div className="mb-5 rounded-[20px] bg-white p-6 shadow-[0_1px_4px_rgba(26,23,21,0.03)]">
      <div className="mb-3 flex items-center gap-2">
        {section.icon && <span className="text-lg">{section.icon}</span>}
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-[#9B8E82]">{section.title}</span>
      </div>
      <ul className="space-y-2">
        {section.items.filter(Boolean).map((item, j) => (
          <li key={j} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#D4A574]/40" />
            <span className="font-sans text-[13px] text-[#1A1715]/80">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Main Preview Component ────────────────────────── */

export function EventPreview({ event, onClose, initialView = "detail" }: EventPreviewProps) {
  const [view, setView] = useState<"detail" | "countdown">(initialView);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* View toggle */}
        <div className="flex items-center gap-2 rounded-full bg-white/10 p-1 backdrop-blur-md">
          <button
            onClick={() => setView("detail")}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[1px] transition-colors ${
              view === "detail" ? "bg-cream text-gate-black" : "text-cream/70 hover:text-cream"
            }`}
          >
            event detail
          </button>
          <button
            onClick={() => setView("countdown")}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[1px] transition-colors ${
              view === "countdown" ? "bg-cream text-gate-black" : "text-cream/70 hover:text-cream"
            }`}
          >
            post-booking
          </button>
          <button
            onClick={onClose}
            className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-sm text-cream hover:bg-white/20"
          >
            x
          </button>
        </div>

        {/* Phone frame */}
        <div className="relative">
          <div className="overflow-hidden rounded-[40px] border-[6px] border-[#2A2725] bg-[#2A2725] shadow-2xl">
            {/* Notch */}
            <div className="relative flex h-8 items-center justify-center bg-[#F5EDE4]">
              <div className="h-[22px] w-[100px] rounded-b-2xl bg-[#2A2725]" />
            </div>

            {/* Screen */}
            <div
              className="flex flex-col bg-[#FAF6F0]"
              style={{ width: 375, height: 720 }}
            >
              {view === "detail" ? (
                <DetailView event={event} />
              ) : (
                <CountdownView event={event} />
              )}
            </div>

            {/* Home indicator */}
            <div className="flex h-6 items-center justify-center bg-[#F5EDE4]">
              <div className="h-1 w-28 rounded-full bg-[#1A1715]/20" />
            </div>
          </div>
        </div>

        {/* Admin info badge */}
        <div className="rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md">
          <span className="font-mono text-[10px] text-cream/60">
            preview — this is how users will see it
          </span>
        </div>
      </div>
    </div>
  );
}
