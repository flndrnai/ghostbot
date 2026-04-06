'use client';

import { useState, useEffect } from 'react';
import { BUILTIN_PROVIDERS } from '../../../lib/llm-providers.js';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import {
  saveProviderConfig,
  saveApiKey,
  getApiKeyStatus,
  testLLMConnection,
  getSettings,
} from '../../../lib/admin/actions.js';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function LLMsPage() {
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setProvider(s.provider);
      setModel(s.model);
    });
  }, []);

  useEffect(() => {
    const providerDef = BUILTIN_PROVIDERS[provider];
    if (providerDef?.credentials?.length > 0) {
      getApiKeyStatus(providerDef.credentials[0].key).then((r) => setKeyConfigured(r.configured));
    }
  }, [provider]);

  const providerDef = BUILTIN_PROVIDERS[provider];
  const needsKey = providerDef?.credentials?.length > 0;

  async function handleSaveProvider() {
    setSaving(true);
    await saveProviderConfig(provider, model);
    setSaving(false);
  }

  async function handleSaveKey() {
    if (!apiKey.trim()) return;
    const keyName = providerDef.credentials[0].key;
    await saveApiKey(keyName, apiKey.trim());
    setApiKey('');
    setKeyConfigured(true);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testLLMConnection();
    setTestResult(result);
    setTesting(false);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">LLM Providers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure which AI model powers GhostBot</p>
      </div>

      {/* Provider + Model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setModel(''); setTestResult(null); }}
              className="flex h-12 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              {Object.entries(BUILTIN_PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>{p.name}</option>
              ))}
            </select>
          </div>

          {providerDef?.models?.length > 0 && (
            <div className="space-y-2">
              <Label>Model</Label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">Select a model</option>
                {providerDef.models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {provider === 'ollama' && (
            <div className="space-y-2">
              <Label>Model Name</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. qwen2.5:32b, llama3.2, mistral"
              />
              <p className="text-xs text-muted-foreground">Enter the exact model name from <code>ollama list</code></p>
            </div>
          )}

          <Button onClick={handleSaveProvider} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Apply'}
          </Button>
        </CardContent>
      </Card>

      {/* API Key */}
      {needsKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Key</CardTitle>
            <CardDescription>
              {keyConfigured ? (
                <span className="flex items-center gap-1 text-primary"><CheckCircle className="h-3.5 w-3.5" /> Key configured</span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> Not configured</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{providerDef.credentials[0].label}</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={keyConfigured ? '••••••••••••••••' : 'sk-...'}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleSaveKey} disabled={!apiKey.trim()}>Save Key</Button>
          </CardContent>
        </Card>
      )}

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTest} disabled={testing} variant="outline">
            {testing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Testing...</> : 'Test Connection'}
          </Button>
          {testResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${testResult.success ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
              {testResult.success ? `Connected! Response: "${testResult.response}"` : `Error: ${testResult.error}`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
