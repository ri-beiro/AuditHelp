import { db } from "@/lib/db";
import { getOrCreateAssessment, getWorkspace } from "@/server/context";
import { loadOverview } from "@/server/queries";
import { NoUnit } from "@/components/no-unit";
import { IndicatorsView } from "@/components/charts/indicators-view";
import { loadSafetyOverview } from "@/server/incident-queries";
import { SafetyIndicators } from "@/components/safety/safety-indicators";
import { IndicatorTabs } from "@/components/safety/indicator-tabs";

export default async function IndicatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { user, unit, cycle } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const { aba } = await searchParams;
  if (aba === "seguranca") {
    const overview = await loadSafetyOverview(unit.id);
    return (
      <div className="mx-auto max-w-[1500px] space-y-6">
        <IndicatorTabs active="seguranca" unitName={unit.name} />
        <SafetyIndicators overview={overview} />
      </div>
    );
  }
  const [wiseA, basicsA] = await Promise.all([
    getOrCreateAssessment(unit.id, "WISE", cycle, user.id),
    getOrCreateAssessment(unit.id, "BASICS", cycle, user.id),
  ]);
  const [wise, basics, snapshots, actions] = await Promise.all([
    loadOverview(wiseA.id, "WISE"),
    loadOverview(basicsA.id, "BASICS"),
    db.scoreSnapshot.findMany({
      where: { unitId: unit.id, scope: "OVERALL" },
      orderBy: { month: "asc" },
    }),
    db.actionPlan.groupBy({
      by: ["status"],
      where: { unitId: unit.id },
      _count: true,
    }),
  ]);

  // últimos 12 meses
  const months: string[] = [];
  const d = new Date();
  for (let i = 11; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(
      `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  const evolution = months.map((month) => ({
    month,
    wise:
      snapshots.find((s) => s.month === month && s.framework === "WISE")
        ?.percent ?? null,
    basics:
      snapshots.find((s) => s.month === month && s.framework === "BASICS")
        ?.percent ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <IndicatorTabs active="wise" unitName={unit.name} />
      <IndicatorsView
        unitName={unit.name}
        cycle={cycle}
        wise={wise}
        basics={basics}
        evolution={evolution}
        actionsByStatus={Object.fromEntries(
          actions.map((a) => [a.status, a._count]),
        )}
      />
    </div>
  );
}
