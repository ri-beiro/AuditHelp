import "server-only";
import type { IncidentType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  daysWithoutAccidents,
  investigationProgress,
  planStepStatus,
  LOST_TIME,
  type IncidentTypeKey,
  type Step,
} from "@/lib/incidents";
import { serializeAction } from "./queries";

const listInclude = {
  responsible: { select: { id: true, name: true } },
  actionPlans: { select: { id: true, status: true, dueDate: true } },
} satisfies Prisma.IncidentInclude;

type IncidentRow = Prisma.IncidentGetPayload<{ include: typeof listInclude }>;

export function serializeIncidentRow(i: IncidentRow) {
  const plan = planStepStatus(i.planStatus as Step, i.actionPlans);
  const steps = {
    report: i.reportStatus as Step,
    investigation: i.investigationStatus as Step,
    plan,
    lessons: i.lessonsStatus as Step,
  };
  const now = new Date();
  const openActions = i.actionPlans.filter((a) => a.status === "ABERTA" || a.status === "EM_ANDAMENTO");
  return {
    id: i.id,
    number: i.number,
    occurredAt: i.occurredAt.toISOString(),
    area: i.area,
    type: i.type as IncidentTypeKey,
    hipo: i.hipo,
    title: i.title,
    description: i.description,
    spheraId: i.spheraId,
    responsible: i.responsible,
    meetingAt: i.meetingAt?.toISOString() ?? null,
    steps,
    progress: investigationProgress(steps),
    closed: !!i.closedAt,
    investigationDone: steps.investigation === "CONCLUIDO",
    actions: {
      total: i.actionPlans.length,
      open: openActions.length,
      overdue: openActions.filter((a) => a.dueDate && a.dueDate < now).length,
    },
  };
}

export type IncidentListItem = ReturnType<typeof serializeIncidentRow>;

export async function listIncidents(unitId: string, where: Prisma.IncidentWhereInput = {}) {
  const rows = await db.incident.findMany({
    where: { unitId, ...where },
    include: listInclude,
    orderBy: { occurredAt: "desc" },
  });
  return rows.map(serializeIncidentRow);
}

/** Indicadores de segurança da unidade: dias sem acidentes, pirâmide, HIPO e investigações. */
export async function loadSafetyOverview(unitId: string) {
  const [unit, incidents] = await Promise.all([
    db.unit.findUniqueOrThrow({ where: { id: unitId } }),
    listIncidents(unitId),
  ]);
  const accidents = incidents.filter((i) => LOST_TIME.includes(i.type)).map((i) => new Date(i.occurredAt));
  const days = daysWithoutAccidents(accidents, unit.safetyStartDate ?? unit.createdAt);
  const counts = Object.fromEntries(
    (["FATALIDADE", "LTA", "NLTA", "FAC", "INCIDENTE", "NEAR_MISS", "CONDICAO_INSEGURA", "OBSERVACAO"] as IncidentTypeKey[]).map(
      (t) => [t, incidents.filter((i) => i.type === t).length],
    ),
  ) as Record<IncidentTypeKey, number>;
  return {
    unit: { id: unit.id, name: unit.name, safetyStartDate: (unit.safetyStartDate ?? unit.createdAt).toISOString() },
    days,
    counts,
    hipo: incidents.filter((i) => i.hipo).length,
    openInvestigations: incidents.filter((i) => !i.closed).length,
    incidents,
  };
}

export type SafetyOverview = Awaited<ReturnType<typeof loadSafetyOverview>>;

export async function loadIncidentDetail(id: string) {
  const i = await db.incident.findUnique({
    where: { id },
    include: {
      ...listInclude,
      reportedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      attachments: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      actionPlans: {
        include: { owner: { select: { id: true, name: true } } },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      },
    },
  });
  if (!i) return null;
  return {
    ...serializeIncidentRow(i),
    unitId: i.unitId,
    responsibleId: i.responsibleId,
    reportedById: i.reportedById,
    reportedBy: i.reportedBy?.name ?? null,
    createdAt: i.createdAt.toISOString(),
    participants: i.participants ?? "",
    meetingNotes: i.meetingNotes ?? "",
    rootCause: i.rootCause ?? "",
    whatHappened: i.whatHappened ?? "",
    howToPrevent: i.howToPrevent ?? "",
    goodPractices: i.goodPractices ?? "",
    sharedWith: i.sharedWith ?? "",
    approvedBy: i.approvedBy?.name ?? null,
    approvedAt: i.approvedAt?.toISOString() ?? null,
    closedAt: i.closedAt?.toISOString() ?? null,
    storedPlanStatus: i.planStatus as Step,
    attachments: i.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      mimeType: a.mimeType,
      size: a.size,
      uploadedBy: a.uploadedBy?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    actionList: i.actionPlans.map(serializeAction),
  };
}

export type IncidentDetail = NonNullable<Awaited<ReturnType<typeof loadIncidentDetail>>>;

export async function nextIncidentNumber(unitId: string, occurredAt: Date) {
  const unit = await db.unit.findUniqueOrThrow({ where: { id: unitId } });
  const year = occurredAt.getUTCFullYear();
  const prefix = `${unit.code}-${year}-`;
  const last = await db.incident.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export const INCIDENT_TYPE_VALUES = [
  "FATALIDADE",
  "LTA",
  "NLTA",
  "FAC",
  "INCIDENTE",
  "NEAR_MISS",
  "CONDICAO_INSEGURA",
  "OBSERVACAO",
] as const satisfies readonly IncidentType[];
