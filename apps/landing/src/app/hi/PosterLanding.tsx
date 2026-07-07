"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  useAnalytics,
  POSTER_SCANNED,
  POSTER_CHOICE_MADE,
  POSTER_LIGHTS_ON,
  POSTER_CTA_CLICKED,
} from "@comeoffline/analytics";
import { buildAppHandoffUrl } from "@/lib/handoff";
import {
  POSTER_EVENT_ID,
  POSTER_LOCATIONS,
  timeLine,
  buildScript,
  REVEAL_BUTTON,
  HOUSE,
  type PosterBeat,
  type PosterChoice,
} from "@/lib/posterCampaign";
import s from "./poster.module.css";

export interface PosterEventInfo {
  id: string;
  spotsLeft: number;
  totalSpots: number;
  /** The single live tier, when there's exactly one — preselected in the handoff */
  tier: { id: string; label: string; price: number } | null;
}

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

export function PosterLanding({ event }: { event: PosterEventInfo | null }) {
  const params = useSearchParams();
  const { track } = useAnalytics();

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
      utm_campaign: params?.get("utm_campaign") || "friends-house",
      utm_content: params?.get("utm_content") || p || undefined,
    };
    utmRef.current = utm;

    track(POSTER_SCANNED, { poster_location: p, event_id: event?.id, ...utm });

    const locLine = p ? POSTER_LOCATIONS[p] || null : null;
    scriptRef.current = buildScript(locLine, timeLine(new Date().getHours()));
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

  const hurry = () => {
    setHinted(true);
    finishRef.current?.();
  };

  const pick = (choice: PosterChoice, questionIdx: number) => {
    setChoices(null);
    setEntries((prev) => [...prev.map((e) => ({ ...e, typed: -1 })), { kind: "reply", html: choice.label, typed: -1 }]);
    track(POSTER_CHOICE_MADE, {
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
    track(POSTER_LIGHTS_ON, { poster_location: posterLocRef.current, event_id: event?.id });
    if (!reducedRef.current) setBulb(true);
    setTimeout(
      () => {
        setAct(2);
        window.scrollTo(0, 0);
      },
      reducedRef.current ? 50 : 520
    );
  };

  const book = () => {
    track(POSTER_CTA_CLICKED, {
      poster_location: posterLocRef.current,
      event_id: event?.id || POSTER_EVENT_ID || undefined,
      ...utmRef.current,
    });
    window.location.href = buildAppHandoffUrl({
      eventId: event?.id || POSTER_EVENT_ID || undefined,
      tierId: event?.tier?.id,
      source: "poster",
      utm: utmRef.current,
    });
  };

  // Which entries look "past": everything but the newest; older than 3 back go faint.
  const rendered = entries.slice(-8);
  const questionIdx = beatIdxRef.current;

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
              {REVEAL_BUTTON} 🏠
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

          <main className={s.house}>
            <div className={s.wrap}>
              <header className={s.hero}>
                <p className={s.eyebrow}>{HOUSE.presents}</p>
                <h1>
                  <span className={s.roof}>{HOUSE.emoji}</span>
                  {HOUSE.title}
                </h1>
                <span className={s.tag}>{HOUSE.tagline}</span>
                <p className={s.when}>{HOUSE.when}</p>
                <p className={s.lede} dangerouslySetInnerHTML={{ __html: HOUSE.lede }} />
              </header>

              <section className={s.sched}>
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

              <section className={s.rooms}>
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

              <section className={s.solo}>
                <p dangerouslySetInnerHTML={{ __html: HOUSE.soloQ }} />
                <p className={s.soloAns}>{HOUSE.soloA}</p>
              </section>

              <section className={s.incl}>
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

              <section className={s.nota}>
                <p className={s.crossed}>
                  {HOUSE.notA.map((word) => (
                    <s key={word}>{word}</s>
                  ))}
                </p>
                <p className={s.truth}>{HOUSE.truth}</p>
                <p className={s.worst}>{HOUSE.worstCase}</p>
              </section>

              {event && event.spotsLeft > 0 && (
                <section className={s.proof}>
                  <div className={s.proofNum}>{event.spotsLeft}</div>
                  <p>spots left in the house.</p>
                  <p className={s.proofSub}>capped at {event.totalSpots} so it stays a house party.</p>
                </section>
              )}

              <footer className={s.foot}>
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
                  HOUSE.ctaWhen,
                  event?.tier ? `₹${event.tier.price}` : null,
                  event && event.spotsLeft > 0 ? `${event.spotsLeft} left` : null,
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
