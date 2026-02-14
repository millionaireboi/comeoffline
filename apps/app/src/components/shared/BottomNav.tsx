"use client";

import { useAppStore } from "@/store/useAppStore";

interface BottomNavProps {
  onChatOpen: () => void;
}

export function BottomNav({ onChatOpen }: BottomNavProps) {
  const { stage, setStage } = useAppStore();

  const isActive = (s: string) => stage === s;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[400] border-t border-sand/50 bg-cream/95 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-[430px] items-center justify-around px-2 py-2">
        {/* Events */}
        <button
          onClick={() => setStage("feed")}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
            isActive("feed") ? "text-near-black" : "text-muted"
          }`}
        >
          <span className="text-[18px]">🎪</span>
          <span className="font-mono text-[9px] tracking-[0.5px]">events</span>
        </button>

        {/* Chat */}
        <button
          onClick={onChatOpen}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-muted transition-colors"
        >
          <span className="text-[18px]">💬</span>
          <span className="font-mono text-[9px] tracking-[0.5px]">chat</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => setStage("profile")}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
            isActive("profile") ? "text-near-black" : "text-muted"
          }`}
        >
          <span className="text-[18px]">👤</span>
          <span className="font-mono text-[9px] tracking-[0.5px]">profile</span>
        </button>
      </div>
    </nav>
  );
}
