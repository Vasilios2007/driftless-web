// Service worker for the Driftless PWA — makes the app work OFFLINE after the first
// load. Strategy: cache-first for everything we've seen, refresh in the background,
// and fall back to the cached app shell for navigations when there's no network.
const CACHE = "driftless-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: false });

      if (cached) {
        // serve cached immediately, quietly refresh for next time
        fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
          })
          .catch(() => {});
        return cached;
      }

      try {
        const res = await fetch(req);
        if (res && res.status === 200 && new URL(req.url).origin === self.location.origin) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        // offline + uncached: for page navigations, serve the app shell
        if (req.mode === "navigate") {
          const shell = (await cache.match("index.html")) || (await cache.match("./"));
          if (shell) return shell;
        }
        throw err;
      }
    })(),
  );
});
