// Busca global: elementos, requisitos, evidências e planos de ação da unidade atual.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getWorkspace } from "@/server/context";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const { unit, cycle } = await getWorkspace();
  const contains = { contains: q, mode: "insensitive" as const };

  const [elements, requirements, evidences, actions] = await Promise.all([
    db.element.findMany({
      where: { OR: [{ name: contains }, { shortName: contains }, { code: contains }, { description: contains }] },
      take: 8,
      orderBy: [{ framework: "desc" }, { number: "asc" }],
    }),
    db.requirement.findMany({
      where: { OR: [{ text: contains }, { code: contains }] },
      include: { element: true },
      take: 12,
    }),
    unit
      ? db.evidence.findMany({
          where: { assessment: { unitId: unit.id, cycle }, OR: [{ name: contains }, { description: contains }] },
          include: { element: true },
          take: 8,
        })
      : [],
    unit
      ? db.actionPlan.findMany({
          where: { unitId: unit.id, OR: [{ what: contains }, { why: contains }, { how: contains }] },
          include: { element: true },
          take: 8,
        })
      : [],
  ]);

  const tab = (fw: string) => (fw === "WISE" ? "wise" : "basicos");
  return NextResponse.json({
    results: [
      ...elements.map((e) => ({
        type: "Elemento",
        title: `${e.code} · ${e.shortName}`,
        subtitle: e.name,
        href: `/?tab=${tab(e.framework)}&el=${e.code}`,
      })),
      ...requirements.map((r) => ({
        type: "Requisito",
        title: `${r.code}`,
        subtitle: r.text,
        href: `/?tab=${tab(r.element.framework)}&el=${r.element.code}&req=${r.id}`,
      })),
      ...evidences.map((e) => ({
        type: "Evidência",
        title: e.name,
        subtitle: `${e.element.code} · ${e.element.shortName}`,
        href: `/?tab=${tab(e.element.framework)}&el=${e.element.code}&view=evidencias`,
      })),
      ...actions.map((a) => ({
        type: "Plano de ação",
        title: a.what,
        subtitle: `${a.element.code} · ${a.element.shortName}`,
        href: `/acoes?q=${encodeURIComponent(a.what.slice(0, 40))}`,
      })),
    ],
  });
}
