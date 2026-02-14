import React, { useState, useEffect, useRef } from "react";

const P = {
  cream: "#FAF6F0", warmWhite: "#F5EFE6", sand: "#E8DDD0",
  caramel: "#D4A574", deepCaramel: "#B8845A", terracotta: "#C4704D",
  warmBrown: "#8B6F5A", darkBrown: "#3D2E22", nearBlack: "#1A1715",
  softBlack: "#2C2520", muted: "#9B8E82", coral: "#D4836B",
  sage: "#A8B5A0", lavender: "#B8A9C9", blush: "#DBBCAC",
  gateBlack: "#0E0D0B", gateDark: "#161412",
};

const GLITCH_CHARS = "!@#$%^&*_+=~?░▒▓█▄▀÷×±∞≠≈∆∂∑∏";

const SYSTEM_PROMPT = `You are the chatbot for "Come Offline" — an invite-only community in Bangalore that throws curated IRL events for Gen Z and millennials.

YOUR PERSONALITY:
- Witty gen-z friend, not a corporate bot
- Cheeky, a little unhinged, but warm underneath
- Short messages. punchy. lowercase energy. occasional caps for EMPHASIS
- You use "bestie", "lowkey", "ngl", "fr" naturally but sparingly
- Protective of the community — not everyone gets in
- Funny but never mean

ABOUT COME OFFLINE:
- Invite-only community, curated real-life events in Bangalore
- Core belief: best connections happen face-to-face
- Every person vouched for by member OR proved interesting enough
- We handle EVERYTHING — pickup, drop, food, drinks
- Venue revealed 10 days before (surprise golden ticket moment)
- Events: galentines, house parties, themed nights, holi celebrations
- Some events phone-free, some aren't — depends on vibe
- Not anti-technology. Pro-real-connection.
- Est. 2026, Bangalore

HOW TO GET IN:
1. Vouch/invite code from existing member = fast-tracked
2. No code = "prove yourself" — personality questions, instagram, pitch
3. After attending, members earn 2-3 vouch codes

CURRENT EVENTS:
- Galentines (Feb 14) — women-only, mimosas, nail bar, yapping room. SOLD OUT.
- No Phone House Party (Mar 8) — vinyl, board games, dance floor, phones locked. 28 spots.
- No Color Holi (Mar 14) — all-white, foam party, thandai bar. 45 spots.

RSVP: Make it conversational. Check if member/new. If new, code or prove yourself path. For prove yourself: ask 2-3 fun personality questions. Get name + instagram. Confirm with excitement.

RULES: Never boring. Short responses (2-4 sentences). Keep exclusive but welcoming energy. Emojis sparingly (1-2 max per message).`;

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

      * { -webkit-font-smoothing: antialiased; box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      ::-webkit-scrollbar { width: 0; display: none; }
      input::placeholder, textarea::placeholder { color: ${P.muted}50; }

      @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
      @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes dotPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      @keyframes chatSlideIn { from { opacity: 0; transform: translateY(100%) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes bounceIn { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      @keyframes stickerDrop { 0% { transform: scale(0) rotate(-20deg); } 60% { transform: scale(1.1) rotate(4deg); } 100% { transform: scale(1) rotate(var(--r, -3deg)); } }
      @keyframes lineReveal { from { width: 0; } to { width: 100%; } }
      @keyframes stampIn { 0% { transform: scale(3) rotate(-10deg); opacity: 0; } 50% { transform: scale(0.9) rotate(2deg); opacity: 1; } 100% { transform: scale(1) rotate(var(--r, -2deg)); opacity: 1; } }
      @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes wiggle { 0%,100%{transform:rotate(var(--r,-3deg))}50%{transform:rotate(calc(var(--r,-3deg) + 2deg))} }
      @keyframes numberCount { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  );
}

/* ═══════════════════════════════════════════
   SCROLL HOOK
   ═══════════════════════════════════════════ */
function useInView(opts = {}) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); ob.unobserve(el); } }, { threshold: opts.threshold || 0.12, rootMargin: "0px 0px -30px 0px" });
    ob.observe(el); return () => ob.disconnect();
  }, []);
  return [ref, vis];
}

/* ═══════════════════════════════════════════
   GLITCH TEXT COMPONENT
   ═══════════════════════════════════════════ */
