import React, { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════
   PALETTE — matches v5 exactly
   ═══════════════════════════════════════════════ */
const P = {
  cream: "#FAF6F0", warmWhite: "#F5EFE6", sand: "#E8DDD0",
  caramel: "#D4A574", deepCaramel: "#B8845A", terracotta: "#C4704D",
  warmBrown: "#8B6F5A", darkBrown: "#3D2E22",
  nearBlack: "#1A1715", softBlack: "#2C2520",
  muted: "#9B8E82", highlight: "#E6A97E", coral: "#D4836B",
  sage: "#A8B5A0", lavender: "#B8A9C9", blush: "#DBBCAC",
  gateBlack: "#0E0D0B", gateDark: "#161412", gateGlow: "#D4A574",
};

/* ═══════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════ */
const VIBE_OPTIONS = [
  "chaotic good energy", "whisper", "i AM the opinion",
  "my friends fear me", "normal human", "main character energy",
];

const AREA_OPTIONS = [
  "Koramangala", "Indiranagar", "HSR Layout", "Whitefield",
  "JP Nagar", "Jayanagar", "Marathahalli", "Electronic City", "other",
];

const AGE_OPTIONS = ["21-24", "25-28", "29-32", "33+"];

const DRINK_OPTIONS = [
  { label: "chai", emoji: "\u2615" },
  { label: "coffee", emoji: "\u2615" },
  { label: "cocktails", emoji: "\u{1F378}" },
  { label: "wine", emoji: "\u{1F377}" },
  { label: "beer", emoji: "\u{1F37A}" },
  { label: "juice", emoji: "\u{1F9C3}" },
  { label: "water", emoji: "\u{1F4A7}" },
];

const SOURCE_OPTIONS = [
  "friend told me", "instagram", "twitter", "saw it at an event", "other",
];

const AVATAR_GRADIENTS = [
  ["#D4A574", "#C4704D"], ["#B8A9C9", "#8B7BA8"], ["#A8B5A0", "#7A9170"],
  ["#DBBCAC", "#D4836B"], ["#E6A97E", "#B8845A"], ["#D4836B", "#8B6F5A"],
  ["#C4956A", "#3D2E22"], ["#B8A9C9", "#C4704D"],
];

const AVATAR_EMOJIS = ["\u2728", "\u{1F33F}", "\u{1F319}", "\u{1F98B}", "\u{1F525}", "\u{1F3B5}", "\u{1F4AB}", "\u{1F338}"];

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
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
      @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes grain { 0%, 100% { transform: translate(0,0); } 10% { transform: translate(-5%,-10%); } 30% { transform: translate(7%,-25%); } 50% { transform: translate(-15%,10%); } 70% { transform: translate(0%,15%); } 90% { transform: translate(-10%,10%); } }
      @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; } }
      @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px rgba(212,165,116,0); } 50% { box-shadow: 0 0 40px rgba(212,165,116,0.2); } }
      @keyframes scratchShimmer { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      @keyframes moonGlow { 0%, 100% { text-shadow: 0 0 20px rgba(250,246,240,0.2); } 50% { text-shadow: 0 0 40px rgba(250,246,240,0.5), 0 0 80px rgba(250,246,240,0.2); } }
      @keyframes polaroidDrop { 0% { transform: translateY(-40px) rotate(-8deg); opacity: 0; } 60% { transform: translateY(4px) rotate(2deg); opacity: 1; } 100% { transform: translateY(0) rotate(-3deg); opacity: 1; } }
      @keyframes polaroidDrop2 { 0% { transform: translateY(-40px) rotate(5deg); opacity: 0; } 60% { transform: translateY(4px) rotate(-1deg); opacity: 1; } 100% { transform: translateY(0) rotate(4deg); opacity: 1; } }
      @keyframes countdownTick { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      @keyframes slideCardIn { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes slideCardOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-60px); } }
      @keyframes progressFill { from { width: 0%; } to { width: 100%; } }
      @keyframes cardScale { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes checkmark { 0% { transform: scale(0) rotate(-45deg); } 50% { transform: scale(1.2) rotate(-45deg); } 100% { transform: scale(1) rotate(-45deg); } }
      @keyframes dimScreen { from { opacity: 1; filter: brightness(1); } to { opacity: 1; filter: brightness(0.4); } }
      @keyframes feedSlideUp { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      @keyframes gentleBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

      * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; box-sizing: border-box; }
      input::placeholder { color: ${P.sand}60; }
      ::-webkit-scrollbar { display: none; }
    `}</style>
  );
}

function Noise({ opacity = 0.04 }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      opacity, pointerEvents: "none", zIndex: 1000,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      backgroundRepeat: "repeat", animation: "grain 0.5s steps(1) infinite",
    }} />
  );
}

/* ═══════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════ */
function ProgressDots({ total, current, color = P.caramel }) {
  return (
    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? "24px" : "8px", height: "8px",
          borderRadius: "4px", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
          background: i <= current ? color : P.muted + "30",
        }} />
      ))}
    </div>
  );
}

function CardShell({ children, animKey }) {
  return (
    <div key={animKey} style={{
      flex: 1, display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "0 28px",
      animation: "slideCardIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
    }}>
      {children}
    </div>
  );
}

function SkipLink({ onClick, text = "i'll figure it out \u2192" }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", cursor: "pointer",
      fontFamily: "'DM Mono', monospace", fontSize: "11px",
      color: P.muted + "60", letterSpacing: "0.5px",
      padding: "8px 0", textAlign: "center", width: "100%",
    }}>{text}</button>
  );
}

function NextButton({ onClick, disabled, label = "next \u2192" }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "18px", borderRadius: "16px",
      border: "none", cursor: disabled ? "default" : "pointer",
      background: disabled ? P.muted + "15" : P.cream,
      color: disabled ? P.muted + "40" : P.gateBlack,
      fontFamily: "'DM Sans', sans-serif", fontSize: "16px",
      fontWeight: 500, transition: "all 0.3s ease",
      transform: disabled ? "none" : "translateY(0)",
    }}>{label}</button>
  );
}

function MicroLabel({ text = "from your chat" }) {
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: "9px",
      color: P.lavender, letterSpacing: "1px", textTransform: "uppercase",
      background: P.lavender + "15", padding: "2px 8px",
      borderRadius: "4px", marginLeft: "8px",
    }}>{text}</span>
  );
}

/* ═══════════════════════════════════════════════
   PROFILE SETUP CARDS
   ═══════════════════════════════════════════════ */

// Card 0: Intro
function IntroCard({ isChatbot }) {
  return (
    <CardShell animKey="intro">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "24px", animation: "float 3s ease infinite" }}>{"\u270C\uFE0F"}</div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 12px", lineHeight: 1.2 }}>
          {isChatbot ? "we caught some of this from our chat." : "one more thing before the fun starts."}
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.6, margin: 0 }}>
          {isChatbot ? "fix anything that's off. takes 30 seconds." : "tell us who you are. takes 30 seconds."}
        </p>
      </div>
    </CardShell>
  );
}

// Card 1: Avatar
function AvatarCard({ value, onChange }) {
  const [mode, setMode] = useState("pick");
  return (
    <CardShell animKey="avatar">
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, marginBottom: "8px" }}>optional</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 24px" }}>pick your look</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {AVATAR_GRADIENTS.map((g, i) => (
          <button key={i} onClick={() => onChange({ type: "gradient", index: i })} style={{
            width: "100%", aspectRatio: "1", borderRadius: "50%", border: value?.index === i ? `3px solid ${P.caramel}` : "3px solid transparent",
            background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, cursor: "pointer",
            transition: "all 0.3s ease", transform: value?.index === i ? "scale(1.1)" : "scale(1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", boxShadow: value?.index === i ? `0 0 20px ${g[0]}40` : "none",
          }}>
            {AVATAR_EMOJIS[i]}
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <button onClick={() => setMode(mode === "upload" ? "pick" : "upload")} style={{
          background: "none", border: `1px dashed ${P.muted}30`, borderRadius: "12px",
          padding: "12px 20px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px", color: P.muted, width: "100%",
        }}>
          {mode === "upload" ? "\u2190 back to avatars" : "or upload your own photo"}
        </button>
        {mode === "upload" && (
          <div style={{
            marginTop: "12px", padding: "24px", border: `1.5px dashed ${P.muted}25`,
            borderRadius: "16px", animation: "fadeSlideUp 0.3s ease both",
          }}>
            <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>{"\u{1F4F7}"}</span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: P.muted, margin: 0 }}>tap to select from gallery</p>
          </div>
        )}
      </div>
    </CardShell>
  );
}

// Card 2: Name
function NameCard({ value, onChange, prefilled }) {
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 500); }, []);
  return (
    <CardShell animKey="name">
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>
        what should we call you?
        {prefilled && <MicroLabel />}
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 32px" }}>this is how people see you at events</p>
      <input
        ref={inputRef} type="text" value={value} onChange={(e) => onChange(e.target.value.slice(0, 30))}
        placeholder="your name"
        style={{
          width: "100%", padding: "20px 0", border: "none", borderBottom: `2px solid ${value ? P.caramel : P.muted + "30"}`,
          background: "transparent", fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: "32px", color: P.cream, outline: "none", textAlign: "center",
          transition: "border-color 0.3s ease", letterSpacing: "-0.5px",
        }}
      />
      <div style={{ textAlign: "right", marginTop: "8px" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "40" }}>{value.length}/30</span>
      </div>
    </CardShell>
  );
}

// Card 3: Handle
function HandleCard({ name, value, onChange }) {
  const [available, setAvailable] = useState(null);
  const auto = name ? `@${name.toLowerCase().replace(/\s+/g, "_")}_offline` : "@";

  useEffect(() => {
    if (!value && name) onChange(auto);
  }, [name]);

  useEffect(() => {
    if (value && value.length > 2) {
      setAvailable(null);
      const t = setTimeout(() => setAvailable(true), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <CardShell animKey="handle">
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>pick your @</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 32px" }}>your identity in the app. make it you.</p>
      <div style={{ position: "relative" }}>
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))}
          placeholder="@your_handle"
          style={{
            width: "100%", padding: "18px 50px 18px 20px", borderRadius: "16px",
            border: `1.5px solid ${available === true ? P.sage + "60" : available === false ? P.terracotta + "60" : P.muted + "20"}`,
            background: P.gateDark, fontFamily: "'DM Mono', monospace",
            fontSize: "18px", letterSpacing: "1px", color: P.cream,
            textAlign: "center", outline: "none", transition: "all 0.3s ease",
          }}
        />
        {available !== null && (
          <div style={{
            position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)",
            fontSize: "18px", animation: "scaleIn 0.3s ease both",
          }}>
            {available ? "\u2705" : "\u274C"}
          </div>
        )}
      </div>
      {available === true && (
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.sage, textAlign: "center", marginTop: "8px", animation: "fadeIn 0.3s ease both" }}>
          that's yours.
        </p>
      )}
    </CardShell>
  );
}

// Card 4: Vibe Tag
function VibeCard({ value, onChange }) {
  const [custom, setCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  return (
    <CardShell animKey="vibe">
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>pick your vibe</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 28px" }}>how would your friends describe you at a party?</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
        {VIBE_OPTIONS.map((v) => (
          <button key={v} onClick={() => { onChange(v); setCustom(false); }} style={{
            padding: "10px 18px", borderRadius: "100px", border: "none", cursor: "pointer",
            background: value === v ? P.caramel : P.muted + "12",
            color: value === v ? P.gateBlack : P.cream + "90",
            fontFamily: "'Caveat', cursive", fontSize: "16px", fontWeight: 500,
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            transform: value === v ? "scale(1.08)" : "scale(1)",
            boxShadow: value === v ? `0 4px 20px ${P.caramel}40` : "none",
          }}>{v}</button>
        ))}
        <button onClick={() => { setCustom(true); onChange(""); }} style={{
          padding: "10px 18px", borderRadius: "100px", cursor: "pointer",
          border: `1.5px dashed ${custom ? P.caramel : P.muted + "30"}`,
          background: custom ? P.caramel + "15" : "transparent",
          color: custom ? P.caramel : P.muted + "60",
          fontFamily: "'DM Mono', monospace", fontSize: "13px",
          transition: "all 0.3s ease",
        }}>+ write your own</button>
      </div>
      {custom && (
        <div style={{ marginTop: "16px", animation: "fadeSlideUp 0.3s ease both" }}>
          <input
            type="text" value={customText} autoFocus
            onChange={(e) => { const v = e.target.value.slice(0, 25); setCustomText(v); onChange(v); }}
            placeholder="your vibe in 25 chars"
            style={{
              width: "100%", padding: "14px 16px", borderRadius: "12px",
              border: `1.5px solid ${P.caramel}40`, background: P.gateDark,
              fontFamily: "'Caveat', cursive", fontSize: "18px",
              color: P.cream, textAlign: "center", outline: "none",
            }}
          />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "40", textAlign: "right", marginTop: "4px" }}>{customText.length}/25</p>
        </div>
      )}
    </CardShell>
  );
}

// Card 5: Instagram
function InstagramCard({ value, onChange, prefilled }) {
  return (
    <CardShell animKey="insta">
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, marginBottom: "8px" }}>optional</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>
        drop your insta
        {prefilled && <MicroLabel />}
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 32px", lineHeight: 1.5 }}>
        only revealed on mutual match after events. nobody sees this unless you both vibe.
      </p>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontFamily: "'DM Mono', monospace", fontSize: "16px", color: P.muted + "40" }}>@</span>
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30))}
          placeholder="your_handle"
          style={{
            width: "100%", padding: "18px 16px 18px 36px", borderRadius: "16px",
            border: `1.5px solid ${P.muted}20`, background: P.gateDark,
            fontFamily: "'DM Mono', monospace", fontSize: "16px",
            color: P.cream, outline: "none", transition: "border-color 0.3s ease",
          }}
        />
      </div>
    </CardShell>
  );
}

// Card 6: Area
function AreaCard({ value, onChange }) {
  return (
    <CardShell animKey="area">
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>where in bangalore?</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 28px" }}>helps us assign your nearest pickup point</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
        {AREA_OPTIONS.map((a) => (
          <button key={a} onClick={() => onChange(a)} style={{
            padding: "10px 16px", borderRadius: "12px", border: "none", cursor: "pointer",
            background: value === a ? P.caramel : P.muted + "12",
            color: value === a ? P.gateBlack : P.cream + "80",
            fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500,
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            transform: value === a ? "scale(1.05)" : "scale(1)",
          }}>{a}</button>
        ))}
      </div>
    </CardShell>
  );
}

// Card 7: Age Range
function AgeCard({ value, onChange }) {
  return (
    <CardShell animKey="age">
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>how old are you (roughly)?</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 32px" }}>no pressure. range only.</p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        {AGE_OPTIONS.map((a) => (
          <button key={a} onClick={() => onChange(a)} style={{
            padding: "16px 20px", borderRadius: "16px", border: "none", cursor: "pointer",
            background: value === a ? P.caramel : P.muted + "10",
            color: value === a ? P.gateBlack : P.cream + "70",
            fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 500,
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            transform: value === a ? "scale(1.08)" : "scale(1)",
            minWidth: "70px", boxShadow: value === a ? `0 4px 16px ${P.caramel}30` : "none",
          }}>{a}</button>
        ))}
      </div>
    </CardShell>
  );
}

// Card 8: Hot Take
function HotTakeCard({ value, onChange, prefilled }) {
  return (
    <CardShell animKey="hottake">
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, marginBottom: "8px" }}>optional</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>
        the hill you'll die on
        {prefilled && <MicroLabel />}
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 28px" }}>one-liner hot take. shows on your profile. sparks conversation.</p>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value.slice(0, 60))}
        placeholder="pineapple on pizza is elite"
        style={{
          width: "100%", padding: "18px", borderRadius: "16px",
          border: `1.5px solid ${P.muted}20`, background: P.gateDark,
          fontFamily: "'Caveat', cursive", fontSize: "20px",
          color: P.cream, textAlign: "center", outline: "none",
        }}
      />
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "40", textAlign: "right", marginTop: "6px" }}>{value.length}/60</p>
    </CardShell>
  );
}

// Card 9: Drink
function DrinkCard({ value, onChange }) {
  return (
    <CardShell animKey="drink">
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, marginBottom: "8px" }}>optional</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>your go-to drink?</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 28px" }}>helps us plan what to stock</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {DRINK_OPTIONS.map((d) => (
          <button key={d.label} onClick={() => onChange(d.label)} style={{
            padding: "14px 8px", borderRadius: "14px", border: "none", cursor: "pointer",
            background: value === d.label ? P.caramel : P.muted + "10",
            color: value === d.label ? P.gateBlack : P.cream + "70",
            fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            transform: value === d.label ? "scale(1.08)" : "scale(1)",
          }}>
            <span style={{ fontSize: "22px" }}>{d.emoji}</span>
            {d.label}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

// Card 10: Source
function SourceCard({ value, onChange }) {
  return (
    <CardShell animKey="source">
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 8px" }}>how'd you find us?</h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: P.muted, margin: "0 0 28px" }}>just curious. won't show on your profile.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {SOURCE_OPTIONS.map((s) => (
          <button key={s} onClick={() => onChange(s)} style={{
            padding: "14px 20px", borderRadius: "14px", border: "none", cursor: "pointer",
            background: value === s ? P.caramel : P.muted + "08",
            color: value === s ? P.gateBlack : P.cream + "80",
            fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500,
            textAlign: "left", transition: "all 0.3s ease",
          }}>{s}</button>
        ))}
      </div>
    </CardShell>
  );
}

// Card 11: Confirm
function ConfirmCard({ profile }) {
  const grad = profile.avatar?.index !== undefined ? AVATAR_GRADIENTS[profile.avatar.index] : AVATAR_GRADIENTS[0];
  return (
    <CardShell animKey="confirm">
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 16px",
          background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "32px", border: `3px solid ${P.caramel}40`,
          animation: "breathe 3s ease infinite",
        }}>
          {profile.avatar?.index !== undefined ? AVATAR_EMOJIS[profile.avatar.index] : "\u2728"}
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "24px", fontWeight: 400, color: P.cream, margin: "0 0 4px" }}>
          {profile.name || "mystery person"}
        </h2>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "14px", color: P.caramel, margin: "0 0 4px" }}>
          {profile.handle || "@"}
        </p>
        {profile.vibe && (
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", color: P.muted, margin: "0 0 16px" }}>
            {profile.vibe}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "8px" }}>
          {profile.area && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, background: P.muted + "12", padding: "4px 10px", borderRadius: "8px" }}>{profile.area}</span>}
          {profile.age && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, background: P.muted + "12", padding: "4px 10px", borderRadius: "8px" }}>{profile.age}</span>}
          {profile.drink && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: P.muted, background: P.muted + "12", padding: "4px 10px", borderRadius: "8px" }}>{profile.drink}</span>}
        </div>
        {profile.hotTake && (
          <div style={{ background: P.muted + "08", borderRadius: "12px", padding: "12px 16px", marginTop: "12px" }}>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", color: P.cream + "90", margin: 0 }}>"{profile.hotTake}"</p>
          </div>
        )}
      </div>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════
   PROFILE SETUP — MAIN FLOW
   ═══════════════════════════════════════════════ */
function ProfileSetup({ onComplete, entryPath = "landing_code" }) {
  const isChatbot = entryPath === "landing_chatbot";
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    avatar: null,
    name: isChatbot ? "Priya" : "",
    handle: isChatbot ? "@priya_offline" : "",
    vibe: "",
    instagram: isChatbot ? "priya.vibes" : "",
    area: "",
    age: "",
    hotTake: isChatbot ? "pineapple on pizza is elite" : "",
    drink: "",
    source: isChatbot ? "friend told me" : "",
  });

  const totalSteps = 12; // intro(0) + avatar(1) + name(2) + handle(3) + vibe(4) + insta(5) + area(6) + age(7) + hottake(8) + drink(9) + source(10) + confirm(11)

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: return true; // avatar is optional
      case 2: return profile.name.trim().length >= 2;
      case 3: return profile.handle.length >= 3;
      case 4: return profile.vibe.length > 0;
      case 5: return true; // instagram is optional
      case 6: return profile.area.length > 0;
      case 7: return profile.age.length > 0;
      case 8: return true; // hot take is optional
      case 9: return true; // drink is optional
      case 10: return profile.source.length > 0;
      case 11: return true;
      default: return false;
    }
  };

  const next = () => {
    if (step === totalSteps - 1) { onComplete(profile); return; }
    if (canProceed()) setStep(step + 1);
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  const update = (key) => (val) => setProfile((p) => ({ ...p, [key]: val }));

  const renderCard = () => {
    switch (step) {
      case 0: return <IntroCard isChatbot={isChatbot} />;
      case 1: return <AvatarCard value={profile.avatar} onChange={update("avatar")} />;
      case 2: return <NameCard value={profile.name} onChange={update("name")} prefilled={isChatbot} />;
      case 3: return <HandleCard name={profile.name} value={profile.handle} onChange={update("handle")} />;
      case 4: return <VibeCard value={profile.vibe} onChange={update("vibe")} />;
      case 5: return <InstagramCard value={profile.instagram} onChange={update("instagram")} prefilled={isChatbot} />;
      case 6: return <AreaCard value={profile.area} onChange={update("area")} />;
      case 7: return <AgeCard value={profile.age} onChange={update("age")} />;
      case 8: return <HotTakeCard value={profile.hotTake} onChange={update("hotTake")} prefilled={isChatbot} />;
      case 9: return <DrinkCard value={profile.drink} onChange={update("drink")} />;
      case 10: return <SourceCard value={profile.source} onChange={update("source")} />;
      case 11: return <ConfirmCard profile={profile} />;
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: P.gateBlack, display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      <Noise opacity={0.05} />

      {/* Ambient glow */}
      <div style={{ position: "absolute", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${P.gateGlow}06, transparent 70%)`, top: "10%", left: "50%", transform: "translateX(-50%)", animation: "pulse 4s ease infinite" }} />

      {/* Top bar */}
      <div style={{ padding: "20px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
        {step > 0 ? (
          <button onClick={back} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, padding: "8px 0" }}>{"\u2190"} back</button>
        ) : <div />}
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted + "40", letterSpacing: "1px" }}>{step + 1}/{totalSteps}</span>
      </div>

      {/* Progress dots */}
      <div style={{ padding: "16px 28px", position: "relative", zIndex: 2 }}>
        <ProgressDots total={totalSteps} current={step} />
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 2, minHeight: 0 }}>
        {renderCard()}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: "16px 28px 32px", position: "relative", zIndex: 2 }}>
        <NextButton
          onClick={next}
          disabled={!canProceed()}
          label={step === 0 ? "let's go \u2192" : step === 11 ? "that's me \u2192" : step === 5 || step === 8 || step === 9 ? (profile[step === 5 ? "instagram" : step === 8 ? "hotTake" : "drink"] ? "next \u2192" : "skip \u2192") : "next \u2192"}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   APP EDUCATION CARDS
   ═══════════════════════════════════════════════ */

