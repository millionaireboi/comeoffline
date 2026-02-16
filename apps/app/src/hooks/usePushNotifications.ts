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

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        // Wait for the SW to become active before sending config
        const sw = reg.active || reg.waiting || reg.installing;
        if (!sw) return;

        if (sw.state !== "activated") {
          await new Promise<void>((resolve) => {
            sw.addEventListener("statechange", () => {
              if (sw.state === "activated") resolve();
            });
          });
        }

        // Send Firebase config to the active service worker
        reg.active?.postMessage({
          type: "FIREBASE_CONFIG",
          config: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          },
        });

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
