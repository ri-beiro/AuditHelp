"use client";

import { CheckCircle2, FileText, ListTodo, UserRound } from "lucide-react";
import type { ElementSummary } from "@/server/queries";
import { cn, fmtDate, fmtPct, fmtScore, STATUS_LABEL, TONE_CLASSES, TONE_LABEL } from "@/lib/utils";
import { ElementIcon } from "@/components/element-icon";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function ElementCard({ el, onOpen }: { el: ElementSummary; onOpen: () => void }) {
  const t = TONE_CLASSES[el.tone];
  const isWise = el.framework === "WISE";
  return (
    <button
      onClick={onOpen}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span className={cn("absolute inset-x-0 top-0 h-1", t.bar)} />
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className="relative grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ background: el.pillar.color }}
        >
          <ElementIcon name={el.icon} className="size-5" />
          <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-white text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
            {el.number}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {el.code} · {el.pillar.name}
          </div>
          <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-brand-800">{el.shortName}</h3>
          <p className="line-clamp-1 text-xs text-slate-500">{el.name}</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 px-4">
        <div>
          <div className="text-[11px] text-slate-500">{isWise ? "Nota (0–5)" : "Atendimento"}</div>
          <div className={cn("text-2xl font-bold tabular-nums", el.score === null ? "text-slate-300" : "text-slate-900")}>
            {isWise ? fmtScore(el.score) : fmtPct(el.pct)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={el.tone}>
            <span className={cn("size-1.5 rounded-full", t.dot)} />
            {TONE_LABEL[el.tone]}
          </Badge>
          {isWise && el.stage && el.score !== null ? (
            <span className="text-[11px] text-slate-500">{el.stage}</span>
          ) : el.capped ? (
            <span className="text-[11px] text-critico">Limitado a 50% (risco 1)</span>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-3 pt-2.5">
        <Progress value={el.pct} barClassName={t.bar} />
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
          <span>
            {el.answered}/{el.total} avaliados
          </span>
          <span>{isWise ? `${fmtPct(el.pct)} da nota máx.` : `${el.conformes} conformes`}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            el.status === "CONCLUIDO"
              ? "bg-conforme-bg text-conforme"
              : el.status === "EM_ANDAMENTO"
                ? "bg-brand-50 text-brand-700"
                : "bg-slate-100 text-slate-500",
          )}
        >
          {el.status === "CONCLUIDO" ? <CheckCircle2 className="-mt-px mr-1 inline size-3" /> : null}
          {STATUS_LABEL[el.status]}
        </span>
        <span className="flex min-w-0 items-center gap-1" title="Responsável">
          <UserRound className="size-3 shrink-0" />
          <span className="truncate">{el.responsible?.name ?? "Sem responsável"}</span>
        </span>
        <span className="ml-auto flex items-center gap-2.5">
          <span className="flex items-center gap-0.5" title="Evidências">
            <FileText className="size-3" /> {el.evidences}
          </span>
          <span
            className={cn("flex items-center gap-0.5", el.pendingActions > 0 && "font-semibold text-atencao-ink")}
            title="Ações pendentes"
          >
            <ListTodo className="size-3" /> {el.pendingActions}
          </span>
        </span>
      </div>
      {el.updatedAt ? (
        <div className="px-4 pb-2 text-[10px] text-slate-400">Atualizado em {fmtDate(el.updatedAt)}</div>
      ) : null}
    </button>
  );
}
