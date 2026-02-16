import { useState, useEffect, useRef } from "react";

const P = {
  gateBlack: "#0E0D0B", nearBlack: "#1A1715", surface: "#161412",
  cream: "#FAF6F0", sand: "#E8DDD0", warmWhite: "#F5EFE6",
  caramel: "#D4A574", deepCaramel: "#B8845A", blush: "#DBBCAC",
  coral: "#D4836B", sage: "#A8B5A0", lavender: "#B8A9C9",
  warmBrown: "#8B6F5A", darkBrown: "#3D2E22", muted: "#9B8E82",
  highlight: "#C4704D",
};

const SYSTEM_PROMPT = `You are the chatbot for "Come Offline" — an invite-only community in Bangalore that throws curated IRL events for Gen Z and millennials.
PERSONALITY: You're the witty, slightly chaotic best friend who always knows the best parties. Cheeky but warm. Short punchy messages. Lowercase energy. Gen-z-coded but not cringe.
RULES:
- Keep messages to 2-4 sentences max. Max 1-2 emojis per message. Never be corporate.
PATHS:
1. Code = validate and direct to app
2. No code = "prove yourself" — ask 2-3 fun personality questions, get their name + instagram handle. Then tell them you'll review and get back.
After collecting info: "okay you might be our kind of people. we'll review and slide into your DMs if you pass the vibe check."
For people with codes, tell them to enter it in the code field on the page.`;

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
function Styles() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    body { background: ${P.gateBlack}; }
    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes blink { 50% { opacity: 0; } }
    @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(4px); } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    @keyframes glow { 0%,100% { box-shadow: 0 0 8px ${P.caramel}20; } 50% { box-shadow: 0 0 20px ${P.caramel}35; } }
    @keyframes grain { 0% { transform: translate(0,0); } 10% { transform: translate(-2%,-2%); } 30% { transform: translate(1%,2%); } 50% { transform: translate(-1%,1%); } 70% { transform: translate(3%,1%); } 100% { transform: translate(0,0); } }
    @keyframes tickerSlide { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    ::placeholder { color: ${P.muted}50; }
    input:focus, textarea:focus { outline: none; }
    ::-webkit-scrollbar { width: 0; display: none; }
  `}</style>;
}

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

function HandNote({ children, rotation = -2, style = {} }) {
  return <span style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", color: P.muted, display: "inline-block", transform: `rotate(${rotation}deg)`, ...style }}>{children}</span>;
}

function Sticker({ text, rotation = -3, color = P.caramel, top, right, left, bottom, delay = 0, visible = true }) {
  return (
    <div style={{ position: "absolute", top, right, left, bottom, transform: `rotate(${rotation}deg)`, opacity: visible ? 1 : 0, transition: `all 0.6s ease ${delay}s`, pointerEvents: "none" }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "2px", color, border: `1px solid ${color}40`, padding: "6px 14px", borderRadius: "100px", background: color + "08", whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROTATING SEAL
   ═══════════════════════════════════════════ */
function RotatingSeal({ size = 90, style = {} }) {
  const text = "COME OFFLINE \u2022 EST 2026 \u2022 BANGALORE \u2022 INVITE ONLY \u2022 ";
  return (
    <div style={{ width: size, height: size, animation: "spin 25s linear infinite", ...style }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs><path id="sc" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" /></defs>
        <text style={{ fontFamily: "'DM Mono', monospace", fontSize: "7.5px", fill: P.caramel + "55", letterSpacing: "2.5px", textTransform: "uppercase" }}>
          <textPath href="#sc">{text}</textPath>
        </text>
        <circle cx="50" cy="50" r="16" fill="none" stroke={P.caramel + "20"} strokeWidth="0.5" />
        <text x="50" y="54" textAnchor="middle" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "12px", fill: P.caramel + "45" }}>CO</text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PASSPORT STAMP
   ═══════════════════════════════════════════ */
function PassportStamp({ text, color = P.coral, rotation = -8, style = {} }) {
  return (
    <div style={{ width: 72, height: 72, border: `2px solid ${color}45`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${rotation}deg)`, position: "relative", ...style }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "1.5px", color: color + "60", textAlign: "center", lineHeight: 1.4, fontWeight: 500 }}>{text}</span>
      <div style={{ position: "absolute", top: "22%", right: "-4px", width: "10px", height: "3px", background: color + "12", borderRadius: "50%", transform: "rotate(15deg)" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   SOCIAL PROOF TICKER
   ═══════════════════════════════════════════ */
function SocialTicker() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  const msgs = [
    { text: "Aisha just got vouched in", time: "2m ago", dot: P.sage },
    { text: "3 spots left for House Party", time: "just now", dot: P.coral },
    { text: "Priya earned 2 vouch codes", time: "5m ago", dot: P.caramel },
    { text: "someone passed the vibe check", time: "1m ago", dot: P.lavender },
    { text: "No Color Holi is 44% full", time: "just now", dot: P.sage },
  ];
  useEffect(() => {
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx(i => (i + 1) % msgs.length); setShow(true); }, 350);
    }, 3200);
    return () => clearInterval(iv);
  }, []);
  const m = msgs[idx];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "10px",
      padding: "8px 16px 8px 12px", borderRadius: "100px",
      background: P.cream + "06", border: `1px solid ${P.cream}10`,
      backdropFilter: "blur(8px)",
      opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(-6px)",
      transition: "all 0.3s ease",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0, animation: "pulse 2s ease infinite" }} />
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: P.cream + "bb" }}>{m.text}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: P.muted + "50", whiteSpace: "nowrap" }}>{m.time}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCRIBBLE SVGs
   ═══════════════════════════════════════════ */
