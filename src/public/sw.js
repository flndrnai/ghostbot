// GhostBot service worker — minimal offline-shell cache.
//
// This is intentionally narrow: GhostBot is a chat-first app whose
// value comes from the live LLM / agent-job stream. Caching is
// limited to the app shell and a handful of static assets so
// installed PWAs can open to a recognisable frame even when the
// network is flaky. Everything data-bearing (chat streams, SSE,
// admin actions, API calls) bypasses the cache entirely.

const CACHE = 'ghostbot-shell-v1';
const SHELL_ASSETS = [
  '/manifest.json',
  '/ghostbot-icon.svg',
  '/icon.svg',
  '/favicon.svg',
  '/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL_ASSETS))
      .catch(() => {}) // missing assets shouldn't block install
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Never touch non-GET or cross-origin — safety first.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always bypass cache for API / stream / auth / Next data endpoints.
  // These must hit the network — stale cached responses would break auth,
  // SSE sync, and server actions.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/stream/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.pathname === '/login' ||
    url.pathname === '/setup' ||
    url.pathname.startsWith('/admin/') ||
    url.pathname.startsWith('/chat/')
  ) {
    return;
  }

  // For static assets and the marketing shell, use stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
