import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/server/context";
import { AdminView } from "@/components/admin-view";

export default async function AdminPage() {
  const user = await requireUser();
  if (!can(user.role, "admin")) redirect("/");
  const [units, users] = await Promise.all([
    db.unit.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ include: { units: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <AdminView
      currentUserId={user.id}
      units={units.map((u) => ({ id: u.id, name: u.name, code: u.code, city: u.city ?? "", active: u.active }))}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        unitIds: u.units.map((m) => m.unitId),
      }))}
    />
  );
}
