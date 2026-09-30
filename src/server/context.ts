import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Framework, Role } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const UNIT_COOKIE = "wise_unit";
export const CYCLE_COOKIE = "wise_cycle";

export type Permission = "score" | "editElement" | "evidence" | "action" | "admin";

const PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["score", "editElement", "evidence", "action", "admin"],
  AUDITOR: ["score", "editElement", "evidence", "action"],
  RESPONSAVEL: ["evidence", "action"],
};

export function can(role: Role, perm: Permission) {
  return PERMISSIONS[role].includes(perm);
}

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { units: { include: { unit: true } } },
  });
  if (!user || !user.active) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(perm: Permission) {
  const user = await requireUser();
  if (!can(user.role, perm)) throw new Error("Sem permissão para esta operação.");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export const getAllowedUnits = cache(async (user: CurrentUser) => {
  if (user.role === "ADMIN") {
    return db.unit.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }
  return user.units.map((m) => m.unit).filter((u) => u.active);
});

export async function assertUnitAccess(user: CurrentUser, unitId: string) {
  const units = await getAllowedUnits(user);
  if (!units.some((u) => u.id === unitId)) throw new Error("Sem acesso a esta unidade.");
}

export const getWorkspace = cache(async () => {
  const user = await requireUser();
  const units = await getAllowedUnits(user);
  const jar = await cookies();
  const unitId = jar.get(UNIT_COOKIE)?.value;
  const unit = units.find((u) => u.id === unitId) ?? units[0] ?? null;
  const cycle = jar.get(CYCLE_COOKIE)?.value ?? String(new Date().getFullYear());
  return { user, units, unit, cycle };
});

export async function getOrCreateAssessment(unitId: string, framework: Framework, cycle: string, userId?: string) {
  return db.assessment.upsert({
    where: { unitId_framework_cycle: { unitId, framework, cycle } },
    update: {},
    create: { unitId, framework, cycle, createdById: userId },
  });
}

export async function getCycles(unitId: string) {
  const rows = await db.assessment.findMany({
    where: { unitId },
    select: { cycle: true },
    distinct: ["cycle"],
    orderBy: { cycle: "desc" },
  });
  const set = new Set(rows.map((r) => r.cycle));
  set.add(String(new Date().getFullYear()));
  return [...set].sort().reverse();
}
