import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db";
import { getCycles, getWorkspace } from "@/server/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, units, unit, cycle } = await getWorkspace();
  const today = new Date(new Date().toISOString().slice(0, 10));
  const [cycles, overdue] = unit
    ? await Promise.all([
        getCycles(unit.id),
        db.actionPlan.count({ where: { unitId: unit.id, status: { in: ["ABERTA", "EM_ANDAMENTO"] }, dueDate: { lt: today } } }),
      ])
    : [[cycle], 0];
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block print:hidden">
        <Sidebar isAdmin={user.role === "ADMIN"} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          units={units.map((u) => ({ id: u.id, name: u.name }))}
          unitId={unit?.id ?? null}
          cycles={cycles}
          cycle={cycle}
          user={{ name: user.name, role: user.role }}
          overdue={overdue}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
