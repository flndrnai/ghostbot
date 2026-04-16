'use client';

import { useState, useCallback } from 'react';
import { t } from '../../lib/i18n.js';
import StepLlm from './steps/StepLlm.jsx';
import StepDocker from './steps/StepDocker.jsx';
import StepGithub from './steps/StepGithub.jsx';
import StepNotifications from './steps/StepNotifications.jsx';
import StepDone from './steps/StepDone.jsx';

export default function SetupClient({ initialStatus }) {
  const [status, setStatus] = useState(initialStatus);

  const updateStep = useCallback((stepKey, patch) => {
    setStatus((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], ...patch } }));
  }, []);

  const llmDone = status.llm?.done;
  const step2Unlocked = llmDone;
  const step3Unlocked = llmDone;
  const step4Unlocked = llmDone;
  const step5Unlocked = llmDone;

  return (
    <div className="min-h-screen bg-[#050509] text-[#E5E2DA] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[#F5D97A]">{t('setup.page.title')}</h1>
          <p className="text-sm text-[#9ca3af] mt-1">{t('setup.page.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <StepLlm status={status.llm} onUpdate={(p) => updateStep('llm', p)} />

          <StepDocker
            status={status.docker}
            locked={!step2Unlocked}
            onUpdate={(p) => updateStep('docker', p)}
          />

          <StepGithub
            status={status.github}
            locked={!step3Unlocked}
            onUpdate={(p) => updateStep('github', p)}
          />

          <StepNotifications
            status={status.notifications}
            locked={!step4Unlocked}
            onUpdate={(p) => updateStep('notifications', p)}
          />

          <StepDone status={status} locked={!step5Unlocked} />
        </div>
      </div>
    </div>
  );
}
