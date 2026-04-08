// Single source of truth for date/time formatting in GhostBot.
// European format: dd/mm/yyyy and 24h time.
//
// Always pass a number (ms epoch) or a Date. Returns '' for falsy input.

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDate(input) {
  if (input == null) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'number' || typeof input === 'string') return new Date(input);
  return null;
}

// dd/mm/yyyy
export function formatDate(input) {
  const d = toDate(input);
  if (!d || isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// HH:MM (24h)
export function formatTime(input) {
  const d = toDate(input);
  if (!d || isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// dd/mm/yyyy HH:MM
export function formatDateTime(input) {
  const d = toDate(input);
  if (!d || isNaN(d.getTime())) return '';
  return `${formatDate(d)} ${formatTime(d)}`;
}

// Relative-ish for chat sidebar:
//   now                 (< 60 seconds)
//   7 min ago           (< 60 minutes)
//   Today · HH:MM
//   Yesterday · HH:MM
//   dd/mm/yyyy · HH:MM  (older)
export function formatChatTimestamp(input) {
  const d = toDate(input);
  if (!d || isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = formatTime(d);
  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return `${formatDate(d)} · ${time}`;
}

// Compact form for tight UI rows: dd/mm HH:MM
export function formatDateTimeCompact(input) {
  const d = toDate(input);
  if (!d || isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${formatTime(d)}`;
}
