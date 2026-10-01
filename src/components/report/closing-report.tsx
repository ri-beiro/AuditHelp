"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import type { FrameworkOverview } from "@/server/queries";
import { saveClosingReport } from "@/server/actions";
import { GRADE_BANDS, GRADE_STAGE, siteGrade, type Grade } from "@/lib/scoring";
import { cn, fmtDate, fmtDateTime, fmtPct, fmtScore, PRIORITY_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { GRADE_COLOR, GradeBadge } from "@/components/grade-badge";

type Report = {
  auditDates: string;
  auditors: string;
  format: string;
  highlights: string;
  quotes: string;
  conclusion: string;
  groups: Record<string, { strengths: string; opportunities: string }>;
  updatedAt: string | null;
  updatedBy: string | null;
};

type Props = {
  unitName: string;
  cycle: string;
  assessmentId: string;
  canEdit: boolean;
  wise: FrameworkOverview;
  basics: FrameworkOverview;
  report: Report;
  opinions: Record<string, { summary: string; recommendations: string }>;
  level1Gaps: { code: string; text: string }[];
  actions: {
    id: string;
    what: string;
    element: string;
    owner: string | null;
    dueDate: string | null;
    priority: string;
    spheraId: string | null;
  }[];
};

const lines = (t: string) =>
  t
    .split("\n")
    .map((l) => l.replace(/^[-•*✓]\s*/, "").trim())
    .filter(Boolean);

export function ClosingReportView(props: Props) {
  const { wise, basics } = props;
  const [r, setR] = useState<Report>(props.report);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const site = siteGrade(wise.overall.grade, basics.overall.grade);
  const groups = wise.pillars.slice().sort((a, b) => order(a.name) - order(b.name));

  const save = () =>
    start(async () => {
      const res = await saveClosingReport({
        assessmentId: props.assessmentId,
        auditDates: r.auditDates,
        auditors: r.auditors,
        format: r.format,
        highlights: r.highlights,
        quotes: r.quotes,
        conclusion: r.conclusion,
        groups: r.groups,
      });
      if (res.ok) {
        toast.success("Relatório salvo");
        setEditing(false);
      } else toast.error(res.error);
    });

  const setGroup = (name: string, field: "strengths" | "opportunities", value: string) =>
    setR({
      ...r,
      groups: { ...r.groups, [name]: { ...(r.groups[name] ?? { strengths: "", opportunities: "" }), [field]: value } },
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="eyebrow">Auditoria WISE² · reunião de fechamento</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">Relatório de fechamento</h1>
          {r.updatedAt ? (
            <p className="text-xs text-slate-500">
              Atualizado em {fmtDateTime(r.updatedAt)}
              {r.updatedBy ? ` por ${r.updatedBy}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {props.canEdit ? (
            editing ? (
              <Button onClick={save} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar relatório
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Editar
              </Button>
            )
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Capa */}
      <Section className="wise-hero print:break-after-page">
        <p className="eyebrow">Auditoria WISE² · Ciclo {props.cycle}</p>
        <h2 className="mt-2 text-3xl font-extrabold">{props.unitName}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <EditableLine label="Datas da auditoria" value={r.auditDates} editing={editing} onChange={(v) => setR({ ...r, auditDates: v })} light />
          <EditableLine label="Auditores" value={r.auditors} editing={editing} onChange={(v) => setR({ ...r, auditors: v })} light />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <GradeBadge grade={site} size="xl" />
          <div>
            <div className="text-sm text-brand-100/80">Classificação do site</div>
            <div className="text-2xl font-bold">{site ? `${site} · ${GRADE_STAGE[site]}` : "Avaliação incompleta"}</div>
            <div className="text-sm text-brand-100/80">
              Cultura {fmtScore(wise.overall.score)} / 65 · Compliance 12 Básicos {fmtPct(basics.overall.pct)}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Formato">
        <EditableText
          value={r.format}
          editing={editing}
          onChange={(v) => setR({ ...r, format: v })}
          placeholder={"Entrevistas com __ pessoas em todos os níveis hierárquicos…\nRevisão de documentação WISE…\nVisita a campo: racks, docas, pátio…"}
          bullets
        />
      </Section>

      <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
        <Section title="Destaques">
          <EditableText value={r.highlights} editing={editing} onChange={(v) => setR({ ...r, highlights: v })} placeholder="Um destaque por linha" bullets />
        </Section>
        <Section title="Citações coletadas">
          <EditableText
            value={r.quotes}
            editing={editing}
            onChange={(v) => setR({ ...r, quotes: v })}
            placeholder="Uma citação por linha"
            render={(items) => (
              <ul className="space-y-2">
                {items.map((q, i) => (
                  <li key={i} className="border-l-4 border-accent-500 pl-3 text-sm italic text-slate-700">
                    “{q.replace(/^["“]|["”;]+$/g, "")}”
                  </li>
                ))}
              </ul>
            )}
          />
        </Section>
      </div>

      {/* Grupos de elementos */}
      {groups.map((g) => {
        const els = wise.elements.filter((e) => e.pillar.id === g.id);
        const data = r.groups[g.name] ?? { strengths: "", opportunities: "" };
        return (
          <Section key={g.id} title={`Elementos de ${g.name}`} className="print:break-inside-avoid">
            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {els.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
                  <GradeBadge grade={e.grade} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {e.number}. {e.shortName}
                    </div>
                    <div className="text-xs text-slate-500">
                      Nota {fmtScore(e.score)} · {e.stage}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
              <div className="rounded-lg bg-conforme-bg/70 p-3">
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-conforme">Pontos fortes</h4>
                <EditableText value={data.strengths} editing={editing} onChange={(v) => setGroup(g.name, "strengths", v)} placeholder="Um ponto por linha" bullets />
              </div>
              <div className="rounded-lg bg-atencao-bg p-3">
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-atencao-ink">Oportunidades</h4>
                <EditableText
                  value={data.opportunities}
                  editing={editing}
                  onChange={(v) => setGroup(g.name, "opportunities", v)}
                  placeholder="Uma oportunidade por linha"
                  bullets
                />
              </div>
            </div>
          </Section>
        );
      })}

      {/* Compliance */}
      <Section title="Compliance · 12 Básicos" className="print:break-inside-avoid">
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-1.5 font-medium">Básico</th>
                <th className="py-1.5 text-right font-medium">Pontuação</th>
                <th className="py-1.5 pl-3 font-medium">Classe</th>
              </tr>
            </thead>
            <tbody>
              {basics.elements.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-700">
                    {b.number}. {b.shortName}
                  </td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{b.pct === null ? "N/A" : fmtPct(b.pct)}</td>
                  <td className="py-1.5 pl-3">
                    <GradeBadge grade={b.grade} size="sm" />
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2">12 Básicos</td>
                <td className="py-2 text-right tabular-nums">{fmtPct(basics.overall.pct)}</td>
                <td className="py-2 pl-3">
                  <GradeBadge grade={basics.overall.grade} size="sm" />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="space-y-3 md:w-64">
            <Stat label="Score itens risco nível 1" value={fmtPct(basics.overall.level1Pct)} />
            <Stat label="Itens risco nível 1 em “Básico”" value={String(props.level1Gaps.length)} danger={props.level1Gaps.length > 0} />
            {props.level1Gaps.length ? (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-[11px] text-slate-600 print:max-h-none">
                {props.level1Gaps.map((g) => (
                  <li key={g.code}>
                    <strong>{g.code}</strong> {g.text.slice(0, 110)}
                    {g.text.length > 110 ? "…" : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Section>

      {/* Resultado */}
      <Section title="Resultado e classificação" className="print:break-inside-avoid">
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="grid grid-cols-2 gap-3">
            <ResultBox title="Cultura" value={`${fmtScore(wise.overall.score)} pts`} grade={wise.overall.grade} sub={wise.overall.stage} />
            <ResultBox title="Compliance" value={fmtPct(basics.overall.pct)} grade={basics.overall.grade} sub={basics.overall.stage} />
            <div className="col-span-2">
              <ResultBox title="Classe do site" value={site ? GRADE_STAGE[site] : "—"} grade={site} sub="A pior classe entre cultura e compliance" />
            </div>
          </div>
          <table className="w-full self-start text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 font-medium">Tipo</th>
                <th className="py-1 font-medium">Cultura (0–65)</th>
                <th className="py-1 font-medium">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {(["A", "B", "C", "D"] as Grade[]).map((g) => {
                const c = GRADE_BANDS.CULTURE;
                const culture = { A: `${c.A} – 65`, B: `${c.B} – ${c.A}`, C: `${c.C} – ${c.B}`, D: `0 – ${c.C}` }[g];
                const comp = { A: "80% – 100%", B: "65% – 80%", C: "40% – 65%", D: "0% – 40%" }[g];
                return (
                  <tr key={g} className={cn("border-t border-slate-100", site === g && "bg-brand-50 font-semibold")}>
                    <td className="py-1.5">
                      <span className="inline-grid size-6 place-items-center rounded font-bold text-white" style={{ background: GRADE_COLOR[g] }}>
                        {g}
                      </span>
                    </td>
                    <td className="py-1.5">
                      {culture.replace(/\./g, ",")} · {GRADE_STAGE[g]}
                    </td>
                    <td className="py-1.5">{comp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Recomendações */}
      <Section title="Avaliação e recomendações por elemento">
        <div className="space-y-3">
          {wise.elements.map((e) => {
            const o = props.opinions[e.id];
            if (!o || (!o.summary && !o.recommendations)) return null;
            return (
              <div key={e.id} className="rounded-lg border border-slate-200 p-3 print:break-inside-avoid">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <GradeBadge grade={e.grade} size="sm" /> {e.number}. {e.name} · {fmtScore(e.score)}
                </div>
                {o.summary ? <p className="whitespace-pre-line text-sm text-slate-700">{o.summary}</p> : null}
                {o.recommendations ? (
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    <strong>Recomendações:</strong> {o.recommendations}
                  </p>
                ) : null}
              </div>
            );
          })}
          {wise.elements.every((e) => !props.opinions[e.id]?.summary && !props.opinions[e.id]?.recommendations) ? (
            <p className="text-sm text-slate-500">Preencha a aba “Parecer” de cada elemento no Dashboard para compor esta seção.</p>
          ) : null}
        </div>
      </Section>

      <Section title="Pós-auditoria · planos de ação em aberto" className="print:break-inside-avoid">
        <p className="mb-3 text-xs text-slate-500">
          Traçar plano de ação para os itens de nível 1 dos Básicos (workshop), apoiar o site no entendimento das não
          conformidades e lançar os achados no Sphera.
        </p>
        {props.actions.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-1.5 font-medium">Ação</th>
                <th className="py-1.5 font-medium">Elemento</th>
                <th className="py-1.5 font-medium">Responsável</th>
                <th className="py-1.5 font-medium">Prazo</th>
                <th className="py-1.5 font-medium">Prioridade</th>
                <th className="py-1.5 font-medium">Sphera</th>
              </tr>
            </thead>
            <tbody>
              {props.actions.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 pr-2 text-slate-800">{a.what}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{a.element}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{a.owner ?? "A definir"}</td>
                  <td className="py-1.5 pr-2 tabular-nums text-slate-600">{fmtDate(a.dueDate)}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{PRIORITY_LABEL[a.priority]}</td>
                  <td className="py-1.5 text-slate-600">{a.spheraId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">Nenhum plano de ação em aberto.</p>
        )}
      </Section>

      <Section title="Conclusão">
        <EditableText value={r.conclusion} editing={editing} onChange={(v) => setR({ ...r, conclusion: v })} placeholder="Mensagem final da reunião de fechamento" />
      </Section>
    </div>
  );
}

function order(name: string) {
  return ["Liderança", "Organização", "Operação"].indexOf(name);
}

function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:shadow-none", className)}>
      {title ? <h3 className="mb-4 border-b-2 border-wgreen-400 pb-1 text-lg font-bold text-brand-900">{title}</h3> : null}
      {children}
    </section>
  );
}

function EditableLine({
  label,
  value,
  editing,
  onChange,
  light,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  light?: boolean;
}) {
  return (
    <div>
      <div className={cn("text-xs", light ? "text-brand-100/70" : "text-slate-500")}>{label}</div>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      ) : (
        <div className="font-medium">{value || "—"}</div>
      )}
    </div>
  );
}

function EditableText({
  value,
  editing,
  onChange,
  placeholder,
  bullets,
  render,
}: {
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  bullets?: boolean;
  render?: (items: string[]) => React.ReactNode;
}) {
  if (editing) return <Textarea rows={6} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-white" />;
  const items = lines(value);
  if (!items.length) return <p className="text-sm text-slate-400">Não preenchido.</p>;
  if (render) return <>{render(items)}</>;
  if (!bullets) return <p className="whitespace-pre-line text-sm text-slate-700">{value}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-700">
          <span className="mt-0.5 text-conforme">✓</span>
          {t}
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn("text-2xl font-bold tabular-nums", danger ? "text-critico" : "text-slate-900")}>{value}</div>
    </div>
  );
}

function ResultBox({ title, value, grade, sub }: { title: string; value: string; grade: Grade | null; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <GradeBadge grade={grade} size="lg" />
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-lg font-bold text-slate-900">{value}</div>
        {sub ? <div className="text-[11px] text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}
