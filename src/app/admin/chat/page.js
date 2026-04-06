'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { saveChatSettings, getSettings } from '../../../lib/admin/actions.js';
import { CheckCircle } from '../../../lib/icons/index.jsx';

export default function ChatSettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [temperature, setTemperature] = useState('0.7');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSystemPrompt(s.systemPrompt);
      setMaxTokens(s.maxTokens);
      setTemperature(s.temperature);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await saveChatSettings({
      systemPrompt,
      maxTokens: parseInt(maxTokens, 10),
      temperature: parseFloat(temperature),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chat Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure how GhostBot responds</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Prompt</CardTitle>
          <CardDescription>Instructions that guide GhostBot's behavior in every conversation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/40 transition-all duration-200"
            placeholder="You are GhostBot, a helpful AI coding assistant..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generation Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              min={256}
              max={32768}
            />
            <p className="text-xs text-muted-foreground">Maximum length of generated responses (256-32768)</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm font-mono text-muted-foreground">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-primary animate-fade-in">
            <CheckCircle className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
