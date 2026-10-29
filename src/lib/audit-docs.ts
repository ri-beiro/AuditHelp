// Documentos da auditoria: lista consolidada, por elemento, das evidências sugeridas em cada linha da matriz
// (campo "evidence" dos critérios). Itens "Observação: ..." e "Entrevistas ..." viram verificações em campo.

export type DocRequirement = { id: string; code: string; text: string };
export type AuditDoc = { key: string; name: string; kind: "documento" | "campo"; requirements: DocRequirement[] };

export const DOC_STATUS_LABEL = { PENDENTE: "Pendente", RECEBIDO: "Recebido", NAO_APLICAVEL: "N/A" } as const;
export type DocStatus = keyof typeof DOC_STATUS_LABEL;

/** Chave estável do documento (sem acentos, minúsculas, espaços simples). */
export function docKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120);
}

const FIELD = /^(observacao|entrevista|entrevistas)\b/;

export function buildAuditDocs(requirements: { id: string; code: string; text: string; criteria: Record<string, string | null> | null }[]) {
  const map = new Map<string, AuditDoc>();
  for (const r of requirements) {
    const raw = r.criteria?.evidence ?? "";
    for (const part of raw.split(";")) {
      const name = part.trim().replace(/\.$/, "");
      if (!name) continue;
      const key = docKey(name);
      const doc = map.get(key) ?? { key, name: name[0].toUpperCase() + name.slice(1), kind: FIELD.test(key) ? "campo" : "documento", requirements: [] };
      if (!doc.requirements.some((x) => x.id === r.id)) doc.requirements.push({ id: r.id, code: r.code, text: r.text });
      map.set(key, doc);
    }
  }
  return [...map.values()].sort((a, b) => b.requirements.length - a.requirements.length || a.name.localeCompare(b.name, "pt-BR"));
}
