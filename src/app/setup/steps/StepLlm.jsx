'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { saveAndTestLlm } from '../../../lib/admin/setup-actions.js';

export default function StepLlm({ status, onUpdate }) {
  const [provider, setProvider] = useState(status.provider || 'ollama');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(status.model || '');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  if (status.done) {
    return (
      <section className="rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-5">
        <div className="flex items-center gap-2 text-[#34d399] font-semibold mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] text-[#050509] text-xs">✓</span>
          {t('setup.llm.activeTitle', { provider: status.provider })}
        </div>
        <div className="text-xs text-[#9ca3af] mb-3">{status.model || t('setup.llm.modelAutoPick')}</div>
      </section>
    );
  }

  async function submit() {
    setTesting(true); setError('');
    const result = await saveAndTestLlm({ provider, baseUrl, apiKey, model });
    setTesting(false);
    if (!result.ok) { setError(result.error || t('setup.llm.errorConnect')); return; }
    onUpdate({ done: true, provider, model });
  }

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-1">{t('setup.llm.title')}</h2>
      <p className="text-xs text-[#9ca3af] mb-4">{t('setup.llm.subtitle')}</p>

      <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.provider')}</label>
      <select value={provider} onChange={(e) => setProvider(e.target.value)}
        className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3">
        <option value="ollama">Ollama</option>
        <option value="anthropic">Anthropic</option>
        <option value="openai">OpenAI</option>
        <option value="google">Google</option>
      </select>

      {provider === 'ollama' ? (
        <>
          <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.baseUrl')}</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://ollama.example.com:11434"
            className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />
        </>
      ) : (
        <>
          <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.apiKey')}</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('setup.llm.alreadyConfigured')}
            className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />
        </>
      )}

      <label className="block text-xs text-[#9ca3af] mb-1">{t('setup.llm.model')}</label>
      <input value={model} onChange={(e) => setModel(e.target.value)}
        placeholder={t('setup.llm.modelAutoPick')}
        className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />

      {error && <div className="text-xs text-[#f87171] mb-3">{error}</div>}

      <button onClick={submit} disabled={testing}
        className="bg-[#D4AF37] text-[#050509] rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {testing ? '...' : t('setup.llm.testAndSave')}
      </button>
    </section>
  );
}
