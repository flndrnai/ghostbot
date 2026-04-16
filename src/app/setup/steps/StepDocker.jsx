'use client';

import { useEffect, useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { checkDocker, getAgentImageBuildInstructions } from '../../../lib/admin/setup-actions.js';

export default function StepDocker({ status, locked, onUpdate }) {
  const [state, setState] = useState(status);
  const [skipped, setSkipped] = useState(false);
  const [instructions, setInstructions] = useState(null);

  useEffect(() => {
    if (!locked && state?.ok === null) recheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  async function recheck() {
    const res = await checkDocker();
    setState(res);
    onUpdate(res);
  }

  async function showBuildInstructions() {
    const res = await getAgentImageBuildInstructions();
    if (res.ok) setInstructions(res);
  }

  if (locked) return <SectionLocked title={t('setup.docker.title')} />;

  if (skipped) {
    return (
      <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4">
        <div className="text-xs text-[#6b7280]">{t('setup.docker.skipped')}</div>
      </section>
    );
  }

  if (state?.ok === true) {
    const hasImages = (state.agentImages || []).length > 0;
    return (
      <section className="rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-5">
        <div className="flex items-center gap-2 text-[#34d399] font-semibold mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10b981] text-[#050509] text-xs">✓</span>
          {t('setup.docker.connected')}
        </div>
        <div className="text-xs text-[#9ca3af]">{t('setup.docker.socketPath')}: /var/run/docker.sock</div>
        <div className="text-xs text-[#9ca3af]">{t('setup.docker.version')}: {state.version}</div>
        {hasImages ? (
          <div className="text-xs text-[#9ca3af]">{t('setup.docker.imagesFound', { count: state.agentImages.length })}</div>
        ) : (
          <div className="mt-3">
            <div className="text-xs text-[#F5D97A] mb-2">{t('setup.docker.noImages')}</div>
            <button onClick={showBuildInstructions}
              className="border border-[#1f2937] text-[#E5E2DA] rounded px-3 py-1.5 text-xs">
              {t('setup.docker.howToBuild')}
            </button>
            {instructions && (
              <div className="mt-2 text-xs text-[#9ca3af]">
                <div>{t('setup.docker.buildInstructions')}</div>
                <pre className="mt-1 bg-[#050509] p-2 rounded text-[#F5D97A]">{instructions.commands.join('\n')}</pre>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  if (state?.ok === false) {
    return (
      <section className="rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.4)] p-5">
        <div className="text-sm text-[#f87171] font-semibold mb-1">{t('setup.docker.socketMissing')}</div>
        <div className="text-xs text-[#9ca3af] mb-3">{t('setup.docker.socketMissingHelp')}</div>
        <div className="flex gap-2">
          <button onClick={recheck}
            className="border border-[#1f2937] text-[#E5E2DA] rounded px-3 py-1.5 text-xs">
            {t('setup.docker.recheck')}
          </button>
          <button onClick={() => setSkipped(true)}
            className="border border-[#1f2937] text-[#9ca3af] rounded px-3 py-1.5 text-xs">
            {t('setup.docker.skip')}
          </button>
        </div>
      </section>
    );
  }

  return <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5 text-xs text-[#9ca3af]">{t('setup.docker.checking')}</section>;
}

function SectionLocked({ title }) {
  return (
    <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50">
      <div className="text-sm text-[#9ca3af]">{title}</div>
    </section>
  );
}
