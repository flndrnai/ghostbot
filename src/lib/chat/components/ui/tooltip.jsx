'use client';

import { useState, useRef } from 'react';
import { cn } from '../../../utils.js';

export function Tooltip({ children, content, side = 'right' }) {
  const [visible, setVisible] = useState(false);
  const timeout = useRef(null);

  function show() {
    timeout.current = setTimeout(() => setVisible(true), 400);
  }

  function hide() {
    clearTimeout(timeout.current);
    setVisible(false);
  }

  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && content && (
        <div
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md',
            positionClass,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
