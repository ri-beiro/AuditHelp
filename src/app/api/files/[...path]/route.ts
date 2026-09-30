import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/server/context";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const { path: parts } = await params;
  const name = path.basename(parts.join("/"));
  try {
    const data = await readFile(path.join(process.cwd(), ".uploads", name));
    const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), { headers: { "Content-Type": type } });
  } catch {
    return new Response("Arquivo não encontrado", { status: 404 });
  }
}
