"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import type { User } from "@comeoffline/types";
import { CURATED_INTERESTS } from "@comeoffline/types";

/* ═══════════════════════════════════════════════
   DATA CONSTANTS (from prototype)
   ═══════════════════════════════════════════════ */
const AREA_OPTIONS = [
  "Koramangala", "Indiranagar", "HSR Layout", "Whitefield",
  "JP Nagar", "Jayanagar", "Marathahalli", "Electronic City", "other",
];


const INTENT_OPTIONS = [
  { label: "making friends", emoji: "\u{1F91D}" },
  { label: "dating", emoji: "\u{1F496}" },
  { label: "just vibes", emoji: "\u2728" },
  { label: "networking", emoji: "\u{1F4BC}" },
  { label: "trying something new", emoji: "\u{1F31F}" },
];

const GENDER_OPTIONS = [
  { label: "male", display: "male" },
  { label: "female", display: "female" },
  { label: "non-binary", display: "non-binary" },
  { label: "prefer not to say", display: "prefer not to say" },
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
   TYPES
   ═══════════════════════════════════════════════ */
interface AvatarValue {
  type: "gradient" | "uploaded";
  index?: number;
  dataUrl?: string;
}

interface ProfileDraft {
  avatar: AvatarValue | null;
  name: string;
  handle: string;
  instagram: string;
  area: string;
  dob: string;
  showAge: boolean;
  gender: string;
  hotTake: string;
  bio: string;
  interests: string[];
  vibeTag: string;
  intent: string;
  source: string;
  email: string;
  pin: string;
  pinConfirm: string;
}

const STORAGE_KEY_PREFIX = "co_profile_setup_";

/* ═══════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═══════════════════════════════════════════════ */
function ProgressBar({ total, current }: { total: number; current: number }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: "rgba(155,142,130,0.13)" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "#D4A574" }} />
    </div>
  );
}

function CardShell({ children, animKey }: { children: React.ReactNode; animKey: string }) {
  return (
    <div key={animKey} className="animate-slideCardIn flex flex-1 flex-col justify-center px-7">
      {children}
    </div>
  );
}

function NextButton({ onClick, disabled, label = "next \u2192" }: { onClick: () => void; disabled: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl border-none py-[18px] font-sans text-base font-medium transition-all duration-300"
      style={{
        background: disabled ? "rgba(155,142,130,0.1)" : "#FAF6F0",
        color: disabled ? "rgba(155,142,130,0.3)" : "#0E0D0B",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function MicroLabel() {
  return (
    <span className="ml-2 rounded font-mono text-[9px] uppercase tracking-[1px] text-lavender" style={{ background: "rgba(184,169,201,0.1)", padding: "2px 8px" }}>
      from your chat
    </span>
  );
}

/* ═══════════════════════════════════════════════
   CARD COMPONENTS (11 total)
   ═══════════════════════════════════════════════ */

// Card 0: Intro
function IntroCard({ isChatbot }: { isChatbot: boolean }) {
  return (
    <CardShell animKey="intro">
      <div className="text-center">
        <div className="mb-6 text-5xl" style={{ animation: "float 3s ease infinite" }}>{"\u270C\uFE0F"}</div>
        <h2 className="mb-3 font-serif text-[28px] font-normal leading-[1.2] text-cream">
          {isChatbot ? "we caught some of this from our chat." : "one more thing before the fun starts."}
        </h2>
        <p className="font-sans text-sm leading-relaxed text-muted">
          {isChatbot ? "fix anything that\u2019s off. takes about a minute." : "tell us who you are. takes about a minute."}
        </p>
      </div>
    </CardShell>
  );
}

// Card 1: Avatar
function AvatarCard({ value, onChange }: { value: AvatarValue | null; onChange: (v: AvatarValue) => void }) {
  const [mode, setMode] = useState<"pick" | "upload">("pick");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side compression via canvas
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 800;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        onChange({ type: "uploaded", dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <CardShell animKey="avatar">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted">optional</p>
      <h2 className="mb-6 font-serif text-[28px] font-normal text-cream">pick your look</h2>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {AVATAR_GRADIENTS.map((g, i) => (
          <button
            key={i}
            onClick={() => onChange({ type: "gradient", index: i })}
            className="flex aspect-square items-center justify-center rounded-full text-xl transition-all duration-300"
            style={{
              border: value?.type === "gradient" && value.index === i ? "3px solid #D4A574" : "3px solid transparent",
              background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
              transform: value?.type === "gradient" && value.index === i ? "scale(1.1)" : "scale(1)",
              boxShadow: value?.type === "gradient" && value.index === i ? `0 0 20px ${g[0]}40` : "none",
            }}
          >
            {AVATAR_EMOJIS[i]}
          </button>
        ))}
      </div>

      {value?.type === "uploaded" && value.dataUrl && (
        <div className="animate-fadeSlideUp mb-4 flex justify-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-[3px] border-caramel">
            <img src={value.dataUrl} alt="Your avatar" className="h-full w-full object-cover" />
          </div>
        </div>
      )}

      <div className="text-center">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => { if (mode === "upload") { fileRef.current?.click(); } else { setMode("upload"); fileRef.current?.click(); }}}
          className="w-full rounded-xl border border-dashed px-5 py-3 font-sans text-[13px] text-muted transition-all"
          style={{ borderColor: "rgba(155,142,130,0.19)" }}
        >
          or upload your own photo
        </button>
      </div>
    </CardShell>
  );
}

// Card 2: Name
function NameCard({ value, onChange, prefilled }: { value: string; onChange: (v: string) => void; prefilled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 500); }, []);
  return (
    <CardShell animKey="name">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">
        what should we call you?
        {prefilled && <MicroLabel />}
      </h2>
      <p className="mb-8 font-sans text-[13px] text-muted">this is how people see you at events</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 30))}
        placeholder="your name"
        className="w-full border-0 border-b-2 bg-transparent py-5 text-center font-serif text-[32px] text-cream outline-none transition-all duration-300"
        style={{
          borderBottomColor: value ? "#D4A574" : "rgba(155,142,130,0.19)",
          letterSpacing: "-0.5px",
        }}
      />
      <div className="mt-2 text-right">
        <span className="font-mono text-[10px]" style={{ color: "rgba(155,142,130,0.25)" }}>{value.length}/30</span>
      </div>
    </CardShell>
  );
}

