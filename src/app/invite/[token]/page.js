import { getInvitationByToken } from '../../../lib/db/users.js';
import { InviteAcceptForm } from './invite-form.jsx';

export default async function InvitePage({ params }) {
  const { token } = await params;
  const invite = getInvitationByToken(token);

  let error = null;
  if (!invite) error = 'This invitation link is not valid.';
  else if (invite.acceptedAt) error = 'This invitation has already been used.';
  else if (invite.expiresAt < Date.now()) error = 'This invitation has expired. Ask the admin for a new one.';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/ghostbot-icon.svg" alt="" className="h-6 w-6" />
            <span className="text-lg font-bold tracking-tight text-primary">GhostBot</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">You're invited</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set a password to create your account</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <a href="/login" className="mt-4 inline-block text-xs text-primary underline">Back to login</a>
          </div>
        ) : (
          <InviteAcceptForm
            token={token}
            email={invite.email}
            role={invite.role}
          />
        )}
      </div>
    </div>
  );
}
