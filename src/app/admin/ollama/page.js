'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import {
  saveOllamaUrl,
  testOllamaConnection,
  saveProviderConfig,
  getSettings,
} from '../../../lib/admin/actions.js';
import { CheckCircle, XCircle, Loader2, Cpu, HardDrive, Zap } from '../../../lib/icons/index.jsx';

function formatSize(bytes) {
  if (!bytes) return '—';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export default function OllamaPage() {
  const [url, setUrl] = useState('http://localhost:11434');
  const [models, setModels] = useState([]);
  const [connected, setConnected] = useState(null);
  const [testing, setTesting] = useState(false);
  const [activeModel, setActiveModel] = useState('');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    getSettings().then((s) => {
      setUrl(s.ollamaUrl);
      setActiveModel(s.model);
    });
  }, []);

  useEffect(() => {
    // Auto-test on page load
    handleTest();
  }, []);

  async function handleTest() {
    setTesting(true);
    const result = await testOllamaConnection(url);
    setConnected(result.success);
    if (result.success) {
      setModels(result.models);
    } else {
      setModels([]);
    }
    setTesting(false);
  }

  async function handleSaveUrl() {
    await saveOllamaUrl(url);
    handleTest();
  }

  async function handleSetActive(modelName) {
    setSaving(modelName);
    await saveProviderConfig('ollama', modelName);
    setActiveModel(modelName);
    setSaving(null);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ollama Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect to your self-hosted Ollama instance</p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Connection Status</CardTitle>
              <CardDescription className="mt-1">
                {testing ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing connection...</span>
                ) : connected === true ? (
                  <span className="flex items-center gap-2 text-primary"><CheckCircle className="h-3.5 w-3.5" /> Connected to Ollama</span>
                ) : connected === false ? (
                  <span className="flex items-center gap-2 text-destructive"><XCircle className="h-3.5 w-3.5" /> Cannot reach Ollama</span>
                ) : (
                  <span className="text-muted-foreground">Not tested yet</span>
                )}
              </CardDescription>
            </div>
            {connected === true && (
              <div className="flex h-3 w-3 rounded-full bg-primary animate-glow-pulse" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Server URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
            <p className="text-xs text-muted-foreground">
              For VPS: use your server IP (e.g., http://123.45.67.89:11434).
              For Docker: use http://host.docker.internal:11434
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveUrl} disabled={testing}>
              {testing ? 'Testing...' : 'Test & Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Models */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Models</CardTitle>
            <CardDescription>{models.length} model{models.length !== 1 ? 's' : ''} found</CardDescription>
          </CardHeader>
          <CardContent>
            {models.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No models installed.</p>
                <p className="text-xs mt-1">Run <code className="bg-muted px-1.5 py-0.5 rounded">ollama pull llama3.2</code> to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {models.map((m) => {
                  const isActive = activeModel === m.name;
                  return (
                    <div
                      key={m.name}
                      className={`flex items-center justify-between rounded-xl border px-5 py-4 transition-all ${
                        isActive ? 'border-primary/30 bg-primary/5' : 'border-border/60 hover:border-border'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{m.name}</span>
                          {isActive && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          {m.size && (
                            <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{formatSize(m.size)}</span>
                          )}
                          {m.parameterSize && (
                            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{m.parameterSize}</span>
                          )}
                          {m.quantization && (
                            <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{m.quantization}</span>
                          )}
                        </div>
                      </div>
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(m.name)}
                          disabled={saving === m.name}
                        >
                          {saving === m.name ? 'Setting...' : 'Set Active'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
          <CardDescription>Get Ollama running in minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">1. Install Ollama</p>
            <code className="block bg-muted rounded-lg px-4 py-2 text-xs">curl -fsSL https://ollama.com/install.sh | sh</code>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">2. Pull a model</p>
            <code className="block bg-muted rounded-lg px-4 py-2 text-xs">ollama pull qwen2.5:32b</code>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">3. Verify</p>
            <code className="block bg-muted rounded-lg px-4 py-2 text-xs">ollama list</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
