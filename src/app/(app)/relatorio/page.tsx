import { db } from "@/lib/db";
import { can, getOrCreateAssessment, getWorkspace } from "@/server/context";
import { loadOverview } from "@/server/queries";
import { NoUnit } from "@/components/no-unit";
import { ClosingReportView } from "@/components/report/closing-report";

export default async function ReportPage() {
  const { user, unit, cycle } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const [wiseA, basicsA] = await Promise.all([
    getOrCreateAssessment(unit.id, "WISE", cycle, user.id),
    getOrCreateAssessment(unit.id, "BASICS", cycle, user.id),
  ]);
  const [wise, basics, report, opinions, n1Actions, level1Gaps] = await Promise.all([
    loadOverview(wiseA.id, "WISE"),
    loadOverview(basicsA.id, "BASICS"),
    db.closingReport.findUnique({ where: { assessmentId: wiseA.id }, include: { updatedBy: { select: { name: true } } } }),
    db.elementAssessment.findMany({
      where: { assessmentId: wiseA.id },
      select: { elementId: true, summary: true, recommendations: true },
    }),
    db.actionPlan.findMany({
      where: { unitId: unit.id, status: { in: ["ABERTA", "EM_ANDAMENTO"] } },
      include: { element: { select: { code: true, shortName: true } }, owner: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 30,
    }),
    db.requirementScore.findMany({
      where: { assessmentId: basicsA.id, value: "BASIC", requirement: { riskLevel: 1 } },
      include: { requirement: { select: { code: true, text: true } } },
    }),
  ]);
  return (
    <ClosingReportView
      unitName={unit.name}
      cycle={cycle}
      assessmentId={wiseA.id}
      canEdit={can(user.role, "editElement")}
      wise={wise}
      basics={basics}
      report={{
        auditDates: report?.auditDates ?? "",
        auditors: report?.auditors ?? "",
        format: report?.format ?? "",
        highlights: report?.highlights ?? "",
        quotes: report?.quotes ?? "",
        conclusion: report?.conclusion ?? "",
        groups: (report?.groups as Record<string, { strengths: string; opportunities: string }> | null) ?? {},
        updatedAt: report?.updatedAt?.toISOString() ?? null,
        updatedBy: report?.updatedBy?.name ?? null,
      }}
      opinions={Object.fromEntries(opinions.map((o) => [o.elementId, { summary: o.summary ?? "", recommendations: o.recommendations ?? "" }]))}
      level1Gaps={level1Gaps.map((g) => ({ code: g.requirement.code, text: g.requirement.text }))}
      actions={n1Actions.map((a) => ({
        id: a.id,
        what: a.what,
        element: `${a.element.code} · ${a.element.shortName}`,
        owner: a.owner?.name ?? null,
        dueDate: a.dueDate?.toISOString() ?? null,
        priority: a.priority,
        spheraId: a.spheraId,
      }))}
    />
  );
}
