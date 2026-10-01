"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AUDIT_VALUES, getTemplate } from "@/lib/audit-templates";
import { assertUnitAccess, requirePermission, requireUser } from "./context";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

async function auditForUser(auditId: string) {
  const user = await requireUser();
  const audit = await db.audit.findUniqueOrThrow({ where: { id: auditId } });
  await assertUnitAccess(user, audit.unitId);
  return { user, audit };
}

export async function loadAudit(auditId: string) {
  const { audit } = await auditForUser(auditId);
  const [answers, attachments, actions] = await Promise.all([
    db.auditAnswer.findMany({ where: { auditId }, include: { updatedBy: { select: { name: true } } } }),
    db.auditAttachment.findMany({ where: { auditId }, orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } }),
    db.actionPlan.findMany({
      where: { auditId },
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return {
    answers: Object.fromEntries(
      answers.map((a) => [
        a.itemCode,
        { value: a.value, observation: a.observation ?? "", updatedAt: a.updatedAt.toISOString(), updatedBy: a.updatedBy?.name ?? null },
      ]),
    ) as Record<string, { value: string | null; observation: string; updatedAt: string; updatedBy: string | null }>,
    attachments: attachments.map((a) => ({
      id: a.id,
      itemCode: a.itemCode,
      name: a.name,
      url: a.url,
      mimeType: a.mimeType,
      size: a.size,
      uploadedBy: a.uploadedBy?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    actions: actions.map((a) => ({
      id: a.id,
      what: a.what,
      itemCode: a.auditItemCode,
      ownerName: a.owner?.name ?? null,
      dueDate: a.dueDate?.toISOString() ?? null,
      status: a.status,
      priority: a.priority,
      spheraId: a.spheraId,
    })),
    status: audit.status,
  };
}

export type AuditState = Awaited<ReturnType<typeof loadAudit>>;

const createSchema = z.object({
  unitId: z.string(),
  template: z.string(),
  contractor: z.string().trim().min(2, "Informe a empresa contratada.").max(200),
  auditDate: z.string().min(8),
  auditorId: z.string().nullable().optional(),
  accompaniedBy: z.string().max(300).optional(),
});

export async function createAudit(input: z.infer<typeof createSchema>) {
  return run(async () => {
    const data = createSchema.parse(input);
    const user = await requirePermission("score");
    await assertUnitAccess(user, data.unitId);
    if (!getTemplate(data.template)) throw new Error("Checklist inválido.");
    const audit = await db.audit.create({
      data: {
        unitId: data.unitId,
        template: data.template,
        contractor: data.contractor,
        auditDate: new Date(data.auditDate),
        auditorId: data.auditorId || user.id,
        accompaniedBy: data.accompaniedBy || null,
      },
    });
    revalidatePath("/auditorias");
    return { id: audit.id };
  });
}

export async function saveAuditAnswer(input: { auditId: string; itemCode: string; value?: string | null; observation?: string }) {
  return run(async () => {
    const { user, audit } = await auditForUser(input.auditId);
    await requirePermission("score");
    if (audit.status === "CONCLUIDA") throw new Error("Auditoria concluída. Reabra para editar.");
    const template = getTemplate(audit.template);
    if (!template?.sections.some((s) => s.items.some((i) => i.code === input.itemCode))) throw new Error("Item inválido.");
    const data: { value?: string | null; observation?: string; updatedById: string } = { updatedById: user.id };
    if (input.value !== undefined) {
      if (input.value !== null && !(AUDIT_VALUES as readonly string[]).includes(input.value)) throw new Error("Valor inválido.");
      data.value = input.value;
    }
    if (input.observation !== undefined) data.observation = input.observation.slice(0, 4000);
    await db.auditAnswer.upsert({
      where: { auditId_itemCode: { auditId: audit.id, itemCode: input.itemCode } },
      update: data,
      create: { auditId: audit.id, itemCode: input.itemCode, ...data },
    });
    await db.audit.update({ where: { id: audit.id }, data: { updatedAt: new Date() } });
    revalidatePath("/auditorias");
    return loadAudit(audit.id);
  });
}

const infoSchema = z.object({
  auditId: z.string(),
  contractor: z.string().trim().min(2).max(200).optional(),
  auditDate: z.string().optional(),
  auditorId: z.string().nullable().optional(),
  accompaniedBy: z.string().max(300).optional(),
  strengths: z.string().max(8000).optional(),
  opportunities: z.string().max(8000).optional(),
  conclusion: z.string().max(8000).optional(),
  status: z.enum(["EM_ANDAMENTO", "CONCLUIDA"]).optional(),
});

export async function updateAuditInfo(input: z.infer<typeof infoSchema>) {
  return run(async () => {
    const { auditId, auditDate, ...rest } = infoSchema.parse(input);
    await auditForUser(auditId);
    await requirePermission("score");
    await db.audit.update({
      where: { id: auditId },
      data: { ...rest, ...(auditDate ? { auditDate: new Date(auditDate) } : {}) },
    });
    revalidatePath("/auditorias");
    revalidatePath(`/auditorias/${auditId}`);
  });
}

export async function deleteAudit(auditId: string) {
  return run(async () => {
    await auditForUser(auditId);
    await requirePermission("admin");
    await db.audit.delete({ where: { id: auditId } });
    revalidatePath("/auditorias");
  });
}

export async function addAuditAttachment(input: {
  auditId: string;
  itemCode: string | null;
  name: string;
  url: string;
  mimeType: string | null;
  size: number | null;
}) {
  return run(async () => {
    const { user, audit } = await auditForUser(input.auditId);
    await requirePermission("evidence");
    if (!/^(https:\/\/|\/api\/files\/)/.test(input.url)) throw new Error("Arquivo inválido.");
    await db.auditAttachment.create({
      data: {
        auditId: audit.id,
        itemCode: input.itemCode,
        name: input.name.slice(0, 300),
        url: input.url,
        mimeType: input.mimeType,
        size: input.size,
        uploadedById: user.id,
      },
    });
    return loadAudit(audit.id);
  });
}

export async function deleteAuditAttachment(id: string) {
  return run(async () => {
    const att = await db.auditAttachment.findUniqueOrThrow({ where: { id } });
    await auditForUser(att.auditId);
    await requirePermission("evidence");
    await db.auditAttachment.delete({ where: { id } });
    if (att.url.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(att.url).catch(() => undefined);
    }
    return loadAudit(att.auditId);
  });
}

export async function reloadAudit(auditId: string) {
  return run(() => loadAudit(auditId));
}
