'use client';

import { useState, Children, cloneElement, isValidElement } from 'react';
import { cn } from '../../../utils.js';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/85 shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_30px_rgba(212,175,55,0.25)]',
  outline: 'border border-border text-foreground hover:bg-muted hover:border-muted-foreground/20',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'border border-destructive/30 text-destructive hover:bg-destructive/10',
};

const sizes = {
  default: 'h-12 px-6 py-3 text-sm',
  sm: 'h-10 px-4 text-sm',
  lg: 'h-14 px-8 text-base',
  icon: 'h-12 w-12',
};

export function Button({ className, variant = 'default', size = 'default', children, ...props }) {
  const [hovered, setHovered] = useState(false);

  // Pass isHovered to animated icon children so they animate on button hover
  const enhancedChildren = Children.map(children, (child) => {
    if (isValidElement(child) && child.type?.displayName?.endsWith('Animated')) {
      return cloneElement(child, { isHovered: hovered });
    }
    return child;
  });

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-40',
        'active:scale-[0.97] cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {enhancedChildren}
    </button>
  );
}
