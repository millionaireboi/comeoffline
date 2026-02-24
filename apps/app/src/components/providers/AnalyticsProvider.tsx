"use client";

import { Suspense, useEffect } from "react";
import { PostHogProvider, useAnalytics } from "@comeoffline/analytics";
import { useAppStore } from "@/store/useAppStore";

function IdentitySync() {
  const { identify, reset } = useAnalytics();
  const userId = useAppStore((s) => s.user?.id);
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (!user || !userId) {
      reset();
      return;
    }
    identify(userId, {
      name: user.name,
      handle: user.handle,
      status: user.status,
      entry_path: user.entry_path,
      area: user.area,
    });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PostHogProvider>
        <IdentitySync />
        {children}
      </PostHogProvider>
    </Suspense>
  );
}
