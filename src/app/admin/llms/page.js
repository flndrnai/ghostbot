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
  removeApiKey,
  getSettings,
} from '../../../lib/admin/actions.js';
import { CheckCircle, XCircle, Loader2 } from '../../../lib/icons/index.jsx';

export default function LLMsPage() {
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('');
  const [activeProvider, setActiveProvider] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setProvider(s.provider);
      setModel(s.model);
      if (s.provider && s.model) {
        setActiveProvider(s.provider);
        setActiveModel(s.model);
      }
    });
  }, []);

  const isLockedIn = activeProvider && activeModel && activeProvider === provider && activeModel === model;

  useEffect(() => {
    const providerDef = BUILTIN_PROVIDERS[provider];
    if (providerDef?.credentials?.length > 0) {
      getApiKeyStatus(providerDef.credentials[0].key).then((r) => setKeyConfigured(r.configured));
    } else {
      setKeyConfigured(false);
    }
    setTestResult(null);
  }, [provider]);

  const providerDef = BUILTIN_PROVIDERS[provider];
  const needsKey = providerDef?.credentials?.length > 0;

  async function handleSaveProvider() {
    if (!model) return;
    setSaving(true);
    await saveProviderConfig(provider, model);
    setActiveProvider(provider);
    setActiveModel(model);
    setSaving(false);
  }

  async function handleDisconnectProvider() {
    setSaving(true);
    await saveProviderConfig(provider, '');
    setActiveProvider(null);
    setActiveModel(null);
    setModel('');
    setSaving(false);
  }

  async function handleSaveKey() {
    if (!apiKey.trim()) return;
    setSaving(true);
    const keyName = providerDef.credentials[0].key;
    await saveApiKey(keyName, apiKey.trim());
    setApiKey('');
    setKeyConfigured(true);
    setSaving(false);

    // Auto-test after saving
    setTesting(true);
    const result = await testLLMConnection();
    setTestResult(result);
    setTesting(false);
  }

  async function handleDisconnect() {
    const keyName = providerDef.credentials[0].key;
    await removeApiKey(keyName);
    setKeyConfigured(false);
    setTestResult(null);
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
      <Card className={isLockedIn ? 'border-primary/30' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{isLockedIn ? 'Connected' : 'Active Provider'}</CardTitle>
            {isLockedIn && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
          {isLockedIn && (
            <CardDescription className="mt-1">
              {BUILTIN_PROVIDERS[activeProvider]?.name || activeProvider}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLockedIn ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Model</div>
                <div className="text-sm font-mono text-foreground truncate">{activeModel}</div>
              </div>
              <Button onClick={handleDisconnectProvider} size="sm" variant="destructive" disabled={saving}>
                Disconnect
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Provider</Label>
                <select
                  value={provider}
                  onChange={(e) => { setProvider(e.target.value); setModel(''); }}
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
                    placeholder="e.g. qwen2.5-coder:14b, qwen2.5:32b, llama3.2"
                  />
                  <p className="text-xs text-muted-foreground">Enter the exact model name from <code className="bg-muted px-1 rounded">ollama list</code></p>
                </div>
              )}

              <Button onClick={handleSaveProvider} disabled={saving || !model}>
                {saving ? 'Saving...' : 'Save & Apply'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* API Key — Connected / Not Connected states */}
      {needsKey && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{providerDef.credentials[0].label}</CardTitle>
              {keyConfigured && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Connected
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyConfigured ? (
              /* Connected state — like the example image */
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="flex-1 text-sm font-mono text-muted-foreground">••••••••••••••••</span>
                <Button onClick={handleDisconnect} size="sm" variant="destructive">
                  Disconnect
                </Button>
              </div>
            ) : (
              /* Not connected — show input */
              <div className="space-y-3">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <Button onClick={handleSaveKey} disabled={!apiKey.trim() || saving}>
                  {saving ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            )}
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
            {testing ? <><Loader2 className="h-4 w-4 mr-2" /> Testing...</> : 'Test Connection'}
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
