'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../lib/auth/components/ui/button.jsx';
import { Input } from '../../lib/auth/components/ui/input.jsx';
import { Label } from '../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../lib/auth/components/ui/card.jsx';
import { CheckCircle, XCircle, Loader2, Pencil } from '../../lib/icons/index.jsx';
import { MobilePageHeader } from '../../lib/chat/components/mobile-page-header.jsx';
import { useChatNav } from '../../lib/chat/components/chat-nav-context.jsx';
import { getMyProfile, saveMyProfile } from '../../lib/profile/actions.js';
import { formatDate } from '../../lib/date-format.js';

const MAX_AVATAR_BYTES = 256 * 1024;
const ACCEPTED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Resize a still image to a square data URL preserving the
// source format when it makes sense:
//   GIF                      -> kept as-is, no resize (preserves animation)
//   PNG, WEBP                -> re-encoded as PNG (preserves transparency)
//   JPEG / JPG / unknown     -> re-encoded as JPEG quality 0.85
//
// Square crop is centered. Output edge length defaults to 320 px.
async function fileToAvatarDataUrl(file, target = 320) {
  const mime = (file.type || '').toLowerCase();

  // GIFs: animation can't survive a canvas re-encode, so we keep
  // the original bytes if they fit the size budget.
  if (mime === 'image/gif') {
    if (file.size > MAX_AVATAR_BYTES) {
      throw new Error(`GIF is ${Math.round(file.size / 1024)} KB, max ${Math.round(MAX_AVATAR_BYTES / 1024)} KB`);
    }
    return await readFileAsDataUrl(file);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  // Square center crop
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);

  // PNG and WEBP keep transparency by encoding as PNG.
  // Everything else becomes JPEG to keep file size in check.
  const wantsAlpha = mime === 'image/png' || mime === 'image/webp';
  if (wantsAlpha) return canvas.toDataURL('image/png');
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function ProfileContent() {
  // `profile` is the only source of truth for what's persisted on the
  // server. Locked rows ALWAYS read from `profile.*`. Editor inputs
  // copy from `profile.*` into local draft state when they open and
  // write back via a re-fetch when the save round-trips. This means
  // nothing the editor does (typing, cancelling, partial saves) can
  // ever clear the locked view.
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Editor draft state — only used while a card is in edit mode.
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName] = useState('');
  const [draftCountry, setDraftCountry] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftAvatarDataUrl, setDraftAvatarDataUrl] = useState('');

  // Email-change confirmation modal
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);

  // Per-card edit mode toggles. Cards open locked; pencil flips to edit.
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);

  const fileInputRef = useRef(null);
  const { registerProfileHandler } = useChatNav();

  const reload = useCallback(async () => {
    try {
      const p = await getMyProfile();
      if (p) setProfile(p);
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Live refresh when ANY device (including this one) updates the profile.
  useEffect(() => {
    if (!registerProfileHandler) return;
    return registerProfileHandler(() => { reload(); });
  }, [registerProfileHandler, reload]);

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const mime = (file.type || '').toLowerCase();
    if (!ACCEPTED_MIMES.has(mime)) {
      setMsg({ type: 'error', text: 'Allowed formats: JPEG, JPG, PNG, WEBP, GIF.' });
      e.target.value = '';
      return;
    }
    try {
      const next = await fileToAvatarDataUrl(file, 320);
      const approxBytes = Math.ceil((next.length * 3) / 4);
      if (approxBytes > MAX_AVATAR_BYTES) {
        setMsg({
          type: 'error',
          text: `Avatar still too large after resize (~${Math.round(approxBytes / 1024)} KB). Pick a smaller image.`,
        });
        return;
      }
      setDraftAvatarDataUrl(next);
    } catch (err) {
      setMsg({ type: 'error', text: err?.message || 'Failed to read image' });
    } finally {
      e.target.value = '';
    }
  }

  function handleClearAvatar() {
    setDraftAvatarDataUrl('');
  }

  function openIdentityEditor() {
    setDraftFirstName(profile?.firstName || '');
    setDraftLastName(profile?.lastName || '');
    setDraftCountry(profile?.country || '');
    setDraftEmail(profile?.email || '');
    setEditingIdentity(true);
    setMsg(null);
  }

  function cancelIdentity() {
    setEditingIdentity(false);
    setMsg(null);
  }

  // Compute whether the user is allowed to change their own email.
  const canChangeEmail = !!profile && profile.role === 'admin';

  function openAvatarEditor() {
    setDraftAvatarDataUrl(profile?.avatarDataUrl || '');
    setEditingAvatar(true);
    setMsg(null);
  }

  function cancelAvatar() {
    setEditingAvatar(false);
    setMsg(null);
  }

  // Trigger save. If the email field changed AND the user is
  // allowed to change it, gate the save behind a confirmation
  // modal first. The modal then calls actuallySaveIdentity().
  function handleSaveIdentity() {
    const emailChanged = canChangeEmail && draftEmail.trim().toLowerCase() !== (profile?.email || '').toLowerCase();
    if (emailChanged) {
      setEmailConfirmOpen(true);
      return;
    }
    actuallySaveIdentity();
  }

  async function actuallySaveIdentity() {
    setEmailConfirmOpen(false);
    setSaving(true);
    setMsg(null);
    const payload = {
      firstName: draftFirstName,
      lastName: draftLastName,
      country: draftCountry,
    };
    if (canChangeEmail) payload.email = draftEmail;
    const r = await saveMyProfile(payload);
    if (r.success) {
      setMsg({ type: 'success', text: 'Identity saved' });
      setProfile((p) => ({
        ...p,
        firstName: draftFirstName,
        lastName: draftLastName,
        country: draftCountry,
        ...(canChangeEmail ? { email: draftEmail.trim().toLowerCase() } : {}),
      }));
      setEditingIdentity(false);
    } else {
      setMsg({ type: 'error', text: r.error || 'Failed to save' });
    }
    setSaving(false);
  }

  async function handleSaveAvatar() {
    setSaving(true);
    setMsg(null);
    const r = await saveMyProfile({ avatarDataUrl: draftAvatarDataUrl });
    if (r.success) {
      setMsg({ type: 'success', text: 'Avatar saved' });
      setProfile((p) => ({ ...p, avatarDataUrl: draftAvatarDataUrl }));
      setEditingAvatar(false);
    } else {
      setMsg({ type: 'error', text: r.error || 'Failed to save' });
    }
    setSaving(false);
  }

  const initial = (profile?.email || 'U').charAt(0).toUpperCase();
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const persistedAvatar = profile?.avatarDataUrl || '';

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-1px)] overflow-y-auto">
      <MobilePageHeader title="Profile" />
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account details</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 mx-auto mb-3" />
              Loading profile...
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ─── Avatar card ─── */}
            <Card className={editingAvatar ? '' : 'border-primary/30'}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{editingAvatar ? 'Edit avatar' : 'Avatar'}</CardTitle>
                    <CardDescription>
                      {editingAvatar
                        ? `JPEG, JPG, PNG, WEBP or GIF. Max ${Math.round(MAX_AVATAR_BYTES / 1024)} KB. Center-cropped to a square.`
                        : 'Your profile picture'}
                    </CardDescription>
                  </div>
                  {!editingAvatar && (
                    <button
                      type="button"
                      onClick={openAvatarEditor}
                      className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-foreground/70 hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                      aria-label="Edit avatar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!editingAvatar ? (
                  // ── Locked view (always reads from persisted profile) ──
                  <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    {persistedAvatar ? (
                      <img
                        src={persistedAvatar}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover border border-border/60 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/15 text-primary text-base font-semibold flex items-center justify-center border border-border/60 flex-shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avatar</div>
                      <div className="text-sm text-foreground">
                        {persistedAvatar ? 'Custom image' : 'Default initial tile'}
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                ) : (
                  // ── Edit view (uses draftAvatarDataUrl) ──
                  <>
                    <div className="flex items-center gap-5">
                      {draftAvatarDataUrl ? (
                        <img
                          src={draftAvatarDataUrl}
                          alt="Avatar preview"
                          className="h-24 w-24 rounded-full object-cover border border-border/60"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-primary/15 text-primary text-2xl font-semibold flex items-center justify-center border border-border/60">
                          {initial}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={handleAvatarFile}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                          Upload image
                        </Button>
                        {draftAvatarDataUrl && (
                          <Button onClick={handleClearAvatar} variant="outline" size="sm">
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button onClick={handleSaveAvatar} disabled={saving} size="sm">
                        {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Saving...</> : 'Save avatar'}
                      </Button>
                      <Button onClick={cancelAvatar} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ─── Identity card ─── */}
            <Card className={editingIdentity ? '' : 'border-primary/30'}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{editingIdentity ? 'Edit identity' : 'Identity'}</CardTitle>
                    <CardDescription>How GhostBot addresses you</CardDescription>
                  </div>
                  {!editingIdentity && (
                    <button
                      type="button"
                      onClick={openIdentityEditor}
                      className="group inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-foreground/70 hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                      aria-label="Edit identity"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!editingIdentity ? (
                  // ── Locked view (always reads from persisted profile) ──
                  <div className="space-y-2">
                    <LockedRow label="First name" value={profile?.firstName || ''} />
                    <LockedRow label="Last name" value={profile?.lastName || ''} />
                    <LockedRow label="Country" value={profile?.country || ''} />
                    <LockedRow label="Email" value={profile?.email || '—'} mono />
                  </div>
                ) : (
                  // ── Edit view (uses draft state) ──
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First name</Label>
                        <Input
                          value={draftFirstName}
                          onChange={(e) => setDraftFirstName(e.target.value)}
                          placeholder="Your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last name</Label>
                        <Input
                          value={draftLastName}
                          onChange={(e) => setDraftLastName(e.target.value)}
                          placeholder="Your last name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={draftCountry}
                        onChange={(e) => setDraftCountry(e.target.value)}
                        placeholder="Your country"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      {canChangeEmail ? (
                        <>
                          <Input
                            type="email"
                            value={draftEmail}
                            onChange={(e) => setDraftEmail(e.target.value)}
                            placeholder="you@example.com"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Changing this changes the email you sign in with. You&apos;ll be asked to confirm before it&apos;s saved.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
                            <span className="text-sm font-mono text-foreground/90 truncate">{profile?.email || '—'}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex-shrink-0">read-only</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">The email you signed up with. Contact an admin to change it.</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button onClick={handleSaveIdentity} disabled={saving} size="sm">
                        {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Saving...</> : 'Save identity'}
                      </Button>
                      <Button onClick={cancelIdentity} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Account summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
                <CardDescription>
                  {profile?.role === 'admin'
                    ? 'Admin account — you can manage users and settings.'
                    : 'Standard user account — contact an admin for changes you can\u2019t make here.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Display name</span>
                  <span className="text-foreground font-medium truncate">{fullName || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground font-mono text-xs truncate">{profile?.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Role</span>
                  <span className="text-foreground capitalize">{profile?.role || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Signed up</span>
                  <span className="text-foreground">{profile?.createdAt ? formatDate(profile.createdAt) : '—'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Inline status message — appears under whichever card just saved */}
            {msg && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
                {msg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {msg.text}
              </div>
            )}
          </>
        )}
      </div>

      {/* Email-change confirmation modal */}
      {emailConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={() => setEmailConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">Change sign-in email?</h2>
            <p className="mt-3 text-sm text-foreground/80">
              You&apos;re about to change your sign-in email from{' '}
              <span className="font-mono text-foreground">{profile?.email}</span> to{' '}
              <span className="font-mono text-primary">{draftEmail.trim().toLowerCase()}</span>.
            </p>
            <p className="mt-3 text-sm text-foreground/80">
              The next time you log out, you&apos;ll need this new email to sign back in. Make sure
              you have it written down somewhere safe.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button onClick={() => setEmailConfirmOpen(false)} variant="outline" size="sm">
                Cancel
              </Button>
              <Button onClick={actuallySaveIdentity} disabled={saving} size="sm">
                {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Saving...</> : 'Yes, change my email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LockedRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-sm text-foreground truncate ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-muted-foreground italic">not set</span>}
        </div>
      </div>
    </div>
  );
}
