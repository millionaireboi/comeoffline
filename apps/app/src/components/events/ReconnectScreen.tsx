"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { getDevStageOverride, MOCK_ATTENDEES } from "@/lib/dev-stage";
import { Noise } from "@/components/shared/Noise";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

interface AttendeeInfo {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  instagram_handle?: string;
  connected: boolean;
  mutual: boolean;
  sign?: string;
  sign_emoji?: string;
  sign_label?: string;
  sign_color?: string;
  compat_score?: number;
  compat_label?: string;
  compat_emoji?: string;
}

const RECONNECT_HOURS = 48;

function getTimeRemaining(eventDate: string): { hours: number; minutes: number; expired: boolean } {
  const deadline = new Date(eventDate);
  // Reconnect window: event day + 1 day + RECONNECT_HOURS
  deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(deadline.getHours() + RECONNECT_HOURS);

  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, expired: false };
}

export function ReconnectScreen() {
  const { getIdToken, loading: authLoading } = useAuth();
  const { currentEvent, setStage } = useAppStore();
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [mutualMatch, setMutualMatch] = useState<AttendeeInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, expired: false });

  // Countdown timer — update every minute
  useEffect(() => {
    if (!currentEvent) return;

    function tick() {
      setTimeLeft(getTimeRemaining(currentEvent!.date));
    }

    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [currentEvent]);

  const fetchAttendees = useCallback(async () => {
    if (!currentEvent) return;
    setError(false);
    if (getDevStageOverride()?.mock) {
      setAttendees(MOCK_ATTENDEES);
      setLoading(false);
      return;
    }
    try {
      const token = await getIdToken();
      if (!token) { setError(true); setLoading(false); return; }
      const data = await apiFetch<{ success: boolean; data: AttendeeInfo[] }>(
        `/api/events/${currentEvent.id}/attendees`,
        { token },
      );
      if (data.data) setAttendees(data.data);
    } catch (err) {
      console.error("Failed to load attendees:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [currentEvent, getIdToken]);

  useEffect(() => {
    if (!authLoading) fetchAttendees();
  }, [authLoading, fetchAttendees]);

  const handleConnect = useCallback(
    async (attendee: AttendeeInfo) => {
      if (!currentEvent || timeLeft.expired) return;
      setConnectingId(attendee.id);
      if (getDevStageOverride()?.mock) {
        await new Promise((r) => setTimeout(r, 400));
        const mutual = attendee.id === "u1"; // first attendee mocks as mutual
        const ig = mutual ? `${attendee.handle}.ig` : undefined;
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === attendee.id ? { ...a, connected: true, mutual, instagram_handle: ig ?? a.instagram_handle } : a,
          ),
        );
        if (mutual) setMutualMatch({ ...attendee, connected: true, mutual: true, instagram_handle: ig });
        setConnectingId(null);
        return;
      }
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{
          success: boolean;
          data: { mutual: boolean };
        }>(`/api/events/${currentEvent.id}/connect`, {
          method: "POST",
          token,
          body: JSON.stringify({ toUserId: attendee.id }),
        });

        setAttendees((prev) =>
          prev.map((a) =>
            a.id === attendee.id
              ? { ...a, connected: true, mutual: data.data.mutual }
              : a,
          ),
        );

        if (data.data.mutual) {
          const updated = { ...attendee, mutual: true, connected: true };
          const refreshed = await apiFetch<{ success: boolean; data: AttendeeInfo[] }>(
            `/api/events/${currentEvent.id}/attendees`,
            { token },
          );
          const match = refreshed.data?.find((a: AttendeeInfo) => a.id === attendee.id);
          setMutualMatch(match || updated);
          if (refreshed.data) setAttendees(refreshed.data);
        }
      } catch (err) {
        console.error("Connection failed:", err);
      } finally {
        setConnectingId(null);
      }
    },
    [currentEvent, getIdToken, timeLeft.expired],
  );

  if (!currentEvent) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">finding your people...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-8 text-center">
        <span className="mb-4 text-4xl">{"\u{1F614}"}</span>
        <p className="mb-2 font-serif text-xl text-near-black">couldn&apos;t load attendees</p>
        <p className="mb-6 font-sans text-sm text-muted">check your connection and try again.</p>
        <button
          onClick={fetchAttendees}
          className="rounded-full bg-near-black px-6 py-2.5 font-mono text-[11px] text-white"
        >
          retry
        </button>
      </div>
    );
  }

  return (
    <>
    <PullToRefresh onRefresh={fetchAttendees} className="min-h-screen bg-cream pb-[120px]">
      <Noise />

      {/* Header */}
      <section className="px-5 pb-4 pt-10">
        <button
          onClick={() => setStage("memories")}
          className="mb-5 font-mono text-[11px] text-muted transition-colors hover:text-near-black"
        >
          &larr; back to memories
        </button>

        <h2
          className="animate-fadeSlideUp mb-2 font-serif text-[32px] font-normal leading-none text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          reconnect &#x270C;&#xFE0F;
        </h2>
        <p className="animate-fadeSlideUp font-sans text-[15px] text-warm-brown" style={{ animationDelay: "0.1s" }}>
          found a vibe? let them know.
          <br />
          <span className="text-muted">if it&apos;s mutual, you&apos;ll see their instagram.</span>
        </p>
      </section>

      {/* Countdown timer bar */}
      <section className="animate-fadeSlideUp px-4 pb-5" style={{ animationDelay: "0.15s" }}>
        <div
          className={`flex items-center justify-between rounded-2xl px-5 py-3 ${
            timeLeft.expired
              ? "border border-terracotta/20 bg-terracotta/5"
              : "border border-caramel/20 bg-caramel/5"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{timeLeft.expired ? "\u23F0" : "\u23F3"}</span>
            <span className="font-mono text-[12px] font-medium text-near-black">
              {timeLeft.expired
                ? "reconnect window closed"
                : `${timeLeft.hours}h ${timeLeft.minutes}m left to connect`}
            </span>
          </div>
          {!timeLeft.expired && (
            <span className="rounded-full bg-caramel/10 px-2.5 py-1 font-mono text-[9px] text-caramel">
              open
            </span>
          )}
          {timeLeft.expired && (
            <span className="rounded-full bg-terracotta/10 px-2.5 py-1 font-mono text-[9px] text-terracotta">
              closed
            </span>
          )}
        </div>
      </section>

      {/* Attendee list */}
      <section className="flex flex-col gap-3 px-4">
        {attendees.map((attendee, i) => {
          const accent = attendee.sign_color || "#D4A574";
          return (
          <div
            key={attendee.id}
            className="animate-fadeSlideUp flex items-center gap-4 rounded-[18px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
            style={{ animationDelay: `${0.2 + i * 0.06}s` }}
          >
            <div className="relative shrink-0">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-[26px]"
                style={{
                  background: accent + "1F",
                  boxShadow: `0 0 0 2.5px ${accent}`,
                }}
              >
                {attendee.sign_emoji || attendee.name.charAt(0)}
              </div>
              {attendee.compat_score != null && (
                <div
                  className="absolute -bottom-1 -right-1 flex h-[22px] min-w-[34px] items-center justify-center rounded-full bg-white px-1 shadow-[0_2px_6px_rgba(26,23,21,0.12)]"
                  style={{ border: `1.5px solid ${accent}` }}
                >
                  <span className="font-mono text-[10px] font-semibold leading-none" style={{ color: accent }}>
                    {attendee.compat_score}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              <p className="font-sans text-[16px] font-medium leading-tight text-near-black">{attendee.name}</p>
              <p className="font-mono text-[10px] text-muted">@{attendee.handle}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                {attendee.sign_label && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-tight"
                    style={{ color: accent, background: accent + "1A" }}
                  >
                    {attendee.sign_label}
                  </span>
                )}
                {attendee.compat_label && (
                  <span className="font-mono text-[10px] text-muted">
                    {attendee.compat_emoji} {attendee.compat_label}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {attendee.mutual ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm leading-none">&#x1F91D;</span>
                  {attendee.instagram_handle ? (
                    <a
                      href={`https://instagram.com/${attendee.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] font-medium text-sage underline-offset-2 hover:underline"
                    >
                      @{attendee.instagram_handle}
                    </a>
                  ) : (
                    <span className="font-mono text-[9px] text-sage">mutual</span>
                  )}
                </div>
              ) : attendee.connected ? (
                <span className="font-mono text-[10px] text-muted">sent &#x2713;</span>
              ) : timeLeft.expired ? (
                <span className="font-mono text-[10px] text-muted/40">window closed</span>
              ) : (
                <button
                  onClick={() => handleConnect(attendee)}
                  disabled={connectingId === attendee.id}
                  className="rounded-full bg-near-black px-4 py-2 font-mono text-[11px] text-white transition-opacity"
                  style={{ opacity: connectingId === attendee.id ? 0.5 : 1 }}
                >
                  {connectingId === attendee.id ? "..." : "connect"}
                </button>
              )}
            </div>
          </div>
          );
        })}

        {attendees.length === 0 && (
          <div className="animate-fadeSlideUp py-12 text-center" style={{ animationDelay: "0.2s" }}>
            <span className="mb-4 block text-4xl">&#x1FAE5;</span>
            <p className="font-serif text-xl text-warm-brown">no one here yet</p>
            <p className="mt-2 font-mono text-[11px] text-muted">check back later</p>
          </div>
        )}
      </section>

    </PullToRefresh>

      {/* Mutual match modal */}
      {mutualMatch && (
        <div className="animate-fadeIn fixed inset-0 z-[500] flex items-center justify-center bg-[rgba(10,9,7,0.7)] backdrop-blur-sm">
          <div
            className="w-[320px] rounded-3xl bg-white p-8 text-center shadow-[0_12px_48px_rgba(26,23,21,0.15)]"
            style={{ animation: "chatSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div className="mb-5 text-5xl" style={{ animation: "breathe 2s ease infinite" }}>
              &#x1F389;
            </div>
            <h3 className="mb-1 font-serif text-[26px] text-near-black">it&apos;s mutual!</h3>
            <p className="mb-6 font-sans text-sm text-warm-brown">
              you and <strong>{mutualMatch.name}</strong> connected
            </p>

            {mutualMatch.instagram_handle && (
              <div className="mb-6 rounded-[14px] bg-cream p-4">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
                  their instagram
                </p>
                <p className="font-sans text-lg font-medium text-near-black">
                  @{mutualMatch.instagram_handle}
                </p>
              </div>
            )}

            <button
              onClick={() => setMutualMatch(null)}
              className="w-full rounded-2xl bg-near-black py-4 font-sans text-sm font-medium text-white"
            >
              nice &#x270C;&#xFE0F;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
