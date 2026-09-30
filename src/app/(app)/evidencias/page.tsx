import { db } from "@/lib/db";
import { getWorkspace } from "@/server/context";
import { NoUnit } from "@/components/no-unit";
import { EvidenceLibrary } from "@/components/evidence-library";

export default async function EvidencesPage() {
  const { unit, cycle } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const evidences = await db.evidence.findMany({
    where: { assessment: { unitId: unit.id, cycle } },
    include: {
      element: { select: { code: true, shortName: true, framework: true } },
      requirement: { select: { code: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <EvidenceLibrary
      unitName={unit.name}
      cycle={cycle}
      items={evidences.map((e) => ({
        id: e.id,
        name: e.name,
        url: e.url,
        kind: e.kind,
        mimeType: e.mimeType,
        description: e.description,
        elementCode: e.element.code,
        elementName: e.element.shortName,
        framework: e.element.framework,
        requirementCode: e.requirement?.code ?? null,
        uploadedBy: e.uploadedBy?.name ?? null,
        createdAt: e.createdAt.toISOString(),
      }))}
    />
  );
}
