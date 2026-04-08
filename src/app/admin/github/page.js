'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import {
  saveGitHubConfig,
  testGitHubConnection,
  getGitHubConfigStatus,
  removeGitHubConfig,
  saveGitHubWebhookSecret,
  removeGitHubWebhookSecret,
  getGitHubWebhookSecretStatus,
  generateWebhookSecret,
} from '../../../lib/admin/actions.js';
import { CheckCircle, XCircle, Loader2, Github, RefreshCw } from '../../../lib/icons/index.jsx';

// Build the webhook URL from the current page origin so the docs are
// correct for any self-hosted instance, not just ghostbot.dev.
function getWebhookUrl() {
  if (typeof window === 'undefined') return 'https://<your-ghostbot-domain>/api/github/webhook';
  return `${window.location.origin}/api/github/webhook`;
}

export default function GitHubPage() {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [savedOwner, setSavedOwner] = useState('');
  const [savedRepo, setSavedRepo] = useState('');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Webhook secret state
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState(null);
  const [webhookCopied, setWebhookCopied] = useState(false);

  useEffect(() => {
    getGitHubConfigStatus()
      .then((s) => {
        setTokenConfigured(s.configured);
        setOwner(s.owner);
        setRepo(s.repo);
        setSavedOwner(s.owner);
        setSavedRepo(s.repo);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    getGitHubWebhookSecretStatus()
      .then((s) => setWebhookSecretConfigured(s.configured))
      .catch(() => {});
  }, []);

  async function handleGenerateSecret() {
    const r = await generateWebhookSecret();
    if (r?.secret) setWebhookSecret(r.secret);
  }

  async function handleSaveWebhookSecret() {
    if (!webhookSecret.trim()) return;
    setWebhookSaving(true);
    setWebhookMsg(null);
    const r = await saveGitHubWebhookSecret(webhookSecret);
    if (r.success) {
      setWebhookSecretConfigured(true);
      setWebhookMsg({ type: 'success', text: 'Webhook secret saved. Copy it now if you haven\u2019t added it to GitHub yet.' });
    } else {
      setWebhookMsg({ type: 'error', text: r.error || 'Failed to save' });
    }
    setWebhookSaving(false);
  }

  async function handleCopyWebhookSecret() {
    if (!webhookSecret) return;
    try {
      await navigator.clipboard.writeText(webhookSecret);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch {}
  }

  async function handleRemoveWebhookSecret() {
    await removeGitHubWebhookSecret();
    setWebhookSecretConfigured(false);
    setWebhookSecret('');
    setWebhookMsg(null);
  }

  const lockedIn = tokenConfigured && savedOwner && savedRepo && savedOwner === owner && savedRepo === repo;

  async function handleSave() {
    if (!token.trim() && !tokenConfigured) {
      setSaveError('Paste a GitHub Personal Access Token first.');
      return;
    }
    if (!owner.trim() || !repo.trim()) {
      setSaveError('Owner and Repository are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await saveGitHubConfig({ token, owner, repo });
      if (res.success) {
        if (token.trim()) setTokenConfigured(true);
        setSavedOwner(owner);
        setSavedRepo(repo);
        setToken('');
        // Auto-test after saving
        setTesting(true);
        const t = await testGitHubConnection();
        setTestResult(t);
        setTesting(false);
      } else {
        setSaveError(res.error || 'Failed to save');
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    await removeGitHubConfig();
    setTokenConfigured(false);
    setSavedOwner('');
    setSavedRepo('');
    setOwner('');
    setRepo('');
    setToken('');
    setTestResult(null);
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testGitHubConnection();
    setTestResult(result);
    setTesting(false);
  }

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">GitHub Integration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">GitHub Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect GhostBot to your GitHub repositories</p>
      </div>

      {lockedIn ? (
        /* Locked-in connected state */
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Connected</CardTitle>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Active
              </span>
            </div>
            <CardDescription>{savedOwner}/{savedRepo}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Token</div>
                <div className="text-sm font-mono text-foreground">github_pat_••••••••••</div>
              </div>
              <Button onClick={handleDisconnect} size="sm" variant="destructive" disabled={saving}>
                Disconnect
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleTest} disabled={testing} variant="outline" size="sm">
                {testing ? <><Loader2 className="h-4 w-4 mr-2" /> Testing...</> : 'Test Connection'}
              </Button>
            </div>
            {testResult && (
              <div className={`rounded-xl px-4 py-3 text-sm ${testResult.success ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
                {testResult.success
                  ? <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Connected as {testResult.login || 'GitHub'}</span>
                  : <span className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {testResult.error}</span>
                }
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  <CardTitle className="text-lg">Personal Access Token</CardTitle>
                </div>
                {tokenConfigured && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Saved
                  </span>
                )}
              </div>
              <CardDescription>
                Generate at <a className="text-primary underline" href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer">github.com/settings/tokens</a> (fine-grained, scopes: Contents, Pull requests, Issues, Workflows — all Read &amp; write)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>GitHub PAT</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={tokenConfigured ? 'Token saved — paste a new one to replace' : 'github_pat_...'}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Repository</CardTitle>
              <CardDescription>Used for agent jobs when no repo is specified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="flndrnai" />
                </div>
                <div className="space-y-2">
                  <Label>Repository</Label>
                  <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="ghostbot" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2" /> Saving...</> : 'Save & Test'}
                </Button>
              </div>
              {saveError && (
                <div className="rounded-xl px-4 py-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive">
                  <XCircle className="h-4 w-4 inline mr-2" />
                  {saveError}
                </div>
              )}
              {testResult && (
                <div className={`rounded-xl px-4 py-3 text-sm ${testResult.success ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
                  {testResult.success
                    ? <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Connected as {testResult.login || 'GitHub'}</span>
                    : <span className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {testResult.error}</span>
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Webhook Secret — always visible, separate from token card */}
      <Card id="webhook-secret-card" className={webhookSecretConfigured ? 'border-primary/30 scroll-mt-24' : 'scroll-mt-24'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Webhook Secret</CardTitle>
              <CardDescription>
                A random string GhostBot generates here, then you paste into GitHub's webhook
                Secret field. Used to verify each webhook actually came from GitHub (HMAC signature),
                so only GitHub can trigger <code className="bg-muted px-1 rounded">/ghostbot</code>
                {' '}PR comments. <strong className="text-destructive">This is NOT your GitHub
                Personal Access Token</strong> — those are two different things.
              </CardDescription>
            </div>
            {webhookSecretConfigured && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhookSecretConfigured && !webhookSecret ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Webhook secret</div>
                <div className="text-sm font-mono text-foreground">••••••••••••••••••••••••</div>
              </div>
              <Button onClick={handleRemoveWebhookSecret} size="sm" variant="destructive">
                Clear
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Secret</Label>
                  <Button onClick={handleGenerateSecret} variant="outline" size="sm">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Generate
                  </Button>
                </div>
                <Input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Click Generate or paste your own random string"
                />
                <p className="text-xs text-muted-foreground">
                  64 hex characters recommended. <strong>Copy this now</strong> — once saved you won&apos;t see it again.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveWebhookSecret} disabled={webhookSaving || !webhookSecret.trim()}>
                  {webhookSaving ? <><Loader2 className="h-4 w-4 mr-2" /> Saving...</> : 'Save secret'}
                </Button>
                {webhookSecret && (
                  <Button onClick={handleCopyWebhookSecret} variant="outline" size="sm">
                    {webhookCopied ? 'Copied!' : 'Copy'}
                  </Button>
                )}
              </div>
            </>
          )}
          {webhookMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm ${webhookMsg.type === 'success' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
              {webhookMsg.text}
            </div>
          )}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Step-by-step: register the webhook on GitHub</p>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1 text-foreground">
              <p className="text-[11px]"><strong>First — get the webhook secret value:</strong></p>
              <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
                <li>Stay on this admin page (you&apos;re already on it)</li>
                <li>
                  Scroll up to the <a href="#webhook-secret-card" className="text-primary underline">Webhook Secret card</a> at the top of this section
                </li>
                <li>Click <strong>Generate</strong> — a 64-character hex string fills the input</li>
                <li>Click <strong>Copy</strong> (do this BEFORE saving — once saved, the value is hidden)</li>
                <li>Click <strong>Save secret</strong> — the card flips to a green Active state</li>
              </ol>
              <p className="text-[11px] mt-1">You now have the secret value in your clipboard. Keep this tab open.</p>
            </div>

            <p className="pt-1 font-semibold text-foreground">Then — register the webhook on GitHub:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                Open{' '}
                {savedOwner && savedRepo ? (
                  <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`https://github.com/${savedOwner}/${savedRepo}/settings/hooks/new`}>
                    github.com/{savedOwner}/{savedRepo}/settings/hooks/new
                  </a>
                ) : (
                  <code className="bg-muted px-1 rounded">github.com/&lt;owner&gt;/&lt;repo&gt;/settings/hooks/new</code>
                )}
              </li>
              <li>
                <strong>Payload URL</strong>:{' '}
                <code className="bg-muted px-1 rounded">{getWebhookUrl()}</code>
                <br />
                <span className="text-[10px] opacity-70">This is your GhostBot instance — every self-hosted install has its own URL.</span>
              </li>
              <li>
                <strong>Content type</strong>: change the dropdown to <code className="bg-muted px-1 rounded">application/json</code>
                {' '}(NOT the default <code className="bg-muted px-1 rounded">application/x-www-form-urlencoded</code> — that will fail signature verification)
              </li>
              <li>
                <strong>Secret</strong>: paste the value you just copied from the Webhook Secret card above
                ({webhookSecretConfigured ? 'currently saved ✅' : 'NOT yet saved ⚠️ — go to the Webhook Secret card first'}).
                <br />
                <span className="text-[10px] text-destructive">⚠️ DO NOT paste your GitHub Personal Access Token here. The PAT and the webhook secret are TWO DIFFERENT VALUES. The PAT lives in the &quot;Personal Access Token&quot; card above; the webhook secret lives in the &quot;Webhook Secret&quot; card.</span>
              </li>
              <li>
                <strong>Which events would you like to trigger this webhook?</strong> — pick the third radio:
                <em> &quot;Let me select individual events.&quot;</em>
                <div className="mt-1.5 ml-2 rounded border border-border/40 bg-background/60 p-2 space-y-1">
                  <p className="text-[11px] text-foreground">A long checklist appears. Set it like this:</p>
                  <ul className="text-[11px] space-y-0.5 pl-2">
                    <li>❌ <strong>Pushes</strong> — uncheck (GitHub turns it on by default)</li>
                    <li>✅ <strong>Issue comments</strong> — the only box that should be checked</li>
                    <li>❌ <em>Everything else</em> — leave unchecked</li>
                  </ul>
                  <p className="text-[10px] text-muted-foreground italic">
                    Why only Issue comments: the <code className="bg-muted px-1 rounded">/ghostbot</code> trigger
                    fires when someone comments on a PR. Adding more events just sends GhostBot extra
                    payloads it ignores anyway, wasting bandwidth and rate-limit budget.
                  </p>
                </div>
              </li>
              <li>Make sure <strong>Active</strong> stays checked, then click the green <strong>Add webhook</strong> button.</li>
            </ol>
            <p className="pt-2 border-t border-border/40 text-[10px]">
              Once registered, comment <code className="bg-muted px-1 rounded">/ghostbot fix the typo in line 42</code> on any pull request and GhostBot will pick it up.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
