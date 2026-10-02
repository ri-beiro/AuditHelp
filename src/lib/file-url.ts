// Arquivos do Vercel Blob são privados: o navegador os acessa pela rota autenticada /api/blob.
export function isBlobUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Endereço para abrir/baixar um arquivo de evidência no navegador. Links externos são mantidos. */
export function fileHref(url: string) {
  return isBlobUrl(url) ? `/api/blob?url=${encodeURIComponent(url)}` : url;
}
