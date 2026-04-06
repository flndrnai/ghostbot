import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function init() {
  const cwd = process.cwd();
  console.log('');
  console.log('  👻 GhostBot — Project Initialization');
  console.log('');

  // Create directories
  const dirs = ['data/db', 'data/workspaces', 'data/clusters'];
  for (const dir of dirs) {
    const fullPath = path.join(cwd, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`  Created: ${dir}/`);
    }
  }

  // Create .env if not exists
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) {
    const secret = crypto.randomBytes(32).toString('base64');
    fs.writeFileSync(envPath, `AUTH_SECRET=${secret}\n`);
    console.log('  Created: .env (with generated AUTH_SECRET)');
  } else {
    console.log('  Exists:  .env');
  }

  // Create data config files
  const configFiles = [
    { path: 'data/triggers.json', content: '[]' },
    { path: 'data/crons.json', content: '[]' },
  ];

  for (const file of configFiles) {
    const fullPath = path.join(cwd, file.path);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, file.content);
      console.log(`  Created: ${file.path}`);
    }
  }

  console.log('');
  console.log('  ✓ Project initialized!');
  console.log('');
  console.log('  Next steps:');
  console.log('    1. npm run dev          — Start the dev server');
  console.log('    2. Open http://localhost:3000');
  console.log('    3. Create your admin account');
  console.log('    4. Go to Admin > Ollama to configure your LLM');
  console.log('');
}
