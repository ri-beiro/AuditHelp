import "server-only";
import type { ElementStatus, Framework } from "@prisma/client";
import { db } from "@/lib/db";
import {
  WISE_MAX_TOTAL,
  isDeviation,
  scoreBasicsElement,
  scoreBasicsOverall,
  scoreWiseElement,
  scoreWiseOverall,
  type Tone,
} from "@/lib/scoring";

export type ElementSummary = {
  id: string;
  code: string;
  number: number;
  name: string;
  shortName: string;
  icon: string;
  framework: Framework;
  pillar: { id: string; name: string; color: string };
  status: ElementStatus;
  responsible: { id: string; name: string } | null;
  updatedAt: string | null;
  /** WISE: nota 0–5; Básicos: % 0–1 */
  score: number | null;
  pct: number | null;
  tone: Tone;
  stage?: string;
  capped?: boolean;
  answered: number;
  total: number;
  conformes: number;
  desvios: number;
  evidences: number;
  pendingActions: number;
};

export type PillarSummary = {
  id: string;
  name: string;
  color: string;
  pct: number | null;
  score: number | null;
  elements: number;
  tones: Record<Tone, number>;
};

export type FrameworkOverview = {
  framework: Framework;
  assessmentId: string;
  elements: ElementSummary[];
  pillars: PillarSummary[];
  overall: {
    score: number | null; // WISE: pontos (0–65); Básicos: %
    pct: number | null;
    tone: Tone;
    stage?: string;
    level1Pct?: number | null;
    maxScore?: number;
  };
  totals: {
    conformes: number;
    desvios: number;
    answered: number;
    total: number;
    pendingActions: number;
    overdueActions: number;
    criticalElements: number;
    evidences: number;
  };
};

function deriveStatus(stored: ElementStatus | null | undefined, answered: number): ElementStatus {
  if (stored) return stored;
  return answered > 0 ? "EM_ANDAMENTO" : "NAO_INICIADO";
}

