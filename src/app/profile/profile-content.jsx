'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '../../lib/auth/components/ui/button.jsx';
import { Input } from '../../lib/auth/components/ui/input.jsx';
import { Label } from '../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../lib/auth/components/ui/card.jsx';
import { CheckCircle, XCircle, Loader2 } from '../../lib/icons/index.jsx';
import { MobilePageHeader } from '../../lib/chat/components/mobile-page-header.jsx';
import { getMyProfile, saveMyProfile } from '../../lib/profile/actions.js';
import { formatDate } from '../../lib/date-format.js';

const MAX_AVATAR_BYTES = 256 * 1024;

// Resize a File to a square JPEG data URL no larger than `target` px on each side.
async function fileToAvatarDataUrl(file, target = 320) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
  // Square crop, centered
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function ProfileContent() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        if (!p) return;
        setProfile(p);
        setFirstName(p.firstName || '');
        setLastName(p.lastName || '');
        setCountry(p.country || '');
        setAvatarDataUrl(p.avatarDataUrl || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'Please pick an image file.' });
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
      setAvatarDataUrl(next);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to read image' });
    } finally {
      e.target.value = '';
    }
  }

  function handleClearAvatar() {
    setAvatarDataUrl('');
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const r = await saveMyProfile({ firstName, lastName, country, avatarDataUrl });
    if (r.success) {
      setMsg({ type: 'success', text: 'Profile saved' });
      setProfile((p) => ({ ...p, firstName, lastName, country, avatarDataUrl }));
    } else {
      setMsg({ type: 'error', text: r.error || 'Failed to save' });
    }
    setSaving(false);
  }

  const initial = (profile?.email || 'U').charAt(0).toUpperCase();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

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
            {/* Avatar card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avatar</CardTitle>
                <CardDescription>Square JPEG, max {Math.round(MAX_AVATAR_BYTES / 1024)} KB. Will be center-cropped.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {avatarDataUrl ? (
                      <img
                        src={avatarDataUrl}
                        alt="Avatar preview"
                        className="h-24 w-24 rounded-full object-cover border border-border/60"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-primary/15 text-primary text-2xl font-semibold flex items-center justify-center border border-border/60">
                        {initial}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFile}
                    />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                      Upload image
                    </Button>
                    {avatarDataUrl && (
                      <Button onClick={handleClearAvatar} variant="outline" size="sm">
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identity</CardTitle>
                <CardDescription>How GhostBot addresses you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Flandrien"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Vancutsem"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Belgium"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Read-only account info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
                <CardDescription>Read-only — managed by the admin</CardDescription>
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

            {/* Save bar */}
            <div className="flex items-center gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm py-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Saving...</> : 'Save changes'}
              </Button>
              {msg && (
                <span className={`text-xs flex items-center gap-1.5 ${msg.type === 'success' ? 'text-primary' : 'text-destructive'}`}>
                  {msg.type === 'success' ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {msg.text}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
