"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initFacebookPixel, trackFbEvent } from "./fb-pixel";

/**
 * Drop this component into your layout to initialize Facebook Pixel
 * and fire PageView on every client-side route change.
 *
 * Requires NEXT_PUBLIC_FB_PIXEL_ID env var.
 */
export function FacebookPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initFacebookPixel();
  }, []);

  // Fire PageView on route changes (SPA navigation)
  useEffect(() => {
    if (typeof window === "undefined" || !window.fbq) return;
    trackFbEvent("PageView");
  }, [pathname, searchParams]);

  return null;
}
