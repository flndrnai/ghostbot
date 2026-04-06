'use client';

export function ThinkingMessage() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-muted/60 px-5 py-4 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-[glow-pulse_1.4s_ease-in-out_infinite]" />
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-[glow-pulse_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="h-2 w-2 rounded-full bg-primary/60 animate-[glow-pulse_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
}