function ScribbleArrow({ style = {} }) {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" style={{ display: "block", ...style }}>
      <path d="M4 16C8 14 14 8 20 10C26 12 30 6 36 5" stroke={P.caramel + "45"} strokeWidth="1.2" strokeLinecap="round" fill="none" strokeDasharray="2 3" />
      <path d="M32 2L37 5L31 8" stroke={P.caramel + "45"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function ScribbleCircle({ width = 60, color = P.caramel, style = {} }) {
  return (
    <svg width={width} height="30" viewBox={`0 0 ${width} 30`} fill="none" style={{ display: "block", ...style }}>
      <ellipse cx={width/2} cy="15" rx={width/2 - 4} ry="11" stroke={color + "30"} strokeWidth="1.5" fill="none" strokeDasharray="4 3" transform={`rotate(-3 ${width/2} 15)`} />
    </svg>
  );
}

function ScribbleStar({ color = P.caramel, size = 14, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block", ...style }}>
      <path d="M8 1L9.5 6H14L10.5 9L12 14L8 11L4 14L5.5 9L2 6H6.5L8 1Z" fill={color + "20"} stroke={color + "35"} strokeWidth="0.5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   POLAROID
   ═══════════════════════════════════════════ */
function Polaroid({ color, rotation = -3, caption, emoji }) {
  return (
    <div style={{
      width: 120, padding: "8px 8px 28px", background: "#fff", borderRadius: 3,
      boxShadow: "0 3px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
      transform: `rotate(${rotation}deg)`, flexShrink: 0, position: "relative",
    }}>
      <div style={{
        width: 104, height: 104, borderRadius: 2,
        background: `linear-gradient(135deg, ${color}25, ${color}50, ${color}15)`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
      }}>{emoji}</div>
      <p style={{ fontFamily: "'Caveat', cursive", fontSize: 11, color: P.warmBrown, textAlign: "center", marginTop: 6, lineHeight: 1.2 }}>{caption}</p>
      <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%) rotate(2deg)", width: 36, height: 12, background: P.caramel + "18", borderRadius: 2, border: `0.5px solid ${P.caramel}10` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   COUNT UP
   ═══════════════════════════════════════════ */
function CountUp({ target, vis, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!vis) return;
    const num = parseInt(target);
    if (isNaN(num)) { setVal(target); return; }
    let cur = 0;
    const inc = Math.max(1, Math.floor(num / 30));
    const iv = setInterval(() => {
      cur += inc;
      if (cur >= num) { setVal(num); clearInterval(iv); }
      else setVal(cur);
    }, 40);
    return () => clearInterval(iv);
  }, [vis, target]);
  return <>{val}{suffix}</>;
}

/* ═══════════════════════════════════════════
   HERO — THE FUNNEL
   ═══════════════════════════════════════════ */
function Hero({ onOpenChat }) {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState("");
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState("idle");
  const tag = "an invite-only community for people who still go outside.";

  useEffect(() => { setTimeout(() => setPhase(1), 400); }, []);
  useEffect(() => {
    if (phase < 1) return;
    let i = 0;
    const iv = setInterval(() => { i++; setTyped(tag.slice(0, i)); if (i >= tag.length) { clearInterval(iv); setTimeout(() => setPhase(2), 300); } }, 30);
    return () => clearInterval(iv);
  }, [phase]);

  const handleCodeSubmit = () => {
    if (!code.trim()) return;
    setCodeState("checking");
    setTimeout(() => {
      if (code.trim().length >= 4) {
        setCodeState("valid");
        setTimeout(() => alert("Redirecting to app.comeoffline.blr..."), 1200);
      } else { setCodeState("invalid"); setTimeout(() => setCodeState("idle"), 2000); }
    }, 800);
  };

  return (
    <section style={{ minHeight: "100vh", background: P.gateBlack, position: "relative", overflow: "hidden" }}>
      {/* Film grain */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`, opacity: 0.6, pointerEvents: "none", animation: "grain 0.5s steps(1) infinite" }} />

      {/* Ghost text */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(120px, 25vw, 220px)", fontWeight: 400, color: P.muted + "04", whiteSpace: "nowrap", pointerEvents: "none", letterSpacing: "-8px" }}>offline</div>

      {/* Rotating seal */}
      <div style={{ position: "absolute", top: "60px", right: "12px", opacity: phase >= 2 ? 0.7 : 0, transition: "opacity 1s ease 0.5s", pointerEvents: "none" }}>
        <RotatingSeal size={78} />
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "clamp(100px, 22vh, 160px) 28px 60px", maxWidth: "440px", margin: "0 auto" }}>
        {/* Logo */}
        <div style={{ marginBottom: "20px", opacity: phase >= 1 ? 1 : 0, transition: "opacity 0.6s" }}>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(36px, 8vw, 48px)", fontWeight: 400, color: P.cream, lineHeight: 1.1, letterSpacing: "-1px" }}>
            come offline<span style={{ color: P.caramel }}>.</span>
          </h1>
        </div>

        {/* Tagline typewriter */}
        <div style={{ minHeight: "26px", marginBottom: "16px" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(15px, 3.2vw, 19px)", color: P.muted, fontStyle: "italic" }}>
            {typed}
            {typed.length < tag.length && <span style={{ display: "inline-block", width: "2px", height: "16px", background: P.caramel, marginLeft: "2px", verticalAlign: "middle", animation: "blink 0.8s step-end infinite" }} />}
          </p>
        </div>

        {phase >= 2 && (
          <div style={{ animation: "fadeSlideUp 0.6s ease both" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted + "40", lineHeight: 1.7, marginBottom: "6px" }}>
              <span style={{ textDecoration: "line-through", textDecorationColor: P.highlight + "50" }}>another networking event in bangalore</span>
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted + "60", lineHeight: 1.7, marginBottom: "28px" }}>
              curated events. curated people. no randos, no algorithms, no startup small talk.
            </p>

            {/* TWO PATHS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* PATH 1: CODE */}
              <div style={{
                background: P.cream + "08", borderRadius: "18px", padding: "22px 20px",
                border: `1px solid ${P.cream}12`, backdropFilter: "blur(10px)",
                animation: "fadeSlideUp 0.6s ease 0.1s both",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: P.cream }}>i have a code</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: P.sage, background: P.sage + "18", padding: "4px 10px", borderRadius: "100px" }}>fast track</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); if (codeState === "invalid") setCodeState("idle"); }}
                    onKeyDown={e => e.key === "Enter" && handleCodeSubmit()}
                    placeholder="ENTER YOUR CODE"
                    style={{
                      flex: 1, padding: "14px 16px", borderRadius: "12px",
                      border: `1px solid ${codeState === "invalid" ? P.highlight + "60" : codeState === "valid" ? P.sage + "60" : P.cream + "15"}`,
                      background: P.cream + "06", fontFamily: "'DM Mono', monospace", fontSize: "13px",
                      letterSpacing: "2px", color: P.cream, textTransform: "uppercase",
                      transition: "all 0.3s",
                      animation: codeState === "invalid" ? "shake 0.4s ease" : "none",
                    }}
                  />
                  <button onClick={handleCodeSubmit} disabled={codeState === "checking" || codeState === "valid"}
                    style={{
                      padding: "14px 22px", borderRadius: "12px", border: "none",
                      background: codeState === "valid" ? P.sage : P.cream,
                      color: codeState === "valid" ? "#fff" : P.gateBlack,
                      fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600,
                      cursor: codeState === "checking" ? "wait" : "pointer",
                      transition: "all 0.3s", whiteSpace: "nowrap",
                      opacity: codeState === "checking" ? 0.6 : 1,
                    }}>
                    {codeState === "checking" ? "..." : codeState === "valid" ? "\u2713" : "go"}
                  </button>
                </div>
                {codeState === "invalid" && <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.highlight, marginTop: "8px", animation: "fadeIn 0.3s" }}>hmm, that's not it. try again?</p>}
                {codeState === "valid" && <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.sage, marginTop: "8px", animation: "fadeIn 0.3s" }}>welcome in. taking you to the app...</p>}
              </div>

              {/* OR */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "0 4px" }}>
                <div style={{ flex: 1, height: "1px", background: P.cream + "10" }} />
                <HandNote rotation={0} style={{ fontSize: "14px", color: P.muted + "50" }}>or</HandNote>
                <div style={{ flex: 1, height: "1px", background: P.cream + "10" }} />
              </div>

              {/* PATH 2: PROVE */}
              <button onClick={onOpenChat} style={{
                width: "100%", padding: "20px", borderRadius: "18px",
                border: `1.5px dashed ${P.caramel}40`, background: P.caramel + "06",
                cursor: "pointer", transition: "all 0.3s", textAlign: "left",
                animation: "fadeSlideUp 0.6s ease 0.2s both",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = P.caramel + "12"; e.currentTarget.style.borderColor = P.caramel + "60"; }}
                onMouseLeave={e => { e.currentTarget.style.background = P.caramel + "06"; e.currentTarget.style.borderColor = P.caramel + "40"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: P.cream, display: "block", marginBottom: "4px" }}>no code? prove yourself.</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: P.muted + "70" }}>chat with our bot, pass the vibe check, get in</span>
                  </div>
                  <span style={{ fontSize: "22px", marginLeft: "12px", color: P.caramel }}>{"\u2192"}</span>
                </div>
              </button>
            </div>

            {/* Social proof ticker */}
            <div style={{ marginTop: "24px", animation: "fadeIn 1s ease 0.8s both" }}>
              <SocialTicker />
            </div>
          </div>
        )}
      </div>

      {/* Stickers */}
      <Sticker text="invite only" rotation={-4} color={P.caramel} top="16%" right="16px" visible={phase >= 2} delay={0.4} />
      <Sticker text="phones down" rotation={3} color={P.blush} bottom="20%" right="20px" visible={phase >= 2} delay={0.6} />
    </section>
  );
}

/* ═══════════════════════════════════════════
   MARQUEE
   ═══════════════════════════════════════════ */
function MarqueeSection() {
  const items = "invite only \u2022 real people \u2022 no phones \u2022 curated vibes \u2022 bangalore \u2022 earn your spot \u2022 secret venues \u2022 ";
  return (
    <div style={{ background: P.cream, padding: "14px 0", overflow: "hidden", borderBottom: `1px solid ${P.sand}` }}>
      <div style={{ display: "flex", animation: "marquee 22s linear infinite", whiteSpace: "nowrap" }}>
        {[0, 1].map(i => <span key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: P.muted + "70" }}>{items.repeat(5)}</span>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WHAT IS THIS
   ═══════════════════════════════════════════ */
function WhatIsThis() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.cream, padding: "72px 28px 40px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "30px", right: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: P.caramel + "05", filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "-40px", right: "-20px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(140px, 28vw, 200px)", fontWeight: 400, color: P.nearBlack + "03", lineHeight: 1, pointerEvents: "none" }}>?</div>
      <div style={{ maxWidth: "440px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>so what is this</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.2, margin: "12px 0 20px" }}>
            we throw events for people<br />who deserve better than<br /><span style={{ color: P.caramel, fontStyle: "italic" }}>random nightlife.</span>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, lineHeight: 1.8, position: "relative" }}>
            come offline is an invite-only community in bangalore. we curate the people, the venue, and the experience. you show up, put your phone down, and actually connect with humans.
          </p>
          <div style={{ marginTop: "4px", opacity: vis ? 1 : 0, transition: "opacity 0.6s ease 0.5s", textAlign: "right" }}>
            <HandNote rotation={3} style={{ fontSize: "13px", color: P.caramel + "60" }}>wild concept, we know {"\u2191"}</HandNote>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "32px", padding: "10px 0 20px", overflowX: "auto", WebkitOverflowScrolling: "touch", opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}>
          <Polaroid color={P.blush} rotation={-4} caption="galentines '26" emoji={"\u{1F485}"} />
          <Polaroid color={P.caramel} rotation={2} caption="yapping room" emoji={"\u{1F4AC}"} />
          <Polaroid color={P.sage} rotation={-2} caption="0 phones used" emoji={"\u{1F4F5}"} />
          <Polaroid color={P.lavender} rotation={5} caption="3am vibes" emoji={"\u{1F319}"} />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════ */
function HowItWorks() {
  const [ref, vis] = useInView();
  const steps = [
    { num: "01", title: "get invited", desc: "someone vouches for you, or you charm our chatbot", icon: "\u{1F39F}\uFE0F", note: null },
    { num: "02", title: "RSVP + wait", desc: "grab your spot. venue stays secret until we say so.", icon: "\u23F3", note: "the anticipation is part of it" },
    { num: "03", title: "show up, go dark", desc: "we pick you up. phone goes away. real life begins.", icon: "\u{1F319}", note: null },
    { num: "04", title: "connect after", desc: "next morning: memories, mutual connections, vouch codes.", icon: "\u{1F91D}", note: "the morning after hits different" },
  ];
  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "40px", right: "20px", opacity: vis ? 0.4 : 0, transition: "opacity 0.8s ease 0.5s", pointerEvents: "none" }}>
        <PassportStamp text={"VIBE\nCHECKED"} color={P.sage} rotation={-12} />
      </div>
      <div style={{ position: "absolute", bottom: "50px", right: "35px", opacity: vis ? 0.3 : 0, transition: "opacity 0.8s ease 0.7s", pointerEvents: "none" }}>
        <PassportStamp text={"PHONE\nFREE"} color={P.coral} rotation={8} />
      </div>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>how it works</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.cream, lineHeight: 1.2, margin: "12px 0 0" }}>four steps to<br /><span style={{ color: P.caramel, fontStyle: "italic" }}>actually living.</span></h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ position: "relative" }}>
              <div style={{
                display: "flex", gap: "16px", alignItems: "flex-start",
                padding: "20px 18px", borderRadius: "16px",
                background: P.cream + "05", border: `1px solid ${P.cream}08`,
                opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.1}s`,
              }}>
                <span style={{ fontSize: "24px", flexShrink: 0, marginTop: "2px" }}>{s.icon}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.caramel, letterSpacing: "1px" }}>{s.num}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: P.cream }}>{s.title}</span>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
              {s.note && (
                <div style={{ position: "absolute", right: "-4px", bottom: "-10px", opacity: vis ? 0.7 : 0, transition: `opacity 0.5s ease ${0.4 + i * 0.15}s`, pointerEvents: "none" }}>
                  <HandNote rotation={3} style={{ fontSize: "11px", color: P.caramel + "70" }}>^ {s.note}</HandNote>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "24px", opacity: vis ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }}>
          <ScribbleArrow style={{ margin: "0 auto", transform: "rotate(90deg)" }} />
          <HandNote rotation={-1} style={{ fontSize: "14px", color: P.muted + "50", display: "block", marginTop: "4px" }}>that's it. seriously.</HandNote>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   GOLDEN TICKET
   ═══════════════════════════════════════════ */
