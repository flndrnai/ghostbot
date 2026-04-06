'use client';

import { Messages } from './messages.jsx';
import { ChatInput } from './chat-input.jsx';

export function Chat() {
  return (
    <div className="flex h-full flex-col">
      <Messages messages={[]} />
      <ChatInput />
    </div>
  );
}
