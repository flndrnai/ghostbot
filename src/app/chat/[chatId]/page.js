import { auth } from '../../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { getChatById, getMessagesByChatId } from '../../../lib/db/chats.js';
import { ChatPage } from '../../../lib/chat/components/chat-page.jsx';

function formatMessagesForClient(dbMessages) {
  if (!Array.isArray(dbMessages)) return [];
  return dbMessages
    .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
    .map((msg) => ({
      id: String(msg.id),
      role: msg.role,
      content: msg.content,
      parts: [{ type: 'text', text: msg.content }],
      createdAt: typeof msg.createdAt === 'number' ? msg.createdAt : Date.now(),
    }));
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
