"use client";

import { useState, useEffect } from "react";
import type { Badge } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

const AVATAR_GRADIENTS = [
  ["#D4A574", "#C4704D"], ["#B8A9C9", "#8B7BA8"], ["#A8B5A0", "#7A9170"],
  ["#DBBCAC", "#D4836B"], ["#E6A97E", "#B8845A"], ["#D4836B", "#8B6F5A"],
  ["#C4956A", "#3D2E22"], ["#B8A9C9", "#C4704D"],
];

const AVATAR_EMOJIS = ["\u2728", "\u{1F33F}", "\u{1F319}", "\u{1F98B}", "\u{1F525}", "\u{1F3B5}", "\u{1F4AB}", "\u{1F338}"];

interface ProfileData {
  user: {
    id: string;
    name: string;
    handle: string;
    vibe_tag: string;
    instagram_handle?: string;
    avatar_url?: string;
    avatar_type?: string;
    area?: string;
    age_range?: string;
    hot_take?: string;
    drink_of_choice?: string;
    entry_path: string;
    status: string;
    vibe_check_answers?: Array<{ question: string; answer: string }>;
    created_at: string;
  };
  stats: {
    events_attended: number;
    connections_made: number;
    vouch_codes_earned: number;
    vouch_codes_used: number;
  };
  event_history: Array<{
    event_id: string;
    title: string;
    emoji: string;
    date: string;
    status: string;
  }>;
  badges: Badge[];
}

const VIBE_COLORS: Record<string, string> = {
  "the connector": "#6B7A63",
  "the creative": "#D4A574",
  "the deep talker": "#8B7EC8",
  "the wildcard": "#D4836B",
  "the observer": "#7A8B9C",
};

