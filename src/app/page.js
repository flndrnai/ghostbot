import { auth } from '../lib/auth/config.js';
import { ChatPage } from '../lib/chat/components/chat-page.jsx';

export default async function Home() {
  const session = await auth();
  return <ChatPage session={session} />;
}
