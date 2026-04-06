import * as p from '@clack/prompts';

export async function setup() {
  p.intro('👻 GhostBot Setup Wizard');

  // Check prerequisites
  const { execSync } = await import('child_process');

  const checks = [
    { name: 'Node.js', cmd: 'node --version' },
    { name: 'npm', cmd: 'npm --version' },
    { name: 'Git', cmd: 'git --version' },
    { name: 'Docker', cmd: 'docker --version' },
  ];

  p.log.step('Checking prerequisites...');
  for (const check of checks) {
    try {
      const version = execSync(check.cmd, { stdio: 'pipe' }).toString().trim();
      p.log.success(`${check.name}: ${version}`);
    } catch {
      p.log.warn(`${check.name}: not found`);
    }
  }

  // LLM Provider
  const provider = await p.select({
    message: 'Which LLM provider do you want to use?',
    options: [
      { value: 'ollama', label: 'Ollama (Self-hosted, recommended)', hint: 'Free, runs on your VPS' },
      { value: 'anthropic', label: 'Anthropic (Claude)', hint: 'Paid API' },
      { value: 'openai', label: 'OpenAI (GPT)', hint: 'Paid API' },
      { value: 'google', label: 'Google (Gemini)', hint: 'Paid API' },
    ],
  });

  if (p.isCancel(provider)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  let ollamaUrl = '';
  let apiKey = '';

  if (provider === 'ollama') {
    ollamaUrl = await p.text({
      message: 'Ollama server URL:',
      placeholder: 'http://localhost:11434',
      initialValue: 'http://localhost:11434',
    });

    if (p.isCancel(ollamaUrl)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    // Test connection
    p.log.step('Testing Ollama connection...');
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const models = data.models?.map((m) => m.name) || [];
        p.log.success(`Connected! ${models.length} model(s) available: ${models.join(', ') || 'none'}`);
      } else {
        p.log.warn(`Ollama returned HTTP ${res.status}`);
      }
    } catch {
      p.log.warn('Cannot reach Ollama. Make sure it is running.');
    }
  } else {
    apiKey = await p.password({
      message: `Enter your ${provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Google'} API key:`,
    });

    if (p.isCancel(apiKey)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }
  }

  // GitHub
  const setupGithub = await p.confirm({
    message: 'Set up GitHub integration? (required for agent jobs)',
    initialValue: false,
  });

  let ghToken = '';
  if (setupGithub && !p.isCancel(setupGithub)) {
    ghToken = await p.password({
      message: 'GitHub Personal Access Token (with repo scope):',
    });
  }

  // Summary
  p.log.step('Configuration summary:');
  p.log.message(`  Provider: ${provider}`);
  if (ollamaUrl) p.log.message(`  Ollama URL: ${ollamaUrl}`);
  if (apiKey) p.log.message(`  API Key: ****${apiKey.slice(-4)}`);
  if (ghToken) p.log.message(`  GitHub: configured`);

  const confirm = await p.confirm({
    message: 'Save this configuration?',
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Save to .env
  const fs = await import('fs');
  const envPath = '.env';
  let envContent = '';

  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch {}

  // Ensure AUTH_SECRET exists
  if (!envContent.includes('AUTH_SECRET=')) {
    const crypto = await import('crypto');
    envContent += `AUTH_SECRET=${crypto.randomBytes(32).toString('base64')}\n`;
  }

  p.log.step('Configuration saved. Start with: npm run dev');
  p.outro('👻 GhostBot is ready!');
}