function GoldenTicket() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.cream, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: "-20px", left: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: P.caramel + "04", filter: "blur(50px)", pointerEvents: "none" }} />
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>the venue</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.2, margin: "12px 0 0" }}>you don't know where<br />until <span style={{ color: P.caramel, fontStyle: "italic" }}>we say so.</span></h2>
        </div>
        <div style={{
          background: `linear-gradient(135deg, ${P.caramel}15, ${P.deepCaramel}08, ${P.caramel}12)`,
          borderRadius: "20px", padding: "32px 24px", position: "relative", overflow: "hidden",
          border: `1px solid ${P.caramel}20`,
          opacity: vis ? 1 : 0, transform: vis ? "translateY(0) rotate(0.5deg)" : "translateY(20px) rotate(-1deg)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s",
        }}>
          <div style={{ position: "absolute", top: "-4px", left: "20px", width: "50px", height: "18px", background: P.sage + "30", borderRadius: "2px", transform: "rotate(-5deg)", border: `0.5px solid ${P.sage}20` }} />
          <div style={{ position: "absolute", top: "-2px", right: "24px", width: "40px", height: "18px", background: P.blush + "30", borderRadius: "2px", transform: "rotate(3deg)", border: `0.5px solid ${P.blush}20` }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "1px", borderLeft: `2px dashed ${P.caramel}20` }} />
          <div style={{ position: "absolute", top: "-20px", right: "-20px", fontSize: "100px", opacity: 0.05, pointerEvents: "none" }}>{"\u{1F39F}\uFE0F"}</div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "2px", color: P.deepCaramel }}>your golden ticket</span>
          <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.nearBlack, margin: "12px 0 6px" }}>The Courtyard</h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, margin: "0 0 16px" }}>Indiranagar, Bangalore</p>
          <div style={{ display: "flex", gap: "24px" }}>
            <div><span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: P.muted, textTransform: "uppercase", letterSpacing: "1px" }}>date</span><p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.nearBlack, margin: "3px 0 0", fontWeight: 500 }}>Feb 14, 2026</p></div>
            <div><span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: P.muted, textTransform: "uppercase", letterSpacing: "1px" }}>pickup</span><p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.nearBlack, margin: "3px 0 0", fontWeight: 500 }}>4:15 PM</p></div>
          </div>
          <div style={{ marginTop: "20px", padding: "8px 14px", borderRadius: "10px", background: P.caramel + "10", display: "inline-block" }}>
            <HandNote rotation={-1} style={{ fontSize: "12px", color: P.deepCaramel + "80" }}>{"\u{1F448}"} you scratch to reveal this in-app</HandNote>
          </div>
          <div style={{ position: "absolute", bottom: "16px", right: "16px", opacity: 0.25, pointerEvents: "none" }}>
            <PassportStamp text={"VENUE\nREVEALED"} color={P.deepCaramel} rotation={12} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   STATS STRIPE
   ═══════════════════════════════════════════ */