// Card 1: What is come offline (brand intro — direct PWA only)
function EduCardWhatIs() {
  return (
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      <div style={{
        fontSize: "48px", marginBottom: "20px",
        animation: "float 3s ease infinite", lineHeight: 1,
      }}>{"\u{1F30D}"}</div>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "3px", color: P.caramel, marginBottom: "16px",
      }}>what is come offline?</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 14px", lineHeight: 1.25 }}>
        we throw curated, invite-only events in bangalore.
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.7, margin: 0, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
        every detail is planned — the venue, the food, the music, your ride. you just show up.
      </p>
    </div>
  );
}

// Card 2: Why come offline (brand purpose — direct PWA only)
function EduCardWhy() {
  return (
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      <div style={{
        fontSize: "48px", marginBottom: "20px", lineHeight: 1,
      }}>{"\u{1F4A1}"}</div>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "3px", color: P.caramel, marginBottom: "16px",
      }}>why come offline?</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 14px", lineHeight: 1.25 }}>
        the best nights of your life won't happen on a screen.
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.7, margin: 0, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
        no awkward networking. no planning in group chats. just show up and meet people who actually want to be there.
      </p>
    </div>
  );
}

// Card 3: How events work
function EduCardHowItWorks() {
  return (
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      <div style={{
        fontSize: "48px", marginBottom: "20px", lineHeight: 1,
      }}>{"\u{1F3AB}"}</div>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "3px", color: P.caramel, marginBottom: "16px",
      }}>how it works</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 14px", lineHeight: 1.25 }}>
        grab a ticket. we handle the rest.
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.7, margin: 0, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
        the venue's a secret until we reveal it. we assign your pickup point. just show up on time.
      </p>
    </div>
  );
}

