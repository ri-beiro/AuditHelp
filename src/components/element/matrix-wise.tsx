"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { cn, fmtPct } from "@/lib/utils";
import { WISE_GATE, type WiseElementResult } from "@/lib/scoring";
import { Progress } from "@/components/ui/progress";
import { RequirementRow, type ScaleOption } from "./requirement-row";
import type { SheetCtx } from "./element-sheet";

const OPTIONS: ScaleOption[] = [
  { value: "0", short: "0", label: "0 — Não implementado", className: "bg-critico text-white" },
  { value: "1", short: "1", label: "1 — Parcialmente implementado (>40%)", className: "bg-atencao text-white" },
  { value: "2", short: "2", label: "2 — 100% implementado (>90%)", className: "bg-conforme text-white" },
];

// Níveis de performance WISE — Treinamento Auditor Júnior WISE², slide 108.
const LEVEL_NAME: Record<number, string> = {
  1: "Nível Básico",
  2: "Nível Aceitável",
  3: "Bom Nível",
  4: "Excelente Nível",
  5: "World Class",
};

const LEVEL_TEXT: Record<number, string> = {
  1: "Baixa compreensão de um sistema de segurança. Reativo a todo evento, com baixo cumprimento de padrões e normas. Os elementos básicos são conhecidos e parcialmente implementados. Reativo e liderado pelo profissional de SST ou pessoa designada.",
  2: "O sistema de segurança é direcionado e em sua maioria está sendo implementado, mas não alinhado dentro da organização. Reativo e liderado pelo profissional de SST.",
  3: "Bom entendimento entre a maioria sobre o que deve ser alcançado; o sistema de segurança é utilizado de forma eficaz e compartilhado com a liderança. Direcionado e monitorado como processo-chave. O profissional de SST é assessor.",
  4: "Conceito de dono enraizado: o sistema de segurança é compartilhado entre as pessoas, que contribuem para as mudanças. A inovação vem das equipes para melhorar o sistema. Profissionais de SST são conselheiros.",
  5: "As equipes se desenvolvem entre si. O sistema de segurança é integrado a cada operação da unidade, aberto e confiável.",
};

const DIM: Record<string, { label: string; cls: string }> = {
  ATIVIDADE: { label: "Atividade", cls: "bg-brand-50 text-brand-700 border-brand-100" },
  QUALIDADE: { label: "Qualidade", cls: "bg-violet-50 text-violet-700 border-violet-100" },
  IMPACTO: { label: "Impacto", cls: "bg-cyan-50 text-cyan-700 border-cyan-100" },
};

