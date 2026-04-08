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
const liveChats = globalThis.__ghostbotLiveChats;

export function markChatStreaming(chatId, userId) {
  if (!chatId) return;
  liveChats.add(chatId);
  if (userId) {
    publish(userId, { type: 'chat:streaming-start', chatId });
  }
}

export function markChatDone(chatId, userId) {
  if (!chatId) return;
  liveChats.delete(chatId);
  if (userId) {
    publish(userId, { type: 'chat:streaming-end', chatId });
  }
}

export function isChatStreaming(chatId) {
  if (!chatId) return false;
  return liveChats.has(chatId);
}