function GlitchText({ texts, interval = 3000, style = {} }) {
  const [idx, setIdx] = useState(0);
  const [display, setDisplay] = useState(texts[0]);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setGlitching(true);
      let c = 0;
      const target = texts[(idx + 1) % texts.length];
      const gi = setInterval(() => {
        c++;
        if (c < 6) {
          setDisplay(target.split("").map((ch) =>
            ch === " " ? " " : Math.random() > 0.35 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : ch
          ).join(""));
        } else {
          const reveal = Math.floor(((c - 6) / 8) * target.length);
          setDisplay(target.split("").map((ch, i) =>
            i < reveal ? ch : ch === " " ? " " : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
          ).join(""));
        }
        if (c >= 14) {
          clearInterval(gi); setDisplay(target); setGlitching(false);
          setIdx((p) => (p + 1) % texts.length);
        }
      }, 50);
    }, interval);
    return () => clearInterval(iv);
  }, [idx, texts, interval]);

  return (
    <span style={{ position: "relative", ...style }}>
      <span style={{ color: glitching ? P.terracotta : "inherit", transition: "color 0.15s" }}>{display}</span>
      {glitching && (
        <React.Fragment>
          <span style={{ position: "absolute", left: "-1.5px", top: 0, color: P.terracotta, opacity: 0.5, clipPath: "inset(15% 0 55% 0)", pointerEvents: "none" }} aria-hidden="true">{display}</span>
          <span style={{ position: "absolute", left: "1.5px", top: 0, color: P.caramel, opacity: 0.35, clipPath: "inset(50% 0 15% 0)", pointerEvents: "none" }} aria-hidden="true">{display}</span>
        </React.Fragment>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════
   STICKER BADGE
   ═══════════════════════════════════════════ */
function Sticker({ text, rotation = -3, color = P.caramel, top, right, left, bottom, delay = 0, visible = true }) {
  return (
    <div style={{
      position: "absolute", top, right, left, bottom,
      fontFamily: "'Caveat', cursive", fontSize: "14px", fontWeight: 600,
      color: P.gateBlack, background: color, padding: "6px 14px",
      borderRadius: "4px", whiteSpace: "nowrap", zIndex: 10,
      "--r": `${rotation}deg`,
      transform: visible ? `scale(1) rotate(${rotation}deg)` : "scale(0) rotate(-20deg)",
      transition: `transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      boxShadow: "0 2px 8px rgba(26,23,21,0.15)",
    }}>{text}</div>
  );
}

/* ═══════════════════════════════════════════
   HANDWRITTEN NOTE
   ═══════════════════════════════════════════ */
function HandNote({ children, rotation = -2, style = {} }) {
  return (
    <span style={{
      fontFamily: "'Caveat', cursive", fontSize: "16px", color: P.caramel,
      display: "inline-block", transform: `rotate(${rotation}deg)`,
      ...style,
    }}>{children}</span>
  );
}

/* ═══════════════════════════════════════════
   HERO — EDITORIAL SPLIT
   ═══════════════════════════════════════════ */
function Hero({ onOpenChat }) {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState("");
  const tag = "your wifi can't reach here.";

  useEffect(() => {
    setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => { setTyped(tag.slice(0, i + 1)); i++; if (i >= tag.length) { clearInterval(iv); setTimeout(() => setPhase(1), 500); } }, 40);
    }, 500);
  }, []);

  return (
    <section style={{ minHeight: "100vh", background: P.gateBlack, position: "relative", overflow: "hidden" }}>
      {/* Giant background text */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(120px, 25vw, 220px)",
        fontWeight: 400, color: P.muted + "06", whiteSpace: "nowrap", pointerEvents: "none",
        letterSpacing: "-8px", userSelect: "none",
      }}>offline</div>

      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 28px 60px" }}>
        {/* Top bar */}
        <div style={{
          position: "absolute", top: "24px", left: "28px", right: "28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          animation: "fadeIn 0.8s ease 0.2s both",
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "40", letterSpacing: "3px", textTransform: "uppercase" }}>est. 2026</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "40", letterSpacing: "3px", textTransform: "uppercase" }}>bangalore</span>
        </div>

        {/* Main title — huge, left-aligned */}
        <div style={{ animation: "fadeSlideUp 1s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "clamp(56px, 14vw, 90px)", fontWeight: 400,
            color: P.cream, letterSpacing: "-3px", lineHeight: 0.9,
            margin: "0 0 4px",
          }}>come</h1>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "clamp(56px, 14vw, 90px)", fontWeight: 400,
            color: P.cream, letterSpacing: "-3px", lineHeight: 0.9,
            fontStyle: "italic",
          }}>offline.</h1>
        </div>

        {/* Divider line */}
        <div style={{
          width: phase >= 1 ? "80px" : "0px", height: "2px",
          background: P.caramel, margin: "32px 0 24px",
          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s",
        }} />

        {/* Tagline — typewriter */}
        <div style={{ minHeight: "30px", marginBottom: "20px" }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(17px, 3.5vw, 21px)",
            color: P.muted, fontStyle: "italic",
          }}>
            {typed}
            {typed.length < tag.length && <span style={{ display: "inline-block", width: "2px", height: "18px", background: P.caramel, marginLeft: "2px", verticalAlign: "middle", animation: "blink 0.8s step-end infinite" }} />}
          </p>
        </div>

        {/* Sub copy */}
        {phase >= 1 && (
          <div style={{ animation: "fadeSlideUp 0.7s ease both", maxWidth: "380px" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted + "60", lineHeight: 1.8, marginBottom: "36px" }}>
              an invite-only community for people who still believe the best things happen when you put your phone down. curated people. unfiltered experiences.
            </p>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={onOpenChat} style={{
                padding: "16px 36px", borderRadius: "100px", border: "none",
                background: P.cream, color: P.gateBlack,
                fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500,
                cursor: "pointer", transition: "all 0.3s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(212,165,116,0.15)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >{"talk to us \u2192"}</button>
              <HandNote rotation={3} style={{ marginLeft: "4px", fontSize: "14px", color: P.caramel + "70" }}>{"\u2190"} no forms, just vibes</HandNote>
            </div>
          </div>
        )}

        {/* Stickers */}
        <Sticker text="invite only" rotation={-4} color={P.caramel} top="18%" right="20px" visible={phase >= 1} delay={0.3} />
        <Sticker text="phones optional *" rotation={3} color={P.blush} bottom="22%" right="24px" visible={phase >= 1} delay={0.5} />
      </div>

      {/* Scroll hint */}
      {phase >= 1 && (
        <div style={{ position: "absolute", bottom: "28px", left: "50%", transform: "translateX(-50%)", textAlign: "center", animation: "fadeIn 0.8s ease 1.5s both" }}>
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.muted + "30" }}>scroll if you're curious</span>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════
   MARQUEE — WARM SECTION
   ═══════════════════════════════════════════ */
function MarqueeSection() {
  const [ref, vis] = useInView();
  const words = "curated people \u00B7 real connections \u00B7 no randos \u00B7 just vibes \u00B7 bangalore nights \u00B7 invite only \u00B7 earn your way in \u00B7 ";
  return (
    <div ref={ref} style={{
      overflow: "hidden", padding: "18px 0",
      background: P.cream, opacity: vis ? 1 : 0, transition: "opacity 0.5s",
    }}>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: vis ? "marquee 22s linear infinite" : "none" }}>
        {[0, 1].map((i) => <span key={i} style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(16px, 3vw, 22px)", color: P.nearBlack + "20", fontStyle: "italic" }}>{words}{words}</span>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WHAT WE DO — CREAM BG, EDITORIAL LAYOUT
   ═══════════════════════════════════════════ */
function WhatWeDo() {
  const [ref, vis] = useInView();

  return (
    <section ref={ref} style={{ background: P.cream, padding: "80px 28px", position: "relative", overflow: "hidden" }}>
      {/* Big decorative number */}
      <div style={{ position: "absolute", top: "-20px", right: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(150px, 30vw, 240px)", fontWeight: 400, color: P.nearBlack + "04", lineHeight: 1, pointerEvents: "none" }}>01</div>

      <div style={{ maxWidth: "500px", position: "relative", zIndex: 2 }}>
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-30px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, display: "block", marginBottom: "16px" }}>what we do</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.15, letterSpacing: "-1px", margin: "0 0 8px" }}>
            we throw events for{" "}
            <GlitchText
              texts={["people worth meeting.", "your future best friends.", "certified good vibes.", "interesting humans only."]}
              interval={3500}
              style={{ fontStyle: "italic" }}
            />
          </h2>
        </div>

        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s ease 0.2s" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.8, margin: "24px 0" }}>
            not networking events. not club nights. curated experiences where every single person was either vouched for or proved they deserve to be there.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.8 }}>
            think galentines brunches, house parties, themed nights, holi celebrations — except everyone there is actually interesting.
          </p>
        </div>

        {/* Handwritten annotation */}
        <div style={{ marginTop: "28px", opacity: vis ? 1 : 0, transition: "opacity 0.5s ease 0.5s" }}>
          <HandNote rotation={-1.5} style={{ fontSize: "15px" }}>^ the bar is high. we like it that way.</HandNote>
        </div>
      </div>

      <Sticker text="no boring people" rotation={5} color={P.sage} top="24px" right="20px" visible={vis} delay={0.4} />
    </section>
  );
}

/* ═══════════════════════════════════════════
   WE HANDLE EVERYTHING — DARK BG
   ═══════════════════════════════════════════ */
function WeHandle() {
  const [ref, vis] = useInView();
  const perks = [
    { icon: "\u{1F697}", text: "pickup & drop", sub: "we come get you. we take you home." },
    { icon: "\u{1F37D}\uFE0F", text: "food & drinks", sub: "sorted. all of it. every time." },
    { icon: "\u{1F3B6}", text: "the whole vibe", sub: "music, decor, energy — immaculate." },
    { icon: "\u2728", text: "the curation", sub: "every person there? handpicked." },
  ];

  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "80px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20px", left: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(150px, 30vw, 240px)", fontWeight: 400, color: P.cream + "03", lineHeight: 1, pointerEvents: "none" }}>02</div>

      <div style={{ maxWidth: "500px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "right", opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(30px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted + "60", display: "block", marginBottom: "16px" }}>the experience</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(26px, 5.5vw, 36px)", fontWeight: 400, color: P.cream, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
            we handle the{" "}
            <GlitchText
              texts={["boring stuff.", "logistics.", "adulting.", "everything."]}
              interval={3000}
              style={{ fontStyle: "italic", color: P.caramel }}
            />
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.8, marginTop: "16px" }}>
            all you have to do is show up and try not to have too much fun. (impossible, but try.)
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "36px" }}>
          {perks.map((p, i) => (
            <div key={i} style={{
              background: P.muted + "08", borderRadius: "16px", padding: "20px 16px",
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.1}s`,
            }}>
              <span style={{ fontSize: "24px", display: "block", marginBottom: "10px" }}>{p.icon}</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: P.cream, margin: "0 0 4px" }}>{p.text}</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted + "60", margin: 0 }}>{p.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <Sticker text="you literally just show up" rotation={-3} color={P.caramel} bottom="28px" right="16px" visible={vis} delay={0.6} />
    </section>
  );
}

