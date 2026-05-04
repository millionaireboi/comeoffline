"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";

/**
 * Registers service worker, requests notification permission,
 * gets FCM token, and stores it on the user profile.
 */
export function usePushNotifications() {
  const { getIdToken } = useAuth();
  const user = useAppStore((s) => s.user);
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Skip push registration on local dev hosts — the FCM HTTP API + VAPID setup
    // isn't worth wiring locally, and the 401 noise drowns out real errors.
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || /^192\.168\./.test(host) || host.endsWith(".local")) {
      registered.current = true;
      return;
    }

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Get FCM token — this can fail if Cloud Messaging API isn't enabled
        // or VAPID key is misconfigured. Not critical, so handle gracefully.
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn("[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set, skipping FCM registration");
          registered.current = true;
          return;
        }

        try {
          const { getMessaging, getToken } = await import("firebase/messaging");
          const { getFirebaseApp } = await import("@comeoffline/firebase");

          const app = getFirebaseApp();
          const messaging = getMessaging(app);

          const fcmToken = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: reg,
          });

          if (fcmToken) {
            const token = await getIdToken();
            if (token) {
              await apiFetch("/api/users/me", {
                method: "PUT",
                token,
                body: JSON.stringify({ fcm_token: fcmToken }),
              });
            }
          }
        } catch (fcmErr) {
          // FCM token registration failed — not critical, app works without push
          console.warn("[push] FCM token registration failed (push notifications disabled):", fcmErr);
        }

        registered.current = true;
      } catch (err) {
        console.error("[push] Service worker setup failed:", err);
      }
    }

    setup();
  }, [user, getIdToken]);
}
