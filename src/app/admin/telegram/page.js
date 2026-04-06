'use client';

import { useState } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { saveTelegramConfig, getTelegramStatus } from '../../../lib/admin/actions.js';
import { Eye, EyeOff, CheckCircle, Loader2, MessageSquare } from '../../../lib/icons/index.jsx';

export default function TelegramPage() {
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [chatId, setChatId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSave() {
    setSaving(true);
    await saveTelegramConfig({ botToken, chatId, webhookSecret: crypto.randomUUID() });
    setSaving(false);
    setBotToken('');
    setResult({ type: 'success', message: 'Configuration saved' });
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
        ? { type: 'success', message: 'Webhook registered successfully' }
        : { type: 'error', message: data.error || 'Registration failed' }
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Bot Configuration</CardTitle>
          </div>
          <CardDescription>Create a bot via @BotFather on Telegram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Chat ID (optional)</Label>
            <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Your Telegram chat ID" />
            <p className="text-xs text-muted-foreground">Restricts the bot to only respond in this chat. Leave empty to allow all chats.</p>
          </div>
          <Button onClick={handleSave} disabled={saving || !botToken.trim()}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhook Registration</CardTitle>
          <CardDescription>Register your GhostBot URL with Telegram</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Public URL</Label>
            <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-domain.com" />
            <p className="text-xs text-muted-foreground">Must be HTTPS. The webhook path /api/telegram/webhook is added automatically.</p>
          </div>
          <Button onClick={handleRegister} disabled={registering || !webhookUrl.trim()} variant="outline">
            {registering ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Registering...</> : 'Register Webhook'}
          </Button>
          {result && (
            <div className={`rounded-xl px-4 py-3 text-sm ${result.type === 'success' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
              {result.type === 'success' && <CheckCircle className="h-4 w-4 inline mr-2" />}
              {result.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">1.</strong> Open Telegram and message @BotFather</p>
          <p><strong className="text-foreground">2.</strong> Send <code className="bg-muted px-1.5 py-0.5 rounded">/newbot</code> and follow the prompts</p>
          <p><strong className="text-foreground">3.</strong> Copy the bot token and paste it above</p>
          <p><strong className="text-foreground">4.</strong> Set your public URL and register the webhook</p>
          <p><strong className="text-foreground">5.</strong> Send a message to your bot — GhostBot will respond!</p>
        </CardContent>
      </Card>
    </div>
  );
}
