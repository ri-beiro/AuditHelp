"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { cpfKey } from "@/lib/road-safety";
import { assertUnitAccess, requirePermission } from "./context";

type Result = { ok: true } | { ok: false; error: string };

const date = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(`${v.slice(0, 10)}T12:00:00Z`) : null));

const schema = z.object({
  id: z.string().optional(),
  unitId: z.string(),
  name: z.string().trim().min(3, "Informe o nome."),
  cpf: z.string().trim().max(20).optional(),
  plate: z.string().trim().max(12).optional(),
  carrier: z.string().trim().min(2, "Informe a transportadora.").max(80),
  active: z.boolean().default(true),
  notes: z.string().max(2000).optional(),
  onboardingStatus: z.enum(["REALIZADO", "PENDENTE"]),
  onboardingAt: date,
  onboardingValid: date,
  defensiveStatus: z.enum(["REALIZADO", "PENDENTE"]),
  defensiveAt: date,
  defensiveValid: date,
});

export async function saveDriver(input: z.input<typeof schema>): Promise<Result> {
  try {
    const user = await requirePermission("action");
    const { id, ...d } = schema.parse(input);
    await assertUnitAccess(user, d.unitId);
    const data = {
      ...d,
      name: d.name.replace(/\s+/g, " "),
      carrier: d.carrier.toUpperCase(),
      plate: d.plate?.toUpperCase().replace(/[^A-Z0-9]/g, "") || null,
      cpf: d.cpf || null,
      cpfKey: cpfKey(d.cpf),
      notes: d.notes || null,
    };
    if (data.cpfKey) {
      const dup = await db.driver.findFirst({ where: { unitId: d.unitId, cpfKey: data.cpfKey, NOT: id ? { id } : undefined } });
      if (dup) throw new Error(`CPF já cadastrado para ${dup.name}.`);
    }
    if (id) {
      const cur = await db.driver.findUniqueOrThrow({ where: { id } });
      await assertUnitAccess(user, cur.unitId);
      await db.driver.update({ where: { id }, data });
    } else await db.driver.create({ data });
    revalidatePath("/road-safety");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Erro inesperado." };
  }
}

export async function deleteDriver(id: string): Promise<Result> {
  try {
    const user = await requirePermission("score");
    const cur = await db.driver.findUniqueOrThrow({ where: { id } });
    await assertUnitAccess(user, cur.unitId);
    await db.driver.delete({ where: { id } });
    revalidatePath("/road-safety");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}
