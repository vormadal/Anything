const CACHE_NAME = "anything-app-v6";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Skip API requests — always go to network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Never cache the manifest — Chrome's WebAPK update checker must always
  // fetch a fresh copy to detect icon/name changes and update the installed app.
  if (url.pathname === "/manifest.webmanifest") {
    return;
  }

  // For navigation requests: network-first, fall back to cached "/"
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // For static assets: cache-first strategy
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});

// ---------------------------------------------------------------------------
// Web Push
//
// The payload is written by WebPushSender on the backend: { title, body, url }.
// It carries only what the in-app notification already shows, because a push
// payload travels through a third-party push service.
// ---------------------------------------------------------------------------

const NOTIFICATION_FALLBACK_TITLE = "Anything";
const NOTIFICATION_ICON = "/icons/icon-192.png";

self.addEventListener("push", (event) => {
  // A push with no data, or with something that isn't our JSON, still has to
  // show *something*: browsers require a visible notification for every push
  // (userVisibleOnly), and a silent one can cost the site its permission.
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || NOTIFICATION_FALLBACK_TITLE;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || undefined,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      // Where a tap goes. Always an app-relative path chosen server-side —
      // the send API has no link field, so this can't be an off-site URL.
      data: { url: payload.url || "/notifications" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/notifications",
    self.location.origin
  );

  // Prefer focusing a tab that's already open over opening another one — the
  // app is a PWA, and a second window on every notification tap is grating.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === target.href && "focus" in client) {
            return client.focus();
          }
        }

        const existing = clientList.find((client) => "navigate" in client);
        if (existing) {
          return existing.focus().then((focused) => focused.navigate(target.href));
        }

        return self.clients.openWindow(target.href);
      })
  );
});
