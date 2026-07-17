"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useAnalytics,
  CREATOR_PAGE_VIEWED,
  CREATOR_SECTION_VIEWED,
  CREATOR_EVENT_OPENED,
  CREATOR_WHATSAPP_CLICKED,
} from "@comeoffline/analytics";
import { formatEventDateShort } from "@comeoffline/ui";
import { FeedEventCard } from "@/components/events/FeedEventCard";
import { FeedEventDetail } from "@/components/events/FeedEventDetail";
import { groupSeries, seriesSiblings } from "@/lib/series";
import type { CreatorPageConfig } from "@/lib/creators";
import s from "./creator.module.css";

/** Film-grain overlay for polaroids — inline SVG noise, no asset needed. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

function Polaroid({
  photo,
  hero,
  children,
}: {
  photo: { src: string; alt: string; caption: string; w?: number; h?: number };
  hero?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <figure className={`${s.polaroid} ${hero ? s.polaroidHero : ""}`}>
      <span className={s.tape} aria-hidden="true" />
      <span className={s.shot}>
        {photo.w && photo.h ? (
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.w}
            height={photo.h}
            className={s.shotImg}
            priority={hero}
          />
        ) : (
          // Dynamic past_photos come from storage URLs without dimensions
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} alt={photo.alt} className={s.shotImg} loading="lazy" />
        )}
        <span className={s.grain} style={{ backgroundImage: GRAIN }} aria-hidden="true" />
      </span>
      <figcaption className={s.polaroidCap}>{photo.caption}</figcaption>
      {children}
    </figure>
  );
}

/** The rotating "gate: unlocked by <name>" stamp. */
function Seal({ text }: { text: string }) {
  return (
    <div className={s.seal} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs>
          <path id="sealPath" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
        </defs>
        <text className={s.sealText}>
          <textPath href="#sealPath">
            {text} ✳ {text} ✳{" "}
          </textPath>
        </text>
      </svg>
      <span className={s.sealMark}>✶</span>
    </div>
  );
}

