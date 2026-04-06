import { Suspense } from 'react';
import { getPageAuthState } from '../../lib/auth/index.js';
import { SetupForm } from '../../lib/auth/components/setup-form.jsx';
import { LoginForm } from '../../lib/auth/components/login-form.jsx';

export default async function LoginPage() {
  const { needsSetup } = await getPageAuthState();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-12 overflow-hidden">
      {/* Atmospheric background glow */}
      <div className="pointer-events-none absolute top-[-20%] left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[300px] w-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />

      <div className="relative z-10 w-full max-w-md stagger-children">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center mb-4 animate-ghost-float">
            <img src="/icon.svg" alt="GhostBot" className="h-16 w-16" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">GhostBot</h1>
          <p className="mt-2 text-sm text-muted-foreground">Autonomous AI Coding Agent</p>
        </div>

        {/* Form */}
        <Suspense>
          {needsSetup ? <SetupForm /> : <LoginForm />}
        </Suspense>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground/40">
          Powered by spectral intelligence
        </p>
      </div>
    </div>
  );
}
