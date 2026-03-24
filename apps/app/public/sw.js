/* eslint-disable no-restricted-globals */

// Firebase Messaging Service Worker
// importScripts must be called at the top level during installation
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

let messagingInitialized = false;

// Listen for Firebase config from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    initMessaging(event.data.config);
  }
});

function initMessaging(config) {
  if (messagingInitialized || !config || !config.projectId) return;

  try {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    // Handle background push notifications
    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (!title) return;

      self.registration.showNotification(title, {
        body: body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [100, 50, 100],
        data: payload.data || {},
        actions: [{ action: "open", title: "Open" }],
      });
    });

    messagingInitialized = true;
  } catch (err) {
    console.error("[sw] Failed to initialize Firebase messaging:", err);
  }
}

// Handle notification click — navigate to the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});

// Basic network-first strategy for navigation, skip API & external
const CACHE_NAME = "comeoffline-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api") || url.origin !== self.location.origin) return;

  // Network-first: try network, fall back to cache for offline support
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful navigation responses for offline fallback
        if (response.ok && event.request.mode === "navigate") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
