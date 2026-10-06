// Regras das ocorrências de segurança: pirâmide de Heinrich/Bird, criticidade,
// contador de dias sem acidentes e progresso da investigação.

export const INCIDENT_TYPES = [
  "FATALIDADE",
  "LTA",
  "NLTA",
  "FAC",
  "INCIDENTE",
  "NEAR_MISS",
  "CONDICAO_INSEGURA",
  "OBSERVACAO",
] as const;
export type IncidentTypeKey = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_TYPE_LABEL: Record<IncidentTypeKey, string> = {
  FATALIDADE: "Fatalidade",
  LTA: "Acidente com afastamento (LTA)",
  NLTA: "Acidente sem afastamento (NLTA)",
  FAC: "Primeiros socorros (FAC)",
  INCIDENTE: "Incidente",
  NEAR_MISS: "Near miss (quase acidente)",
  CONDICAO_INSEGURA: "Condição insegura",
  OBSERVACAO: "Observação de segurança",
};

export const INCIDENT_TYPE_SHORT: Record<IncidentTypeKey, string> = {
  FATALIDADE: "FAT",
  LTA: "LTA",
  NLTA: "NLTA",
  FAC: "FAC",
  INCIDENTE: "Incidente",
  NEAR_MISS: "Near miss",
  CONDICAO_INSEGURA: "Cond. insegura",
  OBSERVACAO: "Observação",
};

/**
 * Acidentes com afastamento: são os únicos que zeram o contador "Dias sem acidentes".
 * NLTA (sem afastamento) e FAC não zeram. Fatalidade conta como afastamento.
 */
export const LOST_TIME: IncidentTypeKey[] = ["FATALIDADE", "LTA"];

/** Níveis da pirâmide (topo → base), no modelo corporativo — rótulos mantidos em inglês. */
export const PYRAMID_LEVELS: { key: string; label: string; types: IncidentTypeKey[]; color: string; ink: string }[] = [
  { key: "FATALITIES", label: "FATALITIES", types: ["FATALIDADE"], color: "#d7262e", ink: "#ffffff" },
  { key: "LTC", label: "LTC", types: ["LTA"], color: "#f1a36b", ink: "#ffffff" },
  { key: "NLTC", label: "NLTC", types: ["NLTA"], color: "#bdbdbd", ink: "#ffffff" },
  { key: "FIRST_AID", label: "FIRST AID", types: ["FAC"], color: "#f07a1f", ink: "#ffffff" },
  { key: "INCIDENTS", label: "INCIDENTS & ASSET DAMAGE", types: ["INCIDENTE"], color: "#f2d417", ink: "#ffffff" },
  { key: "OFS_BOS", label: "OFS + BOS", types: ["NEAR_MISS", "CONDICAO_INSEGURA", "OBSERVACAO"], color: "#1fa24a", ink: "#ffffff" },
];

/** Início da contagem de dias sem acidentes com afastamento quando a unidade não define outra data. */
export const DEFAULT_SAFETY_START = "2019-10-28";

/** Ordem de criticidade: HIPO primeiro, depois a gravidade do tipo. */
const TYPE_RANK: Record<IncidentTypeKey, number> = {
  FATALIDADE: 1,
  LTA: 2,
  NLTA: 3,
  FAC: 4,
  INCIDENTE: 5,
  NEAR_MISS: 6,
  CONDICAO_INSEGURA: 7,
  OBSERVACAO: 8,
};

export function criticalityRank(i: { type: IncidentTypeKey; hipo: boolean }) {
  return i.hipo ? 0 : TYPE_RANK[i.type];
}

export function criticalityLabel(i: { type: IncidentTypeKey; hipo: boolean }) {
  return i.hipo ? `HIPO · ${INCIDENT_TYPE_SHORT[i.type]}` : INCIDENT_TYPE_LABEL[i.type];
}

export function sortByCriticality<T extends { type: IncidentTypeKey; hipo: boolean; occurredAt: string | Date }>(list: T[]) {
  return [...list].sort(
    (a, b) => criticalityRank(a) - criticalityRank(b) || +new Date(b.occurredAt) - +new Date(a.occurredAt),
  );
}

