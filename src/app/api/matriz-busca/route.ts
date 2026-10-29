// Busca por palavra-chave nos critérios dos níveis (WISE: enunciados de cada nível; Básicos: Básico/Parcial/Significativo).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/context";

const LEVEL_NAME: Record<number, string> = {
  1: "Nível Básico",
  2: "Nível Aceitável",
  3: "Bom Nível",
  4: "Excelente Nível",
  5: "World Class",
};
const CRITERIA_LABEL: [string, string][] = [
  ["basic", "Básico"],
  ["partial", "Parcial"],
  ["significant", "Significativo"],
  ["compliant", "Conforme"],
  // WISE: direcionamento da linha
  ["n0", "Nota 0"],
  ["n1", "Nota 1"],
  ["n2", "Nota 2"],
  ["verify", "O que verificar"],
  ["evidence", "Evidências"],
];

type Field = { label: string; text: string; norm: string };
type Entry = {
  id: string;
  code: string;
  framework: "WISE" | "BASICS";
  element: { code: string; number: number; shortName: string };
  fields: Field[];
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// A matriz é estática (só muda no seed), então fica em memória por alguns minutos.
let cache: { at: number; entries: Entry[] } | null = null;
const TTL = 10 * 60 * 1000;

async function load(): Promise<Entry[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.entries;
  const reqs = await db.requirement.findMany({
    select: {
      id: true,
      code: true,
      text: true,
      level: true,
      criteria: true,
      order: true,
      element: { select: { code: true, number: true, shortName: true, framework: true } },
    },
    orderBy: [{ element: { framework: "desc" } }, { element: { number: "asc" } }, { order: "asc" }],
  });
  const entries = reqs.map((r): Entry => {
    const fields: Field[] = [];
    const isWise = r.element.framework === "WISE";
    fields.push({
      label: isWise && r.level ? `Nível ${r.level} · ${LEVEL_NAME[r.level]}` : "Requisito",
      text: r.text,
      norm: norm(r.text),
    });
    const crit = (r.criteria ?? {}) as Record<string, string | undefined>;
    for (const [k, label] of CRITERIA_LABEL) {
      const t = crit[k];
      if (t) fields.push({ label, text: t, norm: norm(t) });
    }
    return {
      id: r.id,
      code: r.code,
      framework: isWise ? "WISE" : "BASICS",
      element: { code: r.element.code, number: r.element.number, shortName: r.element.shortName },
      fields,
    };
  });
  cache = { at: Date.now(), entries };
  return entries;
}

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ total: 0, counts: {}, results: [] });
  const terms = norm(q).split(/\s+/).filter(Boolean);

  const entries = await load();
  const counts: Record<string, number> = {};
  const results: {
    id: string;
    code: string;
    framework: Entry["framework"];
    element: Entry["element"];
    matches: { label: string; text: string }[];
  }[] = [];
  for (const e of entries) {
    // Todos os termos precisam aparecer no requisito (em qualquer um dos critérios).
    const all = e.fields.map((f) => f.norm).join(" ");
    if (!terms.every((t) => all.includes(t))) continue;
    counts[e.element.code] = (counts[e.element.code] ?? 0) + 1;
    const matches = e.fields.filter((f) => terms.some((t) => f.norm.includes(t))).map(({ label, text }) => ({ label, text }));
    results.push({ id: e.id, code: e.code, framework: e.framework, element: e.element, matches });
  }
  return NextResponse.json({ total: results.length, counts, results: results.slice(0, 150) });
}
