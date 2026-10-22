// Importação da "Página da lista de eventos — Resumo" exportada do Sphera.
import type { IncidentTypeKey } from "./incidents";
import { sheetDate } from "./xlsx-rows";

export const SPHERA_COLUMNS = [
  "ID do evento como link",
  "Evento: Tipo de Incidente",
  "Localização",
  "Sublocais",
  "Data da ocorrência",
  "Título do evento",
  "Descrição",
  "Reportado por",
  "Evento: Proprietário",
  "Todos os subtipos concatenados em um campo",
  "Alto potencial ?",
  "Responsabilidade Atual",
  "Status do fluxo de trabalho do acidente",
  "Status do fluxo de trabalho (de investigações)",
  "Tarefas (x de y)",
  "Uso de localização",
  "Tasks (x of y) from investigation",
  "12 Relacionamento Básico",
];

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const text = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export function isSpheraHeader(header: unknown[]) {
  return header.some((h) => norm(h).startsWith("id do evento")) && header.some((h) => norm(h).includes("tipo de incidente"));
}

/** Classificação da pirâmide a partir do tipo e dos subtipos do Sphera. */
export function spheraType(tipo: unknown, subtipos: unknown): IncidentTypeKey {
  const t = norm(tipo);
  const s = norm(subtipos);
  if (t.includes("fatal") || s.includes("fatal")) return "FATALIDADE";
  if (t.includes("com afastamento") || s.includes("com afastamento") || /\blti\b|\blta\b/.test(s)) return "LTA";
  if (t.includes("com lesao")) return "NLTA";
  if (s.includes("primeiros socorros")) return "FAC";
  if (s.includes("quase acidente") || s.includes("near miss")) return "NEAR_MISS";
  if (s.includes("condicao insegura")) return "CONDICAO_INSEGURA";
  if (s.includes("danos a ativos") || t.includes("sem lesao")) return "INCIDENTE";
  return "OBSERVACAO";
}

export type SpheraEvent = {
  spheraId: string;
  type: IncidentTypeKey;
  subtype: string | null;
  occurredAt: Date;
  title: string;
  description: string;
  area: string;
  hipo: boolean;
  reportedByName: string | null;
  ownerName: string | null;
  basicRef: string | null;
  closed: boolean;
  investigationStatus: string;
};

/** Lê as linhas do arquivo. Eventos com "Relatório de evento inválido" são ignorados. */
export function parseSpheraRows(rows: unknown[][]) {
  const header = rows[0].map(norm);
  const col = (pred: (h: string) => boolean) => header.findIndex(pred);
  const idx = {
    id: col((h) => h.startsWith("id do evento")),
    tipo: col((h) => h.includes("tipo de incidente")),
    sub: col((h) => h.startsWith("sublocais")),
    data: col((h) => h.startsWith("data da ocorrencia")),
    titulo: col((h) => h.startsWith("titulo")),
    desc: col((h) => h.startsWith("descricao")),
    reporter: col((h) => h.startsWith("reportado")),
    owner: col((h) => h.includes("proprietario")),
    subtipos: col((h) => h.includes("subtipos")),
    hipo: col((h) => h.startsWith("alto potencial")),
    resp: col((h) => h.startsWith("responsabilidade")),
    status: col((h) => h.startsWith("status do fluxo de trabalho do acidente")),
    inv: col((h) => h.includes("de investigacoes")),
    uso: col((h) => h.startsWith("uso de localizacao")),
    basic: col((h) => h.includes("relacionamento basico")),
  };
  const get = (r: unknown[], i: number) => (i >= 0 ? r[i] : "");
  const events: SpheraEvent[] = [];
  const errors: string[] = [];
  let skipped = 0;
  rows.slice(1).forEach((r, n) => {
    const line = n + 2;
    const id = text(get(r, idx.id));
    if (!id) return;
    const status = norm(get(r, idx.status));
    if (status.includes("invalido")) {
      skipped++;
      return;
    }
    const occurredAt = sheetDate(get(r, idx.data));
    if (!occurredAt) {
      errors.push(`Linha ${line}: data inválida`);
      return;
    }
    const description = text(get(r, idx.desc));
    const sub = text(get(r, idx.subtipos));
    const firstSentence = description.split(/(?<=[.!?])\s/)[0] ?? "";
    const title = text(get(r, idx.titulo)) || (firstSentence.length > 90 ? `${firstSentence.slice(0, 87)}…` : firstSentence) || `Evento Sphera ${id}`;
    events.push({
      spheraId: id,
      type: spheraType(get(r, idx.tipo), sub),
      subtype: [text(get(r, idx.tipo)), sub].filter(Boolean).join(" · ") || null,
      occurredAt,
      title,
      description: description || title,
      area: text(get(r, idx.uso)) || text(get(r, idx.sub)) || "Não informada",
      hipo: norm(get(r, idx.hipo)).startsWith("s"),
      reportedByName: text(get(r, idx.reporter)) || null,
      ownerName: text(get(r, idx.resp)) || text(get(r, idx.owner)) || null,
      basicRef: text(get(r, idx.basic)) || null,
      closed: status === "fechado",
      investigationStatus: norm(get(r, idx.inv)),
    });
  });
  return { events, errors, skipped };
}