// ---------------------------------------------------------------------------
// Dias sem acidentes
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export type SafetyStreak = { from: string; to: string | null; days: number };

export function daysWithoutAccidents(accidentDates: Date[], baseDate: Date, today = new Date()) {
  const dates = accidentDates
    .filter((d) => d <= today)
    .map(dayStart)
    .sort((a, b) => a - b);
  const t = dayStart(today);
  const base = dayStart(baseDate);
  const last = dates.length ? dates[dates.length - 1] : null;
  const current = Math.max(0, Math.round((t - (last ?? base)) / DAY));
  const streaks: SafetyStreak[] = [];
  let start = Math.min(base, dates[0] ?? base);
  for (const d of dates) {
    if (d > start) streaks.push({ from: new Date(start).toISOString(), to: new Date(d).toISOString(), days: Math.round((d - start) / DAY) });
    start = d;
  }
  streaks.push({ from: new Date(start).toISOString(), to: null, days: current });
  const record = Math.max(...streaks.map((s) => s.days));
  return {
    current,
    record,
    lastAccident: last ? new Date(last).toISOString() : null,
    history: streaks.reverse(),
  };
}

// ---------------------------------------------------------------------------
// Progresso da investigação
// ---------------------------------------------------------------------------

export type Step = "NAO_INICIADO" | "EM_ANDAMENTO" | "AGENDADO" | "CONCLUIDO";

export const STEP_LABEL: Record<Step, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em andamento",
  AGENDADO: "Agendado",
  CONCLUIDO: "Concluído",
};

/** O plano de ação é concluído automaticamente quando todas as ações vinculadas estão concluídas/canceladas. */
export function planStepStatus(stored: Step, actions: { status: string }[]): Step {
  if (!actions.length) return stored === "CONCLUIDO" ? "CONCLUIDO" : "NAO_INICIADO";
  const done = actions.every((a) => a.status === "CONCLUIDA" || a.status === "CANCELADA");
  return done ? "CONCLUIDO" : "EM_ANDAMENTO";
}

export function investigationProgress(steps: { report: Step; investigation: Step; plan: Step; lessons: Step }) {
  const order = [steps.report, steps.investigation, steps.plan, steps.lessons];
  let pct = 0;
  for (const s of order) {
    if (s !== "CONCLUIDO") break;
    pct += 25;
  }
  return pct;
}

export const DEFAULT_AREAS = [
  "Portaria",
  "Pátio Inbound",
  "Pátio Outbound",
  "Docas / Expedição",
  "Recebimento",
  "Armazenagem / Racks",
  "Câmara fria",
  "Picking / Separação",
  "Manutenção",
  "Carregamento",
  "Escritório / ADM",
  "Refeitório / Vestiário",
  "Área externa",
];

export const AUDIT_RECORD_TYPES = [
  "Auditoria WISE²",
  "12 Básicos",
  "Contratada",
  "Auditoria interna",
  "Auditoria externa",
  "Inspeção / GOS",
  "Outra",
];

/** Interpreta o tipo vindo de planilhas (aceita siglas e nomes em português). */
export function parseIncidentType(raw: unknown): IncidentTypeKey | null {
  const s = String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
  if (!s) return null;
  if (/FATAL|^FAT$/.test(s)) return "FATALIDADE";
  if (/^NLTA|SEM AFAST/.test(s)) return "NLTA";
  if (/^LTA|COM AFAST/.test(s)) return "LTA";
  if (/^FAC|PRIMEIROS SOCORROS/.test(s)) return "FAC";
  if (/NEAR|QUASE|^NM$/.test(s)) return "NEAR_MISS";
  if (/CONDI/.test(s)) return "CONDICAO_INSEGURA";
  if (/OBSERV|GOS|APR|DESVIO/.test(s)) return "OBSERVACAO";
  if (/INCIDENTE/.test(s)) return "INCIDENTE";
  return null;
}

export const INCIDENT_EXCEL_COLUMNS = ["Data", "Hora", "Área", "Tipo", "HIPO", "Título", "Descrição", "Responsável (e-mail)", "ID Sphera"];
