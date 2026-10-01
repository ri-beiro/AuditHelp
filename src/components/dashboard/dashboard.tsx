"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FilterX,
  Gauge,
  ListTodo,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { FrameworkOverview } from "@/server/queries";
import { GRADE_STAGE, siteGrade, type Grade, type Tone } from "@/lib/scoring";
import { GradeBadge } from "@/components/grade-badge";
import { cn, fmtPct, fmtScore, STATUS_LABEL, TONE_CLASSES, TONE_LABEL } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ElementCard } from "./element-card";
import { Kpi } from "./kpi";
import { ElementSheet } from "@/components/element/element-sheet";

export type Perms = { score: boolean; editElement: boolean; evidence: boolean; action: boolean };

type Props = {
  unit: { id: string; name: string };
  cycle: string;
  wise: FrameworkOverview;
  basics: FrameworkOverview;
  members: { id: string; name: string }[];
  perms: Perms;
  blobEnabled: boolean;
};

const EMPTY = { pillar: "", status: "", tone: "", responsible: "", text: "" };

export function Dashboard({ unit, cycle, wise, basics, members, perms, blobEnabled }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get("tab") === "basicos" ? "basicos" : "wise";
  const openCode = params.get("el");
  const ov = tab === "wise" ? wise : basics;
  const [filters, setFilters] = useState(EMPTY);

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const elements = useMemo(() => {
    const text = filters.text.trim().toLowerCase();
    return ov.elements.filter(
      (e) =>
        (!filters.pillar || e.pillar.id === filters.pillar) &&
        (!filters.status || e.status === filters.status) &&
        (!filters.tone || e.tone === filters.tone) &&
        (!filters.responsible ||
          (filters.responsible === "none" ? !e.responsible : e.responsible?.id === filters.responsible)) &&
        (!text || `${e.code} ${e.name} ${e.shortName}`.toLowerCase().includes(text)),
    );
  }, [ov, filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const openFramework = openCode?.startsWith("B") ? basics : wise;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Cabeçalho */}
      <section className="wise-hero rounded-3xl p-6 shadow-lift md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">
              Painel de gestão · Ciclo {cycle}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{unit.name}</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-100/80">
              13 Elementos de cultura e gestão WISE² e 12 Básicos de segurança. Clique em um card para abrir a matriz
              completa com evidências, status e planos de ação.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_1fr_1fr] sm:min-w-[620px]">
            <SiteGrade culture={wise.overall.grade} compliance={basics.overall.grade} />
            <HeroScore
              title="Score WISE (cultura)"
              value={wise.overall.score === null ? "—" : `${fmtScore(wise.overall.score)}`}
              suffix="/ 65"
              pct={wise.overall.pct}
              tone={wise.overall.tone}
              grade={wise.overall.grade}
              hint={wise.overall.stage}
              active={tab === "wise"}
              onClick={() => setParams({ tab: null })}
            />
            <HeroScore
              title="12 Básicos (compliance)"
              value={fmtPct(basics.overall.pct)}
              pct={basics.overall.pct}
              tone={basics.overall.tone}
              grade={basics.overall.grade}
              hint={`Score risco nível 1: ${fmtPct(basics.overall.level1Pct)}`}
              active={tab === "basicos"}
              onClick={() => setParams({ tab: "basicos" })}
            />
          </div>
        </div>
      </section>

      {/* Indicadores rápidos */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          icon={CheckCircle2}
          label="Itens conformes"
          value={ov.totals.conformes}
          hint={`${ov.totals.answered} de ${ov.totals.total} itens avaliados`}
          accent="bg-conforme-bg text-conforme"
        />
        <Kpi
          icon={XCircle}
          label="Desvios"
          value={ov.totals.desvios}
          hint="Itens não atendidos plenamente"
          accent="bg-critico-bg text-critico"
        />
        <Kpi
          icon={ListTodo}
          label="Ações pendentes"
          value={ov.totals.pendingActions}
          hint={ov.totals.overdueActions ? `${ov.totals.overdueActions} em atraso` : "Nenhuma em atraso"}
          accent="bg-accent-50 text-accent-700"
          onClick={() => router.push("/acoes")}
        />
        <Kpi
          icon={ShieldAlert}
          label="Elementos críticos"
          value={ov.totals.criticalElements}
          hint={tab === "wise" ? "Classe C ou D (nota < 2,5)" : "Classe C ou D (< 65%)"}
          accent="bg-critico-bg text-critico"
          onClick={() => setFilters({ ...EMPTY, tone: "critico" })}
        />
        <Kpi
          icon={Gauge}
          label="Conformidade"
          value={fmtPct(ov.overall.pct)}
          hint={tab === "wise" ? "Pontos WISE / 65" : "Média dos básicos aplicáveis"}
        />
      </section>

      {/* Abas + filtros */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3">
          <Tabs value={tab} onValueChange={(v) => { setFilters(EMPTY); setParams({ tab: v === "wise" ? null : v }); }}>
            <TabsList>
              <TabsTrigger value="wise">
                <ShieldCheck /> 13 Elementos WISE
              </TabsTrigger>
              <TabsTrigger value="basicos">
                <AlertTriangle /> 12 Básicos
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-2 shadow-soft backdrop-blur sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)_auto]">
            <Input
              value={filters.text}
              onChange={(e) => setFilters({ ...filters, text: e.target.value })}
              placeholder="Filtrar elemento…"
              className="w-full"
            />
            <Select value={filters.pillar} onChange={(e) => setFilters({ ...filters, pillar: e.target.value })} className="w-full">
              <option value="">Todos os pilares</option>
              {ov.pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full">
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select value={filters.tone} onChange={(e) => setFilters({ ...filters, tone: e.target.value })} className="w-full">
              <option value="">Todas as situações</option>
              {(["critico", "atencao", "conforme", "neutro"] as Tone[]).map((t) => (
                <option key={t} value={t}>
                  {TONE_LABEL[t]}
                </option>
              ))}
            </Select>
            <Select
              value={filters.responsible}
              onChange={(e) => setFilters({ ...filters, responsible: e.target.value })}
              className="w-full"
            >
              <option value="">Todos os responsáveis</option>
              <option value="none">Sem responsável</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            {hasFilters ? (
              <Button variant="ghost" onClick={() => setFilters(EMPTY)}>
                <FilterX /> Limpar
              </Button>
            ) : (
              <span className="hidden lg:block" />
            )}
          </div>
        </div>

        {/* Pilares */}
        <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", ov.pillars.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
          {ov.pillars.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilters({ ...filters, pillar: filters.pillar === p.id ? "" : p.id })}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-white p-4 pt-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift",
                filters.pillar === p.id ? "border-transparent ring-4" : "border-slate-200/70",
              )}
              style={{
                backgroundImage: `linear-gradient(160deg, ${p.color}14, transparent 55%)`,
                ...(filters.pillar === p.id ? { boxShadow: `0 0 0 3px ${p.color}55` } : {}),
              }}
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: p.color }} />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-display text-[15px] font-bold text-brand-950">
                  <span className="grid size-6 place-items-center rounded-lg text-[11px] font-extrabold text-white shadow-soft" style={{ background: p.color }}>
                    {p.name[0]}
                  </span>
                  {p.name}
                </span>
                <span className="font-display text-lg font-extrabold tabular-nums text-brand-950">
                  {tab === "wise" ? fmtScore(p.score) : fmtPct(p.pct)}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${(p.pct ?? 0) * 100}%`, background: p.color }} />
              </div>
              <div className="mt-1.5 flex gap-2 text-[11px] text-slate-500">
                <span>{p.elements} elementos</span>
                {(["critico", "atencao", "conforme"] as Tone[]).map((t) =>
                  p.tones[t] ? (
                    <span key={t} className={cn("flex items-center gap-1", TONE_CLASSES[t].text)}>
                      <span className={cn("size-1.5 rounded-full", TONE_CLASSES[t].dot)} />
                      {p.tones[t]} {TONE_LABEL[t].toLowerCase()}
                    </span>
                  ) : null,
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Cards */}
        {elements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nenhum elemento corresponde aos filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {elements.map((el) => (
              <ElementCard key={el.id} el={el} onOpen={() => setParams({ el: el.code, view: null, req: null })} />
            ))}
          </div>
        )}
        <Legend tab={tab} />
      </section>

      <ElementSheet
        code={openCode}
        assessmentId={openFramework.assessmentId}
        initialView={params.get("view")}
        focusRequirement={params.get("req")}
        perms={perms}
        blobEnabled={blobEnabled}
        unitId={unit.id}
        onClose={() => setParams({ el: null, view: null, req: null })}
        onNavigate={(code) => setParams({ el: code, view: null, req: null })}
        siblings={openFramework.elements.map((e) => e.code)}
      />
    </div>
  );
}

function HeroScore({
  title,
  value,
  suffix,
  pct,
  tone,
  grade,
  hint,
  active,
  onClick,
}: {
  title: string;
  value: string;
  suffix?: string;
  pct: number | null;
  tone: Tone;
  grade: Grade | null;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className={cn(
        "glass rounded-2xl border p-4 text-left backdrop-blur-md transition",
        active
          ? "border-white/30 bg-white/[0.14] shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]"
          : "border-white/10 bg-white/[0.05] hover:bg-white/[0.09]",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-brand-100/80">
        {title}
        <GradeBadge grade={grade} size="sm" />
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-[32px] font-extrabold leading-none tabular-nums">{value}</span>
        {suffix ? <span className="text-sm text-brand-100/70">{suffix}</span> : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className={cn("h-full rounded-full", TONE_CLASSES[tone].bar)} style={{ width: `${(pct ?? 0) * 100}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-brand-100/80">
        <span>{hint}</span>
        <span className="font-semibold">{TONE_LABEL[tone]}</span>
      </div>
    </button>
  );
}

