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
        "group flex items-start gap-3.5 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-soft",
        onClick && "transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift",
      )}
    >
      <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset ring-black/[0.03]", accent)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-slate-500">{label}</div>
        <div className="mt-0.5 font-display text-[26px] font-extrabold leading-tight tracking-tight text-brand-950 tabular-nums">{value}</div>
        {hint ? <div className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{hint}</div> : null}
      </div>
    </Comp>
  );
}
