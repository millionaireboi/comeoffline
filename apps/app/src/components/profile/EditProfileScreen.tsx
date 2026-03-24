"use client";

import { useState, useRef, useCallback } from "react";
import { CURATED_INTERESTS } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

const AVATAR_GRADIENTS = [
  ["#D4A574", "#C4704D"], ["#B8A9C9", "#8B7BA8"], ["#A8B5A0", "#7A9170"],
  ["#DBBCAC", "#D4836B"], ["#E6A97E", "#B8845A"], ["#D4836B", "#8B6F5A"],
  ["#C4956A", "#3D2E22"], ["#B8A9C9", "#C4704D"],
];

const AVATAR_EMOJIS = ["\u2728", "\u{1F33F}", "\u{1F319}", "\u{1F98B}", "\u{1F525}", "\u{1F3B5}", "\u{1F4AB}", "\u{1F338}"];

const AREA_OPTIONS = [
  "Koramangala", "Indiranagar", "HSR Layout", "Whitefield",
  "JP Nagar", "Jayanagar", "Marathahalli", "Electronic City",
];

interface EditProfileProps {
  user: {
    name: string;
    handle: string;
    avatar_url?: string;
    avatar_type?: string;
    area?: string;
    hot_take?: string;
    bio?: string;
    interests?: string[];
    vibe_tag?: string;
    instagram_handle?: string;
    show_age?: boolean;
    drink_of_choice?: string;
  };
  onSave: () => void;
  onClose: () => void;
}

