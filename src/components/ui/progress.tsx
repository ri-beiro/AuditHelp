import { cn } from "@/lib/utils";

export function Progress({ value, className, barClassName }: { value: number | null; className?: string; barClassName?: string }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full bg-brand-600 transition-all", barClassName)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}
