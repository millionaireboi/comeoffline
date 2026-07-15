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

    // Landing forwards ?source= + utm_* on EVERY handoff URL — including the
    // token-less open-entry path posters use. Capture them BEFORE branching on
    // token so attribution survives sign-up and the Razorpay redirect.
    const source = params.get("source");
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
    if (source || Object.keys(utm).length > 0) {
      useAppStore.getState().setAttribution({ ...(source ? { source } : {}), ...utm });
      // Super-properties: every later app event (checkout_*, etc.) carries the
      // acquisition context even while the visitor is still anonymous.
      posthog.register({ ...(source ? { acquisition_source: source } : {}), ...utm });
    }

    if (!token) {
      if (deepLinkEventId) {
        // Open entry with purchase intent — the app-side start of the funnel
        // for poster scans, which never carry a token.
        posthog.capture(FUNNEL_APP_HANDOFF_COMPLETED, {
          event_id: deepLinkEventId,
          tier_id: deepLinkTierId,
          source,
          open_entry: true,
          ...utm,
        });
        // Strip the params so a refresh doesn't re-capture stale intent
        window.history.replaceState({ stage: "gate" }, "", window.location.pathname);
      }
      setChecking(false);
      return;
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
          const tokenSource = data.data.source;
          const { setOnboardingSource, setUser } = useAppStore.getState();
          setOnboardingSource(
            tokenSource === "chatbot" ? "landing_chatbot" : "landing_code"
          );
          // Persist to localStorage for crash recovery
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("co_onboarding_source",
              tokenSource === "chatbot" ? "landing_chatbot" : "landing_code"
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
              entry_source: tokenSource,
              ...utm,
            });
          }
          posthog.capture(FUNNEL_APP_HANDOFF_COMPLETED, {
            user_id: data.data.user?.id,
            event_id: deepLinkEventId,
            tier_id: deepLinkTierId,
            source: tokenSource,
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
