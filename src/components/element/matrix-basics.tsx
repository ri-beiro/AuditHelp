"use client";

import { useState } from "react";
import { AlertOctagon } from "lucide-react";
import { cn, fmtPct } from "@/lib/utils";
import type { BasicsElementResult } from "@/lib/scoring";
import { RequirementRow, type ScaleOption } from "./requirement-row";
import type { SheetCtx } from "./element-sheet";

const OPTIONS: ScaleOption[] = [
  { value: "BASIC", short: "B", label: "Básico (0%)", className: "bg-critico text-white" },
  { value: "PARTIAL", short: "P", label: "Parcial (25%)", className: "bg-orange-500 text-white" },
  { value: "SIGNIFICANT", short: "S", label: "Significativo (75%)", className: "bg-atencao text-white" },
  { value: "COMPLIANT", short: "C", label: "Conforme (100%)", className: "bg-conforme text-white" },
  { value: "NA", short: "N/A", label: "Não aplicável", className: "bg-slate-500 text-white" },
];

const RISK: Record<number, string> = {
  1: "bg-critico-bg text-critico border-critico/30",
  2: "bg-atencao-bg text-atencao-ink border-atencao/30",
  3: "bg-slate-50 text-slate-600 border-slate-200",
};

export function MatrixBasics({ ctx, focusRequirement }: { ctx: SheetCtx; focusRequirement: string | null }) {
  const result = ctx.detail.result as BasicsElementResult & { kind: "BASICS" };
  const [only, setOnly] = useState<"" | "risco1" | "pendentes" | "desvios">("");
  const reqs = ctx.detail.requirements.filter((r) =>
    only === "risco1" ? r.riskLevel === 1 : only === "pendentes" ? !r.value : only === "desvios" ? r.deviation : true,
  );
  const dist = OPTIONS.map((o) => ({ ...o, n: ctx.detail.requirements.filter((r) => r.value === o.value).length }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Distribuição de conformidade</h4>
            <p className="text-xs text-slate-500">
              Básico = 0 · Parcial = 0,25 · Significativo = 0,75 · Conforme = 1 · N/A fora do cálculo. Atendimento:{" "}
              <strong className="text-slate-700">{fmtPct(result.pct)}</strong>
              {result.capped ? ` (sem limitador seria ${fmtPct(result.rawPct)})` : ""}.
            </p>
          </div>
          <div className="flex gap-1 text-xs">
            {(
              [
                ["", "Todos"],
                ["risco1", "Risco nível 1"],
                ["pendentes", "Não avaliados"],
                ["desvios", "Desvios"],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setOnly(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium",
                  only === f ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
          {dist.map((d) =>
            d.n ? (
              <div
                key={d.value}
                title={`${d.label}: ${d.n}`}
                className={cn("h-full", d.className.split(" ")[0])}
                style={{ width: `${(d.n / result.total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
          {dist.map((d) => (
            <span key={d.value} className="flex items-center gap-1">
              <span className={cn("size-2 rounded-full", d.className.split(" ")[0])} />
              {d.label.split(" (")[0]}: <strong>{d.n}</strong>
            </span>
          ))}
          <span className="text-slate-400">Não avaliados: {result.total - result.answered}</span>
        </div>
        {result.criticalGaps > 0 ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-critico-bg px-3 py-2 text-xs text-critico">
            <AlertOctagon className="mt-px size-3.5 shrink-0" />
            {result.criticalGaps} item(ns) de risco nível 1 em “Básico”: o atendimento deste básico fica limitado a 50%
            até a correção.
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {reqs.map((r) => (
          <RequirementRow
            key={r.id}
            req={r}
            ctx={ctx}
            options={OPTIONS}
            focus={focusRequirement === r.id}
            prefix={
              <>
                <span className="text-[11px] font-semibold text-slate-400">{r.code}</span>
                {r.riskLevel ? (
                  <span className={cn("rounded border px-1.5 py-px text-[10px] font-semibold", RISK[r.riskLevel])}>
                    Risco {r.riskLevel}
                  </span>
                ) : null}
              </>
            }
            extra={
              r.criteria ? (
                <div className="grid gap-2 md:grid-cols-3">
                  {(
                    [
                      ["basic", "Básico", "border-critico/30"],
                      ["partial", "Parcial", "border-orange-300"],
                      ["significant", "Significativo", "border-atencao/40"],
                    ] as const
                  ).map(([k, label, cls]) =>
                    r.criteria?.[k] ? (
                      <div key={k} className={cn("rounded-md border-l-4 bg-white p-2 text-xs text-slate-600", cls)}>
                        <div className="mb-0.5 font-semibold text-slate-700">{label}</div>
                        {r.criteria[k]}
                      </div>
                    ) : null,
                  )}
                </div>
              ) : null
            }
          />
        ))}
        {reqs.length === 0 ? <p className="text-xs text-slate-400">Nenhum requisito com este filtro.</p> : null}
      </div>
    </div>
  );
}
