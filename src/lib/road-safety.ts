// Regras do registro de motoristas (Road Safety): status efetivo dos treinamentos e leitura de planilhas.

export const TRAININGS = [
  { key: "onboarding", label: "Onboarding" },
  { key: "defensive", label: "Curso Direção Defensiva" },
] as const;
export type TrainingKey = (typeof TRAININGS)[number]["key"];

export type EffectiveStatus = "REALIZADO" | "A_VENCER" | "VENCIDO" | "PENDENTE";

export const EFFECTIVE_LABEL: Record<EffectiveStatus, string> = {
  REALIZADO: "Realizado",
  A_VENCER: "A vencer",
  VENCIDO: "Vencido",
  PENDENTE: "Pendente",
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Status considerado nos indicadores. Treinamento realizado com validade expirada volta a ser pendência (VENCIDO);
 * faltando até 30 dias para vencer fica A_VENCER, mas ainda conta como realizado.
 */
export function effectiveStatus(status: string, validUntil: Date | string | null, today = new Date()): EffectiveStatus {
  if (status !== "REALIZADO") return "PENDENTE";
  if (!validUntil) return "REALIZADO";
  const v = new Date(validUntil).getTime();
  const t = new Date(today.toISOString().slice(0, 10)).getTime();
  if (v < t) return "VENCIDO";
  if (v - t <= 30 * DAY) return "A_VENCER";
  return "REALIZADO";
}

export const isDone = (s: EffectiveStatus) => s === "REALIZADO" || s === "A_VENCER";

/** Chave de CPF só com dígitos (usada para atualizar o mesmo motorista na reimportação). */
export function cpfKey(cpf: string | null | undefined) {
  const d = String(cpf ?? "").replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

export function parseTrainingStatus(raw: unknown): "REALIZADO" | "PENDENTE" {
  const s = String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
  return /^(REALIZ|SIM|OK|CONCLU|FEITO|X$)/.test(s) ? "REALIZADO" : "PENDENTE";
}

export const DRIVER_EXCEL_COLUMNS = [
  "Nome",
  "CPF",
  "PLACA",
  "TRANSPORTADORA",
  "ONBOARDING",
  "CURSO DIREÇÃO DEFENSIVA",
  "Data Onboarding",
  "Validade Onboarding",
  "Data Direção Defensiva",
  "Validade Direção Defensiva",
];
