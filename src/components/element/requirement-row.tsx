"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, FileText, ListPlus, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { saveRequirement } from "@/server/actions";
import { cn, fmtDateTime } from "@/lib/utils";
import { Textarea } from "@/components/ui/input";
import type { ElementDetail } from "@/server/queries";
import type { SheetCtx } from "./element-sheet";

export type Req = ElementDetail["requirements"][number];

export type ScaleOption = { value: string; short: string; label: string; className: string };

export function ScoreScale({
  options,
  value,
  disabled,
  onChange,
}: {
  options: ScaleOption[];
  value: string | null;
  disabled?: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white" role="radiogroup">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.label}
            disabled={disabled}
            onClick={() => onChange(active ? null : o.value)}
            className={cn(
              "h-8 min-w-9 border-l border-slate-200 px-2 text-xs font-semibold transition-colors first:border-l-0 disabled:cursor-not-allowed",
              active ? o.className : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
}

export function RequirementRow({
  req,
  ctx,
  options,
  prefix,
  extra,
  focus,
}: {
  req: Req;
  ctx: SheetCtx;
  options: ScaleOption[];
  prefix?: React.ReactNode;
  extra?: React.ReactNode;
  focus?: boolean;
}) {
  const [open, setOpen] = useState(!!focus);
  const [obs, setObs] = useState(req.observation);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const evidences = ctx.detail.evidences.filter((e) => e.requirementId === req.id).length;
  const actions = ctx.detail.actions.filter((a) => a.requirementId === req.id).length;

  useEffect(() => setObs(req.observation), [req.observation]);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);

  const persist = (patch: { value?: string | null; observation?: string }) =>
    start(async () => {
      if (patch.value !== undefined) {
        ctx.setDetail({
          ...ctx.detail,
          requirements: ctx.detail.requirements.map((r) => (r.id === req.id ? { ...r, value: patch.value ?? null } : r)),
        });
      }
      const res = await saveRequirement({ assessmentId: ctx.detail.assessmentId, requirementId: req.id, ...patch });
      if (res.ok && res.data) ctx.setDetail(res.data);
      else if (!res.ok) toast.error(res.error);
    });

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-white transition-shadow",
        focus ? "border-brand-500 ring-2 ring-brand-500/20" : "border-slate-200",
        req.deviation && "border-l-4 border-l-critico/70",
      )}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-slate-400 transition-transform", !open && "-rotate-90")} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">{prefix}</div>
            <p className="text-sm leading-snug text-slate-800">{req.text}</p>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-400">
              {req.observation ? (
                <span className="flex items-center gap-1 text-slate-500">
                  <MessageSquare className="size-3" /> Observação
                </span>
              ) : null}
              {evidences ? (
                <span className="flex items-center gap-1 text-brand-700">
                  <FileText className="size-3" /> {evidences} evidência{evidences > 1 ? "s" : ""}
                </span>
              ) : null}
              {actions ? (
                <span className="flex items-center gap-1 text-atencao-ink">
                  <ListPlus className="size-3" /> {actions} ação{actions > 1 ? "ões" : ""}
                </span>
              ) : null}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 self-end sm:self-start">
          {pending ? <Loader2 className="size-3.5 animate-spin text-slate-400" /> : null}
          <ScoreScale
            options={options}
            value={req.value}
            disabled={!ctx.perms.score}
            onChange={(v) => persist({ value: v })}
          />
        </div>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 pl-9">
          {extra}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Observações / evidência encontrada</label>
            <Textarea
              className="mt-1 min-h-16 bg-white"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              onBlur={() => obs !== req.observation && persist({ observation: obs })}
              placeholder="Descreva o que foi observado em campo, entrevistas e documentos…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ctx.perms.evidence ? (
              <button
                onClick={() => ctx.openEvidenceFor(req.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="size-3.5" /> Anexar evidência
              </button>
            ) : null}
            {ctx.perms.action ? (
              <button
                onClick={() => ctx.openActionFor(req.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
                  req.deviation
                    ? "border-accent-500/40 bg-accent-50 text-accent-700 hover:bg-accent-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                <ListPlus className="size-3.5" /> Criar plano de ação
              </button>
            ) : null}
            {req.updatedAt ? (
              <span className="ml-auto text-[11px] text-slate-400">
                Avaliado em {fmtDateTime(req.updatedAt)}
                {req.updatedBy ? ` · ${req.updatedBy}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
