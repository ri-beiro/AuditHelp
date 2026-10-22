import { can, getOrCreateAssessment, getWorkspace } from "@/server/context";
import { loadOverview, unitMembers } from "@/server/queries";
import { Dashboard } from "@/components/dashboard/dashboard";
import { NoUnit } from "@/components/no-unit";
import { db } from "@/lib/db";
import { loadSafetyOverview } from "@/server/incident-queries";
import { DashboardSafetyStrip } from "@/components/safety/dashboard-strip";

export default async function DashboardPage() {
  const { user, unit, cycle } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const today = new Date(new Date().toISOString().slice(0, 10));
  // Tudo em paralelo: cada avaliação é criada (se preciso) e carregada na sequência, sem esperar as demais.
  const overview = (fw: "WISE" | "BASICS") => getOrCreateAssessment(unit.id, fw, cycle, user.id).then((a) => loadOverview(a.id, fw, unit.id));
  const [wise, basics, members, safety, overdue] = await Promise.all([
    overview("WISE"),
    overview("BASICS"),
    unitMembers(unit.id),
    loadSafetyOverview(unit.id),
    db.actionPlan.count({ where: { unitId: unit.id, status: { in: ["ABERTA", "EM_ANDAMENTO"] }, dueDate: { lt: today } } }),
  ]);
  return (
    <Dashboard
      unit={{ id: unit.id, name: unit.name }}
      cycle={cycle}
      wise={wise}
      basics={basics}
      members={members}
      perms={{
        score: can(user.role, "score"),
        editElement: can(user.role, "editElement"),
        evidence: can(user.role, "evidence"),
        action: can(user.role, "action"),
      }}
      blobEnabled={!!process.env.BLOB_READ_WRITE_TOKEN}
      safety={<DashboardSafetyStrip overview={safety} overdueActions={overdue} />}
    />
  );
}
