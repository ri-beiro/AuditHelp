import * as React from "react";
import { cn, TONE_CLASSES } from "@/lib/utils";
import type { Tone } from "@/lib/scoring";

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const t = tone ? TONE_CLASSES[tone] : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        t ? `${t.bg} ${t.text} ${t.border}` : "border-slate-200 bg-slate-50 text-slate-600",
        className,
      )}
      {...props}
    />
  );
}
