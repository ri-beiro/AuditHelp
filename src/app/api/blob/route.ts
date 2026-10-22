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
  const [evidence, attachment, incidentFile, auditReport] = await Promise.all([
    db.evidence.findFirst({ where: { url }, select: { assessment: { select: { unitId: true } } } }),
    db.auditAttachment.findFirst({ where: { url }, select: { audit: { select: { unitId: true } } } }),
    db.incidentAttachment.findFirst({ where: { url }, select: { incident: { select: { unitId: true } } } }),
    db.auditRecord.findFirst({ where: { reportUrl: url }, select: { unitId: true } }),
  ]);
  // Conteúdos de Contatos de Segurança têm regra própria de visibilidade (autor ou CDs escolhidos).
  const contentItem = await db.safetyContentItem.findFirst({ where: { url }, select: { contentId: true } });
  if (contentItem) {
    const { canViewContent } = await import("@/server/safety-content-queries");
    if (!(await canViewContent(user, contentItem.contentId))) return new Response("Sem acesso", { status: 403 });
    return stream(url, request);
  }
  const unitId = evidence?.assessment.unitId ?? attachment?.audit.unitId ?? incidentFile?.incident.unitId ?? auditReport?.unitId;
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

/** Repassa o arquivo privado com suporte a Range (necessário para avançar/voltar vídeos MP4). */
async function stream(url: string, request: Request) {
  const range = request.headers.get("range");
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      ...(range ? { range } : {}),
    },
  });
  if (!res.ok || !res.body) return new Response("Arquivo não encontrado", { status: 404 });
  // "inline" para PDF, imagem e vídeo abrirem dentro do visualizador em vez de baixar.
  const headers = new Headers({ "Cache-Control": "private, max-age=300", "Accept-Ranges": "bytes", "Content-Disposition": "inline" });
  for (const h of ["content-type", "content-length", "content-range", "etag"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers });
}