// Card 4: The rules — phones go dark
function EduCardRules() {
  const [dimmed, setDimmed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDimmed(true), 600); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      textAlign: "center", padding: "0 8px",
      transition: "filter 1.5s ease", filter: dimmed ? "brightness(0.85)" : "brightness(1)",
    }}>
      <div style={{
        fontSize: "56px", marginBottom: "20px",
        animation: "moonGlow 3s ease infinite", lineHeight: 1,
      }}>{"\u{1F319}"}</div>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "3px", color: P.caramel, marginBottom: "16px",
      }}>the one rule</p>
      <h2 style={{
        fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400,
        color: P.cream, margin: "0 0 14px", lineHeight: 1.25,
      }}>phones go away at the door.</h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.7,
        margin: 0, maxWidth: "280px", marginLeft: "auto", marginRight: "auto",
        opacity: dimmed ? 1 : 0, transition: "opacity 1s ease 0.3s",
      }}>
        no filming. no scrolling. just real conversations.
      </p>
    </div>
  );
}

// Card 5: After the event
function EduCardAfter() {
  return (
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      {/* Polaroid stack */}
      <div style={{ position: "relative", height: "150px", width: "220px", margin: "0 auto 24px" }}>
        <div style={{
          position: "absolute", left: "20px", top: "10px", width: "120px", padding: "8px 8px 24px",
          background: "#fff", borderRadius: "4px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "polaroidDrop 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both",
        }}>
          <div style={{ width: "100%", height: "80px", borderRadius: "2px", background: `linear-gradient(135deg, ${P.blush}60, ${P.coral}80)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "28px" }}>{"\u{1F485}"}</span>
          </div>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "11px", color: P.darkBrown, margin: "6px 0 0", textAlign: "center" }}>best night ever</p>
        </div>
        <div style={{
          position: "absolute", right: "20px", top: "20px", width: "120px", padding: "8px 8px 24px",
          background: "#fff", borderRadius: "4px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "polaroidDrop2 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s both",
        }}>
          <div style={{ width: "100%", height: "80px", borderRadius: "2px", background: `linear-gradient(135deg, ${P.caramel}60, ${P.highlight}80)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "28px" }}>{"\u{1F942}"}</span>
          </div>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: "11px", color: P.darkBrown, margin: "6px 0 0", textAlign: "center" }}>no regrets</p>
        </div>
        <div style={{
          position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)",
          background: P.nearBlack, border: `1px solid ${P.caramel}40`, borderRadius: "8px",
          padding: "4px 10px", animation: "fadeIn 0.5s ease 1s both",
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.caramel, animation: "countdownTick 1s ease infinite" }}>47:59:58</span>
        </div>
      </div>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "3px", color: P.caramel, marginBottom: "16px",
      }}>after the event</p>
      <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", fontWeight: 400, color: P.cream, margin: "0 0 14px", lineHeight: 1.25 }}>
        we capture the night. you find your people.
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: P.muted, lineHeight: 1.7, margin: 0, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
        photos, quotes, and a 48-hour window to reconnect with anyone you vibed with.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   APP EDUCATION — MAIN FLOW
   ═══════════════════════════════════════════════ */
