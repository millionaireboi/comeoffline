"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";

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

    if (!token) {
      setChecking(false);
      return;
    }

    // Clean URL immediately (security: don't leave token visible)
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

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
          setHandled(true);
        }
      } catch (error) {
        // Token validation failed — fall through to normal Gate
        console.warn("[useTokenHandoff] Token handoff failed or timed out:", error);
      } finally {
        clearTimeout(timeout);
        setChecking(false);
      }
    })();
  }, [loginWithToken]);

  return { checking, handled };
}
