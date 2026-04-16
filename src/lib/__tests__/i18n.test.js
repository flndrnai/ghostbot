import { describe, it, expect } from 'vitest';
import { t } from '../i18n.js';

describe('t()', () => {
  it('returns a known key', () => {
    expect(t('setup.llm.title')).toBe('Choose your LLM provider');
  });

  it('supports dotted keys with interpolation', () => {
    expect(t('setup.banner.progress', { done: 2, total: 5 })).toBe('2 of 5 configured');
  });

  it('falls back to the key string when missing', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('leaves unknown {vars} in place', () => {
    expect(t('setup.llm.title', { unused: 'x' })).toBe('Choose your LLM provider');
  });
});
