"use client";

import { Suspense } from "react";
import { PostHogProvider } from "@comeoffline/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PostHogProvider>{children}</PostHogProvider>
    </Suspense>
  );
}
