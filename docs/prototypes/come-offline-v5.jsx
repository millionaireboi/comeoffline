import React, { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   PALETTE
   ═══════════════════════════════════════════ */
const P = {
  cream: "#FAF6F0",
  warmWhite: "#F5EFE6",
  sand: "#E8DDD0",
  caramel: "#D4A574",
  deepCaramel: "#B8845A",
  terracotta: "#C4704D",
  warmBrown: "#8B6F5A",
  darkBrown: "#3D2E22",
  nearBlack: "#1A1715",
  softBlack: "#2C2520",
  muted: "#9B8E82",
  highlight: "#E6A97E",
  coral: "#D4836B",
  sage: "#A8B5A0",
  lavender: "#B8A9C9",
  blush: "#DBBCAC",
  gateBlack: "#0E0D0B",
  gateDark: "#161412",
  gateGlow: "#D4A574",
};

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */
const disconnectQuotes = [
  { text: "the best things in life aren't on a screen.", author: "— literally everyone's grandma" },
  { text: "be where your feet are.", author: "— someone wise" },
  { text: "your screen time report is disappointed in you.", author: "— your phone" },
  { text: "touch grass. it's free.", author: "— nature" },
  { text: "you're holding a rectangle when you could be holding a drink.", author: "— come offline" },
];

const puns = [
  "your wifi can't reach here",
  "404: loneliness not found",
  "touch grass, not screens",
  "no signal, all vibes",
  "ctrl+alt+connect",
  "buffering... jk we're live",
  "airplane mode: activated",
];

const rejectLines = [
  "nice try, stranger.",
  "nope. who sent you?",
  "that's not it, bestie.",
  "wrong door. keep knocking.",
  "did you just guess that?",
  "not even close, love.",
  "ask your cool friend.",
  "the bouncer says no.",
];

const VALID_CODE = "OFFLINE";

// Safe glitch characters - no JSX-breaking chars like { } < >
const GLITCH_CHARS = "!@#$%^&*_+=~?░▒▓█▄▀÷×±∞≠≈∆∂∑∏";

const eventData = {
  id: 1,
  title: "Galentines",
  tagline: "fries before guys, always.",
  date: "Feb 14, 2026",
  time: "5:00 PM onwards",
  spotsLeft: 12,
  totalSpots: 40,
  daysUntilVenue: 6,
  accent: P.blush,
  accentDark: P.coral,
  emoji: "\u{1F485}",
  heroGradient: "linear-gradient(135deg,#DBBCAC 0%,#D4836B 50%,#C4704D 100%)",
  tag: "women only",
  venue: { name: "The Courtyard", area: "Indiranagar, Bangalore", address: "123, 12th Main, Indiranagar" },
  pickupTime: "4:15 PM",
  pickupPoint: "Indiranagar Metro Station, Exit 2",
  zones: [
    { name: "yapping room", icon: "\u{1F4AC}", desc: "bring your loudest opinions" },
    { name: "nails & pampering", icon: "\u{1F485}", desc: "gel, matte, french — you pick" },
    { name: "unlimited mimosas", icon: "\u{1F942}", desc: "bottomless, obviously" },
    { name: "fries & pizza bar", icon: "\u{1F35F}", desc: "carbs are self care" },
  ],
  description:
    "a whole day dedicated to the girls. no boys allowed. just vibes, fried food, fizzy drinks, and your loudest opinions.",
  dressCode: "whatever makes you feel unstoppable",
  includes: ["pickup & drop from metro", "unlimited food & drinks", "nail bar + pampering zone", "polaroid wall", "curated playlist"],
};

const moreEvents = [
  {
    id: 2, title: "No Phone House Party", tagline: "remember parties before instagram?",
    date: "Mar 8, 2026", time: "8:00 PM onwards", spotsLeft: 28, totalSpots: 60,
    accent: P.caramel, accentDark: P.deepCaramel, emoji: "\u{1F4F5}", tag: "phone-free", daysUntilVenue: 14,
    description: "phones locked in pouches at the door. vinyl corner, board games, an actual dance floor, and conversations that go somewhere.",
    zones: [
      { name: "vinyl corner", icon: "\u{1F3B5}", desc: "curated records, real speakers" },
      { name: "board games", icon: "\u{1F3B2}", desc: "competitive energy welcome" },
      { name: "dance floor", icon: "\u{1F57A}", desc: "no phones = no awkward filming" },
      { name: "conversation pit", icon: "\u{1F4AC}", desc: "deep talks only" },
    ],
    dressCode: "house party chic \u2014 effortless but intentional",
    includes: ["phone pouch (you'll get it back)", "pickup & drop", "craft cocktails & beer", "midnight snacks", "board game collection"],
  },
  {
    id: 3, title: "No Color Holi", tagline: "the cleanest holi you'll ever attend.",
    date: "Mar 14, 2026", time: "10:00 AM onwards", spotsLeft: 45, totalSpots: 80,
    accent: P.sage, accentDark: "#7A9170", emoji: "\u{1F90D}", tag: "all white", daysUntilVenue: 18,
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

const polaroids = [
  { id: 1, caption: "the yapping room was LOUD", color: "#DBBCAC", rotation: -3, who: "the come offline crew" },
  { id: 2, caption: "mimosa #4 hit different", color: "#D4A574", rotation: 2, who: "polaroid wall" },
  { id: 3, caption: "fries > everything", color: "#A8B5A0", rotation: -1.5, who: "caught in the wild" },
  { id: 4, caption: "nails looking unreal tbh", color: "#B8A9C9", rotation: 3, who: "pampering zone" },
  { id: 5, caption: "the group that didn't want to leave", color: "#E6A97E", rotation: -2, who: "last ones standing" },
  { id: 6, caption: "pizza at midnight. obviously.", color: "#D4836B", rotation: 1, who: "no regrets" },
];

const overheardQuotes = [
  { quote: "i haven't laughed this hard since 2019", context: "yapping room, 7:42 PM" },
  { quote: "wait, is this what parties used to feel like?", context: "dance floor, 9:15 PM" },
  { quote: "i'm never opening instagram again... okay maybe tomorrow", context: "mimosa bar, 6:30 PM" },
  { quote: "my cheeks hurt from smiling. is that normal?", context: "fries station, 8:00 PM" },
  { quote: "can we do this every week? every day? please?", context: "exit, 11:45 PM" },
  { quote: "i just had the best conversation with a stranger in YEARS", context: "yapping room, 8:30 PM" },
];

const attendees = [
  { name: "Priya", fact: "her opinions are a solid 10/10", emoji: "\u2728", vibe: "i AM the opinion" },
  { name: "Aisha", fact: "here for the fries, stayed for the vibes", emoji: "\u{1F35F}", vibe: "fries, no debate" },
  { name: "Meera", fact: "gel nails enthusiast + mimosa connoisseur", emoji: "\u{1F485}", vibe: "my friends fear me" },
  { name: "Rhea", fact: "danced like nobody was watching (they were)", emoji: "\u{1F483}", vibe: "normal human" },
  { name: "Ananya", fact: "told the best story of the night", emoji: "\u{1F3A4}", vibe: "i AM the opinion" },
  { name: "Kavya", fact: "organized an impromptu karaoke session", emoji: "\u{1F3B6}", vibe: "my friends fear me" },
  { name: "Diya", fact: "consumed 7 slices. no regrets.", emoji: "\u{1F355}", vibe: "i'd rather not live" },
  { name: "Isha", fact: "made everyone cry-laugh in the yapping room", emoji: "\u{1F602}", vibe: "i AM the opinion" },
  { name: "Tara", fact: "arrived shy. left with 12 new friends.", emoji: "\u{1F98B}", vibe: "whisper" },
  { name: "Nisha", fact: "the unofficial DJ of the night", emoji: "\u{1F3A7}", vibe: "my friends fear me" },
];

const accentColors = [P.blush, P.caramel, P.sage, P.lavender, P.highlight, P.coral];

const SYSTEM_PROMPT = `You are the in-app chatbot for "Come Offline" \u2014 an invite-only community in Bangalore that throws curated IRL events.
PERSONALITY: Witty gen-z friend, cheeky but warm. Short punchy lowercase messages. Use "bestie","lowkey","ngl","fr" sparingly.
ABOUT: Invite-only, curated IRL events in Bangalore. Vouch system or prove-yourself. We handle pickup, drop, food, drinks. Venue revealed 10 days before. Est. 2026.
EVENTS: Galentines (Feb 14, women-only, SOLD OUT). No Phone House Party (Mar 8, phone-free, 28 spots). No Color Holi (Mar 14, all white, 45 spots).
Keep responses to 2-4 sentences. Max 1-2 emojis per message.`;

/* ═══════════════════════════════════════════
   GLOBAL STYLES
   ═══════════════════════════════════════════ */
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

      @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
      @keyframes gateGlow { 0%, 100% { box-shadow: 0 0 20px rgba(212,165,116,0), 0 0 60px rgba(212,165,116,0); } 50% { box-shadow: 0 0 20px rgba(212,165,116,0.15), 0 0 60px rgba(212,165,116,0.08); } }
      @keyframes unlockPulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }
      @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 50%, 90% { transform: translateX(-4px); } 30%, 70% { transform: translateX(4px); } }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      @keyframes grain { 0%, 100% { transform: translate(0,0); } 10% { transform: translate(-5%,-10%); } 30% { transform: translate(7%,-25%); } 50% { transform: translate(-15%,10%); } 70% { transform: translate(0%,15%); } 90% { transform: translate(-10%,10%); } }
      @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes confettiFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
      @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; } }
      @keyframes tickTock { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.97); } }
      @keyframes revealShine { 0% { left: -100%; } 100% { left: 200%; } }
      @keyframes goldenPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,165,116,0.3); } 50% { box-shadow: 0 0 0 20px rgba(212,165,116,0); } }
      @keyframes gentleDrift { 0%, 100% { transform: translate(0,0) rotate(0deg); } 25% { transform: translate(3px,-3px) rotate(0.5deg); } 75% { transform: translate(2px,1px) rotate(0.2deg); } }
      @keyframes slowPulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.35; } }
      @keyframes slideFadeIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes stampReveal { 0% { transform: scale(2) rotate(-15deg); opacity: 0; } 60% { transform: scale(0.9) rotate(3deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
      @keyframes codeReveal { 0% { letter-spacing: 12px; opacity: 0; filter: blur(8px); } 100% { letter-spacing: 4px; opacity: 1; filter: blur(0); } }
      @keyframes heartPop { 0% { transform: scale(1); } 25% { transform: scale(1.3); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }

      @keyframes dotPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      @keyframes chatSlideIn { from { opacity: 0; transform: translateY(100%) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes bounceIn { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      @keyframes welcomeGlow { 0%, 100% { box-shadow: 0 0 30px rgba(212,165,116,0); } 50% { box-shadow: 0 0 60px rgba(212,165,116,0.15); } }

      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        box-sizing: border-box;
      }
      input::placeholder { color: ${P.sand}; }
      ::-webkit-scrollbar { display: none; }
    `}</style>
  );
}

function Noise({ opacity = 0.03 }) {
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        opacity, pointerEvents: "none", zIndex: 1000,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        animation: "grain 0.5s steps(1) infinite",
      }}
    />
  );
}

/* ═══════════════════════════════════════════
   DEMO SWITCHER
   ═══════════════════════════════════════════ */
function DemoSwitcher({ stage, setStage }) {
  const stages = [
    { id: "gate", label: "gate", icon: "\u{1F512}" },
    { id: "accepted", label: "hi!", icon: "\u{1F389}" },
    { id: "feed", label: "feed", icon: "\u{1F4CB}" },
    { id: "countdown", label: "wait", icon: "\u23F3" },
    { id: "reveal", label: "reveal", icon: "\u2709\uFE0F" },
    { id: "dayof", label: "day-of", icon: "\u{1F389}" },
    { id: "godark", label: "dark", icon: "\u{1F319}" },
    { id: "memories", label: "after", icon: "\u{1F4F8}" },
    { id: "reconnect", label: "connect", icon: "\u{1F91D}" },
    { id: "vouch", label: "vouch", icon: "\u{1F39F}\uFE0F" },
    { id: "profile", label: "you", icon: "\u{1F464}" },
  ];

  return (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", gap: "1px",
      background: "rgba(26,23,21,0.95)", backdropFilter: "blur(12px)",
      borderRadius: "0 0 14px 14px", padding: "5px 6px",
      maxWidth: "430px", width: "100%", justifyContent: "center",
    }}>
      {stages.map((s) => (
        <button
          key={s.id}
          onClick={() => setStage(s.id)}
          style={{
            padding: "5px 6px", borderRadius: "7px", border: "none",
            background: stage === s.id ? P.caramel + "30" : "transparent",
            color: stage === s.id ? P.cream : P.muted + "80",
            fontFamily: "'DM Mono', monospace", fontSize: "7px",
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "1px", letterSpacing: "0.3px", lineHeight: 1.2,
          }}
        >
          <span style={{ fontSize: "11px" }}>{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   THE GATE
   ═══════════════════════════════════════════ */
function TheGate({ onUnlock }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [rejectMsg, setRejectMsg] = useState("");
  const [rejectCount, setRejectCount] = useState(0);
  const [typed, setTyped] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const inputRef = useRef(null);
  const tagline = "someone thinks you're worth meeting IRL";

  useEffect(() => {
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setTyped(tagline.slice(0, i + 1));
        i++;
        if (i >= tagline.length) {
          clearInterval(iv);
          setTimeout(() => setShowInput(true), 400);
        }
      }, 35);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    if (!code.trim()) return;
    setStatus("checking");
    setTimeout(() => {
      if (code.toUpperCase().trim() === VALID_CODE) {
        setStatus("unlocked");
        const pieces = Array.from({ length: 30 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.8,
          dur: 1.5 + Math.random() * 1.5,
          color: [P.caramel, P.blush, P.sage, P.coral, P.lavender, P.cream][Math.floor(Math.random() * 6)],
          size: 4 + Math.random() * 6,
        }));
        setConfetti(pieces);
        setTimeout(() => onUnlock(), 2200);
      } else {
        setStatus("rejected");
        setRejectMsg(rejectLines[rejectCount % rejectLines.length]);
        setRejectCount((c) => c + 1);
        setTimeout(() => { setStatus("idle"); setCode(""); inputRef.current?.focus(); }, 1800);
      }
    }, 800);
  };

  return (
    <div style={{ minHeight: "100vh", background: P.gateBlack, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
      <Noise opacity={0.05} />
      {confetti.map((p) => (
        <div key={p.id} style={{ position: "fixed", left: `${p.left}%`, top: 0, width: `${p.size}px`, height: `${p.size}px`, borderRadius: p.size > 7 ? "50%" : "1px", background: p.color, animation: `confettiFall ${p.dur}s ease-in ${p.delay}s both`, zIndex: 999 }} />
      ))}
      <div style={{ position: "absolute", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${P.gateGlow}08, transparent 70%)`, top: "20%", left: "50%", transform: "translateX(-50%)", animation: "pulse 4s ease infinite" }} />

      <div style={{ animation: "fadeSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both", textAlign: "center", marginBottom: "48px" }}>
        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "36px", fontWeight: 400, color: P.cream, margin: "0 0 8px", letterSpacing: "-1px" }}>come offline</h1>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted + "80", letterSpacing: "4px", textTransform: "uppercase" }}>bangalore</div>
      </div>

      <div style={{ minHeight: "28px", marginBottom: "40px", animation: "fadeIn 0.5s ease 0.8s both" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", color: P.muted, margin: 0, textAlign: "center", fontStyle: "italic" }}>
          {typed}
          {typed.length < tagline.length && (
            <span style={{ display: "inline-block", width: "2px", height: "16px", background: P.caramel, marginLeft: "2px", verticalAlign: "middle", animation: "blink 0.8s step-end infinite" }} />
          )}
        </p>
      </div>

      {status === "unlocked" ? (
        <div style={{ textAlign: "center", animation: "scaleIn 0.5s cubic-bezier(0.16,1,0.3,1) both", position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", width: "60px", height: "60px", borderRadius: "50%", border: `2px solid ${P.caramel}`, transform: "translate(-50%,-50%)", animation: "unlockPulse 1.2s ease-out infinite" }} />
          <div style={{ fontSize: "48px", marginBottom: "20px", animation: "float 2s ease infinite" }}>{"\u{1F6AA}"}</div>
          <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "24px", color: P.cream, margin: "0 0 8px" }}>you're in.</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, margin: 0 }}>welcome to the other side.</p>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "320px", opacity: showInput ? 1 : 0, transform: showInput ? "translateY(0)" : "translateY(16px)", transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ position: "relative", marginBottom: "16px", animation: status === "rejected" ? "shake 0.4s ease" : "none" }}>
            <input
              ref={inputRef} type="text" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="enter invite code" maxLength={12} disabled={status === "checking"}
              style={{ width: "100%", padding: "18px 20px", borderRadius: "16px", border: `1.5px solid ${status === "rejected" ? P.terracotta + "80" : status === "checking" ? P.caramel + "60" : P.muted + "25"}`, background: P.gateDark, fontFamily: "'DM Mono', monospace", fontSize: "16px", letterSpacing: "3px", color: P.cream, textAlign: "center", textTransform: "uppercase", outline: "none", transition: "all 0.3s ease", animation: status === "checking" ? "gateGlow 1.5s ease infinite" : "none" }}
            />
            {status === "checking" && <div style={{ position: "absolute", bottom: "-2px", left: "10%", right: "10%", height: "2px", borderRadius: "1px", background: `linear-gradient(90deg, transparent, ${P.caramel}, transparent)`, backgroundSize: "200% 100%", animation: "shimmer 1s ease infinite" }} />}
          </div>
          {status === "rejected" && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.terracotta, textAlign: "center", margin: "0 0 16px", animation: "fadeSlideDown 0.3s ease both", fontStyle: "italic" }}>{rejectMsg}</p>}
          <button onClick={submit} disabled={status === "checking" || !code.trim()} style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "none", background: code.trim() ? P.cream : P.muted + "20", color: code.trim() ? P.gateBlack : P.muted + "60", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, cursor: code.trim() ? "pointer" : "default", transition: "all 0.3s ease", opacity: status === "checking" ? 0.5 : 1 }}>
            {status === "checking" ? "checking..." : "unlock \u2192"}
          </button>
          {rejectCount >= 3 && status === "idle" && <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "40", textAlign: "center", marginTop: "24px", animation: "fadeIn 0.5s ease both" }}>psst... the code is what we want you to come.</p>}
        </div>
      )}

      <div style={{ position: "absolute", bottom: "32px", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "30", letterSpacing: "2px", textTransform: "uppercase" }}>invite only · est. 2026</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GLITCH TEXT — FIXED (safe characters only)
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
    <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: isGlitching ? P.terracotta : P.nearBlack, transition: "color 0.2s", position: "relative" }}>
      {displayText}
      {isGlitching && (
        <React.Fragment>
          <span style={{ position: "absolute", left: "-2px", top: 0, color: P.terracotta, opacity: 0.6, clipPath: "inset(10% 0 60% 0)" }}>{displayText}</span>
          <span style={{ position: "absolute", left: "2px", top: 0, color: P.caramel, opacity: 0.4, clipPath: "inset(50% 0 10% 0)" }}>{displayText}</span>
        </React.Fragment>
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
   EVENT CARD
   ═══════════════════════════════════════════ */
function EventCard({ event, index, onOpen }) {
  return (
    <div
      onClick={() => { if (onOpen) onOpen(event); }}
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
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.softBlack }}>{"\u{1F4C5}"} {event.date}</div>
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
   EVENT FEED
   ═══════════════════════════════════════════ */
function EventFeed({ onRsvp }) {
  const [detailEvent, setDetailEvent] = useState(null);
  return (
    <div style={{ paddingBottom: "120px" }}>
      <section style={{ padding: "40px 20px 48px", position: "relative" }}>
        <div style={{ position: "absolute", right: "-30px", top: "20px", width: "120px", height: "120px", borderRadius: "50%", background: `radial-gradient(circle, ${P.caramel}15, transparent)`, animation: "float 6s ease-in-out infinite" }} />
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, marginBottom: "16px" }}>invite only · est. 2026</p>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "38px", fontWeight: 400, color: P.nearBlack, margin: "0 0 12px", lineHeight: 1.15, letterSpacing: "-1px", maxWidth: "340px" }}>
          <GlitchText />
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.7, maxWidth: "320px", margin: 0 }}>
          a community for people who still believe the best connections happen face to face. <span style={{ color: P.caramel }}>bangalore chapter.</span>
        </p>
      </section>

      <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>upcoming events</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.caramel }}>3 events</span>
      </div>

      <section style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <EventCard event={eventData} index={0} onOpen={setDetailEvent} />
        {moreEvents.map((e, i) => (
          <EventCard key={e.id} event={e} index={i + 1} onOpen={setDetailEvent} />
        ))}
        <div style={{ border: `1.5px dashed ${P.sand}`, borderRadius: "20px", padding: "32px 24px", textAlign: "center", animation: "fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.48s both" }}>
          <span style={{ fontSize: "28px", display: "block", marginBottom: "12px" }}>{"\u{1F440}"}</span>
          <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "18px", color: P.warmBrown, margin: "0 0 4px" }}>more coming soon</p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>we're cooking something unhinged</p>
        </div>
      </section>
      {detailEvent && <EventDetail event={detailEvent} onClose={() => setDetailEvent(null)} onRsvp={onRsvp} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ANTI-FEED COUNTDOWN
   ═══════════════════════════════════════════ */
function AntiFeed({ onVenueReveal }) {
  const [quote] = useState(disconnectQuotes[Math.floor(Math.random() * disconnectQuotes.length)]);
  const [time, setTime] = useState({ d: 6, h: 14, m: 32, s: 47 });

  useEffect(() => {
    const iv = setInterval(() => {
      setTime((p) => {
        let { d, h, m, s } = p;
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 23; d--; } if (d < 0) d = 0;
        return { d, h, m, s };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const venueProgress = ((10 - time.d) / 10) * 100;

  return (
    <div style={{ minHeight: "100vh", background: P.cream, padding: "60px 20px 120px", animation: "fadeIn 0.6s ease both" }}>
      <Noise />
      <div style={{ textAlign: "center", marginBottom: "48px", animation: "fadeSlideUp 0.6s ease 0.1s both" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: P.sage + "20", padding: "8px 16px", borderRadius: "100px", marginBottom: "24px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: P.sage, animation: "breathe 3s ease infinite" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#6B7A63" }}>rsvp accepted</span>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "32px", fontWeight: 400, color: P.nearBlack, margin: "0 0 4px" }}>{eventData.title} {eventData.emoji}</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, margin: 0 }}>{eventData.date} · {eventData.time}</p>
      </div>

      <div style={{ background: "#fff", borderRadius: "24px", padding: "32px 24px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(26,23,21,0.04), 0 8px 32px rgba(26,23,21,0.06)", animation: "fadeSlideUp 0.6s ease 0.2s both" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, display: "block", textAlign: "center", marginBottom: "20px" }}>countdown</span>
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
          {[{ val: time.d, l: "days" }, { val: time.h, l: "hrs" }, { val: time.m, l: "min" }, { val: time.s, l: "sec" }].map((u, i) => (
            <div key={i} style={{ textAlign: "center", minWidth: "64px" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "36px", fontWeight: 500, color: P.nearBlack, lineHeight: 1, marginBottom: "6px", animation: i === 3 ? "tickTock 1s ease infinite" : "none" }}>{String(u.val).padStart(2, "0")}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted, letterSpacing: "1px", textTransform: "uppercase" }}>{u.l}</div>
            </div>
          ))}
        </div>
        <div style={{ height: "1px", background: P.sand, margin: "0 -8px 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted }}>venue reveal</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.caramel }}>{time.d} days to go</span>
        </div>
        <div style={{ height: "6px", background: P.sand, borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(venueProgress, 100)}%`, height: "100%", background: `linear-gradient(90deg, ${P.caramel}, ${P.deepCaramel})`, borderRadius: "3px" }} />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: "20px", padding: "28px 24px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(26,23,21,0.03)", animation: "fadeSlideUp 0.6s ease 0.3s both", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20px", right: "-10px", fontSize: "80px", opacity: 0.05 }}>{"\u{1F4AD}"}</div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>daily reminder</span>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "20px", color: P.nearBlack, margin: "0 0 8px", lineHeight: 1.4, fontStyle: "italic" }}>"{quote.text}"</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>{quote.author}</p>
      </div>

      <div style={{ background: P.nearBlack, borderRadius: "20px", padding: "24px", marginBottom: "20px", animation: "fadeSlideUp 0.6s ease 0.4s both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "20px" }}>{"\u{1F4F1}"}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted }}>screen time today</span>
        </div>
        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", color: P.cream, margin: "0 0 6px" }}>too much.</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted + "90", margin: 0 }}>close the app. go outside. we'll ping you when it's time.</p>
      </div>

      <button onClick={onVenueReveal} style={{ width: "100%", padding: "20px", borderRadius: "20px", border: `1.5px dashed ${P.caramel}40`, background: P.caramel + "08", cursor: "pointer", textAlign: "center", transition: "all 0.3s", animation: "fadeSlideUp 0.6s ease 0.5s both" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = P.caramel + "15"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = P.caramel + "08"; }}
      >
        <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>{"\u2709\uFE0F"}</span>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, margin: "0 0 4px", fontWeight: 500 }}>venue sealed</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>tap to peek (demo)</p>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VENUE REVEAL
   ═══════════════════════════════════════════ */
function VenueReveal({ onContinue }) {
  const [phase, setPhase] = useState("sealed");
  const [scratchPct, setScratchPct] = useState(0);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (phase !== "sealed") return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const w = (c.width = c.offsetWidth * 2);
    const h = (c.height = c.offsetHeight * 2);
    ctx.scale(2, 2);
    const g = ctx.createLinearGradient(0, 0, w / 2, h / 2);
    g.addColorStop(0, P.caramel); g.addColorStop(0.5, P.deepCaramel); g.addColorStop(1, P.caramel);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc(Math.random() * (w / 2), Math.random() * (h / 2), Math.random() * 30 + 10, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "600 12px 'DM Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText("SCRATCH TO REVEAL", c.offsetWidth / 2, c.offsetHeight / 2 - 8);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "10px 'DM Mono', monospace";
    ctx.fillText("your venue awaits", c.offsetWidth / 2, c.offsetHeight / 2 + 12);
  }, [phase]);

  const scratch = (e) => {
    if (phase !== "sealed") return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); const r = c.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(cx - r.left, cy - r.top, 24, 0, Math.PI * 2); ctx.fill();
    const id = ctx.getImageData(0, 0, c.width, c.height);
    let t = 0; for (let i = 3; i < id.data.length; i += 4) if (id.data[i] === 0) t++;
    const pct = (t / (id.data.length / 4)) * 100;
    setScratchPct(pct);
    if (pct > 45) { setPhase("revealing"); setTimeout(() => setPhase("revealed"), 600); }
  };

  return (
    <div style={{ minHeight: "100vh", background: P.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px 120px" }}>
      <Noise />
      {phase === "sealed" && (
        <div style={{ textAlign: "center", animation: "fadeSlideUp 0.5s ease both", width: "100%", maxWidth: "360px" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px", animation: "float 3s ease infinite" }}>{"\u2709\uFE0F"}</div>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.nearBlack, margin: "0 0 8px" }}>your venue is here</h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, margin: "0 0 32px" }}>scratch the card to reveal where it's going down</p>
          <div style={{ position: "relative", width: "100%", height: "200px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 20px rgba(26,23,21,0.1)", animation: "goldenPulse 2s ease infinite", cursor: "crosshair" }}>
            <div style={{ position: "absolute", inset: 0, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
              <span style={{ fontSize: "28px", marginBottom: "12px" }}>{"\u{1F4CD}"}</span>
              <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "24px", color: P.nearBlack, margin: "0 0 4px" }}>{eventData.venue.name}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, margin: "0 0 2px" }}>{eventData.venue.area}</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>{eventData.venue.address}</p>
            </div>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none" }}
              onMouseDown={() => { isDrawing.current = true; }} onMouseMove={(e) => { if (isDrawing.current) scratch(e); }} onMouseUp={() => { isDrawing.current = false; }}
              onTouchStart={() => { isDrawing.current = true; }} onTouchMove={(e) => { e.preventDefault(); scratch(e); }} onTouchEnd={() => { isDrawing.current = false; }}
            />
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "60", marginTop: "16px" }}>{Math.round(scratchPct)}% scratched</p>
        </div>
      )}
      {phase === "revealing" && <div style={{ textAlign: "center", animation: "scaleIn 0.3s ease both" }}><div style={{ fontSize: "48px", animation: "float 1s ease infinite" }}>{"\u2728"}</div></div>}
      {phase === "revealed" && (
        <div style={{ textAlign: "center", animation: "scaleIn 0.5s cubic-bezier(0.16,1,0.3,1) both", width: "100%", maxWidth: "360px" }}>
          <div style={{ background: "linear-gradient(135deg, #FFF8F0 0%, #FFF 30%, #FFF8F0 100%)", borderRadius: "24px", padding: "36px 28px", boxShadow: "0 4px 20px rgba(212,165,116,0.15), 0 12px 48px rgba(26,23,21,0.08)", border: `1.5px solid ${P.caramel}30`, position: "relative", overflow: "hidden", marginBottom: "24px", animation: "gentleDrift 8s ease infinite" }}>
            <div style={{ position: "absolute", top: 0, left: "-100%", width: "60%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(212,165,116,0.08), transparent)", animation: "revealShine 3s ease 0.5s both" }} />
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "3px", color: P.caramel, marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ width: "20px", height: "1px", background: P.caramel }} />golden ticket<span style={{ width: "20px", height: "1px", background: P.caramel }} />
            </div>
            <span style={{ fontSize: "36px", display: "block", marginBottom: "16px" }}>{"\u{1F4CD}"}</span>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "30px", fontWeight: 400, color: P.nearBlack, margin: "0 0 6px" }}>{eventData.venue.name}</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, margin: "0 0 4px" }}>{eventData.venue.area}</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.muted, margin: "0 0 28px" }}>{eventData.venue.address}</p>
            <div style={{ height: "1px", background: P.sand, margin: "0 -12px 24px" }} />
            <div style={{ display: "flex", justifyContent: "center", gap: "32px" }}>
              <div style={{ textAlign: "center" }}><span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>date</span><span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.nearBlack, fontWeight: 500 }}>{eventData.date}</span></div>
              <div style={{ width: "1px", background: P.sand }} />
              <div style={{ textAlign: "center" }}><span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "6px" }}>pickup</span><span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.nearBlack, fontWeight: 500 }}>{eventData.pickupTime}</span></div>
            </div>
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted + "80", margin: "0 0 20px", fontStyle: "italic" }}>screenshot this. last approved phone use. {"\u{1F4F8}"}</p>
          <button onClick={onContinue} style={{ padding: "14px 32px", borderRadius: "100px", border: "none", background: P.nearBlack, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>{"can't wait \u2192"}</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DAY OF
   ═══════════════════════════════════════════ */
function DayOf({ onGoDark }) {
  return (
    <div style={{ minHeight: "100vh", background: P.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
      <Noise />
      <div style={{ textAlign: "center", animation: "fadeSlideUp 0.6s ease both", maxWidth: "340px", width: "100%" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: P.terracotta + "15", padding: "8px 16px", borderRadius: "100px", marginBottom: "32px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: P.terracotta, animation: "pulse 1.5s ease infinite" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.terracotta, fontWeight: 500 }}>today's the day</span>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "34px", fontWeight: 400, color: P.nearBlack, margin: "0 0 8px" }}>{eventData.title} {eventData.emoji}</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, margin: "0 0 40px" }}>{eventData.time}</p>

        <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", marginBottom: "16px", border: `1px solid ${P.sand}`, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: P.blush + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{"\u{1F4CD}"}</div>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 500, color: P.nearBlack, margin: "0 0 2px" }}>{eventData.venue.name}</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.muted, margin: 0 }}>{eventData.venue.area}</p>
            </div>
          </div>
          <div style={{ height: "1px", background: P.sand, marginBottom: "16px" }} />
          <div style={{ display: "flex", gap: "24px" }}>
            <div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "4px" }}>pickup</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.nearBlack, fontWeight: 500 }}>{eventData.pickupTime}</span>
            </div>
            <div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: P.muted, display: "block", marginBottom: "4px" }}>from</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.nearBlack }}>Indiranagar Metro</span>
            </div>
          </div>
        </div>

        <div style={{ background: P.blush + "15", borderRadius: "14px", padding: "14px 18px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>{"\u{1F457}"}</span>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.warmBrown, margin: 0 }}>dress code: whatever makes you feel <span style={{ fontWeight: 600 }}>unstoppable</span></p>
        </div>

        <button onClick={onGoDark} style={{ width: "100%", padding: "20px", borderRadius: "20px", border: "none", background: P.nearBlack, color: "#fff", cursor: "pointer", transition: "all 0.3s" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "17px", fontWeight: 500, display: "block", marginBottom: "4px" }}>i'm ready, pick me up</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.cream + "80" }}>last chance to use your phone</span>
        </button>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted + "60", marginTop: "20px" }}>see you on the other side {"\u270C\uFE0F"}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GO DARK
   ═══════════════════════════════════════════ */
function GoDark({ onMorningAfter }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 300); }, []);

  return (
    <div style={{ minHeight: "100vh", background: P.nearBlack, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
      <Noise opacity={0.04} />
      <div style={{ position: "absolute", width: "250px", height: "250px", borderRadius: "50%", background: `radial-gradient(circle, ${P.caramel}06, transparent)`, animation: "slowPulse 6s ease infinite" }} />
      <div style={{ textAlign: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: "all 1.2s cubic-bezier(0.16,1,0.3,1)", maxWidth: "300px" }}>
        <div style={{ fontSize: "48px", marginBottom: "32px", animation: "breathe 4s ease infinite" }}>{"\u{1F319}"}</div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "32px", fontWeight: 400, color: P.cream, margin: "0 0 16px" }}>enjoy tonight.</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.muted, margin: "0 0 12px", lineHeight: 1.7 }}>your ride is on the way.<br />the rest happens offline.</p>
        <div style={{ width: "40px", height: "1px", background: P.muted + "30", margin: "28px auto" }} />
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted + "50", margin: "0 0 40px", lineHeight: 1.8 }}>this app has done its job.<br />now go do yours —<br />be present.</p>
        {onMorningAfter && (
          <button onClick={onMorningAfter} style={{ padding: "12px 24px", borderRadius: "100px", border: `1px solid ${P.muted}25`, background: "transparent", color: P.muted + "70", fontFamily: "'DM Mono', monospace", fontSize: "11px", cursor: "pointer", transition: "all 0.3s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = P.caramel + "50"; e.currentTarget.style.color = P.cream; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = P.muted + "25"; e.currentTarget.style.color = P.muted + "70"; }}
          >{"skip to morning after (demo) \u2192"}</button>
        )}
      </div>
      <div style={{ position: "absolute", bottom: "40px", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "16px", color: P.muted + "25" }}>come offline</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   POLAROID CARD
   ═══════════════════════════════════════════ */
function PolaroidCard({ polaroid, index }) {
  const bgColors = ["#F2E8DC", "#EDE4D8", "#F0E6D4", "#E8DFD2", "#F4EAE0"];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "0 0 240px", background: bgColors[index % bgColors.length],
        borderRadius: "4px", padding: "12px 12px 40px",
        boxShadow: "0 4px 16px rgba(26,23,21,0.1), 0 2px 4px rgba(26,23,21,0.06)",
        transform: hovered ? "rotate(0deg) scale(1.04) translateY(-8px)" : `rotate(${polaroid.rotation}deg)`,
        transition: "transform 0.3s ease", cursor: "default",
        animation: `fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 0.12}s both`,
      }}
    >
      <div style={{ width: "100%", height: "180px", background: `linear-gradient(135deg, ${polaroid.color}40, ${polaroid.color}80)`, borderRadius: "2px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent 60%)" }} />
        <span style={{ fontSize: "40px", filter: "grayscale(20%)" }}>{eventData.emoji}</span>
        <div style={{ position: "absolute", bottom: "8px", right: "8px", fontFamily: "'DM Mono', monospace", fontSize: "8px", color: "rgba(255,255,255,0.6)", background: "rgba(0,0,0,0.15)", padding: "2px 6px", borderRadius: "4px" }}>{polaroid.who}</div>
      </div>
      <p style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", color: P.darkBrown, margin: 0, lineHeight: 1.3, textAlign: "center" }}>{polaroid.caption}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MEMORIES — THE MORNING AFTER
   ═══════════════════════════════════════════ */
function Memories({ onReconnect }) {
  const [visibleQuotes, setVisibleQuotes] = useState(3);

  return (
    <div style={{ minHeight: "100vh", background: P.cream, paddingBottom: "120px" }}>
      <Noise />
      <div style={{ padding: "60px 20px 40px", textAlign: "center", animation: "fadeSlideUp 0.6s ease both" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: P.lavender + "25", padding: "8px 16px", borderRadius: "100px", marginBottom: "20px" }}>
          <span style={{ fontSize: "12px" }}>{"\u2600\uFE0F"}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#7B6B8F", letterSpacing: "0.5px" }}>the morning after</span>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "30px", fontWeight: 400, color: P.nearBlack, margin: "0 0 8px" }}>last night happened.</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, margin: 0 }}>here's what we remember.</p>
      </div>

      {/* Polaroid Gallery */}
      <div style={{ marginBottom: "48px" }}>
        <div style={{ padding: "0 20px", marginBottom: "16px" }}><span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>polaroids</span></div>
        <div style={{ display: "flex", gap: "16px", overflowX: "auto", padding: "8px 20px 24px", WebkitOverflowScrolling: "touch" }}>
          {polaroids.map((p, i) => <PolaroidCard key={p.id} polaroid={p} index={i} />)}
        </div>
      </div>

      {/* Overheard At */}
      <div style={{ padding: "0 20px", marginBottom: "48px" }}>
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted }}>overheard at galentines</span>
          <span style={{ fontSize: "14px" }}>{"\u{1F442}"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {overheardQuotes.slice(0, visibleQuotes).map((q, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "18px", padding: "20px", borderLeft: `3px solid ${accentColors[i % accentColors.length]}`, animation: `slideFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s both`, boxShadow: "0 1px 4px rgba(26,23,21,0.03)" }}>
              <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "18px", color: P.nearBlack, margin: "0 0 8px", lineHeight: 1.4, fontStyle: "italic" }}>"{q.quote}"</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted, margin: 0, letterSpacing: "0.5px" }}>{"\u2014"} {q.context}</p>
            </div>
          ))}
        </div>
        {visibleQuotes < overheardQuotes.length && (
          <button onClick={() => setVisibleQuotes(overheardQuotes.length)} style={{ display: "block", margin: "16px auto 0", padding: "10px 20px", borderRadius: "100px", border: `1px solid ${P.sand}`, background: "transparent", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, cursor: "pointer" }}>
            show more ({overheardQuotes.length - visibleQuotes} more)
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ padding: "0 20px", marginBottom: "48px" }}>
        <div style={{ background: P.nearBlack, borderRadius: "24px", padding: "28px", animation: "fadeSlideUp 0.6s ease 0.3s both" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, display: "block", marginBottom: "20px" }}>the night in numbers</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {[
              { num: "38", label: "people showed up", emoji: "\u{1F465}" },
              { num: "0", label: "phones used", emoji: "\u{1F4F5}" },
              { num: "127", label: "mimosas consumed", emoji: "\u{1F942}" },
              { num: "6hrs", label: "of pure connection", emoji: "\u2728" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <span style={{ fontSize: "18px", display: "block", marginBottom: "6px" }}>{s.emoji}</span>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "28px", fontWeight: 500, color: P.cream, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: P.muted, marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reconnect CTA */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ background: "linear-gradient(135deg, #FFF8F0, #FFF)", borderRadius: "24px", padding: "32px 24px", textAlign: "center", border: `1.5px solid ${P.caramel}20` }}>
          <span style={{ fontSize: "32px", display: "block", marginBottom: "12px" }}>{"\u{1F91D}"}</span>
          <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "22px", fontWeight: 400, color: P.nearBlack, margin: "0 0 8px" }}>who'd you vibe with?</h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, margin: "0 0 6px", lineHeight: 1.6 }}>connect with people you met last night. mutual opt-in only.</p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.coral, margin: "0 0 24px" }}>closes in 47 hours</p>
          <button onClick={onReconnect} style={{ padding: "14px 32px", borderRadius: "100px", border: "none", background: P.nearBlack, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, cursor: "pointer" }}>{"see who was there \u2192"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RECONNECT FLOW
   ═══════════════════════════════════════════ */
function ReconnectFlow({ onVouch }) {
  const [connected, setConnected] = useState({});
  const [matchRevealed, setMatchRevealed] = useState(null);

  const toggle = (name) => {
    const next = { ...connected, [name]: !connected[name] };
    setConnected(next);
    if (name === "Ananya" && next[name]) {
      setTimeout(() => setMatchRevealed("Ananya"), 800);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: P.cream, paddingBottom: "120px" }}>
      <Noise />
      <div style={{ padding: "60px 20px 32px", animation: "fadeSlideUp 0.5s ease both" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: P.caramel + "15", padding: "8px 16px", borderRadius: "100px", marginBottom: "20px" }}>
          <span style={{ fontSize: "12px" }}>{"\u{1F91D}"}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.deepCaramel }}>reconnect</span>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.nearBlack, margin: "0 0 6px" }}>who was there</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, margin: "0 0 4px" }}>tap connect — if they tap too, you'll exchange instagrams.</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.coral, margin: 0 }}>window closes in 47 hours {"\u23F3"}</p>
      </div>

      {/* Match overlay */}
      {matchRevealed && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.3s ease both" }} onClick={() => setMatchRevealed(null)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(14,13,11,0.5)", backdropFilter: "blur(8px)" }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: "28px", padding: "40px 32px", textAlign: "center", maxWidth: "320px", animation: "scaleIn 0.5s cubic-bezier(0.16,1,0.3,1) both" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "48px", marginBottom: "16px", animation: "heartPop 0.6s ease both" }}>{"\u{1F389}"}</div>
            <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "24px", fontWeight: 400, color: P.nearBlack, margin: "0 0 8px" }}>it's a match!</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, margin: "0 0 4px" }}>you and <strong>{matchRevealed}</strong> both want to connect.</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.muted, margin: "0 0 24px" }}>here's their instagram {"\u{1F447}"}</p>
            <div style={{ background: P.warmWhite, borderRadius: "14px", padding: "16px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `linear-gradient(135deg, ${P.caramel}, ${P.coral})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{"\u2728"}</div>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: P.nearBlack, margin: 0 }}>{matchRevealed}</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: P.caramel, margin: 0 }}>@{matchRevealed.toLowerCase()}_offline</p>
              </div>
            </div>
            <button onClick={() => setMatchRevealed(null)} style={{ padding: "12px 24px", borderRadius: "100px", border: "none", background: P.nearBlack, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>{"nice! \u{1F64C}"}</button>
          </div>
        </div>
      )}

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {attendees.map((a, i) => {
          const isConn = connected[a.name];
          return (
            <div key={i} style={{ background: "#fff", borderRadius: "18px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", animation: `slideFadeIn 0.4s ease ${i * 0.06}s both`, boxShadow: "0 1px 4px rgba(26,23,21,0.03)", border: `1px solid ${isConn ? P.caramel + "30" : P.sand}`, transition: "border-color 0.3s" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: accentColors[i % accentColors.length] + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>{a.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: P.nearBlack, margin: "0 0 3px" }}>{a.name}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: P.muted, margin: 0 }}>{a.fact}</p>
              </div>
              <button onClick={() => toggle(a.name)} style={{ padding: "8px 16px", borderRadius: "100px", border: "none", background: isConn ? P.sage + "20" : P.nearBlack, color: isConn ? "#6B7A63" : "#fff", fontFamily: "'DM Mono', monospace", fontSize: "11px", cursor: "pointer", transition: "all 0.3s", whiteSpace: "nowrap", flexShrink: 0 }}>
                {isConn ? "sent \u2713" : "connect"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <button onClick={onVouch} style={{ width: "100%", padding: "20px", borderRadius: "20px", border: `1.5px dashed ${P.caramel}40`, background: P.caramel + "08", cursor: "pointer", textAlign: "center", transition: "all 0.3s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = P.caramel + "15"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = P.caramel + "08"; }}
        >
          <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>{"\u{1F39F}\uFE0F"}</span>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, margin: "0 0 4px", fontWeight: 500 }}>you've earned vouch codes</p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>{"bring someone worthy \u2192"}</p>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VOUCH CODES
   ═══════════════════════════════════════════ */
function VouchCodes() {
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState(null);
  const codes = [
    { id: 1, code: "PRIYA-SENT-YOU" },
    { id: 2, code: "VIBES-ONLY-26" },
  ];

  const copyCode = (code) => { setCopied(code); setTimeout(() => setCopied(null), 2000); };

  return (
    <div style={{ minHeight: "100vh", background: P.cream, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px 120px" }}>
      <Noise />
      <div style={{ textAlign: "center", marginBottom: "40px", animation: "fadeSlideUp 0.6s ease both", maxWidth: "340px" }}>
        <div style={{ animation: "stampReveal 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: `linear-gradient(135deg, ${P.caramel}20, ${P.deepCaramel}20)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "36px", border: `2px solid ${P.caramel}30` }}>{"\u{1F39F}\uFE0F"}</div>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.nearBlack, margin: "0 0 8px" }}>you've been to the other side.</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, margin: "0 0 6px" }}>now bring someone worthy.</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.muted, margin: 0 }}>you're vouching they're worth meeting IRL.</p>
      </div>

      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {codes.map((c, i) => (
          <div key={c.id} style={{ background: "linear-gradient(135deg, #FFF8F0, #FFF)", borderRadius: "20px", padding: "28px 24px", border: `1.5px solid ${P.caramel}20`, animation: `fadeSlideUp 0.5s ease ${i * 0.15}s both`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: `radial-gradient(circle, ${P.caramel}08, transparent)`, borderRadius: "50%" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted }}>vouch code #{i + 1}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.sage, background: P.sage + "15", padding: "3px 10px", borderRadius: "100px" }}>unused</span>
            </div>
            {revealed[c.id] ? (
              <div style={{ animation: "codeReveal 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
                <div style={{ background: P.gateDark, borderRadius: "12px", padding: "16px", textAlign: "center", marginBottom: "16px" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", color: P.cream, margin: 0, letterSpacing: "4px", fontWeight: 500 }}>{c.code}</p>
                </div>
                <button onClick={() => copyCode(c.code)} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: copied === c.code ? P.sage : P.nearBlack, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer", transition: "all 0.3s", fontWeight: 500 }}>
                  {copied === c.code ? "copied! now share it \u2713" : "copy code"}
                </button>
              </div>
            ) : (
              <button onClick={() => setRevealed((p) => ({ ...p, [c.id]: true }))} style={{ width: "100%", padding: "16px", borderRadius: "14px", border: `1.5px dashed ${P.caramel}50`, background: P.caramel + "08", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, transition: "all 0.3s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = P.caramel + "15"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = P.caramel + "08"; }}
              >tap to reveal code</button>
            )}
          </div>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: "360px", marginTop: "32px", animation: "fadeSlideUp 0.5s ease 0.4s both" }}>
        <div style={{ background: "#fff", borderRadius: "18px", padding: "24px", border: `1px solid ${P.sand}` }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "16px" }}>the vouch rules</span>
          {[
            { icon: "\u{1F3AF}", text: "each code works once. choose wisely." },
            { icon: "\u{1F91D}", text: "you're vouching they're good people." },
            { icon: "\u{1F512}", text: "if they're weird, it's on you." },
            { icon: "\u267B\uFE0F", text: "attend more events = earn more codes." },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: i < 3 ? "14px" : 0 }}>
              <span style={{ fontSize: "14px", flexShrink: 0, marginTop: "1px" }}>{r.icon}</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.warmBrown, margin: 0, lineHeight: 1.5 }}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted + "50", marginTop: "24px", textAlign: "center", fontStyle: "italic" }}>
        "someone thinks you're worth meeting IRL"<br />— the message they'll see
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HEADER + NAV
   ═══════════════════════════════════════════ */
function Header() {
  return (
    <header style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 36, zIndex: 50, background: `linear-gradient(to bottom, ${P.cream} 70%, transparent)`, paddingBottom: "16px" }}>
      <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "22px", fontWeight: 400, color: P.nearBlack, margin: 0 }}>come offline</h1>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", background: P.sage + "30", padding: "6px 12px", borderRadius: "100px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: P.sage, animation: "pulse 2s ease infinite" }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#6B7A63" }}>bangalore</span>
      </div>
    </header>
  );
}

function BottomNav({ active, setActive, onChat }) {
  const items = [
    { id: "events", label: "events", icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="12" cy="16" r="1.5" fill={c} stroke="none" /></svg> },
    { id: "chat", label: "chat", icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { id: "profile", label: "you", icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></svg> },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "430px", background: "rgba(250,246,240,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: `1px solid ${P.sand}`, display: "flex", justifyContent: "space-around", padding: "8px 0 28px", zIndex: 100 }}>
      {items.map((item) => (
        <button key={item.id} onClick={() => { if (item.id === "chat") onChat?.(); else setActive(item.id); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "8px 20px" }}>
          {item.icon(active === item.id ? P.nearBlack : P.muted)}
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: active === item.id ? P.nearBlack : P.muted, fontWeight: active === item.id ? 500 : 400 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ACCEPTANCE SCREEN (NEW)
   ═══════════════════════════════════════════ */
function AcceptanceScreen({ onContinue }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setTimeout(() => setPhase(1), 600);
    setTimeout(() => setPhase(2), 1800);
    setTimeout(() => setPhase(3), 3000);
  }, []);
  const rules = [
    { icon: "\u{1F91D}", text: "be kind. be real. be present." },
    { icon: "\u{1F3AF}", text: "every person here was curated. respect the room." },
    { icon: "\u{1F4F5}", text: "some events are phone-free. embrace it." },
    { icon: "\u2728", text: "the best connections happen face to face." },
  ];
  return (
    <div style={{ minHeight: "100vh", background: P.gateBlack, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden" }}>
      <Noise opacity={0.04} />
      <div style={{ position: "absolute", width: "400px", height: "400px", borderRadius: "50%", background: `radial-gradient(circle, ${P.caramel}06, transparent 70%)`, top: "30%", left: "50%", transform: "translate(-50%, -50%)", animation: "welcomeGlow 4s ease infinite" }} />
      <div style={{ textAlign: "center", maxWidth: "340px", position: "relative", zIndex: 2 }}>
        <div style={{ opacity: phase >= 0 ? 1 : 0, transform: phase >= 0 ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ fontSize: "56px", marginBottom: "24px", animation: phase >= 1 ? "float 3s ease infinite" : "none" }}>{"\u{1F30D}"}</div>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "32px", fontWeight: 400, color: P.cream, margin: "0 0 8px", letterSpacing: "-1px" }}>welcome to come offline.</h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.muted, margin: 0, lineHeight: 1.7 }}>you're part of the community now. here's what that means.</p>
        </div>
        {phase >= 2 && (
          <div style={{ marginTop: "40px", animation: "fadeSlideUp 0.6s ease both" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
              {rules.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start", animation: `fadeSlideUp 0.5s ease ${i * 0.12}s both` }}>
                  <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "2px" }}>{r.icon}</span>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted + "cc", margin: 0, lineHeight: 1.6 }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {phase >= 3 && (
          <div style={{ marginTop: "40px", animation: "fadeSlideUp 0.6s ease both" }}>
            <button onClick={onContinue} style={{ padding: "18px 40px", borderRadius: "100px", border: "none", background: P.cream, color: P.gateBlack, fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 500, cursor: "pointer", transition: "all 0.3s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(212,165,116,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >{"show me what's happening \u2192"}</button>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: P.muted + "50", marginTop: "14px" }}>the fun part starts now</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EVENT DETAIL VIEW (NEW)
   ═══════════════════════════════════════════ */
function EventDetail({ event, onClose, onRsvp }) {
  if (!event) return null;
  const zones = event.zones || eventData.zones;
  const desc = event.description || eventData.description;
  const dressCode = event.dressCode || "whatever makes you feel unstoppable";
  const includes = event.includes || ["pickup & drop", "food & drinks", "curated experience"];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease both" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,9,7,0.5)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "430px", maxHeight: "90vh", background: P.cream, borderRadius: "24px 24px 0 0", overflow: "hidden", animation: "chatSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
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
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.softBlack }}>{"\u{1F4C5}"} {event.date}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.softBlack }}>{"\u{1F552}"} {event.time}</div>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.7, marginBottom: "28px" }}>{desc}</p>
          <div style={{ marginBottom: "28px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>what's inside</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {zones.map((z, i) => (
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
              {includes.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: event.accentDark, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: event.accent + "12", borderRadius: "14px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>{"\u{1F457}"}</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.warmBrown, margin: 0 }}>dress code: <strong>{dressCode}</strong></p>
          </div>
          <SpotsBar spotsLeft={event.spotsLeft} totalSpots={event.totalSpots} accent={event.accentDark} />
        </div>
        <div style={{ padding: "16px 24px 28px", borderTop: `1px solid ${P.sand}`, background: P.cream }}>
          <button onClick={() => { onRsvp?.(); onClose(); }} style={{ width: "100%", padding: "18px", borderRadius: "16px", border: "none", background: event.spotsLeft === 0 ? P.sand : P.nearBlack, color: event.spotsLeft === 0 ? P.muted : "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 500, cursor: event.spotsLeft === 0 ? "default" : "pointer" }} disabled={event.spotsLeft === 0}>
            {event.spotsLeft === 0 ? "sold out" : "i'm in \u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PROFILE SCREEN (NEW)
   ═══════════════════════════════════════════ */
function ProfileScreen() {
  const badges = [
    { icon: "\u{1F31F}", label: "OG member", desc: "joined in the first 100" },
    { icon: "\u{1F485}", label: "galentines survivor", desc: "Feb 14, 2026" },
    { icon: "\u{1F91D}", label: "connector", desc: "5 mutual matches" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: P.cream, paddingBottom: "120px" }}>
      <Noise />
      <div style={{ padding: "60px 24px 32px", textAlign: "center", animation: "fadeSlideUp 0.6s ease both" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: `linear-gradient(135deg, ${P.caramel}30, ${P.deepCaramel}30)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "36px", border: `3px solid ${P.caramel}25` }}>{"\u2728"}</div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.nearBlack, margin: "0 0 4px" }}>Priya</h2>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: P.muted, margin: "0 0 4px" }}>@priya_offline</p>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", color: P.caramel, margin: "4px 0 0" }}>i AM the opinion</p>
      </div>
      <div style={{ padding: "0 24px", marginBottom: "28px", animation: "fadeSlideUp 0.6s ease 0.1s both" }}>
        <div style={{ display: "flex", justifyContent: "space-around", background: "#fff", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 4px rgba(26,23,21,0.03)" }}>
          {[{ num: "1", label: "events attended" }, { num: "5", label: "connections" }, { num: "2", label: "vouch codes" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "24px", fontWeight: 500, color: P.nearBlack, lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", color: P.muted, marginTop: "4px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 24px", marginBottom: "28px", animation: "fadeSlideUp 0.6s ease 0.2s both" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>badges earned</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {badges.map((b, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 3px rgba(26,23,21,0.03)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: accentColors[i % accentColors.length] + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{b.icon}</div>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: P.nearBlack, margin: "0 0 2px" }}>{b.label}</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 24px", marginBottom: "28px", animation: "fadeSlideUp 0.6s ease 0.3s both" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>events attended</span>
        <div style={{ background: "#fff", borderRadius: "18px", overflow: "hidden", boxShadow: "0 1px 4px rgba(26,23,21,0.03)" }}>
          <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "28px" }}>{"\u{1F485}"}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: P.nearBlack, margin: "0 0 3px" }}>Galentines</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>Feb 14, 2026 {"\u00B7"} The Courtyard</p>
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.sage, background: P.sage + "15", padding: "4px 10px", borderRadius: "100px" }}>attended</span>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 24px", marginBottom: "28px", animation: "fadeSlideUp 0.6s ease 0.4s both" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>upcoming</span>
        <div style={{ border: `1.5px dashed ${P.caramel}30`, borderRadius: "18px", padding: "24px 20px", textAlign: "center" }}>
          <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>{"\u{1F4C5}"}</span>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.warmBrown, margin: "0 0 4px" }}>no upcoming RSVPs</p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, margin: 0 }}>check the events tab</p>
        </div>
      </div>
      <div style={{ padding: "0 24px", animation: "fadeSlideUp 0.6s ease 0.5s both" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "2px", color: P.muted, display: "block", marginBottom: "14px" }}>your vibe check</span>
        <div style={{ background: P.nearBlack, borderRadius: "18px", padding: "24px" }}>
          {[{ q: "loud opinions?", a: "11/10" }, { q: "go-to drink order?", a: "oat cortado, no ice" }, { q: "describe yourself in 3 words", a: "opinions, fries, chaos" }].map((v, i) => (
            <div key={i} style={{ marginBottom: i < 2 ? "18px" : 0 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "1px" }}>{v.q}</p>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", color: P.cream, margin: 0 }}>{v.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   IN-APP CHATBOT (NEW)
   ═══════════════════════════════════════════ */
function InAppChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState([]);
  const endRef = useRef(null);
  const convRef = useRef([]);
  const scroll = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  const add = (text) => { setMessages((p) => [...p, { role: "bot", text, id: Date.now() + Math.random() }]); scroll(); };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        add("hey bestie \u{1F44B} need anything? i can help with events, RSVPs, or just chat.");
        setQr(["upcoming events", "help with my RSVP", "how does this work?", "just vibing"]);
      }, 300);
    }
  }, [isOpen]);

  const send = async (text) => {
    if (!text.trim()) return;
    const t = text.trim(); setInput(""); setQr([]);
    setMessages((p) => [...p, { role: "user", text: t, id: Date.now() }]); scroll();
    convRef.current.push({ role: "user", content: t });
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM_PROMPT + "\nContext: This user is already a member inside the app.", messages: convRef.current }),
      });
      const data = await res.json();
      const reply = data.content?.map((b) => b.type === "text" ? b.text : "").join("") || "hmm something broke. try again?";
      convRef.current.push({ role: "assistant", content: reply });
      const lines = reply.split("\n").filter((l) => l.trim());
      for (let i = 0; i < lines.length; i++) { await new Promise((r) => setTimeout(r, i * 350)); add(lines[i]); }
      const l = reply.toLowerCase();
      if (l.includes("event")) setQr(["tell me more", "RSVP me", "what else?"]);
      else if (l.includes("rsvp") || l.includes("spot")) setQr(["yes please!", "which events?", "maybe later"]);
      else setQr(["upcoming events", "thanks!", "tell me more"]);
    } catch { add("oops, brain glitch. try again?"); }
    setLoading(false);
  };

  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn 0.2s ease both" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,9,7,0.6)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "430px", height: "80vh", maxHeight: "650px", background: P.gateBlack, borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column", overflow: "hidden", animation: "chatSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both", border: `1px solid ${P.muted}15`, borderBottom: "none" }}>
        <div style={{ padding: "18px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${P.muted}12`, background: P.gateDark }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `linear-gradient(135deg, ${P.caramel}30, ${P.deepCaramel}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: `1.5px solid ${P.caramel}25` }}>{"\u{1F30D}"}</div>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, color: P.cream, margin: 0 }}>come offline bot</p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: P.sage }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: P.sage }}>online (ironic, we know)</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: P.muted + "15", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: P.muted, fontSize: "14px" }}>{"\u2715"}</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
              <div style={{ maxWidth: "80%", padding: "11px 15px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? P.cream : P.muted + "12", color: msg.role === "user" ? P.gateBlack : P.cream, fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.5 }}>{msg.text}</div>
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: "4px", padding: "11px 15px", animation: "slideUp 0.2s ease both" }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: P.muted + "50", animation: `dotPulse 1s ease ${i * 0.15}s infinite` }} />)}</div>}
          <div ref={endRef} />
        </div>
        {qr.length > 0 && !loading && (
          <div style={{ padding: "0 14px 6px", display: "flex", gap: "6px", flexWrap: "wrap", animation: "slideUp 0.3s ease 0.1s both" }}>
            {qr.map((q, i) => (
              <button key={i} onClick={() => send(q)} style={{ padding: "7px 12px", borderRadius: "100px", border: `1px solid ${P.caramel}30`, background: P.caramel + "08", color: P.caramel, fontFamily: "'DM Sans', sans-serif", fontSize: "11px", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = P.caramel + "20"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = P.caramel + "08"; }}
              >{q}</button>
            ))}
          </div>
        )}
        <div style={{ padding: "10px 14px 20px", borderTop: `1px solid ${P.muted}10`, display: "flex", gap: "8px", alignItems: "flex-end", background: P.gateDark }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(input); } }} placeholder="ask me anything..." style={{ flex: 1, padding: "12px 16px", borderRadius: "14px", border: `1px solid ${P.muted}15`, background: P.muted + "08", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.cream, outline: "none" }}
            onFocus={(e) => { e.target.style.borderColor = P.caramel + "40"; }}
            onBlur={(e) => { e.target.style.borderColor = P.muted + "15"; }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: input.trim() ? P.cream : P.muted + "15", color: input.trim() ? P.gateBlack : P.muted + "40", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontSize: "16px", flexShrink: 0 }}>{"\u2191"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function App() {
  const [stage, setStage] = useState("gate");
  const [navTab, setNavTab] = useState("events");
  const [chatOpen, setChatOpen] = useState(false);

  const wrap = (bg, children, showHeader = true, showNav = true) => (
    <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", background: bg }}>
      {showHeader && <Header />}
      {children}
      {showNav && <BottomNav active={navTab} setActive={(tab) => { setNavTab(tab); if (tab === "profile") setStage("profile"); else if (tab === "events" && stage === "profile") setStage("feed"); }} onChat={() => setChatOpen(true)} />}
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Styles />
      <DemoSwitcher stage={stage} setStage={(s) => { setStage(s); if (s === "profile") setNavTab("profile"); else setNavTab("events"); }} />

      {stage === "gate" && (
        <div style={{ maxWidth: "430px", margin: "0 auto" }}>
          <TheGate onUnlock={() => setStage("accepted")} />
        </div>
      )}
      {stage === "accepted" && (
        <div style={{ maxWidth: "430px", margin: "0 auto" }}>
          <AcceptanceScreen onContinue={() => setStage("feed")} />
        </div>
      )}
      {stage === "feed" && wrap(P.cream, <EventFeed onRsvp={() => setStage("countdown")} />)}
      {stage === "countdown" && wrap(P.cream, <AntiFeed onVenueReveal={() => setStage("reveal")} />)}
      {stage === "reveal" && (
        <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", background: P.cream }}>
          <VenueReveal onContinue={() => setStage("dayof")} />
        </div>
      )}
      {stage === "dayof" && wrap(P.cream, <DayOf onGoDark={() => setStage("godark")} />, true, false)}
      {stage === "godark" && (
        <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", background: P.nearBlack }}>
          <GoDark onMorningAfter={() => setStage("memories")} />
        </div>
      )}
      {stage === "memories" && wrap(P.cream, <Memories onReconnect={() => setStage("reconnect")} />)}
      {stage === "reconnect" && wrap(P.cream, <ReconnectFlow onVouch={() => setStage("vouch")} />)}
      {stage === "vouch" && (
        <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", background: P.cream }}>
          <Noise />
          <Header />
          <VouchCodes />
        </div>
      )}
      {stage === "profile" && wrap(P.cream, <ProfileScreen />)}

      <InAppChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
