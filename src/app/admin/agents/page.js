'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../lib/auth/components/ui/button.jsx';
import { Input } from '../../../lib/auth/components/ui/input.jsx';
import { Label } from '../../../lib/auth/components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../lib/auth/components/ui/card.jsx';
import { getSettings } from '../../../lib/admin/actions.js';
import { Eye, EyeOff, Bot } from 'lucide-react';

const AGENTS = [
  { id: 'claude-code', name: 'Claude Code', auth: ['oauth', 'api-key'], defaultAuth: 'api-key' },
  { id: 'pi-coding-agent', name: 'Pi', auth: ['api-key'], defaultAuth: 'api-key' },
  { id: 'gemini-cli', name: 'Gemini CLI', auth: ['api-key'], defaultAuth: 'api-key' },
  { id: 'codex-cli', name: 'Codex CLI', auth: ['oauth', 'api-key'], defaultAuth: 'api-key' },
  { id: 'opencode', name: 'OpenCode', auth: ['api-key'], defaultAuth: 'api-key' },
  { id: 'kimi-cli', name: 'Kimi CLI', auth: ['api-key'], defaultAuth: 'api-key' },
];

export default function AgentsPage() {
  const [defaultAgent, setDefaultAgent] = useState('claude-code');

  useEffect(() => {
    getSettings().then((s) => {
      // The CODING_AGENT config isn't in getSettings yet but we can extend later
    });
  }, []);

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Coding Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure which coding agents are available</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Agent</CardTitle>
          <CardDescription>The coding agent used for new sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={defaultAgent}
            onChange={(e) => setDefaultAgent(e.target.value)}
            className="flex h-12 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <Card key={agent.id} className={defaultAgent === agent.id ? 'border-primary/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{agent.name}</CardTitle>
              </div>
              {defaultAgent === agent.id && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                  Default
                </span>
              )}
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <p>Auth: {agent.auth.join(', ')}</p>
              <p className="mt-1">ID: <code className="bg-muted px-1 rounded">{agent.id}</code></p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
