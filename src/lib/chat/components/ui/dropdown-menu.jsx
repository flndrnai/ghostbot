'use client';

import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '../../../utils.js';

const DropdownContext = createContext({ open: false, setOpen: () => {} });

export function DropdownMenu({ children, fullWidth = false }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen, fullWidth }}>
      <div className={cn('relative', fullWidth ? 'block w-full' : 'inline-block')}>{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild }) {
  const { open, setOpen, fullWidth } = useContext(DropdownContext);
  const handleClick = () => setOpen(!open);

  if (asChild) {
    return <div className={fullWidth ? 'block w-full' : undefined} onClick={handleClick}>{children}</div>;
  }

  return <button onClick={handleClick}>{children}</button>;
}

export function DropdownMenuContent({ children, align = 'start', side = 'bottom', className }) {
  const { open, setOpen, fullWidth } = useContext(DropdownContext);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  const alignClass = fullWidth ? 'left-0 right-0' : (align === 'end' ? 'right-0' : 'left-0');
  const sideClass = side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 rounded-md border border-border bg-card p-1 shadow-md',
        fullWidth ? '' : 'min-w-[8rem]',
        alignClass,
        sideClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className }) {
  const { setOpen } = useContext(DropdownContext);

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
        'hover:bg-muted cursor-pointer text-left',
        className,
      )}
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
