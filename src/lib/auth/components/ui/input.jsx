'use client';

import { useState } from 'react';
import { cn } from '../../../utils.js';
import { Eye, EyeOff } from '../../../icons/index.jsx';

export function Input({ className, type, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="relative">
      <input
        type={isPassword && showPassword ? 'text' : type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm',
          'text-foreground placeholder:text-muted-foreground/50',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/40',
          'disabled:cursor-not-allowed disabled:opacity-40',
          isPassword && 'pr-12',
          className,
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
