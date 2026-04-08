'use client';

import { createContext, useContext, useCallback, useState, useRef } from 'react';
import { useSyncEvents } from '../../sync/use-sync.js';

const ChatNavContext = createContext({
  activeChatId: null,
  navigateToChat: () => {},
  refreshKey: 0,
  triggerRefresh: () => {},
  registerMessageHandler: () => () => {},
  registerAgentJobHandler: () => () => {},
  registerStreamingHandler: () => () => {},
});

export function useChatNav() {
  return useContext(ChatNavContext);
}

export function ChatNavProvider({ children }) {
  const [activeChatId, setActiveChatId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Per-chat message handlers, registered by mounted Chat components.
  // Keyed by chatId so events route only to the right open conversation.
  const handlersRef = useRef(new Map());
  // Global agent-job event handlers (Set of callbacks)
  const agentJobHandlersRef = useRef(new Set());
  // Global chat-streaming handlers (Set of callbacks)
  const streamingHandlersRef = useRef(new Set());

  const navigateToChat = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const registerMessageHandler = useCallback((chatId, handler) => {
    if (!chatId || typeof handler !== 'function') return () => {};
    handlersRef.current.set(chatId, handler);
    return () => {
      if (handlersRef.current.get(chatId) === handler) {
        handlersRef.current.delete(chatId);
      }
    };
  }, []);

  const registerAgentJobHandler = useCallback((handler) => {
    if (typeof handler !== 'function') return () => {};
    agentJobHandlersRef.current.add(handler);
    return () => {
      agentJobHandlersRef.current.delete(handler);
    };
  }, []);

  const registerStreamingHandler = useCallback((handler) => {
    if (typeof handler !== 'function') return () => {};
    streamingHandlersRef.current.add(handler);
    return () => {
      streamingHandlersRef.current.delete(handler);
    };
  }, []);

  const handleSyncEvent = useCallback((event) => {
    if (!event) return;
    switch (event.type) {
      case 'message:new': {
        const handler = handlersRef.current.get(event.chatId);
        if (handler) handler(event.message);
        // Always refresh sidebar so updatedAt + order stay current
        setRefreshKey((k) => k + 1);
        break;
      }
      case 'chat:created':
      case 'chat:updated':
      case 'chat:deleted':
        setRefreshKey((k) => k + 1);
        break;
      case 'agent-job:created':
      case 'agent-job:updated':
      case 'agent-job:log':
        for (const h of agentJobHandlersRef.current) {
          try { h(event); } catch {}
        }
        break;
      case 'chat:streaming-start':
      case 'chat:streaming-end':
        for (const h of streamingHandlersRef.current) {
          try { h(event); } catch {}
        }
        break;
      default:
        break;
    }
  }, []);

  useSyncEvents(handleSyncEvent);

  return (
    <ChatNavContext.Provider
      value={{
        activeChatId,
        navigateToChat,
        refreshKey,
        triggerRefresh,
        registerMessageHandler,
        registerAgentJobHandler,
        registerStreamingHandler,
      }}
    >
      {children}
    </ChatNavContext.Provider>
  );
}
