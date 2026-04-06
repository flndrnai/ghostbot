import { auth } from '../../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { getChatById, getMessagesByChatId } from '../../../lib/db/chats.js';
import { ChatPage } from '../../../lib/chat/components/chat-page.jsx';

function formatMessagesForClient(dbMessages) {
  const uiMessages = [];

  for (const msg of dbMessages) {
    uiMessages.push({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      parts: [{ type: 'text', text: msg.content }],
      createdAt: new Date(msg.createdAt),
    });
  }

  return uiMessages;
}

export default async function ChatIdPage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { chatId } = await params;
  const chat = getChatById(chatId);

  if (!chat) redirect('/');
  if (chat.userId !== session.user.id) redirect('/');

  const dbMessages = getMessagesByChatId(chatId);
  const initialMessages = formatMessagesForClient(dbMessages);

  return <ChatPage session={session} chatId={chatId} initialMessages={initialMessages} />;
}