function AppEducation({ onComplete, showBrandCards = false }) {
  const cards = showBrandCards
    ? [EduCardWhatIs, EduCardWhy, EduCardHowItWorks, EduCardRules, EduCardAfter]
    : [EduCardHowItWorks, EduCardRules, EduCardAfter];
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  // Auto-advance timer with progress bar
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const duration = 4000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (elapsed < duration) {
        timerRef.current = requestAnimationFrame(tick);
      } else {
        if (step < cards.length - 1) setStep(step + 1);
      }
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [step, cards.length]);

  const goNext = () => {
    cancelAnimationFrame(timerRef.current);
    if (step < cards.length - 1) setStep(step + 1);
  };

  const goPrev = () => {
    cancelAnimationFrame(timerRef.current);
    if (step > 0) setStep(step - 1);
  };

  const Card = cards[step];

  return (
    <div style={{
      minHeight: "100vh", background: P.gateBlack, display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      <Noise opacity={0.05} />

      {/* Story-style progress bars */}
      <div style={{ padding: "16px 20px 0", display: "flex", gap: "4px", position: "relative", zIndex: 2 }}>
        {cards.map((_, i) => (
          <div key={i} style={{ flex: 1, height: "3px", background: P.muted + "20", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "2px",
              background: P.caramel,
              width: i < step ? "100%" : i === step ? `${progress}%` : "0%",
              transition: i < step ? "width 0.3s ease" : "none",
            }} />
          </div>
        ))}
      </div>

      {/* Tap zones for prev/next */}
      <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 3 }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={goPrev} />
        <div style={{ flex: 2, cursor: "pointer" }} onClick={goNext} />
      </div>

      {/* Card content */}
      <div key={step} style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "40px 20px", position: "relative", zIndex: 2,
        animation: "cardScale 0.4s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        <Card />
      </div>

      {/* Bottom */}
      <div style={{ padding: "0 28px 32px", position: "relative", zIndex: 4 }}>
        {step === cards.length - 1 ? (
          <NextButton onClick={onComplete} label="show me what's coming up \u2192" />
        ) : (
          <ProgressDots total={cards.length} current={step} />
        )}
        <div style={{ marginTop: "12px" }}>
          <SkipLink onClick={onComplete} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MOCK FEED — shown after education
   ═══════════════════════════════════════════════ */
function MockFeed() {
  return (
    <div style={{ minHeight: "100vh", background: P.cream, padding: "40px 20px 100px" }}>
      <Noise opacity={0.03} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", color: P.muted, marginBottom: "16px", animation: "fadeIn 0.5s ease both" }}>invite only · est. 2026</p>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "36px", fontWeight: 400, color: P.nearBlack, margin: "0 0 12px", lineHeight: 1.15, animation: "fadeSlideUp 0.6s ease 0.1s both" }}>
          your wifi can't reach here
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: P.warmBrown, lineHeight: 1.7, margin: "0 0 40px", animation: "fadeSlideUp 0.6s ease 0.2s both" }}>
          welcome in. here's what's coming up. <span style={{ color: P.caramel }}>bangalore chapter.</span>
        </p>

        {/* Mini event cards */}
        {[
          { title: "Galentines", emoji: "\u{1F485}", tag: "women only", date: "Feb 14", accent: P.blush, accentDark: P.coral, spots: 12, total: 40 },
          { title: "No Phone House Party", emoji: "\u{1F4F5}", tag: "phone-free", date: "Mar 8", accent: P.caramel, accentDark: P.deepCaramel, spots: 28, total: 60 },
        ].map((e, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: "20px", overflow: "hidden", marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(26,23,21,0.04), 0 8px 24px rgba(26,23,21,0.06)",
            animation: `fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.15}s both`,
          }}>
            <div style={{ height: "4px", background: `linear-gradient(90deg, ${e.accent}, ${e.accentDark})` }} />
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: e.accentDark, background: e.accent + "25", padding: "2px 8px", borderRadius: "100px" }}>{e.tag}</span>
                  <h3 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "22px", fontWeight: 400, color: P.nearBlack, margin: "6px 0 0" }}>{e.title}</h3>
                </div>
                <span style={{ fontSize: "28px" }}>{e.emoji}</span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: P.softBlack }}>{e.date}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.muted }}>· {e.spots} spots left</span>
              </div>
            </div>
          </div>
        ))}

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: P.sage + "15", padding: "8px 16px", borderRadius: "100px",
          animation: "fadeIn 0.6s ease 0.7s both",
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: P.sage, animation: "breathe 3s ease infinite" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#6B7A63" }}>you're in. welcome to come offline.</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN APP — DEMO WITH PATH SWITCHER
   ═══════════════════════════════════════════════ */
