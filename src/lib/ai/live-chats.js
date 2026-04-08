// Shared registry of chatIds with an active server-side generator.
// Used by /stream/chat/route.js to gate concurrent streams and by
// /chat/[chatId]/page.js + sync bus to tell the client "a response
// is still being generated — show the thinking indicator".
//
// Survives Next.js HMR via globalThis.

import { publish } from '../sync/bus.js';

if (!globalThis.__ghostbotLiveChats) {
  globalThis.__ghostbotLiveChats = new Set();
}
if (!globalThis.__ghostbotChatAborters) {
  globalThis.__ghostbotChatAborters = new Map();
}
const liveChats = globalThis.__ghostbotLiveChats;
const aborters = globalThis.__ghostbotChatAborters;

export function markChatStreaming(chatId, userId) {
  if (!chatId) return null;
  liveChats.add(chatId);
  // Replace any prior controller so a stale one can't linger
  const ctrl = new AbortController();
  aborters.set(chatId, ctrl);
  if (userId) {
    publish(userId, { type: 'chat:streaming-start', chatId });
  }
  return ctrl;
}

export function markChatDone(chatId, userId) {
  if (!chatId) return;
  liveChats.delete(chatId);
  aborters.delete(chatId);
  if (userId) {
    publish(userId, { type: 'chat:streaming-end', chatId });
  }
}

export function isChatStreaming(chatId) {
  if (!chatId) return false;
  return liveChats.has(chatId);
}

/**
 * Trip the AbortController for an in-flight chat stream.
 * Returns true if a stream was actually cancelled.
 */
export function abortChatStream(chatId) {
  if (!chatId) return false;
  const ctrl = aborters.get(chatId);
  if (!ctrl) return false;
  try {
    ctrl.abort();
  } catch {}
  return true;
}

export function getChatAbortSignal(chatId) {
  const ctrl = aborters.get(chatId);
  return ctrl ? ctrl.signal : null;
}
