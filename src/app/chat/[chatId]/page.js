import { auth } from '../../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { getChatById, getMessagesByChatId } from '../../../lib/db/chats.js';
import { ChatPage } from '../../../lib/chat/components/chat-page.jsx';
import { isChatStreaming } from '../../../lib/ai/live-chats.js';

function formatMessagesForClient(dbMessages) {
  if (!Array.isArray(dbMessages)) return [];
  return dbMessages
    .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
    .map((msg) => ({
      id: String(msg.id),
      role: msg.role,
      content: msg.content,
      ...(Array.isArray(msg.images) && msg.images.length ? { images: msg.images } : {}),
      parts: [{ type: 'text', text: msg.content }],
      createdAt: typeof msg.createdAt === 'number' ? msg.createdAt : Date.now(),
    }));
}

export default async function ChatIdPage({ params }) {
  const session = await auth();
  if (!session) redirect('/login');

  const { chatId } = await params;
  const chat = getChatById(chatId);

  console.log('[chat-page]', {
    chatId,
    sessionUserId: session?.user?.id,
    chatExists: !!chat,
    chatUserId: chat?.userId,
    chatTitle: chat?.title,
  });

  if (!chat) {
    console.log('[chat-page] chat not found, redirecting to /');
    redirect('/');
  }
  if (chat.userId !== session.user.id) {
    console.log('[chat-page] userId mismatch', { chatUserId: chat.userId, sessionUserId: session.user.id });
    redirect('/');
  }

  const dbMessages = getMessagesByChatId(chatId);
  console.log('[chat-page] dbMessages count:', dbMessages?.length, 'roles:', dbMessages?.map((m) => m.role));

  const initialMessages = formatMessagesForClient(dbMessages);
  const initialStreaming = isChatStreaming(chatId);
  console.log('[chat-page] initialMessages count:', initialMessages.length, 'streaming:', initialStreaming);

  return <ChatPage session={session} chatId={chatId} initialMessages={initialMessages} initialStreaming={initialStreaming} projectId={chat.projectId || null} />;
}
