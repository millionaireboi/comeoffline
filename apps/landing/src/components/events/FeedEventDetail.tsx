"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAnalytics, EVENT_DETAIL_OPENED, GATE_OPENED, EVENT_SHARED, trackFbEvent, FUNNEL_LANDING_VIEWED, FUNNEL_IM_IN_CLICKED, FUNNEL_APP_HANDOFF_STARTED } from "@comeoffline/analytics";
import { P, API_URL } from "@/components/shared/P";
import { formatEventDateShort } from "@comeoffline/ui";
import { buildAppHandoffUrl } from "@/lib/handoff";
import { SpotsBar } from "@/components/events/SpotsBar";
import { useChat } from "@/components/chat/ChatProvider";

interface FeedEventDetailProps {
  event: any;
  onClose: () => void;
  /** Other editions of the same series (event included), earliest first —
   *  renders the "pick your date" row when there are 2+. */
  siblings?: any[];
  /** Called when the user taps another date; parent swaps the shown event
   *  (feed) or navigates to it (share page). */
  onSwitchEvent?: (e: any) => void;
  /** Render in place instead of portaling to <body>. The share page SSRs the
   *  sheet as the page itself — portaling there kept the content out of the
   *  server HTML and hydration-mismatched (server rendered null). The feed
   *  overlay must keep the portal: it escapes the homepage stacking-context
   *  trap where z-[1] sibling wrappers paint over fixed overlays. */
  inline?: boolean;
}

type GateStage = "idle" | "confirmed";

// Generic fallback FAQ — only answers true for EVERY event. Per-event
// specifics come from event.faq (authored in admin). Mirrors the app's
// FAQSection fallback so both surfaces stay consistent.
const GENERIC_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "coming solo?",
    a: "you come solo and go back with memories. that's the whole point.",
  },
  {
    q: "what do I bring?",
    a: "yourself and the energy. we'll handle everything else.",
  },
  {
    q: "how do I find the venue?",
    a: "exact directions drop on WhatsApp before the event.",
  },
  {
    q: "refunds?",
    a: "no refunds — everything is reserved and planned around you the moment you book. exception: if we don't approve your entry, you get a full refund.",
  },
];