function StatsStripe() {
  const [ref, vis] = useInView();
  const stats = [{ n: "38", l: "humans, last event" }, { n: "0", l: "phones used" }, { n: "127", l: "mimosas downed" }, { n: "95", l: "% show rate" }];
  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "36px 28px", borderTop: `1px solid ${P.muted}10`, borderBottom: `1px solid ${P.muted}10`, position: "relative" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
        {stats.map((s, i) => (
          <div key={i} style={{ opacity: vis ? 1 : 0, transition: `opacity 0.5s ease ${i * 0.1}s`, position: "relative" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "22px", fontWeight: 500, color: i === 1 ? P.sage : P.cream }}>
              <CountUp target={s.n} vis={vis} />
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", textTransform: "uppercase", letterSpacing: "1px", color: P.muted, marginTop: "4px", lineHeight: 1.3 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: "22px", left: "calc(37.5% - 12px)", opacity: vis ? 0.5 : 0, transition: "opacity 0.5s ease 0.5s", pointerEvents: "none" }}>
        <ScribbleCircle width={50} color={P.sage} />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   OVERHEARD
   ═══════════════════════════════════════════ */
function Overheard() {
  const [ref, vis] = useInView();
  const quotes = [
    { q: "wait, is this what parties used to feel like?", c: "dance floor, 9:15 PM", color: P.caramel },
    { q: "i haven't laughed this hard since 2019", c: "yapping room, 7:42 PM", color: P.coral },
    { q: "my cheeks hurt from smiling. is that normal?", c: "fries station, 8:00 PM", color: P.sage },
  ];
  return (
    <section ref={ref} style={{ background: P.cream, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "10px", left: "6px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(120px, 25vw, 180px)", color: P.nearBlack + "03", lineHeight: 1, pointerEvents: "none" }}>{"\u201C"}</div>
      <div style={{ maxWidth: "440px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>overheard at come offline</span>
        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {quotes.map((q, i) => (
            <div key={i} style={{
              padding: "20px 20px 20px 24px", borderLeft: `3px solid ${q.color}`,
              background: "#fff", borderRadius: "0 14px 14px 0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-16px)",
              transition: `all 0.6s ease ${i * 0.12}s`,
            }}>
              <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "17px", fontWeight: 400, color: P.nearBlack, fontStyle: "italic", margin: "0 0 6px", lineHeight: 1.4 }}>"{q.q}"</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted, margin: 0 }}>{q.c}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "right", marginTop: "12px", opacity: vis ? 1 : 0, transition: "opacity 0.5s ease 0.5s" }}>
          <HandNote rotation={2} style={{ fontSize: "13px", color: P.muted + "60" }}>real quotes, real people</HandNote>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   EVENTS
   ═══════════════════════════════════════════ */
function Events() {
  const [ref, vis] = useInView();
  const events = [
    { emoji: "\u{1F4F5}", title: "No Phone House Party", date: "Mar 8, 2026", tag: "phone-free", spots: "28 left of 60", accent: P.caramel, pct: 53 },
    { emoji: "\u{1F90D}", title: "No Color Holi", date: "Mar 14, 2026", tag: "all white", spots: "45 left of 80", accent: P.sage, pct: 44 },
  ];
  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "72px 28px", position: "relative" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>coming up</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.cream, lineHeight: 1.2, margin: "12px 0 0" }}>next events</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {events.map((ev, i) => (
            <div key={i} style={{
              borderRadius: "18px", overflow: "hidden", background: P.cream + "05",
              border: `1px solid ${P.cream}08`,
              opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)",
              transition: `all 0.6s ease ${i * 0.12}s`,
            }}>
              <div style={{ height: "3px", background: `linear-gradient(90deg, ${ev.accent}, ${ev.accent}40)` }} />
              <div style={{ padding: "20px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "24px" }}>{ev.emoji}</span>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: P.cream }}>{ev.title}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted }}>{ev.date}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: ev.accent, background: ev.accent + "15", padding: "4px 10px", borderRadius: "100px" }}>{ev.tag}</span>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted }}>{ev.spots}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ev.accent }}>{ev.pct}%</span>
                  </div>
                  <div style={{ height: "3px", background: P.cream + "10", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: vis ? `${ev.pct}%` : "0%", height: "100%", background: ev.accent, borderRadius: "2px", transition: `width 1.2s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.15}s` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.muted + "50", textAlign: "center", marginTop: "20px" }}>you need to be in to RSVP {"\u{1F512}"}</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════ */
function FinalCTA({ onOpenChat, onScrollToCode }) {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.cream, padding: "72px 28px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20px", left: "20px", opacity: vis ? 0.3 : 0, transition: "opacity 0.8s", pointerEvents: "none" }}>
        <RotatingSeal size={70} />
      </div>
      <div style={{ maxWidth: "400px", margin: "0 auto", opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.3, marginBottom: "6px" }}>still here?</p>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 400, lineHeight: 1.3, marginBottom: "28px" }}>
          <span style={{ color: P.caramel, fontStyle: "italic" }}>that says something about you.</span>
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onScrollToCode} style={{
            padding: "16px 28px", borderRadius: "100px", border: "none",
            background: P.nearBlack, color: P.cream,
            fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, cursor: "pointer", transition: "all 0.3s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,23,21,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >i have a code</button>
          <button onClick={onOpenChat} style={{
            padding: "16px 28px", borderRadius: "100px",
            border: `2px solid ${P.caramel}60`, background: "transparent",
            color: P.nearBlack, fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500,
            cursor: "pointer", transition: "all 0.3s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = P.caramel + "12"; e.currentTarget.style.borderColor = P.caramel; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = P.caramel + "60"; }}
          >{`prove yourself \u2192`}</button>
        </div>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.muted, marginTop: "16px" }}>our bot has opinions. you've been warned.</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ background: P.gateBlack, padding: "36px 28px", textAlign: "center", borderTop: `1px solid ${P.muted}10` }}>
      <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "16px", fontStyle: "italic", color: P.muted + "40" }}>come offline.</p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: P.muted + "25", marginTop: "8px", letterSpacing: "1px" }}>@comeoffline.blr</p>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   CHATBOT
   ═══════════════════════════════════════════ */
function ChatBot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([{ role: "assistant", text: "hey. so you want in? \u{1F440}" }, { role: "assistant", text: "tell me \u2014 got a code from someone, or trying to prove you belong?" }]);
        setQuickReplies(["i have a code", "no code, prove me"]);
      }, 600);
    }
  }, [isOpen]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const send = async (text) => {
    if (!text.trim()) return;
    const newMsgs = [...messages, { role: "user", text }];
    setMessages(newMsgs); setInput(""); setQuickReplies([]); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, system: SYSTEM_PROMPT, messages: newMsgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })) }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "hmm, something went weird. try again?";
      const parts = reply.split("\n").filter(p => p.trim());
      for (let i = 0; i < parts.length; i++) {
        await new Promise(r => setTimeout(r, 350));
        setMessages(prev => [...prev, { role: "assistant", text: parts[i] }]);
      }
    } catch { setMessages(prev => [...prev, { role: "assistant", text: "oops, brain glitch. say that again?" }]); }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: P.gateBlack, borderRadius: "24px 24px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column", border: `1px solid ${P.muted}15`, borderBottom: "none", animation: "fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${P.muted}12`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: P.cream }}>come offline bot</span>
            <span style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.sage }}>online {"\u00B7"} judging you</span>
          </div>
          <button onClick={onClose} style={{ background: P.cream + "10", border: "none", width: "32px", height: "32px", borderRadius: "50%", color: P.muted, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
        </div>
        <div ref={scrollRef} style={{ flex: 1, padding: "18px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", minHeight: "200px", maxHeight: "50vh" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              <div style={{ padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? P.cream : P.cream + "08", color: m.role === "user" ? P.gateBlack : P.cream, fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ))}
          {loading && <div style={{ alignSelf: "flex-start" }}><div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: P.cream + "08" }}><div style={{ display: "flex", gap: "4px" }}>{[0, 1, 2].map(i => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: P.muted, animation: `pulse 1s ease ${i * 0.15}s infinite` }} />)}</div></div></div>}
        </div>
        {quickReplies.length > 0 && <div style={{ padding: "0 20px 10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {quickReplies.map((q, i) => (<button key={i} onClick={() => send(q)} style={{ padding: "8px 16px", borderRadius: "100px", border: `1px solid ${P.caramel}40`, background: P.caramel + "08", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.caramel, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = P.caramel + "18"} onMouseLeave={e => e.currentTarget.style.background = P.caramel + "08"}>{q}</button>))}
        </div>}
        <div style={{ padding: "14px 20px 28px", borderTop: `1px solid ${P.muted}12`, display: "flex", gap: "10px", flexShrink: 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} placeholder="say something..." style={{ flex: 1, padding: "12px 16px", borderRadius: "14px", border: `1px solid ${P.muted}20`, background: P.cream + "06", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.cream }} />
          <button onClick={() => send(input)} style={{ padding: "12px 18px", borderRadius: "14px", border: "none", background: P.cream, color: P.gateBlack, fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>{"\u2191"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FLOATING CHAT
   ═══════════════════════════════════════════ */
function FloatingChat({ onClick, visible }) {
  return (
    <button onClick={onClick} style={{
      position: "fixed", bottom: "24px", right: "20px", width: "52px", height: "52px",
      borderRadius: "50%", border: `1px solid ${P.caramel}30`, background: P.gateBlack,
      boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 12px ${P.caramel}15`, cursor: "pointer", zIndex: 900,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
      opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.8)",
      transition: "all 0.3s", pointerEvents: visible ? "auto" : "none",
    }}>{"\u{1F4AC}"}</button>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════
   FOR BRANDS PAGE
   ═══════════════════════════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   BRANDS HERO
   ═══════════════════════════════════════════ */
function BrandsHero() {
  const [phase, setPhase] = useState(0);
  useEffect(() => { setTimeout(() => setPhase(1), 300); setTimeout(() => setPhase(2), 800); }, []);

  return (
    <section style={{ minHeight: "100vh", background: P.gateBlack, position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
      {/* Film grain */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`, opacity: 0.6, pointerEvents: "none", animation: "grain 0.5s steps(1) infinite" }} />

      {/* Ghost text */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(100px, 22vw, 180px)", fontWeight: 400, color: P.muted + "04", whiteSpace: "nowrap", pointerEvents: "none", letterSpacing: "-6px" }}>brands</div>

      {/* Rotating seal */}
      <div style={{ position: "absolute", top: "60px", right: "12px", opacity: phase >= 2 ? 0.7 : 0, transition: "opacity 1s ease 0.3s", pointerEvents: "none" }}>
        <RotatingSeal size={78} />
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "120px 28px 60px", maxWidth: "440px", margin: "0 auto", width: "100%" }}>
        {/* Eyebrow */}
        <div style={{ marginBottom: "20px", opacity: phase >= 1 ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.caramel }}>for brands</span>
        </div>

        {/* Main headline */}
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: "clamp(28px, 7vw, 40px)", fontWeight: 400, color: P.cream,
          lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: "20px",
          opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}>
          nobody here is going to<br />skip your ad.<br />
          <span style={{ color: P.caramel, fontStyle: "italic" }}>because there are<br />no ads here.</span>
        </h1>

        {phase >= 2 && (
          <div style={{ animation: "fadeSlideUp 0.6s ease both" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted + "40", lineHeight: 1.7, marginBottom: "6px" }}>
              <span style={{ textDecoration: "line-through", textDecorationColor: P.highlight + "50" }}>another sponsorship deck</span>
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted + "80", lineHeight: 1.8, marginBottom: "28px" }}>
              come offline. throws invite-only events where phones don't exist and every guest earned their spot. we don't sell impressions. we build the kind of moments people bring up at brunch three weeks later. your brand can be inside that moment.
            </p>

            <button onClick={() => document.getElementById("brand-form")?.scrollIntoView({ behavior: "smooth" })} style={{
              padding: "16px 32px", borderRadius: "100px", border: "none",
              background: P.cream, color: P.gateBlack,
              fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600,
              cursor: "pointer", transition: "all 0.3s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(250,246,240,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >let's talk {"\u2192"}</button>

            <div style={{ marginTop: "20px" }}>
              <HandNote rotation={-2} style={{ fontSize: "13px", color: P.muted + "40" }}>we're picky about this too.</HandNote>
            </div>
          </div>
        )}
      </div>

      {/* Stickers */}
      <Sticker text="no logo walls" rotation={-4} color={P.coral} top="18%" right="16px" visible={phase >= 2} delay={0.3} />
      <Sticker text="no banner ads" rotation={3} color={P.caramel} bottom="22%" right="20px" visible={phase >= 2} delay={0.5} />
    </section>
  );
}

/* ═══════════════════════════════════════════
   BRANDS MARQUEE
   ═══════════════════════════════════════════ */
function BrandsMarquee() {
  const items = "curated audience \u2022 real moments \u2022 no ad fatigue \u2022 phones away \u2022 bangalore \u2022 invite-only community \u2022 brand love > brand awareness \u2022 ";
  return (
    <div style={{ background: P.cream, padding: "14px 0", overflow: "hidden", borderBottom: `1px solid ${P.sand}` }}>
      <div style={{ display: "flex", animation: "marquee 28s linear infinite", whiteSpace: "nowrap" }}>
        {[0, 1].map(i => <span key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: P.muted + "70" }}>{items.repeat(4)}</span>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   THE AUDIENCE — who's in the room
   ═══════════════════════════════════════════ */
function TheExperience() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.cream, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      {/* Ghost number */}
      <div style={{ position: "absolute", top: "-30px", right: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(140px, 28vw, 200px)", fontWeight: 400, color: P.nearBlack + "03", lineHeight: 1, pointerEvents: "none" }}>01</div>

      <div style={{ maxWidth: "440px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>the experience</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.2, margin: "12px 0 20px" }}>
            picture a room where<br /><span style={{ color: P.caramel, fontStyle: "italic" }}>nobody's looking at a screen.</span>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, lineHeight: 1.8 }}>
            every person in that room was vouched for or vibe-checked before they got in. the venue was a secret until 24 hours ago. phones went away at the door. and the whole night — the food, the drinks, the music, the activities — was curated down to the playlist.
          </p>
          <div style={{ marginTop: "4px", opacity: vis ? 1 : 0, transition: "opacity 0.6s ease 0.5s", textAlign: "right" }}>
            <HandNote rotation={3} style={{ fontSize: "13px", color: P.caramel + "60" }}>that's a come offline. event {"\u2191"}</HandNote>
          </div>
        </div>

        {/* Event vibe cards */}
        <div style={{ display: "flex", gap: "12px", marginTop: "32px", padding: "10px 0 20px", overflowX: "auto", WebkitOverflowScrolling: "touch", opacity: vis ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}>
          <Polaroid color={P.caramel} rotation={-3} caption="secret venue reveal" emoji={"\u{1F510}"} />
          <Polaroid color={P.sage} rotation={2} caption="phones in a box" emoji={"\u{1F4F5}"} />
          <Polaroid color={P.blush} rotation={-2} caption="curated guest list" emoji={"\u2728"} />
          <Polaroid color={P.lavender} rotation={4} caption="experience zones" emoji={"\u{1F3AA}"} />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   HOW WE WORK WITH BRANDS
   ═══════════════════════════════════════════ */
function BrandFormats() {
  const [ref, vis] = useInView();
  const formats = [
    {
      icon: "\u{1F3AA}",
      title: "experience zone takeover",
      desc: "your brand owns a zone. not a booth with a tablecloth \u2014 an actual experience. think: a nail bar, a mixology station, a wellness corner. something people line up for.",
      note: "this is what people actually remember",
    },
    {
      icon: "\u{1F381}",
      title: "curated product moments",
      desc: "your product shows up naturally. in welcome kits, at stations, in people's hands. woven in, not forced in.",
      note: null,
    },
    {
      icon: "\u{1F91D}",
      title: "co-created events",
      desc: "we build an event together from scratch. your brand's values, our community's energy. one night, built around a shared idea.",
      note: "the one brands come back for",
    },
  ];

  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      {/* Ghost number */}
      <div style={{ position: "absolute", top: "-20px", left: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(140px, 28vw, 200px)", fontWeight: 400, color: P.cream + "03", lineHeight: 1, pointerEvents: "none" }}>02</div>

      {/* Passport stamp */}
      <div style={{ position: "absolute", top: "50px", right: "20px", opacity: vis ? 0.35 : 0, transition: "opacity 0.8s ease 0.5s", pointerEvents: "none" }}>
        <PassportStamp text={"BRAND\nAPPROVED"} color={P.caramel} rotation={-10} />
      </div>

      <div style={{ maxWidth: "440px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ marginBottom: "32px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>how we work together</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.cream, lineHeight: 1.2, margin: "12px 0 0" }}>
            not sponsorships.<br /><span style={{ color: P.caramel, fontStyle: "italic" }}>partnerships.</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {formats.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              <div style={{
                padding: "22px 20px", borderRadius: "16px",
                background: P.cream + "05", border: `1px solid ${P.cream}08`,
                opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.12}s`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <span style={{ fontSize: "24px", flexShrink: 0, marginTop: "2px" }}>{f.icon}</span>
                  <div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: P.cream, display: "block", marginBottom: "6px" }}>{f.title}</span>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              </div>
              {f.note && (
                <div style={{ position: "absolute", right: "-4px", bottom: "-10px", opacity: vis ? 0.7 : 0, transition: `opacity 0.5s ease ${0.5 + i * 0.15}s`, pointerEvents: "none" }}>
                  <HandNote rotation={3} style={{ fontSize: "11px", color: P.caramel + "70" }}>^ {f.note}</HandNote>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "28px", opacity: vis ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted + "60", lineHeight: 1.6 }}>
            no logo walls. no "powered by."<br />
            <span style={{ color: P.cream + "90" }}>your brand becomes part of the story, not the footnote.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   BRAND TRACTION STATS
   ═══════════════════════════════════════════ */
function BrandProof() {
  const [ref, vis] = useInView();
  return (
    <section ref={ref} style={{ background: P.cream, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>how we grow</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.2, margin: "12px 0 20px" }}>
            zero ads. zero influencers.<br /><span style={{ color: P.caramel, fontStyle: "italic" }}>all word of mouth.</span>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, lineHeight: 1.8 }}>
            every member was either vouched for by someone already inside, or proved they belong through a vibe check. we've never run a single ad. every event has filled through community alone. that's the kind of audience you're getting access to — people who showed up because someone they trust told them to.
          </p>
        </div>

        {/* Single stat highlight */}
        <div style={{
          marginTop: "28px", padding: "28px 24px", borderRadius: "18px",
          background: P.nearBlack, textAlign: "center",
          border: `1px solid ${P.muted}15`,
          opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.6s ease 0.3s",
          position: "relative",
        }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(36px, 8vw, 48px)", fontWeight: 500, color: P.caramel, lineHeight: 1 }}>
            100%
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, marginTop: "8px" }}>organic growth</div>
          {/* Scribble circle */}
          <div style={{ position: "absolute", top: "14px", left: "50%", transform: "translateX(-50%)", opacity: vis ? 0.4 : 0, transition: "opacity 0.5s ease 0.6s", pointerEvents: "none" }}>
            <ScribbleCircle width={120} color={P.caramel} />
          </div>
        </div>

        <div style={{ textAlign: "right", marginTop: "12px", opacity: vis ? 1 : 0, transition: "opacity 0.5s ease 0.6s" }}>
          <HandNote rotation={2} style={{ fontSize: "12px", color: P.muted + "50" }}>not even a single boosted post. fr.</HandNote>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   WHY US — the anti-pitch
   ═══════════════════════════════════════════ */
function WhyUs() {
  const [ref, vis] = useInView();
  const comparisons = [
    { theirs: "10,000 impressions", ours: "60 people who actually held your product" },
    { theirs: "influencer story, swipe up", ours: "someone telling their friend about you at brunch next week" },
    { theirs: "logo on a banner", ours: "an experience zone people line up for" },
    { theirs: "CPM, CTR, ROAS", ours: "\"where did you get that?\" conversations" },
  ];
  return (
    <section ref={ref} style={{ background: P.nearBlack, padding: "72px 28px", position: "relative", overflow: "hidden" }}>
      {/* Ghost number */}
      <div style={{ position: "absolute", top: "-20px", right: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(140px, 28vw, 200px)", fontWeight: 400, color: P.cream + "03", lineHeight: 1, pointerEvents: "none" }}>03</div>

      <div style={{ maxWidth: "440px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ marginBottom: "28px", opacity: vis ? 1 : 0, transition: "opacity 0.5s" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>the difference</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.cream, lineHeight: 1.2, margin: "12px 0 0" }}>
            what you're used to<br />vs. <span style={{ color: P.caramel, fontStyle: "italic" }}>what we do.</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {comparisons.map((c, i) => (
            <div key={i} style={{
              display: "flex", gap: "0", borderRadius: "14px", overflow: "hidden",
              opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-16px)",
              transition: `all 0.6s ease ${0.1 + i * 0.1}s`,
            }}>
              {/* Theirs */}
              <div style={{
                flex: 1, padding: "14px 14px", background: P.cream + "06",
                borderRight: `1px solid ${P.cream}08`,
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", textTransform: "uppercase", letterSpacing: "1px", color: P.muted + "60", display: "block", marginBottom: "4px" }}>typical</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: P.muted, lineHeight: 1.4, textDecoration: "line-through", textDecorationColor: P.highlight + "40" }}>{c.theirs}</span>
              </div>
              {/* Ours */}
              <div style={{
                flex: 1.2, padding: "14px 14px", background: P.caramel + "08",
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", textTransform: "uppercase", letterSpacing: "1px", color: P.caramel, display: "block", marginBottom: "4px" }}>come offline</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: P.cream + "cc", lineHeight: 1.4 }}>{c.ours}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "20px", opacity: vis ? 1 : 0, transition: "opacity 0.5s ease 0.6s", textAlign: "right" }}>
          <HandNote rotation={2} style={{ fontSize: "12px", color: P.caramel + "60" }}>brand love > brand awareness</HandNote>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   BRAND LEAD FORM
   ═══════════════════════════════════════════ */
function BrandForm() {
  const [ref, vis] = useInView();
  const [form, setForm] = useState({ name: "", email: "", brand: "", role: "", interest: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const interests = [
    "experience zone takeover",
    "product placement / sampling",
    "co-hosted event",
    "community partnership",
    "just exploring",
  ];
  const [selectedInterest, setSelectedInterest] = useState("");

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.brand) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <section ref={ref} id="brand-form" style={{ background: P.cream, padding: "72px 28px 80px", position: "relative", overflow: "hidden" }}>
      {/* Ghost number */}
      <div style={{ position: "absolute", top: "-30px", left: "-10px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(140px, 28vw, 200px)", fontWeight: 400, color: P.nearBlack + "03", lineHeight: 1, pointerEvents: "none" }}>04</div>

      {/* Rotating seal */}
      <div style={{ position: "absolute", bottom: "40px", right: "20px", opacity: vis ? 0.25 : 0, transition: "opacity 0.8s", pointerEvents: "none" }}>
        <RotatingSeal size={80} />
      </div>

      <div style={{ maxWidth: "440px", margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>let's talk</span>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(24px, 5.5vw, 32px)", fontWeight: 400, color: P.nearBlack, lineHeight: 1.2, margin: "12px 0 8px" }}>
            interested?<br /><span style={{ color: P.caramel, fontStyle: "italic" }}>tell us about your brand.</span>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.warmBrown + "90", lineHeight: 1.6, marginBottom: "28px" }}>
            no sales calls. no 47-slide decks. just a conversation about what makes sense.
          </p>
        </div>

        {!submitted ? (
          <div style={{
            display: "flex", flexDirection: "column", gap: "14px",
            opacity: vis ? 1 : 0, transition: "opacity 0.6s ease 0.3s",
          }}>
            {/* Name */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>your name</label>
              <input
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="first + last"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1px solid ${P.sand}`, background: "#fff",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.nearBlack,
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>work email</label>
              <input
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@brand.com"
                type="email"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1px solid ${P.sand}`, background: "#fff",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.nearBlack,
                }}
              />
            </div>

            {/* Brand */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>brand name</label>
              <input
                value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                placeholder="the one on your business card"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1px solid ${P.sand}`, background: "#fff",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.nearBlack,
                }}
              />
            </div>

            {/* Role */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>your role</label>
              <input
                value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                placeholder="brand manager, founder, marketing lead..."
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1px solid ${P.sand}`, background: "#fff",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.nearBlack,
                }}
              />
            </div>

            {/* Interest area */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "8px" }}>what interests you</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {interests.map((int, i) => (
                  <button key={i} onClick={() => setSelectedInterest(int === selectedInterest ? "" : int)}
                    style={{
                      padding: "8px 14px", borderRadius: "100px",
                      border: `1px solid ${selectedInterest === int ? P.caramel : P.sand}`,
                      background: selectedInterest === int ? P.caramel + "12" : "#fff",
                      fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                      color: selectedInterest === int ? P.deepCaramel : P.warmBrown,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >{int}</button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting || !form.name || !form.email || !form.brand}
              style={{
                width: "100%", padding: "16px", borderRadius: "14px", border: "none",
                background: (!form.name || !form.email || !form.brand) ? P.sand : P.nearBlack,
                color: (!form.name || !form.email || !form.brand) ? P.muted : P.cream,
                fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600,
                cursor: (!form.name || !form.email || !form.brand) ? "not-allowed" : "pointer",
                transition: "all 0.3s", marginTop: "8px",
                opacity: submitting ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (form.name && form.email && form.brand) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,23,21,0.12)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {submitting ? "sending..." : "slide into our DMs \u2192"}
            </button>

            <div style={{ textAlign: "center", marginTop: "4px" }}>
              <HandNote rotation={-1} style={{ fontSize: "12px", color: P.muted + "50" }}>we respond faster than your agency.</HandNote>
            </div>
          </div>
        ) : (
          /* Success state */
          <div style={{
            padding: "40px 24px", borderRadius: "20px", textAlign: "center",
            background: P.sage + "10", border: `1px solid ${P.sage}30`,
            animation: "fadeSlideUp 0.6s ease both",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>{"\u2728"}</div>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "22px", fontWeight: 400, color: P.nearBlack, marginBottom: "8px" }}>we got you.</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, lineHeight: 1.6, marginBottom: "12px" }}>
              someone from our team will slide in within 48 hours. in the meantime, go stalk our instagram.
            </p>
            <HandNote rotation={2} style={{ fontSize: "14px", color: P.sage }}>@comeoffline.blr</HandNote>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   BRANDS FOOTER CTA
   ═══════════════════════════════════════════ */
function BrandsFooterCTA() {
  return (
    <section style={{ background: P.nearBlack, padding: "48px 28px", textAlign: "center" }}>
      <div style={{ maxWidth: "400px", margin: "0 auto" }}>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 400, color: P.cream, lineHeight: 1.4, marginBottom: "4px" }}>
          your customers are tired of being marketed to.
        </p>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 400, lineHeight: 1.4, marginBottom: "20px" }}>
          <span style={{ color: P.caramel, fontStyle: "italic" }}>give them a moment instead.</span>
        </p>
        <button onClick={() => document.getElementById("brand-form")?.scrollIntoView({ behavior: "smooth" })} style={{
          padding: "14px 28px", borderRadius: "100px", border: "none",
          background: P.cream, color: P.gateBlack,
          fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600,
          cursor: "pointer", transition: "all 0.3s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
        >get in touch {"\u2192"}</button>
      </div>
    </section>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════
   GATED EVENTS PAGE
   ═══════════════════════════════════════════════════════════════
   ═══════════════════════════════════════════════════════════════ */

const GLITCH_CHARS = "!@#$%^&*_+=~?▒░▓█▄▀÷×±∞≠≈∆∂∑∫";

const puns = [
  "your wifi can't reach here",
  "404: loneliness not found",
  "touch grass, not screens",
  "no signal, all vibes",
  "ctrl+alt+connect",
  "buffering... jk we're live",
  "airplane mode: activated",
];

const allEvents = [
  {
    id: 1, title: "Galentines", tagline: "fries before guys, always.",
    date: "Feb 14, 2026", time: "5:00 PM onwards", spotsLeft: 12, totalSpots: 40,
    accent: P.blush, accentDark: P.coral, emoji: "\u{1F485}", tag: "women only",
    daysUntilVenue: 6,
    description: "a whole day dedicated to the girls. no boys allowed. just vibes, fried food, fizzy drinks, and your loudest opinions.",
    zones: [
      { name: "yapping room", icon: "\u{1F4AC}", desc: "bring your loudest opinions" },
      { name: "nails & pampering", icon: "\u{1F485}", desc: "gel, matte, french — you pick" },
      { name: "unlimited mimosas", icon: "\u{1F942}", desc: "bottomless, obviously" },
      { name: "fries & pizza bar", icon: "\u{1F35F}", desc: "carbs are self care" },
    ],
    dressCode: "whatever makes you feel unstoppable",
    includes: ["pickup & drop from metro", "unlimited food & drinks", "nail bar + pampering zone", "polaroid wall", "curated playlist"],
  },
  {
    id: 2, title: "No Phone House Party", tagline: "remember parties before instagram?",
    date: "Mar 8, 2026", time: "8:00 PM onwards", spotsLeft: 28, totalSpots: 60,
    accent: P.caramel, accentDark: P.deepCaramel, emoji: "\u{1F4F5}", tag: "phone-free",
    daysUntilVenue: 14,
    description: "phones locked in pouches at the door. vinyl corner, board games, an actual dance floor, and conversations that go somewhere.",
    zones: [
      { name: "vinyl corner", icon: "\u{1F3B5}", desc: "curated records, real speakers" },
      { name: "board games", icon: "\u{1F3B2}", desc: "competitive energy welcome" },
      { name: "dance floor", icon: "\u{1F57A}", desc: "no phones = no awkward filming" },
      { name: "conversation pit", icon: "\u{1F4AC}", desc: "deep talks only" },
    ],
    dressCode: "house party chic — effortless but intentional",
    includes: ["phone pouch (you'll get it back)", "pickup & drop", "craft cocktails & beer", "midnight snacks", "board game collection"],
  },
  {
    id: 3, title: "No Color Holi", tagline: "the cleanest holi you'll ever attend.",
    date: "Mar 14, 2026", time: "10:00 AM onwards", spotsLeft: 45, totalSpots: 80,
    accent: P.sage, accentDark: "#7A9170", emoji: "\u{1F90D}", tag: "all white",
    daysUntilVenue: 18,
    description: "everyone wears white. no color. just water, foam, music, and vibes. the anti-holi holi. somehow it's more fun than the real thing.",
    zones: [
      { name: "foam zone", icon: "\u{1F6BF}", desc: "ankle-deep. you're getting soaked" },
      { name: "thandai bar", icon: "\u{1F943}", desc: "traditional + spiked options" },
      { name: "music stage", icon: "\u{1F3B6}", desc: "live DJ set, no requests" },
      { name: "chill zone", icon: "\u2615", desc: "towels, chai, and people-watching" },
    ],
    dressCode: "all white. we mean it. no exceptions.",
    includes: ["pickup & drop", "all-white outfit welcome kit", "unlimited thandai", "foam cannons", "towel + dry bag"],
  },
];

/* ═══════════════════════════════════════════
   GLITCH TEXT — cycling headline
   ═══════════════════════════════════════════ */
function GlitchText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [displayText, setDisplayText] = useState(puns[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      let count = 0;
      const target = puns[(currentIndex + 1) % puns.length];
      const glitchInterval = setInterval(() => {
        count++;
        if (count < 8) {
          setDisplayText(
            target.split("").map((ch) =>
              ch === " " ? " " : Math.random() > 0.4
                ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
                : ch
            ).join("")
          );
        } else {
          const revealCount = Math.floor(((count - 8) / 6) * target.length);
          setDisplayText(
            target.split("").map((ch, i) =>
              i < revealCount ? ch : ch === " " ? " "
                : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            ).join("")
          );
        }
        if (count >= 14) {
          clearInterval(glitchInterval);
          setDisplayText(target);
          setIsGlitching(false);
          setCurrentIndex((prev) => (prev + 1) % puns.length);
        }
      }, 60);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: isGlitching ? P.highlight : P.nearBlack, transition: "color 0.2s", position: "relative" }}>
      {displayText}
      {isGlitching && (
        <>
          <span style={{ position: "absolute", left: "-2px", top: 0, color: P.highlight, opacity: 0.6, clipPath: "inset(10% 0 60% 0)" }}>{displayText}</span>
          <span style={{ position: "absolute", left: "2px", top: 0, color: P.caramel, opacity: 0.4, clipPath: "inset(50% 0 10% 0)" }}>{displayText}</span>
        </>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════
   SPOTS BAR
   ═══════════════════════════════════════════ */
function SpotsBar({ spotsLeft, totalSpots, accent }) {
  const pct = ((totalSpots - spotsLeft) / totalSpots) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ flex: 1, height: "4px", background: P.sand, borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: "2px", transition: "width 1s ease-out" }} />
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, whiteSpace: "nowrap" }}>{spotsLeft} spots left</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EVENT CARD (from app)
   ═══════════════════════════════════════════ */
function FeedEventCard({ event, index, onOpen }) {
  return (
    <div
      onClick={() => onOpen?.(event)}
      style={{ background: "#FFF", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 1px 3px rgba(26,23,21,0.04), 0 8px 24px rgba(26,23,21,0.06)", animation: `fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 0.12}s both` }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${event.accent}, ${event.accentDark})` }} />
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", color: event.accentDark, background: event.accent + "25", padding: "3px 10px", borderRadius: "100px", fontWeight: 500 }}>{event.tag}</span>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.nearBlack, margin: "8px 0 0", lineHeight: 1.1 }}>{event.title}</h3>
          </div>
          <span style={{ fontSize: "32px" }}>{event.emoji}</span>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, margin: "0 0 20px", fontStyle: "italic" }}>{event.tagline}</p>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.nearBlack }}>{"\u{1F4C5}"} {event.date}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted }}>{"\u{1F4CD}"} venue drops in {event.daysUntilVenue}d</div>
        </div>
        <SpotsBar spotsLeft={event.spotsLeft} totalSpots={event.totalSpots} accent={event.accentDark} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
          <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, padding: "12px 28px", borderRadius: "100px", border: "none", background: P.nearBlack, color: "#fff", cursor: "pointer" }}>{"i'm in \u2192"}</button>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted }}>tap for details</span>
        </div>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${P.warmWhite}, ${P.cream})`, padding: "12px 24px", display: "flex", alignItems: "center", gap: "8px", borderTop: `1px solid ${P.sand}` }}>
        <span style={{ fontSize: "14px" }}>{"\u2713"}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.warmBrown }}>pick-up & drop included</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EVENT DETAIL (bottom sheet from app)
   ═══════════════════════════════════════════ */
function FeedEventDetail({ event, onClose, onOpenChat }) {
  const [gateOpen, setGateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState("idle");

  const handleCodeSubmit = () => {
    if (!code.trim()) return;
    setCodeState("checking");
    setTimeout(() => {
      if (code.trim().length >= 4) {
        setCodeState("valid");
      } else { setCodeState("invalid"); setTimeout(() => setCodeState("idle"), 2000); }
    }, 800);
  };

  if (!event) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease both" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,9,7,0.5)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "430px", maxHeight: "90vh", background: P.cream, borderRadius: "24px 24px 0 0", overflow: "hidden", animation: "fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ height: "5px", background: `linear-gradient(90deg, ${event.accent}, ${event.accentDark})` }} />
        <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", color: event.accentDark, background: event.accent + "25", padding: "3px 10px", borderRadius: "100px", fontWeight: 500 }}>{event.tag}</span>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "32px", fontWeight: 400, color: P.nearBlack, margin: "10px 0 4px", lineHeight: 1.1 }}>{event.title} {event.emoji}</h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, margin: 0, fontStyle: "italic" }}>{event.tagline}</p>
          </div>
          <button onClick={onClose} style={{ background: P.sand + "50", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: P.warmBrown, fontSize: "16px", flexShrink: 0 }}>{"\u2715"}</button>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "calc(90vh - 200px)", padding: "20px 24px 24px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.nearBlack }}>{"\u{1F4C5}"} {event.date}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.nearBlack }}>{"\u{1F552}"} {event.time}</div>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.7, marginBottom: "28px" }}>{event.description}</p>
          <div style={{ marginBottom: "28px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>what's inside</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {event.zones.map((z, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 3px rgba(26,23,21,0.04)" }}>
                  <span style={{ fontSize: "22px", display: "block", marginBottom: "8px" }}>{z.icon}</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, color: P.nearBlack, margin: "0 0 3px" }}>{z.name}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted, margin: 0 }}>{z.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "28px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>what's included</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {event.includes.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: event.accentDark, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: event.accent + "12", borderRadius: "14px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>{"\u{1F457}"}</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.warmBrown, margin: 0 }}>dress code: <strong>{event.dressCode}</strong></p>
          </div>
          <SpotsBar spotsLeft={event.spotsLeft} totalSpots={event.totalSpots} accent={event.accentDark} />

          {/* GATE — appears after tapping RSVP */}
          {gateOpen && (
            <div style={{ marginTop: "24px", animation: "fadeSlideUp 0.4s ease both" }}>
              <div style={{ height: "1px", background: P.sand, marginBottom: "24px" }} />
              <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: P.nearBlack, marginBottom: "4px" }}>
                wait — you need to be <span style={{ color: P.caramel, fontStyle: "italic" }}>in</span> first.
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.warmBrown + "90", lineHeight: 1.6, marginBottom: "18px" }}>
                got a code from someone? or prove you belong.
              </p>

              {/* Code input */}
              <div style={{
                background: P.nearBlack, borderRadius: "16px", padding: "18px 16px", marginBottom: "10px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: P.cream }}>i have a code</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: P.sage, background: P.sage + "18", padding: "3px 8px", borderRadius: "100px" }}>fast track</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); if (codeState === "invalid") setCodeState("idle"); }}
                    onKeyDown={e => e.key === "Enter" && handleCodeSubmit()}
                    placeholder="ENTER CODE"
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: "10px",
                      border: `1px solid ${codeState === "invalid" ? P.highlight + "60" : codeState === "valid" ? P.sage + "60" : P.cream + "15"}`,
                      background: P.cream + "08", fontFamily: "'DM Mono', monospace", fontSize: "13px",
                      letterSpacing: "2px", color: P.cream, textTransform: "uppercase",
                      animation: codeState === "invalid" ? "shake 0.4s ease" : "none",
                    }}
                  />
                  <button onClick={handleCodeSubmit} disabled={codeState === "checking" || codeState === "valid"}
                    style={{
                      padding: "12px 18px", borderRadius: "10px", border: "none",
                      background: codeState === "valid" ? P.sage : P.cream,
                      color: codeState === "valid" ? "#fff" : P.gateBlack,
                      fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600,
                      cursor: codeState === "checking" ? "wait" : "pointer",
                      opacity: codeState === "checking" ? 0.6 : 1,
                    }}>
                    {codeState === "checking" ? "..." : codeState === "valid" ? "\u2713" : "go"}
                  </button>
                </div>
                {codeState === "invalid" && <p style={{ fontFamily: "'Caveat', cursive", fontSize: "13px", color: P.highlight, marginTop: "6px", animation: "fadeIn 0.3s" }}>nope, that's not it.</p>}
                {codeState === "valid" && <p style={{ fontFamily: "'Caveat', cursive", fontSize: "13px", color: P.sage, marginTop: "6px", animation: "fadeIn 0.3s" }}>you're in. welcome to the other side.</p>}
              </div>

              {/* Or prove */}
              <button onClick={() => { onClose(); setTimeout(() => onOpenChat(), 200); }} style={{
                width: "100%", padding: "16px", borderRadius: "16px",
                border: `1.5px dashed ${P.caramel}40`, background: P.caramel + "06",
                cursor: "pointer", transition: "all 0.3s", textAlign: "left",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = P.caramel + "12"; }}
                onMouseLeave={e => { e.currentTarget.style.background = P.caramel + "06"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: P.nearBlack, display: "block", marginBottom: "2px" }}>no code? prove yourself.</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: P.muted }}>chat with our bot, pass the vibe check</span>
                  </div>
                  <span style={{ fontSize: "18px", color: P.caramel }}>{"\u2192"}</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div style={{ padding: "16px 24px 28px", borderTop: `1px solid ${P.sand}`, background: P.cream }}>
          {!gateOpen ? (
            <button onClick={() => setGateOpen(true)} style={{ width: "100%", padding: "18px", borderRadius: "16px", border: "none", background: event.spotsLeft === 0 ? P.sand : P.nearBlack, color: event.spotsLeft === 0 ? P.muted : "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 500, cursor: event.spotsLeft === 0 ? "default" : "pointer" }} disabled={event.spotsLeft === 0}>
              {event.spotsLeft === 0 ? "sold out" : "i'm in \u2192"}
            </button>
          ) : !codeState.includes("valid") ? (
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.muted, textAlign: "center" }}>{"\u2191"} get in first, then you can RSVP</p>
          ) : (
            <button style={{ width: "100%", padding: "18px", borderRadius: "16px", border: "none", background: P.nearBlack, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 500, cursor: "pointer", animation: "fadeSlideUp 0.3s ease both" }}>
              {"RSVP confirmed \u2713"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EVENTS PAGE — open feed, gate at RSVP
   ═══════════════════════════════════════════ */
function EventsPage({ onOpenChat }) {
  const [detailEvent, setDetailEvent] = useState(null);
  return (
    <div style={{ background: P.cream, minHeight: "100vh" }}>
      {/* Noise texture */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`, pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "430px", margin: "0 auto", paddingBottom: "60px" }}>
        {/* Feed header */}
        <section style={{ padding: "80px 20px 48px", position: "relative" }}>
          <div style={{ position: "absolute", right: "-30px", top: "60px", width: "120px", height: "120px", borderRadius: "50%", background: `radial-gradient(circle, ${P.caramel}15, transparent)`, animation: "float 6s ease-in-out infinite" }} />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, marginBottom: "16px" }}>invite only {"\u00B7"} est. 2026</p>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "38px", fontWeight: 400, color: P.nearBlack, margin: "0 0 12px", lineHeight: 1.15, letterSpacing: "-1px", maxWidth: "340px" }}>
            <GlitchText />
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.7, maxWidth: "320px", margin: 0 }}>
            a community for people who still believe the best connections happen face to face. <span style={{ color: P.caramel }}>bangalore chapter.</span>
          </p>
        </section>

        <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>upcoming events</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.caramel }}>{allEvents.length} events</span>
        </div>

        <section style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {allEvents.map((e, i) => (
            <FeedEventCard key={e.id} event={e} index={i} onOpen={setDetailEvent} />
          ))}
          <div style={{ border: `1.5px dashed ${P.sand}`, borderRadius: "20px", padding: "32px 24px", textAlign: "center", animation: `fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) ${allEvents.length * 0.12}s both` }}>
            <span style={{ fontSize: "28px", display: "block", marginBottom: "12px" }}>{"\u{1F440}"}</span>
            <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "18px", color: P.warmBrown, margin: "0 0 4px" }}>more coming soon</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>we're cooking something unhinged</p>
          </div>
        </section>
      </div>

      {detailEvent && <FeedEventDetail event={detailEvent} onClose={() => setDetailEvent(null)} onOpenChat={onOpenChat} />}
      <Footer />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   CONTACT PAGE
   ═══════════════════════════════════════════════════════════════ */
