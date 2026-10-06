import { db } from "@/lib/db";
import { can, getWorkspace } from "@/server/context";
import { NoUnit } from "@/components/no-unit";
import { RoadSafetyView } from "@/components/road-safety/road-safety-view";

export default async function RoadSafetyPage() {
  const { user, unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const drivers = await db.driver.findMany({ where: { unitId: unit.id }, orderBy: [{ carrier: "asc" }, { name: "asc" }] });
  const iso = (d: Date | null) => d?.toISOString() ?? null;
  return (
    <RoadSafetyView
      unit={{ id: unit.id, name: unit.name }}
      canEdit={can(user.role, "action")}
      canDelete={can(user.role, "score")}
      drivers={drivers.map((d) => ({
        id: d.id,
        name: d.name,
        cpf: d.cpf ?? "",
        plate: d.plate ?? "",
        carrier: d.carrier,
        active: d.active,
        notes: d.notes ?? "",
        onboardingStatus: d.onboardingStatus,
        onboardingAt: iso(d.onboardingAt),
        onboardingValid: iso(d.onboardingValid),
        defensiveStatus: d.defensiveStatus,
        defensiveAt: iso(d.defensiveAt),
        defensiveValid: iso(d.defensiveValid),
      }))}
    />
  );
}
