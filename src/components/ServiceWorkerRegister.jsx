'use client';

import { useEffect } from 'react';

// Registers the GhostBot service worker on first mount. Development
// skips registration to avoid stale-cache confusion while iterating.

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // Log once; don't pester the user — the app works fine without SW.
        console.warn('[pwa] service worker registration failed:', err?.message);
      });
  }, []);

  return null;
}
