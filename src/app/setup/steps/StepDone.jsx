'use client';

import { useRouter } from 'next/navigation';
import { t } from '../../../lib/i18n.js';
import { markWizardComplete } from '../../../lib/admin/setup-actions.js';

export default function StepDone({ status, locked }) {
  const router = useRouter();
  if (locked) return <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50"><div className="text-sm text-[#9ca3af]">{t('setup.done.title')}</div></section>;

  const partial = !status.docker?.ok || !status.github?.done || !status.notifications?.done;

  async function complete(dest) {
    if (partial && !confirm(t('setup.done.confirmPartial'))) return;
    await markWizardComplete();
    router.push(dest);
  }

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-3">{t('setup.done.title')}</h2>
      <ul className="text-xs text-[#E5E2DA] space-y-1 mb-4">
        <li>{status.llm?.done ? '✓' : '○'} LLM: {status.llm?.provider || '—'}</li>
        <li>{status.docker?.ok ? '✓' : '⚠'} Docker: {status.docker?.ok ? `Connected (${(status.docker.agentImages || []).length} agent images)` : 'Not connected'}</li>
        <li>{status.github?.done ? '✓' : '⚠'} GitHub: {status.github?.done ? 'Connected' : 'Skipped'}</li>
        <li>{status.notifications?.telegram ? '✓' : '⚠'} Telegram: {status.notifications?.telegram ? 'Active' : 'Skipped'}</li>
        <li>{status.notifications?.slack ? '✓' : '⚠'} Slack: {status.notifications?.slack ? 'Active' : 'Skipped'}</li>
      </ul>
      <div className="flex gap-2">
        <button onClick={() => complete('/')}
          className="bg-[#D4AF37] text-[#050509] rounded px-4 py-2 text-sm font-semibold">
          {t('setup.done.start')}
        </button>
        <button onClick={() => complete('/admin')}
          className="border border-[#1f2937] text-[#E5E2DA] rounded px-4 py-2 text-sm">
          {t('setup.done.backToAdmin')}
        </button>
      </div>
    </section>
  );
}
