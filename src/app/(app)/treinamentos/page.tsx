import { db } from "@/lib/db";
import { can, requireUser } from "@/server/context";
import { MhcView } from "@/components/trainings/mhc-view";

export default async function TrainingsPage() {
  const user = await requireUser();
  const [trainings, roles] = await Promise.all([
    db.training.findMany({ orderBy: { order: "asc" } }),
    db.jobRole.findMany({ orderBy: { order: "asc" }, include: { trainings: { select: { trainingId: true, value: true } } } }),
  ]);
  return (
    <MhcView
      canEdit={can(user.role, "admin")}
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
