// Colaboradores: associação do cargo informado (texto livre) a um cargo da MHC e situação dos treinamentos.

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Cargos sem equivalente exato na MHC, ligados ao mais próximo. */
const OVERRIDES: Record<string, string> = {
  "GERENTE DE LOGISTICA": "GER DISTRIBUICAO PL",
  "GERENTE DE LOGISITICA": "GER DISTRIBUICAO PL",
  "SUPERVISOR DE ROTEIRIZACAO": "SUP LOGISTICA",
  "SUPERVISORA DE ROTEIRIZACAO": "SUP LOGISTICA",
};

/** Abreviações usadas na MHC. */
const WORDS: [RegExp, string][] = [
  [/\bSUPERVISORA?\b/g, "SUP"],
  [/\bGERENTE\b/g, "GER"],
  [/\bCOORDENADORA?\b/g, "COORD"],
  [/\bANALISTA\b/g, "AN"],
  [/\bASSISTENTE\b|\bASS\b/g, "ASSIST"],
  [/\bAUXILIAR\b/g, "AUX"],
  [/\bMONITORAMENTO( DE ENTREGA)?\b/g, "MONIT ENTREGA"],
  [/\bROTEIRIZACAO\b/g, "PLANEJ ROTA"],
  [/\bPRESTACAO DE CONTAS\b/g, "PREST CONTAS"],
  [/\bLOGISITICA\b/g, "LOGISTICA"],
  [/\bDE |\bDA |\bDO /g, ""],
];

export function roleKey(label: string) {
  let s = norm(label);
  if (OVERRIDES[s]) return OVERRIDES[s];
  for (const [re, to] of WORDS) s = s.replace(re, to);
  return s.replace(/\s+/g, " ").trim();
}

/** Encontra o cargo da MHC correspondente ao texto da planilha (ou null). */
export function matchRole<T extends { name: string }>(label: string, roles: T[]): T | null {
  const key = roleKey(label);
  return roles.find((r) => norm(r.name) === key) ?? null;
}

export type TrainingSituation = "REALIZADO" | "A_VENCER" | "VENCIDO" | "PENDENTE";

export const SITUATION_LABEL: Record<TrainingSituation, string> = {
  REALIZADO: "Realizado",
  A_VENCER: "A vencer",
  VENCIDO: "Vencido",
  PENDENTE: "Pendente",
};

export function situation(rec: { doneAt: string | Date; validUntil: string | Date | null } | null | undefined, today = new Date()): TrainingSituation {
  if (!rec) return "PENDENTE";
  if (!rec.validUntil) return "REALIZADO";
  const t = new Date(today.toISOString().slice(0, 10)).getTime();
  const v = new Date(rec.validUntil).getTime();
  if (v < t) return "VENCIDO";
  if (v - t <= 30 * 86400000) return "A_VENCER";
  return "REALIZADO";
}

export const isValid = (s: TrainingSituation) => s === "REALIZADO" || s === "A_VENCER";

/** Validade a partir da data de realização e da regra da MHC (null = sem vencimento ou não definida). */
export function validUntilFor(doneAt: Date, training: { validityDays: number | null; noExpiry: boolean }) {
  if (training.noExpiry || !training.validityDays) return null;
  return new Date(doneAt.getTime() + training.validityDays * 86400000);
}