function ContactPage() {
  const [ref, vis] = useInView();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) return;
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1200);
  };

  return (
    <div style={{ minHeight: "100vh", background: P.gateBlack, position: "relative", overflow: "hidden" }}>
      {/* Film grain */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`, opacity: 0.6, pointerEvents: "none", animation: "grain 0.5s steps(1) infinite" }} />

      {/* Ghost text */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(100px, 22vw, 180px)", fontWeight: 400, color: P.muted + "04", whiteSpace: "nowrap", pointerEvents: "none", letterSpacing: "-6px" }}>hello</div>

      <div ref={ref} style={{ position: "relative", zIndex: 2, padding: "120px 28px 60px", maxWidth: "440px", margin: "0 auto" }}>
        {/* Seal */}
        <div style={{ position: "absolute", top: "60px", right: "0px", opacity: vis ? 0.6 : 0, transition: "opacity 1s", pointerEvents: "none" }}>
          <RotatingSeal size={70} />
        </div>

        <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.caramel, display: "block", marginBottom: "16px" }}>contact</span>

          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(28px, 7vw, 40px)", fontWeight: 400, color: P.cream, lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: "12px" }}>
            say hi. ask things.<br /><span style={{ color: P.caramel, fontStyle: "italic" }}>we don't bite.</span>
          </h1>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted + "80", lineHeight: 1.7, marginBottom: "32px" }}>
            whether it's about an event, a partnership, press, or you just want to tell us something nice — we're all ears.
          </p>
        </div>

        {!submitted ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", opacity: vis ? 1 : 0, transition: "opacity 0.6s ease 0.2s" }}>
            {/* Name */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>your name</label>
              <input
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="who are you"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1px solid ${P.cream}15`, background: P.cream + "06",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.cream,
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>email</label>
              <input
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="so we can actually reply"
                type="email"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1px solid ${P.cream}15`, background: P.cream + "06",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.cream,
                }}
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>message</label>
              <textarea
                value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="what's on your mind"
                rows={5}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1px solid ${P.cream}15`, background: P.cream + "06",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.cream,
                  resize: "vertical", minHeight: "120px",
                }}
              />
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting || !form.name || !form.email || !form.message}
              style={{
                width: "100%", padding: "16px", borderRadius: "14px", border: "none",
                background: (!form.name || !form.email || !form.message) ? P.cream + "15" : P.cream,
                color: (!form.name || !form.email || !form.message) ? P.muted + "50" : P.gateBlack,
                fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600,
                cursor: (!form.name || !form.email || !form.message) ? "not-allowed" : "pointer",
                transition: "all 0.3s", marginTop: "4px",
                opacity: submitting ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (form.name && form.email && form.message) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(250,246,240,0.1)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {submitting ? "sending..." : "send it \u2192"}
            </button>

            <div style={{ textAlign: "center", marginTop: "2px" }}>
              <HandNote rotation={-1} style={{ fontSize: "12px", color: P.muted + "40" }}>we actually read these. pinky promise.</HandNote>
            </div>
          </div>
        ) : (
          /* Success */
          <div style={{
            padding: "40px 24px", borderRadius: "20px", textAlign: "center",
            background: P.sage + "10", border: `1px solid ${P.sage}25`,
            animation: "fadeSlideUp 0.6s ease both",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>{"\u{1F44B}"}</div>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "22px", fontWeight: 400, color: P.cream, marginBottom: "8px" }}>got it. we'll be in touch.</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.6 }}>
              someone from the team will get back to you. probably faster than you'd expect.
            </p>
          </div>
        )}

        {/* Socials */}
        <div style={{ marginTop: "48px", opacity: vis ? 1 : 0, transition: "opacity 0.6s ease 0.4s" }}>
          <div style={{ height: "1px", background: P.cream + "08", marginBottom: "28px" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted + "60", display: "block", marginBottom: "16px" }}>or find us here</span>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { platform: "instagram", handle: "@comeoffline.blr", url: "#" },
              { platform: "email", handle: "hello@comeoffline.in", url: "#" },
            ].map((s, i) => (
              <a key={i} href={s.url} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", borderRadius: "12px",
                background: P.cream + "05", border: `1px solid ${P.cream}08`,
                textDecoration: "none", transition: "all 0.2s", cursor: "pointer",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = P.cream + "0a"; e.currentTarget.style.borderColor = P.cream + "15"; }}
                onMouseLeave={e => { e.currentTarget.style.background = P.cream + "05"; e.currentTarget.style.borderColor = P.cream + "08"; }}
              >
                <div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted + "60", display: "block", marginBottom: "3px" }}>{s.platform}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.cream + "cc" }}>{s.handle}</span>
                </div>
                <span style={{ color: P.caramel + "60", fontSize: "16px" }}>{"\u2192"}</span>
              </a>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <HandNote rotation={2} style={{ fontSize: "13px", color: P.muted + "30" }}>DMs are open. we're friendly.</HandNote>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   TAB TOGGLE
   ═══════════════════════════════════════════════════════════════ */
