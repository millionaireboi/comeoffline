"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { initPostHog } from "./posthog";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    posthog.capture("$pageview", {
      $current_url: window.location.href,
    });
  }, [pathname, searchParams]);

  return null;
}

interface PostHogProviderProps {
  children: React.ReactNode;
  appName?: string;
}

export function PostHogProvider({ children, appName }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();
    if (appName) {
      posthog.register({ app_name: appName });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PHProvider client={posthog}>
      <PageViewTracker />
      {children}
    </PHProvider>
  );
}
