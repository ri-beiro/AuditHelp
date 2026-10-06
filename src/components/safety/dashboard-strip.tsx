import Link from "next/link";
import { AlertTriangle, ArrowRight, Flame, SearchCheck } from "lucide-react";
import type { SafetyOverview } from "@/server/incident-queries";
import { PYRAMID_LEVELS } from "@/lib/incidents";
import { fmtDate } from "@/lib/utils";
import { HipoBadge, TypeBadge } from "@/components/incidents/bits";
import { DaysWithoutAccidentsPanel } from "./days-panel";

/** Faixa executiva de segurança no Dashboard: dias sem acidentes, pirâmide resumida, HIPOs recentes e alertas. */
export function DashboardSafetyStrip({ overview, overdueActions }: { overview: SafetyOverview; overdueActions: number }) {
  const recent = overview.incidents.filter((i) => !i.closed).slice(0, 4);
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <DaysWithoutAccidentsPanel days={overview.days} baseDate={overview.unit.safetyStartDate} showHistory={false} />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Segurança · Ocorrências</p>
          <Link href="/indicadores?aba=seguranca" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
            Indicadores <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PYRAMID_LEVELS.map((l) => (
            <Link
              key={l.key}
              href={`/incidentes?nivel=${l.key}`}
              className="rounded-xl border border-slate-100 p-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-soft"
              style={{ borderTop: `3px solid ${l.color}` }}
            >
              <p className="text-xl font-extrabold tabular-nums text-brand-950">{l.types.reduce((s, t) => s + overview.counts[t], 0)}</p>
              <p className="truncate text-[10px] font-medium text-slate-500">{l.label}</p>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/incidentes?hipo=1" className="inline-flex items-center gap-1 rounded-full bg-critico-bg px-2.5 py-1 font-semibold text-critico hover:underline">
            <Flame className="size-3.5" /> {overview.hipo} HIPO
          </Link>
          <Link href="/incidentes?status=abertas" className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 hover:underline">
            <SearchCheck className="size-3.5" /> {overview.openInvestigations} investigação(ões) aberta(s)
          </Link>
          {overdueActions ? (
            <Link href="/acoes?status=atrasadas" className="inline-flex items-center gap-1 rounded-full bg-critico px-2.5 py-1 font-semibold text-white hover:opacity-90">
              <AlertTriangle className="size-3.5" /> {overdueActions} ação(ões) vencida(s)
            </Link>
          ) : null}
        </div>
        {recent.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {recent.map((i) => (
              <li key={i.id}>
                <Link href={`/incidentes/${i.id}`} className="flex items-center gap-2 py-1.5 hover:text-brand-800">
                  <span className="w-16 shrink-0 text-xs tabular-nums text-slate-500">{fmtDate(i.occurredAt)}</span>
                  {i.hipo ? <HipoBadge /> : <TypeBadge type={i.type} />}
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{i.title}</span>
                  <span className="text-xs font-semibold tabular-nums text-slate-500">{i.progress}%</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">Nenhuma investigação em aberto.</p>
        )}
      </div>
    </section>
  );
}
