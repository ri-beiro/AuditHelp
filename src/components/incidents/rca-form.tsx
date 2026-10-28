"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Fish, HelpCircle, ListChecks, Plus, Save, Search, Trash2, Zap } from "lucide-react";
import type { IncidentDetail } from "@/server/incident-queries";
import {
  CAUSE_TYPES,
  FISHBONE,
  RCA_BASICS,
  SIX_W_TWO_H,
  YES_NO_LABEL,
  emptyWhy,
  rcaMissing,
  rcaSections,
  type RcaData,
  type YesNo,
} from "@/lib/rca";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

/** Preenche a RCA nova com o que já se sabe pelo reporte. */
function withDefaults(inc: IncidentDetail): RcaData {
  const r = structuredClone(inc.rca);
  const blank = !Object.values(r.sixW).some((v) => v.trim()) && !r.problemStatement.trim();
  if (blank) {
    r.sixW.what = r.sixW.what || inc.title;
    r.sixW.where = r.sixW.where || inc.area;
    r.sixW.when = r.sixW.when || fmtDate(inc.occurredAt);
  }
  return r;
}

/**
 * Análise de Causa Raiz (RCA) no modelo corporativo: 1. condições básicas, 2. 6W2H,
 * 3. espinha de peixe, 4. 5 porquês e 5. ações imediatas. As ações corretivas ficam na Etapa 3.
 */
