'use client';

import { createContext, useContext, useCallback, useState } from 'react';

const ChatNavContext = createContext({
  activeChatId: null,
  navigateToChat: () => {},
});

export function useChatNav() {
  return useContext(ChatNavContext);
}

export function ChatNavProvider({ children }) {
  const [activeChatId, setActiveChatId] = useState(null);

  const navigateToChat = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  return (
    <ChatNavContext.Provider value={{ activeChatId, navigateToChat }}>
      {children}
    </ChatNavContext.Provider>
  );
}
