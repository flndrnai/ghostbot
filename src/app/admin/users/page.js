'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import {
  listUsersAction,
  deleteUserAction,
  updateUserRoleAction,
  createInvitationAction,
  listInvitationsAction,
  deleteInvitationAction,
} from '../../../lib/admin/user-actions.js';
import { CheckCircle, Loader2, Plus, Trash2, RefreshCw } from '../../../lib/icons/index.jsx';

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: false });
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteDays, setInviteDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [u, i] = await Promise.all([listUsersAction(), listInvitationsAction()]);
      setUsers(u || []);
      setInvites(i || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreateInvite() {
    if (!inviteEmail.trim()) return;
    setCreating(true);
    setCreatedLink(null);
    const res = await createInvitationAction({
      email: inviteEmail.trim(),
      role: inviteRole,
      expiresInDays: parseInt(inviteDays, 10) || 7,
    });
    setCreating(false);
    if (res.success) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/invite/${res.token}`;
      setCreatedLink(link);
      setInviteEmail('');
      await refresh();
    }
  }

  async function handleCopyLink(token) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(token);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  }

  async function handleDeleteUser(id, email) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    const res = await deleteUserAction(id);
    if (res.success) await refresh();
    else alert(res.error || 'Failed');
  }

  async function handleDeleteInvite(id) {
    await deleteInvitationAction(id);
    await refresh();
  }

  async function handleToggleRole(id, current) {
    const next = current === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role to ${next}?`)) return;
    await updateUserRoleAction(id, next);
    await refresh();
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invite new users, manage roles, and revoke access</p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite a user</CardTitle>
          <CardDescription>
            Creates a one-time invite link. Send it to the person you want to invite —
            they set their own password and get access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Expires (days)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={inviteDays}
                onChange={(e) => setInviteDays(e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          <Button onClick={handleCreateInvite} disabled={creating || !inviteEmail.trim()}>
            {creating ? <><Loader2 className="h-4 w-4 mr-2" /> Creating...</> : <><Plus className="h-4 w-4 mr-2" /> Create invitation</>}
          </Button>
          {createdLink && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-4 w-4" />
                <span className="font-semibold">Invite link created</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono text-foreground break-all">{createdLink}</code>
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(createdLink);
                      setCopiedId(createdLink);
                      setTimeout(() => setCopiedId(null), 2000);
                    } catch {}
                  }}
                  size="sm"
                  variant="outline"
                >
                  {copiedId === createdLink ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Send this link to the invitee. It works once and expires per the setting above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invitations ({invites.filter((i) => !i.acceptedAt).length} pending)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((i) => {
              const expired = i.expiresAt < Date.now();
              const accepted = !!i.acceptedAt;
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{i.email}</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{i.role}</span>
                      {accepted && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">accepted</span>
                      )}
                      {!accepted && expired && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">expired</span>
                      )}
                      {!accepted && !expired && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">pending</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Created {formatDate(i.createdAt)} · Expires {formatDate(i.expiresAt)}
                      {accepted && ` · Accepted ${formatDate(i.acceptedAt)}`}
                    </p>
                  </div>
                  {!accepted && !expired && (
                    <Button onClick={() => handleCopyLink(i.token)} variant="outline" size="sm">
                      {copiedId === i.token ? 'Copied!' : 'Copy link'}
                    </Button>
                  )}
                  <button onClick={() => handleDeleteInvite(i.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{u.email}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {u.role}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Joined {formatDate(u.createdAt)}
                </p>
              </div>
              <Button onClick={() => handleToggleRole(u.id, u.role)} variant="outline" size="sm">
                Make {u.role === 'admin' ? 'user' : 'admin'}
              </Button>
              <button onClick={() => handleDeleteUser(u.id, u.email)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
