import { can, getOrCreateAssessment, getWorkspace } from "@/server/context";
import { loadOverview, unitMembers } from "@/server/queries";
import { Dashboard } from "@/components/dashboard/dashboard";
import { NoUnit } from "@/components/no-unit";

export default async function DashboardPage() {
  const { user, unit, cycle } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const [wiseA, basicsA] = await Promise.all([
    getOrCreateAssessment(unit.id, "WISE", cycle, user.id),
    getOrCreateAssessment(unit.id, "BASICS", cycle, user.id),
  ]);
  const [wise, basics, members] = await Promise.all([
    loadOverview(wiseA.id, "WISE"),
    loadOverview(basicsA.id, "BASICS"),
    unitMembers(unit.id),
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
    />
  );
}
