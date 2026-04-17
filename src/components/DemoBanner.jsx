// Server-rendered banner that shows across every page when DEMO_MODE
// is true. No client JS required — reads process.env at render time.

import { isDemoMode } from '../lib/demo.js';

export default function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="border-b border-[#F5D97A]/40 bg-[#111827] px-4 py-1.5 text-center text-[11px] text-[#F5D97A]">
      <span role="img" aria-label="mask">🎭</span>{' '}
      <strong>Demo mode</strong> — agent jobs, secret saves, and destructive actions are disabled. Database resets every 24h.{' '}
      <a href="https://github.com/flndrnai/ghostbot" target="_blank" rel="noreferrer" className="underline">
        Self-host for the full experience
      </a>
    </div>
  );
}
