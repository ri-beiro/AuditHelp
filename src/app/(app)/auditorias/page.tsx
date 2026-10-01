import { db } from "@/lib/db";
import { can, getWorkspace } from "@/server/context";
import { unitMembers } from "@/server/queries";
import { AUDIT_TEMPLATES, getTemplate, scoreAudit } from "@/lib/audit-templates";
import { complianceGrade } from "@/lib/scoring";
import { NoUnit } from "@/components/no-unit";
import { AuditsView } from "@/components/audits/audits-view";

export default async function AuditsPage() {
  const { user, unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const [audits, members] = await Promise.all([
    db.audit.findMany({
      where: { unitId: unit.id },
      include: {
        answers: { select: { itemCode: true, value: true } },
        auditor: { select: { name: true } },
        _count: { select: { actionPlans: true } },
      },
      orderBy: { auditDate: "desc" },
    }),
    unitMembers(unit.id),
  ]);
  return (
    <AuditsView
      unit={{ id: unit.id, name: unit.name }}
      canCreate={can(user.role, "score")}
      currentUserId={user.id}
      members={members}
      templates={AUDIT_TEMPLATES.map((t) => ({
        code: t.code,
        name: t.name,
        shortName: t.shortName,
        description: t.description,
        icon: t.icon,
        items: t.sections.reduce((n, s) => n + s.items.length, 0),
        critical: t.sections.reduce((n, s) => n + s.items.filter((i) => i.critical).length, 0),
      }))}
      audits={audits.map((a) => {
        const tpl = getTemplate(a.template);
        const sc = tpl ? scoreAudit(tpl, Object.fromEntries(a.answers.map((x) => [x.itemCode, x.value]))) : null;
        return {
          id: a.id,
          template: a.template,
          templateName: tpl?.shortName ?? a.template,
          contractor: a.contractor,
          auditDate: a.auditDate.toISOString(),
          auditor: a.auditor?.name ?? null,
          status: a.status,
          pct: sc?.pct ?? null,
          grade: complianceGrade(sc?.pct ?? null),
          answered: sc?.answered ?? 0,
          total: sc?.total ?? 0,
          nc: sc?.naoConformes ?? 0,
          criticalNc: sc?.criticalNc ?? 0,
          actions: a._count.actionPlans,
        };
      })}
    />
  );
}
