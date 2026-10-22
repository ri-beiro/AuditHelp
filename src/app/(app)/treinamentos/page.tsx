import { db } from "@/lib/db";
import { can, getWorkspace } from "@/server/context";
import { MhcView } from "@/components/trainings/mhc-view";

export default async function TrainingsPage() {
  const { user, unit } = await getWorkspace();
  const [trainings, roles, employees] = await Promise.all([
    db.training.findMany({ orderBy: { order: "asc" } }),
    db.jobRole.findMany({ orderBy: { order: "asc" }, include: { trainings: { select: { trainingId: true, value: true } } } }),
    unit
      ? db.employee.findMany({ where: { unitId: unit.id, active: true }, include: { trainings: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);
  return (
    <MhcView
      canEdit={can(user.role, "admin")}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        roleId: e.roleId,
        records: Object.fromEntries(e.trainings.map((r) => [r.trainingId, { doneAt: r.doneAt.toISOString(), validUntil: r.validUntil?.toISOString() ?? null }])),
      }))}
      trainings={trainings.map((t) => ({
        id: t.id,
        name: t.name,
        validityDays: t.validityDays,
        noExpiry: t.noExpiry,
        method: t.method,
        effectiveness: t.effectiveness,
        passingScore: t.passingScore,
      }))}
      roles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        values: Object.fromEntries(r.trainings.map((c) => [c.trainingId, c.value])) as Record<string, "S" | "N" | "NA">,
      }))}
    />
  );
}