export function RcaForm({
  inc,
  editable,
  members,
  onSave,
}: {
  inc: IncidentDetail;
  editable: boolean;
  members: { id: string; name: string }[];
  onSave: (rca: RcaData) => void;
}) {
  const [r, setR] = useState<RcaData>(() => withDefaults(inc));
  const set = <K extends keyof RcaData>(k: K, v: RcaData[K]) => setR((p) => ({ ...p, [k]: v }));
  const sections = rcaSections(r);
  const missing = rcaMissing(r);
  const basicsNo = Object.values(r.basics).filter((v) => v === "NAO").length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Search className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-brand-950">Análise de Causa Raiz (RCA) para Segurança</h2>
            <p className="text-sm text-slate-500">
              {inc.rcaRequired ? (
                <>
                  <b className="text-critico">Obrigatória</b> para este evento (Fatalidade, LTA, NLTA ou alto potencial) — necessária para concluir a Etapa 2.
                </>
              ) : (
                "Recomendada para quase acidentes e primeiros socorros com potencial. As ações corretivas são lançadas na Etapa 3."
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/incidentes/${inc.id}/rca`}>
            <Download /> Baixar RCA (.xlsx)
          </a>
        </Button>
      </header>

      {/* Navegação das seções */}
      <nav className="sticky top-14 z-20 flex flex-wrap gap-1.5 border-b border-slate-100 bg-white/95 px-5 py-2.5 backdrop-blur">
        {sections.map((s) => (
          <a
            key={s.n}
            href={`#rca-${s.n}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition",
              s.done ? "bg-conforme-bg text-conforme" : s.partial ? "bg-accent-50 text-accent-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            {s.done ? <CheckCircle2 className="size-3.5" /> : <span className="grid size-4 place-items-center rounded-full bg-white/70 text-[10px]">{s.n}</span>}
            {s.label}
          </a>
        ))}
        <span className="ml-auto self-center text-xs text-slate-500">
          {sections.filter((s) => s.done).length}/{sections.length} seções completas
        </span>
      </nav>

      <fieldset disabled={!editable} className="space-y-8 p-5">
        {/* Informações do evento */}
        <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-3">
          <Field label="Proprietário da investigação">
            <Input list="rca-members" value={r.investigationOwner} onChange={(e) => set("investigationOwner", e.target.value)} placeholder="Ex.: Bianca Silva / Lucas Siqueira" />
          </Field>
          <Field label="Proprietário da área">
            <Input list="rca-members" value={r.areaOwner} onChange={(e) => set("areaOwner", e.target.value)} />
          </Field>
          <Field label="Equipamento">
            <Input value={r.equipment} onChange={(e) => set("equipment", e.target.value)} placeholder="Ex.: Empilhadeira" />
          </Field>
          <datalist id="rca-members">
            {members.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </div>

        {/* 1. Condições básicas */}
        <Section n={1} title="Resolução inicial do problema — Restauração das condições básicas" icon={ListChecks}>
          <div className="grid gap-4 lg:grid-cols-2">
            {RCA_BASICS.map((block, bi) => (
              <div key={block.title} className="rounded-xl border border-slate-200">
                <h4 className="rounded-t-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">{block.title}</h4>
                <div className="divide-y divide-slate-100">
                  {block.groups.map((g) => (
                    <div key={g.title} className="px-4 py-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">{g.title}</p>
                      <ul className="space-y-2">
                        {g.questions.map((q) => (
                          <li key={q.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 text-sm text-slate-700">
                              {q.text}
                              {q.hint ? <span className="block text-[11px] text-slate-400">{q.hint}</span> : null}
                            </span>
                            <YesNoToggle value={r.basics[q.id] ?? ""} onChange={(v) => set("basics", { ...r.basics, [q.id]: v })} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="px-4 py-3">
                    <Field label="Alguma observação?">
                      <Textarea
                        rows={2}
                        value={bi === 0 ? r.equipmentNotes : r.processNotes}
                        onChange={(e) => set(bi === 0 ? "equipmentNotes" : "processNotes", e.target.value)}
                        placeholder={bi === 0 ? "Ex.: palete derivado do novo projeto do 7º lastro…" : ""}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {basicsNo ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-critico/30 bg-critico-bg px-3 py-2 text-sm text-critico">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {basicsNo} resposta(s) &quot;Não&quot;. Para cada &quot;Não&quot;, defina uma ação no Plano de Ação (Etapa 3) e, se necessário, aprofunde com os 5 porquês.
            </p>
          ) : null}
        </Section>

        {/* 2. 6W2H */}
        <Section n={2} title="6W2H — Observação do problema" icon={HelpCircle}>
          <div className="grid gap-3 md:grid-cols-2">
            {SIX_W_TWO_H.map((x) => (
              <Field key={x.k} label={x.label}>
                <Textarea rows={2} value={r.sixW[x.k]} onChange={(e) => set("sixW", { ...r.sixW, [x.k]: e.target.value })} />
              </Field>
            ))}
          </div>
          <div className="mt-4 rounded-xl border-l-4 border-brand-600 bg-brand-50/50 p-4">
            <Field label="Declaração do problema refocalizada">
              <Textarea
                rows={4}
                value={r.problemStatement}
                onChange={(e) => set("problemStatement", e.target.value)}
                placeholder="Avalie os dados do 6W2H e escreva uma declaração específica: objeto envolvido, evento observável no ponto de causa, onde e quando."
                className="bg-white"
              />
            </Field>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span className="font-medium">Problema resolvido com melhor compreensão da situação e dos padrões?</span>
              <YesNoToggle value={r.solvedByBasics} onChange={(v) => set("solvedByBasics", v)} noNa />
              <span className="text-xs text-slate-500">
                {r.solvedByBasics === "SIM"
                  ? "Atualize as ações definidas e verifique a eficácia."
                  : r.solvedByBasics === "NAO"
                    ? "Siga para a espinha de peixe e os 5 porquês."
                    : ""}
              </span>
            </div>
          </div>
        </Section>

        {/* 3. Espinha de peixe */}
        <Section n={3} title="Espinha de peixe (Ishikawa)" icon={Fish}>
          <p className="mb-3 text-xs text-slate-500">Liste as causas potenciais em cada categoria (uma por linha). A cabeça do peixe é a declaração do problema refocalizada.</p>
          <div className="relative grid gap-3 lg:grid-cols-[repeat(3,1fr)_220px]">
            {FISHBONE.slice(0, 3).map((x) => (
              <Bone key={x.k} label={x.label} value={r.fishbone[x.k]} onChange={(v) => set("fishbone", { ...r.fishbone, [x.k]: v })} />
            ))}
            <div className="row-span-3 hidden items-center lg:flex">
              <div className="w-full rounded-2xl bg-gradient-to-br from-critico to-accent-600 p-4 text-sm font-medium text-white shadow-soft">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/80">Problema</p>
                <p className="line-clamp-[8]">{r.problemStatement || inc.title}</p>
              </div>
            </div>
            <div className="col-span-3 hidden items-center lg:flex">
              <div className="h-1.5 flex-1 rounded-full bg-brand-800" />
              <ArrowRight className="-ml-1 size-6 text-brand-800" />
            </div>
            {FISHBONE.slice(3).map((x) => (
              <Bone key={x.k} label={x.label} value={r.fishbone[x.k]} onChange={(v) => set("fishbone", { ...r.fishbone, [x.k]: v })} bottom />
            ))}
          </div>
          <div className="mt-4">
            <Field label="Fatores essenciais (2 a 3) — se não tivessem ocorrido, o acidente não teria acontecido">
              <Textarea
                rows={3}
                value={r.essentialFactors}
                onChange={(e) => set("essentialFactors", e.target.value)}
                placeholder="Na atividade, no ambiente, no equipamento, na pessoa…"
              />
            </Field>
          </div>
        </Section>

        {/* 4. 5 porquês */}
        <Section n={4} title="5 Porquês — O que levou ao incidente?" icon={HelpCircle}>
          <div className="space-y-4">
            {r.whys.map((w, i) => {
              const upd = (patch: Partial<typeof w>) => set("whys", r.whys.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                    <Field label={`Causa ${i + 1} · Categoria`}>
                      <Select value={w.category} onChange={(e) => upd({ category: e.target.value })}>
                        <option value="">Selecione…</option>
                        {FISHBONE.map((f) => (
                          <option key={f.k} value={f.label}>
                            {f.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Fator / causa potencial">
                      <Input value={w.factor} onChange={(e) => upd({ factor: e.target.value })} placeholder="Ex.: quantidade de stretch, embalagem do SKU…" />
                    </Field>
                    {editable && r.whys.length > 1 ? (
                      <button
                        type="button"
                        title="Remover causa"
                        className="self-end rounded-lg p-2 text-slate-400 hover:bg-critico-bg hover:text-critico"
                        onClick={() => set("whys", r.whys.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-5">
                    {w.whys.map((y, k) => (
                      <div key={k} className="relative">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-brand-700">Por que {k + 1}</span>
                        <Textarea
                          rows={4}
                          value={y}
                          onChange={(e) => upd({ whys: w.whys.map((z, m) => (m === k ? e.target.value : z)) })}
                          className="text-[13px]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 rounded-lg bg-conforme-bg/50 p-3 md:grid-cols-[1fr_220px]">
                    <Field label="Causa raiz identificada">
                      <Textarea rows={2} value={w.rootCause} onChange={(e) => upd({ rootCause: e.target.value })} className="bg-white" />
                    </Field>
                    <Field label="Tipo de causa">
                      <Select value={w.causeType} onChange={(e) => upd({ causeType: e.target.value })} className="bg-white">
                        <option value="">Selecione…</option>
                        {CAUSE_TYPES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
              );
            })}
            {editable && r.whys.length < 20 ? (
              <Button type="button" variant="outline" onClick={() => set("whys", [...r.whys, emptyWhy()])}>
                <Plus /> Adicionar causa
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr] md:items-start">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              Foi identificada uma causa raiz?
              <YesNoToggle value={r.rootCauseFound} onChange={(v) => set("rootCauseFound", v)} noNa />
            </div>
            <Field label="Resumo">
              <Textarea rows={2} value={r.summary} onChange={(e) => set("summary", e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* 5. Ações imediatas */}
        <Section n={5} title="Ações imediatas" icon={Zap}>
          <p className="mb-3 text-xs text-slate-500">
            Tomadas no momento do evento e/ou de curto prazo. As ações corretivas e preventivas (seção 6) são lançadas no <b>Plano de Ação</b> (Etapa 3), com hierarquia de controle e causa raiz associada.
          </p>
          <div className="space-y-2">
            {r.immediate.map((a, i) => {
              const upd = (patch: Partial<typeof a>) => set("immediate", r.immediate.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="grid items-end gap-2 md:grid-cols-[28px_1fr_160px_220px_36px]">
                  <span className="grid size-7 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 md:mb-1.5">{i + 1}</span>
                  <Field label={i === 0 ? "Ação" : undefined}>
                    <Input value={a.action} onChange={(e) => upd({ action: e.target.value })} placeholder="Ex.: isolamento e sinalização da área" />
                  </Field>
                  <Field label={i === 0 ? "Data de conclusão" : undefined}>
                    <Input type="date" value={a.date} onChange={(e) => upd({ date: e.target.value })} />
                  </Field>
                  <Field label={i === 0 ? "Proprietário" : undefined}>
                    <Input list="rca-members" value={a.owner} onChange={(e) => upd({ owner: e.target.value })} />
                  </Field>
                  {editable && r.immediate.length > 1 ? (
                    <button
                      type="button"
                      title="Remover"
                      className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-critico-bg hover:text-critico"
                      onClick={() => set("immediate", r.immediate.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
            {editable ? (
              <Button type="button" variant="outline" onClick={() => set("immediate", [...r.immediate, { action: "", date: "", owner: "" }])}>
                <Plus /> Adicionar ação imediata
              </Button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Reunião inicial">
              <Input value={inc.meetingAt ? fmtDate(inc.meetingAt) : "—"} disabled />
            </Field>
            {r.followUps.map((d, i) => (
              <Field key={i} label={`Acompanhamento ${i + 1}`}>
                <Input type="date" value={d} onChange={(e) => set("followUps", r.followUps.map((x, j) => (j === i ? e.target.value : x)))} />
              </Field>
            ))}
          </div>
        </Section>

        {editable ? (
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lift backdrop-blur">
            {missing.length ? (
              <span className="mr-auto text-xs text-slate-500">
                <b className={inc.rcaRequired ? "text-critico" : "text-slate-600"}>Falta:</b> {missing.join(" · ")}
              </span>
            ) : (
              <span className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-conforme">
                <CheckCircle2 className="size-4" /> RCA completa
              </span>
            )}
            <Button type="button" onClick={() => onSave(r)}>
              <Save /> Salvar RCA
            </Button>
          </div>
        ) : null}
      </fieldset>
    </section>
  );
}

function Section({ n, title, icon: Icon, children }: { n: number; title: string; icon: typeof Fish; children: React.ReactNode }) {
  return (
    <div id={`rca-${n}`} className="scroll-mt-32">
      <h3 className="mb-3 flex items-center gap-2.5 font-display text-base font-bold text-brand-950">
        <span className="grid size-7 place-items-center rounded-lg bg-brand-700 text-sm text-white">{n}</span>
        {title}
        <Icon className="size-4 text-slate-300" />
      </h3>
      {children}
    </div>
  );
}

function Bone({ label, value, onChange, bottom }: { label: string; value: string; onChange: (v: string) => void; bottom?: boolean }) {
  return (
    <div className={cn("relative rounded-xl border border-slate-200 bg-white p-3", bottom ? "lg:border-t-4 lg:border-t-brand-700" : "lg:border-b-4 lg:border-b-brand-700")}>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">{label}</p>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Uma causa por linha" className="text-[13px]" />
    </div>
  );
}

function YesNoToggle({ value, onChange, noNa }: { value: YesNo; onChange: (v: YesNo) => void; noNa?: boolean }) {
  const opts = (noNa ? ["SIM", "NAO"] : ["SIM", "NAO", "NA"]) as Exclude<YesNo, "">[];
  const tone: Record<string, string> = {
    SIM: "bg-conforme text-white border-conforme",
    NAO: "bg-critico text-white border-critico",
    NA: "bg-slate-500 text-white border-slate-500",
  };
  return (
    <span className="inline-flex overflow-hidden rounded-lg border border-slate-200">
      {opts.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? "" : o)}
          className={cn(
            "min-w-11 border-l border-slate-200 px-2.5 py-1 text-xs font-semibold first:border-l-0 disabled:cursor-not-allowed",
            value === o ? tone[o] : "bg-white text-slate-500 hover:bg-slate-50",
          )}
        >
          {YES_NO_LABEL[o]}
        </button>
      ))}
    </span>
  );
}
