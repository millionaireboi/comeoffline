"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY_VISITS = "pwa_visit_count";
const STORAGE_KEY_DISMISSED = "pwa_prompt_dismissed_at";
const STORAGE_KEY_INSTALLED = "pwa_installed";
const DISMISSAL_COOLDOWN_DAYS = 7;

type BrowserKind = "safari" | "chrome" | "firefox" | "in-app" | "other";

interface PWAInstallState {
  /** Running as installed PWA (standalone mode) */
  isStandalone: boolean;
  /** iOS device */
  isIOS: boolean;
  /** Which browser is being used */
  browser: BrowserKind;
  /** Whether browser supports Add to Home Screen natively */
  canInstallDirectly: boolean;
  /** Android deferred prompt */
  deferredPrompt: Event | null;
  /** Fire the Android install prompt */
  promptInstall: () => Promise<void>;
  /** Whether the install prompt should be shown (progressive logic) */
  shouldShowPrompt: boolean;
  /** Current visit number */
  visitCount: number;
  /** User dismissed the prompt — respects cooldown */
  dismissPrompt: () => void;
  /** Force-show the prompt (e.g., after booking) */
  triggerPrompt: () => void;
  /** Whether prompt was force-triggered */
  isTriggered: boolean;
}

function detectBrowser(): BrowserKind {
  if (typeof navigator === "undefined") return "other";

  const ua = navigator.userAgent;

  // In-app browsers (Instagram, Facebook, LinkedIn, Twitter, etc.)
  if (/FBAN|FBAV|Instagram|LinkedIn|Twitter|Line\//i.test(ua)) return "in-app";

  // iOS-specific detection
  if (/iPad|iPhone|iPod/.test(ua)) {
    // CriOS = Chrome on iOS, FxiOS = Firefox on iOS, EdgiOS = Edge on iOS
    if (/CriOS/i.test(ua)) return "chrome";
    if (/FxiOS/i.test(ua)) return "firefox";
    if (/EdgiOS/i.test(ua)) return "other";
    // Native Safari: has Safari in UA but NOT Chrome/CriOS
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "safari";
    return "other";
  }

  // Android / desktop
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) return "chrome";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Safari/i.test(ua)) return "safari";

  return "other";
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY_VISITS) || "0", 10);
  } catch {
    return 0;
  }
}

function incrementVisitCount(): number {
  try {
    const count = getVisitCount() + 1;
    localStorage.setItem(STORAGE_KEY_VISITS, String(count));
    return count;
  } catch {
    return 1;
  }
}

function isDismissedRecently(): boolean {
  try {
    const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!dismissedAt) return false;
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    return elapsed < DISMISSAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markInstalled() {
  try {
    localStorage.setItem(STORAGE_KEY_INSTALLED, "1");
  } catch {}
}

function wasInstalled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_INSTALLED) === "1";
  } catch {
    return false;
  }
}

export function usePWAInstall(): PWAInstallState {
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [browser, setBrowser] = useState<BrowserKind>("other");
  const [visitCount, setVisitCount] = useState(0);
  const [dismissed, setDismissed] = useState(true); // default true to avoid flash
  const [isTriggered, setIsTriggered] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Check if running in standalone mode (installed PWA)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as Record<string, unknown>).standalone === true;

    const mobile = isMobile();
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const detectedBrowser = detectBrowser();
    const count = incrementVisitCount();

    setIsStandalone(standalone || !mobile || process.env.NODE_ENV === "development");
    setIsIOS(iOS);
    setBrowser(detectedBrowser);
    setVisitCount(count);
    setDismissed(isDismissedRecently());

    // If now standalone but wasn't before, mark as installed
    if (standalone && !wasInstalled()) {
      markInstalled();
    }

    // Listen for Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    setIsTriggered(false);
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
    } catch {}
  }, []);

  const triggerPrompt = useCallback(() => {
    setIsTriggered(true);
  }, []);

  // On iOS, only Safari supports Add to Home Screen
  const canInstallDirectly = isIOS ? browser === "safari" : true;

  // Progressive prompting logic:
  // - Never show if standalone (already installed)
  // - Never show if dismissed recently (7-day cooldown)
  // - Visit 1: no prompt
  // - Visit 2+: eligible for prompt
  // - Force-triggered (after booking): always show
  const shouldShowPrompt = (() => {
    if (isStandalone) return false;
    if (wasInstalled()) return false;
    if (isTriggered) return true;
    if (dismissed) return false;
    return visitCount >= 2;
  })();

  return {
    isStandalone,
    isIOS,
    browser,
    canInstallDirectly,
    deferredPrompt,
    promptInstall,
    shouldShowPrompt,
    visitCount,
    dismissPrompt,
    triggerPrompt,
    isTriggered,
  };
}