export async function loadOverview(assessmentId: string, framework: Framework): Promise<FrameworkOverview> {
  const assessment = await db.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  const [elements, scores, elementAssessments, evidenceCounts, actions] = await Promise.all([
    db.element.findMany({
      where: { framework },
      orderBy: { number: "asc" },
      include: { pillar: true, requirements: { select: { id: true, level: true, riskLevel: true } } },
    }),
    db.requirementScore.findMany({ where: { assessmentId }, select: { requirementId: true, value: true } }),
    db.elementAssessment.findMany({
      where: { assessmentId },
      include: { responsible: { select: { id: true, name: true } } },
    }),
    db.evidence.groupBy({ by: ["elementId"], where: { assessmentId }, _count: true }),
    db.actionPlan.findMany({
      where: { unitId: assessment.unitId, element: { framework }, status: { in: ["ABERTA", "EM_ANDAMENTO"] } },
      select: { elementId: true, dueDate: true },
    }),
  ]);

  const valueByReq = new Map(scores.map((s) => [s.requirementId, s.value]));
  const eaByElement = new Map(elementAssessments.map((e) => [e.elementId, e]));
  const evByElement = new Map(evidenceCounts.map((e) => [e.elementId, e._count]));
  const now = new Date();

  const summaries: ElementSummary[] = elements.map((el) => {
    const reqs = el.requirements.map((r) => ({ ...r, value: valueByReq.get(r.id) ?? null }));
    const ea = eaByElement.get(el.id);
    const pending = actions.filter((a) => a.elementId === el.id).length;
    const base = {
      id: el.id,
      code: el.code,
      number: el.number,
      name: el.name,
      shortName: el.shortName,
      icon: el.icon,
      framework,
      pillar: { id: el.pillar.id, name: el.pillar.name, color: el.pillar.color },
      responsible: ea?.responsible ?? null,
      updatedAt: ea?.updatedAt?.toISOString() ?? null,
      evidences: evByElement.get(el.id) ?? 0,
      pendingActions: pending,
    };
    if (framework === "WISE") {
      const r = scoreWiseElement(reqs);
      return {
        ...base,
        status: deriveStatus(ea?.status, r.answered),
        score: r.answered ? r.score : null,
        pct: r.answered ? r.pct : null,
        tone: r.tone,
        stage: r.stage,
        answered: r.answered,
        total: r.total,
        conformes: r.conformes,
        desvios: r.desvios,
      };
    }
    const r = scoreBasicsElement(reqs);
    return {
      ...base,
      status: deriveStatus(ea?.status, r.answered),
      score: r.pct,
      pct: r.pct,
      tone: r.tone,
      capped: r.capped,
      answered: r.answered,
      total: r.total,
      conformes: r.conformes,
      desvios: r.desvios,
    };
  });

  // Pilares
  const pillarMap = new Map<string, PillarSummary>();
  for (const s of summaries) {
    const p =
      pillarMap.get(s.pillar.id) ??
      ({
        ...s.pillar,
        pct: null,
        score: null,
        elements: 0,
        tones: { critico: 0, atencao: 0, conforme: 0, neutro: 0 },
      } as PillarSummary);
    p.elements++;
    p.tones[s.tone]++;
    pillarMap.set(s.pillar.id, p);
  }
  for (const p of pillarMap.values()) {
    const els = summaries.filter((s) => s.pillar.id === p.id);
    if (framework === "WISE") {
      const answered = els.some((e) => e.answered > 0);
      const avg = els.reduce((sum, e) => sum + (e.score ?? 0), 0) / els.length;
      p.score = answered ? avg : null;
      p.pct = answered ? avg / 5 : null;
    } else {
      const valid = els.map((e) => e.pct).filter((v): v is number => v !== null);
      p.pct = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
      p.score = p.pct;
    }
  }

  const anyAnswered = summaries.some((s) => s.answered > 0);
  let overall: FrameworkOverview["overall"];
  if (framework === "WISE") {
    const o = scoreWiseOverall(summaries.map((s) => s.score ?? 0), anyAnswered);
    overall = {
      score: anyAnswered ? o.total : null,
      pct: anyAnswered ? o.pct : null,
      tone: o.tone,
      stage: o.stage,
      maxScore: WISE_MAX_TOTAL,
    };
  } else {
    const allReqs = elements.flatMap((el) =>
      el.requirements.map((r) => ({ ...r, value: valueByReq.get(r.id) ?? null })),
    );
    const o = scoreBasicsOverall(
      summaries.map((s) => s.pct),
      allReqs,
    );
    overall = { score: o.pct, pct: o.pct, tone: o.tone, level1Pct: o.level1Pct };
  }

  return {
    framework,
    assessmentId,
    elements: summaries,
    pillars: [...pillarMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    overall,
    totals: {
      conformes: summaries.reduce((s, e) => s + e.conformes, 0),
      desvios: summaries.reduce((s, e) => s + e.desvios, 0),
      answered: summaries.reduce((s, e) => s + e.answered, 0),
      total: summaries.reduce((s, e) => s + e.total, 0),
      pendingActions: actions.length,
      overdueActions: actions.filter((a) => a.dueDate && a.dueDate < now).length,
      criticalElements: summaries.filter((s) => s.tone === "critico").length,
      evidences: summaries.reduce((s, e) => s + e.evidences, 0),
    },
  };
}

export async function loadElementDetail(assessmentId: string, code: string) {
  const assessment = await db.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  const element = await db.element.findUniqueOrThrow({
    where: { code },
    include: {
      pillar: true,
      requirements: { orderBy: [{ level: "asc" }, { order: "asc" }] },
    },
  });
  const [scores, ea, evidences, actions, members] = await Promise.all([
    db.requirementScore.findMany({
      where: { assessmentId, requirement: { elementId: element.id } },
      include: { updatedBy: { select: { name: true } } },
    }),
    db.elementAssessment.findUnique({
      where: { assessmentId_elementId: { assessmentId, elementId: element.id } },
      include: { responsible: { select: { id: true, name: true } }, updatedBy: { select: { name: true } } },
    }),
    db.evidence.findMany({
      where: { assessmentId, elementId: element.id },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.actionPlan.findMany({
      where: { unitId: assessment.unitId, elementId: element.id },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    unitMembers(assessment.unitId),
  ]);
  const byReq = new Map(scores.map((s) => [s.requirementId, s]));
  const requirements = element.requirements.map((r) => {
    const s = byReq.get(r.id);
    return {
      id: r.id,
      code: r.code,
      text: r.text,
      level: r.level,
      dimension: r.dimension,
      riskLevel: r.riskLevel,
      criteria: (r.criteria as Record<string, string | null> | null) ?? null,
      value: s?.value ?? null,
      observation: s?.observation ?? "",
      updatedAt: s?.updatedAt?.toISOString() ?? null,
      updatedBy: s?.updatedBy?.name ?? null,
      deviation: isDeviation(element.framework, s?.value),
    };
  });
  const result =
    element.framework === "WISE"
      ? { kind: "WISE" as const, ...scoreWiseElement(requirements) }
      : { kind: "BASICS" as const, ...scoreBasicsElement(requirements) };

  return {
    assessmentId,
    unitId: assessment.unitId,
    element: {
      id: element.id,
      code: element.code,
      number: element.number,
      framework: element.framework,
      name: element.name,
      shortName: element.shortName,
      description: element.description,
      objective: element.objective,
      glossary: element.glossary,
      icon: element.icon,
      pillar: { name: element.pillar.name, color: element.pillar.color },
    },
    info: {
      responsibleId: ea?.responsible?.id ?? null,
      responsibleName: ea?.responsible?.name ?? null,
      status: deriveStatus(ea?.status, requirements.filter((r) => r.value).length),
      statusManual: ea?.status ?? null,
      summary: ea?.summary ?? "",
      recommendations: ea?.recommendations ?? "",
      updatedAt: ea?.updatedAt?.toISOString() ?? latest(requirements.map((r) => r.updatedAt)),
      updatedBy: ea?.updatedBy?.name ?? null,
    },
    requirements,
    result,
    evidences: evidences.map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      url: e.url,
      mimeType: e.mimeType,
      size: e.size,
      description: e.description,
      requirementId: e.requirementId,
      uploadedBy: e.uploadedBy?.name ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    actions: actions.map(serializeAction),
    members,
  };
}

export type ElementDetail = Awaited<ReturnType<typeof loadElementDetail>>;

function latest(dates: (string | null)[]) {
  const valid = dates.filter((d): d is string => !!d).sort();
  return valid.length ? valid[valid.length - 1] : null;
}

export async function unitMembers(unitId: string) {
  const users = await db.user.findMany({
    where: { active: true, OR: [{ role: "ADMIN" }, { units: { some: { unitId } } }] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export function serializeAction(a: {
  id: string;
  what: string;
  why: string | null;
  ownerId: string | null;
  owner?: { id: string; name: string } | null;
  dueDate: Date | null;
  where: string | null;
  how: string | null;
  cost: { toString(): string } | null;
  priority: string;
  status: string;
  elementId: string;
  requirementId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: a.id,
    what: a.what,
    why: a.why ?? "",
    ownerId: a.ownerId,
    ownerName: a.owner?.name ?? null,
    dueDate: a.dueDate?.toISOString() ?? null,
    where: a.where ?? "",
    how: a.how ?? "",
    cost: a.cost ? Number(a.cost.toString()) : null,
    priority: a.priority,
    status: a.status,
    elementId: a.elementId,
    requirementId: a.requirementId,
    createdAt: a.createdAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
  };
}

export type ActionDTO = ReturnType<typeof serializeAction>;

/** Atualiza a fotografia do mês corrente (geral + por elemento) usada no gráfico de evolução. */
export async function refreshSnapshots(assessmentId: string) {
  const assessment = await db.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  const ov = await loadOverview(assessmentId, assessment.framework);
  const month = new Date().toISOString().slice(0, 7);
  const rows = [
    { scope: "OVERALL", score: ov.overall.score, percent: ov.overall.pct },
    ...ov.elements.map((e) => ({ scope: e.code, score: e.score, percent: e.pct })),
  ];
  await db.$transaction(
    rows.map((r) =>
      db.scoreSnapshot.upsert({
        where: {
          unitId_framework_scope_month: {
            unitId: assessment.unitId,
            framework: assessment.framework,
            scope: r.scope,
            month,
          },
        },
        update: { score: r.score, percent: r.percent },
        create: {
          unitId: assessment.unitId,
          framework: assessment.framework,
          scope: r.scope,
          month,
          score: r.score,
          percent: r.percent,
        },
      }),
    ),
  );
}
