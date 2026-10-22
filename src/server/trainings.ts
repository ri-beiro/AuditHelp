"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "./context";

type Result = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await requirePermission("admin");
    await fn();
    revalidatePath("/treinamentos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Erro inesperado." };
  }
}

/** Altera uma célula da MHC (S, N ou NA; null limpa). */
export async function setMhcCell(roleId: string, trainingId: string, value: "S" | "N" | "NA" | null) {
  return run(async () => {
    if (value === null) await db.roleTraining.deleteMany({ where: { roleId, trainingId } });
    else
      await db.roleTraining.upsert({
        where: { roleId_trainingId: { roleId, trainingId } },
        update: { value },
        create: { roleId, trainingId, value },
      });
  });
}

const trainingSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome.").max(200),
  validityDays: z.number().int().positive().nullable(),
  noExpiry: z.boolean(),
  method: z.string().trim().max(60).nullable(),
  effectiveness: z.boolean().nullable(),
  passingScore: z.number().int().min(0).max(100).nullable(),
});

export async function saveTraining(input: z.input<typeof trainingSchema>) {
  return run(async () => {
    const { id, ...d } = trainingSchema.parse(input);
    const data = { ...d, validityDays: d.noExpiry ? null : d.validityDays, method: d.method || null };
    if (id) await db.training.update({ where: { id }, data });
    else await db.training.create({ data: { ...data, order: await db.training.count() } });
  });
}

export async function deleteTraining(id: string) {
  return run(() => db.training.delete({ where: { id } }));
}

export async function saveJobRole(input: { id?: string; name: string; copyFromId?: string | null }) {
  return run(async () => {
    const name = z.string().trim().min(2, "Informe o cargo.").max(120).parse(input.name).toUpperCase();
    if (input.id) {
      await db.jobRole.update({ where: { id: input.id }, data: { name } });
      return;
    }
    const role = await db.jobRole.create({ data: { name, order: await db.jobRole.count() } });
    // Novo cargo pode nascer como cópia de outro (mesmos S/N).
    if (input.copyFromId) {
      const cells = await db.roleTraining.findMany({ where: { roleId: input.copyFromId } });
      await db.roleTraining.createMany({ data: cells.map((c) => ({ roleId: role.id, trainingId: c.trainingId, value: c.value })) });
    }
  });
}

export async function deleteJobRole(id: string) {
  return run(() => db.jobRole.delete({ where: { id } }));
}
