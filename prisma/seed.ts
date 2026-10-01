// Popula o catálogo (13 elementos WISE + 12 Básicos com seus requisitos em branco),
// uma unidade inicial e o usuário administrador. Idempotente: pode ser executado várias vezes.
import { PrismaClient, Framework, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import wiseMatrix from "./data/wise-matrix.json";
import basicsChecklist from "./data/basics-checklist.json";
import {
  BASICS_ELEMENTS,
  BASICS_PILLARS,
  WISE_ELEMENTS,
  WISE_PILLARS,
  type ElementDef,
  type PillarDef,
} from "../src/lib/catalog";

const prisma = new PrismaClient();

type SeedRequirement = {
  code: string;
  text: string;
  level?: number;
  dimension?: string;
  riskLevel?: number;
  criteria?: Record<string, string | null>;
};

async function upsertPillars(framework: Framework, pillars: PillarDef[]) {
  const map = new Map<string, string>();
  for (const p of pillars) {
    const row = await prisma.pillar.upsert({
      where: { framework_name: { framework, name: p.name } },
      update: { order: p.order, color: p.color },
      create: { framework, ...p },
    });
    map.set(p.name, row.id);
  }
  return map;
}

async function upsertElement(
  framework: Framework,
  def: ElementDef,
  pillarId: string,
  glossary: string | null,
  requirements: SeedRequirement[],
) {
  const code = `${framework === "WISE" ? "W" : "B"}${def.number}`;
  const data = {
    name: def.name,
    shortName: def.shortName,
    description: def.description,
    objective: def.objective,
    icon: def.icon,
    glossary,
    pillarId,
  };
  const element = await prisma.element.upsert({
    where: { code },
    update: data,
    create: { framework, number: def.number, code, ...data },
  });
  for (const [i, r] of requirements.entries()) {
    const reqData = {
      order: i + 1,
      text: r.text,
      level: r.level ?? null,
      dimension: r.dimension ?? null,
      riskLevel: r.riskLevel ?? null,
      criteria: r.criteria ?? undefined,
    };
    await prisma.requirement.upsert({
      where: { code: `${code}-${r.code}` },
      update: reqData,
      create: { elementId: element.id, code: `${code}-${r.code}`, ...reqData },
    });
  }
  return element;
}

async function main() {
  console.log("Catálogo WISE…");
  const wisePillars = await upsertPillars("WISE", WISE_PILLARS);
  for (const def of WISE_ELEMENTS) {
    const src = wiseMatrix.find((e) => e.number === def.number);
    if (!src) throw new Error(`Elemento WISE ${def.number} ausente na matriz`);
    await upsertElement(
      "WISE",
      def,
      wisePillars.get(def.pillar)!,
      src.glossary,
      src.requirements.map((r) => ({
        code: r.code.replace(/^E\d+\./, ""),
        text: r.text,
        level: r.level,
        dimension: r.dimension,
      })),
    );
  }

  console.log("Catálogo 12 Básicos…");
  const basicsPillars = await upsertPillars("BASICS", BASICS_PILLARS);
  for (const def of BASICS_ELEMENTS) {
    const src = basicsChecklist.find((b) => b.number === def.number);
    if (!src) throw new Error(`Básico ${def.number} ausente no checklist`);
    await upsertElement(
      "BASICS",
      def,
      basicsPillars.get(def.pillar)!,
      null,
      src.requirements.map((r) => ({
        code: r.code,
        text: r.text,
        riskLevel: r.risk,
        criteria: (r as { criteria?: Record<string, string | null> }).criteria,
      })),
    );
  }

  // Remove pilares que deixaram de existir no catálogo (ex.: troca de agrupamento)
  await prisma.pillar.deleteMany({ where: { elements: { none: {} } } });

  console.log("Unidade e administrador…");
  const unit = await prisma.unit.upsert({
    where: { code: "CD-GRU" },
    update: {},
    create: { code: "CD-GRU", name: "CD Guarulhos", city: "Guarulhos - SP" },
  });
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@wise.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Wise@2026";
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Administrador WISE",
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await prisma.unitMember.upsert({
    where: { userId_unitId: { userId: admin.id, unitId: unit.id } },
    update: {},
    create: { userId: admin.id, unitId: unit.id },
  });

  const counts = await prisma.requirement.groupBy({ by: ["elementId"], _count: true });
  console.log(`OK — ${counts.length} elementos, ${counts.reduce((s, c) => s + c._count, 0)} requisitos.`);
  console.log(`Login: ${email} / ${process.env.SEED_ADMIN_PASSWORD ? "(senha definida no .env)" : password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
