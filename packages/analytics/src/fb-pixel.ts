"use client";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
  }
}

let _initialized = false;

/**
 * Initialize the Facebook Pixel.
 * Call once at app startup — safe to call multiple times (idempotent).
 */
export function initFacebookPixel(): void {
  if (typeof window === "undefined") return;
  if (_initialized) return;

  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  if (!pixelId) {
    console.warn("[analytics] NEXT_PUBLIC_FB_PIXEL_ID not set — Facebook Pixel disabled");
    return;
  }

  // Facebook Pixel base code
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");

  _initialized = true;
}

/**
 * Track a standard or custom Facebook Pixel event.
 *
 * Standard events: PageView, ViewContent, InitiateCheckout, Purchase,
 * CompleteRegistration, AddToCart, Lead, etc.
 */
export function trackFbEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}

/**
 * Track a custom (non-standard) Facebook Pixel event.
 */
export function trackFbCustomEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) {
    window.fbq("trackCustom", eventName, params);
  } else {
    window.fbq("trackCustom", eventName);
  }
}
