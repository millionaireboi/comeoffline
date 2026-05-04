"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { apiFetch } from "@/lib/api";

const PINGED_THIS_LOAD_KEY = "pwa_standalone_pinged_session";

/**
 * Pings the server when the app is launched in standalone (installed-PWA) mode AND the user is
 * authed. Records first-install timestamp + bumps last-standalone-at + session counter.
 *
 * Safe to mount at the root — the actual ping only fires when the conditions match. Once per
 * tab session (sessionStorage) so we don't spam the endpoint on every navigation.
 */
export function useStandaloneTracking() {
  const { user, getIdToken } = useAuth();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window === "undefined") return;
    if (!user) return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    // Once per browser tab session — prevents duplicate pings on navigation.
    try {
      if (sessionStorage.getItem(PINGED_THIS_LOAD_KEY) === "1") return;
      sessionStorage.setItem(PINGED_THIS_LOAD_KEY, "1");
    } catch {
      // sessionStorage unavailable (private mode etc.) — fall through, worst case is one extra ping per tab
    }

    fired.current = true;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        await apiFetch("/api/users/me/installed-pwa", {
          method: "POST",
          token,
          body: JSON.stringify({ source: "standalone-detected" }),
        });
      } catch (err) {
        // Tracking failure should never break the app — swallow.
        console.warn("[pwa-tracking] ping failed:", err);
      }
    })();
  }, [user, getIdToken]);
}