/* ═══════════════════════════════════════════
   THE GOLDEN TICKET — CREAM BG
   ═══════════════════════════════════════════ */
function GoldenTicket() {
  const [ref, vis] = useInView();

  return (
    <section ref={ref} style={{ background: P.cream, padding: "80px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20px", right: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(150px, 30vw, 240px)", fontWeight: 400, color: P.nearBlack + "04", lineHeight: 1, pointerEvents: "none" }}>03</div>

      <div style={{ maxWidth: "500px", position: "relative", zIndex: 2 }}>
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-30px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, display: "block", marginBottom: "16px" }}>the golden ticket</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(26px, 5.5vw, 36px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
            the venue is a secret. <span style={{ fontStyle: "italic" }}>that's the whole point.</span>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.8, marginTop: "16px" }}>
            RSVP and you won't know where the event is. 10 days before, you scratch open a golden ticket to reveal the location. extra? absolutely. boring? never.
          </p>
        </div>

        {/* Mini golden ticket preview */}
        <div style={{
          marginTop: "32px", background: "linear-gradient(135deg, #FFF8F0, #FFF)", borderRadius: "16px",
          padding: "24px", border: `1.5px solid ${P.caramel}20`, position: "relative",
          opacity: vis ? 1 : 0, transform: vis ? "translateY(0) rotate(0deg)" : "translateY(24px) rotate(-2deg)",
          transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s",
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "3px", color: P.caramel, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "16px", height: "1px", background: P.caramel }} />golden ticket<span style={{ width: "16px", height: "1px", background: P.caramel }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: P.nearBlack, margin: "0 0 4px" }}>The Courtyard</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted }}>Indiranagar, Bangalore</p>
            </div>
            <div style={{
              width: "50px", height: "50px", borderRadius: "12px",
              background: `linear-gradient(135deg, ${P.caramel}30, ${P.deepCaramel}30)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px",
            }}>{"\u{1F4CD}"}</div>
          </div>
          <HandNote rotation={2} style={{ position: "absolute", bottom: "-16px", right: "16px", fontSize: "13px" }}>screenshot-worthy moment {"\u{1F4F8}"}</HandNote>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   STATS — FULL WIDTH DARK STRIPE
   ═══════════════════════════════════════════ */
function StatsStripe() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "40px 28px", borderTop: `1px solid ${P.muted}10`, borderBottom: `1px solid ${P.muted}10` }}>
      <div style={{ maxWidth: "500px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
        {[
          { num: "200+", label: "came offline" },
          { num: "0", label: "regrets" },
          { num: "100%", label: "came back" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center", flex: "1 1 80px", opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: `all 0.5s ease ${i * 0.1}s` }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(28px, 6vw, 36px)", fontWeight: 500, color: P.cream, lineHeight: 1, marginBottom: "6px", overflow: "hidden" }}>
              <span style={{ display: "inline-block", animation: vis ? `numberCount 0.5s ease ${0.1 + i * 0.12}s both` : "none" }}>{s.num}</span>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: P.muted + "60" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   OVERHEARD — CREAM BG, EDITORIAL
   ═══════════════════════════════════════════ */
function Overheard() {
  const [ref, vis] = useInView();
  const quotes = [
    { text: "i haven't laughed this hard since 2019", from: "galentines, 7:42 PM", accent: P.blush },
    { text: "wait this is what parties used to feel like??", from: "house party, 9:15 PM", accent: P.caramel },
    { text: "i just talked to a stranger for 2 hours and it wasn't weird at all", from: "galentines, 8:30 PM", accent: P.sage },
    { text: "my cheeks hurt from smiling. is that a thing?", from: "everyone, always", accent: P.lavender },
  ];

  return (
    <section ref={ref} style={{ background: P.cream, padding: "80px 28px", position: "relative" }}>
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "36px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: "28px", color: P.nearBlack }}>overheard at our events</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted }}>real quotes, no cap</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {quotes.map((q, i) => (
            <div key={i} style={{
              padding: "24px 20px", borderRadius: "16px",
              background: "#fff", borderLeft: `4px solid ${q.accent}`,
              boxShadow: "0 1px 4px rgba(26,23,21,0.04)",
              opacity: vis ? 1 : 0,
              transform: vis ? "translateX(0)" : `translateX(${i % 2 === 0 ? "-20" : "20"}px)`,
              transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
            }}>
              <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "19px", color: P.nearBlack, margin: "0 0 10px", lineHeight: 1.35, fontStyle: "italic" }}>"{q.text}"</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted, margin: 0 }}>{"\u2014"} {q.from}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   BIG STATEMENT — DARK, CENTERED
   ═══════════════════════════════════════════ */
function BigStatement() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "100px 28px", textAlign: "center", position: "relative" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "scale(1)" : "scale(0.94)", transition: "all 1s cubic-bezier(0.16,1,0.3,1)" }}>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 36px)", fontWeight: 400, color: P.cream, lineHeight: 1.3 }}>
          we're not{" "}
          <GlitchText
            texts={["anti-technology.", "anti-social media.", "anti-fun.", "anti-anything."]}
            interval={2800}
            style={{ fontStyle: "italic" }}
          />
        </p>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 36px)", fontWeight: 400, color: P.caramel, lineHeight: 1.3, marginTop: "8px" }}>
          we're pro-"remember what it feels like to be in a room full of interesting people."
        </p>
        <div style={{ marginTop: "28px" }}>
          <HandNote rotation={1} style={{ fontSize: "14px", color: P.muted + "50" }}>yeah the tagline needs work. the events don't.</HandNote>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   TWO WAYS IN — CREAM BG
   ═══════════════════════════════════════════ */
function TwoWaysIn({ onOpenChat }) {
  const [ref, vis] = useInView();

  return (
    <section ref={ref} style={{ background: P.cream, padding: "80px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20px", right: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(150px, 30vw, 240px)", fontWeight: 400, color: P.nearBlack + "04", lineHeight: 1, pointerEvents: "none" }}>in</div>

      <div style={{ maxWidth: "500px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ marginBottom: "32px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>two paths</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(26px, 5.5vw, 34px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.2, margin: "12px 0 0" }}>how to get past the bouncer</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Path 1 — Vouch */}
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "28px 24px",
            boxShadow: "0 2px 12px rgba(26,23,21,0.04)", position: "relative",
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "28px" }}>{"\u{1F39F}\uFE0F"}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#fff", background: P.nearBlack, padding: "5px 12px", borderRadius: "100px" }}>fast track</span>
            </div>
            <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: P.nearBlack, margin: "0 0 8px" }}>someone vouches for you</h4>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, lineHeight: 1.6, margin: 0 }}>
              an existing member gives you their invite code. they're putting their reputation on the line by saying you're worth meeting.
            </p>
          </div>

          {/* Divider */}
          <div style={{ textAlign: "center", padding: "4px 0" }}>
            <HandNote rotation={0} style={{ fontSize: "18px", color: P.muted }}>or...</HandNote>
          </div>

          {/* Path 2 — Prove yourself */}
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "28px 24px",
            boxShadow: "0 2px 12px rgba(26,23,21,0.04)", position: "relative",
            border: `2px dashed ${P.caramel}30`,
            opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "28px" }}>{"\u{1F3A4}"}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.caramel, background: P.caramel + "15", padding: "5px 12px", borderRadius: "100px" }}>earn it</span>
            </div>
            <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: P.nearBlack, margin: "0 0 8px" }}>prove you're interesting</h4>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, lineHeight: 1.6, margin: 0 }}>
              no code? no problem. chat with our bot, answer some personality questions, show us your vibe. if you pass the vibe check, you're in.
            </p>
            <Sticker text="don't know anyone? we got you" rotation={-2} color={P.sage} bottom="-14px" right="12px" visible={vis} delay={0.5} />
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "40px", opacity: vis ? 1 : 0, transition: "opacity 0.5s ease 0.5s" }}>
          <button onClick={onOpenChat} style={{
            padding: "16px 36px", borderRadius: "100px",
            border: `2px solid ${P.nearBlack}`, background: "transparent",
            color: P.nearBlack, fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px", fontWeight: 500, cursor: "pointer", transition: "all 0.3s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = P.nearBlack; e.currentTarget.style.color = P.cream; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.nearBlack; }}
          >{"start the vibe check \u2192"}</button>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.muted, marginTop: "12px" }}>warning: our bot has strong opinions</p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   EVENTS — DARK BG
   ═══════════════════════════════════════════ */
function Events() {
  const [ref, vis] = useInView();
  const events = [
    { title: "Galentines", emoji: "\u{1F485}", tag: "women only", status: "sold out", accent: P.blush, isSoldOut: true },
    { title: "No Phone House Party", emoji: "\u{1F4F5}", tag: "phone-free", status: "28 spots left", accent: P.caramel, isSoldOut: false },
    { title: "No Color Holi", emoji: "\u{1F90D}", tag: "all white", status: "45 spots left", accent: P.sage, isSoldOut: false },
  ];
  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "80px 28px" }}>
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "28px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "24px", fontWeight: 400, color: P.cream }}>events you're missing</h3>
          <HandNote rotation={2} style={{ fontSize: "13px", color: P.muted + "50" }}>fomo is valid</HandNote>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {events.map((e, i) => (
            <div key={i} style={{
              background: P.muted + "06", borderRadius: "16px", padding: "20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-20px)",
              transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ fontSize: "26px" }}>{e.emoji}</span>
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: P.cream, margin: "0 0 4px" }}>{e.title}</p>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: e.accent, background: e.accent + "18", padding: "2px 8px", borderRadius: "100px" }}>{e.tag}</span>
                </div>
              </div>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: "10px",
                color: e.isSoldOut ? P.terracotta : P.sage,
                background: e.isSoldOut ? P.terracotta + "12" : P.sage + "12",
                padding: "4px 10px", borderRadius: "100px", whiteSpace: "nowrap",
              }}>{e.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FINAL CTA — CREAM BG
   ═══════════════════════════════════════════ */
function FinalCTA({ onOpenChat }) {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.cream, padding: "80px 28px 60px", textAlign: "center", position: "relative" }}>
      <div style={{ maxWidth: "380px", margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.3, marginBottom: "8px" }}>
          still scrolling?
        </p>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.3, marginBottom: "8px" }}>
          that's either curiosity or FOMO.
        </p>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 400, lineHeight: 1.3, marginBottom: "28px" }}>
          <span style={{ color: P.caramel, fontStyle: "italic" }}>either way, we like you already.</span>
        </p>
        <button onClick={onOpenChat} style={{
          padding: "20px 48px", borderRadius: "100px", border: "none",
          background: P.nearBlack, color: P.cream,
          fontFamily: "'DM Sans', sans-serif", fontSize: "17px", fontWeight: 500,
          cursor: "pointer", transition: "all 0.3s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(26,23,21,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >{"let's talk \u2192"}</button>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", color: P.muted, marginTop: "16px" }}>our chatbot is funnier than this page, promise</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FOOTER — DARK
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ background: P.gateBlack, padding: "40px 28px 56px", textAlign: "center" }}>
      <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "18px", color: P.muted + "25", marginBottom: "12px" }}>come offline</p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted + "25", marginBottom: "6px" }}>@comeoffline.blr</p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "15", letterSpacing: "2px" }}>est. 2026 {"\u00B7"} bangalore {"\u00B7"} invite only (mostly)</p>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   CHATBOT (same as v2)
   ═══════════════════════════════════════════ */
function ChatBot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const endRef = useRef(null);
  const convRef = useRef([]);

  const scroll = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        add("hey. welcome to the other side of the internet. \u{1F30D}");
        setTimeout(() => {
          add("i'm the come offline bot. part bouncer, part concierge, part hype person. what brings you here?");
          setQuickReplies(["what is this?", "i want to RSVP", "i have a code", "convince me"]);
        }, 700);
      }, 400);
    }
  }, [isOpen]);

  const add = (text) => { setMessages((p) => [...p, { role: "bot", text, id: Date.now() + Math.random() }]); scroll(); };

  const send = async (text) => {
    if (!text.trim()) return;
    const t = text.trim(); setInput(""); setQuickReplies([]);
    setMessages((p) => [...p, { role: "user", text: t, id: Date.now() }]); scroll();
    convRef.current.push({ role: "user", content: t });
    setIsLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM_PROMPT, messages: convRef.current }),
      });
      const data = await res.json();
      const reply = data.content?.map((b) => b.type === "text" ? b.text : "").join("") || "hmm something broke. try again?";
      convRef.current.push({ role: "assistant", content: reply });
      const lines = reply.split("\n").filter((l) => l.trim());
      for (let i = 0; i < lines.length; i++) { await new Promise((r) => setTimeout(r, i * 350)); add(lines[i]); }
      genQR(reply);
    } catch { add("oops, my brain glitched. say that again?"); }
    setIsLoading(false);
  };

  const genQR = (reply) => {
    const l = reply.toLowerCase();
    if (l.includes("what brings") || l.includes("what can i help")) setQuickReplies(["tell me more", "i want to RSVP", "what events?"]);
    else if (l.includes("which event") || l.includes("rsvp")) setQuickReplies(["No Phone House Party", "No Color Holi", "what's available?"]);
    else if (l.includes("code") || l.includes("vouch")) setQuickReplies(["i don't have one", "how do i get one?"]);
    else if (l.includes("personality") || l.includes("question") || l.includes("prove")) setQuickReplies(["let's do it", "is this a test?"]);
    else if (l.includes("confirmed") || l.includes("you're in") || l.includes("welcome")) setQuickReplies(["LET'S GOOO", "what should i wear?"]);
    else if (l.includes("event") || l.includes("party") || l.includes("holi")) setQuickReplies(["sounds fun!", "how do i RSVP?"]);
    else setQuickReplies(["tell me about events", "how does this work?", "i want in"]);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease both" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,9,7,0.6)", backdropFilter: "blur(8px)" }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: "430px", height: "85vh", maxHeight: "700px",
        background: P.gateBlack, borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column",
        overflow: "hidden", animation: "chatSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
        border: `1px solid ${P.muted}15`, borderBottom: "none",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${P.muted}12`, background: P.gateDark }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `linear-gradient(135deg, ${P.caramel}30, ${P.deepCaramel}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", border: `1.5px solid ${P.caramel}25` }}>{"\u{1F30D}"}</div>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: P.cream, margin: 0 }}>come offline</p>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: P.sage, animation: "pulse 2s ease infinite" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.sage }}>always online (ironic, we know)</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: P.muted + "15", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: P.muted, fontSize: "16px" }}>{"\u2715"}</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
              <div style={{
                maxWidth: "80%", padding: "12px 16px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user" ? P.cream : P.muted + "12",
                color: msg.role === "user" ? P.gateBlack : P.cream,
                fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.5,
              }}>{msg.text}</div>
            </div>
          ))}
          {isLoading && <div style={{ display: "flex", gap: "4px", padding: "12px 16px", animation: "slideUp 0.2s ease both" }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: P.muted + "50", animation: `dotPulse 1s ease ${i * 0.15}s infinite` }} />)}</div>}
          <div ref={endRef} />
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && !isLoading && (
          <div style={{ padding: "0 16px 8px", display: "flex", gap: "8px", flexWrap: "wrap", animation: "slideUp 0.3s ease 0.1s both" }}>
            {quickReplies.map((qr, i) => (
              <button key={i} onClick={() => send(qr)} style={{ padding: "8px 14px", borderRadius: "100px", border: `1px solid ${P.caramel}30`, background: P.caramel + "08", color: P.caramel, fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = P.caramel + "20"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = P.caramel + "08"; }}
              >{qr}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "12px 16px 24px", borderTop: `1px solid ${P.muted}10`, display: "flex", gap: "10px", alignItems: "flex-end", background: P.gateDark }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(input); } }} placeholder="ask me anything..." style={{ flex: 1, padding: "14px 18px", borderRadius: "16px", border: `1px solid ${P.muted}15`, background: P.muted + "08", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.cream, outline: "none" }}
            onFocus={(e) => { e.target.style.borderColor = P.caramel + "40"; }}
            onBlur={(e) => { e.target.style.borderColor = P.muted + "15"; }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || isLoading} style={{ width: "48px", height: "48px", borderRadius: "50%", border: "none", background: input.trim() ? P.cream : P.muted + "15", color: input.trim() ? P.gateBlack : P.muted + "40", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontSize: "18px", flexShrink: 0 }}>{"\u2191"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FLOATING CHAT BUTTON
   ═══════════════════════════════════════════ */
function FloatingChat({ onClick, visible }) {
  if (!visible) return null;
  return (
    <button onClick={onClick} style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 8000,
      width: "60px", height: "60px", borderRadius: "50%", border: "none",
      background: P.cream, color: P.gateBlack,
      boxShadow: "0 4px 20px rgba(26,23,21,0.3)",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "24px", transition: "all 0.3s",
      animation: "bounceIn 0.5s cubic-bezier(0.16,1,0.3,1) 1.5s both",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >{"\u{1F4AC}"}</button>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div style={{ overflowX: "hidden" }}>
      <Styles />

      <Hero onOpenChat={() => setChatOpen(true)} />
      <MarqueeSection />
      <WhatWeDo />
      <WeHandle />
      <GoldenTicket />
      <StatsStripe />
      <Overheard />
      <BigStatement />
      <TwoWaysIn onOpenChat={() => setChatOpen(true)} />
      <Events />
      <FinalCTA onOpenChat={() => setChatOpen(true)} />
      <Footer />

      <FloatingChat onClick={() => setChatOpen(true)} visible={scrolled && !chatOpen} />
      <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
