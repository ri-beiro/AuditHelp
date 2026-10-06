"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUnitAccess, requirePermission } from "./context";

type Result = { ok: true } | { ok: false; error: string };

const schema = z.object({
  id: z.string().optional(),
  unitId: z.string(),
  date: z.string().min(10),
  type: z.string().trim().min(2, "Informe o tipo.").max(80),
  area: z.string().trim().min(2, "Informe a área.").max(120),
  auditor: z.string().trim().min(2, "Informe o auditor.").max(120),
  score: z.number().min(0),
  maxScore: z.number().positive("A nota máxima deve ser maior que zero."),
  result: z.string().trim().max(200).optional(),
  reportUrl: z.string().trim().max(2000).optional(),
  notes: z.string().max(8000).optional(),
});

export async function saveAuditRecord(input: z.infer<typeof schema>): Promise<Result> {
  try {
    const user = await requirePermission("score");
    const { id, ...data } = schema.parse(input);
    await assertUnitAccess(user, data.unitId);
    if (data.score > data.maxScore) throw new Error("A nota não pode ser maior que a nota máxima.");
    if (data.reportUrl && !/^(https?:\/\/|\/api\/files\/)/.test(data.reportUrl)) throw new Error("Link do relatório inválido.");
    const payload = {
      ...data,
      date: new Date(`${data.date.slice(0, 10)}T12:00:00Z`),
      result: data.result || null,
      reportUrl: data.reportUrl || null,
      notes: data.notes || null,
    };
    if (id) {
      const current = await db.auditRecord.findUniqueOrThrow({ where: { id } });
      await assertUnitAccess(user, current.unitId);
      await db.auditRecord.update({ where: { id }, data: payload });
    } else {
      await db.auditRecord.create({ data: { ...payload, createdById: user.id } });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Erro inesperado." };
  }
}

export async function deleteAuditRecord(id: string): Promise<Result> {
  try {
    const user = await requirePermission("score");
    const current = await db.auditRecord.findUniqueOrThrow({ where: { id } });
    await assertUnitAccess(user, current.unitId);
    await db.auditRecord.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}
