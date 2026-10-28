"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Fish, HelpCircle, ListChecks, Plus, Save, Search, Trash2, X, Zap } from "lucide-react";
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
  type FishKey,
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
          <p className="mb-3 text-xs text-slate-500">
            Escreva uma causa potencial em cada quadradinho. Use <b>+</b> para acrescentar mais quadradinhos na espinha. A cabeça do peixe é a declaração do problema refocalizada.
          </p>
          <Fishbone
            value={r.fishbone}
            head={r.problemStatement || inc.title}
            editable={editable}
            onChange={(k, list) => set("fishbone", { ...r.fishbone, [k]: list })}
          />
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

const MAX_BOXES = 12;

/** Diagrama de Ishikawa no modelo do formulário: 3 espinhas em cima, 3 embaixo, quadradinhos editáveis. */
const FISH = "#7aa5b3";

/**
 * Diagrama de Ishikawa desenhado como um peixe: cauda, espinha central, 3 espinhas em cima e 3 embaixo
 * (com os quadradinhos editáveis), cabeça e o círculo do efeito (problema).
 */
function Fishbone({
  value,
  head,
  editable,
  onChange,
}: {
  value: RcaData["fishbone"];
  head: string;
  editable: boolean;
  onChange: (k: FishKey, list: string[]) => void;
}) {
  const top = FISHBONE.slice(0, 3);
  const bottom = FISHBONE.slice(3);
  const bone = (x: (typeof FISHBONE)[number], side: "top" | "bottom") => (
    <BoneColumn key={x.k} label={x.label} side={side} boxes={value[x.k]} editable={editable} onChange={(list) => onChange(x.k, list)} />
  );
  return (
    <>
      {/* Desktop: desenho do peixe */}
      <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 lg:block">
        <div className="grid grid-cols-[72px_1fr_84px_190px] grid-rows-[auto_0_auto]">
          <div className="col-start-2 row-start-1 grid grid-cols-3 gap-3">{top.map((x) => bone(x, "top"))}</div>
          {/* Cauda */}
          <div className="relative col-start-1 row-start-2">
            <svg className="absolute -top-[58px] left-0 h-[116px] w-[76px]" viewBox="0 0 76 116" aria-hidden>
              <path d="M2 2 C 30 18, 52 38, 62 52 L 76 56 L 76 60 L 62 64 C 52 78, 30 98, 2 114 C 14 92, 20 74, 30 58 C 20 42, 14 24, 2 2 Z" fill={FISH} />
            </svg>
          </div>
          {/* Espinha central */}
          <div className="relative col-start-2 row-start-2">
            <div className="absolute inset-x-0 -top-[2px] h-1 rounded-full" style={{ background: FISH }} />
          </div>
          {/* Cabeça */}
          <div className="relative col-start-3 row-start-2">
            <svg className="absolute -top-[56px] left-0 h-[112px] w-[84px]" viewBox="0 0 84 112" aria-hidden>
              <path d="M0 4 C 34 6, 66 26, 82 56 C 66 86, 34 106, 0 108 C 10 76, 10 36, 0 4 Z" fill={FISH} />
              <path d="M0 4 C 10 36, 10 76, 0 108" fill="none" stroke="#5f8b99" strokeWidth="2" />
              <ellipse cx="46" cy="44" rx="6" ry="8" fill="#ffffff" />
            </svg>
          </div>
          {/* Efeito */}
          <div className="relative col-start-4 row-start-2">
            <div
              className="absolute -top-[88px] left-4 grid size-[176px] place-items-center rounded-full border-[3px] bg-white p-5 text-center"
              style={{ borderColor: FISH }}
            >
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: FISH }}>
                  Efeito
                </p>
                <p className="line-clamp-5 text-[12px] font-medium leading-snug text-slate-700" title={head}>
                  {head}
                </p>
              </div>
            </div>
          </div>
          <div className="col-start-2 row-start-3 grid grid-cols-3 gap-3">{bottom.map((x) => bone(x, "bottom"))}</div>
        </div>
      </div>

      {/* Celular / tela estreita: listas por categoria */}
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        <div className="rounded-xl border-2 p-3 text-sm sm:col-span-2" style={{ borderColor: FISH }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: FISH }}>
            Efeito
          </p>
          <p className="text-slate-700">{head}</p>
        </div>
        {FISHBONE.map((x) => (
          <div key={x.k} className="rounded-xl border border-slate-200 p-3">
            <BoxList label={x.label} boxes={value[x.k]} editable={editable} onChange={(list) => onChange(x.k, list)} />
          </div>
        ))}
      </div>
    </>
  );
}