export function MatrixWise({ ctx, focusRequirement }: { ctx: SheetCtx; focusRequirement: string | null }) {
  const result = ctx.detail.result as WiseElementResult & { kind: "WISE" };
  const [only, setOnly] = useState<"" | "pendentes" | "desvios">("");
  const byLevel = useMemo(() => {
    const m = new Map<number, typeof ctx.detail.requirements>();
    for (const r of ctx.detail.requirements) m.set(r.level ?? 0, [...(m.get(r.level ?? 0) ?? []), r]);
    return m;
  }, [ctx.detail.requirements]);

  return (
    <div className="space-y-5">
      {/* Escada de Bradley */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Maturidade por nível (curva de Bradley)</h4>
            <p className="text-xs text-slate-500">
              Nota = soma dos % de cada nível ({result.raw.toFixed(2).replace(".", ",")}), arredondada em quartos. Avalie
              do nível 1 para cima; só avance quando o nível atual atingir {WISE_GATE * 100}%.
            </p>
          </div>
          <div className="flex gap-1 text-xs">
            {(["", "pendentes", "desvios"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setOnly(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium",
                  only === f ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {f === "" ? "Todos" : f === "pendentes" ? "Não avaliados" : "Desvios"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-5 items-end gap-2">
          {result.levels.map((l) => (
            <a key={l.level} href={`#nivel-${l.level}`} className="group flex flex-col items-center gap-1">
              <span className="text-xs font-semibold tabular-nums text-slate-700">{fmtPct(l.pct)}</span>
              <div className="relative w-full overflow-hidden rounded-md bg-slate-100" style={{ height: 24 + l.level * 14 }}>
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 rounded-md transition-all",
                    l.pct >= WISE_GATE ? "bg-conforme" : l.pct > 0.4 ? "bg-atencao" : l.pct > 0 ? "bg-critico" : "",
                  )}
                  style={{ height: `${l.pct * 100}%` }}
                />
              </div>
              <span className="text-center text-[11px] font-medium leading-tight text-slate-500 group-hover:text-brand-700">
                Nível {l.level}
                <br />
                <span className="text-[10px] text-slate-400">{LEVEL_NAME[l.level]}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      {[1, 2, 3, 4, 5].map((level) => {
        const l = result.levels[level - 1];
        const reqs = (byLevel.get(level) ?? []).filter((r) =>
          only === "pendentes" ? !r.value : only === "desvios" ? r.deviation : true,
        );
        const locked = level > 1 && result.levels.slice(0, level - 1).some((p) => p.pct < WISE_GATE);
        return (
          <section key={level} id={`nivel-${level}`} className="scroll-mt-16 space-y-2">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-900 px-4 py-2.5 text-white">
              <span className="grid size-7 place-items-center rounded-full bg-white/15 text-sm font-bold">{level}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  Nível {level} · {LEVEL_NAME[level]}
                </div>
                <div className="text-[11px] text-brand-100/80">{LEVEL_TEXT[level]}</div>
              </div>
              <div className="flex w-44 flex-col gap-1">
                <div className="flex justify-between text-[11px] text-brand-100/80">
                  <span>
                    {l.points}/{l.maxPoints} pts · {l.answered}/{l.statements}
                  </span>
                  <span className="font-semibold text-white">{fmtPct(l.pct)}</span>
                </div>
                <Progress
                  value={l.pct}
                  className="h-1.5 bg-white/15"
                  barClassName={l.pct >= WISE_GATE ? "bg-conforme" : l.pct > 0.4 ? "bg-atencao" : "bg-critico"}
                />
              </div>
            </div>
            {locked ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                  l.gateWarning ? "bg-atencao-bg text-atencao-ink" : "bg-slate-100 text-slate-500",
                )}
              >
                {l.gateWarning ? <AlertTriangle className="size-3.5" /> : <Lock className="size-3.5" />}
                {l.gateWarning
                  ? "Regra dos 75%: há níveis anteriores abaixo de 75%. As notas deste nível contam na pontuação, mas a metodologia recomenda validar os níveis anteriores primeiro."
                  : "Nível ainda não liberado: os níveis anteriores precisam atingir 75%."}
              </div>
            ) : null}
            {reqs.length === 0 ? (
              <p className="px-1 text-xs text-slate-400">Nenhuma afirmação com este filtro.</p>
            ) : (
              reqs.map((r) => (
                <RequirementRow
                  key={r.id}
                  req={r}
                  ctx={ctx}
                  options={OPTIONS}
                  focus={focusRequirement === r.id}
                  prefix={
                    <>
                      <span className="text-[11px] font-semibold text-slate-400">{r.code}</span>
                      {r.dimension ? (
                        <span className={cn("rounded border px-1.5 py-px text-[10px] font-semibold uppercase", DIM[r.dimension]?.cls)}>
                          {DIM[r.dimension]?.label}
                        </span>
                      ) : null}
                    </>
                  }
                />
              ))
            )}
          </section>
        );
      })}
      <p className="text-[11px] text-slate-400">
        Escala: 2 = 100% implementado (&gt;90% do nível 1 ao 3) · 1 = parcialmente implementado (&gt;40%) · 0 = não
        implementado · em branco = não avaliado. Clique novamente na nota para limpar.
      </p>
    </div>
  );
}
