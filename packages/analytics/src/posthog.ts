import posthog from "posthog-js";

let _initialized = false;

export function initPostHog(): void {
  if (typeof window === "undefined") return;
  if (_initialized) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!key) {
    console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY not set — PostHog disabled");
    return;
  }

  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://us.i.posthog.com",
    defaults: "2025-11-30",
    capture_pageview: false, // we fire manual pageviews on route change for SPA accuracy
    capture_pageleave: true,
    person_profiles: "identified_only",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: ".sensitive",
    },
  });

  _initialized = true;
}

export { posthog };
