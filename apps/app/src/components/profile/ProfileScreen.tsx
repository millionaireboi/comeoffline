"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Badge, Ticket } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { SignQuiz } from "@/components/onboarding/SignQuiz";
import { EditProfileScreen } from "@/components/profile/EditProfileScreen";
import { ConnectionsList } from "@/components/profile/ConnectionsList";
import { Noise } from "@/components/shared/Noise";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

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
    vibe_tag?: string;
    instagram_handle?: string;
    phone_number?: string;
    avatar_url?: string;
    avatar_type?: string;
    area?: string;
    age_range?: string;
    gender?: string;
    hot_take?: string;
    bio?: string;
    interests?: string[];
    date_of_birth?: string;
    show_age?: boolean;
    drink_of_choice?: string;
    entry_path: string;
    status: string;
    vibe_check_answers?: Array<{ question: string; answer: string }>;
    created_at: string;
    sign?: string;
    sign_emoji?: string;
    sign_label?: string;
    sign_color?: string;
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

function ProfileAvatar({ user, signColor }: { user: ProfileData["user"]; signColor: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  // Uploaded avatar
  if (user.avatar_type === "uploaded" && user.avatar_url && !user.avatar_url.startsWith("gradient:") && !imgFailed) {
    return (
      <div className="h-16 w-16 overflow-hidden rounded-full">
        <img
          src={user.avatar_url}
          alt={user.name}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
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

  // Fallback: sign emoji or first letter of name
  if (user.sign_emoji) {
    return (
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
        style={{ background: signColor + "20" }}
      >
        {user.sign_emoji}
      </div>
    );
  }

  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-full font-serif text-2xl text-white"
      style={{ background: signColor }}
    >
      {user.name.charAt(0)}
    </div>
  );
}

type EnrichedTicket = Ticket & { event_title: string; event_emoji: string; event_date: string };

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  confirmed: { color: "#6B7A63", bg: "#6B7A6315", label: "confirmed" },
  pending_payment: { color: "#D4A574", bg: "#D4A57415", label: "pending" },
  checked_in: { color: "#5B8CB8", bg: "#5B8CB815", label: "checked in" },
  partially_checked_in: { color: "#D4A574", bg: "#D4A57415", label: "partially checked in" },
  cancelled: { color: "#9B8E82", bg: "#9B8E8215", label: "cancelled" },
  no_show: { color: "#9B8E82", bg: "#9B8E8215", label: "no show" },
};

export function ProfileScreen() {
  const { getIdToken, logout, loading: authLoading } = useAuth();
  const { setStage, activeTicket, setActiveTicket, profileCompleteMode, setProfileCompleteMode } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuizRetake, setShowQuizRetake] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const autoOpenedEdit = useRef(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) { setLoading(false); return; }
      const [profileResult, ticketsResult] = await Promise.allSettled([
        apiFetch<{ success: boolean; data: ProfileData }>("/api/users/me", { token }),
        apiFetch<{ success: boolean; data: EnrichedTicket[] }>("/api/tickets/mine", { token }),
      ]);
      if (profileResult.status === "fulfilled" && profileResult.value.data) {
        setProfile(profileResult.value.data);
      }
      if (ticketsResult.status === "fulfilled" && ticketsResult.value.data) {
        setTickets(ticketsResult.value.data);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  // Wait for auth to finish loading before fetching profile data
  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  // Auto-open edit screen when coming from "finish it" nudge
  useEffect(() => {
    if (profileCompleteMode && profile && !autoOpenedEdit.current) {
      autoOpenedEdit.current = true;
      setShowEditProfile(true);
    }
  }, [profileCompleteMode, profile]);

  // Clear completion mode flag when leaving ProfileScreen
  useEffect(() => {
    return () => { setProfileCompleteMode(false); };
  }, [setProfileCompleteMode]);

  const handleCancelTicket = async (ticketId: string) => {
    if (!confirm("Cancel this ticket? This can\u2019t be undone.")) return;
    setCancellingId(ticketId);
    try {
      const token = await getIdToken();
      if (!token) return;
      await apiFetch(`/api/tickets/${ticketId}`, { method: "DELETE", token });
      // Update local state
      setTickets((prev) =>
        prev.map((t) => t.id === ticketId ? { ...t, status: "cancelled" as const } : t),
      );
      // If this was the active ticket, clear it and go back to feed
      if (activeTicket?.id === ticketId) {
        setActiveTicket(null);
        setStage("feed");
      }
    } catch (err) {
      console.error("Failed to cancel ticket:", err);
      alert("Failed to cancel ticket. Please try again.");
    } finally {
      setCancellingId(null);
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

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-8 text-center">
        <span className="mb-4 text-4xl">{"\u{1F614}"}</span>
        <p className="mb-2 font-serif text-xl text-near-black">couldn&apos;t load profile</p>
        <p className="mb-6 font-sans text-sm text-muted">check your connection and try again.</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="rounded-full bg-near-black px-6 py-2.5 font-mono text-[11px] text-white"
        >
          retry
        </button>
      </div>
    );
  }

  const signColor = profile.user.sign_color || "#D4A574";
  const memberSince = new Date(profile.user.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <>
    <PullToRefresh onRefresh={fetchData} className="min-h-screen bg-cream pb-[120px]">
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
            <ProfileAvatar user={profile.user} signColor={signColor} />
            <div>
              <h2 className="truncate font-serif text-[26px] font-normal leading-none text-near-black">
                {profile.user.name}
              </h2>
              <p className="mt-0.5 truncate font-mono text-[12px] text-muted">@{profile.user.handle}</p>
            </div>
          </div>

          {/* Sign badge + status */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {profile.user.sign_label && (
              <span
                className="rounded-full px-3 py-1 font-serif text-[11px] italic"
                style={{ color: signColor, background: signColor + "15" }}
              >
                {profile.user.sign_emoji} {profile.user.sign_label}
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

          {/* Vibe tag */}
          {profile.user.vibe_tag && (
            <p className="mb-4 truncate font-hand text-[13px] italic text-muted">
              {profile.user.vibe_tag}
            </p>
          )}

          {/* Personality pills (area, age, gender, drink) */}
          {(profile.user.area || profile.user.age_range || profile.user.date_of_birth || profile.user.gender || profile.user.drink_of_choice) && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {profile.user.area && (
                <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                  {profile.user.area}
                </span>
              )}
              {(() => {
                if (profile.user.date_of_birth && profile.user.show_age !== false) {
                  const age = Math.floor((Date.now() - new Date(profile.user.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                  return (
                    <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                      {age}
                    </span>
                  );
                }
                if (!profile.user.date_of_birth && profile.user.age_range) {
                  return (
                    <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                      {profile.user.age_range}
                    </span>
                  );
                }
                return null;
              })()}
              {profile.user.gender && profile.user.gender !== "prefer not to say" && (
                <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                  {profile.user.gender}
                </span>
              )}
              {profile.user.drink_of_choice && (
                <span className="rounded-full bg-cream px-2.5 py-1 font-mono text-[10px] text-muted">
                  {profile.user.drink_of_choice}
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

          {/* Bio */}
          {profile.user.bio && (
            <div className="mb-4 rounded-[14px] p-4" style={{ background: "rgba(26,23,21,0.03)" }}>
              <p className="font-sans text-[13px] leading-relaxed text-near-black/80">
                {profile.user.bio}
              </p>
            </div>
          )}

          {/* Interests */}
          {profile.user.interests && profile.user.interests.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {profile.user.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full px-2.5 py-1 font-mono text-[10px]"
                  style={{ color: signColor, background: signColor + "12" }}
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          {/* Instagram handle */}
          {profile.user.instagram_handle && (
            <div className="mb-4 rounded-[14px] bg-cream p-4">
              <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">instagram</p>
              <p className="font-sans text-sm text-near-black">@{profile.user.instagram_handle}</p>
            </div>
          )}

          {/* Phone number */}
          {profile.user.phone_number ? (
            <div className="mb-4 rounded-[14px] bg-cream p-4">
              <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">phone</p>
              <p className="font-sans text-sm text-near-black">{profile.user.phone_number}</p>
            </div>
          ) : (
            <button
              onClick={() => setShowEditProfile(true)}
              className="mb-4 w-full rounded-[14px] border border-dashed p-4 text-left transition-colors"
              style={{ borderColor: "rgba(168,181,160,0.3)", background: "rgba(168,181,160,0.04)" }}
            >
              <p className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.5px] text-sage">add phone number</p>
              <p className="font-sans text-[12px] text-muted">use your phone to sign in next time</p>
            </button>
          )}

          {/* Edit profile button */}
          <button
            onClick={() => setShowEditProfile(true)}
            className="w-full rounded-[14px] bg-cream py-3 text-center font-mono text-[11px] text-caramel transition-colors hover:bg-sand/30"
          >
            edit profile
          </button>

          {/* Retake quiz button */}
          <button
            onClick={() => setShowQuizRetake(true)}
            className="mt-4 w-full rounded-[14px] border border-dashed py-3 text-center font-mono text-[11px] transition-colors"
            style={{
              borderColor: signColor + "30",
              color: signColor,
            }}
          >
            {profile.user.sign ? "retake sign quiz \u2192" : "take the sign quiz \u2192"}
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.1s" }}>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: profile.stats.events_attended, label: "events attended", emoji: "\u{1F3AA}", action: undefined },
            { value: profile.stats.connections_made, label: "connections", emoji: "\u{1F91D}", action: () => setShowConnections(true) },
            { value: profile.stats.vouch_codes_earned, label: "codes earned", emoji: "\u2709\uFE0F", action: undefined },
            { value: profile.stats.vouch_codes_used, label: "people vouched", emoji: "\u2B50", action: undefined },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={stat.action}
              className="rounded-[16px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(26,23,21,0.04)] transition-colors"
              style={{ cursor: stat.action ? "pointer" : "default" }}
            >
              <span className="mb-1 block text-lg">{stat.emoji}</span>
              <p className="font-serif text-[24px] text-near-black">{stat.value}</p>
              <p className="font-mono text-[9px] uppercase tracking-[1px] text-muted">
                {stat.label}
                {stat.action && " \u2192"}
              </p>
            </button>
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

      {/* Your tickets */}
      {tickets.length > 0 && (
        <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.17s" }}>
          <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            your tickets
          </span>
          <div className="flex flex-col gap-2">
            {tickets.map((ticket) => {
              const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.cancelled;
              const isCancellable = ["confirmed", "pending_payment"].includes(ticket.status);
              const isExpanded = expandedTicketId === ticket.id;
              const isCancelling = cancellingId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="rounded-[14px] bg-white shadow-[0_1px_3px_rgba(26,23,21,0.04)] transition-all"
                  style={{ opacity: ticket.status === "cancelled" ? 0.55 : 1 }}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{ticket.event_emoji}</span>
                      <div>
                        <p className="font-sans text-[14px] font-medium text-near-black">
                          {ticket.event_title}
                        </p>
                        <p className="font-mono text-[10px] text-muted">
                          {ticket.tier_name}{ticket.event_date ? ` \u00B7 ${ticket.event_date}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                        style={{ color: style.color, background: style.bg }}
                      >
                        {style.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {isExpanded ? "\u2212" : "+"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-sand px-4 pb-4 pt-3">
                      {/* Price */}
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-muted">price</span>
                        <span className="font-sans text-[14px] font-semibold text-near-black">
                          {ticket.price === 0 ? "Free" : `\u20B9${ticket.price}`}
                        </span>
                      </div>

                      {/* Quantity */}
                      {ticket.quantity > 1 && (
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted">guests</span>
                          <span className="font-sans text-[13px] text-near-black">{ticket.quantity}</span>
                        </div>
                      )}

                      {/* Seat info */}
                      {(ticket.spot_name || ticket.seat_id || ticket.section_name) && (
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted">seat</span>
                          <span className="font-sans text-[13px] text-near-black">
                            {ticket.spot_name && (
                              <>
                                {ticket.spot_name}
                                {ticket.spot_seat_label && `, ${ticket.spot_seat_label}`}
                              </>
                            )}
                            {ticket.seat_id && !ticket.spot_name && ticket.seat_id}
                            {ticket.section_name && !ticket.seat_id && !ticket.spot_name && ticket.section_name}
                          </span>
                        </div>
                      )}

                      {/* Pickup */}
                      {ticket.pickup_point && ticket.pickup_point !== "TBD" && (
                        <div className="mb-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted">pickup</span>
                          <span className="font-sans text-[13px] text-near-black">{ticket.pickup_point}</span>
                        </div>
                      )}

                      {/* Add-ons */}
                      {ticket.add_ons && ticket.add_ons.length > 0 && (
                        <div className="mb-3">
                          <span className="mb-1 block font-mono text-[10px] text-muted">add-ons</span>
                          {ticket.add_ons.map((a, i) => (
                            <p key={i} className="font-sans text-[13px] text-near-black">
                              {a.name} x{a.quantity} — \u20B9{a.price * a.quantity}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* QR Code */}
                      {ticket.qr_code && ["confirmed", "checked_in", "partially_checked_in"].includes(ticket.status) && (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={ticket.qr_code}
                            alt="Ticket QR"
                            className="h-[140px] w-[140px] rounded-xl"
                          />
                        </div>
                      )}

                      {/* Purchased date */}
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-muted">purchased</span>
                        <span className="font-mono text-[10px] text-muted">
                          {new Date(ticket.purchased_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Cancel button */}
                      {isCancellable && (
                        <button
                          onClick={() => handleCancelTicket(ticket.id)}
                          disabled={isCancelling}
                          className="mt-1 w-full rounded-xl border border-terracotta/20 bg-terracotta/5 py-2.5 font-mono text-[11px] text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-50"
                        >
                          {isCancelling ? "cancelling..." : "cancel ticket"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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

    </PullToRefresh>

      {/* Connections list overlay */}
      {showConnections && (
        <ConnectionsList onClose={() => setShowConnections(false)} />
      )}

      {/* Edit profile overlay */}
      {showEditProfile && (
        <EditProfileScreen
          user={profile.user}
          onClose={() => { setShowEditProfile(false); setProfileCompleteMode(false); }}
          onSave={async () => {
            setShowEditProfile(false);
            setProfileCompleteMode(false);
            // Refetch profile to show actual saved state
            try {
              const token = await getIdToken();
              if (!token) return;
              const data = await apiFetch<{ success: boolean; data: ProfileData }>(
                "/api/users/me",
                { token },
              );
              if (data.data) setProfile(data.data);
            } catch (err) {
              console.warn("[ProfileScreen] Failed to refetch profile after save:", err);
            }
          }}
          highlightIncomplete={profileCompleteMode}
        />
      )}

      {/* Quiz retake overlay */}
      {showQuizRetake && (
        <div className="fixed inset-0 z-[600] overflow-y-auto" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}>
          {/* Close button */}
          <button
            onClick={() => setShowQuizRetake(false)}
            className="fixed right-5 z-[610] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm text-cream backdrop-blur-sm"
            style={{ top: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}
          >
            ✕
          </button>
          <SignQuiz
            onComplete={() => {
              setShowQuizRetake(false);
              // Refresh profile to show updated sign
              (async () => {
                try {
                  const token = await getIdToken();
                  if (!token) return;
                  const data = await apiFetch<{ success: boolean; data: ProfileData }>(
                    "/api/users/me",
                    { token },
                  );
                  if (data.data) setProfile(data.data);
                } catch { /* ignore */ }
              })();
            }}
            mode="onboarding"
          />
        </div>
      )}
    </>
  );
}
