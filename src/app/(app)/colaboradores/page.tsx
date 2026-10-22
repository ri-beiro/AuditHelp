import { db } from "@/lib/db";
import { can, getWorkspace } from "@/server/context";
import { NoUnit } from "@/components/no-unit";
import { EmployeesView } from "@/components/employees/employees-view";

export default async function EmployeesPage() {
  const { user, unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const [trainings, roles, employees] = await Promise.all([
    db.training.findMany({ orderBy: { order: "asc" } }),
    db.jobRole.findMany({ orderBy: { order: "asc" }, include: { trainings: { where: { value: "S" }, select: { trainingId: true } } } }),
    db.employee.findMany({ where: { unitId: unit.id }, include: { trainings: true }, orderBy: [{ team: "asc" }, { name: "asc" }] }),
  ]);
  return (
    <EmployeesView
      unit={{ id: unit.id, name: unit.name }}
      canEdit={can(user.role, "action")}
      canDelete={can(user.role, "score")}
      trainings={trainings.map((t) => ({ id: t.id, name: t.name, validityDays: t.validityDays, noExpiry: t.noExpiry }))}
      roles={roles.map((r) => ({ id: r.id, name: r.name, required: r.trainings.map((c) => c.trainingId) }))}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        team: e.team,
        roleId: e.roleId,
        roleLabel: e.roleLabel,
        active: e.active,
        records: Object.fromEntries(
          e.trainings.map((r) => [r.trainingId, { doneAt: r.doneAt.toISOString(), validUntil: r.validUntil?.toISOString() ?? null }]),
        ),
      }))}
    />
  );
}
