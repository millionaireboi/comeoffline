"use client";

import { Suspense, useEffect } from "react";
import { PostHogProvider, useAnalytics } from "@comeoffline/analytics";

function AdminTag() {
  const { posthog } = useAnalytics();
  useEffect(() => {
    posthog?.register({ is_admin: true });
  }, [posthog]);
  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PostHogProvider appName="admin">
        <AdminTag />
        {children}
      </PostHogProvider>
    </Suspense>
  );
}
