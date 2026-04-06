'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { saveTelegramConfig, removeTelegramConfig, getTelegramConfigStatus } from '../../../lib/admin/actions.js';
import { CheckCircle, Loader2, MessageSquare, XCircle } from '../../../lib/icons/index.jsx';

export default function TelegramPage() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getTelegramConfigStatus().then((s) => {
      setConnected(s.configured);
      if (s.chatId) setChatId(s.chatId);
    }).catch(() => {});
  }, []);

  async function handleConnect() {
    if (!botToken.trim()) return;
    setSaving(true);
    setResult(null);

    const res = await saveTelegramConfig({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      webhookSecret: crypto.randomUUID(),
    });

    if (res.success) {
      setConnected(true);
      setBotToken('');
      setResult({ type: 'success', message: res.welcomeSent
        ? 'Connected! Welcome message sent to your bot.'
        : 'Connected! Configure webhook to start receiving messages.' });
    } else {
      setResult({ type: 'error', message: res.error || 'Failed to connect' });
    }
    setSaving(false);
  }

  async function handleDisconnect() {
    await removeTelegramConfig();
    setConnected(false);
    setResult(null);
  }

  async function handleRegister() {
    if (!webhookUrl) return;
    setRegistering(true);
    setResult(null);
    try {
      const res = await fetch('/api/telegram/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      setResult(data.success
        ? { type: 'success', message: 'Webhook registered! Your bot is now live.' }
        : { type: 'error', message: data.error || 'Registration failed' },
      );
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    }
    setRegistering(false);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Telegram Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chat with GhostBot through Telegram</p>
      </div>

      {/* Bot Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Bot Configuration</CardTitle>
            </div>
            {connected && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Connected
              </span>
            )}
          </div>
          <CardDescription>Create a bot via @BotFather on Telegram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            /* Connected state */
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="flex-1 text-sm text-muted-foreground">Bot token configured</span>
                <Button onClick={handleDisconnect} size="sm" variant="destructive">
                  Disconnect
                </Button>
              </div>
              {chatId && (
                <p className="text-xs text-muted-foreground">Chat ID: <code className="bg-muted px-1.5 py-0.5 rounded">{chatId}</code></p>
              )}
            </div>
          ) : (
            /* Not connected */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bot Token</Label>
                <Input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456:ABC-DEF..."
                />
              </div>
              <div className="space-y-2">
                <Label>Chat ID (optional)</Label>
                <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Your Telegram chat ID" />
                <p className="text-xs text-muted-foreground">Restricts the bot to only respond in this chat. Leave empty to allow all chats.</p>
              </div>
              <Button onClick={handleConnect} disabled={saving || !botToken.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Connecting...</> : 'Connect Bot'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Registration — only show when connected */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Webhook Registration</CardTitle>
            <CardDescription>Tell Telegram where to send messages. Required for your bot to receive messages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Public URL</Label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-domain.com" />
              <p className="text-xs text-muted-foreground">Must be HTTPS. The path <code className="bg-muted px-1 rounded">/api/telegram/webhook</code> is added automatically.</p>
            </div>
            <Button onClick={handleRegister} disabled={registering || !webhookUrl.trim()} variant="outline">
              {registering ? <><Loader2 className="h-4 w-4 mr-2" /> Registering...</> : 'Register Webhook'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result messages */}
      {result && (
        <div className={`rounded-xl px-4 py-3 text-sm ${result.type === 'success' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
          {result.type === 'success' ? <CheckCircle className="h-4 w-4 inline mr-2" /> : <XCircle className="h-4 w-4 inline mr-2" />}
          {result.message}
        </div>
      )}

      {/* Quick Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">1.</strong> Open Telegram and message <code className="bg-muted px-1.5 py-0.5 rounded">@BotFather</code></p>
          <p><strong className="text-foreground">2.</strong> Send <code className="bg-muted px-1.5 py-0.5 rounded">/newbot</code> and follow the prompts</p>
          <p><strong className="text-foreground">3.</strong> Copy the bot token and connect it above</p>
          <p><strong className="text-foreground">4.</strong> Set your public URL and register the webhook</p>
          <p><strong className="text-foreground">5.</strong> Send a message to your bot — GhostBot will respond!</p>
        </CardContent>
      </Card>
    </div>
  );
}
