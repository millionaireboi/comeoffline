/* eslint-disable no-restricted-globals */

// Service Worker — handles push notifications and offline caching
// No Firebase SDK needed here; we handle push events natively.

// Bump this on each deploy (or automate via CI: sed -i "s/CACHE_VERSION = .*/CACHE_VERSION = '$(date +%s)';/" sw.js)
const CACHE_VERSION = "20260325";
const CACHE_NAME = `comeoffline-v${CACHE_VERSION}`;

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

// Pre-cache the app shell for offline support
const APP_SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Delete ALL old caches (any name that isn't the current version)
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api") || url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages) — always network-first, never serve stale HTML
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  // Static assets — network-first with cache fallback
  const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/);
  if (isStaticAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Everything else — network only, don't cache
});