function CoverMedia({ event }: { event: any }) {
  const isVideo = event.cover_type === "video";
  const images: string[] = isVideo
    ? []
    : [event.cover_url, ...(event.gallery_urls || [])];
  const hasCarousel = images.length > 1;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!hasCarousel) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [hasCarousel, images.length]);

  if (isVideo) {
    return (
      <div style={{ position: "relative", width: "100%", height: 170, overflow: "hidden", flexShrink: 0 }}>
        <video
          src={event.cover_url}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: event.cover_focus || "center", display: "block" }}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent, rgba(0,0,0,0.15))",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  if (hasCarousel) {
    return (
      <div style={{ position: "relative", width: "100%", height: 170, overflow: "hidden", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            height: "100%",
            transition: "transform 0.5s ease-in-out",
            transform: `translateX(-${active * 100}%)`,
          }}
        >
          {images.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={i === 0 ? event.title : `${event.title} ${i + 1}`}
              style={{
                width: "100%",
                height: 170,
                objectFit: "cover",
                objectPosition: event.cover_focus || "center",
                flexShrink: 0,
                display: "block",
              }}
            />
          ))}
        </div>
        {/* Dots */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === active ? 16 : 6,
                height: 6,
                borderRadius: 3,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: i === active ? "#fff" : "rgba(255,255,255,0.5)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent, rgba(0,0,0,0.15))",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  // Single image
  return (
    <div style={{ position: "relative", width: "100%", height: 170, overflow: "hidden", flexShrink: 0 }}>
      <img
        src={event.cover_url}
        alt={event.title}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: event.cover_focus || "center", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent, rgba(0,0,0,0.15))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function FeedEventDetail({ event, onClose, siblings, onSwitchEvent, inline }: FeedEventDetailProps) {
  const { openChat } = useChat();
  const { track, identify } = useAnalytics();
  const [gateStage, setGateStage] = useState<GateStage>("idle");

  // Repeatable-IP series: 2+ editions → date row. Parent passes the full
  // sibling list (this event included) and handles the actual switch.
  const dateOptions = (siblings ?? []).length >= 2 ? (siblings as any[]) : [];

  // Scroll affordance — the sheet opens with tiers filling the viewport and
  // nothing says the description/gallery/FAQ exist below. Nudge until the
  // first scroll; skip when everything already fits.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setShowScrollHint(el.scrollHeight > el.clientHeight + 60);
    const onScroll = () => {
      if (el.scrollTop > 24) setShowScrollHint(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [event.id, gateStage]);

  // UTMs from the ad URL — forwarded on the app handoff for attribution
  const prefilledUtmRef = useRef<{ utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string }>({});

  // FAQ accordion — collapsed by default, only one open at a time
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const accent = event.accent || P.caramel;
  const accentDark = event.accent_dark || P.deepCaramel;
  const spotsLeft = event.total_spots - event.spots_taken;

  // Ticketing — public-facing tiers (no capacity numbers; just sold_out + low_stock flags)
  const tiers = (event.ticketing?.enabled ? event.ticketing.tiers || [] : []) as Array<{
    id: string;
    label: string;
    price: number;
    description?: string;
    sold_out: boolean;
    low_stock: boolean;
    per_person?: number;
  }>;
  const availableTiers = tiers.filter((t) => !t.sold_out);
  const cheapestPrice = availableTiers.length > 0 ? Math.min(...availableTiers.map((t) => t.price)) : null;
  // Auto-select the cheapest available tier so the CTA is one-tap from the moment
  // the page loads — no "select a tier" dead-end gate.
  const [selectedTierId, setSelectedTierId] = useState<string | null>(() => {
    if (availableTiers.length === 0) return null;
    return availableTiers.reduce(
      (min, t) => (t.price < min.price ? t : min),
      availableTiers[0],
    ).id;
  });
  const isFree = tiers.length === 0 || (cheapestPrice !== null && cheapestPrice === 0);
  const fillPct = event.total_spots > 0 ? (event.spots_taken / event.total_spots) * 100 : 0;
  const fillingFast = !isFree && fillPct >= 70 && spotsLeft > 0;

  // Compute days until venue reveal — client-only to avoid SSR/hydration drift,
  // since `new Date()` differs between server render and client hydrate.
  const [daysUntilVenue, setDaysUntilVenue] = useState<number | null>(null);
  useEffect(() => {
    if (!event.venue_reveal_date) return;
    const now = new Date();
    const reveal = new Date(event.venue_reveal_date);
    const diffMs = reveal.getTime() - now.getTime();
    setDaysUntilVenue(Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
  }, [event.venue_reveal_date]);

  // Track event detail opened + Meta Pixel ViewContent + funnel landing event
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const utm = {
      utm_source: params?.get("utm_source") || undefined,
      utm_medium: params?.get("utm_medium") || undefined,
      utm_campaign: params?.get("utm_campaign") || undefined,
      utm_content: params?.get("utm_content") || undefined,
      has_prefilled_code: !!params?.get("code"),
    };
    track(EVENT_DETAIL_OPENED, {
      event_id: event.id,
      event_title: event.title,
      spots_remaining: spotsLeft,
    });
    track(FUNNEL_LANDING_VIEWED, {
      event_id: event.id,
      event_title: event.title,
      spots_remaining: spotsLeft,
      ...utm,
    });
    trackFbEvent("ViewContent", {
      content_ids: [event.id],
      content_type: "product",
      content_name: event.title,
      content_category: event.tag,
      currency: "INR",
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture UTMs from the ad URL — forwarded to the app on handoff for attribution.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    prefilledUtmRef.current = {
      ...(params.get("utm_source") && { utm_source: params.get("utm_source") as string }),
      ...(params.get("utm_medium") && { utm_medium: params.get("utm_medium") as string }),
      ...(params.get("utm_campaign") && { utm_campaign: params.get("utm_campaign") as string }),
      ...(params.get("utm_content") && { utm_content: params.get("utm_content") as string }),
    };
  }, []);

  // Lock page scroll while the sheet is open. body overflow alone doesn't
  // stop touch scrolling on iOS Safari — the page behind kept scrolling and
  // dragged the "fixed" overlay around with it. Locking documentElement too
  // (plus overscroll-behavior) is what iOS actually respects. Don't reach
  // for the body position:fixed trick: a fixed body breaks the paint of
  // fixed overlays inside it.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overflow = "";
    };
  }, []);

  const handleImIn = useCallback(() => {
    track(GATE_OPENED, { event_id: event.id, event_title: event.title });
    track(FUNNEL_IM_IN_CLICKED, {
      event_id: event.id,
      event_title: event.title,
      tier_id: selectedTierId,
      ...prefilledUtmRef.current,
    });

    // Open entry: no codes, no landing-side auth. Hand straight to the app
    // with the event + tier deep-link — sign-in/sign-up happens there and the
    // app preserves the intent through it.
    setGateStage("confirmed");
    track(FUNNEL_APP_HANDOFF_STARTED, {
      event_id: event.id,
      tier_id: selectedTierId,
      source: "open_entry",
    });
    setTimeout(() => {
      window.location.href = buildAppHandoffUrl({
        eventId: event.id,
        tierId: selectedTierId,
        utm: prefilledUtmRef.current,
      });
    }, 900);
  }, [event.id, event.title, track, selectedTierId]);

  // Portaled to <body> (unless inline): on the homepage this dialog renders
  // inside a `relative z-[1]` wrapper, so its z-index: 600 only counted
  // WITHIN that stacking context — the sibling z-[1] brand-story sections
  // painted over the sheet (and ate the Buy Tickets button) whenever the
  // page was scrolled. At body level the overlay genuinely sits above
  // everything.
  const sheet = (
    <div
      role="dialog"
      aria-modal="true"
      className="co-sheet-overlay"
      style={{
        position: "fixed",
        zIndex: 600,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop — touchAction none so swipes on it can't scroll the page
          behind on iOS */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(14, 13, 11, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          touchAction: "none",
        }}
      />

      {/* Bottom sheet */}
      <div
        className="co-sheet"
        style={{
          position: "relative",
          background: P.cream,
          borderRadius: "24px 24px 0 0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "sheetSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          transition: "background 0.4s ease",
        }}
      >
        {/* Accent gradient top bar */}
        <div
          style={{
            height: 4,
            borderRadius: "24px 24px 0 0",
            background: `linear-gradient(90deg, ${accent}, ${accentDark || accent}80)`,
            flexShrink: 0,
          }}
        />

        {/* ===== CONFIRMED VIEW ===== */}
        {gateStage === "confirmed" && (
          <div
            style={{
              padding: "48px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "gateFadeIn 0.35s ease",
            }}
          >
            <span style={{ fontSize: 48, marginBottom: 16 }}>{event.emoji}</span>
            <div
              className="font-sans text-[16px] font-semibold"
              style={{
                display: "block",
                width: "100%",
                background: P.sage,
                color: "#FFFFFF",
                borderRadius: 14,
                padding: "15px 0",
                textAlign: "center",
                letterSpacing: 0.3,
              }}
            >
              see you there {"\u2192"}
            </div>
            <p className="font-sans text-[13px]" style={{ color: P.muted, marginTop: 12 }}>
              taking you to the app to grab your spot...
            </p>
          </div>
        )}

        {/* ===== IDLE VIEW — event details ===== */}
        {gateStage === "idle" && (
          <>
            {/* Cover media / carousel */}
            {event.cover_url && (
              <CoverMedia event={event} />
            )}

            {/* Header */}
            <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
              {/* Close + tag row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span
                  className="font-mono text-[9px] uppercase tracking-[1.5px]"
                  style={{
                    display: "inline-block",
                    color: accent,
                    background: accent + "12",
                    borderRadius: 20,
                    padding: "4px 10px",
                  }}
                >
                  {event.tag}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={async () => {
                      const url = typeof window !== "undefined"
                        ? `${window.location.origin}/events/${event.id}`
                        : `https://comeoffline.com/events/${event.id}`;
                      const shareData = { title: event.title, text: event.tagline, url };
                      if (typeof navigator !== "undefined" && navigator.share) {
                        try {
                          await navigator.share(shareData);
                          track(EVENT_SHARED, { event_id: event.id, method: "native" });
                        } catch { /* cancelled */ }
                      } else {
                        try {
                          await navigator.clipboard.writeText(url);
                          track(EVENT_SHARED, { event_id: event.id, method: "clipboard" });
                        } catch { /* fallback */ }
                      }
                    }}
                    aria-label="Share event"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 18,
                      color: P.muted,
                      padding: "4px 8px",
                      lineHeight: 1,
                    }}
                  >
                    &#8599;
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Close event details"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                      color: P.muted,
                      padding: "4px 8px",
                      lineHeight: 1,
                    }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Title — only renders when there's no cover image. When the cover is
                  present, the artwork itself carries the title (Option A). */}
              {!event.cover_url && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                  <h2
                    className="font-serif font-normal"
                    style={{
                      fontSize: 24,
                      lineHeight: 1.15,
                      color: P.nearBlack,
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {event.title}
                  </h2>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{event.emoji}</span>
                </div>
              )}

              {/* Tagline */}
              {event.tagline && (
                <p
                  className="font-sans text-[13px]"
                  style={{
                    color: P.warmBrown,
                    fontStyle: "italic",
                    margin: event.cover_url ? "0 0 6px" : "0 0 6px",
                    lineHeight: 1.4,
                  }}
                >
                  {event.tagline}
                </p>
              )}

              {/* Date · location — single quiet row replacing the old 4-column grid */}
              <div
                className="font-sans text-[12px]"
                style={{
                  color: P.warmBrown,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0 12px",
                  margin: "0 0 14px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11 }}>📅</span>
                  <span>
                    {formatEventDateShort(event.date, event.time)}
                  </span>
                </span>
                {(event.venue_name || event.venue_area || (daysUntilVenue !== null && daysUntilVenue > 0)) && (
                  <>
                    <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11 }}>📍</span>
                      <span>
                        {event.venue_name
                          || event.venue_area
                          || (daysUntilVenue && daysUntilVenue > 0
                              ? `venue drops in ${daysUntilVenue}d`
                              : "venue dropping soon")}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Scrollable body — minHeight: 0 lets it shrink inside the
                max-height flex column (otherwise it grows to content height
                and pushes the CTA out of the sheet) */}
            <div
              ref={bodyRef}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overscrollBehavior: "contain",
                padding: "0 20px 56px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Other dates — same series, pick-n-choose (repeatable IP) */}
              {dateOptions.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[2px]"
                    style={{ color: P.muted, display: "block", marginBottom: 10 }}
                  >
                    pick your date
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      margin: "0 -20px",
                      padding: "0 20px 4px",
                    }}
                  >
                    {dateOptions.map((sib) => {
                      const isCurrent = sib.id === event.id;
                      const sibFull =
                        sib.status === "sold_out" || (sib.total_spots ?? 0) - (sib.spots_taken ?? 0) <= 0;
                      return (
                        <button
                          key={sib.id}
                          onClick={() => !isCurrent && !sibFull && onSwitchEvent?.(sib)}
                          disabled={sibFull && !isCurrent}
                          className="font-sans text-[12px] font-medium"
                          style={{
                            flex: "0 0 auto",
                            background: isCurrent ? accentDark : "#FFFFFF",
                            color: isCurrent ? "#FFFFFF" : sibFull ? P.muted : P.nearBlack,
                            border: `1.5px solid ${isCurrent ? accentDark : accent + "30"}`,
                            borderRadius: 100,
                            padding: "9px 14px",
                            cursor: isCurrent || sibFull ? "default" : "pointer",
                            opacity: sibFull && !isCurrent ? 0.55 : 1,
                            whiteSpace: "nowrap",
                            transition: "all 0.18s ease",
                          }}
                        >
                          {formatEventDateShort(sib.date)}
                          {sibFull ? " · full" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tier cards — pricing transparency for cold traffic */}
              {tiers.length > 0 && !isFree && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span
                      className="font-mono text-[10px] uppercase tracking-[2px]"
                      style={{ color: P.muted }}
                    >
                      pick your vibe
                    </span>
                    {fillingFast && (
                      <span
                        className="font-hand text-[12px]"
                        style={{ color: accentDark }}
                      >
                        filling fast · {spotsLeft} left
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tiers.map((tier) => {
                      const isSelected = selectedTierId === tier.id;
                      const isSoldOut = tier.sold_out;
                      return (
                        <button
                          key={tier.id}
                          onClick={() => !isSoldOut && setSelectedTierId(tier.id)}
                          disabled={isSoldOut}
                          style={{
                            background: isSelected ? `linear-gradient(135deg, ${accent}18, ${P.cream})` : isSoldOut ? P.sand + "40" : "#FFFFFF",
                            border: `1.5px solid ${isSelected ? accentDark : isSoldOut ? P.sand : accent + "30"}`,
                            borderRadius: 14,
                            padding: "14px 16px",
                            textAlign: "left",
                            cursor: isSoldOut ? "default" : "pointer",
                            opacity: isSoldOut ? 0.55 : 1,
                            transition: "all 0.18s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            position: "relative",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span
                                className="font-sans text-[14px] font-medium"
                                style={{ color: isSoldOut ? P.muted : P.nearBlack }}
                              >
                                {tier.label}
                              </span>
                              {tier.low_stock && !isSoldOut && (
                                <span
                                  className="font-mono text-[9px] uppercase tracking-[1px]"
                                  style={{
                                    background: accentDark + "18",
                                    color: accentDark,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                  }}
                                >
                                  few left
                                </span>
                              )}
                            </div>
                            {tier.description && (
                              <p
                                className="font-sans text-[12px]"
                                style={{ color: P.muted, margin: 0, lineHeight: 1.35 }}
                              >
                                {tier.description}
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <span
                              className="font-mono text-[18px] font-medium"
                              style={{ color: isSoldOut ? P.muted : accentDark, display: "block" }}
                            >
                              {tier.price === 0 ? "free" : `₹${tier.price.toLocaleString("en-IN")}`}
                            </span>
                            {isSoldOut && (
                              <span
                                className="font-mono text-[9px] uppercase tracking-[1px]"
                                style={{ color: P.muted }}
                              >
                                sold out
                              </span>
                            )}
                            {!isSoldOut && tier.per_person && tier.per_person > 1 && (
                              <span
                                className="font-mono text-[9px]"
                                style={{ color: P.muted }}
                              >
                                for {tier.per_person}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <p
                  className="font-sans text-[14px]"
                  style={{
                    color: P.warmBrown,
                    lineHeight: 1.6,
                    margin: "0 0 20px",
                  }}
                >
                  {event.description}
                </p>
              )}

              {/* From previous editions — trust gallery (admin: past_photos).
                  Sits right after the pitch: proof it's real before the
                  logistics lists, where cold traffic decides. */}
              {Array.isArray(event.past_photos) && event.past_photos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[2px]"
                    style={{ color: P.muted, display: "block", marginBottom: 10 }}
                  >
                    from the last one
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                      margin: "0 -20px",
                      padding: "0 20px 4px",
                    }}
                  >
                    {event.past_photos.map((photo: { url: string; caption?: string }) => (
                      <figure key={photo.url} style={{ margin: 0, flex: "0 0 auto", width: 210 }}>
                        <img
                          src={photo.url}
                          alt={photo.caption || `${event.title} — a previous edition`}
                          loading="lazy"
                          style={{
                            width: 210,
                            height: 150,
                            objectFit: "cover",
                            borderRadius: 12,
                            display: "block",
                            border: `1px solid ${accent}20`,
                          }}
                        />
                        {photo.caption && (
                          <figcaption
                            className="font-hand text-[13px]"
                            style={{ color: P.warmBrown, margin: "6px 2px 0", lineHeight: 1.35 }}
                          >
                            {photo.caption}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              {/* What's inside - zones grid */}
              {event.zones && event.zones.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[2px]"
                    style={{ color: P.muted, display: "block", marginBottom: 10 }}
                  >
                    what&apos;s inside
                  </span>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {event.zones.map((zone: { name: string; icon: string; desc: string }, i: number) => (
                      <div
                        key={i}
                        style={{
                          background: accent + "08",
                          borderRadius: 12,
                          padding: "12px 14px",
                          border: `1px solid ${accent}10`,
                        }}
                      >
                        <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>{zone.icon}</span>
                        <span
                          className="font-sans text-[12px] font-medium"
                          style={{ color: P.nearBlack, display: "block", marginBottom: 2 }}
                        >
                          {zone.name}
                        </span>
                        <span
                          className="font-sans text-[11px]"
                          style={{ color: P.muted, lineHeight: 1.3 }}
                        >
                          {zone.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What's included */}
              {event.includes && event.includes.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[2px]"
                    style={{ color: P.muted, display: "block", marginBottom: 10 }}
                  >
                    what&apos;s included
                  </span>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {event.includes.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="font-sans text-[13px]"
                        style={{
                          color: P.warmBrown,
                          padding: "6px 0",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: accent,
                            flexShrink: 0,
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dress code */}
              {event.dress_code && (
                <div
                  style={{
                    background: accent + "0A",
                    border: `1px dashed ${accent}30`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{"\uD83D\uDC57"}</span>
                  <div>
                    <span
                      className="font-mono text-[9px] uppercase tracking-[1.5px]"
                      style={{ color: P.muted, display: "block", marginBottom: 2 }}
                    >
                      dress code
                    </span>
                    <span
                      className="font-sans text-[13px] font-medium"
                      style={{ color: P.nearBlack }}
                    >
                      {event.dress_code}
                    </span>
                  </div>
                </div>
              )}

              {/* FAQ — handles common cold-buyer objections */}
              <div style={{ marginBottom: 20 }}>
                <span
                  className="font-mono text-[10px] uppercase tracking-[2px]"
                  style={{ color: P.muted, display: "block", marginBottom: 10 }}
                >
                  good to know
                </span>
                <div style={{ borderTop: `1px solid ${P.sand}` }}>
                  {(event.faq?.length ? event.faq : GENERIC_FAQ).map((item: { q: string; a: string }, idx: number) => {
                    const isOpen = openFaqIdx === idx;
                    return (
                      <div key={idx} style={{ borderBottom: `1px solid ${P.sand}` }}>
                        <button
                          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                          aria-expanded={isOpen}
                          style={{
                            width: "100%",
                            background: "none",
                            border: "none",
                            padding: "14px 0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            className="font-sans text-[13px] font-medium"
                            style={{ color: P.nearBlack }}
                          >
                            {item.q}
                          </span>
                          <span
                            style={{
                              color: accentDark,
                              fontSize: 16,
                              transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                              lineHeight: 1,
                              flexShrink: 0,
                              marginLeft: 12,
                            }}
                          >
                            +
                          </span>
                        </button>
                        {isOpen && (
                          <p
                            className="font-sans text-[13px]"
                            style={{
                              color: P.warmBrown,
                              margin: "0 0 14px",
                              lineHeight: 1.55,
                              animation: "gateFadeIn 0.2s ease",
                            }}
                          >
                            {item.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spots bar + scarcity microcopy */}
              <div style={{ marginBottom: 20 }}>
                <SpotsBar spotsLeft={spotsLeft} totalSpots={event.total_spots} accent={accent} />
                {fillingFast && spotsLeft <= 15 && (
                  <p
                    className="font-hand text-[12px]"
                    style={{ color: accentDark, margin: "8px 0 0", textAlign: "center" }}
                  >
                    only {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left · don&apos;t sleep on it
                  </p>
                )}
              </div>
            </div>

            {/* Sticky bottom CTA — in-flow flex footer, not position: absolute.
                Pinning it to the container bottom put it under Safari's bottom
                bar on iOS (vh > visible viewport) and it vanished; as a flex
                child it always renders inside the sheet. The negative margin
                keeps the fade-out overlap over the scrolling text, and
                pointer-events pass through the gradient so that strip still
                scrolls. */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                flexShrink: 0,
                marginTop: -44,
                pointerEvents: "none",
                background: `linear-gradient(to top, ${P.cream} 70%, ${P.cream}00)`,
                padding: "20px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              {showScrollHint && (
                <p
                  className="font-hand text-[14px]"
                  style={{
                    textAlign: "center",
                    color: P.warmBrown,
                    margin: "0 0 8px",
                    animation: "hintBounce 1.6s ease-in-out infinite",
                  }}
                >
                  there&apos;s more below ↓
                </p>
              )}
              <button
                onClick={handleImIn}
                disabled={spotsLeft === 0}
                className="font-sans text-[15px] font-semibold"
                style={{
                  display: "block",
                  width: "100%",
                  pointerEvents: "auto",
                  background: spotsLeft === 0 ? "#E8DDD0" : "#1A1715",
                  color: spotsLeft === 0 ? P.muted : "#FFFFFF",
                  border: "none",
                  borderRadius: 100,
                  padding: "16px 0",
                  cursor: spotsLeft === 0 ? "default" : "pointer",
                  letterSpacing: 0.3,
                  boxShadow:
                    spotsLeft === 0
                      ? "none"
                      : "0 6px 24px rgba(26,23,21,0.28), 0 0 0 1px rgba(155,142,130,0.08)",
                  transition: "transform 0.18s ease",
                }}
              >
                {spotsLeft === 0 ? "Sold Out" : isFree ? "I'm In" : "Buy Tickets"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Keyframes + viewport sizing. dvh tracks the VISIBLE viewport on
          iOS Safari (vh is the toolbar-hidden height, ~70px taller) — with
          plain vh the sheet overflowed the screen and the Buy CTA hid under
          Safari's bottom bar. Classes, not inline styles, so the vh fallback
          cascades to the dvh override where supported. */}
      <style>{`
        .co-sheet-overlay {
          top: 0;
          left: 0;
          right: 0;
          height: 100vh;
          height: 100dvh;
        }
        .co-sheet {
          max-height: 92vh;
          max-height: 92dvh;
        }
        @keyframes sheetSlideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes gateFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes hintBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );

  if (inline) return sheet;
  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
}
