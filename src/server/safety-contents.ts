"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { youtubeId } from "@/lib/safety-content";
import { assertUnitAccess, requirePermission } from "./context";

type Result = { ok: true } | { ok: false; error: string };

const itemSchema = z.object({
  kind: z.enum(["FILE", "YOUTUBE", "LINK"]),
  name: z.string().trim().min(1).max(300),
  url: z.string().trim().min(1).max(2000),
  mimeType: z.string().max(200).nullable().optional(),
  size: z.number().int().nonnegative().nullable().optional(),
});

const schema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Informe um título.").max(200),
  description: z.string().max(4000).optional(),
  category: z.string().trim().min(2).max(60),
  visibility: z.enum(["PRIVATE", "UNITS"]),
  unitIds: z.array(z.string()).max(200),
  items: z.array(itemSchema).min(1, "Adicione pelo menos um arquivo, vídeo ou link.").max(50),
});

export async function saveSafetyContent(input: z.input<typeof schema>): Promise<Result> {
  try {
    const user = await requirePermission("admin");
    const d = schema.parse(input);
    if (d.visibility === "UNITS" && !d.unitIds.length) throw new Error("Escolha pelo menos um CD que pode ver o conteúdo.");
    for (const unitId of d.unitIds) await assertUnitAccess(user, unitId);
    for (const it of d.items) {
      if (it.kind === "YOUTUBE" && !youtubeId(it.url)) throw new Error(`Link do YouTube inválido: ${it.url}`);
      if (it.kind === "FILE" && !/^(https:\/\/|\/api\/files\/)/.test(it.url)) throw new Error("Arquivo inválido.");
      if (it.kind === "LINK" && !/^https?:\/\//.test(it.url)) throw new Error(`Link inválido: ${it.url}`);
    }
    const data = {
      title: d.title,
      description: d.description || null,
      category: d.category,
      visibility: d.visibility,
    };
    const units = d.visibility === "UNITS" ? d.unitIds : [];
    await db.$transaction(async (tx) => {
      const content = d.id
        ? await tx.safetyContent.update({ where: { id: d.id }, data })
        : await tx.safetyContent.create({ data: { ...data, createdById: user.id } });
      await tx.safetyContentUnit.deleteMany({ where: { contentId: content.id } });
      if (units.length) await tx.safetyContentUnit.createMany({ data: units.map((unitId) => ({ contentId: content.id, unitId })) });
      await tx.safetyContentItem.deleteMany({ where: { contentId: content.id } });
      await tx.safetyContentItem.createMany({
        data: d.items.map((it, order) => ({ ...it, mimeType: it.mimeType ?? null, size: it.size ?? null, order, contentId: content.id })),
      });
    });
    revalidatePath("/contatos-seguranca");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Erro inesperado." };
  }
}

export async function deleteSafetyContent(id: string): Promise<Result> {
  try {
    await requirePermission("admin");
    const items = await db.safetyContentItem.findMany({ where: { contentId: id, kind: "FILE" } });
    await db.safetyContent.delete({ where: { id } });
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      const urls = items.map((i) => i.url).filter((u) => u.startsWith("https://"));
      if (urls.length) await del(urls).catch(() => undefined);
    }
    revalidatePath("/contatos-seguranca");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro inesperado." };
  }
}