// Card 3: Handle
function HandleCard({ name, value, onChange, userId }: { name: string; value: string; onChange: (v: string) => void; userId?: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const autoGenRef = useRef(true);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const { getIdToken } = useAuth();

  // Auto-generate handle from name
  useEffect(() => {
    if (autoGenRef.current && name) {
      const auto = name.toLowerCase().replace(/\s+/g, "_") + "_offline";
      onChangeRef.current(auto);
    }
  }, [name]);

  // Debounced handle availability check
  useEffect(() => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    setAvailable(null);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const token = await Promise.race([
          getIdToken(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (cancelled) return;
        if (!token) { setChecking(false); setAvailable(true); return; }
        const res = await apiFetch<{ success: boolean; data: { available: boolean } }>(
          `/api/users/check-handle/${encodeURIComponent(value)}`,
          { token },
        );
        if (cancelled) return;
        const isAvailable = res.data?.available ?? true;
        setAvailable(isAvailable);

        // Handle collision: if auto-generated and taken, append random digits
        if (!isAvailable && autoGenRef.current) {
          const suffix = Math.floor(10 + Math.random() * 90).toString();
          onChangeRef.current(value + suffix);
        }
      } catch {
        if (!cancelled) setAvailable(true); // Optimistic on error
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, getIdToken]);

  return (
    <CardShell animKey="handle">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">pick your @</h2>
      <p className="mb-8 font-sans text-[13px] text-muted">your identity in the app. make it you.</p>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            autoGenRef.current = false;
            onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24));
          }}
          placeholder="@your_handle"
          className="w-full rounded-2xl bg-gate-dark px-5 py-[18px] text-center font-mono text-lg text-cream outline-none transition-all duration-300"
          style={{
            letterSpacing: "1px",
            border: `1.5px solid ${available === true ? "rgba(168,181,160,0.38)" : available === false ? "rgba(196,112,77,0.38)" : "rgba(155,142,130,0.13)"}`,
          }}
        />
        {available !== null && !checking && (
          <div className="animate-scaleIn absolute right-4 top-1/2 -translate-y-1/2 text-lg">
            {available ? "\u2705" : "\u274C"}
          </div>
        )}
        {checking && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted" style={{ animation: "pulse 1s ease infinite" }}>...</div>
        )}
      </div>
      {available === true && !checking && (
        <p className="animate-fadeIn mt-2 text-center font-mono text-[11px] text-sage">that&apos;s yours.</p>
      )}
      {available === false && !checking && (
        <p className="animate-fadeIn mt-2 text-center font-mono text-[11px] text-terracotta">taken — try another</p>
      )}
    </CardShell>
  );
}

// Card 4: Instagram
function InstagramCard({ value, onChange, email, onChangeEmail, prefilled }: {
  value: string; onChange: (v: string) => void;
  email: string; onChangeEmail: (v: string) => void;
  prefilled: boolean;
}) {
  return (
    <CardShell animKey="insta">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">
        drop your insta
        {prefilled && <MicroLabel />}
      </h2>
      <p className="mb-6 font-sans text-[13px] leading-relaxed text-muted">
        we use this to verify your profile. only revealed on mutual match after events.
      </p>
      <div className="relative mb-8">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base" style={{ color: "rgba(155,142,130,0.25)" }}>@</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30))}
          placeholder="your_handle"
          className="w-full rounded-2xl bg-gate-dark py-[18px] pl-9 pr-4 font-mono text-base text-cream outline-none transition-all duration-300"
          style={{ border: "1.5px solid rgba(155,142,130,0.13)" }}
        />
      </div>

      <h2 className="mb-2 font-serif text-[22px] font-normal text-cream">your email</h2>
      <p className="mb-4 font-sans text-[13px] text-muted">
        for account recovery only. we&apos;ll never spam you.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => onChangeEmail(e.target.value.slice(0, 254))}
        placeholder="you@example.com"
        autoComplete="email"
        autoCapitalize="none"
        className="w-full rounded-2xl bg-gate-dark py-[18px] px-4 font-sans text-base text-cream outline-none transition-all duration-300 placeholder:text-muted/20"
        style={{ border: `1.5px solid ${email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "rgba(196,112,77,0.4)" : "rgba(155,142,130,0.13)"}` }}
      />
      {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
        <p className="mt-1.5 font-sans text-[11px] text-terracotta/70">enter a valid email</p>
      )}
    </CardShell>
  );
}

// Card 5: Area
function AreaCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customArea, setCustomArea] = useState("");
  const isPreset = AREA_OPTIONS.includes(value) && value !== "other";

  return (
    <CardShell animKey="area">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">where in bangalore?</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">helps us assign your nearest pickup point</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {AREA_OPTIONS.filter((a) => a !== "other").map((a) => (
          <button
            key={a}
            onClick={() => { onChange(a); setShowCustom(false); }}
            className="rounded-xl border-none font-sans text-sm font-medium transition-all duration-300"
            style={{
              padding: "10px 16px",
              background: value === a ? "#D4A574" : "rgba(155,142,130,0.07)",
              color: value === a ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              transform: value === a ? "scale(1.05)" : "scale(1)",
              cursor: "pointer",
            }}
          >
            {a}
          </button>
        ))}
        <button
          onClick={() => { setShowCustom(true); onChange(customArea || ""); }}
          className="rounded-xl font-sans text-sm font-medium transition-all duration-300"
          style={{
            padding: "10px 16px",
            border: `1.5px dashed ${showCustom || (!isPreset && value) ? "#D4A574" : "rgba(155,142,130,0.19)"}`,
            background: showCustom || (!isPreset && value) ? "rgba(212,165,116,0.1)" : "transparent",
            color: showCustom || (!isPreset && value) ? "#D4A574" : "rgba(155,142,130,0.38)",
            cursor: "pointer",
          }}
        >
          other
        </button>
      </div>
      {showCustom && (
        <div className="animate-fadeSlideUp mt-4">
          <input
            type="text"
            value={customArea}
            autoFocus
            onChange={(e) => { const v = e.target.value.slice(0, 40); setCustomArea(v); onChange(v); }}
            placeholder="type your area"
            className="w-full rounded-xl bg-gate-dark px-4 py-3.5 text-center font-sans text-base text-cream outline-none"
            style={{ border: "1.5px solid rgba(212,165,116,0.25)" }}
          />
        </div>
      )}
    </CardShell>
  );
}

