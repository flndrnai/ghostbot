'use client';

import { useEffect } from 'react';

/**
 * Subscribes to /stream/sync (server-sent events) for the current user.
 * Calls `onEvent(event)` for every payload received.
 *
 * Auto-reconnects with exponential backoff if the connection drops.
 * Stops when the component unmounts.
 */
export function useSyncEvents(onEvent) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    let es = null;
    let closed = false;
    let backoff = 1000;

    function connect() {
      if (closed) return;
      try {
        es = new EventSource('/stream/sync');
      } catch {
        scheduleReconnect();
        return;
      }

      es.onopen = () => {
        backoff = 1000; // reset on successful connect
      };

      es.onmessage = (e) => {
        if (!e.data) return;
        try {
          const data = JSON.parse(e.data);
          onEvent?.(data);
        } catch {
          // ignore malformed
        }
      };

      es.onerror = () => {
        try { es?.close(); } catch {}
        es = null;
        scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      if (closed) return;
      const delay = Math.min(backoff, 30000);
      backoff = Math.min(backoff * 2, 30000);
      setTimeout(connect, delay);
    }

    connect();

    // Mobile SSE reconnect: visibility + network awareness
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !closed) {
        backoff = 1000;
        try { es?.close(); } catch {}
        es = null;
        connect();
      }
    }

    function handleOnline() {
      if (!closed) {
        backoff = 1000;
        try { es?.close(); } catch {}
        es = null;
        connect();
      }
    }

    function handleOffline() {
      try { es?.close(); } catch {}
      es = null;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      closed = true;
      try { es?.close(); } catch {}
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onEvent]);
}
