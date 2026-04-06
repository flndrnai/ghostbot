import { cn } from '../../../utils.js';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-12 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm',
        'text-foreground placeholder:text-muted-foreground/50',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
