"use client";

import { useState, useEffect } from "react";
import { subscribeToasts, type ToastItem } from "@/lib/toast";

const KIND_STYLES: Record<string, string> = {
  success: "border-sage/30 bg-[#141a12] text-sage",
  error: "border-terracotta/30 bg-[#1c1210] text-terracotta",
  info: "border-caramel/30 bg-[#1a1510] text-caramel",
};

/** Bottom-center toast stack — thumb-reach on a phone at the door, auto-dismisses. */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts((t) => {
      setToasts((prev) => [...prev.slice(-3), t]); // cap the stack at 4
      const ttl = t.kind === "error" ? 5000 : 3200;
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, ttl);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[900] flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          className={`pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-left font-mono text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${KIND_STYLES[t.kind]}`}
          style={{ animation: "toastIn 0.25s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          {t.text}
        </button>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
