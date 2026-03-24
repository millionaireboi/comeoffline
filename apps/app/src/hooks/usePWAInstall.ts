"use client";

import { useState, useEffect } from "react";

export function usePWAInstall() {
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as Record<string, unknown>).standalone === true;

    // Skip install gate on desktop — it's only relevant for mobile
    const isDesktop = !/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    setIsStandalone(standalone || isDesktop || process.env.NODE_ENV === "development");

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
    }
  };

  return { isStandalone, isIOS, deferredPrompt, promptInstall };
}