function BoneColumn({
  label,
  side,
  boxes,
  editable,
  onChange,
}: {
  label: string;
  side: "top" | "bottom";
  boxes: string[];
  editable: boolean;
  onChange: (list: string[]) => void;
}) {
  const isTop = side === "top";
  const n = boxes.length;
  const header = (
    <div className={cn("relative z-10 flex items-center justify-center gap-1.5", isTop ? "mb-2" : "mt-2")}>
      <span className="text-sm font-bold lowercase tracking-wide" style={{ color: "#5f8b99" }}>
        {label}
      </span>
      {editable && n < MAX_BOXES ? (
        <button
          type="button"
          title="Acrescentar quadradinho"
          onClick={() => onChange([...boxes, ""])}
          className="grid size-6 place-items-center rounded-full border border-[#7aa5b3] bg-white text-[#5f8b99] shadow-soft transition hover:bg-[#7aa5b3] hover:text-white"
        >
          <Plus className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
  return (
    <div className={cn("relative flex min-h-[190px] flex-col", isTop ? "justify-start pb-1" : "justify-end pt-1")}>
      {/* Espinha diagonal: sai da espinha central (canto direito) em direção ao rótulo */}
      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <line
          x1={isTop ? 50 : 98}
          y1={isTop ? 12 : 0}
          x2={isTop ? 98 : 50}
          y2={isTop ? 100 : 88}
          stroke={FISH}
          strokeWidth={5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {isTop ? header : null}
      <div className={cn("relative z-10 flex flex-col gap-2", isTop ? "pb-4" : "pt-4")}>
        {boxes.map((text, i) => {
          // Os quadradinhos acompanham a inclinação da espinha.
          const t = n === 1 ? 0.5 : i / (n - 1);
          const offset = 2 + (isTop ? t : 1 - t) * 30;
          return (
            <FishBox
              key={i}
              style={{ marginLeft: `${offset}%` }}
              value={text}
              editable={editable}
              onChange={(v) => onChange(boxes.map((b, j) => (j === i ? v : b)))}
              onRemove={n > 1 ? () => onChange(boxes.filter((_, j) => j !== i)) : undefined}
            />
          );
        })}
      </div>
      {isTop ? null : header}
    </div>
  );
}

function BoxList({ label, boxes, editable, onChange }: { label: string; boxes: string[]; editable: boolean; onChange: (list: string[]) => void }) {
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold lowercase" style={{ color: "#5f8b99" }}>
          {label}
        </span>
        {editable && boxes.length < MAX_BOXES ? (
          <button type="button" onClick={() => onChange([...boxes, ""])} className="flex items-center gap-1 text-xs font-semibold text-brand-700">
            <Plus className="size-3.5" /> Quadradinho
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {boxes.map((text, i) => (
          <FishBox
            key={i}
            value={text}
            editable={editable}
            onChange={(v) => onChange(boxes.map((b, j) => (j === i ? v : b)))}
            onRemove={boxes.length > 1 ? () => onChange(boxes.filter((_, j) => j !== i)) : undefined}
          />
        ))}
      </div>
    </>
  );
}

function FishBox({
  value,
  editable,
  onChange,
  onRemove,
  style,
}: {
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  onRemove?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className="group relative w-[54%] min-w-[150px] max-lg:w-full">
      <textarea
        rows={2}
        value={value}
        readOnly={!editable}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Causa…"
        className="block w-full resize-none rounded-md border-2 border-[#7aa5b3] bg-white px-2 py-1.5 text-[12px] leading-snug text-slate-800 shadow-soft outline-none placeholder:text-slate-300 focus:border-[#5f8b99] focus:ring-2 focus:ring-[#7aa5b3]/30"
        style={{ fieldSizing: "content", minHeight: "2.6rem" } as React.CSSProperties}
      />
      {editable && onRemove ? (
        <button
          type="button"
          title="Remover quadradinho"
          onClick={onRemove}
          className="absolute -right-2 -top-2 hidden size-5 place-items-center rounded-full bg-critico text-white shadow-soft group-hover:grid"
        >
          <X className="size-3" />
        </button>
      ) : null}
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
