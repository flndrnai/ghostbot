// Minimal in-repo translation helper. No i18n library — by project convention.
// Locale JSON files live in src/locales/<lang>.json.
// Usage:  t('setup.llm.title')            → "Choose your LLM provider"
//         t('setup.banner.progress', { done: 2, total: 5 })  → "2 of 5 configured"
// Missing keys fall back to the key string itself so the UI never crashes.

import en from '../locales/en.json' with { type: 'json' };
import nl from '../locales/nl.json' with { type: 'json' };
import fr from '../locales/fr.json' with { type: 'json' };

const locales = { en, nl, fr };
export const ACTIVE_LOCALE = 'en'; // Hardcoded for this phase — no UI selector yet.

function resolve(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  );
}

export function t(key, vars) {
  const active = locales[ACTIVE_LOCALE] || locales.en;
  const value = resolve(active, key) ?? resolve(locales.en, key);
  if (typeof value !== 'string') return key;
  return interpolate(value, vars);
}
