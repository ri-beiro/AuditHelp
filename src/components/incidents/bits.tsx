import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { INCIDENT_TYPE_SHORT, STEP_LABEL, type IncidentTypeKey, type Step } from "@/lib/incidents";

export const TYPE_STYLE: Record<IncidentTypeKey, string> = {
  FATALIDADE: "bg-slate-900 text-white",
  LTA: "bg-critico text-white",
  NLTA: "bg-red-100 text-critico",
  FAC: "bg-orange-100 text-orange-700",
  INCIDENTE: "bg-accent-100 text-accent-700",
  NEAR_MISS: "bg-amber-100 text-amber-800",
  CONDICAO_INSEGURA: "bg-wgreen-100 text-wgreen-700",
  OBSERVACAO: "bg-brand-100 text-brand-700",
};

export function TypeBadge({ type, className }: { type: IncidentTypeKey; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", TYPE_STYLE[type], className)}>
      {INCIDENT_TYPE_SHORT[type]}
    </span>
  );
}

export function HipoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-critico to-accent-600 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-soft",
        className,
      )}
      title="High Potential Incident"
    >
      <Flame className="size-3" /> HIPO
    </span>
  );
}

const STEP_STYLE: Record<Step, string> = {
  NAO_INICIADO: "bg-slate-100 text-slate-500",
  EM_ANDAMENTO: "bg-brand-50 text-brand-700",
  AGENDADO: "bg-accent-50 text-accent-700",
  CONCLUIDO: "bg-conforme-bg text-conforme",
};

export function StepBadge({ status }: { status: Step }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STEP_STYLE[status])}>{STEP_LABEL[status]}</span>;
}

export function ProgressPill({ value, closed }: { value: number; closed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", closed || value === 100 ? "bg-conforme" : "bg-gradient-to-r from-brand-600 to-brand-500")}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-slate-600">{value}%</span>
    </div>
  );
}
