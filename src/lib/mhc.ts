// Leitura da aba MHC (matriz de treinamentos por cargo) a partir das células da planilha.

export type MhcValue = "S" | "N" | "NA";
export type MhcTraining = {
  name: string;
  validityDays: number | null;
  noExpiry: boolean;
  method: string | null;
  effectiveness: boolean | null;
  passingScore: number | null;
};
export type MhcData = { trainings: MhcTraining[]; roles: { name: string; values: Record<string, MhcValue> }[] };

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export function parseMhcValue(v: unknown): MhcValue | null {
  const s = norm(v);
  if (s === "S" || s === "SIM" || s === "X") return "S";
  if (s === "N" || s === "NAO") return "N";
  if (s === "NA" || s === "N/A") return "NA";
  return null;
}

function parseValidity(v: unknown): { validityDays: number | null; noExpiry: boolean } {
  const s = norm(v);
  if (!s) return { validityDays: null, noExpiry: false };
  if (s === "NA" || s === "N/A" || s.startsWith("NAO")) return { validityDays: null, noExpiry: true };
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? { validityDays: Math.round(n), noExpiry: false } : { validityDays: null, noExpiry: false };
}

/**
 * Lê a MHC: a linha "Cargos" traz os treinamentos; as linhas Vencimento, Método, Avaliação de Eficácia e
 * Nota de Corte trazem as regras; as linhas seguintes são os cargos com S/N/NA. A tabela "TREINAMENTO × VALIDADE"
 * (quando existe, abaixo da matriz) tem prioridade sobre a linha Vencimento.
 */
export function parseMhc(rows: unknown[][]): MhcData {
  const headerIdx = rows.findIndex((r) => norm(r[0]) === "CARGOS" && r.slice(1).some((x) => clean(x)));
  if (headerIdx < 0) throw new Error("Aba MHC sem a linha \"Cargos\" com os treinamentos.");
  const header = rows[headerIdx];
  const cols = header.map((h, j) => ({ j, name: clean(h) })).filter((c) => c.j > 0 && c.name);

  const meta: Record<string, unknown[]> = {};
  let i = headerIdx + 1;
  for (; i < rows.length; i++) {
    const k = norm(rows[i][0]);
    if (k.startsWith("VENCIMENTO")) meta.venc = rows[i];
    else if (k.startsWith("METODO")) meta.metodo = rows[i];
    else if (k.startsWith("AVALIACAO")) meta.aval = rows[i];
    else if (k.startsWith("NOTA")) meta.nota = rows[i];
    else break;
  }

  const roles: MhcData["roles"] = [];
  for (; i < rows.length; i++) {
    const name = clean(rows[i][0]);
    if (!name) break;
    const values: Record<string, MhcValue> = {};
    for (const c of cols) {
      const v = parseMhcValue(rows[i][c.j]);
      if (v) values[c.name] = v;
    }
    if (Object.keys(values).length) roles.push({ name, values });
  }

  // Tabela de validade abaixo da matriz (TREINAMENTO | VALIDADE).
  const validity = new Map<string, unknown>();
  const vIdx = rows.findIndex((r, k) => k > headerIdx && /^TRE?I?NAMENTO/.test(norm(r[0])) && norm(r[1]).startsWith("VALIDADE"));
  if (vIdx >= 0) {
    for (let k = vIdx + 1; k < rows.length && clean(rows[k][0]); k++) validity.set(norm(rows[k][0]), rows[k][1]);
  }

  const trainings = cols.map((c) => {
    const v = validity.has(norm(c.name)) ? validity.get(norm(c.name)) : meta.venc?.[c.j];
    const aval = norm(meta.aval?.[c.j]);
    const nota = Number(meta.nota?.[c.j]);
    return {
      name: c.name,
      ...parseValidity(v),
      method: clean(meta.metodo?.[c.j]) || null,
      effectiveness: aval ? aval.startsWith("S") : null,
      passingScore: Number.isFinite(nota) && nota > 0 ? nota : null,
    };
  });
  return { trainings, roles };
}
