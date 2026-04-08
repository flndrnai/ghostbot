'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import {
  listUsersAction,
  createInvitationAction,
  listInvitationsAction,
  deleteInvitationAction,
  adminUpdateUserAction,
  adminResetUserPasswordAction,
  deleteUserActionStrict,
  updateUserRoleActionStrict,
} from '../../../lib/admin/user-actions.js';
import { getMyProfile } from '../../../lib/profile/actions.js';
import { CheckCircle, XCircle, Loader2, Plus, Trash2, RefreshCw, Pencil } from '../../../lib/icons/index.jsx';
import { formatDateTime as formatDate } from '../../../lib/date-format.js';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteDays, setInviteDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Confirmation + edit modals
  const [confirmModal, setConfirmModal] = useState(null); // { title, body, danger, confirmLabel, onConfirm }
  const [editModal, setEditModal] = useState(null);       // user being edited
  const [passwordModal, setPasswordModal] = useState(null); // { email, newPassword }

  const [busyId, setBusyId] = useState(null);
  const [globalMsg, setGlobalMsg] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [u, i, profile] = await Promise.all([
        listUsersAction(),
        listInvitationsAction(),
        getMyProfile(),
      ]);
      setUsers(u || []);
      setInvites(i || []);
      setMe(profile);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ─── Invitation handlers ───

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

  async function handleDeleteInvite(id) {
    await deleteInvitationAction(id);
    await refresh();
  }

  // ─── User row handlers ───

  function handleAskDeleteUser(u) {
    setConfirmModal({
      title: `Delete ${u.email}?`,
      body: `This permanently removes the account, all their chats, agent jobs, memory entries, and uploaded data. This cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete user',
      onConfirm: async () => {
        setBusyId(u.id);
        const res = await deleteUserActionStrict(u.id);
        setBusyId(null);
        setConfirmModal(null);
        if (res.success) {
          flashGlobal({ type: 'success', text: `${u.email} deleted` });
          await refresh();
        } else {
          flashGlobal({ type: 'error', text: res.error || 'Failed to delete' });
        }
      },
    });
  }

  function handleAskRoleChange(u) {
    const next = u.role === 'admin' ? 'user' : 'admin';
    setConfirmModal({
      title: `Change ${u.email}'s role to ${next}?`,
      body: next === 'admin'
        ? 'They will be able to manage users, edit settings, and access every admin page.'
        : 'They will lose admin access. Their chats and data are kept.',
      danger: false,
      confirmLabel: `Make ${next}`,
      onConfirm: async () => {
        setBusyId(u.id);
        const res = await updateUserRoleActionStrict(u.id, next);
        setBusyId(null);
        setConfirmModal(null);
        if (res.success) {
          flashGlobal({ type: 'success', text: `${u.email} is now ${next}` });
          await refresh();
        } else {
          flashGlobal({ type: 'error', text: res.error || 'Failed to update role' });
        }
      },
    });
  }

  function handleAskResetPassword(u) {
    setConfirmModal({
      title: `Reset password for ${u.email}?`,
      body: 'A new random password will be generated and shown to you exactly once. Their current password stops working immediately. Give them the new one any way you like.',
      danger: false,
      confirmLabel: 'Generate new password',
      onConfirm: async () => {
        setBusyId(u.id);
        const res = await adminResetUserPasswordAction(u.id);
        setBusyId(null);
        setConfirmModal(null);
        if (res.success) {
          setPasswordModal({ email: res.email, newPassword: res.newPassword });
        } else {
          flashGlobal({ type: 'error', text: res.error || 'Failed to reset password' });
        }
      },
    });
  }

  function handleAskEdit(u) {
    setEditModal({
      id: u.id,
      email: u.email,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      country: u.country || '',
      avatarDataUrl: u.avatarDataUrl || '',
    });
  }

  function flashGlobal(msg) {
    setGlobalMsg(msg);
    setTimeout(() => setGlobalMsg(null), 5000);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invite people, edit profiles, change roles, reset passwords, revoke access</p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {globalMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${globalMsg.type === 'success' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
          {globalMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {globalMsg.text}
        </div>
      )}

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
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
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
                  <div className="flex items-center gap-2">
                    {!accepted && !expired && (
                      <Button onClick={() => handleCopyLink(i.token)} variant="outline" size="sm">
                        {copiedId === i.token ? 'Copied!' : 'Copy link'}
                      </Button>
                    )}
                    <button onClick={() => handleDeleteInvite(i.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete invitation">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
          <CardDescription>Click the pencil to edit, or use the row actions on the right.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => {
            const isMe = me?.id === u.id;
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            const initial = (fullName || u.email || '?').charAt(0).toUpperCase();
            const busy = busyId === u.id;
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {u.avatarDataUrl ? (
                    <img src={u.avatarDataUrl} alt="" className="h-9 w-9 rounded-lg object-cover border border-border/40 flex-shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center border border-border/40 flex-shrink-0">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">{fullName || u.email}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {u.role}
                      </span>
                      {isMe && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">you</span>
                      )}
                    </div>
                    {fullName && (
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{u.email}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {u.country ? `${u.country} · ` : ''}Joined {formatDate(u.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAskEdit(u)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit user"
                    disabled={busy}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <Button
                    onClick={() => handleAskRoleChange(u)}
                    variant="outline"
                    size="sm"
                    disabled={busy || isMe}
                    title={isMe ? "You can't change your own role" : `Make ${u.role === 'admin' ? 'user' : 'admin'}`}
                  >
                    Make {u.role === 'admin' ? 'user' : 'admin'}
                  </Button>
                  <Button
                    onClick={() => handleAskResetPassword(u)}
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    title="Reset password"
                  >
                    Reset pw
                  </Button>
                  <button
                    onClick={() => handleAskDeleteUser(u)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={isMe ? "You can't delete yourself" : 'Delete user'}
                    disabled={busy || isMe}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── Confirmation modal ─── */}
      {confirmModal && (
        <Modal onClose={() => setConfirmModal(null)}>
          <h2 className="text-lg font-bold text-foreground">{confirmModal.title}</h2>
          <p className="mt-3 text-sm text-foreground/80">{confirmModal.body}</p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button onClick={() => setConfirmModal(null)} variant="outline" size="sm">Cancel</Button>
            <Button
              onClick={confirmModal.onConfirm}
              size="sm"
              className={confirmModal.danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              disabled={busyId !== null}
            >
              {busyId !== null ? <><Loader2 className="h-4 w-4 mr-2" /> Working...</> : confirmModal.confirmLabel}
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── Edit user modal ─── */}
      {editModal && (
        <EditUserModal
          user={editModal}
          onClose={() => setEditModal(null)}
          onSaved={async () => {
            setEditModal(null);
            flashGlobal({ type: 'success', text: 'User updated' });
            await refresh();
          }}
        />
      )}

      {/* ─── New password modal (one-time reveal) ─── */}
      {passwordModal && (
        <Modal onClose={() => setPasswordModal(null)}>
          <h2 className="text-lg font-bold text-foreground">New password for {passwordModal.email}</h2>
          <p className="mt-3 text-sm text-foreground/80">
            Their old password no longer works. Copy this value and give it to them — it will not be shown again.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <code className="flex-1 text-sm font-mono text-foreground break-all">{passwordModal.newPassword}</code>
            <Button
              onClick={async () => {
                try { await navigator.clipboard.writeText(passwordModal.newPassword); } catch {}
                flashGlobal({ type: 'success', text: 'Password copied' });
              }}
              size="sm"
              variant="outline"
            >
              Copy
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tell the user to log in with this password and then change it from their /profile page.
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button onClick={() => setPasswordModal(null)} size="sm">Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reusable centered modal ─── ──────────────────────────────

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Edit user modal ──────────────────────────────────────────

function EditUserModal({ user, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [country, setCountry] = useState(user.country || '');
  const [email, setEmail] = useState(user.email || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    const r = await adminUpdateUserAction(user.id, { firstName, lastName, country, email });
    setSaving(false);
    if (r.success) {
      onSaved?.();
    } else {
      setErr(r.error || 'Failed to save');
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-foreground">Edit user</h2>
      <p className="mt-1 text-xs text-muted-foreground">Changes here are made on behalf of the user.</p>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>First name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
          </div>
          <div className="space-y-1">
            <Label>Last name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
        </div>
        <div className="space-y-1">
          <Label>Email (sign-in)</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          <p className="text-[11px] text-muted-foreground">
            Changing this changes the user&apos;s sign-in email. They&apos;ll need the new value at their next login.
          </p>
        </div>
      </div>

      {err && (
        <div className="mt-3 rounded-xl px-4 py-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive">
          {err}
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button onClick={onClose} variant="outline" size="sm">Cancel</Button>
        <Button onClick={handleSave} size="sm" disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Saving...</> : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}
