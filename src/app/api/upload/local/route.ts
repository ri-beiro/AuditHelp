// Alternativa para desenvolvimento local, quando BLOB_READ_WRITE_TOKEN não está configurado.
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { can, getCurrentUser } from "@/server/context";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_MB } from "@/lib/uploads";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

export async function POST(request: Request) {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) {
    return NextResponse.json({ error: "Use o Vercel Blob em produção." }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user || !can(user.role, "evidence")) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
    return NextResponse.json({ error: `Limite de ${MAX_UPLOAD_MB} MB` }, { status: 400 });
  if (file.type && !ALLOWED_UPLOAD_TYPES.includes(file.type))
    return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const name = `${randomUUID()}-${safe}`;
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/api/files/${name}` });
}
