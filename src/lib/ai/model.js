import { getConfig } from '../config.js';
import { getConfigSecret } from '../db/config.js';
import { BUILTIN_PROVIDERS, getDefaultModel } from '../llm-providers.js';

export async function createModel(overrides = {}) {
  const provider = overrides.provider || getConfig('LLM_PROVIDER') || 'ollama';
  let model = overrides.model || getConfig('LLM_MODEL') || getDefaultModel(provider);
  const maxTokens = parseInt(overrides.maxTokens || getConfig('MAX_TOKENS') || '4096', 10);
  const temperature = parseFloat(overrides.temperature || getConfig('TEMPERATURE') || '0.7');

  // Ollama — use OpenAI-compatible API
  if (provider === 'ollama') {
    const baseURL = getConfig('OLLAMA_BASE_URL') || 'http://localhost:11434';
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({
      modelName: model || 'llama3.2',
      maxTokens,
      temperature,
      streaming: true,
      configuration: { baseURL: `${baseURL}/v1` },
      apiKey: 'ollama',
    });
  }

  // Anthropic
  if (provider === 'anthropic') {
    const apiKey = getConfigSecret('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('Anthropic API key not configured. Go to Admin > LLM Providers.');
    const { ChatAnthropic } = await import('@langchain/anthropic');
    return new ChatAnthropic({
      modelName: model,
      maxTokens,
      temperature,
      streaming: true,
      anthropicApiKey: apiKey,
    });
  }

  // OpenAI
  if (provider === 'openai') {
    const apiKey = getConfigSecret('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OpenAI API key not configured. Go to Admin > LLM Providers.');
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({
      modelName: model,
      maxTokens,
      temperature,
      streaming: true,
      openAIApiKey: apiKey,
    });
  }

  // Google
  if (provider === 'google') {
    const apiKey = getConfigSecret('GOOGLE_API_KEY');
    if (!apiKey) throw new Error('Google API key not configured. Go to Admin > LLM Providers.');
    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
    return new ChatGoogleGenerativeAI({
      modelName: model,
      maxOutputTokens: maxTokens,
      temperature,
      streaming: true,
      apiKey,
    });
  }

  // Custom OpenAI-compatible provider (stored in settings as type 'llm_provider')
  const { getCustomProvider } = await import('../db/config.js');
  const custom = getCustomProvider(provider);
  if (custom) {
    const { ChatOpenAI } = await import('@langchain/openai');
    return new ChatOpenAI({
      modelName: model || custom.models?.[0] || 'default',
      maxTokens,
      temperature,
      streaming: true,
      configuration: { baseURL: custom.baseUrl },
      apiKey: custom.apiKey || 'none',
    });
  }

  throw new Error(`Unknown LLM provider: ${provider}. Configure one in Admin > LLM Providers.`);
}
