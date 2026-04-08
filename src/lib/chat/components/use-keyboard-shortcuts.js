'use client';

import { useEffect } from 'react';

// Registers global keyboard shortcuts. Pass a handlers map like:
//   { 'mod+b': () => toggle(), 'mod+/': () => showHelp() }
//
// `mod` = Cmd on macOS, Ctrl on Windows/Linux.
// Special keys: 'enter', 'escape', 'slash', '?' (just write the literal char).
// Combine with '+': 'mod+shift+n'
//
// Ignores events targeted at input/textarea/contenteditable so the
// shortcuts don't steal typing.

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function eventToCombo(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  let key = (e.key || '').toLowerCase();
  // Normalize common aliases
  if (key === ' ') key = 'space';
  parts.push(key);
  return parts.join('+');
}

export function useKeyboardShortcuts(handlers, { allowInInputs = [] } = {}) {
  useEffect(() => {
    if (!handlers) return;
    const map = new Map();
    for (const [combo, fn] of Object.entries(handlers)) {
      map.set(combo.toLowerCase(), fn);
    }
    const inputAllowed = new Set(allowInInputs.map((s) => s.toLowerCase()));

    function onKey(e) {
      const combo = eventToCombo(e);
      if (!map.has(combo)) return;
      if (isTypingTarget(e.target) && !inputAllowed.has(combo)) return;
      e.preventDefault();
      map.get(combo)(e);
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers, allowInInputs]);
}

export function modKeyLabel() {
  return IS_MAC ? '⌘' : 'Ctrl';
}
