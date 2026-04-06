'use client';

import { useState } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { saveGitHubConfig, testGitHubConnection } from '../../../lib/admin/actions.js';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Github } from 'lucide-react';

export default function GitHubPage() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await saveGitHubConfig({ token, owner, repo });
    setSaving(false);
    setToken('');
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testGitHubConnection();
    setTestResult(result);
    setTesting(false);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">GitHub Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect GhostBot to your GitHub repositories</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle className="text-lg">Personal Access Token</CardTitle>
          </div>
          <CardDescription>Required for creating branches, commits, and PRs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>GitHub PAT</Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
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
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="username" />
            </div>
            <div className="space-y-2">
              <Label>Repository</Label>
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="my-project" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Testing...</> : 'Test Connection'}
            </Button>
          </div>
          {testResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${testResult.success ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-destructive/10 border border-destructive/20 text-destructive'}`}>
              {testResult.success
                ? <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Connected as {testResult.login}</span>
                : <span className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {testResult.error}</span>
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
