// Business Context — AIOS-style persistent context files
//
// Two files:
//   data/context/my-business.md  — who the user is, what they build, domain knowledge
//   data/context/my-voice.md     — communication style, tone, vocabulary
//
// Both are injected into the system prompt after guardrails,
// before persistent memory.

import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../paths.js';

const CONTEXT_DIR = path.join(PROJECT_ROOT, 'data', 'context');

const BUSINESS_TEMPLATE = `# My Business

> Tell GhostBot about your business, projects, and domain so it can give contextual advice.

## Who I Am
- (your role, company, expertise)

## What I Build
- (products, services, tech stack)

## Domain Knowledge
- (industry-specific terms, conventions, constraints)

## Current Priorities
- (what you're focused on right now)
`;

const VOICE_TEMPLATE = `# My Voice

> Teach GhostBot your communication style so responses match your tone.

## Tone
- (professional, casual, technical, friendly)

## Vocabulary
- (terms you prefer, terms to avoid)

## Writing Style
- (short vs detailed, bullet points vs prose, emoji usage)

## Examples
- (paste examples of your preferred communication style)
`;

function ensureDir() {
  if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
  }
}

// ─── Business Context ──────────────────────────────────────

export function getBusinessContext() {
  const filePath = path.join(CONTEXT_DIR, 'my-business.md');
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {}
  return null;
}

export function getOrCreateBusinessContext() {
  const existing = getBusinessContext();
  if (existing) return existing;
  ensureDir();
  fs.writeFileSync(path.join(CONTEXT_DIR, 'my-business.md'), BUSINESS_TEMPLATE, 'utf-8');
  return BUSINESS_TEMPLATE;
}

export function updateBusinessContext(content) {
  ensureDir();
  fs.writeFileSync(path.join(CONTEXT_DIR, 'my-business.md'), content, 'utf-8');
}

// ─── Voice Context ─────────────────────────────────────────

export function getVoiceContext() {
  const filePath = path.join(CONTEXT_DIR, 'my-voice.md');
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {}
  return null;
}

export function getOrCreateVoiceContext() {
  const existing = getVoiceContext();
  if (existing) return existing;
  ensureDir();
  fs.writeFileSync(path.join(CONTEXT_DIR, 'my-voice.md'), VOICE_TEMPLATE, 'utf-8');
  return VOICE_TEMPLATE;
}

export function updateVoiceContext(content) {
  ensureDir();
  fs.writeFileSync(path.join(CONTEXT_DIR, 'my-voice.md'), content, 'utf-8');
}

// ─── Combined context for system prompt injection ──────────

export function getFullContext() {
  const business = getBusinessContext();
  const voice = getVoiceContext();

  if (!business && !voice) return '';

  let context = '';
  if (business) {
    context += 'Business context:\n' + business.slice(0, 3000);
  }
  if (voice) {
    context += (context ? '\n\n' : '') + 'Communication style:\n' + voice.slice(0, 2000);
  }
  return context;
}
