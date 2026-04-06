import { cn } from '../../../utils.js';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card text-card-foreground',
        'shadow-xl shadow-black/10',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-2 p-8 pb-2', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-2xl font-semibold tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-8 pt-4', className)} {...props} />;
}
