// Entrega arquivos do Vercel Blob privado: exige login e acesso à unidade da evidência/anexo.
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { getAllowedUnits, getCurrentUser } from "@/server/context";
import { isBlobUrl } from "@/lib/file-url";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (!isBlobUrl(url)) return new Response("Arquivo inválido", { status: 400 });

  // O arquivo precisa estar registrado como evidência ou anexo de auditoria de uma unidade do usuário.
  const [evidence, attachment] = await Promise.all([
    db.evidence.findFirst({ where: { url }, select: { assessment: { select: { unitId: true } } } }),
    db.auditAttachment.findFirst({ where: { url }, select: { audit: { select: { unitId: true } } } }),
  ]);
  const unitId = evidence?.assessment.unitId ?? attachment?.audit.unitId;
  if (!unitId) return new Response("Arquivo não encontrado", { status: 404 });
  const units = await getAllowedUnits(user);
  if (!units.some((u) => u.id === unitId)) return new Response("Sem acesso", { status: 403 });

  const blob = await get(url, { access: "private" });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return new Response("Arquivo não encontrado", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType ?? "application/octet-stream",
      "Content-Disposition": blob.blob.contentDisposition,
      "Cache-Control": "private, max-age=300",
    },
  });
}
