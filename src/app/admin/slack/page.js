'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import {
  saveSlackConfig,
  removeSlackConfig,
  getSlackConfigStatus,
  testSlackConnection,
} from '../../../lib/admin/actions.js';
import { CheckCircle, XCircle, Loader2, MessageSquare } from '../../../lib/icons/index.jsx';

export default function SlackPage() {
  const [botToken, setBotToken] = useState('');
  const [channel, setChannel] = useState('');
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getSlackConfigStatus().then((s) => {
      setConfigured(s.configured);
      if (s.channel) setChannel(s.channel);
    }).catch(() => {});
  }, []);

  async function handleSave() {
    if (!botToken.trim() && !configured) {
      setResult({ type: 'error', message: 'Paste your Slack Bot Token first.' });
      return;
    }
    if (!channel.trim()) {
      setResult({ type: 'error', message: 'Channel is required.' });
      return;
    }
    setSaving(true);
    setResult(null);
    const res = await saveSlackConfig({
      botToken: botToken.trim(),
      channel: channel.trim(),
    });
    if (res.success) {
      setConfigured(true);
      setBotToken('');
      // Auto-test after save
      setTesting(true);
      const t = await testSlackConnection();
      setResult(t.success
        ? { type: 'success', message: `Connected to Slack team ${t.team}${t.posted ? ' and posted welcome message' : ''}` }
        : { type: 'error', message: t.error || 'Connection failed' },
      );
      setTesting(false);
    } else {
      setResult({ type: 'error', message: res.error || 'Failed to save' });
    }
    setSaving(false);
  }

  async function handleDisconnect() {
    await removeSlackConfig();
    setConfigured(false);
    setChannel('');
    setBotToken('');
    setResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setResult(null);
    const r = await testSlackConnection();
    setResult(r.success
      ? { type: 'success', message: `Connected to Slack team ${r.team}${r.posted ? ' and posted welcome message' : ''}` }
      : { type: 'error', message: r.error || 'Connection failed' },
    );
    setTesting(false);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Slack Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Receive agent-job notifications in a Slack channel</p>
      </div>

      <Card className={configured ? 'border-primary/30' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Bot Configuration</CardTitle>
            </div>
            {configured && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
          <CardDescription>
            Create a Slack app → add an OAuth Bot Token scope <code className="bg-muted px-1 rounded">chat:write</code> →
            install the app to your workspace → copy the <code className="bg-muted px-1 rounded">xoxb-</code> token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Channel</div>
                  <div className="text-sm font-mono text-foreground truncate">{channel || '(not set)'}</div>
                </div>
                <Button onClick={handleDisconnect} size="sm" variant="destructive">
                  Disconnect
                </Button>
              </div>
              <Button onClick={handleTest} disabled={testing} variant="outline" size="sm">
                {testing ? <><Loader2 className="h-4 w-4 mr-2" /> Testing...</> : 'Test & Send Welcome'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bot Token</Label>
                <Input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="xoxb-..."
                />
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Input
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="#ghostbot or C0123456789"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">#channel-name</code> (must invite the bot first) or the raw channel ID.
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving || !botToken.trim() || !channel.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Connecting...</> : 'Connect Slack'}
              </Button>
            </div>
          )}
          {result && (
            <div className={`rounded-xl px-4 py-3 text-sm ${result.type === 'success' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
              {result.type === 'success' ? <CheckCircle className="h-4 w-4 inline mr-2" /> : <XCircle className="h-4 w-4 inline mr-2" />}
              {result.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p><strong className="text-foreground">1.</strong> Go to <a className="text-primary underline" href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a> → <em>Create New App</em> → <em>From scratch</em></p>
          <p><strong className="text-foreground">2.</strong> App name: <code className="bg-muted px-1 rounded">GhostBot</code>, workspace: yours</p>
          <p><strong className="text-foreground">3.</strong> Sidebar → <em>OAuth & Permissions</em> → Scopes → Bot Token Scopes → add <code className="bg-muted px-1 rounded">chat:write</code></p>
          <p><strong className="text-foreground">4.</strong> Same page → <em>Install to Workspace</em> → copy the <em>Bot User OAuth Token</em> (starts with <code className="bg-muted px-1 rounded">xoxb-</code>)</p>
          <p><strong className="text-foreground">5.</strong> In Slack: create a channel (e.g. <code className="bg-muted px-1 rounded">#ghostbot</code>) and type <code className="bg-muted px-1 rounded">/invite @GhostBot</code> so the bot can post to it</p>
          <p><strong className="text-foreground">6.</strong> Paste the token and channel above → Connect Slack</p>
        </CardContent>
      </Card>
    </div>
  );
}
