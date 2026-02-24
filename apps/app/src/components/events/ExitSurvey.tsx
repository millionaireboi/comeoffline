"use client";

import { useAnalytics, CHECKOUT_EXIT_REASON } from "@comeoffline/analytics";

interface ExitSurveyProps {
  eventId: string;
  onDone: () => void;
}

const reasons = [
  { key: "too_expensive", label: "too expensive", icon: "💸" },
  { key: "not_the_right_date", label: "not the right date", icon: "📅" },
  { key: "want_to_bring_friends", label: "want to bring friends", icon: "👯" },
  { key: "just_browsing", label: "just browsing", icon: "👀" },
  { key: "payment_issue", label: "payment issue", icon: "⚠️" },
];

export function ExitSurvey({ eventId, onDone }: ExitSurveyProps) {
  const { track } = useAnalytics();

  const handlePick = (reason: string) => {
    track(CHECKOUT_EXIT_REASON, { event_id: eventId, reason });
    onDone();
  };

  const handleDismiss = () => {
    track(CHECKOUT_EXIT_REASON, { event_id: eventId, reason: "dismissed" });
    onDone();
  };

  return (
    <div className="animate-fadeIn fixed inset-0 z-[600] flex items-end justify-center">
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        className="absolute inset-0 bg-[rgba(10,9,7,0.5)] backdrop-blur-sm"
      />

      {/* Bottom sheet */}
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl bg-cream px-6 pb-10 pt-6"
        style={{ animation: "chatSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Close */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl font-normal text-near-black">
            what stopped you?
          </h3>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-warm-brown"
            style={{ background: "rgba(26,23,21,0.08)" }}
          >
            ✕
          </button>
        </div>

        <p className="mb-5 font-mono text-[11px] text-muted">
          one tap — helps us make events better
        </p>

        {/* Reason buttons */}
        <div className="flex flex-col gap-2.5">
          {reasons.map((r) => (
            <button
              key={r.key}
              onClick={() => handlePick(r.key)}
              className="flex items-center gap-3 rounded-[14px] border border-sand bg-white px-4 py-3.5 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-lg">{r.icon}</span>
              <span className="font-sans text-[14px] font-medium text-near-black">
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
