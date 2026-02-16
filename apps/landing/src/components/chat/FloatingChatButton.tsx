"use client";

import { P } from "@/components/shared/P";
import { useChat } from "./ChatProvider";

export function FloatingChatButton({ visible }: { visible: boolean }) {
  const { openChat, chatOpen } = useChat();
  const show = visible && !chatOpen;
  return (
    <button
      onClick={openChat}
      className="fixed bottom-6 right-5 z-[900] flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-none bg-gate-black text-[22px] transition-all duration-300"
      style={{
        border: `1px solid ${P.caramel}30`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 12px ${P.caramel}15`,
        opacity: show ? 1 : 0,
        transform: show ? "scale(1)" : "scale(0.8)",
        pointerEvents: show ? "auto" : "none",
      }}
    >
      {"\u{1F4AC}"}
    </button>
  );
}
