"use client";

import { useEffect, useRef } from "react";
import { useAppStore, type AppStage } from "@/store/useAppStore";

/**
 * Maps each stage to its logical "parent" stage for back navigation.
 * Stages not listed here are root-level and back does nothing.
 */
const BACK_MAP: Partial<Record<AppStage, AppStage>> = {
  profile: "feed",
  countdown: "feed",
  reveal: "countdown",
  dayof: "reveal",
  godark: "dayof",
  memories: "feed",
  reconnect: "memories",
  vouch: "memories",
  poll: "feed",
};

/**
 * Integrates the stage-based navigation with the browser History API
 * so that the native swipe-back gesture (iOS) and Android back button
 * navigate between stages instead of leaving the app.
 */
export function useNavigationHistory() {
  const stage = useAppStore((s) => s.stage);
  const setStage = useAppStore((s) => s.setStage);
  const isPopState = useRef(false);
  const prevStage = useRef(stage);
  const initialized = useRef(false);

  // Mount-only: register popstate listener + initialize history entry
  useEffect(() => {
    // Seed the current entry with stage info
    const currentStage = useAppStore.getState().stage;
    window.history.replaceState({ stage: currentStage }, "", "/");
    initialized.current = true;

    const onPopState = (e: PopStateEvent) => {
      const storeStage = useAppStore.getState().stage;

      // If the history state has a stage, navigate to it
      if (e.state?.stage) {
        isPopState.current = true;
        useAppStore.getState().setStage(e.state.stage);
        return;
      }

      // Otherwise, compute where back should go from the current stage
      const backTo = BACK_MAP[storeStage];

      if (backTo) {
        isPopState.current = true;
        // Push state so we don't lose our position
        window.history.pushState({ stage: backTo }, "", "/");
        useAppStore.getState().setStage(backTo);
      } else {
        // At a root stage — push state back to prevent leaving the app
        window.history.pushState({ stage: storeStage }, "", "/");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push a history entry when stage changes (unless it was triggered by popstate)
  useEffect(() => {
    if (!initialized.current) return;

    if (isPopState.current) {
      isPopState.current = false;
      prevStage.current = stage;
      return;
    }

    // Only push if stage actually changed
    if (prevStage.current !== stage) {
      window.history.pushState({ stage }, "", "/");
      prevStage.current = stage;
    }
  }, [stage]);
}
