"use client";

import { Suspense, useEffect, useRef } from "react";
import { PostHogProvider, useAnalytics, FacebookPixel } from "@comeoffline/analytics";
import { useAppStore } from "@/store/useAppStore";

function IdentitySync() {
  const { posthog, identify, reset } = useAnalytics();
  const userId = useAppStore((s) => s.user?.id);
  const user = useAppStore((s) => s.user);
  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!user || !userId) {
      if (prevUserIdRef.current) {
        reset(); // only reset on actual logout, not initial mount
      }
      prevUserIdRef.current = undefined;
      return;
    }
    identify(userId, {
      name: user.name,
      handle: user.handle,
      status: user.status,
      area: user.area,
    });
    // entry_path should never be overwritten — use $set_once for attribution
    posthog?.capture("$set", {
      $set_once: { entry_path: user.entry_path },
    });
    prevUserIdRef.current = userId;
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PostHogProvider appName="app">
        <IdentitySync />
        <FacebookPixel />
        {children}
      </PostHogProvider>
    </Suspense>
  );
}
