"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

interface AttendeeInfo {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  instagram_handle?: string;
  connected: boolean;
  mutual: boolean;
}

const VIBE_COLORS: Record<string, string> = {
  "the connector": "#6B7A63",
  "the creative": "#D4A574",
  "the deep talker": "#8B7EC8",
  "the wildcard": "#D4836B",
  "the observer": "#7A8B9C",
};

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
  const { getIdToken } = useAuth();
  const { currentEvent, setStage } = useAppStore();
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    async function fetchAttendees() {
      if (!currentEvent) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: AttendeeInfo[] }>(
          `/api/events/${currentEvent.id}/attendees`,
          { token },
        );
        if (data.data) setAttendees(data.data);
      } catch (err) {
        console.error("Failed to load attendees:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAttendees();
  }, [currentEvent, getIdToken]);

  const handleConnect = useCallback(
    async (attendee: AttendeeInfo) => {
      if (!currentEvent || timeLeft.expired) return;
      setConnectingId(attendee.id);
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

  return (
    <div className="min-h-screen bg-cream pb-[120px]">
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
        {attendees.map((attendee, i) => (
          <div
            key={attendee.id}
            className="animate-fadeSlideUp flex items-center gap-4 rounded-[16px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
            style={{ animationDelay: `${0.2 + i * 0.06}s` }}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-lg text-white"
              style={{ background: VIBE_COLORS[attendee.vibe_tag.toLowerCase()] || "#D4A574" }}
            >
              {attendee.name.charAt(0)}
            </div>

            <div className="flex-1 overflow-hidden">
              <p className="font-sans text-[15px] font-medium text-near-black">{attendee.name}</p>
              <p className="font-mono text-[10px] text-muted">@{attendee.handle}</p>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[9px]"
                style={{
                  color: VIBE_COLORS[attendee.vibe_tag.toLowerCase()] || "#D4A574",
                  background: (VIBE_COLORS[attendee.vibe_tag.toLowerCase()] || "#D4A574") + "15",
                }}
              >
                {attendee.vibe_tag}
              </span>
            </div>

            <div className="shrink-0">
              {attendee.mutual ? (
                <div className="text-center">
                  <span className="block text-xs">&#x1F91D;</span>
                  <span className="font-mono text-[9px] text-sage">mutual</span>
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
        ))}

        {attendees.length === 0 && (
          <div className="animate-fadeSlideUp py-12 text-center" style={{ animationDelay: "0.2s" }}>
            <span className="mb-4 block text-4xl">&#x1FAE5;</span>
            <p className="font-serif text-xl text-warm-brown">no one here yet</p>
            <p className="mt-2 font-mono text-[11px] text-muted">check back later</p>
          </div>
        )}
      </section>

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
    </div>
  );
}
