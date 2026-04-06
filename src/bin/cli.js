#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();

program
  .name('ghostbot')
  .description('GhostBot — Autonomous AI Coding Agent Platform')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize a new GhostBot project')
  .action(async () => {
    const { init } = await import('./commands/init.js');
    await init();
  });

program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    const { setup } = await import('./commands/setup.js');
    await setup();
  });

program
  .command('dev')
  .description('Start development server')
  .action(async () => {
    const { execSync } = await import('child_process');
    console.log('Starting GhostBot dev server...');
    execSync('npx next dev', { stdio: 'inherit', cwd: process.cwd() });
  });

program
  .command('build')
  .description('Build for production')
  .action(async () => {
    const { execSync } = await import('child_process');
    console.log('Building GhostBot...');
    execSync('npx next build', { stdio: 'inherit', cwd: process.cwd() });
  });

program
  .command('docker:build')
  .description('Build Docker images for all coding agents')
  .action(async () => {
    const { execSync } = await import('child_process');
    const scriptPath = join(__dirname, '..', '..', 'docker', 'build.sh');
    console.log('Building Docker images...');
    execSync(`bash ${scriptPath}`, { stdio: 'inherit' });
  });

program.parse();
