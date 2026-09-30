import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent = "text-brand-700 bg-brand-50",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  accent?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm",
        onClick && "transition hover:border-brand-500/40 hover:shadow",
      )}
    >
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg", accent)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
      </div>
    </Comp>
  );
}
