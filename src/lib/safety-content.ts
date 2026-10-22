// Contatos de Segurança: tipos de conteúdo e leitura de links.

export const CONTENT_CATEGORIES = ["DDS", "Safety Alert", "Campanha", "Treinamento", "Procedimento", "Outro"] as const;

export type ItemKind = "FILE" | "YOUTUBE" | "LINK";

/** Extrai o ID de um vídeo do YouTube (watch, youtu.be, shorts, embed). */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1, 12) || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v")!.slice(0, 11);
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      return m ? m[1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Como o item é exibido no visualizador. */
export function viewerType(item: { kind: string; mimeType: string | null; name: string }) {
  if (item.kind === "YOUTUBE") return "youtube" as const;
  if (item.kind === "LINK") return "link" as const;
  const m = item.mimeType ?? "";
  const ext = item.name.toLowerCase().split(".").pop() ?? "";
  if (m.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image" as const;
  if (m.startsWith("video/") || ext === "mp4") return "video" as const;
  if (m === "application/pdf" || ext === "pdf") return "pdf" as const;
  return "download" as const;
}
