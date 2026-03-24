"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 70; // px to trigger refresh
const MAX_PULL = 100; // max pull distance
const RESISTANCE = 0.45; // resistance factor

export function PullToRefresh({ onRefresh, children, className = "" }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0); // sync ref to avoid stale closures
  const refreshingRef = useRef(false); // sync ref for race-condition guard
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null); // track finger identity

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshingRef.current) return;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      // Only activate when scrolled to top
      if (scrollTop > 0) return;
      const touch = e.touches[0];
      startY.current = touch.clientY;
      touchId.current = touch.identifier;
      pulling.current = true;
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;
      // Find our tracked touch
      const touch = Array.from(e.touches).find((t) => t.identifier === touchId.current);
      if (!touch) return;

      const scrollTop = containerRef.current?.scrollTop ?? 0;
      if (scrollTop > 0) {
        pulling.current = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }
      const diff = touch.clientY - startY.current;
      if (diff < 0) {
        pulling.current = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }
      const distance = Math.min(diff * RESISTANCE, MAX_PULL);
      setPullDistance(distance);
      pullDistanceRef.current = distance;
    },
    [],
  );

  const resetPull = useCallback(() => {
    pulling.current = false;
    touchId.current = null;
    if (mountedRef.current) {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current && pullDistanceRef.current === 0) return;
    pulling.current = false;
    touchId.current = null;

    if (pullDistanceRef.current >= THRESHOLD && !refreshingRef.current) {
      refreshingRef.current = true;
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.6); // Hold at indicator position
      pullDistanceRef.current = THRESHOLD * 0.6;
      try {
        await onRefresh();
      } catch {
        // swallow — caller handles errors
      }
      if (mountedRef.current) {
        setRefreshing(false);
        refreshingRef.current = false;
      }
    }
    if (mountedRef.current) {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 8 || refreshing;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetPull}
    >
      {/* Pull indicator */}
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{
          height: showIndicator ? `${Math.max(pullDistance, refreshing ? 42 : 0)}px` : "0px",
          transition: pulling.current ? "none" : "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            opacity: progress,
            transform: `rotate(${progress * 360}deg)`,
            transition: pulling.current ? "none" : "transform 0.3s ease",
          }}
        >
          {refreshing ? (
            <div
              className="h-5 w-5 rounded-full border-2 border-transparent border-t-caramel"
              style={{ animation: "ptrSpin 0.7s linear infinite" }}
            />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-caramel"
              style={{
                transform: progress >= 1 ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path
                d="M10 3v10M10 3L6 7M10 3l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 14a6 6 0 0 0 12 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
              />
            </svg>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
