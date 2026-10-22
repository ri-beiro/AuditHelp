"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { validUntilFor } from "@/lib/employees";
import { assertUnitAccess, requirePermission } from "./context";

type Result = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/colaboradores");
  revalidatePath("/treinamentos");
}

async function employeeForUser(id: string, perm: "action" | "score") {
  const user = await requirePermission(perm);
  const emp = await db.employee.findUniqueOrThrow({ where: { id } });
  await assertUnitAccess(user, emp.unitId);
  return emp;
}

const schema = z.object({
  id: z.string().optional(),
  unitId: z.string(),
  name: z.string().trim().min(3, "Informe o nome.").max(120),
  team: z.string().trim().max(60).optional(),
  roleId: z.string().nullable(),
  active: z.boolean().default(true),
});

export async function saveEmployee(input: z.input<typeof schema>): Promise<Result> {
  try {
    const user = await requirePermission("action");
    const { id, ...d } = schema.parse(input);
    await assertUnitAccess(user, d.unitId);
    const data = { ...d, name: d.name.toUpperCase().replace(/\s+/g, " "), team: d.team || null };
    const dup = await db.employee.findFirst({ where: { unitId: d.unitId, name: data.name, NOT: id ? { id } : undefined } });
    if (dup) throw new Error("Já existe um colaborador com esse nome nesta unidade.");
    if (id) {
      await employeeForUser(id, "action");
      await db.employee.update({ where: { id }, data });
    } else await db.employee.create({ data });
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Erro inesperado." };
  }
}

export async function deleteEmployee(id: string): Promise<Result> {
  try {
    await employeeForUser(id, "score");
    await db.employee.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

/** Registra (ou limpa, com doneAt null) a realização de um treinamento; a validade vem da MHC. */
export async function setEmployeeTraining(employeeId: string, trainingId: string, doneAt: string | null): Promise<Result & { validUntil?: string | null }> {
  try {
    await employeeForUser(employeeId, "action");
    if (!doneAt) {
      await db.employeeTraining.deleteMany({ where: { employeeId, trainingId } });
      refresh();
      return { ok: true };
    }
    const date = new Date(`${doneAt.slice(0, 10)}T12:00:00Z`);
    if (Number.isNaN(+date)) throw new Error("Data inválida.");
    if (date > new Date(Date.now() + 86400000)) throw new Error("A data de realização não pode ser futura.");
    const training = await db.training.findUniqueOrThrow({ where: { id: trainingId } });
    const validUntil = validUntilFor(date, training);
    await db.employeeTraining.upsert({
      where: { employeeId_trainingId: { employeeId, trainingId } },
      update: { doneAt: date, validUntil },
      create: { employeeId, trainingId, doneAt: date, validUntil },
    });
    refresh();
    return { ok: true, validUntil: validUntil?.toISOString() ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}
