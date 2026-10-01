import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, getWorkspace, assertUnitAccess } from "@/server/context";
import { unitMembers } from "@/server/queries";
import { loadAudit } from "@/server/audits";
import { getTemplate } from "@/lib/audit-templates";
import { AuditRunner } from "@/components/audits/audit-runner";

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getWorkspace();
  const audit = await db.audit.findUnique({
    where: { id },
    include: { unit: true, auditor: { select: { id: true, name: true } } },
  });
  if (!audit) notFound();
  await assertUnitAccess(user, audit.unitId);
  const template = getTemplate(audit.template);
  if (!template) notFound();
  const [state, members, elements] = await Promise.all([
    loadAudit(id),
    unitMembers(audit.unitId),
    db.element.findMany({ where: { code: { in: ["B11", "W13"] } }, orderBy: { code: "asc" } }),
  ]);
  return (
    <AuditRunner
      audit={{
        id: audit.id,
        unitId: audit.unitId,
        unitName: audit.unit.name,
        contractor: audit.contractor,
        auditDate: audit.auditDate.toISOString(),
        auditorId: audit.auditor?.id ?? null,
        auditorName: audit.auditor?.name ?? null,
        accompaniedBy: audit.accompaniedBy ?? "",
        strengths: audit.strengths ?? "",
        opportunities: audit.opportunities ?? "",
        conclusion: audit.conclusion ?? "",
      }}
      template={template}
      initialState={state}
      members={members}
      elements={elements.map((e) => ({ id: e.id, code: e.code, label: `${e.code} · ${e.shortName}` }))}
      perms={{
        score: can(user.role, "score"),
        evidence: can(user.role, "evidence"),
        action: can(user.role, "action"),
        admin: can(user.role, "admin"),
      }}
      blobEnabled={!!process.env.BLOB_READ_WRITE_TOKEN}
    />
  );
}