function ProfileAvatar({ user, vibeColor }: { user: ProfileData["user"]; vibeColor: string }) {
  // Uploaded avatar
  if (user.avatar_type === "uploaded" && user.avatar_url && !user.avatar_url.startsWith("gradient:")) {
    return (
      <div className="h-16 w-16 overflow-hidden rounded-full">
        <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  // Gradient avatar
  if (user.avatar_type === "gradient" && user.avatar_url?.startsWith("gradient:")) {
    const index = parseInt(user.avatar_url.replace("gradient:", ""), 10);
    const grad = AVATAR_GRADIENTS[index] || AVATAR_GRADIENTS[0];
    const emoji = AVATAR_EMOJIS[index] || "\u2728";
    return (
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
        style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
      >
        {emoji}
      </div>
    );
  }

  // Fallback: first letter of name
  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-full font-serif text-2xl text-white"
      style={{ background: vibeColor }}
    >
      {user.name.charAt(0)}
    </div>
  );
}

export function ProfileScreen() {
  const { getIdToken, logout } = useAuth();
  const { setStage } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [igHandle, setIgHandle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: ProfileData }>(
          "/api/users/me",
          { token },
        );
        if (data.data) {
          setProfile(data.data);
          setIgHandle(data.data.user.instagram_handle || "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [getIdToken]);

  const handleSaveIg = async () => {
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      await apiFetch("/api/users/me", {
        method: "PUT",
        token,
        body: JSON.stringify({ instagram_handle: igHandle }),
      });
      setProfile((prev) =>
        prev ? { ...prev, user: { ...prev.user, instagram_handle: igHandle } } : prev,
      );
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const vibeColor = VIBE_COLORS[profile.user.vibe_tag.toLowerCase()] || "#D4A574";
  const memberSince = new Date(profile.user.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const hasPersonalityData = profile.user.hot_take || profile.user.area || profile.user.age_range || profile.user.drink_of_choice;

  return (
    <div className="min-h-screen bg-cream pb-[120px]">
      <Noise />

      {/* Header with back */}
      <div className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={() => setStage("feed")}
          className="font-mono text-[11px] text-muted transition-colors hover:text-near-black"
        >
          ← feed
        </button>
        <button
          onClick={logout}
          className="font-mono text-[11px] text-muted/50 transition-colors hover:text-terracotta"
        >
          log out
        </button>
      </div>

      {/* Profile card */}
      <section className="animate-fadeSlideUp px-5 pt-6">
        <div className="rounded-[24px] bg-white p-6 shadow-[0_2px_12px_rgba(26,23,21,0.06)]">
          {/* Avatar */}
          <div className="mb-5 flex items-center gap-4">
            <ProfileAvatar user={profile.user} vibeColor={vibeColor} />
            <div>
              <h2 className="font-serif text-[26px] font-normal leading-none text-near-black">
                {profile.user.name}
              </h2>
              <p className="mt-0.5 font-mono text-[12px] text-muted">@{profile.user.handle}</p>
            </div>
          </div>

          {/* Vibe tag + status */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {profile.user.vibe_tag && (
              <span
                className="rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[1px]"
                style={{ color: vibeColor, background: vibeColor + "15" }}
              >
                {profile.user.vibe_tag}
              </span>
            )}
            <span
              className="rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[1px]"
              style={{
                color: profile.user.status === "active" ? "#D4A574" : "#8B7EC8",
                background: profile.user.status === "active" ? "#D4A57415" : "#8B7EC815",
              }}
            >
              {profile.user.status === "active" ? "vouched" : "proving"}
            </span>
            <span className="font-mono text-[10px] text-muted">
              since {memberSince}
            </span>
          </div>

          {/* Personality pills (area, age, drink) */}
          {(profile.user.area || profile.user.age_range || profile.user.drink_of_choice) && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {profile.user.drink_of_choice && (
                <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                  {profile.user.drink_of_choice}
                </span>
              )}
              {profile.user.area && (
                <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                  {profile.user.area}
                </span>
              )}
              {profile.user.age_range && (
                <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                  {profile.user.age_range}
                </span>
              )}
            </div>
          )}

          {/* Hot take */}
          {profile.user.hot_take && (
            <div className="mb-4 rounded-[14px] p-4" style={{ background: "rgba(26,23,21,0.03)" }}>
              <p className="font-hand text-[15px] text-near-black/70">
                &ldquo;{profile.user.hot_take}&rdquo;
              </p>
            </div>
          )}

          {/* Instagram handle */}
          <div className="rounded-[14px] bg-cream p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
                  instagram
                </p>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-sm text-muted">@</span>
                    <input
                      type="text"
                      value={igHandle}
                      onChange={(e) => setIgHandle(e.target.value)}
                      className="w-40 border-b border-sand bg-transparent font-sans text-sm text-near-black focus:border-caramel focus:outline-none"
                      placeholder="your_handle"
                    />
                  </div>
                ) : (
                  <p className="font-sans text-sm text-near-black">
                    {profile.user.instagram_handle ? `@${profile.user.instagram_handle}` : "not set"}
                  </p>
                )}
              </div>
              {editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="font-mono text-[10px] text-muted"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleSaveIg}
                    disabled={saving}
                    className="rounded-full bg-near-black px-3 py-1 font-mono text-[10px] text-white"
                  >
                    {saving ? "..." : "save"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="font-mono text-[10px] text-caramel"
                >
                  edit
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.1s" }}>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: profile.stats.events_attended, label: "events attended", emoji: "\u{1F3AA}" },
            { value: profile.stats.connections_made, label: "connections", emoji: "\u{1F91D}" },
            { value: profile.stats.vouch_codes_earned, label: "codes earned", emoji: "\u2709\uFE0F" },
            { value: profile.stats.vouch_codes_used, label: "people vouched", emoji: "\u2B50" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[16px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
            >
              <span className="mb-1 block text-lg">{stat.emoji}</span>
              <p className="font-serif text-[24px] text-near-black">{stat.value}</p>
              <p className="font-mono text-[9px] uppercase tracking-[1px] text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      {profile.badges.length > 0 && (
        <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.15s" }}>
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            badges
          </span>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
              >
                <span className="text-base">{badge.emoji}</span>
                <span className="font-mono text-[10px] text-near-black">{badge.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vibe check answers (provisional users) */}
      {profile.user.status === "provisional" && profile.user.vibe_check_answers && profile.user.vibe_check_answers.length > 0 && (
        <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.18s" }}>
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            your vibe check
          </span>
          <div className="flex flex-col gap-2">
            {profile.user.vibe_check_answers.map((qa, i) => (
              <div
                key={i}
                className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
              >
                <p className="mb-1 font-mono text-[10px] text-muted">{qa.question}</p>
                <p className="font-sans text-[13px] text-near-black">{qa.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Event history */}
      {profile.event_history.length > 0 && (
        <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.2s" }}>
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            event history
          </span>
          <div className="flex flex-col gap-2">
            {profile.event_history.map((event) => (
              <div
                key={event.event_id}
                className="flex items-center justify-between rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{event.emoji}</span>
                  <div>
                    <p className="font-sans text-[14px] font-medium text-near-black">
                      {event.title}
                    </p>
                    <p className="font-mono text-[10px] text-muted">{event.date}</p>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                  style={{
                    color: event.status === "attended" ? "#6B7A63" : "#D4A574",
                    background: event.status === "attended" ? "#6B7A6315" : "#D4A57415",
                  }}
                >
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works link + Entry path */}
      <section className="animate-fadeSlideUp px-5 pt-6" style={{ animationDelay: "0.25s" }}>
        <div className="rounded-[14px] bg-white/50 p-4 text-center">
          <p className="font-mono text-[10px] text-muted">
            joined via{" "}
            <span className="text-caramel">
              {profile.user.entry_path === "invite"
                ? "invite code"
                : profile.user.entry_path === "vouch"
                  ? "vouch code"
                  : "prove yourself"}
            </span>
          </p>
          <button
            onClick={() => setStage("app_education")}
            className="mt-2 border-none bg-transparent font-mono text-[10px] text-caramel"
            style={{ cursor: "pointer" }}
          >
            how it works {"\u2192"}
          </button>
        </div>
      </section>
    </div>
  );
}