export function EditProfileScreen({ user, onSave, onClose }: EditProfileProps) {
  const { getIdToken } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState(user.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [avatarType, setAvatarType] = useState(user.avatar_type || "");
  const [newAvatarDataUrl, setNewAvatarDataUrl] = useState<string | null>(null);
  const [area, setArea] = useState(user.area || "");
  const [customArea, setCustomArea] = useState(!AREA_OPTIONS.includes(user.area || "") ? (user.area || "") : "");
  const [showCustomArea, setShowCustomArea] = useState(!AREA_OPTIONS.includes(user.area || "") && !!user.area);
  const [hotTake, setHotTake] = useState(user.hot_take || "");
  const [bio, setBio] = useState(user.bio || "");
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [vibeTag, setVibeTag] = useState(user.vibe_tag || "");
  const [igHandle, setIgHandle] = useState(user.instagram_handle || "");
  const [showAge, setShowAge] = useState(user.show_age !== false);
  const [drinkOfChoice, setDrinkOfChoice] = useState(user.drink_of_choice || "");

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        setNewAvatarDataUrl(dataUrl);
        setAvatarType("uploaded");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const selectGradient = (index: number) => {
    setAvatarUrl(`gradient:${index}`);
    setAvatarType("gradient");
    setNewAvatarDataUrl(null);
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else if (interests.length < 8) {
      setInterests([...interests, interest]);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const token = await getIdToken();
      if (!token) return;

      const updates: Record<string, unknown> = {
        name: name.trim(),
        hot_take: hotTake,
        bio: bio,
        vibe_tag: vibeTag,
        area: area,
        instagram_handle: igHandle,
        show_age: showAge,
        drink_of_choice: drinkOfChoice,
        interests: interests,
      };

      if (newAvatarDataUrl) {
        updates.avatar_url = newAvatarDataUrl;
        updates.avatar_type = "uploaded";
      } else if (avatarType === "gradient") {
        updates.avatar_url = avatarUrl;
        updates.avatar_type = "gradient";
      }

      await apiFetch("/api/users/me", {
        method: "PUT",
        token,
        body: JSON.stringify(updates),
      });

      onSave();
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Render avatar preview
  const renderAvatarPreview = () => {
    if (newAvatarDataUrl) {
      return (
        <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-caramel/30">
          <img src={newAvatarDataUrl} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
    if (avatarType === "uploaded" && avatarUrl && !avatarUrl.startsWith("gradient:")) {
      return (
        <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-white/10">
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
    if (avatarType === "gradient" && avatarUrl?.startsWith("gradient:")) {
      const index = parseInt(avatarUrl.replace("gradient:", ""), 10);
      const grad = AVATAR_GRADIENTS[index] || AVATAR_GRADIENTS[0];
      return (
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white/10 text-2xl"
          style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
        >
          {AVATAR_EMOJIS[index] || "\u2728"}
        </div>
      );
    }
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 font-serif text-2xl text-white">
        {name.charAt(0) || "?"}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[500] overflow-y-auto bg-gate-black">
      <Noise opacity={0.05} />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-gate-black/95 px-5 pb-3 pt-5 backdrop-blur-sm">
        <button onClick={onClose} className="font-mono text-[11px] text-muted">
          cancel
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">edit profile</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-caramel px-4 py-1.5 font-mono text-[11px] font-medium text-near-black disabled:opacity-50"
        >
          {saving ? "..." : "save"}
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-2 rounded-xl border border-terracotta/20 bg-terracotta/10 px-4 py-3 text-center font-sans text-sm text-terracotta">
          {error}
        </div>
      )}

      <div className="px-5 pb-24 pt-4">
        {/* Avatar section */}
        <section className="mb-8 text-center">
          <div className="mb-4 flex justify-center">{renderAvatarPreview()}</div>
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {AVATAR_GRADIENTS.map((g, i) => (
              <button
                key={i}
                onClick={() => selectGradient(i)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm transition-all"
                style={{
                  background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
                  border: avatarType === "gradient" && avatarUrl === `gradient:${i}` && !newAvatarDataUrl
                    ? "2px solid #D4A574" : "2px solid transparent",
                }}
              >
                {AVATAR_EMOJIS[i]}
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            className="font-mono text-[11px] text-caramel"
          >
            upload photo
          </button>
        </section>

        {/* Name */}
        <FieldSection label="name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            className="w-full rounded-xl bg-white/5 px-4 py-3 font-sans text-[15px] text-cream outline-none"
            style={{ border: "1px solid rgba(155,142,130,0.1)" }}
          />
        </FieldSection>

        {/* Handle (read-only) */}
        <FieldSection label="handle">
          <div className="rounded-xl bg-white/[0.03] px-4 py-3 font-mono text-[15px] text-muted">
            @{user.handle}
          </div>
        </FieldSection>

        {/* Bio */}
        <FieldSection label="bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            placeholder="tell people about yourself..."
            rows={3}
            className="w-full resize-none rounded-xl bg-white/5 px-4 py-3 font-sans text-[15px] leading-relaxed text-cream outline-none"
            style={{ border: "1px solid rgba(155,142,130,0.1)" }}
          />
          <span className="mt-1 block text-right font-mono text-[10px] text-muted/40">{bio.length}/200</span>
        </FieldSection>

        {/* Hot Take */}
        <FieldSection label="hot take">
          <input
            type="text"
            value={hotTake}
            onChange={(e) => setHotTake(e.target.value.slice(0, 60))}
            placeholder="pineapple on pizza is elite"
            className="w-full rounded-xl bg-white/5 px-4 py-3 font-hand text-[16px] text-cream outline-none"
            style={{ border: "1px solid rgba(155,142,130,0.1)" }}
          />
          <span className="mt-1 block text-right font-mono text-[10px] text-muted/40">{hotTake.length}/60</span>
        </FieldSection>

        {/* Vibe Tag */}
        <FieldSection label="vibe tag">
          <input
            type="text"
            value={vibeTag}
            onChange={(e) => setVibeTag(e.target.value.slice(0, 50))}
            placeholder="the planner / chaos coordinator"
            className="w-full rounded-xl bg-white/5 px-4 py-3 font-hand text-[16px] text-cream outline-none"
            style={{ border: "1px solid rgba(155,142,130,0.1)" }}
          />
        </FieldSection>

        {/* Interests */}
        <FieldSection label={`interests (${interests.length}/8)`}>
          <div className="flex flex-wrap gap-2">
            {(CURATED_INTERESTS as readonly string[]).map((interest) => {
              const selected = interests.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className="rounded-full font-sans text-[13px] font-medium transition-all"
                  style={{
                    padding: "7px 14px",
                    background: selected ? "#D4A574" : "rgba(155,142,130,0.07)",
                    color: selected ? "#0E0D0B" : "rgba(250,246,240,0.5)",
                    opacity: interests.length >= 8 && !selected ? 0.4 : 1,
                  }}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </FieldSection>

        {/* Area */}
        <FieldSection label="area">
          <div className="flex flex-wrap gap-2">
            {AREA_OPTIONS.map((a) => (
              <button
                key={a}
                onClick={() => { setArea(a); setShowCustomArea(false); }}
                className="rounded-xl font-sans text-[13px] font-medium transition-all"
                style={{
                  padding: "8px 14px",
                  background: area === a ? "#D4A574" : "rgba(155,142,130,0.07)",
                  color: area === a ? "#0E0D0B" : "rgba(250,246,240,0.5)",
                }}
              >
                {a}
              </button>
            ))}
            <button
              onClick={() => { setShowCustomArea(true); setArea(customArea); }}
              className="rounded-xl font-sans text-[13px] font-medium transition-all"
              style={{
                padding: "8px 14px",
                border: `1.5px dashed ${showCustomArea ? "#D4A574" : "rgba(155,142,130,0.19)"}`,
                background: showCustomArea ? "rgba(212,165,116,0.1)" : "transparent",
                color: showCustomArea ? "#D4A574" : "rgba(155,142,130,0.38)",
              }}
            >
              other
            </button>
          </div>
          {showCustomArea && (
            <input
              type="text"
              value={customArea}
              autoFocus
              onChange={(e) => { const v = e.target.value.slice(0, 40); setCustomArea(v); setArea(v); }}
              placeholder="type your area"
              className="mt-3 w-full rounded-xl bg-white/5 px-4 py-3 text-center font-sans text-[15px] text-cream outline-none"
              style={{ border: "1px solid rgba(212,165,116,0.25)" }}
            />
          )}
        </FieldSection>

        {/* Instagram */}
        <FieldSection label="instagram">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted/30">@</span>
            <input
              type="text"
              value={igHandle}
              onChange={(e) => setIgHandle(e.target.value.replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30))}
              placeholder="your_handle"
              className="w-full rounded-xl bg-white/5 py-3 pl-9 pr-4 font-mono text-[15px] text-cream outline-none"
              style={{ border: "1px solid rgba(155,142,130,0.1)" }}
            />
          </div>
        </FieldSection>

        {/* Show Age toggle */}
        <FieldSection label="show age on profile">
          <button
            onClick={() => setShowAge(!showAge)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-sans text-[14px] transition-all"
            style={{ background: "rgba(155,142,130,0.07)", color: "rgba(250,246,240,0.5)" }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-lg text-sm transition-all"
              style={{
                background: showAge ? "#D4A574" : "rgba(155,142,130,0.13)",
                color: showAge ? "#0E0D0B" : "transparent",
              }}
            >
              {showAge ? "\u2713" : ""}
            </span>
            {showAge ? "age is visible" : "age is hidden"}
          </button>
        </FieldSection>

        {/* Drink of choice */}
        <FieldSection label="drink of choice">
          <input
            type="text"
            value={drinkOfChoice}
            onChange={(e) => setDrinkOfChoice(e.target.value.slice(0, 100))}
            placeholder="chai, old monk, kombucha..."
            className="w-full rounded-xl bg-white/5 px-4 py-3 font-sans text-[15px] text-cream outline-none"
            style={{ border: "1px solid rgba(155,142,130,0.1)" }}
          />
        </FieldSection>
      </div>
    </div>
  );
}

function FieldSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