export default function App() {
  const [entryPath, setEntryPath] = useState("landing_code");
  const [phase, setPhase] = useState("profile"); // profile | education | feed
  const [profileData, setProfileData] = useState(null);

  const handleProfileComplete = (data) => {
    setProfileData(data);
    setPhase("education");
  };

  const handleEducationComplete = () => {
    setPhase("feed");
  };

  const reset = () => {
    setPhase("profile");
    setProfileData(null);
  };

  const showBrandCards = entryPath === "direct_pwa";

  return (
    <div style={{ maxWidth: "430px", margin: "0 auto", position: "relative", minHeight: "100vh", overflow: "hidden", background: P.gateBlack }}>
      <Styles />

      {/* Entry Path Switcher */}
      <div style={{
        position: "fixed", bottom: "0", left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, display: "flex", gap: "0",
        background: P.nearBlack + "F0", backdropFilter: "blur(20px)",
        borderRadius: "16px 16px 0 0", overflow: "hidden",
        border: `1px solid ${P.muted}15`, borderBottom: "none",
        maxWidth: "430px", width: "100%",
      }}>
        {[
          { id: "landing_code", label: "landing \u2192 code", icon: "\u{1F511}" },
          { id: "landing_chatbot", label: "landing \u2192 chat", icon: "\u{1F4AC}" },
          { id: "direct_pwa", label: "direct pwa", icon: "\u{1F4F1}" },
        ].map((p) => (
          <button key={p.id} onClick={() => { setEntryPath(p.id); reset(); }} style={{
            flex: 1, padding: "12px 8px", border: "none", cursor: "pointer",
            background: entryPath === p.id ? P.caramel + "20" : "transparent",
            borderBottom: entryPath === p.id ? `2px solid ${P.caramel}` : "2px solid transparent",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
            transition: "all 0.3s ease",
          }}>
            <span style={{ fontSize: "16px" }}>{p.icon}</span>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: "9px",
              color: entryPath === p.id ? P.caramel : P.muted + "60",
              letterSpacing: "0.5px",
            }}>{p.label}</span>
          </button>
        ))}
        {phase !== "profile" && (
          <button onClick={reset} style={{
            padding: "12px 14px", border: "none", cursor: "pointer",
            background: "transparent", display: "flex", flexDirection: "column",
            alignItems: "center", gap: "4px",
          }}>
            <span style={{ fontSize: "16px" }}>{"\u{1F504}"}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: P.muted + "60" }}>reset</span>
          </button>
        )}
      </div>

      {/* Phase label */}
      <div style={{
        position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, background: P.nearBlack + "E0", backdropFilter: "blur(10px)",
        padding: "6px 16px", borderRadius: "100px", border: `1px solid ${P.muted}15`,
      }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: P.caramel, letterSpacing: "1px", textTransform: "uppercase" }}>
          {phase === "profile" ? "4e. profile setup" : phase === "education" ? `4f. app education (${showBrandCards ? "5" : "3"} cards)` : "5a. event feed"}
          {" · "}{entryPath.replace("_", " ")}
        </span>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: "70px" }}>
        {phase === "profile" && (
          <ProfileSetup
            key={entryPath}
            onComplete={handleProfileComplete}
            entryPath={entryPath}
          />
        )}
        {phase === "education" && (
          <AppEducation
            key={entryPath + "-edu"}
            onComplete={handleEducationComplete}
            showBrandCards={showBrandCards}
          />
        )}
        {phase === "feed" && <MockFeed />}
      </div>
    </div>
  );
}
