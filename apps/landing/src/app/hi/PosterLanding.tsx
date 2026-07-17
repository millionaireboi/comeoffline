"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  useAnalytics,
  POSTER_SCANNED,
  POSTER_CHOICE_MADE,
  POSTER_LIGHTS_ON,
  POSTER_SECTION_VIEWED,
  POSTER_DATE_PICKED,
  POSTER_CTA_CLICKED,
  POSTER_WHATSAPP_CLICKED,
} from "@comeoffline/analytics";
import { buildAppHandoffUrl } from "@/lib/handoff";
import { getCampaign, DEFAULT_CAMPAIGN, type PosterBeat, type PosterChoice } from "@/lib/posterCampaigns";
import type { PosterDateOption } from "@/lib/posterCampaigns/server";
import s from "./poster.module.css";

interface LogEntry {
  kind: "line" | "reply";
  html: string;
  /** chars revealed so far; -1 = fully revealed */
  typed: number;
}

const TYPE_MS = 26;
const LINE_PAUSE_MS = 560;

/** Strip markup for the typewriter — the full html swaps in when the line completes. */
function plain(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

export function PosterLanding({
  campaignSlug,
  dates,
}: {
  /** Slug only — the config holds functions, which can't cross the RSC
   *  boundary; both sides import the same registry instead. */
  campaignSlug: string;
  /** Upcoming editions, earliest first. Empty = live fetch failed → static copy. */
  dates: PosterDateOption[];
}) {
  const params = useSearchParams();
  const { track } = useAnalytics();
  // Server pages validate the slug; the fallback only guards a stale bundle
  const campaign = getCampaign(campaignSlug) ?? DEFAULT_CAMPAIGN;
  const HOUSE = campaign.house;

  // Repeatable IP: 2+ live dates turn on the picker. Default to the earliest
  // date still open so the CTA works even if the scanner never picks.
  const multiDate = dates.length >= 2;
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (dates.find((d) => !d.soldOut) ?? dates[0])?.id ?? null
  );
  const selected = dates.find((d) => d.id === selectedId) ?? null;
  const note = multiDate && HOUSE.noteMulti ? HOUSE.noteMulti : HOUSE.note;

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [choices, setChoices] = useState<PosterChoice[] | null>(null);
  const [reveal, setReveal] = useState(false); // "show me the house" button visible
  const [act, setAct] = useState<1 | 2>(1);
  const [bulb, setBulb] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [hinted, setHinted] = useState(false);

  const scriptRef = useRef<PosterBeat[]>([]);
  const beatIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedRef = useRef(false);
  const utmRef = useRef<Record<string, string | undefined>>({});
  const posterLocRef = useRef<string | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseRef.current) clearTimeout(pauseRef.current);
    timerRef.current = null;
    pauseRef.current = null;
  };

  /** Completes the currently-typing line early; null when nothing is typing. */
  const finishRef = useRef<(() => void) | null>(null);

  /** Type one line, then hand control back via onDone. */
  const typeLine = useCallback((html: string, onDone: () => void) => {
    setEntries((prev) => [...prev.map((e) => ({ ...e, typed: -1 })), { kind: "line" as const, html, typed: 0 }]);
    const total = plain(html).length;
    let done = false;
    const finish = (fast: boolean) => {
      if (done) return;
      done = true;
      finishRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setEntries((prev) => prev.map((e, n) => (n === prev.length - 1 ? { ...e, typed: -1 } : e)));
      pauseRef.current = setTimeout(onDone, fast ? 180 : LINE_PAUSE_MS);
    };
    finishRef.current = () => finish(true);
    if (reducedRef.current) {
      finish(true);
      return;
    }
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      if (i >= total) {
        finish(false);
        return;
      }
      setEntries((prev) => prev.map((e, n) => (n === prev.length - 1 ? { ...e, typed: i } : e)));
    }, TYPE_MS);
  }, []);

  const saySeq = useCallback(
    (lines: string[], i: number, onDone: () => void) => {
      if (i >= lines.length) {
        onDone();
        return;
      }
      typeLine(lines[i], () => saySeq(lines, i + 1, onDone));
    },
    [typeLine]
  );

  const nextBeat = useCallback(() => {
    const beat = scriptRef.current[beatIdxRef.current++];
    if (!beat) {
      setReveal(true);
      return;
    }
    saySeq(beat.say, 0, () => {
      if (beat.ask) setChoices(beat.ask);
      else nextBeat();
    });
  }, [saySeq]);

  // Boot: read context, build script, start the conversation.
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const p = params?.get("p") || null;
    posterLocRef.current = p;
    const utm = {
      utm_source: params?.get("utm_source") || "poster",
      utm_medium: params?.get("utm_medium") || "offline",
      utm_campaign: params?.get("utm_campaign") || campaign.slug,
      utm_content: params?.get("utm_content") || p || undefined,
    };
    utmRef.current = utm;

    track(POSTER_SCANNED, { campaign: campaign.slug, poster_location: p, event_id: dates[0]?.id, ...utm });

    // Exact placement key first, then its letter prefix — poster codes are
    // minted per-spot (msr1..msr7) but share one location line per run
    const locLine = p ? campaign.locations[p] || campaign.locations[p.replace(/\d+$/, "")] || null : null;
    scriptRef.current = campaign.buildScript(locLine, campaign.timeLine(new Date().getHours()));
    beatIdxRef.current = 0;
    pauseRef.current = setTimeout(nextBeat, reducedRef.current ? 100 : 700);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Act 1 locks scroll; Act 2 releases it.
  useEffect(() => {
    document.body.style.overflow = act === 1 ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [act]);

  // Act 2 scroll depth — fire once per [data-section] as it scrolls into view.
  // This is the only signal for WHERE readers stop between lights-on and the CTA.
  const seenSectionsRef = useRef<Set<string>>(new Set());
  const houseRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (act !== 2 || !houseRef.current) return;
    const observer = new IntersectionObserver(
      (observed) => {
        for (const o of observed) {
          const section = (o.target as HTMLElement).dataset.section;
          if (!o.isIntersecting || !section || seenSectionsRef.current.has(section)) continue;
          seenSectionsRef.current.add(section);
          track(POSTER_SECTION_VIEWED, {
            campaign: campaign.slug,
            poster_location: posterLocRef.current,
            section,
            ...utmRef.current,
          });
          observer.unobserve(o.target);
        }
      },
      // Low threshold so sections taller than the viewport still fire
      { threshold: 0.2 }
    );
    houseRef.current.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act]);

  const hurry = () => {
    setHinted(true);
    finishRef.current?.();
  };

  const pick = (choice: PosterChoice, questionIdx: number) => {
    setChoices(null);
    setEntries((prev) => [...prev.map((e) => ({ ...e, typed: -1 })), { kind: "reply", html: choice.label, typed: -1 }]);
    track(POSTER_CHOICE_MADE, {
      campaign: campaign.slug,
      question_index: questionIdx,
      answer: choice.label,
      poster_location: posterLocRef.current,
    });
    if (choice.shake && !reducedRef.current) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
    pauseRef.current = setTimeout(() => saySeq(choice.react, 0, nextBeat), 420);
  };

  const lightsOn = () => {
    track(POSTER_LIGHTS_ON, { campaign: campaign.slug, poster_location: posterLocRef.current, event_id: selected?.id });
    if (!reducedRef.current) setBulb(true);
    setTimeout(
      () => {
        setAct(2);
        window.scrollTo(0, 0);
      },
      reducedRef.current ? 50 : 520
    );
  };

  const whatsappHref = () => {
    const wa = campaign.whatsapp!;
    return `https://wa.me/${wa.number}?text=${encodeURIComponent(wa.prefill(posterLocRef.current))}`;
  };

  const sayHi = () => {
    track(POSTER_WHATSAPP_CLICKED, {
      campaign: campaign.slug,
      poster_location: posterLocRef.current,
      event_id: selected?.id || campaign.eventId || undefined,
      ...utmRef.current,
    });
  };

  const pickDate = (d: PosterDateOption) => {
    if (d.soldOut) return;
    setSelectedId(d.id);
    track(POSTER_DATE_PICKED, {
      campaign: campaign.slug,
      poster_location: posterLocRef.current,
      event_id: d.id,
      date_label: d.dateLabel,
      ...utmRef.current,
    });
  };

  const book = () => {
    track(POSTER_CTA_CLICKED, {
      campaign: campaign.slug,
      poster_location: posterLocRef.current,
      event_id: selected?.id || campaign.eventId || undefined,
      ...utmRef.current,
    });
    window.location.href = buildAppHandoffUrl({
      eventId: selected?.id || campaign.eventId || undefined,
      tierId: selected?.tier?.id,
      source: "poster",
      utm: utmRef.current,
    });
  };

  // Which entries look "past": everything but the newest; older than 3 back go faint.
  const rendered = entries.slice(-8);
  const questionIdx = beatIdxRef.current;

  // First photo is the lights-on reveal in the hero; the rest stay lower as receipts
  const [heroShot, ...morePhotos] = HOUSE.photos ?? [];

  return (
    <>
      {/* ============ ACT 1 ============ */}
      <div
        className={`${s.stage} ${act === 2 ? s.stageGone : ""} ${shaking ? s.shakeit : ""}`}
        role="dialog"
        aria-label="a conversation with the poster"
        onPointerDown={hurry}
      >
        <div className={s.stageHead}>
          <span className={s.brandlock}>
            <Image src="/logo.png" alt="come offline logo" width={38} height={38} className={s.logo} />
            <span className={s.wordmark}>comeoffline</span>
          </span>
          <span>
            <span className={s.dot} />
            the poster
          </span>
        </div>

        <div className={s.log} aria-live="polite">
          {rendered.map((e, i) => {
            const isLast = i === rendered.length - 1;
            const isFaint = i < rendered.length - 4;
            if (e.kind === "reply") {
              return (
                <div key={`${i}-${e.html}`} className={`${s.reply} ${isLast ? "" : s.replyPast}`}>
                  {e.html}
                </div>
              );
            }
            const still = e.typed >= 0;
            return (
              <p
                key={`${i}-${e.html}`}
                className={`${s.line} ${isLast ? "" : s.past} ${isFaint ? s.faint : ""}`}
              >
                {still ? (
                  <>
                    {plain(e.html).slice(0, e.typed)}
                    <span className={s.caret} />
                  </>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: e.html }} />
                )}
              </p>
            );
          })}
        </div>

        <div className={s.controls}>
          {!hinted && !choices && !reveal && <p className={s.hint}>tap anywhere to hurry it up</p>}
          {choices?.map((c) => (
            <button
              key={c.label}
              className={s.choice}
              onClick={(ev) => {
                ev.stopPropagation();
                pick(c, questionIdx);
              }}
            >
              <span className={s.choiceKey}>{String.fromCharCode(97 + (choices?.indexOf(c) ?? 0))}.</span>
              {c.label}
            </button>
          ))}
          {reveal && (
            <button
              className={s.big}
              onClick={(ev) => {
                ev.stopPropagation();
                lightsOn();
              }}
            >
              {campaign.revealButton}
            </button>
          )}
        </div>
      </div>
      <div className={`${s.bulb} ${bulb ? s.bulbOn : ""}`} aria-hidden="true" />

      {/* ============ ACT 2 ============ */}
      {act === 2 && (
        <>
          <div className={s.topnav}>
            <span className={s.brandlock}>
              <Image src="/logo.png" alt="come offline logo" width={34} height={34} className={s.logo} />
              <span className={s.wordmark}>comeoffline</span>
            </span>
          </div>

          <main className={s.house} ref={houseRef}>
            <div className={s.wrap}>
              <header className={s.hero} data-section="hero">
                {HOUSE.welcome ? (
                  <p className={s.welcome}>{HOUSE.welcome}</p>
                ) : (
                  <p className={s.eyebrow}>{HOUSE.presents}</p>
                )}
                {note ? (
                  <div className={s.note}>
                    <span className={s.tape} />
                    <h1 className={s.noteTitle}>{note.lines[0]}</h1>
                    {note.lines.slice(1).map((line) => (
                      <p key={line} className={s.noteLine} dangerouslySetInnerHTML={{ __html: line }} />
                    ))}
                    <p className={s.noteSign}>{note.signoff}</p>
                  </div>
                ) : (
                  <>
                    <h1>
                      <span className={s.roof}>{HOUSE.emoji}</span>
                      {HOUSE.title}
                    </h1>
                    <span className={s.tag}>{HOUSE.tagline}</span>
                    <p className={s.when}>{HOUSE.when}</p>
                    <p className={s.lede} dangerouslySetInnerHTML={{ __html: HOUSE.lede }} />
                  </>
                )}
                {note?.scribble && <p className={s.scribble}>{note.scribble}</p>}
                {heroShot && (
                  <figure className={`${s.polaroid} ${s.heroShot}`}>
                    <span className={s.tape} />
                    <Image
                      src={heroShot.src}
                      alt={heroShot.alt}
                      width={heroShot.w}
                      height={heroShot.h}
                      className={s.polaroidImg}
                      priority
                    />
                    <figcaption className={s.polaroidCap}>{heroShot.caption}</figcaption>
                  </figure>
                )}
                {note && <p className={s.lede} dangerouslySetInnerHTML={{ __html: HOUSE.lede }} />}
              </header>

              <section className={s.sched} data-section="schedule">
                <h2 className={s.sectionLabel}>how the night actually goes</h2>
                <ol>
                  {HOUSE.schedule.map((row) => (
                    <li key={row.t}>
                      <span className={s.schedT}>{row.t}</span>
                      <span>{row.text}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className={s.rooms} data-section="rooms">
                <h2 className={s.sectionLabel}>the house, room by room</h2>
                {HOUSE.rooms.map((room) => (
                  <article key={room.name} className={s.card}>
                    <span className={s.tape} />
                    <h3>
                      <span className={s.cardEmoji}>{room.emoji}</span>
                      {room.name}
                    </h3>
                    <p>{room.desc}</p>
                  </article>
                ))}
              </section>

              <section className={s.solo} data-section="solo">
                <p dangerouslySetInnerHTML={{ __html: HOUSE.soloQ }} />
                <p className={s.soloAns}>{HOUSE.soloA}</p>
              </section>

              {morePhotos.length > 0 && (
                <section className={s.photos} data-section="photos">
                  <h2 className={s.sectionLabel}>the place, for the record</h2>
                  {morePhotos.map((photo) => (
                    <figure key={photo.src} className={s.polaroid}>
                      <span className={s.tape} />
                      <Image src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} className={s.polaroidImg} />
                      <figcaption className={s.polaroidCap}>{photo.caption}</figcaption>
                    </figure>
                  ))}
                </section>
              )}

              <section className={s.nota} data-section="not_a_meetup">
                <p className={s.crossed}>
                  {HOUSE.notA.map((word) => (
                    <s key={word}>{word}</s>
                  ))}
                </p>
                <p className={s.truth}>{HOUSE.truth}</p>
                <p className={s.worst}>{HOUSE.worstCase}</p>
              </section>

              {campaign.whatsapp && (
                <section className={s.wa} data-section="whatsapp">
                  <p className={s.waPrompt}>{campaign.whatsapp.prompt}</p>
                  <a
                    className={s.waBtn}
                    href={whatsappHref()}
                    onClick={sayHi}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    💬 {campaign.whatsapp.button}
                  </a>
                  {campaign.whatsapp.note && <p className={s.waNote}>{campaign.whatsapp.note}</p>}
                </section>
              )}

              <section className={s.incl} data-section="includes">
                <h2 className={s.sectionLabel}>your spot covers</h2>
                <ul>
                  {HOUSE.includes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <dl className={s.fine}>
                  {HOUSE.finePrint.map((row) => (
                    <div key={row.k}>
                      <dt>{row.k}</dt>
                      <dd>{row.v}</dd>
                    </div>
                  ))}
                  <div className={s.fineNote}>{HOUSE.fineNote}</div>
                </dl>
              </section>

              {multiDate && (
                <section className={s.dates} data-section="dates">
                  <h2 className={s.sectionLabel}>{HOUSE.datesTitle ?? "pick your date"}</h2>
                  {HOUSE.datesHint && <p className={s.datesHint}>{HOUSE.datesHint}</p>}
                  <div className={s.dateList}>
                    {dates.map((d) => (
                      <button
                        key={d.id}
                        className={`${s.dateCard} ${d.id === selectedId ? s.dateCardOn : ""} ${d.soldOut ? s.dateCardSold : ""}`}
                        onClick={() => pickDate(d)}
                        disabled={d.soldOut}
                        aria-pressed={d.id === selectedId}
                      >
                        <span className={s.dateWhen}>{d.dateLabel}</span>
                        <span className={s.dateMeta}>
                          {d.soldOut
                            ? "house full"
                            : [d.tier ? `₹${d.tier.price}` : null, d.spotsLeft > 0 ? `${d.spotsLeft} spots left` : null]
                                .filter(Boolean)
                                .join(" · ")}
                        </span>
                        <span className={s.dateTick} aria-hidden="true">
                          {d.id === selectedId ? "✓" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {selected && selected.spotsLeft > 0 && (
                <section className={s.proof} data-section="spots_left">
                  <div className={s.proofNum}>{selected.spotsLeft}</div>
                  <p>spots left in the house{multiDate && selected.dateLabel ? ` on ${selected.dateLabel.split(" · ")[0]}` : ""}.</p>
                  <p className={s.proofSub}>capped at {selected.totalSpots} so it stays a house party.</p>
                </section>
              )}

              <footer className={s.foot} data-section="footer">
                <Image src="/logo.png" alt="come offline logo" width={56} height={56} className={s.footLogo} />
                <p className={s.brand}>comeoffline</p>
                <p className={s.footTag}>{HOUSE.footTagline}</p>
                <p>{HOUSE.footNote}</p>
              </footer>
            </div>
          </main>

          <div className={s.ctabar}>
            <div className={s.ctaInner}>
              <div className={s.ctaWhen}>
                <b>
                  {HOUSE.title} {HOUSE.emoji}
                </b>
                {[
                  selected?.dateLabel || HOUSE.ctaWhen,
                  selected?.tier ? `₹${selected.tier.price}` : null,
                  selected && selected.spotsLeft > 0 ? `${selected.spotsLeft} left` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <button className={s.bookBtn} onClick={book}>
                {HOUSE.cta}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
