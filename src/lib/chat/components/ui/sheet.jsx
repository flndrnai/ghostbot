'use client';

import { useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../utils.js';

export function Sheet({ open, onOpenChange, children }) {
  const startX = useRef(null);

  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onOpenChange(false);
    },
    [onOpenChange],
  );

  // Swipe to close
  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (startX.current === null) return;
      const diff = startX.current - e.changedTouches[0].clientX;
      if (diff > 80) onOpenChange(false);
      startX.current = null;
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px]',
          'bg-sidebar shadow-2xl shadow-black/40',
          'animate-fade-up',
        )}
      >
        {children}
      </div>
    </div>
  );
}
