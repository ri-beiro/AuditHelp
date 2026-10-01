"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { ActionPriority, ActionStatus, ElementStatus, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { BASICS_VALUES, WISE_VALUES } from "@/lib/scoring";
import { signIn, signOut } from "@/auth";
import {
  CYCLE_COOKIE,
  UNIT_COOKIE,
  assertUnitAccess,
  getWorkspace,
  requirePermission,
  requireUser,
} from "./context";
import { loadElementDetail, refreshSnapshots } from "./queries";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

const oneYear = 60 * 60 * 24 * 365;

// ---------------------------------------------------------------------------
// Sessão / contexto
// ---------------------------------------------------------------------------

export async function loginAction(_: unknown, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (e) {
    if (e instanceof Error && e.name === "CredentialsSignin") return { error: "E-mail ou senha inválidos." };
    if (e && typeof e === "object" && "type" in e && (e as { type: string }).type === "CredentialsSignin")
      return { error: "E-mail ou senha inválidos." };
    throw e;
  }
  return { error: null };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function selectUnit(unitId: string) {
  const user = await requireUser();
  await assertUnitAccess(user, unitId);
  (await cookies()).set(UNIT_COOKIE, unitId, { path: "/", maxAge: oneYear });
  revalidatePath("/", "layout");
}

export async function selectCycle(cycle: string) {
  await requireUser();
  if (!/^\d{4}$/.test(cycle)) return;
  (await cookies()).set(CYCLE_COOKIE, cycle, { path: "/", maxAge: oneYear });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Matriz
// ---------------------------------------------------------------------------

async function assessmentForUser(assessmentId: string) {
  const user = await requireUser();
  const assessment = await db.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  await assertUnitAccess(user, assessment.unitId);
  return { user, assessment };
}

export async function getElementDetailAction(assessmentId: string, code: string) {
  return run(async () => {
    await assessmentForUser(assessmentId);
    return loadElementDetail(assessmentId, code);
  });
}

export async function saveRequirement(input: {
  assessmentId: string;
  requirementId: string;
  value?: string | null;
  observation?: string;
}) {
  return run(async () => {
    const { user, assessment } = await assessmentForUser(input.assessmentId);
    const req = await db.requirement.findUniqueOrThrow({
      where: { id: input.requirementId },
      include: { element: true },
    });
    if (req.element.framework !== assessment.framework) throw new Error("Requisito não pertence a esta avaliação.");
    const data: { value?: string | null; observation?: string; updatedById: string } = { updatedById: user.id };
    if (input.value !== undefined) {
      await requirePermission("score");
      const allowed: readonly string[] = assessment.framework === "WISE" ? WISE_VALUES : BASICS_VALUES;
      if (input.value !== null && !allowed.includes(input.value)) throw new Error("Valor inválido.");
      data.value = input.value;
    }
    if (input.observation !== undefined) data.observation = input.observation.slice(0, 4000);
    await db.requirementScore.upsert({
      where: { assessmentId_requirementId: { assessmentId: assessment.id, requirementId: req.id } },
      update: data,
      create: { assessmentId: assessment.id, requirementId: req.id, ...data },
    });
    await touchElement(assessment.id, req.elementId, user.id);
    if (input.value !== undefined) await refreshSnapshots(assessment.id);
    revalidatePath("/", "layout");
    return loadElementDetail(assessment.id, req.element.code);
  });
}

async function touchElement(assessmentId: string, elementId: string, userId: string) {
  await db.elementAssessment.upsert({
    where: { assessmentId_elementId: { assessmentId, elementId } },
    update: { updatedById: userId },
    create: { assessmentId, elementId, updatedById: userId },
  });
}

export async function updateElementInfo(input: {
  assessmentId: string;
  elementId: string;
  responsibleId?: string | null;
  status?: ElementStatus | null;
  summary?: string;
  recommendations?: string;
}) {
  return run(async () => {
    const { user, assessment } = await assessmentForUser(input.assessmentId);
    await requirePermission("editElement");
    const element = await db.element.findUniqueOrThrow({ where: { id: input.elementId } });
    const data = {
      responsibleId: input.responsibleId,
      status: input.status,
      summary: input.summary?.slice(0, 8000),
      recommendations: input.recommendations?.slice(0, 8000),
      updatedById: user.id,
    };
    await db.elementAssessment.upsert({
      where: { assessmentId_elementId: { assessmentId: assessment.id, elementId: element.id } },
      update: data,
      create: { assessmentId: assessment.id, elementId: element.id, ...data },
    });
    revalidatePath("/", "layout");
    return loadElementDetail(assessment.id, element.code);
  });
}

// ---------------------------------------------------------------------------
// Evidências
// ---------------------------------------------------------------------------

const evidenceSchema = z.object({
  assessmentId: z.string(),
  elementId: z.string(),
  requirementId: z.string().nullable().optional(),
  kind: z.enum(["FILE", "LINK"]),
  name: z.string().min(1).max(300),
  url: z.string().min(1).max(2000),
  mimeType: z.string().max(200).nullable().optional(),
  size: z.number().int().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export async function createEvidence(input: z.infer<typeof evidenceSchema>) {
  return run(async () => {
    const data = evidenceSchema.parse(input);
    const { user, assessment } = await assessmentForUser(data.assessmentId);
    await requirePermission("evidence");
    if (data.kind === "LINK" && !/^https?:\/\//i.test(data.url)) throw new Error("Informe um link começando com http(s)://");
    if (data.kind === "FILE" && !/^(https:\/\/|\/api\/files\/)/.test(data.url)) throw new Error("Arquivo inválido.");
    const element = await db.element.findUniqueOrThrow({ where: { id: data.elementId } });
    await db.evidence.create({ data: { ...data, assessmentId: assessment.id, uploadedById: user.id } });
    await touchElement(assessment.id, element.id, user.id);
    revalidatePath("/", "layout");
    return loadElementDetail(assessment.id, element.code);
  });
}

export async function deleteEvidence(evidenceId: string) {
  return run(async () => {
    const ev = await db.evidence.findUniqueOrThrow({ where: { id: evidenceId }, include: { element: true } });
    const { user } = await assessmentForUser(ev.assessmentId);
    if (user.role === "RESPONSAVEL" && ev.uploadedById !== user.id)
      throw new Error("Apenas quem enviou a evidência pode removê-la.");
    await db.evidence.delete({ where: { id: ev.id } });
    if (ev.kind === "FILE" && ev.url.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(ev.url).catch(() => undefined);
    }
    revalidatePath("/", "layout");
    return loadElementDetail(ev.assessmentId, ev.element.code);
  });
}

// ---------------------------------------------------------------------------
// Planos de ação (5W2H)
// ---------------------------------------------------------------------------

const actionSchema = z.object({
  id: z.string().optional(),
  unitId: z.string(),
  assessmentId: z.string().nullable().optional(),
  elementId: z.string(),
  requirementId: z.string().nullable().optional(),
  what: z.string().trim().min(3, "Descreva o que será feito.").max(1000),
  why: z.string().max(2000).optional(),
  ownerId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  where: z.string().max(500).optional(),
  how: z.string().max(4000).optional(),
  cost: z.number().nonnegative().nullable().optional(),
  spheraId: z.string().trim().max(60).optional(),
  auditId: z.string().nullable().optional(),
  auditItemCode: z.string().max(20).nullable().optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]),
  status: z.enum(["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"]),
});

export type ActionInput = z.infer<typeof actionSchema>;

export async function saveActionPlan(input: ActionInput) {
  return run(async () => {
    const data = actionSchema.parse(input);
    const user = await requirePermission("action");
    await assertUnitAccess(user, data.unitId);
    const existing = data.id ? await db.actionPlan.findUniqueOrThrow({ where: { id: data.id } }) : null;
    if (existing && existing.unitId !== data.unitId) throw new Error("Plano de ação de outra unidade.");
    if (existing && user.role === "RESPONSAVEL" && existing.ownerId !== user.id && existing.createdById !== user.id)
      throw new Error("Você só pode editar ações sob sua responsabilidade.");
    const fields = {
      elementId: data.elementId,
      requirementId: data.requirementId ?? null,
      assessmentId: data.assessmentId ?? null,
      what: data.what,
      why: data.why || null,
      ownerId: data.ownerId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      where: data.where || null,
      how: data.how || null,
      cost: data.cost ?? null,
      spheraId: data.spheraId || null,
      auditId: data.auditId ?? existing?.auditId ?? null,
      auditItemCode: data.auditItemCode ?? existing?.auditItemCode ?? null,
      priority: data.priority as ActionPriority,
      status: data.status as ActionStatus,
      completedAt:
        data.status === "CONCLUIDA" ? (existing?.completedAt ?? new Date()) : null,
    };
    const saved = existing
      ? await db.actionPlan.update({ where: { id: existing.id }, data: fields })
      : await db.actionPlan.create({ data: { ...fields, unitId: data.unitId, createdById: user.id } });
    revalidatePath("/", "layout");
    return { id: saved.id };
  });
}

export async function deleteActionPlan(id: string) {
  return run(async () => {
    const user = await requirePermission("score");
    const a = await db.actionPlan.findUniqueOrThrow({ where: { id } });
    await assertUnitAccess(user, a.unitId);
    await db.actionPlan.delete({ where: { id } });
    revalidatePath("/", "layout");
  });
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------

export async function saveUnit(input: { id?: string; name: string; code: string; city?: string; active?: boolean }) {
  return run(async () => {
    await requirePermission("admin");
    const data = z
      .object({
        name: z.string().trim().min(2),
        code: z.string().trim().min(2).max(20).toUpperCase(),
        city: z.string().trim().max(120).optional(),
        active: z.boolean().optional(),
      })
      .parse(input);
    if (input.id) await db.unit.update({ where: { id: input.id }, data });
    else await db.unit.create({ data });
    revalidatePath("/", "layout");
  });
}

export async function saveUser(input: {
  id?: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
  active?: boolean;
  unitIds: string[];
}) {
  return run(async () => {
    const admin = await requirePermission("admin");
    const data = z
      .object({
        name: z.string().trim().min(2),
        email: z.string().trim().email().toLowerCase(),
        role: z.enum(["ADMIN", "AUDITOR", "RESPONSAVEL"]),
        password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").optional().or(z.literal("")),
        active: z.boolean().optional(),
        unitIds: z.array(z.string()),
      })
      .parse(input);
    if (input.id === admin.id && (data.role !== "ADMIN" || data.active === false))
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    if (!input.id && !data.password) throw new Error("Defina uma senha inicial.");
    const base = {
      name: data.name,
      email: data.email,
      role: data.role as Role,
      active: data.active ?? true,
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
    };
    await db.$transaction(async (tx) => {
      const user = input.id
        ? await tx.user.update({ where: { id: input.id }, data: base })
        : await tx.user.create({ data: { ...base, passwordHash: base.passwordHash! } });
      await tx.unitMember.deleteMany({ where: { userId: user.id } });
      if (data.unitIds.length)
        await tx.unitMember.createMany({ data: data.unitIds.map((unitId) => ({ userId: user.id, unitId })) });
    });
    revalidatePath("/admin");
  });
}

export async function workspaceInfo() {
  const { unit, cycle } = await getWorkspace();
  return { unitId: unit?.id ?? null, cycle };
}

// ---------------------------------------------------------------------------
// Relatório de fechamento da auditoria WISE²
// ---------------------------------------------------------------------------

const reportSchema = z.object({
  assessmentId: z.string(),
  auditDates: z.string().max(200).optional(),
  auditors: z.string().max(1000).optional(),
  format: z.string().max(4000).optional(),
  highlights: z.string().max(8000).optional(),
  quotes: z.string().max(8000).optional(),
  conclusion: z.string().max(8000).optional(),
  groups: z.record(z.object({ strengths: z.string().max(8000), opportunities: z.string().max(8000) })).optional(),
});

export async function saveClosingReport(input: z.infer<typeof reportSchema>) {
  return run(async () => {
    const data = reportSchema.parse(input);
    const { user, assessment } = await assessmentForUser(data.assessmentId);
    await requirePermission("editElement");
    if (assessment.framework !== "WISE") throw new Error("O relatório pertence à avaliação WISE.");
    const { assessmentId, ...fields } = data;
    await db.closingReport.upsert({
      where: { assessmentId },
      update: { ...fields, updatedById: user.id },
      create: { assessmentId, ...fields, updatedById: user.id },
    });
    revalidatePath("/relatorio");
  });
}
