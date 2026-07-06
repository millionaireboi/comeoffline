"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { posthog, FUNNEL_APP_HANDOFF_COMPLETED, FUNNEL_APP_HANDOFF_FAILED } from "@comeoffline/analytics";

function resolveUrl(envValue: string | undefined, fallbackPort: number): string {
  if (typeof window === "undefined") return envValue || `http://localhost:${fallbackPort}`;
  const base = envValue || `http://localhost:${fallbackPort}`;
  if (base.includes("localhost") && window.location.hostname !== "localhost") {
    return base.replace("localhost", window.location.hostname);
  }
  return base;
}

const API_URL = resolveUrl(process.env.NEXT_PUBLIC_API_URL, 8080);

/**
 * Checks for a handoff token in URL params (from landing page or chatbot redirect).
 * If found, validates it with the API and logs the user in, then clears the token from URL.
 * Returns { checking, handled } — `checking` is true while validating, `handled` is true if
 * a token was successfully consumed (so the Gate can be skipped).
 */
export function useTokenHandoff() {
  const [checking, setChecking] = useState(true);
  const [handled, setHandled] = useState(false);
  const { loginWithToken } = useAuth();

  useEffect(() => {
    // Guard against SSR
    if (typeof window === "undefined") {
      setChecking(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    // Capture deep-link targets FIRST — with open entry the landing page
    // sends ?event=<id>&tier=<id> WITHOUT a token (the visitor signs in /
    // signs up in-app), and the intent must survive that flow.
    const deepLinkEventId = params.get("event");
    const deepLinkTierId = params.get("tier");
    if (deepLinkEventId) {
      const { setPendingPurchaseEventId, setPendingDeepLinkTierId } = useAppStore.getState();
      setPendingPurchaseEventId(deepLinkEventId);
      if (deepLinkTierId) setPendingDeepLinkTierId(deepLinkTierId);
    }

    if (!token) {
      // Strip the params so a refresh doesn't re-capture stale intent
      if (deepLinkEventId) {
        window.history.replaceState({ stage: "gate" }, "", window.location.pathname);
      }
      setChecking(false);
      return;
    }

    // Landing forwards utm_* on the handoff URL — capture them so app-side
    // attribution doesn't depend on PostHog identity stitching alone.
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }

    // Clean URL immediately (security: don't leave token visible)
    const cleanUrl = window.location.pathname;
    window.history.replaceState({ stage: "gate" }, "", cleanUrl);

    (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(`${API_URL}/api/auth/validate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (data.success && data.data?.token) {
          // Capture onboarding source from handoff token
          const source = data.data.source;
          const { setOnboardingSource, setUser } = useAppStore.getState();
          setOnboardingSource(
            source === "chatbot" ? "landing_chatbot" : "landing_code"
          );
          // Persist to localStorage for crash recovery
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("co_onboarding_source",
              source === "chatbot" ? "landing_chatbot" : "landing_code"
            );
          }
          // Set user in store immediately if available
          if (data.data.user) {
            setUser(data.data.user);
          }
          await loginWithToken(data.data.token);
          // Stitch identity + fire funnel event so the landing → app journey is one
          // continuous PostHog person record.
          if (data.data.user?.id) {
            posthog.identify(data.data.user.id, {
              handle: data.data.user.handle,
              name: data.data.user.name,
              entry_source: source,
              ...utm,
            });
          }
          posthog.capture(FUNNEL_APP_HANDOFF_COMPLETED, {
            user_id: data.data.user?.id,
            event_id: deepLinkEventId,
            tier_id: deepLinkTierId,
            source,
            ...utm,
          });
          setHandled(true);
        } else {
          posthog.capture(FUNNEL_APP_HANDOFF_FAILED, {
            event_id: deepLinkEventId,
            error: data.message || "validation_failed",
          });
        }
      } catch (error) {
        // Token validation failed — fall through to normal Gate
        console.warn("[useTokenHandoff] Token handoff failed or timed out:", error);
        posthog.capture(FUNNEL_APP_HANDOFF_FAILED, {
          event_id: deepLinkEventId,
          error: "network_or_timeout",
        });
      } finally {
        clearTimeout(timeout);
        setChecking(false);
      }
    })();
  }, [loginWithToken]);

  return { checking, handled };
}
