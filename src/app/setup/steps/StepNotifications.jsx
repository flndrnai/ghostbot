'use client';

import { useState } from 'react';
import { t } from '../../../lib/i18n.js';
import { saveAndTestTelegram, removeTelegram, saveAndTestSlack, removeSlack } from '../../../lib/admin/setup-actions.js';

export default function StepNotifications({ status, locked, onUpdate }) {
  if (locked) return <section className="rounded-xl bg-[#0b1220] border border-[#1f2937] p-4 opacity-50"><div className="text-sm text-[#9ca3af]">{t('setup.notifications.title')}</div></section>;

  return (
    <section className="rounded-xl bg-[#111827] border border-[#1f2937] p-5">
      <h2 className="text-base font-semibold mb-1">{t('setup.notifications.title')}</h2>
      <p className="text-xs text-[#9ca3af] mb-4">{t('setup.notifications.subtitle')}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <TelegramSub active={status.telegram} onChange={(v) => onUpdate({ telegram: v })} />
        <SlackSub active={status.slack} onChange={(v) => onUpdate({ slack: v })} />
      </div>
    </section>
  );
}

function TelegramSub({ active, onChange }) {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [status, setStatus] = useState('');

  if (active) {
    return (
      <div className="rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-3">
        <div className="text-xs text-[#34d399] font-semibold mb-2">✓ {t('setup.notifications.telegramActive')}</div>
        <button onClick={async () => { await removeTelegram(); onChange(false); }}
          className="text-xs text-[#f87171] border border-[rgba(248,113,113,0.3)] rounded px-2 py-1">
          {t('setup.notifications.disconnect')}
        </button>
      </div>
    );
  }

  async function send() {
    setStatus('sending');
    const res = await saveAndTestTelegram({ botToken, chatId });
    setStatus(res.ok ? 'sent' : `err:${res.error}`);
    if (res.ok) onChange(true);
  }

  return (
    <div className="rounded-lg bg-[#0b1220] border border-[#1f2937] p-3">
      <div className="text-xs text-[#E5E2DA] font-semibold mb-2">{t('setup.notifications.telegramTitle')}</div>
      <input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)}
        placeholder={t('setup.notifications.telegramBotToken')}
        className="w-full bg-[#050509] border border-[#1f2937] rounded px-2 py-1.5 text-xs mb-2" />
      <input value={chatId} onChange={(e) => setChatId(e.target.value)}
        placeholder={t('setup.notifications.telegramChatId')}
        className="w-full bg-[#050509] border border-[#1f2937] rounded px-2 py-1.5 text-xs mb-2" />
      <button onClick={send}
        className="bg-[#D4AF37] text-[#050509] rounded px-3 py-1.5 text-xs font-semibold">
        {t('setup.notifications.sendTest')}
      </button>
      {status === 'sent' && <div className="text-xs text-[#34d399] mt-2">{t('setup.notifications.sent')}</div>}
      {status.startsWith('err:') && <div className="text-xs text-[#f87171] mt-2">{t('setup.notifications.testFailed', { error: status.slice(4) })}</div>}
    </div>
  );
}

function SlackSub({ active, onChange }) {
  const [botToken, setBotToken] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');

  if (active) {
    return (
      <div className="rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.4)] p-3">
        <div className="text-xs text-[#34d399] font-semibold mb-2">✓ {t('setup.notifications.slackActive')}</div>
        <button onClick={async () => { await removeSlack(); onChange(false); }}
          className="text-xs text-[#f87171] border border-[rgba(248,113,113,0.3)] rounded px-2 py-1">
          {t('setup.notifications.disconnect')}
        </button>
      </div>
    );
  }

  async function send() {
    setStatus('sending');
    const res = await saveAndTestSlack({ botToken, channel });
    setStatus(res.ok ? 'sent' : `err:${res.error}`);
    if (res.ok) onChange(true);
  }

  return (
    <div className="rounded-lg bg-[#0b1220] border border-[#1f2937] p-3">
      <div className="text-xs text-[#E5E2DA] font-semibold mb-2">{t('setup.notifications.slackTitle')}</div>
      <input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)}
        placeholder={t('setup.notifications.slackBotToken')}
        className="w-full bg-[#050509] border border-[#1f2937] rounded px-2 py-1.5 text-xs mb-2" />
      <input value={channel} onChange={(e) => setChannel(e.target.value)}
        placeholder={t('setup.notifications.slackChannel')}
        className="w-full bg-[#050509] border border-[#1f2937] rounded px-2 py-1.5 text-xs mb-2" />
      <button onClick={send}
        className="bg-[#D4AF37] text-[#050509] rounded px-3 py-1.5 text-xs font-semibold">
        {t('setup.notifications.sendTest')}
      </button>
      {status === 'sent' && <div className="text-xs text-[#34d399] mt-2">{t('setup.notifications.sent')}</div>}
      {status.startsWith('err:') && <div className="text-xs text-[#f87171] mt-2">{t('setup.notifications.testFailed', { error: status.slice(4) })}</div>}
    </div>
  );
}
