"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";

const AVATAR_GRADIENTS = [
  ["#D4A574", "#C4704D"], ["#B8A9C9", "#8B7BA8"], ["#A8B5A0", "#7A9170"],
  ["#DBBCAC", "#D4836B"], ["#E6A97E", "#B8845A"], ["#D4836B", "#8B6F5A"],
  ["#C4956A", "#3D2E22"], ["#B8A9C9", "#C4704D"],
];

const AVATAR_EMOJIS = ["\u2728", "\u{1F33F}", "\u{1F319}", "\u{1F98B}", "\u{1F525}", "\u{1F3B5}", "\u{1F4AB}", "\u{1F338}"];

interface AttendeePreview {
  id: string;
  name: string;
  avatar_url?: string;
  avatar_type?: string;
  sign_emoji?: string;
  sign_label?: string;
  sign_color?: string;
  interests?: string[];
}

export function AttendeeList({ eventId }: { eventId: string }) {
  const { getIdToken, loading: authLoading } = useAuth();
  const showToast = useAppStore((s) => s.showToast);
  const [attendees, setAttendees] = useState<AttendeePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Safety: report-a-member flow (footer link → pick a card → confirm)
  const [reportMode, setReportMode] = useState(false);
  const [reportTarget, setReportTarget] = useState<AttendeePreview | null>(null);

  const submitReport = async (target: AttendeePreview) => {
    setReportTarget(null);
    setReportMode(false);
    try {
      const token = await getIdToken();
      if (!token) return;
      await apiFetch("/api/reports", {
        method: "POST",
        token,
        body: JSON.stringify({ reported_user_id: target.id, context: "attendee", event_id: eventId }),
      });
      showToast("reported. we'll look into it.", "info");
    } catch (err) {
      console.error("Failed to report:", err);
      showToast("couldn't submit report. try again.", "error");
    }
  };

  const fetchAttendees = useCallback(async () => {
    setError(false);
    try {
      const token = await getIdToken();
      if (!token) { setError(true); setLoading(false); return; }
      const res = await apiFetch<{ success: boolean; data: AttendeePreview[] }>(
        `/api/events/${eventId}/attendees?mode=preview`,
        { token },
      );
      if (res.data) setAttendees(res.data);
    } catch (err) {
      console.error("Failed to load attendees:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    if (!authLoading) fetchAttendees();
  }, [authLoading, fetchAttendees]);

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="font-mono text-[11px] text-muted">loading attendees...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[14px] bg-white/50 p-6 text-center">
        <p className="mb-2 font-sans text-sm text-muted">couldn&apos;t load attendees</p>
        <button
          onClick={fetchAttendees}
          className="font-mono text-[11px] text-caramel"
        >
          tap to retry
        </button>
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div className="rounded-[14px] bg-white/50 p-6 text-center">
        <span className="mb-2 block text-2xl">{"\u{1F44B}"}</span>
        <p className="font-sans text-sm text-muted">be the first to grab a ticket</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
          {attendees.length} {attendees.length === 1 ? "person" : "people"} going
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {attendees.map((a) => (
          <div
            key={a.id}
            onClick={reportMode ? () => setReportTarget(a) : undefined}
            className="rounded-[14px] bg-white p-3.5 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
            style={reportMode ? { cursor: "pointer", outline: "1.5px dashed rgba(196,112,77,0.4)" } : undefined}
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <AttendeeAvatar attendee={a} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[13px] font-medium text-near-black">
                  {a.name.split(" ")[0]}
                </p>
                {a.sign_label && (
                  <p
                    className="truncate font-mono text-[9px]"
                    style={{ color: a.sign_color || "#9B8E82" }}
                  >
                    {a.sign_emoji} {a.sign_label}
                  </p>
                )}
              </div>
            </div>
            {a.interests && a.interests.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {a.interests.slice(0, 3).map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-cream px-2 py-0.5 font-mono text-[8px] text-muted"
                  >
                    {interest}
                  </span>
                ))}
                {a.interests.length > 3 && (
                  <span className="rounded-full bg-cream px-2 py-0.5 font-mono text-[8px] text-muted">
                    +{a.interests.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Safety footer — report flow for a vouched community */}
      <div className="mt-3 text-center">
        {!reportMode ? (
          <button
            onClick={() => setReportMode(true)}
            className="font-mono text-[9px] text-muted/50 underline-offset-2 hover:underline"
          >
            see something off? report a member
          </button>
        ) : reportTarget ? (
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-[10px] text-terracotta">
              report {reportTarget.name.split(" ")[0]}?
            </span>
            <button
              onClick={() => submitReport(reportTarget)}
              className="rounded-full border border-terracotta/25 bg-terracotta/5 px-3 py-1 font-mono text-[10px] text-terracotta"
            >
              report
            </button>
            <button
              onClick={() => { setReportTarget(null); setReportMode(false); }}
              className="rounded-full px-3 py-1 font-mono text-[10px] text-muted"
            >
              cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-[10px] text-terracotta">tap the person you want to report</span>
            <button
              onClick={() => setReportMode(false)}
              className="rounded-full px-3 py-1 font-mono text-[10px] text-muted"
            >
              cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AttendeeAvatar({ attendee }: { attendee: AttendeePreview }) {
  if (attendee.avatar_type === "uploaded" && attendee.avatar_url && !attendee.avatar_url.startsWith("gradient:")) {
    return (
      <div className="h-9 w-9 overflow-hidden rounded-full">
        <img src={attendee.avatar_url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (attendee.avatar_type === "gradient" && attendee.avatar_url?.startsWith("gradient:")) {
    const index = parseInt(attendee.avatar_url.replace("gradient:", ""), 10);
    const grad = AVATAR_GRADIENTS[index] || AVATAR_GRADIENTS[0];
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
        style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
      >
        {AVATAR_EMOJIS[index] || "\u2728"}
      </div>
    );
  }

  if (attendee.sign_emoji) {
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
        style={{ background: (attendee.sign_color || "#D4A574") + "20" }}
      >
        {attendee.sign_emoji}
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sand/30 font-serif text-sm text-near-black">
      {attendee.name.charAt(0)}
    </div>
  );
}
