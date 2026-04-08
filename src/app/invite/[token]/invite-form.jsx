'use client';

import { useState } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { acceptInviteAction } from '../../../lib/auth/actions.js';
import { CheckCircle, Loader2, XCircle } from '../../../lib/icons/index.jsx';

export function InviteAcceptForm({ token, email, role }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const res = await acceptInviteAction({ token, password });
    setSubmitting(false);
    if (res.success) {
      setDone(true);
      // Redirect to login after a short beat
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } else {
      setError(res.error || 'Failed to accept invitation');
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
        <CheckCircle className="h-8 w-8 text-primary mx-auto" />
        <p className="text-sm font-semibold text-primary">Account created</p>
        <p className="text-xs text-muted-foreground">Redirecting you to the login page...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
      <div className="space-y-1">
        <Label>Email</Label>
        <Input value={email} disabled className="opacity-70" />
        <p className="text-[11px] text-muted-foreground">
          Role: <span className="text-primary font-semibold">{role}</span>
        </p>
      </div>

      <div className="space-y-1">
        <Label>Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1">
        <Label>Confirm password</Label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Retype it"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <XCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      <Button type="submit" disabled={submitting || !password || !confirm} className="w-full">
        {submitting ? <><Loader2 className="h-4 w-4 mr-2" /> Creating account...</> : 'Accept invitation'}
      </Button>
    </form>
  );
}
