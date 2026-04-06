import { auth } from '../../lib/auth/config.js';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'admin') redirect('/');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">Admin Settings</h1>
        <p className="mt-2 text-muted-foreground">Coming in Phase 2</p>
      </div>
    </div>
  );
}
