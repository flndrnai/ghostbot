// In-process pub/sub for cross-device sync.
// Each user has a Set of subscribers (one per open SSE connection).
// When the DB layer publishes an event, every connected device for
// that user gets it pushed in real time.
//
// Survives Next.js HMR / module reloads via globalThis.

if (!globalThis.__ghostbotSyncBus) {
  globalThis.__ghostbotSyncBus = {
    // Map<userId, Set<(event) => void>>
    subscribers: new Map(),
  };
}

const bus = globalThis.__ghostbotSyncBus;

export function subscribe(userId, callback) {
  if (!userId || typeof callback !== 'function') return () => {};
  let set = bus.subscribers.get(userId);
  if (!set) {
    set = new Set();
    bus.subscribers.set(userId, set);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
    if (set.size === 0) bus.subscribers.delete(userId);
  };
}

export function publish(userId, event) {
  if (!userId || !event) return;
  const set = bus.subscribers.get(userId);
  if (!set || set.size === 0) return;
  const payload = { ...event, ts: Date.now() };
  for (const cb of set) {
    try {
      cb(payload);
    } catch {
      // Best effort — never let one slow client block the others
    }
  }
}

export function subscriberCount(userId) {
  return bus.subscribers.get(userId)?.size || 0;
}
