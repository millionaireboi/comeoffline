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
        // Register service worker with Firebase config
        const reg = await navigator.serviceWorker.register("/sw.js");

        // Pass Firebase config to the service worker
        if (reg.active) {
          reg.active.postMessage({
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
        }

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Get FCM token using firebase/messaging
        const { getMessaging, getToken } = await import("firebase/messaging");
        const { getFirebaseApp } = await import("@comeoffline/firebase");

        const app = getFirebaseApp();
        const messaging = getMessaging(app);
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

        const fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: reg,
        });

        if (fcmToken) {
          // Store FCM token on user profile
          const token = await getIdToken();
          if (token) {
            await apiFetch("/api/users/me", {
              method: "PUT",
              token,
              body: JSON.stringify({ fcm_token: fcmToken }),
            });
          }
        }

        registered.current = true;
      } catch (err) {
        console.error("[push] Setup failed:", err);
      }
    }

    setup();
  }, [user, getIdToken]);
}
