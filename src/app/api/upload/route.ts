// Upload direto do navegador para o Vercel Blob (sem passar pelo limite de 4,5 MB das funções).
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { can, getCurrentUser } from "@/server/context";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_MB } from "@/lib/uploads";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (!user || !can(user.role, "evidence")) throw new Error("Não autorizado");
        if (!pathname.startsWith("evidencias/")) throw new Error("Caminho inválido");
        return {
          allowedContentTypes: ALLOWED_UPLOAD_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_MB * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
