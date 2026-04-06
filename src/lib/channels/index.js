import { getConfig } from '../config.js';
import { TelegramAdapter } from './telegram.js';

let telegramAdapter = null;

export function getTelegramAdapter() {
  if (telegramAdapter) return telegramAdapter;

  const botToken = getConfig('TELEGRAM_BOT_TOKEN');
  if (!botToken) return null;

  telegramAdapter = new TelegramAdapter(botToken);
  return telegramAdapter;
}

export function resetAdapters() {
  telegramAdapter = null;
}
