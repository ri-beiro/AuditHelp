import type { PrismaClient } from "@prisma/client";
import type { MhcData } from "./mhc";

/** Grava a MHC espelhando a planilha: cria/atualiza treinamentos e cargos e remove os que saíram. */
export async function applyMhc(db: PrismaClient, data: MhcData) {
  return db.$transaction(
    async (tx) => {
      const trainingIds = new Map<string, string>();
      for (const [order, t] of data.trainings.entries()) {
        const row = await tx.training.upsert({
          where: { name: t.name },
          update: { ...t, order },
          create: { ...t, order },
        });
        trainingIds.set(t.name, row.id);
      }
      const roleIds: string[] = [];
      for (const [order, r] of data.roles.entries()) {
        const role = await tx.jobRole.upsert({ where: { name: r.name }, update: { order }, create: { name: r.name, order } });
        roleIds.push(role.id);
        await tx.roleTraining.deleteMany({ where: { roleId: role.id } });
        await tx.roleTraining.createMany({
          data: Object.entries(r.values)
            .filter(([name]) => trainingIds.has(name))
            .map(([name, value]) => ({ roleId: role.id, trainingId: trainingIds.get(name)!, value })),
        });
      }
      await tx.jobRole.deleteMany({ where: { id: { notIn: roleIds } } });
      await tx.training.deleteMany({ where: { id: { notIn: [...trainingIds.values()] } } });
      return { trainings: data.trainings.length, roles: data.roles.length };
    },
    { timeout: 60_000 },
  );
}
