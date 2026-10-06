import Link from "next/link";
import { AlertTriangle, Flame, Lightbulb, SearchCheck, Siren } from "lucide-react";
import { getWorkspace } from "@/server/context";
import { unitMembers } from "@/server/queries";
import { loadSafetyOverview } from "@/server/incident-queries";
import { NoUnit } from "@/components/no-unit";
import { PageHeader } from "@/components/page-header";
import { IncidentsToolbar } from "@/components/incidents/incidents-toolbar";
import { IncidentExplorer } from "@/components/safety/incident-explorer";
import { SafetyPyramid } from "@/components/safety/pyramid";
import { DaysWithoutAccidentsPanel } from "@/components/safety/days-panel";

type SP = { nivel?: string; tipo?: string; hipo?: string; status?: string; area?: string; q?: string; view?: string };

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const sp = await searchParams;
  const [overview, members] = await Promise.all([loadSafetyOverview(unit.id), unitMembers(unit.id)]);
  const { incidents, days } = overview;
  const overdue = incidents.reduce((s, i) => s + i.actions.overdue, 0);
  const areas = [...new Set(incidents.map((i) => i.area))];
  const kpis = [
    { label: "Ocorrências", value: incidents.length, icon: Siren, tone: "text-brand-700 bg-brand-50" },
    { label: "HIPO", value: overview.hipo, icon: Flame, tone: "text-critico bg-critico-bg", href: "/incidentes?hipo=1" },
    { label: "Investigações abertas", value: overview.openInvestigations, icon: SearchCheck, tone: "text-accent-700 bg-accent-50", href: "/incidentes?status=abertas" },
    { label: "Ações vencidas", value: overdue, icon: AlertTriangle, tone: overdue ? "text-critico bg-critico-bg" : "text-conforme bg-conforme-bg", href: "/acoes?status=atrasadas" },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Segurança · Investigação de incidentes"
        title={unit.name}
        description="Reporte, investigue e acompanhe cada ocorrência até o encerramento: Reporte → Investigação → Plano de Ação → Lições Aprendidas."
        actions={<IncidentsToolbar unitId={unit.id} members={members} areas={areas} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <span className={`grid size-11 place-items-center rounded-xl ${k.tone}`}>
                <k.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-brand-950">{k.value}</p>
                <p className="text-xs font-medium text-slate-500">{k.label}</p>
              </div>
            </div>
          );
          return k.href ? (
            <Link key={k.label} href={k.href}>
              {body}
            </Link>
          ) : (
            <div key={k.label}>{body}</div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="eyebrow">Pirâmide de Heinrich / Bird</p>
              <p className="text-xs text-slate-500">Clique em um nível para ver as ocorrências.</p>
            </div>
            <Link href="/incidentes/licoes" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              <Lightbulb className="size-3.5" /> Lições aprendidas
            </Link>
          </div>
          <SafetyPyramid counts={overview.counts} hipo={overview.hipo} />
        </div>
        <DaysWithoutAccidentsPanel days={days} baseDate={overview.unit.safetyStartDate} />
      </div>

      <IncidentExplorer
        key={JSON.stringify(sp)}
        incidents={incidents}
        initialView={sp.view === "timeline" || sp.view === "agenda" ? sp.view : "lista"}
        initial={{
          cls: sp.hipo === "1" ? "HIPO" : (sp.nivel ?? sp.tipo ?? ""),
          status: sp.status ?? "",
          area: sp.area ?? "",
          q: sp.q ?? "",
        }}
      />
    </div>
  );
}