function SiteGrade({ culture, compliance }: { culture: Grade | null; compliance: Grade | null }) {
  const g = siteGrade(culture, compliance);
  return (
    <div className="glass col-span-2 flex items-center gap-3 rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.04] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] backdrop-blur-md sm:col-span-1 sm:flex-col sm:justify-center sm:text-center">
      <GradeBadge grade={g} size="xl" />
      <div className="text-[11px] leading-tight text-brand-100/80">
        <div className="font-semibold text-white">Classe do site</div>
        {g ? (
          <>
            {GRADE_STAGE[g]}
            <br />
            Cultura {culture} · Compliance {compliance}
          </>
        ) : (
          "Avalie WISE e 12 Básicos"
        )}
      </div>
    </div>
  );
}

function Legend({ tab }: { tab: string }) {
  const items =
    tab === "wise"
      ? [
          ["conforme", "A · Interdependente: nota ≥ 3,75 (≥ 48,75 pts no site)"],
          ["atencao", "B · Independente: 2,5 a 3,74 (32,5 – 48,75)"],
          ["critico", "C · Dependente: 1,25 a 2,49 · D · Reativo: < 1,25"],
        ]
      : [
          ["conforme", "A · Managed Risk: ≥ 80%"],
          ["atencao", "B: 65% a 79%"],
          ["critico", "C: 40% a 64% · D: < 40% (item de risco 1 em Básico limita a 50%)"],
        ];
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
      {items.map(([t, label]) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", TONE_CLASSES[t as Tone].dot)} />
          {label}
        </span>
      ))}
    </div>
  );
}
