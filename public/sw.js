// Sardar CRM service worker.
//
// Conservative by design so it is safe in dev (turbopack HMR) and production:
//  - navigations: network-first, falling back to the last cached page, then
//    to a minimal offline page.
//  - same-origin GET assets: stale-while-revalidate (fast, still fresh).
//  - everything else (POST server actions, cross-origin, no-store): untouched.
const CACHE = "sardar-crm-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache streaming/SSE or anything explicitly marked no-store.
  if (req.cache === "no-store" || req.headers.get("cache-control")?.includes("no-store")) {
    return;
  }

  // HTML navigations: network first, cache fallback, then offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
          return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        }),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// ---------------------------------------------------------------------------
// Push Notifications
//
// Handles push events for follow-up reminders and other CRM notifications.
// When a push is received, shows a notification with the provided payload.
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Sardar CRM",
      body: event.data.text(),
    };
  }

  const title = payload.title || "Sardar CRM";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/sardar-fav.png",
    badge: payload.badge || "/sardar-fav.png",
    tag: payload.tag || "sardar-crm-notification",
    data: payload.data || {},
    actions: payload.actions || [],
    requireInteraction: payload.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window if none exists
      self.clients.openWindow(url);
    })
  );
});
