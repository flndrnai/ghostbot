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
} from '../../../lib/admin/actions.js';
import { CheckCircle, XCircle, Loader2, Github } from '../../../lib/icons/index.jsx';

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
  }, []);

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
              <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
