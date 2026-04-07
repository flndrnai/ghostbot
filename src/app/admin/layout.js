import { auth } from '../../lib/auth/config.js';
import { redirect } from 'next/navigation';
import { AdminNav } from './admin-nav.jsx';

export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20 safe-top">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
              <img src="/ghostbot-icon.svg" alt="" className="h-5 w-5" />
              <span className="text-sm font-semibold text-primary">GhostBot</span>
            </a>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-sm text-foreground font-medium">Admin</span>
          </div>
        </div>
        <AdminNav />
      </div>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 safe-bottom">
        {children}
      </div>
    </div>
  );
}