export function CreatorLanding({
  config,
  events,
}: {
  /** Fully-resolved page config (Firestore or code registry) — serializable,
   *  crosses the RSC boundary so admin-onboarded creators need no bundle. */
  config: CreatorPageConfig;
  /** Upcoming events matching the creator's rooms, earliest first — full
   *  public payloads. Empty = fetch failed or nothing scheduled; the page
   *  still reads, minus cards. */
  events: any[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { track } = useAnalytics();
  const creator = config;

  const [detailEvent, setDetailEvent] = useState<any | null>(null);

  // One card per series — 3 friends house dates are one listing; the sheet
  // offers the dates. Same grouping the events feed uses.
  const groups = groupSeries(events);
  // The focal invite for the soft close: earliest edition that's still open
  const open = events.filter((e) => e.total_spots - e.spots_taken > 0 && e.status !== "sold_out");
  const featured = open[0] ?? events[0] ?? null;
  const featuredSpots = featured ? Math.max(0, featured.total_spots - featured.spots_taken) : 0;

  /** The creator's scribble for an event card, from their room rules. */
  const tieFor = (event: any): string | null =>
    creator.rooms.find((r) => (event.title ?? "").toLowerCase().includes(r.titleMatch.toLowerCase()))?.tie ?? null;

  // Proof gallery: real past_photos off the matched events when they exist
  // (admin sets them on the event), else the creator config's fallback shots.
  const pastPhotos: { src: string; alt: string; caption: string }[] = [
    ...new Map(
      events
        .flatMap((e) => (Array.isArray(e.past_photos) ? e.past_photos : []))
        .map((p: { url: string; caption?: string }) => [
          p.url,
          { src: p.url, alt: p.caption || "a past come offline event", caption: p.caption || "last time. everyone came solo." },
        ])
    ).values(),
  ].slice(0, 3);
  const proofPhotos = pastPhotos.length > 0 ? pastPhotos : creator.proof.photos;

  const placementRef = useRef<string | null>(null);

  // Attribution: make sure the creator's utm params are ON the url itself —
  // FeedEventDetail forwards url utms through the buy handoff, so this is
  // what stamps the sale to the creator even though the sheet predates
  // creator pages. router.replace (not raw history) so useSearchParams in
  // the sheet sees them.
  useEffect(() => {
    const p = params?.get("p") || null;
    placementRef.current = p;
    const sp = new URLSearchParams(params?.toString());
    let changed = false;
    const ensure = (key: string, value: string) => {
      if (!sp.get(key)) {
        sp.set(key, value);
        changed = true;
      }
    };
    ensure("utm_source", "creator");
    ensure("utm_medium", "social");
    ensure("utm_campaign", creator.handle);
    if (p) ensure("utm_content", p);
    if (changed) router.replace(`${pathname}?${sp.toString()}`, { scroll: false });

    track(CREATOR_PAGE_VIEWED, {
      creator: creator.handle,
      placement: p,
      event_id: featured?.id,
      utm_source: sp.get("utm_source"),
      utm_medium: sp.get("utm_medium"),
      utm_campaign: sp.get("utm_campaign"),
      utm_content: sp.get("utm_content") || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll depth — the only signal for WHERE readers stop before the rsvp.
  const seenRef = useRef<Set<string>>(new Set());
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!mainRef.current) return;
    const observer = new IntersectionObserver(
      (observed) => {
        for (const o of observed) {
          const section = (o.target as HTMLElement).dataset.section;
          if (!o.isIntersecting || !section || seenRef.current.has(section)) continue;
          seenRef.current.add(section);
          track(CREATOR_SECTION_VIEWED, { creator: creator.handle, section });
          observer.unobserve(o.target);
        }
      },
      { threshold: 0.2 }
    );
    mainRef.current.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEvent = (event: any) => {
    track(CREATOR_EVENT_OPENED, {
      creator: creator.handle,
      placement: placementRef.current,
      event_id: event.id,
      event_title: event.title,
    });
    setDetailEvent(event);
  };

  const whatsappHref = creator.whatsapp
    ? `https://wa.me/${creator.whatsapp.number}?text=${encodeURIComponent(creator.whatsapp.prefill)}`
    : null;

  return (
    <div className={s.page}>
      <div className={s.topnav}>
        <span className={s.brandlock}>
          <Image src="/logo.png" alt="come offline logo" width={34} height={34} className={s.logo} />
          <span className={s.wordmark}>comeoffline</span>
        </span>
      </div>

      <main className={s.wrap} ref={mainRef}>
        {/* ── hero — the personal invite ── */}
        <header className={s.hero} data-section="hero">
          <p className={s.heroLine}>{creator.heroLine}</p>
          <Polaroid photo={creator.photo} hero>
            <Seal text={creator.seal} />
          </Polaroid>
          <h1 className={s.headline}>
            {creator.headline.split("\n").map((line) => (
              <span key={line}>{line} </span>
            ))}
          </h1>
        </header>

        {/* ── the turn — their voice, our structure ── */}
        <section className={s.turn} data-section="turn">
          <span className={s.tape} aria-hidden="true" />
          {creator.turn.map((line) => (
            <p key={line} className={s.turnLine} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
          <p className={s.turnSign}>{creator.turnSign}</p>
        </section>

        {/* ── the rooms — the events feed cards, with the creator's scribble ── */}
        <section className={s.rooms} data-section="rooms">
          <h2 className={s.sectionLabel}>{creator.roomsTitle}</h2>

          {groups.length === 0 && (
            <p className={s.roomsEmpty}>the next room’s being set up. give it a day — or just ask me.</p>
          )}

          <div className={s.cardStack}>
            {groups.map((g, i) => {
              const tie = tieFor(g.event);
              return (
                <div key={g.event.id} className={s.cardSlot}>
                  {tie && <p className={s.roomTie}>{tie}</p>}
                  <FeedEventCard event={g.event} index={i} dateCount={g.siblings.length} onOpen={openEvent} />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── proof it's real ── */}
        <section className={s.proof} data-section="proof">
          <h2 className={s.sectionLabel}>proof this actually happens</h2>
          <div className={s.proofShots}>
            {proofPhotos.map((photo) => (
              <Polaroid key={photo.src} photo={photo} />
            ))}
          </div>
          {creator.proof.lines.map((line) => (
            <blockquote key={line.quote} className={s.proofLine}>
              <p>“{line.quote}”</p>
              <cite>{line.by}</cite>
            </blockquote>
          ))}
        </section>

        {/* ── objection handling, in voice ── */}
        <section className={s.objection} data-section="objection">
          <p className={s.objectionQ} dangerouslySetInnerHTML={{ __html: creator.objectionQ }} />
          {creator.objectionA.map((line) => (
            <p key={line} className={s.objectionA}>
              {line}
            </p>
          ))}
          <p className={s.friction}>{creator.friction}</p>
          {whatsappHref && (
            <a
              className={s.waBtn}
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                track(CREATOR_WHATSAPP_CLICKED, {
                  creator: creator.handle,
                  placement: placementRef.current,
                })
              }
            >
              💬 still unsure? just ask me
            </a>
          )}
        </section>

        {/* ── soft close — spots-left comes last, never as the headline ── */}
        <section className={s.close} data-section="close">
          {featured && featuredSpots > 0 && (
            <>
              <div className={s.closeNum}>{featuredSpots}</div>
              <p className={s.closeSpots}>
                seats left{featured.date ? ` on ${formatEventDateShort(featured.date, featured.time).split(" · ")[0]}` : ""}.
              </p>
            </>
          )}
          <p className={s.closeLede}>{creator.closeLede}</p>
          <p className={s.closeLine}>{creator.close}</p>
          {featured && (
            <button className={s.rsvp} onClick={() => openEvent(featured)}>
              save me a seat →
            </button>
          )}
          <div className={s.foot}>
            <Image src="/logo.png" alt="come offline logo" width={48} height={48} className={s.footLogo} />
            <p className={s.footBrand}>comeoffline</p>
            <p className={s.footNote}>you came here from {creator.name}’s corner of the internet. leave from ours.</p>
          </div>
        </section>
      </main>

      {/* The same buy sheet the events feed uses — tiers, dates, discount code
          entry, handoff. It forwards the url's utm params (set above) through
          the purchase, which is what attributes the sale to the creator. */}
      {detailEvent && (
        <FeedEventDetail
          key={detailEvent.id}
          event={detailEvent}
          siblings={seriesSiblings(detailEvent, events)}
          onSwitchEvent={setDetailEvent}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}
