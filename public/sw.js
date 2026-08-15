/*
 * Tracksure Driver service worker.
 *
 * SCOPE, DELIBERATELY NARROW (TRACKSURE.md §12, §19 / CLAUDE.md):
 * this app is ONLINE-ONLY. The service worker exists for two reasons and no
 * others — to make the app installable to the home screen, and to cache
 * immutable static assets so the shell loads fast on a weak network.
 *
 * It must NEVER:
 *   - cache or replay an API response (that would show stale trip data),
 *   - serve a cached page when the network is down (that would fake success),
 *   - queue, retry or background-sync anything the driver submitted.
 *
 * If the network is gone, requests fail, and the screens say so in plain words.
 */

const CACHE = "tracksure-static-v1";

// Only fingerprinted build output and the install icons. Nothing else, ever.
const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/brand/");

self.addEventListener("install", (event) => {
  // Take over as soon as the new build is deployed — drivers should never be
  // stuck on an old shell because they never close the tab.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API lives elsewhere: untouched.
  if (!isStaticAsset(url)) return; // Pages and data always go to the network.

  // Cache-first, and only for content whose URL changes when the content does.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      // Belt and braces: only store what the server says is immutable. A dev
      // build's chunks come back `no-cache`, and caching those under a reused
      // filename is how a phone ends up stuck on yesterday's JavaScript.
      const control = response.headers.get("cache-control") ?? "";
      const cacheable =
        response.ok && !/no-store|no-cache|must-revalidate/.test(control);
      if (cacheable) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
