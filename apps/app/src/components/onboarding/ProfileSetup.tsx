"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Noise } from "@/components/shared/Noise";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import type { User } from "@comeoffline/types";

/* ═══════════════════════════════════════════════
   DATA CONSTANTS (from prototype)
   ═══════════════════════════════════════════════ */
const VIBE_OPTIONS = [
  "chaotic good energy", "whisper", "i AM the opinion",
  "my friends fear me", "normal human", "main character energy",
];

const AREA_OPTIONS = [
  "Koramangala", "Indiranagar", "HSR Layout", "Whitefield",
  "JP Nagar", "Jayanagar", "Marathahalli", "Electronic City", "other",
];

const AGE_OPTIONS: Array<"21-24" | "25-28" | "29-32" | "33+"> = ["21-24", "25-28", "29-32", "33+"];

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
  vibe: string;
  instagram: string;
  area: string;
  age: string;
  hotTake: string;
  drink: string;
  source: string;
}

const STORAGE_KEY_PREFIX = "co_profile_setup_";

/* ═══════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═══════════════════════════════════════════════ */
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-400"
          style={{
            width: i === current ? "24px" : "8px",
            background: i <= current ? "#D4A574" : "rgba(155,142,130,0.19)",
          }}
        />
      ))}
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
   CARD COMPONENTS (12 total)
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
          {isChatbot ? "fix anything that\u2019s off. takes 30 seconds." : "tell us who you are. takes 30 seconds."}
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
    const t = setTimeout(async () => {
      try {
        const token = await getIdToken();
        if (!token) { setChecking(false); return; }
        const res = await apiFetch<{ success: boolean; data: { available: boolean } }>(
          `/api/users/check-handle/${encodeURIComponent(value)}`,
          { token },
        );
        const isAvailable = res.data?.available ?? true;
        setAvailable(isAvailable);

        // Handle collision: if auto-generated and taken, append random digits
        if (!isAvailable && autoGenRef.current) {
          const suffix = Math.floor(10 + Math.random() * 90).toString();
          onChangeRef.current(value + suffix);
        }
      } catch {
        setAvailable(true); // Optimistic on error
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(t);
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

// Card 4: Vibe Tag
function VibeCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  return (
    <CardShell animKey="vibe">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">pick your vibe</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">how would your friends describe you at a party?</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {VIBE_OPTIONS.map((v) => (
          <button
            key={v}
            onClick={() => { onChange(v); setCustom(false); }}
            className="rounded-full border-none font-hand text-base font-medium transition-all duration-300"
            style={{
              padding: "10px 18px",
              background: value === v ? "#D4A574" : "rgba(155,142,130,0.07)",
              color: value === v ? "#0E0D0B" : "rgba(250,246,240,0.56)",
              transform: value === v ? "scale(1.08)" : "scale(1)",
              boxShadow: value === v ? "0 4px 20px rgba(212,165,116,0.25)" : "none",
              cursor: "pointer",
            }}
          >
            {v}
          </button>
        ))}
        <button
          onClick={() => { setCustom(true); onChange(""); }}
          className="rounded-full font-mono text-[13px] transition-all duration-300"
          style={{
            padding: "10px 18px",
            border: `1.5px dashed ${custom ? "#D4A574" : "rgba(155,142,130,0.19)"}`,
            background: custom ? "rgba(212,165,116,0.1)" : "transparent",
            color: custom ? "#D4A574" : "rgba(155,142,130,0.38)",
            cursor: "pointer",
          }}
        >
          + write your own
        </button>
      </div>
      {custom && (
        <div className="animate-fadeSlideUp mt-4">
          <input
            type="text"
            value={customText}
            autoFocus
            onChange={(e) => { const v = e.target.value.slice(0, 25); setCustomText(v); onChange(v); }}
            placeholder="your vibe in 25 chars"
            className="w-full rounded-xl bg-gate-dark px-4 py-3.5 text-center font-hand text-lg text-cream outline-none"
            style={{ border: "1.5px solid rgba(212,165,116,0.25)" }}
          />
          <p className="mt-1 text-right font-mono text-[10px]" style={{ color: "rgba(155,142,130,0.25)" }}>{customText.length}/25</p>
        </div>
      )}
    </CardShell>
  );
}

// Card 5: Instagram
function InstagramCard({ value, onChange, prefilled }: { value: string; onChange: (v: string) => void; prefilled: boolean }) {
  return (
    <CardShell animKey="insta">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted">optional</p>
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">
        drop your insta
        {prefilled && <MicroLabel />}
      </h2>
      <p className="mb-8 font-sans text-[13px] leading-relaxed text-muted">
        only revealed on mutual match after events. nobody sees this unless you both vibe.
      </p>
      <div className="relative">
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
    </CardShell>
  );
}

// Card 6: Area
function AreaCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="area">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">where in bangalore?</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">helps us assign your nearest pickup point</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {AREA_OPTIONS.map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
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
      </div>
    </CardShell>
  );
}

// Card 7: Age Range
function AgeCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="age">
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">how old are you (roughly)?</h2>
      <p className="mb-8 font-sans text-[13px] text-muted">no pressure. range only.</p>
      <div className="flex justify-center gap-3">
        {AGE_OPTIONS.map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
            className="min-w-[70px] rounded-2xl border-none font-mono text-lg font-medium transition-all duration-300"
            style={{
              padding: "16px 20px",
              background: value === a ? "#D4A574" : "rgba(155,142,130,0.06)",
              color: value === a ? "#0E0D0B" : "rgba(250,246,240,0.44)",
              transform: value === a ? "scale(1.08)" : "scale(1)",
              boxShadow: value === a ? "0 4px 16px rgba(212,165,116,0.19)" : "none",
              cursor: "pointer",
            }}
          >
            {a}
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
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted">optional</p>
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

// Card 9: Drink
function DrinkCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CardShell animKey="drink">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[3px] text-muted">optional</p>
      <h2 className="mb-2 font-serif text-[28px] font-normal text-cream">your go-to drink?</h2>
      <p className="mb-7 font-sans text-[13px] text-muted">helps us plan what to stock</p>
      <div className="grid grid-cols-4 gap-2.5">
        {DRINK_OPTIONS.map((d) => (
          <button
            key={d.label}
            onClick={() => onChange(d.label)}
            className="flex flex-col items-center gap-1.5 rounded-[14px] border-none py-3.5 font-sans text-xs transition-all duration-300"
            style={{
              background: value === d.label ? "#D4A574" : "rgba(155,142,130,0.06)",
              color: value === d.label ? "#0E0D0B" : "rgba(250,246,240,0.44)",
              transform: value === d.label ? "scale(1.08)" : "scale(1)",
              cursor: "pointer",
            }}
          >
            <span className="text-[22px]">{d.emoji}</span>
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
        {profile.vibe && (
          <p className="mb-4 font-hand text-lg text-muted">{profile.vibe}</p>
        )}
        <div className="mb-2 flex flex-wrap justify-center gap-2">
          {profile.area && (
            <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.area}</span>
          )}
          {profile.age && (
            <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.age}</span>
          )}
          {profile.drink && (
            <span className="rounded-lg font-mono text-[11px] text-muted" style={{ background: "rgba(155,142,130,0.07)", padding: "4px 10px" }}>{profile.drink}</span>
          )}
        </div>
        {profile.hotTake && (
          <div className="mt-3 rounded-xl px-4 py-3" style={{ background: "rgba(155,142,130,0.05)" }}>
            <p className="font-hand text-base" style={{ color: "rgba(250,246,240,0.56)" }}>&ldquo;{profile.hotTake}&rdquo;</p>
          </div>
        )}
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
  const totalSteps = 12;

  // Initialize draft from user data (for chatbot pre-fill)
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileDraft>(() => ({
    avatar: null,
    name: isChatbot && user?.name ? user.name : "",
    handle: isChatbot && user?.handle ? user.handle.replace(/^@/, "") : "",
    vibe: "",
    instagram: isChatbot && user?.instagram_handle ? user.instagram_handle : "",
    area: "",
    age: "",
    hotTake: "",
    drink: "",
    source: "",
  }));

  // Restore step position from localStorage on mount
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + user.id);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.step === "number") setStep(parsed.step);
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
      case 0: return true;
      case 1: return true; // avatar optional
      case 2: return profile.name.trim().length >= 2;
      case 3: return profile.handle.length >= 3;
      case 4: return profile.vibe.length > 0;
      case 5: return true; // instagram optional
      case 6: return profile.area.length > 0;
      case 7: return profile.age.length > 0;
      case 8: return true; // hot take optional
      case 9: return true; // drink optional
      case 10: return profile.source.length > 0;
      case 11: return true;
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
      if (currentProfile.vibe) updates.vibe_tag = currentProfile.vibe;
      if (currentProfile.instagram) updates.instagram_handle = currentProfile.instagram;
      if (currentProfile.area) updates.area = currentProfile.area;
      if (currentProfile.age) updates.age_range = currentProfile.age;
      if (currentProfile.hotTake) updates.hot_take = currentProfile.hotTake;
      if (currentProfile.drink) updates.drink_of_choice = currentProfile.drink;
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
        }).catch(() => { /* non-blocking */ });
      }
    } catch { /* non-blocking */ }
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
    try {
      const token = await getIdToken();
      if (!token) return;

      const updates: Record<string, unknown> = {
        name: profile.name.trim() || user?.name || "new face",
        handle: profile.handle || user?.handle || "",
        vibe_tag: profile.vibe || "",
        has_completed_profile: true,
      };

      if (profile.instagram) updates.instagram_handle = profile.instagram;
      if (profile.area) updates.area = profile.area;
      if (profile.age) updates.age_range = profile.age;
      if (profile.hotTake) updates.hot_take = profile.hotTake;
      if (profile.drink) updates.drink_of_choice = profile.drink;
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

      // Update Zustand user so useStage transitions to app_education
      if (user) {
        setUser({
          ...user,
          name: updates.name as string,
          handle: updates.handle as string,
          vibe_tag: updates.vibe_tag as string,
          instagram_handle: profile.instagram || user.instagram_handle,
          area: profile.area || undefined,
          age_range: profile.age as User["age_range"],
          hot_take: profile.hotTake || undefined,
          drink_of_choice: profile.drink || undefined,
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
    }
  };

  const renderCard = () => {
    switch (step) {
      case 0: return <IntroCard isChatbot={isChatbot} />;
      case 1: return <AvatarCard value={profile.avatar} onChange={update("avatar") as (v: AvatarValue) => void} />;
      case 2: return <NameCard value={profile.name} onChange={update("name") as (v: string) => void} prefilled={isChatbot && !!user?.name} />;
      case 3: return <HandleCard name={profile.name} value={profile.handle} onChange={update("handle") as (v: string) => void} userId={user?.id} />;
      case 4: return <VibeCard value={profile.vibe} onChange={update("vibe") as (v: string) => void} />;
      case 5: return <InstagramCard value={profile.instagram} onChange={update("instagram") as (v: string) => void} prefilled={isChatbot && !!user?.instagram_handle} />;
      case 6: return <AreaCard value={profile.area} onChange={update("area") as (v: string) => void} />;
      case 7: return <AgeCard value={profile.age} onChange={update("age") as (v: string) => void} />;
      case 8: return <HotTakeCard value={profile.hotTake} onChange={update("hotTake") as (v: string) => void} prefilled={isChatbot} />;
      case 9: return <DrinkCard value={profile.drink} onChange={update("drink") as (v: string) => void} />;
      case 10: return <SourceCard value={profile.source} onChange={update("source") as (v: string) => void} />;
      case 11: return <ConfirmCard profile={profile} />;
      default: return null;
    }
  };

  const getButtonLabel = () => {
    if (step === 0) return "let\u2019s go \u2192";
    if (step === 11) return "that\u2019s me \u2192";
    // Optional fields: show "skip" when empty
    if (step === 1 && !profile.avatar) return "skip \u2192";
    if (step === 5 && !profile.instagram) return "skip \u2192";
    if (step === 8 && !profile.hotTake) return "skip \u2192";
    if (step === 9 && !profile.drink) return "skip \u2192";
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
        <ProgressDots total={totalSteps} current={step} />
      </div>

      {/* Card */}
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
        {renderCard()}
      </div>

      {/* Bottom CTA */}
      <div className="relative z-[2] px-7 pb-8 pt-4">
        <NextButton onClick={next} disabled={!canProceed()} label={getButtonLabel()} />
      </div>
    </div>
  );
}
