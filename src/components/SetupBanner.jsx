'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '../lib/i18n.js';
import { getSetupState, dismissWizardBanner } from '../lib/admin/setup-actions.js';

export default function SetupBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [stepsDone, setStepsDone] = useState(0);

  useEffect(() => {
    getSetupState()
      .then((result) => {
        // getSetupState may return { ok: false, error } on failure
        if (result?.ok === false) return;
        const { lifecycle, status } = result;
        if (!lifecycle || lifecycle.completedAt || lifecycle.bannerDismissedAt) return;
        setShow(true);
        let done = 0;
        if (status?.llm?.done) done++;
        if (status?.docker?.ok === true) done++;
        if (status?.github?.done) done++;
        if (status?.notifications?.done) done++;
        setStepsDone(done);
      })
      .catch(() => { /* non-owner or unauthenticated — silently hide */ });
  }, []);

  if (!show) return null;
  if (pathname === '/setup') return null;

  async function dismiss() {
    await dismissWizardBanner();
    setShow(false);
  }

  return (
    <div className="border-l-4 border-[#D4AF37] bg-[#111827] px-4 py-2 flex items-center justify-between text-xs">
      <div className="text-[#F5D97A]">
        ⚙ {t('setup.banner.title')} — {t('setup.banner.progress', { done: stepsDone, total: 4 })}
      </div>
      <div className="flex gap-2">
        <Link href="/setup" className="bg-[#D4AF37] text-[#050509] rounded px-3 py-1 font-semibold">{t('setup.banner.resume')}</Link>
        <button onClick={dismiss} className="text-[#9ca3af] px-2">✕</button>
      </div>
    </div>
  );
}
