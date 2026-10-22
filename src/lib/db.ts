import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// PRISMA_QUERY_LOG=1 mostra cada consulta no log (diagnóstico de desempenho).
export const db = globalForPrisma.prisma ?? new PrismaClient(process.env.PRISMA_QUERY_LOG === "1" ? { log: ["query"] } : undefined);

globalForPrisma.prisma = db;
