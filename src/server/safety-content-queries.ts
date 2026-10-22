import "server-only";
import { db } from "@/lib/db";
import { getAllowedUnits, type CurrentUser } from "./context";

/** Quem vê um conteúdo: o autor, ou usuários de uma das unidades escolhidas (quando não é privado). */
export async function canViewContent(user: CurrentUser, contentId: string) {
  const c = await db.safetyContent.findUnique({ where: { id: contentId }, include: { units: true } });
  if (!c) return false;
  if (c.createdById === user.id) return true;
  if (c.visibility === "PRIVATE") return false;
  const allowed = new Set((await getAllowedUnits(user)).map((u) => u.id));
  return c.units.some((u) => allowed.has(u.unitId));
}

/** Conteúdos visíveis na unidade selecionada + os privados do próprio usuário. */
export async function listSafetyContents(user: CurrentUser, unitId: string) {
  const rows = await db.safetyContent.findMany({
    where: {
      OR: [{ createdById: user.id }, { visibility: "UNITS", units: { some: { unitId } } }],
    },
    include: {
      items: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      units: { include: { unit: { select: { id: true, name: true } } } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description ?? "",
    category: c.category,
    visibility: c.visibility,
    createdAt: c.createdAt.toISOString(),
    createdBy: c.createdBy?.name ?? null,
    mine: c.createdById === user.id,
    units: c.units.map((u) => u.unit),
    items: c.items.map((i) => ({ id: i.id, kind: i.kind, name: i.name, url: i.url, mimeType: i.mimeType, size: i.size })),
  }));
}

export type SafetyContentDTO = Awaited<ReturnType<typeof listSafetyContents>>[number];
