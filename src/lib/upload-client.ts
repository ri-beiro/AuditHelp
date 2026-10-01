"use client";

import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_MB } from "./uploads";

/** Envia um arquivo para o Vercel Blob (produção) ou para o armazenamento local (desenvolvimento). */
export async function uploadFile(file: File, folder: string, blobEnabled: boolean): Promise<string> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`${file.name}: limite de ${MAX_UPLOAD_MB} MB`);
  if (blobEnabled) {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const blob = await upload(`evidencias/${folder}/${safe}`, file, { access: "public", handleUploadUrl: "/api/upload" });
    return blob.url;
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/local", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Falha no upload");
  return json.url;
}