function TabHeader({ activeTab, onTabChange }) {
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    const h = () => {
      const curr = window.scrollY;
      setVisible(curr < 100 || curr < lastScroll);
      setLastScroll(curr);
    };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, [lastScroll]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
      display: "flex", justifyContent: "center",
      padding: "16px 0 12px",
      background: `linear-gradient(180deg, ${P.gateBlack}ee 0%, ${P.gateBlack}cc 70%, transparent 100%)`,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-100%)",
      transition: "all 0.35s ease",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <div style={{
        display: "flex", gap: "2px", padding: "3px",
        borderRadius: "100px", background: P.cream + "08",
        border: `1px solid ${P.cream}10`,
        backdropFilter: "blur(12px)",
      }}>
        {["for you", "events", "contact", "for brands"].map(tab => (
          <button key={tab} onClick={() => { onTabChange(tab); window.scrollTo({ top: 0, behavior: "instant" }); }}
            style={{
              padding: "7px 14px", borderRadius: "100px", border: "none",
              background: activeTab === tab ? P.cream : "transparent",
              color: activeTab === tab ? P.gateBlack : P.cream + "70",
              fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer", transition: "all 0.25s",
              letterSpacing: "0.2px",
            }}
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = P.cream; }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = P.cream + "70"; }}
          >{tab}</button>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   CONSUMER PAGE (wrapped)
   ═══════════════════════════════════════════ */