// Card 6: Date of Birth
function DobCard({ value, showAge, onChangeDob, onChangeShowAge }: { value: string; showAge: boolean; onChangeDob: (v: string) => void; onChangeShowAge: (v: boolean) => void }) {
  const age = value ? Math.floor((Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const maxDate = new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const minDate = "1950-01-01";

  return (
    <CardShell animKey="dob">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">when were you born?</h2>
      <p className="mb-8 font-sans text-[13px] text-muted">you control whether your age shows on your profile.</p>
      <input
        type="date"
        value={value}
        onChange={(e) => onChangeDob(e.target.value)}
        max={maxDate}
        min={minDate}
        className="w-full rounded-2xl bg-gate-dark px-5 py-[18px] text-center font-mono text-lg text-cream outline-none transition-all duration-300"
        style={{ border: "1.5px solid rgba(155,142,130,0.13)", colorScheme: "dark" }}
      />
      {age !== null && age >= 18 && (
        <p className="animate-fadeIn mt-3 text-center font-serif text-[20px] text-caramel">{age} years young</p>
      )}
      {value && (
        <button
          onClick={() => onChangeShowAge(!showAge)}
          className="mx-auto mt-4 flex items-center gap-2 rounded-xl border-none px-4 py-2 font-sans text-[13px] transition-all"
          style={{
            background: "rgba(155,142,130,0.07)",
            color: showAge ? "rgba(250,246,240,0.5)" : "rgba(250,246,240,0.3)",
            cursor: "pointer",
          }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] transition-all"
            style={{
              background: showAge ? "#D4A574" : "rgba(155,142,130,0.13)",
              color: showAge ? "#0E0D0B" : "transparent",
            }}
          >
            {showAge ? "\u2713" : ""}
          </span>
          show my age on profile
        </button>
      )}
    </CardShell>
  );
}

// Card 7: Gender
function GenderCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="gender">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">what&apos;s your gender?</h2>
      <p className="mb-8 font-sans text-[13px] text-muted">helps us plan balanced events</p>
      <div className="flex flex-col gap-2.5">
        {GENDER_OPTIONS.map((g) => (
          <button
            key={g.label}
            onClick={() => onChange(g.label)}
            className="rounded-[14px] border-none text-left font-sans text-[15px] font-medium transition-all duration-300"
            style={{
              padding: "14px 20px",
              background: value === g.label ? "#D4A574" : "rgba(155,142,130,0.05)",
              color: value === g.label ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              cursor: "pointer",
            }}
          >
            {g.display}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

// Card 8: Hot Take
function HotTakeCard({ value, onChange, prefilled }: { value: string; onChange: (v: string) => void; prefilled: boolean }) {
  return (
    <CardShell animKey="hottake">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">
        the hill you&apos;ll die on
        {prefilled && <MicroLabel />}
      </h2>
      <p className="mb-7 font-sans text-[13px] text-muted">one-liner hot take. shows on your profile. sparks conversation.</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 60))}
        placeholder="pineapple on pizza is elite"
        className="w-full rounded-2xl bg-gate-dark px-5 py-[18px] text-center font-hand text-xl text-cream outline-none"
        style={{ border: "1.5px solid rgba(155,142,130,0.13)" }}
      />
      <p className="mt-1.5 text-right font-mono text-[10px]" style={{ color: "rgba(155,142,130,0.25)" }}>{value.length}/60</p>
    </CardShell>
  );
}

// Card 9: Bio
function BioCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="bio">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted">optional</p>
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">tell us about you</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">a short bio. helps people know if they want to connect.</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 200))}
        placeholder="weekend chai addict. koramangala regular. always down for a hike."
        rows={3}
        className="w-full resize-none rounded-2xl bg-gate-dark px-5 py-[18px] font-sans text-[15px] leading-relaxed text-cream outline-none transition-all duration-300"
        style={{ border: "1.5px solid rgba(155,142,130,0.13)" }}
      />
      <p className="mt-1.5 text-right font-mono text-[10px]" style={{ color: "rgba(155,142,130,0.25)" }}>{value.length}/200</p>
    </CardShell>
  );
}

