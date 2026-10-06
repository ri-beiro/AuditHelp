import { db } from "@/lib/db";
import { getWorkspace } from "@/server/context";
import { NoUnit } from "@/components/no-unit";
import { PageHeader } from "@/components/page-header";
import { LessonsBrowser } from "@/components/incidents/lessons-browser";
import type { IncidentTypeKey } from "@/lib/incidents";

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ q?: string; todas?: string }> }) {
  const { user, units, unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const { q } = await searchParams;
  // Lições aprovadas de todas as unidades que o usuário acessa: o aprendizado é compartilhado.
  const rows = await db.incident.findMany({
    where: { unitId: { in: units.map((u) => u.id) }, approvedAt: { not: null } },
    include: { unit: { select: { name: true } }, approvedBy: { select: { name: true } } },
    orderBy: { occurredAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <PageHeader
        eyebrow="Segurança · Banco de lições aprendidas"
        title="Lições Aprendidas"
        description={`Lições aprovadas das investigações ${user.role === "ADMIN" ? "de todas as unidades" : "das suas unidades"}. Use nos DDS, reuniões de CDs e alertas de segurança.`}
      />
      <LessonsBrowser
        initialQuery={q ?? ""}
        currentUnit={unit.name}
        lessons={rows.map((i) => ({
          id: i.id,
          number: i.number,
          unit: i.unit.name,
          occurredAt: i.occurredAt.toISOString(),
          area: i.area,
          type: i.type as IncidentTypeKey,
          hipo: i.hipo,
          title: i.title,
          whatHappened: i.whatHappened ?? "",
          rootCause: i.rootCause ?? "",
          howToPrevent: i.howToPrevent ?? "",
          goodPractices: i.goodPractices ?? "",
          sharedWith: i.sharedWith ?? "",
          approvedBy: i.approvedBy?.name ?? null,
          approvedAt: i.approvedAt!.toISOString(),
        }))}
      />
    </div>
  );
}
