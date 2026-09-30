import { db } from "@/lib/db";
import { can, getWorkspace } from "@/server/context";
import { serializeAction, unitMembers } from "@/server/queries";
import { NoUnit } from "@/components/no-unit";
import { ActionsView } from "@/components/actions/actions-view";

export default async function ActionsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { user, unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const { q } = await searchParams;
  const [actions, elements, members] = await Promise.all([
    db.actionPlan.findMany({
      where: { unitId: unit.id },
      include: { owner: { select: { id: true, name: true } }, requirement: { select: { code: true, text: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    db.element.findMany({ include: { pillar: true }, orderBy: [{ framework: "desc" }, { number: "asc" }] }),
    unitMembers(unit.id),
  ]);
  return (
    <ActionsView
      unit={{ id: unit.id, name: unit.name }}
      initialQuery={q ?? ""}
      canEdit={can(user.role, "action")}
      actions={actions.map((a) => ({
        ...serializeAction(a),
        requirementLabel: a.requirement ? `${a.requirement.code} — ${a.requirement.text}` : null,
      }))}
      elements={elements.map((e) => ({
        id: e.id,
        code: e.code,
        framework: e.framework,
        label: `${e.code} · ${e.shortName}`,
        pillarId: e.pillar.id,
        pillarName: `${e.framework === "WISE" ? "WISE" : "Básicos"} · ${e.pillar.name}`,
      }))}
      members={members}
    />
  );
}