// Card 10: Interests
function InterestsCard({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (interest: string) => {
    if (value.includes(interest)) {
      onChange(value.filter((i) => i !== interest));
    } else if (value.length < 8) {
      onChange([...value, interest]);
    }
  };

  return (
    <CardShell animKey="interests">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">what are you into?</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">
        pick 1–8 things. shows on your profile.
        <span className="ml-2 font-mono text-[11px]" style={{ color: value.length >= 1 ? "#A8B5A0" : "#D4A574" }}>
          {value.length}/8
        </span>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {CURATED_INTERESTS.map((interest) => {
          const selected = value.includes(interest);
          return (
            <button
              key={interest}
              onClick={() => toggle(interest)}
              className="rounded-full border-none font-sans text-[13px] font-medium transition-all duration-300"
              style={{
                padding: "8px 16px",
                background: selected ? "#D4A574" : "rgba(155,142,130,0.07)",
                color: selected ? "#0E0D0B" : "rgba(250,246,240,0.5)",
                transform: selected ? "scale(1.05)" : "scale(1)",
                cursor: value.length >= 8 && !selected ? "default" : "pointer",
                opacity: value.length >= 8 && !selected ? 0.4 : 1,
              }}
            >
              {interest}
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}

// Card 11: Vibe Tag
function VibeTagCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="vibetag">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted">optional</p>
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">your vibe in a few words</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">a micro-label. think of it as your energy in 2-3 words.</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 50))}
        placeholder="the planner / chaos coordinator / quiet observer"
        className="w-full rounded-2xl bg-gate-dark px-5 py-[18px] text-center font-hand text-xl text-cream outline-none"
        style={{ border: "1.5px solid rgba(155,142,130,0.13)" }}
      />
      <p className="mt-1.5 text-right font-mono text-[10px]" style={{ color: "rgba(155,142,130,0.25)" }}>{value.length}/50</p>
    </CardShell>
  );
}

// Card 12: Community Intent
function IntentCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="intent">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">why are you here?</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">no wrong answers. helps us build better experiences.</p>
      <div className="flex flex-col gap-2.5">
        {INTENT_OPTIONS.map((d) => (
          <button
            key={d.label}
            onClick={() => onChange(d.label)}
            className="flex items-center gap-3 rounded-[14px] border-none text-left font-sans text-[15px] font-medium transition-all duration-300"
            style={{
              padding: "14px 20px",
              background: value === d.label ? "#D4A574" : "rgba(155,142,130,0.05)",
              color: value === d.label ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              cursor: "pointer",
            }}
          >
            <span className="text-xl">{d.emoji}</span>
            {d.label}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

// Card 10: Source
function SourceCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="source">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">how&apos;d you find us?</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">just curious. won&apos;t show on your profile.</p>
      <div className="flex flex-col gap-2.5">
        {SOURCE_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className="rounded-[14px] border-none text-left font-sans text-[15px] font-medium transition-all duration-300"
            style={{
              padding: "14px 20px",
              background: value === s ? "#D4A574" : "rgba(155,142,130,0.05)",
              color: value === s ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

// Card 11: Confirm
function ConfirmCard({ profile }: { profile: ProfileDraft }) {
  const grad = profile.avatar?.type === "gradient" && profile.avatar.index !== undefined
    ? AVATAR_GRADIENTS[profile.avatar.index]
    : AVATAR_GRADIENTS[0];

  return (
    <CardShell animKey="confirm">
      <div className="text-center">
        {profile.avatar?.type === "uploaded" && profile.avatar.dataUrl ? (
          <div className="animate-breathe mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full" style={{ border: "3px solid rgba(212,165,116,0.25)" }}>
            <img src={profile.avatar.dataUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div
            className="animate-breathe mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-[32px]"
            style={{
              background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
              border: "3px solid rgba(212,165,116,0.25)",
            }}
          >
            {profile.avatar?.type === "gradient" && profile.avatar.index !== undefined ? AVATAR_EMOJIS[profile.avatar.index] : "\u2728"}
          </div>
        )}

        <h2 className="mb-1 font-serif text-2xl font-normal text-cream">
          {profile.name || "mystery person"}
        </h2>
        <p className="mb-1 font-mono text-sm text-caramel">
          {profile.handle ? `@${profile.handle}` : "@"}
        </p>
        {profile.instagram && (
          <p className="font-mono text-[11px] text-muted/60">
            ig: @{profile.instagram}
          </p>
        )}
        {profile.vibeTag && (
          <p className="mt-1 font-hand text-[13px] italic" style={{ color: "rgba(250,246,240,0.4)" }}>{profile.vibeTag}</p>
        )}
        <div className="mb-2 mt-4 flex flex-wrap justify-center gap-2">
          {profile.area && (
            <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.area}</span>
          )}
          {profile.dob && (
            <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>
              {Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
            </span>
          )}
          {profile.gender && (
            <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.gender}</span>
          )}
          {profile.intent && (
            <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.intent}</span>
          )}
        </div>
        {profile.hotTake && (
          <div className="mt-3 rounded-xl px-4 py-3" style={{ background: "rgba(155,142,130,0.05)" }}>
            <p className="font-hand text-base" style={{ color: "rgba(250,246,240,0.56)" }}>&ldquo;{profile.hotTake}&rdquo;</p>
          </div>
        )}
        {profile.bio && (
          <div className="mt-2 rounded-xl px-4 py-3" style={{ background: "rgba(155,142,130,0.05)" }}>
            <p className="font-sans text-[12px] leading-relaxed" style={{ color: "rgba(250,246,240,0.5)" }}>{profile.bio}</p>
          </div>
        )}
        {profile.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {profile.interests.map((i) => (
              <span key={i} className="rounded-full font-mono text-[10px]" style={{ background: "rgba(212,165,116,0.12)", color: "#D4A574", padding: "3px 10px" }}>{i}</span>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════
   COMBINED CARD COMPONENTS
   ═══════════════════════════════════════════════ */

// Combined: Name + Handle
function NameHandleCard({
  name, handle, onChangeName, onChangeHandle, prefilled, userId,
}: {
  name: string; handle: string;
  onChangeName: (v: string) => void; onChangeHandle: (v: string) => void;
  prefilled: boolean; userId?: string;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const { getIdToken } = useAuth();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 500); }, []);

  // Generate suggestion from name
  useEffect(() => {
    if (name.trim()) {
      setSuggestion(name.trim().toLowerCase().replace(/\s+/g, "_") + "_offline");
    } else {
      setSuggestion("");
    }
  }, [name]);

  // Debounced handle availability check
  useEffect(() => {
    if (!handle || handle.length < 3) { setAvailable(null); return; }
    setChecking(true); setAvailable(null);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const token = await Promise.race([
          getIdToken(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (cancelled) return;
        if (!token) { setChecking(false); setAvailable(true); return; }
        const res = await apiFetch<{ success: boolean; data: { available: boolean } }>(
          `/api/users/check-handle/${encodeURIComponent(handle)}`, { token },
        );
        if (cancelled) return;
        setAvailable(res.data?.available ?? true);
      } catch { if (!cancelled) setAvailable(true); }
      finally { if (!cancelled) setChecking(false); }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [handle, getIdToken]);

  return (
    <CardShell animKey="namehandle">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">
        what should we call you?
        {prefilled && <MicroLabel />}
      </h2>
      <p className="mb-6 font-sans text-[13px] text-muted">this is how people see you at events</p>

      {/* Name input */}
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => onChangeName(e.target.value.slice(0, 30))}
        placeholder="your name"
        className="mb-6 w-full border-0 border-b-2 bg-transparent py-4 text-center font-serif text-[28px] text-cream outline-none transition-all duration-300"
        style={{ borderBottomColor: name ? "#D4A574" : "rgba(155,142,130,0.19)", letterSpacing: "-0.5px" }}
      />

      {/* Handle input */}
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted">your @handle</p>
      <div className="relative">
        <input
          type="text"
          value={handle}
          onChange={(e) => onChangeHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))}
          placeholder="@your_handle"
          className="w-full rounded-2xl bg-gate-dark px-5 py-[14px] text-center font-mono text-base text-cream outline-none transition-all duration-300"
          style={{
            letterSpacing: "1px",
            border: `1.5px solid ${available === true ? "rgba(168,181,160,0.38)" : available === false ? "rgba(196,112,77,0.38)" : "rgba(155,142,130,0.13)"}`,
          }}
        />
        {available !== null && !checking && (
          <div className="animate-scaleIn absolute right-4 top-1/2 -translate-y-1/2 text-lg">
            {available ? "\u2705" : "\u274C"}
          </div>
        )}
        {checking && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted" style={{ animation: "pulse 1s ease infinite" }}>...</div>
        )}
      </div>
      {available === true && !checking && (
        <p className="animate-fadeIn mt-1.5 text-center font-mono text-[11px] text-sage">that&apos;s yours.</p>
      )}
      {available === false && !checking && (
        <p className="animate-fadeIn mt-1.5 text-center font-mono text-[11px] text-terracotta">taken — try another</p>
      )}

      {/* Suggestion */}
      {suggestion && !handle && (
        <button
          onClick={() => onChangeHandle(suggestion)}
          className="mt-3 w-full text-center font-mono text-[11px] text-muted/50 transition-colors hover:text-caramel"
        >
          suggested: <span className="text-caramel/70">@{suggestion}</span> — tap to use
        </button>
      )}
    </CardShell>
  );
}

// Combined: DOB with dropdown pickers
function DobPickerCard({ dob, showAge, onChangeDob, onChangeShowAge }: {
  dob: string; showAge: boolean;
  onChangeDob: (v: string) => void; onChangeShowAge: (v: boolean) => void;
}) {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const years = Array.from({ length: maxYear - 1950 + 1 }, (_, i) => maxYear - i);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Parse existing dob
  const parts = dob ? dob.split("-") : [];
  const selYear = parts[0] || "";
  const selMonth = parts[1] || "";
  const selDay = parts[2] || "";

  const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
  const maxDays = selYear && selMonth ? daysInMonth(parseInt(selMonth), parseInt(selYear)) : 31;
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  const updateDob = (y: string, m: string, d: string) => {
    if (y && m && d) {
      onChangeDob(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    } else if (y || m || d) {
      // Partial — store what we have for the selects to work
      onChangeDob(`${y || "0000"}-${(m || "00").padStart(2, "0")}-${(d || "00").padStart(2, "0")}`);
    }
  };

  const age = dob && selYear !== "0000" && selMonth !== "00" && selDay !== "00"
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const selectClass = "flex-1 rounded-xl bg-gate-dark px-3 py-[14px] font-mono text-sm text-cream outline-none appearance-none text-center";
  const selectStyle = { border: "1.5px solid rgba(155,142,130,0.13)", colorScheme: "dark" as const };

  return (
    <CardShell animKey="dob">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">when were you born?</h2>
      <p className="mb-6 font-sans text-[13px] text-muted">you control whether your age shows on your profile.</p>

      <div className="flex gap-2.5">
        {/* Year */}
        <select value={selYear} onChange={(e) => updateDob(e.target.value, selMonth, selDay)} className={selectClass} style={selectStyle}>
          <option value="">year</option>
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        {/* Month */}
        <select value={selMonth} onChange={(e) => updateDob(selYear, e.target.value, selDay)} className={selectClass} style={selectStyle}>
          <option value="">month</option>
          {months.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
        </select>
        {/* Day */}
        <select value={selDay} onChange={(e) => updateDob(selYear, selMonth, e.target.value)} className={selectClass} style={selectStyle}>
          <option value="">day</option>
          {days.map((d) => <option key={d} value={String(d).padStart(2, "0")}>{d}</option>)}
        </select>
      </div>

      {age !== null && age >= 18 && (
        <p className="animate-fadeIn mt-4 text-center font-serif text-[20px] text-caramel">{age} years young</p>
      )}
      {dob && selYear !== "0000" && (
        <button
          onClick={() => onChangeShowAge(!showAge)}
          className="mx-auto mt-4 flex items-center gap-2 rounded-xl border-none px-4 py-2 font-sans text-[13px] transition-all"
          style={{ background: "rgba(155,142,130,0.07)", color: showAge ? "rgba(250,246,240,0.5)" : "rgba(250,246,240,0.3)", cursor: "pointer" }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] transition-all"
            style={{ background: showAge ? "#D4A574" : "rgba(155,142,130,0.13)", color: showAge ? "#0E0D0B" : "transparent" }}>
            {showAge ? "\u2713" : ""}
          </span>
          show my age on profile
        </button>
      )}
    </CardShell>
  );
}

// Combined: Gender + Area
function GenderAreaCard({ gender, area, onChangeGender, onChangeArea }: {
  gender: string; area: string;
  onChangeGender: (v: string) => void; onChangeArea: (v: string) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customArea, setCustomArea] = useState("");
  const isPreset = AREA_OPTIONS.includes(area) && area !== "other";

  return (
    <CardShell animKey="genderarea">
      {/* Gender - optional */}
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[3px] text-muted">optional</p>
      <h2 className="mb-4 font-serif text-[22px] font-normal text-cream">how do you identify?</h2>
      <div className="mb-8 flex flex-wrap gap-2">
        {GENDER_OPTIONS.map((g) => (
          <button
            key={g.label}
            onClick={() => onChangeGender(gender === g.label ? "" : g.label)}
            className="rounded-xl border-none font-sans text-[13px] font-medium transition-all duration-300"
            style={{
              padding: "10px 16px",
              background: gender === g.label ? "#D4A574" : "rgba(155,142,130,0.05)",
              color: gender === g.label ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              cursor: "pointer",
            }}
          >
            {g.display}
          </button>
        ))}
      </div>

      {/* Area - required */}
      <h2 className="mb-2 font-serif text-[22px] font-normal text-cream">where in bangalore?</h2>
      <p className="mb-4 font-sans text-[13px] text-muted">helps us assign your nearest pickup point</p>
      <div className="flex flex-wrap gap-2">
        {AREA_OPTIONS.filter((a) => a !== "other").map((a) => (
          <button
            key={a}
            onClick={() => { onChangeArea(a); setShowCustom(false); }}
            className="rounded-xl border-none font-sans text-[13px] font-medium transition-all duration-300"
            style={{
              padding: "10px 14px",
              background: area === a ? "#D4A574" : "rgba(155,142,130,0.07)",
              color: area === a ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              cursor: "pointer",
            }}
          >
            {a}
          </button>
        ))}
        <button
          onClick={() => { setShowCustom(true); onChangeArea(customArea || ""); }}
          className="rounded-xl font-sans text-[13px] font-medium transition-all duration-300"
          style={{
            padding: "10px 14px",
            border: `1.5px dashed ${showCustom || (!isPreset && area) ? "#D4A574" : "rgba(155,142,130,0.19)"}`,
            background: showCustom || (!isPreset && area) ? "rgba(212,165,116,0.1)" : "transparent",
            color: showCustom || (!isPreset && area) ? "#D4A574" : "rgba(155,142,130,0.38)",
            cursor: "pointer",
          }}
        >
          other
        </button>
      </div>
      {showCustom && (
        <input
          type="text" value={customArea} autoFocus
          onChange={(e) => { const v = e.target.value.slice(0, 40); setCustomArea(v); onChangeArea(v); }}
          placeholder="type your area"
          className="mt-3 w-full rounded-xl bg-gate-dark px-4 py-3 text-center font-sans text-base text-cream outline-none"
          style={{ border: "1.5px solid rgba(212,165,116,0.25)" }}
        />
      )}
    </CardShell>
  );
}

// Combined: Personality (Hot Take + Bio + Vibe Tag — all optional)
function PersonalityCard({ hotTake, bio, vibeTag, onChangeHotTake, onChangeBio, onChangeVibeTag, prefilled }: {
  hotTake: string; bio: string; vibeTag: string;
  onChangeHotTake: (v: string) => void; onChangeBio: (v: string) => void; onChangeVibeTag: (v: string) => void;
  prefilled: boolean;
}) {
  return (
    <CardShell animKey="personality">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[3px] text-muted">all optional — make it you</p>
      <h2 className="mb-6 font-serif text-[24px] font-normal text-cream">show your personality</h2>

      {/* Hot take */}
      <div className="mb-5">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted">
          hot take {prefilled && <MicroLabel />}
        </p>
        <input
          type="text" value={hotTake}
          onChange={(e) => onChangeHotTake(e.target.value.slice(0, 60))}
          placeholder="pineapple on pizza is elite"
          className="w-full rounded-xl bg-gate-dark px-4 py-3 font-hand text-[16px] text-cream outline-none"
          style={{ border: "1.5px solid rgba(155,142,130,0.13)" }}
        />
        <span className="mt-0.5 block text-right font-mono text-[9px]" style={{ color: "rgba(155,142,130,0.2)" }}>{hotTake.length}/60</span>
      </div>

      {/* Bio */}
      <div className="mb-5">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted">bio</p>
        <textarea
          value={bio}
          onChange={(e) => onChangeBio(e.target.value.slice(0, 200))}
          placeholder="weekend chai addict. always down for a hike."
          rows={2}
          className="w-full resize-none rounded-xl bg-gate-dark px-4 py-3 font-sans text-[14px] leading-relaxed text-cream outline-none"
          style={{ border: "1.5px solid rgba(155,142,130,0.13)" }}
        />
        <span className="mt-0.5 block text-right font-mono text-[9px]" style={{ color: "rgba(155,142,130,0.2)" }}>{bio.length}/200</span>
      </div>

      {/* Vibe tag */}
      <div>
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted">vibe tag</p>
        <input
          type="text" value={vibeTag}
          onChange={(e) => onChangeVibeTag(e.target.value.slice(0, 50))}
          placeholder="the planner / chaos coordinator"
          className="w-full rounded-xl bg-gate-dark px-4 py-3 font-hand text-[16px] text-cream outline-none"
          style={{ border: "1.5px solid rgba(155,142,130,0.13)" }}
        />
      </div>
    </CardShell>
  );
}

// Combined: Intent + Source
function IntentSourceCard({ intent, source, onChangeIntent, onChangeSource }: {
  intent: string; source: string;
  onChangeIntent: (v: string) => void; onChangeSource: (v: string) => void;
}) {
  return (
    <CardShell animKey="intentsource">
      {/* Intent */}
      <h2 className="mb-2 font-serif text-[22px] font-normal text-cream">why are you here?</h2>
      <p className="mb-4 font-sans text-[13px] text-muted">no wrong answers.</p>
      <div className="mb-8 flex flex-col gap-2">
        {INTENT_OPTIONS.map((d) => (
          <button
            key={d.label}
            onClick={() => onChangeIntent(d.label)}
            className="flex items-center gap-3 rounded-[14px] border-none text-left font-sans text-[14px] font-medium transition-all duration-300"
            style={{
              padding: "12px 16px",
              background: intent === d.label ? "#D4A574" : "rgba(155,142,130,0.05)",
              color: intent === d.label ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              cursor: "pointer",
            }}
          >
            <span className="text-lg">{d.emoji}</span>
            {d.label}
          </button>
        ))}
      </div>

      {/* Source */}
      <h2 className="mb-2 font-serif text-[22px] font-normal text-cream">how&apos;d you find us?</h2>
      <p className="mb-4 font-sans text-[13px] text-muted">just curious. won&apos;t show on your profile.</p>
      <div className="flex flex-col gap-2">
        {SOURCE_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onChangeSource(s)}
            className="rounded-[14px] border-none text-left font-sans text-[14px] font-medium transition-all duration-300"
            style={{
              padding: "12px 16px",
              background: source === s ? "#D4A574" : "rgba(155,142,130,0.05)",
              color: source === s ? "#0E0D0B" : "rgba(250,246,240,0.5)",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </CardShell>
  );
}

// PIN Setup Card
function PinSetupCard({ pin, pinConfirm, onChangePin, onChangePinConfirm }: {
  pin: string; pinConfirm: string;
  onChangePin: (v: string) => void; onChangePinConfirm: (v: string) => void;
}) {
  const pinMatch = pin.length === 4 && pin === pinConfirm;
  const showMismatch = pinConfirm.length === 4 && pin !== pinConfirm;

  return (
    <CardShell animKey="pin">
      <h2 className="mb-2 font-serif text-[22px] font-normal text-cream">set a 4-digit PIN</h2>
      <p className="mb-6 font-sans text-[13px] text-muted">you&apos;ll need this to sign back in. don&apos;t forget it.</p>

      <div className="mb-4">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted/60">pin</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => onChangePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          autoComplete="new-password"
          className="w-full rounded-[14px] border border-white/10 bg-white/5 px-5 py-4 text-center font-mono text-2xl tracking-[12px] text-cream placeholder:text-muted/20 focus:border-caramel/50 focus:outline-none"
        />
      </div>

      <div className="mb-4">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted/60">confirm pin</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pinConfirm}
          onChange={(e) => onChangePinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          autoComplete="new-password"
          className="w-full rounded-[14px] border bg-white/5 px-5 py-4 text-center font-mono text-2xl tracking-[12px] text-cream placeholder:text-muted/20 focus:outline-none"
          style={{
            borderColor: showMismatch ? "rgba(196,112,77,0.5)" : pinMatch ? "rgba(168,181,160,0.5)" : "rgba(255,255,255,0.1)",
          }}
        />
      </div>

      {showMismatch && (
        <p className="mt-1 font-sans text-[12px] text-terracotta" style={{ animation: "fadeIn 0.3s" }}>
          PINs don&apos;t match
        </p>
      )}
      {pinMatch && (
        <p className="mt-1 font-sans text-[12px] text-sage" style={{ animation: "fadeIn 0.3s" }}>
          looks good {"\u2713"}
        </p>
      )}
    </CardShell>
  );
}

// Interactive Confirm Card
function InteractiveConfirmCard({ profile, onEditField }: { profile: ProfileDraft; onEditField: (step: number) => void }) {
  const grad = profile.avatar?.type === "gradient" && profile.avatar.index !== undefined
    ? AVATAR_GRADIENTS[profile.avatar.index]
    : AVATAR_GRADIENTS[0];

  const EditHint = () => (
    <span className="ml-1 font-mono text-[9px] text-caramel/40">{"\u270E"}</span>
  );

  return (
    <CardShell animKey="confirm">
      <div className="text-center">
        {/* Avatar */}
        <button onClick={() => onEditField(1)} className="mx-auto mb-4 block">
          {profile.avatar?.type === "uploaded" && profile.avatar.dataUrl ? (
            <div className="animate-breathe h-20 w-20 overflow-hidden rounded-full" style={{ border: "3px solid rgba(212,165,116,0.25)" }}>
              <img src={profile.avatar.dataUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="animate-breathe flex h-20 w-20 items-center justify-center rounded-full text-[32px]"
              style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`, border: "3px solid rgba(212,165,116,0.25)" }}>
              {profile.avatar?.type === "gradient" && profile.avatar.index !== undefined ? AVATAR_EMOJIS[profile.avatar.index] : "\u2728"}
            </div>
          )}
        </button>

        {/* Name + Handle */}
        <button onClick={() => onEditField(2)} className="mb-1 block w-full text-center">
          <h2 className="font-serif text-2xl font-normal text-cream">
            {profile.name || "mystery person"}<EditHint />
          </h2>
          <p className="mt-0.5 font-mono text-sm text-caramel">
            {profile.handle ? `@${profile.handle}` : "@"}
          </p>
        </button>

        {profile.instagram && (
          <button onClick={() => onEditField(5)} className="block w-full text-center">
            <p className="font-mono text-[11px] text-muted/60">ig: @{profile.instagram}<EditHint /></p>
          </button>
        )}

        {profile.vibeTag && (
          <button onClick={() => onEditField(6)} className="mt-1 block w-full text-center">
            <p className="font-hand text-[13px] italic" style={{ color: "rgba(250,246,240,0.4)" }}>{profile.vibeTag}<EditHint /></p>
          </button>
        )}

        {/* Tags */}
        <button onClick={() => onEditField(4)} className="mb-2 mt-4 block w-full">
          <div className="flex flex-wrap justify-center gap-2">
            {profile.area && (
              <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.area}</span>
            )}
            {profile.dob && profile.dob !== "0000-00-00" && (
              <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>
                {Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
              </span>
            )}
            {profile.gender && (
              <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.gender}</span>
            )}
            {profile.intent && (
              <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.intent}</span>
            )}
          </div>
        </button>

        {profile.hotTake && (
          <button onClick={() => onEditField(6)} className="mt-3 block w-full">
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(155,142,130,0.05)" }}>
              <p className="font-hand text-base" style={{ color: "rgba(250,246,240,0.56)" }}>&ldquo;{profile.hotTake}&rdquo;<EditHint /></p>
            </div>
          </button>
        )}
        {profile.bio && (
          <button onClick={() => onEditField(6)} className="mt-2 block w-full">
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(155,142,130,0.05)" }}>
              <p className="font-sans text-[12px] leading-relaxed" style={{ color: "rgba(250,246,240,0.5)" }}>{profile.bio}<EditHint /></p>
            </div>
          </button>
        )}
        {profile.interests.length > 0 && (
          <button onClick={() => onEditField(7)} className="mt-3 block w-full">
            <div className="flex flex-wrap justify-center gap-1.5">
              {profile.interests.map((i) => (
                <span key={i} className="rounded-full font-mono text-[10px]" style={{ background: "rgba(212,165,116,0.12)", color: "#D4A574", padding: "3px 10px" }}>{i}</span>
              ))}
              <EditHint />
            </div>
          </button>
        )}

        <p className="mt-4 font-mono text-[10px] text-muted/30">tap any section to edit</p>
      </div>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PROFILE SETUP COMPONENT
   ═══════════════════════════════════════════════ */
export function ProfileSetup() {
  const { user, setUser, onboardingSource } = useAppStore();
  const { getIdToken } = useAuth();
  const isChatbot = onboardingSource === "landing_chatbot";
  const totalSteps = 11;

  // Initialize draft from user data (for chatbot pre-fill)
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileDraft>(() => ({
    avatar: null,
    name: isChatbot && user?.name ? user.name : "",
    handle: isChatbot && user?.handle ? user.handle.replace(/^@/, "") : "",
    instagram: isChatbot && user?.instagram_handle ? user.instagram_handle.replace(/^@/, "") : "",
    area: "",
    dob: "",
    showAge: true,
    gender: "",
    hotTake: "",
    bio: "",
    interests: [],
    vibeTag: "",
    intent: "",
    source: "",
    email: "",
    pin: "",
    pinConfirm: "",
  }));

  // Restore step position from localStorage on mount
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + user.id);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.step === "number") setStep(Math.min(parsed.step, 9));
        if (parsed.draft) setProfile((prev) => ({ ...prev, ...parsed.draft }));
      }
    } catch { /* ignore */ }
  }, [user?.id]);

  // Restore onboardingSource from localStorage if Zustand lost it
  useEffect(() => {
    if (!onboardingSource) {
      try {
        const saved = localStorage.getItem("co_onboarding_source");
        if (saved === "landing_code" || saved === "landing_chatbot" || saved === "direct_pwa") {
          useAppStore.getState().setOnboardingSource(saved);
        }
      } catch { /* ignore */ }
    }
  }, [onboardingSource]);

  const canProceed = () => {
    switch (step) {
      case 0: return true; // intro
      case 1: return true; // avatar optional
      case 2: return profile.name.trim().length >= 2 && profile.handle.length >= 3; // name + handle
      case 3: { // DOB
        if (!profile.dob || profile.dob === "0000-00-00") return false;
        const age = Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18;
      }
      case 4: return profile.area.length > 0; // gender (optional) + area
      case 5: return true; // instagram optional
      case 6: return true; // personality all optional
      case 7: return profile.interests.length >= 1; // interests
      case 8: return profile.intent.length > 0; // intent + source (source optional)
      case 9: return profile.pin.length === 4 && profile.pin === profile.pinConfirm; // PIN
      case 10: return true; // confirm
      default: return false;
    }
  };

  // Save partial profile data to API on each card advance (fire-and-forget)
  const savePartialProgress = useCallback(async (currentProfile: ProfileDraft, currentStep: number) => {
    try {
      const token = await getIdToken();
      if (!token || !user?.id) return;

      // Save step + draft to localStorage
      localStorage.setItem(STORAGE_KEY_PREFIX + user.id, JSON.stringify({ step: currentStep, draft: currentProfile }));

      // Build partial updates from filled fields
      const updates: Record<string, unknown> = {};
      if (currentProfile.name.trim()) updates.name = currentProfile.name.trim();
      if (currentProfile.handle) updates.handle = currentProfile.handle;
      if (currentProfile.instagram) updates.instagram_handle = currentProfile.instagram.replace(/^@/, "");
      if (currentProfile.email) updates.email = currentProfile.email;
      if (currentProfile.area) updates.area = currentProfile.area;
      if (currentProfile.dob) updates.date_of_birth = currentProfile.dob;
      if (currentProfile.dob) updates.show_age = currentProfile.showAge;
      if (currentProfile.gender) updates.gender = currentProfile.gender;
      if (currentProfile.hotTake) updates.hot_take = currentProfile.hotTake;
      if (currentProfile.bio) updates.bio = currentProfile.bio;
      if (currentProfile.interests.length > 0) updates.interests = currentProfile.interests;
      if (currentProfile.vibeTag) updates.vibe_tag = currentProfile.vibeTag;
      if (currentProfile.intent) updates.community_intent = currentProfile.intent;
      if (currentProfile.source) updates.referral_source = currentProfile.source;
      if (currentProfile.avatar) {
        if (currentProfile.avatar.type === "gradient" && currentProfile.avatar.index !== undefined) {
          updates.avatar_url = `gradient:${currentProfile.avatar.index}`;
          updates.avatar_type = "gradient";
        }
        // Don't send uploaded avatar on partial save (too large)
      }

      if (Object.keys(updates).length > 0) {
        apiFetch("/api/users/me", {
          method: "PUT",
          token,
          body: JSON.stringify(updates),
        }).catch((err: unknown) => { console.warn("[ProfileSetup] partial save failed:", err); });
      }
    } catch (err) { console.warn("[ProfileSetup] partial save error:", err); }
  }, [getIdToken, user?.id]);

  const next = async () => {
    if (step === totalSteps - 1) {
      // Final submit
      await submitProfile();
      return;
    }
    if (canProceed()) {
      const nextStep = step + 1;
      setStep(nextStep);
      savePartialProgress(profile, nextStep);
    }
  };

  const back = () => { if (step > 0) setStep(step - 1); };

  const update = (key: keyof ProfileDraft) => (val: ProfileDraft[typeof key]) => {
    setProfile((p) => ({ ...p, [key]: val }));
  };

  const submitProfile = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const token = await getIdToken();
      if (!token) { setSubmitting(false); return; }

      const updates: Record<string, unknown> = {
        name: profile.name.trim() || user?.name || "new face",
        handle: profile.handle || user?.handle || "",
        has_completed_profile: true,
      };

      if (profile.instagram) updates.instagram_handle = profile.instagram.replace(/^@/, "");
      if (profile.email) updates.email = profile.email;
      if (profile.area) updates.area = profile.area;
      if (profile.dob) {
        updates.date_of_birth = profile.dob;
        updates.show_age = profile.showAge;
      }
      if (profile.gender) updates.gender = profile.gender;
      if (profile.hotTake) updates.hot_take = profile.hotTake;
      if (profile.bio) updates.bio = profile.bio;
      if (profile.interests.length > 0) updates.interests = profile.interests;
      if (profile.vibeTag) updates.vibe_tag = profile.vibeTag;
      if (profile.intent) updates.community_intent = profile.intent;
      if (profile.source) updates.referral_source = profile.source;
      if (onboardingSource) updates.onboarding_source = onboardingSource;

      // Avatar
      if (profile.avatar) {
        if (profile.avatar.type === "uploaded" && profile.avatar.dataUrl) {
          updates.avatar_url = profile.avatar.dataUrl;
          updates.avatar_type = "uploaded";
        } else if (profile.avatar.type === "gradient" && profile.avatar.index !== undefined) {
          updates.avatar_url = `gradient:${profile.avatar.index}`;
          updates.avatar_type = "gradient";
        }
      }

      await apiFetch("/api/users/me", {
        method: "PUT",
        token,
        body: JSON.stringify(updates),
      });

      // Set PIN (separate endpoint — never stored in profile payload)
      if (profile.pin && profile.pin.length === 4) {
        await apiFetch("/api/users/me/pin", {
          method: "POST",
          token,
          body: JSON.stringify({ pin: profile.pin }),
        });
      }

      // Only update Zustand AFTER API confirms success
      if (user) {
        setUser({
          ...user,
          name: updates.name as string,
          handle: updates.handle as string,
          instagram_handle: profile.instagram || user.instagram_handle,
          area: profile.area || undefined,
          date_of_birth: profile.dob || undefined,
          show_age: profile.showAge,
          gender: profile.gender as User["gender"],
          hot_take: profile.hotTake || undefined,
          bio: profile.bio || undefined,
          interests: profile.interests.length > 0 ? profile.interests : undefined,
          vibe_tag: profile.vibeTag || user.vibe_tag,
          community_intent: profile.intent || undefined,
          referral_source: profile.source || undefined,
          has_completed_profile: true,
          avatar_url: profile.avatar?.type === "gradient" ? `gradient:${profile.avatar.index}` : profile.avatar?.dataUrl || undefined,
          avatar_type: profile.avatar?.type || undefined,
          onboarding_source: onboardingSource || undefined,
        });
      }

      // Clear localStorage
      if (user?.id) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + user.id);
      }
    } catch (err) {
      console.error("[ProfileSetup] submit error:", err);
      setSubmitError("something went wrong. tap confirm to try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderCard = () => {
    switch (step) {
      case 0: return <IntroCard isChatbot={isChatbot} />;
      case 1: return <AvatarCard value={profile.avatar} onChange={update("avatar") as (v: AvatarValue) => void} />;
      case 2: return <NameHandleCard name={profile.name} handle={profile.handle} onChangeName={update("name") as (v: string) => void} onChangeHandle={update("handle") as (v: string) => void} prefilled={isChatbot && !!user?.name} userId={user?.id} />;
      case 3: return <DobPickerCard dob={profile.dob} showAge={profile.showAge} onChangeDob={update("dob") as (v: string) => void} onChangeShowAge={update("showAge") as (v: boolean) => void} />;
      case 4: return <GenderAreaCard gender={profile.gender} area={profile.area} onChangeGender={update("gender") as (v: string) => void} onChangeArea={update("area") as (v: string) => void} />;
      case 5: return <InstagramCard value={profile.instagram} onChange={update("instagram") as (v: string) => void} email={profile.email} onChangeEmail={update("email") as (v: string) => void} prefilled={isChatbot && !!user?.instagram_handle} />;
      case 6: return <PersonalityCard hotTake={profile.hotTake} bio={profile.bio} vibeTag={profile.vibeTag} onChangeHotTake={update("hotTake") as (v: string) => void} onChangeBio={update("bio") as (v: string) => void} onChangeVibeTag={update("vibeTag") as (v: string) => void} prefilled={isChatbot} />;
      case 7: return <InterestsCard value={profile.interests} onChange={update("interests") as (v: string[]) => void} />;
      case 8: return <IntentSourceCard intent={profile.intent} source={profile.source} onChangeIntent={update("intent") as (v: string) => void} onChangeSource={update("source") as (v: string) => void} />;
      case 9: return <PinSetupCard pin={profile.pin} pinConfirm={profile.pinConfirm} onChangePin={update("pin") as (v: string) => void} onChangePinConfirm={update("pinConfirm") as (v: string) => void} />;
      case 10: return <InteractiveConfirmCard profile={profile} onEditField={(s) => setStep(s)} />;
      default: return null;
    }
  };

  const getButtonLabel = () => {
    if (step === 0) return "let\u2019s go \u2192";
    if (step === 10) return "that\u2019s me \u2192";
    // Optional fields: show "skip" when empty
    if (step === 1 && !profile.avatar) return "skip \u2192";
    if (step === 5 && !profile.instagram) return "skip \u2192";
    if (step === 6 && !profile.hotTake && !profile.bio && !profile.vibeTag) return "skip \u2192";
    return "next \u2192";
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gate-black">
      <Noise opacity={0.05} />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[10%] h-[300px] w-[300px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(212,165,116,0.04), transparent 70%)", animation: "pulse 4s ease infinite" }}
      />

      {/* Top bar */}
      <div className="relative z-[2] flex items-center justify-between px-7 pt-5">
        {step > 0 ? (
          <button onClick={back} className="border-none bg-transparent py-2 font-sans text-sm text-muted" style={{ cursor: "pointer" }}>
            {"\u2190"} back
          </button>
        ) : <div />}
        <span className="font-mono text-[10px] tracking-[1px]" style={{ color: "rgba(155,142,130,0.25)" }}>{step + 1}/{totalSteps}</span>
      </div>

      {/* Progress dots */}
      <div className="relative z-[2] px-7 py-4">
        <ProgressBar total={totalSteps} current={step} />
      </div>

      {/* Card */}
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
        {renderCard()}
      </div>

      {/* Bottom CTA */}
      <div className="relative z-[2] px-7 pt-4" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}>
        {submitError && (
          <p className="mb-3 rounded-[14px] border border-terracotta/20 bg-terracotta/10 px-4 py-3 text-center font-sans text-sm text-terracotta">
            {submitError}
          </p>
        )}
        <NextButton onClick={next} disabled={!canProceed() || submitting} label={submitting ? "saving..." : getButtonLabel()} />
        {step >= 3 && step < 9 && (
          <button
            onClick={async () => {
              if (submitting) return;
              setSubmitting(true);
              setSubmitError("");
              try {
                const token = await getIdToken();
                if (!token) { setSubmitting(false); return; }
                const updates: Record<string, unknown> = {
                  name: profile.name.trim() || user?.name || "new face",
                  handle: profile.handle || user?.handle || "",
                  has_completed_profile: true,
                  has_completed_onboarding: true,
                };
                if (profile.instagram) updates.instagram_handle = profile.instagram.replace(/^@/, "");
                if (profile.area) updates.area = profile.area;
                if (profile.dob && profile.dob !== "0000-00-00") {
                  updates.date_of_birth = profile.dob;
                  updates.show_age = profile.showAge;
                }
                if (profile.gender) updates.gender = profile.gender;
                if (profile.hotTake) updates.hot_take = profile.hotTake;
                if (profile.bio) updates.bio = profile.bio;
                if (profile.interests.length > 0) updates.interests = profile.interests;
                if (profile.vibeTag) updates.vibe_tag = profile.vibeTag;
                if (profile.intent) updates.community_intent = profile.intent;
                if (profile.source) updates.referral_source = profile.source;
                if (onboardingSource) updates.onboarding_source = onboardingSource;
                if (profile.avatar) {
                  if (profile.avatar.type === "uploaded" && profile.avatar.dataUrl) {
                    updates.avatar_url = profile.avatar.dataUrl;
                    updates.avatar_type = "uploaded";
                  } else if (profile.avatar.type === "gradient" && profile.avatar.index !== undefined) {
                    updates.avatar_url = `gradient:${profile.avatar.index}`;
                    updates.avatar_type = "gradient";
                  }
                }
                await apiFetch("/api/users/me", { method: "PUT", token, body: JSON.stringify(updates) });
                // Only update Zustand AFTER API confirms success
                if (user) {
                  setUser({ ...user, ...updates, has_completed_profile: true, has_completed_onboarding: true } as typeof user);
                }
                if (user?.id) localStorage.removeItem(STORAGE_KEY_PREFIX + user.id);
              } catch (err) {
                console.error("[ProfileSetup] finish later error:", err);
                setSubmitError("couldn\u2019t save. check your connection and try again.");
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            className="mt-3 w-full border-none bg-transparent py-2 font-mono text-[11px] text-muted/40 transition-colors hover:text-muted/60"
            style={{ cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.5 : 1 }}
          >
            {submitting ? "saving..." : "finish later \u2192"}
          </button>
        )}
      </div>
    </div>
  );
}
