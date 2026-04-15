import { auth } from '../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { ChatPage } from '../lib/chat/components/chat-page.jsx';
import { getChatsByUserId } from '../lib/db/chats.js';
import { LandingPage } from './landing.jsx';

export default async function Home({ searchParams }) {
  const session = await auth();

  // Unauthenticated visitors see the public landing page
  if (!session?.user) {
    return <LandingPage />;
  }

  const params = (await searchParams) || {};
  const wantsNew = params.new === '1' || params.new === 'true';

  // If the user is logged in and has at least one existing chat,
  // jump straight back into the most recent one — UNLESS they
  // explicitly asked for a new chat via ?new=1. The sidebar's
  // 'New Chat' button (and Cmd+Shift+N) use ?new=1.
  if (!wantsNew) {
    try {
      const chats = getChatsByUserId(session.user.id, 1);
      if (Array.isArray(chats) && chats.length > 0 && chats[0]?.id) {
        redirect(`/chat/${chats[0].id}`);
      }
    } catch {
      // fall through to greeting on any DB error
    }
  }

  return <ChatPage session={session} />;
}
