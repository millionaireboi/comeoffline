"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

const STYLE: Record<string, { bg: string; text: string }> = {
  error: { bg: "#1A1714", text: "#F5EFE6" },
  success: { bg: "#6B7A63", text: "#F5EFE6" },
  info: { bg: "#1A1714", text: "#F5EFE6" },
};

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast) return null;

  const style = STYLE[toast.type] || STYLE.error;

  return (
    <div
      className="fixed left-4 right-4 z-[9999] flex justify-center"
      style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className="rounded-full px-5 py-3 shadow-lg transition-all duration-300"
        style={{
          background: style.bg,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <p className="font-mono text-[11px] tracking-wide" style={{ color: style.text }}>
          {toast.message}
        </p>
      </div>
    </div>
  );
}
