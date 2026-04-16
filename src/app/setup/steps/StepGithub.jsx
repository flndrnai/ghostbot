'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { saveAndTestGithub, removeGithub } from '../../../lib/admin/setup-actions.js';

export default function StepGithub({ status, locked, onUpdate }) {
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  if (locked) return <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50"><div className="text-sm text-[#9ca3af]">{t('setup.github.title')}</div></section>;

  if (status.done) {
    return (
      <section className="rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-5">
        <div className="flex items-center gap-2 text-[#34d399] font-semibold mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] text-[#050509] text-xs">✓</span>
          {t('setup.github.activeTitle', { username: username || '…' })}
        </div>
        <button onClick={async () => { await removeGithub(); onUpdate({ done: false, hasToken: false }); }}
          className="text-xs text-[#f87171] border border-[rgba(248,113,113,0.3)] rounded px-3 py-1.5">
          {t('setup.notifications.disconnect')}
        </button>
      </section>
    );
  }

  async function submit() {
    setTesting(true); setError('');
    const res = await saveAndTestGithub({ token });
    setTesting(false);
    if (!res.ok) { setError(res.error || t('setup.github.errorConnect')); return; }
    setUsername(res.username || '');
    onUpdate({ done: true, hasToken: true });
  }

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-1">{t('setup.github.title')}</h2>
      <p className="text-xs text-[#9ca3af] mb-2">{t('setup.github.subtitle')}</p>
      <div className="text-xs text-[#6b7280] mb-3">{t('setup.github.scopesHint')} · <a className="underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">{t('setup.github.patLink')}</a></div>

      <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
        placeholder={status.hasToken ? t('setup.llm.alreadyConfigured') : 'ghp_...'}
        className="w-full bg-[#0b1220] border border-[#1f2937] rounded px-3 py-2 text-sm mb-3" />

      {error && <div className="text-xs text-[#f87171] mb-3">{error}</div>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={testing}
          className="bg-[#D4AF37] text-[#050509] rounded px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {testing ? '...' : t('setup.github.testAndSave')}
        </button>
        <button onClick={() => onUpdate({ done: false, skipped: true })}
          className="border border-[#1f2937] text-[#9ca3af] rounded px-3 py-2 text-sm">
          {t('setup.github.skip')}
        </button>
      </div>
    </section>
  );
}
