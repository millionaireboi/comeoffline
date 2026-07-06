"use client";

import { useAnalytics, GATE_OPENED, CHATBOT_OPENED } from "@comeoffline/analytics";
import { P } from "@/components/shared/P";
import { buildAppHandoffUrl } from "@/lib/handoff";
import { useChat } from "@/components/chat/ChatProvider";

/**
 * Open-entry card for the events-first homepage. No invite codes — anyone can
 * join with their phone (WhatsApp OTP) in the app. One primary action; the
 * chatbot stays as a "questions?" concierge, not a gate.
 */
export function QuickEntry() {
  const { track } = useAnalytics();
  const { openChat } = useChat();

  const goToApp = () => {
    track(GATE_OPENED, { source: "homepage_quick_entry" });
    const pageParams = new URLSearchParams(window.location.search);
    window.location.href = buildAppHandoffUrl({
      utm: {
        utm_source: pageParams.get("utm_source") || undefined,
        utm_medium: pageParams.get("utm_medium") || undefined,
        utm_campaign: pageParams.get("utm_campaign") || undefined,
        utm_content: pageParams.get("utm_content") || undefined,
      },
    });
  };

  return (
    <div
      className="rounded-[20px] border bg-white p-4 shadow-[0_2px_12px_rgba(26,23,21,0.05)]"
      style={{ borderColor: P.sand }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-sans text-[13px] font-medium text-near-black">
          new here or coming back — same door.
        </span>
        <span
          className="rounded-full font-mono text-[9px] uppercase tracking-[1.5px]"
          style={{ color: "#6B7A63", background: P.sage + "26", padding: "3px 9px" }}
        >
          free to join
        </span>
      </div>
      <button
        onClick={goToApp}
        className="w-full rounded-xl border-none py-3.5 font-sans text-[14px] font-semibold text-cream transition-transform active:scale-[0.99]"
        style={{ background: P.nearBlack, cursor: "pointer" }}
      >
        continue with whatsapp →
      </button>
      <div className="mt-3 flex items-center justify-center border-t pt-3" style={{ borderColor: P.sand }}>
        <button
          onClick={() => {
            track(CHATBOT_OPENED, { source: "homepage_quick_entry" });
            openChat();
          }}
          className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12px] text-warm-brown underline-offset-2 hover:underline"
        >
          questions? <span className="text-caramel">chat with us →</span>
        </button>
      </div>
    </div>
  );
}
