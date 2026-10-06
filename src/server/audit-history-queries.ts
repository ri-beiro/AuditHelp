import "server-only";
import { db } from "@/lib/db";
import { getTemplate, scoreAudit } from "@/lib/audit-templates";
import { complianceGrade } from "@/lib/scoring";

/**
 * Histórico unificado: registros manuais (AuditRecord) + auditorias de contratadas
 * realizadas no sistema, que entram automaticamente com a nota calculada pelo checklist.
 */
export async function loadAuditHistory(unitId: string) {
  const [records, audits] = await Promise.all([
    db.auditRecord.findMany({
      where: { unitId },
      include: { actionPlans: { select: { status: true, dueDate: true } } },
      orderBy: { date: "desc" },
    }),
    db.audit.findMany({
      where: { unitId },
      include: {
        answers: { select: { itemCode: true, value: true } },
        auditor: { select: { name: true } },
        actionPlans: { select: { status: true, dueDate: true } },
      },
      orderBy: { auditDate: "desc" },
    }),
  ]);
  const now = new Date();
  const acts = (list: { status: string; dueDate: Date | null }[]) => {
    const open = list.filter((a) => a.status === "ABERTA" || a.status === "EM_ANDAMENTO");
    return { total: list.length, open: open.length, overdue: open.filter((a) => a.dueDate && a.dueDate < now).length };
  };
  const rows = [
    ...records.map((r) => {
      const pct = r.maxScore > 0 ? r.score / r.maxScore : null;
      return {
        id: r.id,
        source: "manual" as const,
        date: r.date.toISOString(),
        type: r.type,
        area: r.area,
        auditor: r.auditor,
        score: r.score,
        maxScore: r.maxScore,
        pct,
        grade: complianceGrade(pct),
        result: r.result ?? "",
        reportUrl: r.reportUrl,
        notes: r.notes ?? "",
        href: null as string | null,
        inProgress: false,
        actions: acts(r.actionPlans),
      };
    }),
    ...audits.flatMap((a) => {
      const tpl = getTemplate(a.template);
      if (!tpl) return [];
      const sc = scoreAudit(tpl, Object.fromEntries(a.answers.map((x) => [x.itemCode, x.value])));
      if (sc.pct === null) return [];
      return [
        {
          id: a.id,
          source: "contratada" as const,
          date: a.auditDate.toISOString(),
          type: `Contratada · ${tpl.shortName}`,
          area: tpl.shortName,
          auditor: a.auditor?.name ?? "—",
          score: Math.round(sc.pct * 1000) / 10,
          maxScore: 100,
          pct: sc.pct,
          grade: complianceGrade(sc.pct),
          result: `${a.contractor}${sc.criticalNc ? ` · ${sc.criticalNc} NC crítica(s)` : ""}`,
          reportUrl: null,
          notes: a.conclusion ?? "",
          href: `/auditorias/${a.id}`,
          inProgress: a.status !== "CONCLUIDA",
          actions: acts(a.actionPlans),
        },
      ];
    }),
  ];
  return rows.sort((x, y) => y.date.localeCompare(x.date));
}

export type AuditHistoryRow = Awaited<ReturnType<typeof loadAuditHistory>>[number];
