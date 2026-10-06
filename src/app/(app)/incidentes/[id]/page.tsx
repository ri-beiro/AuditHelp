import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { assertUnitAccess, can, getWorkspace } from "@/server/context";
import { unitMembers } from "@/server/queries";
import { loadIncidentDetail } from "@/server/incident-queries";
import { IncidentWorkflow } from "@/components/incidents/incident-workflow";

export default async function IncidentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ etapa?: string }> }) {
  const [{ id }, { etapa }] = await Promise.all([params, searchParams]);
  const { user } = await getWorkspace();
  const incident = await loadIncidentDetail(id);
  if (!incident) notFound();
  await assertUnitAccess(user, incident.unitId);
  const [members, elements, areas] = await Promise.all([
    unitMembers(incident.unitId),
    db.element.findMany({ orderBy: [{ framework: "desc" }, { number: "asc" }] }),
    db.incident.findMany({ where: { unitId: incident.unitId }, select: { area: true }, distinct: ["area"] }),
  ]);
  const canManage = can(user.role, "score") || incident.responsibleId === user.id || incident.reportedById === user.id;
  return (
    <IncidentWorkflow
      key={incident.id}
      initial={incident}
      initialStep={etapa}
      ctx={{
        canManage,
        canApprove: can(user.role, "score"),
        isAdmin: can(user.role, "admin"),
        blobEnabled: !!process.env.BLOB_READ_WRITE_TOKEN,
        members,
        elements: elements.map((e) => ({ id: e.id, code: e.code, label: `${e.code} · ${e.shortName}` })),
        areas: areas.map((a) => a.area),
      }}
    />
  );
}
