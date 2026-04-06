export const BUILTIN_PROVIDERS = {
  ollama: {
    name: 'Ollama (Local)',
    credentials: [],
    models: [], // Auto-detected from Ollama API
  },
  anthropic: {
    name: 'Anthropic',
    credentials: [{ type: 'api_key', key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key' }],
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', default: true },
      { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4' },
    ],
  },
  openai: {
    name: 'OpenAI',
    credentials: [{ type: 'api_key', key: 'OPENAI_API_KEY', label: 'OpenAI API Key' }],
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', default: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
  },
  google: {
    name: 'Google',
    credentials: [{ type: 'api_key', key: 'GOOGLE_API_KEY', label: 'Google API Key' }],
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', default: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    ],
  },
};

export function getDefaultModel(providerSlug) {
  const provider = BUILTIN_PROVIDERS[providerSlug];
  if (!provider) return '';
  const defaultModel = provider.models.find((m) => m.default);
  return defaultModel?.id || provider.models[0]?.id || '';
}
