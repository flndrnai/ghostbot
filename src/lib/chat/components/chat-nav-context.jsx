'use client';

import { createContext, useContext, useCallback, useState } from 'react';

const ChatNavContext = createContext({
  activeChatId: null,
  navigateToChat: () => {},
  refreshKey: 0,
  triggerRefresh: () => {},
});

export function useChatNav() {
  return useContext(ChatNavContext);
}

export function ChatNavProvider({ children }) {
  const [activeChatId, setActiveChatId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigateToChat = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <ChatNavContext.Provider value={{ activeChatId, navigateToChat, refreshKey, triggerRefresh }}>
      {children}
    </ChatNavContext.Provider>
  );
}
