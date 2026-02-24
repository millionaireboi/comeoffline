"use client";

import { usePostHog } from "posthog-js/react";

export function useAnalytics() {
  const posthog = usePostHog();

  const track = (event: string, properties?: Record<string, unknown>) => {
    posthog?.capture(event, properties);
  };

  const identify = (userId: string, traits?: Record<string, unknown>) => {
    posthog?.identify(userId, traits);
  };

  const reset = () => {
    posthog?.reset();
  };

  return { posthog, track, identify, reset };
}
