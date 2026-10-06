"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { IncidentType, StepStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { assertUnitAccess, can, requirePermission, requireUser, type CurrentUser } from "./context";
import { INCIDENT_TYPE_VALUES, loadIncidentDetail, nextIncidentNumber } from "./incident-queries";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

function refresh(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/incidentes/${id}`);
}

async function incidentForUser(id: string) {
  const user = await requireUser();
  const incident = await db.incident.findUniqueOrThrow({ where: { id } });
  await assertUnitAccess(user, incident.unitId);
  return { user, incident };
}

/** Auditores/administradores, o responsável e quem reportou podem conduzir a investigação. */
function canManage(user: CurrentUser, incident: { responsibleId: string | null; reportedById: string | null }) {
  return can(user.role, "score") || incident.responsibleId === user.id || incident.reportedById === user.id;
}

const reportSchema = z.object({
  unitId: z.string(),
  occurredAt: z.string().min(10),
  area: z.string().trim().min(2, "Informe a área.").max(120),
  type: z.enum(INCIDENT_TYPE_VALUES),
  hipo: z.boolean(),
  title: z.string().trim().min(3, "Informe um título.").max(200),
  description: z.string().trim().min(5, "Descreva a ocorrência.").max(8000),
  responsibleId: z.string().nullable().optional(),
  spheraId: z.string().trim().max(60).optional(),
});

export async function reportIncident(input: z.infer<typeof reportSchema>) {
  return run(async () => {
    const data = reportSchema.parse(input);
    const user = await requireUser();
    await assertUnitAccess(user, data.unitId);
    const occurredAt = new Date(data.occurredAt);
    if (Number.isNaN(+occurredAt)) throw new Error("Data inválida.");
    const incident = await db.incident.create({
      data: {
        unitId: data.unitId,
        number: await nextIncidentNumber(data.unitId, occurredAt),
        occurredAt,
        area: data.area,
        type: data.type as IncidentType,
        hipo: data.hipo,
        title: data.title,
        description: data.description,
        responsibleId: data.responsibleId || null,
        spheraId: data.spheraId || null,
        reportedById: user.id,
      },
    });
    refresh();
    return { id: incident.id };
  });
}

const updateSchema = reportSchema.omit({ unitId: true }).partial().extend({
  id: z.string(),
  reportStatus: z.enum(["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO"]).optional(),
  investigationStatus: z.enum(["NAO_INICIADO", "AGENDADO", "CONCLUIDO"]).optional(),
  meetingAt: z.string().nullable().optional(),
  participants: z.string().max(4000).optional(),
  meetingNotes: z.string().max(20000).optional(),
  planStatus: z.enum(["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO"]).optional(),
  lessonsStatus: z.enum(["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO"]).optional(),
  rootCause: z.string().max(8000).optional(),
  whatHappened: z.string().max(8000).optional(),
  howToPrevent: z.string().max(8000).optional(),
  goodPractices: z.string().max(8000).optional(),
  sharedWith: z.string().max(2000).optional(),
});

export async function updateIncident(input: z.infer<typeof updateSchema>) {
  return run(async () => {
    const { id, occurredAt, meetingAt, type, ...rest } = updateSchema.parse(input);
    const { user, incident } = await incidentForUser(id);
    if (!canManage(user, incident)) throw new Error("Sem permissão para editar esta ocorrência.");
    if (incident.closedAt) throw new Error("Ocorrência encerrada. Reabra para editar.");
    if (rest.lessonsStatus === "CONCLUIDO" && !incident.approvedAt)
      throw new Error("As lições aprendidas precisam ser aprovadas para concluir a etapa.");
    await db.incident.update({
      where: { id },
      data: {
        ...rest,
        responsibleId: rest.responsibleId === undefined ? undefined : rest.responsibleId || null,
        spheraId: rest.spheraId === undefined ? undefined : rest.spheraId || null,
        type: type as IncidentType | undefined,
        reportStatus: rest.reportStatus as StepStatus | undefined,
        investigationStatus: rest.investigationStatus as StepStatus | undefined,
        planStatus: rest.planStatus as StepStatus | undefined,
        lessonsStatus: rest.lessonsStatus as StepStatus | undefined,
        ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}),
        ...(meetingAt !== undefined ? { meetingAt: meetingAt ? new Date(meetingAt) : null } : {}),
      },
    });
    refresh(id);
    return loadIncidentDetail(id);
  });
}

export async function approveLessons(id: string, approve: boolean) {
  return run(async () => {
    const { user, incident } = await incidentForUser(id);
    if (!can(user.role, "score")) throw new Error("Apenas auditores e administradores aprovam lições aprendidas.");
    if (approve && !incident.rootCause) throw new Error("Preencha a causa raiz antes de aprovar.");
    await db.incident.update({
      where: { id },
      data: approve
        ? { approvedById: user.id, approvedAt: new Date(), lessonsStatus: "CONCLUIDO" }
        : { approvedById: null, approvedAt: null, lessonsStatus: "EM_ANDAMENTO", closedAt: null },
    });
    refresh(id);
    return loadIncidentDetail(id);
  });
}

export async function closeIncident(id: string, close: boolean) {
  return run(async () => {
    const { user, incident } = await incidentForUser(id);
    if (!canManage(user, incident)) throw new Error("Sem permissão.");
    if (close) {
      const detail = await loadIncidentDetail(id);
      if (detail && detail.progress < 100) throw new Error("Conclua as quatro etapas antes de encerrar.");
    }
    await db.incident.update({ where: { id }, data: { closedAt: close ? new Date() : null } });
    refresh(id);
    return loadIncidentDetail(id);
  });
}

export async function deleteIncident(id: string) {
  return run(async () => {
    await incidentForUser(id);
    await requirePermission("admin");
    await db.incident.delete({ where: { id } });
    refresh();
  });
}

export async function addIncidentAttachment(input: { incidentId: string; name: string; url: string; mimeType: string | null; size: number | null }) {
  return run(async () => {
    const { user } = await incidentForUser(input.incidentId);
    if (!/^(https:\/\/|\/api\/files\/)/.test(input.url)) throw new Error("Arquivo inválido.");
    await db.incidentAttachment.create({
      data: { ...input, name: input.name.slice(0, 300), uploadedById: user.id },
    });
    refresh(input.incidentId);
    return loadIncidentDetail(input.incidentId);
  });
}

export async function deleteIncidentAttachment(id: string) {
  return run(async () => {
    const att = await db.incidentAttachment.findUniqueOrThrow({ where: { id } });
    const { user, incident } = await incidentForUser(att.incidentId);
    if (!canManage(user, incident) && att.uploadedById !== user.id) throw new Error("Sem permissão.");
    await db.incidentAttachment.delete({ where: { id } });
    if (att.url.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(att.url).catch(() => undefined);
    }
    refresh(att.incidentId);
    return loadIncidentDetail(att.incidentId);
  });
}

export async function reloadIncident(id: string) {
  return run(async () => {
    await incidentForUser(id);
    return loadIncidentDetail(id);
  });
}
