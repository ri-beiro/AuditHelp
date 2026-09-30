import { cn, ACTION_STATUS_LABEL, PRIORITY_LABEL } from "@/lib/utils";

const PRIORITY_CLS: Record<string, string> = {
  BAIXA: "bg-slate-100 text-slate-600",
  MEDIA: "bg-brand-50 text-brand-700",
  ALTA: "bg-atencao-bg text-atencao-ink",
  CRITICA: "bg-critico-bg text-critico",
};

const STATUS_CLS: Record<string, string> = {
  ABERTA: "bg-slate-100 text-slate-700",
  EM_ANDAMENTO: "bg-brand-50 text-brand-700",
  CONCLUIDA: "bg-conforme-bg text-conforme",
  CANCELADA: "bg-slate-100 text-slate-400 line-through",
};

export function PriorityBadge({ value }: { value: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORITY_CLS[value])}>{PRIORITY_LABEL[value]}</span>;
}

export function ActionStatusBadge({ value, overdue }: { value: string; overdue?: boolean }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", overdue ? "bg-critico text-white" : STATUS_CLS[value])}>
      {overdue ? "Em atraso" : ACTION_STATUS_LABEL[value]}
    </span>
  );
}

export function isOverdue(a: { status: string; dueDate: string | null }) {
  if (!a.dueDate || a.status === "CONCLUIDA" || a.status === "CANCELADA") return false;
  return a.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
}
