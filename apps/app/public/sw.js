/* eslint-disable no-restricted-globals */

// Service Worker — handles push notifications and offline caching
// No Firebase SDK needed here; we handle push events natively.

// Handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const notification = payload.notification || {};
  const title = notification.title;
  if (!title) return;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: notification.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: payload.data || {},
      actions: [{ action: "open", title: "Open" }],
    }),
  );
});

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

// Pre-cache the app shell for offline support
const APP_SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
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
        // Cache successful navigation and static asset responses for offline fallback
        if (response.ok) {
          const shouldCache =
            event.request.mode === "navigate" ||
            url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/);
          if (shouldCache) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
