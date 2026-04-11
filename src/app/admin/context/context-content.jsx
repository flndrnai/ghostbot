'use client';

import { useState, useEffect } from 'react';

export default function ContextContent() {
  const [business, setBusiness] = useState('');
  const [voice, setVoice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // 'business' | 'voice' | null
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    loadContext();
  }, []);

  async function loadContext() {
    try {
      const res = await fetch('/api/context');
      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business || '');
        setVoice(data.voice || '');
      }
    } catch {}
    setLoading(false);
  }

  async function save(type) {
    setSaving(type);
    try {
      await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: type === 'business' ? business : voice,
        }),
      });
      setSaved(type);
      setTimeout(() => setSaved(null), 2000);
    } catch {}
    setSaving(null);
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Context</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Persistent context injected into every chat — helps GhostBot understand your business and communication style.
        </p>
      </div>

      {/* Business context */}
      <div className="bg-card rounded-xl border border-border/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">My Business</h2>
          <button
            onClick={() => save('business')}
            disabled={saving === 'business'}
            className="px-4 py-1.5 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving === 'business' ? 'Saving...' : saved === 'business' ? 'Saved!' : 'Save'}
          </button>
        </div>
        <textarea
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          rows={12}
          className="w-full bg-background border border-border/60 rounded-lg px-4 py-3 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Describe your business, projects, domain knowledge..."
        />
        <p className="text-xs text-muted-foreground">
          Injected into the system prompt of every chat. Max ~3000 chars used.
        </p>
      </div>

      {/* Voice context */}
      <div className="bg-card rounded-xl border border-border/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">My Voice</h2>
          <button
            onClick={() => save('voice')}
            disabled={saving === 'voice'}
            className="px-4 py-1.5 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving === 'voice' ? 'Saving...' : saved === 'voice' ? 'Saved!' : 'Save'}
          </button>
        </div>
        <textarea
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          rows={10}
          className="w-full bg-background border border-border/60 rounded-lg px-4 py-3 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Describe your communication style, tone, vocabulary..."
        />
        <p className="text-xs text-muted-foreground">
          Teaches GhostBot to match your communication style. Max ~2000 chars used.
        </p>
      </div>
    </div>
  );
}