function ConsumerPage({ onOpenChat }) {
  return (
    <>
      <Hero onOpenChat={onOpenChat} />
      <MarqueeSection />
      <WhatIsThis />
      <HowItWorks />
      <GoldenTicket />
      <StatsStripe />
      <Overheard />
      <Events />
      <FinalCTA onOpenChat={onOpenChat} onScrollToCode={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
      <Footer />
    </>
  );
}

/* ═══════════════════════════════════════════
   BRANDS PAGE (wrapped)
   ═══════════════════════════════════════════ */
function BrandsPage() {
  return (
    <>
      <BrandsHero />
      <BrandsMarquee />
      <TheExperience />
      <BrandFormats />
      <WhyUs />
      <BrandProof />
      <BrandForm />
      <BrandsFooterCTA />
      <Footer />
    </>
  );
}


/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("for you");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      <Styles />
      <TabHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "for you" ? (
        <ConsumerPage onOpenChat={() => setChatOpen(true)} />
      ) : activeTab === "events" ? (
        <EventsPage onOpenChat={() => setChatOpen(true)} />
      ) : activeTab === "contact" ? (
        <ContactPage />
      ) : (
        <BrandsPage />
      )}

      {activeTab === "for you" && (
        <FloatingChat onClick={() => setChatOpen(true)} visible={scrolled && !chatOpen} />
      )}
      <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
