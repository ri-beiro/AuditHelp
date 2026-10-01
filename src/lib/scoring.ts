// Motor de pontuação — reproduz as fórmulas das planilhas oficiais.
//
// WISE (Matriz de Auditoria WISE v8, curva de Bradley):
//   - cada afirmação recebe 0 (não implementado), 1 (parcial) ou 2 (100% implementado);
//   - % do nível = soma das notas / (2 × nº de afirmações do nível), arredondado a 2 casas;
//   - nota bruta do elemento = soma dos % dos níveis 1..5;
//   - nota final = parte inteira + fração arredondada para 0 / 0,25 / 0,5 / 0,75 / 1
//     (limiares 0,13 / 0,33 / 0,63 / 0,83 — fórmula da célula B2 de cada aba);
//   - pontuação WISE = soma dos 13 elementos (máx. 65 pontos);
//   - regra dos 75%: só se avalia o nível seguinte quando o atual está validado em ≥ 75%.
//
// 12 Básicos (Assessment "SB Checklist Distribution"):
//   - Basic = 0, Partial = 0,25, Significant = 0,75, Compliant = 1, N/A fora do cálculo;
//   - % do básico = soma / nº de itens avaliados (sem N/A);
//   - se algum item de risco nível 1 estiver em "Basic", o básico fica limitado a 50%;
//   - pontuação geral = média dos básicos aplicáveis; "Score Nível 1" = média dos itens de risco 1.

export type Tone = "critico" | "atencao" | "conforme" | "neutro";

export const WISE_VALUES = ["0", "1", "2"] as const;
export const BASICS_VALUES = ["BASIC", "PARTIAL", "SIGNIFICANT", "COMPLIANT", "NA"] as const;

export const BASICS_POINTS: Record<string, number | null> = {
  BASIC: 0,
  PARTIAL: 0.25,
  SIGNIFICANT: 0.75,
  COMPLIANT: 1,
  NA: null,
};

export const BASICS_LABELS: Record<string, string> = {
  BASIC: "Básico",
  PARTIAL: "Parcial",
  SIGNIFICANT: "Significativo",
  COMPLIANT: "Conforme",
  NA: "N/A",
};

export const WISE_LABELS: Record<string, string> = {
  "0": "Não implementado",
  "1": "Parcial",
  "2": "Implementado",
};

export const WISE_MAX_ELEMENT = 5;
export const WISE_MAX_TOTAL = 65;
export const WISE_GATE = 0.75;

// ---------------------------------------------------------------------------
// Classificação oficial da auditoria WISE² (Treinamento Auditor Júnior, slide 129)
//   Cultura (0–65 pts)        Compliance dos Básicos
//   A  48,75 – 65  Interdependente   80% – 100%  Managed Risk
//   B  32,5 – 48,75 Independente     65% – 80%
//   C  16,25 – 32,5 Dependente       40% – 65%
//   D  0 – 16,25   Reativo           0% – 40%
// Por elemento (0–5) os mesmos quartos: 3,75 / 2,5 / 1,25.
// Classe do site = a pior entre cultura e compliance.
// ---------------------------------------------------------------------------

export type Grade = "A" | "B" | "C" | "D";

export const GRADE_BANDS = {
  /** limites inferiores de A, B e C para a pontuação de cultura (0–65) */
  CULTURE: { A: 48.75, B: 32.5, C: 16.25 },
  /** limites inferiores de A, B e C para o compliance (0–1) */
  COMPLIANCE: { A: 0.8, B: 0.65, C: 0.4 },
};

export const GRADE_STAGE: Record<Grade, string> = {
  A: "Interdependente",
  B: "Independente",
  C: "Dependente",
  D: "Reativo",
};

export const GRADE_RISK: Record<Grade, string> = {
  A: "Managed Risk",
  B: "Medium Risk",
  C: "Medium Risk",
  D: "Medium Risk",
};

const GRADE_ORDER: Grade[] = ["A", "B", "C", "D"];

export function cultureGrade(total: number | null): Grade | null {
  if (total === null) return null;
  const b = GRADE_BANDS.CULTURE;
  return total >= b.A ? "A" : total >= b.B ? "B" : total >= b.C ? "C" : "D";
}

/** Classe de um elemento WISE (nota 0–5) — equivale à pontuação × 13 nas faixas de cultura. */
export function elementGrade(score: number | null): Grade | null {
  return score === null ? null : cultureGrade(score * 13);
}

export function complianceGrade(pct: number | null): Grade | null {
  if (pct === null) return null;
  const b = GRADE_BANDS.COMPLIANCE;
  const v = Math.round(pct * 10000) / 10000;
  return v >= b.A ? "A" : v >= b.B ? "B" : v >= b.C ? "C" : "D";
}

export function siteGrade(culture: Grade | null, compliance: Grade | null): Grade | null {
  if (!culture || !compliance) return null;
  return GRADE_ORDER[Math.max(GRADE_ORDER.indexOf(culture), GRADE_ORDER.indexOf(compliance))];
}

/** Semáforo: A = conforme (verde), B = atenção (amarelo), C/D = crítico (vermelho). */
export function gradeTone(g: Grade | null): Tone {
  if (!g) return "neutro";
  return g === "A" ? "conforme" : g === "B" ? "atencao" : "critico";
}

export function wiseTone(score: number | null): Tone {
  return gradeTone(elementGrade(score));
}

export function basicsTone(pct: number | null): Tone {
  return gradeTone(complianceGrade(pct));
}

/** Estágio da curva de Bradley correspondente à nota do elemento (0–5). */
export function bradleyStage(score: number | null): string {
  const g = elementGrade(score);
  return g ? GRADE_STAGE[g] : "Não avaliado";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ScoredRequirement = {
  value: string | null | undefined;
  level?: number | null;
  riskLevel?: number | null;
};

export type WiseLevelResult = {
  level: number;
  statements: number;
  answered: number;
  points: number;
  maxPoints: number;
  pct: number;
  /** nível com respostas acima de um nível ainda não validado em 75% */
  gateWarning: boolean;
};

export type WiseElementResult = {
  levels: WiseLevelResult[];
  raw: number;
  score: number;
  pct: number;
  answered: number;
  total: number;
  conformes: number;
  desvios: number;
  tone: Tone;
  stage: string;
  grade: Grade | null;
};

/** Arredondamento da planilha: parte inteira + fração em quartos (B2). */
export function roundWiseScore(raw: number): number {
  const r = round2(raw);
  const int = Math.floor(r);
  const frac = round2(r - int);
  let q: number;
  if (frac <= 0.13) q = 0;
  else if (frac <= 0.33) q = 0.25;
  else if (frac <= 0.63) q = 0.5;
  else if (frac <= 0.83) q = 0.75;
  else q = 1;
  return Math.min(WISE_MAX_ELEMENT, int + q);
}

export function scoreWiseElement(reqs: ScoredRequirement[]): WiseElementResult {
  const levels: WiseLevelResult[] = [];
  for (let level = 1; level <= 5; level++) {
    const inLevel = reqs.filter((r) => r.level === level);
    const answered = inLevel.filter((r) => r.value != null && r.value !== "");
    const points = answered.reduce((s, r) => s + Number(r.value), 0);
    const maxPoints = inLevel.length * 2;
    levels.push({
      level,
      statements: inLevel.length,
      answered: answered.length,
      points,
      maxPoints,
      pct: maxPoints ? round2(points / maxPoints) : 0,
      gateWarning: false,
    });
  }
  for (let i = 1; i < levels.length; i++) {
    const prevOk = levels.slice(0, i).every((l) => l.pct >= WISE_GATE);
    levels[i].gateWarning = !prevOk && levels[i].answered > 0;
  }
  const answered = reqs.filter((r) => r.value != null && r.value !== "").length;
  const raw = round2(levels.reduce((s, l) => s + l.pct, 0));
  const score = roundWiseScore(raw);
  return {
    levels,
    raw,
    score,
    pct: score / WISE_MAX_ELEMENT,
    answered,
    total: reqs.length,
    conformes: reqs.filter((r) => r.value === "2").length,
    desvios: reqs.filter((r) => r.value === "0" || r.value === "1").length,
    tone: answered ? wiseTone(score) : "neutro",
    stage: answered ? bradleyStage(score) : "Não avaliado",
    grade: answered ? elementGrade(score) : null,
  };
}

export type BasicsElementResult = {
  pct: number | null;
  /** % sem o limitador de 50% */
  rawPct: number | null;
  capped: boolean;
  answered: number;
  applicable: number;
  total: number;
  conformes: number;
  desvios: number;
  criticalGaps: number;
  tone: Tone;
  grade: Grade | null;
};

export function scoreBasicsElement(reqs: ScoredRequirement[]): BasicsElementResult {
  const answered = reqs.filter((r) => r.value != null && r.value !== "");
  const applicable = answered.filter((r) => r.value !== "NA");
  const sum = applicable.reduce((s, r) => s + (BASICS_POINTS[r.value as string] ?? 0), 0);
  const rawPct = applicable.length ? sum / applicable.length : null;
  const criticalGaps = applicable.filter((r) => r.riskLevel === 1 && r.value === "BASIC").length;
  const capped = rawPct !== null && criticalGaps > 0 && rawPct > 0.5;
  const pct = capped ? 0.5 : rawPct;
  return {
    pct,
    rawPct,
    capped,
    answered: answered.length,
    applicable: applicable.length,
    total: reqs.length,
    conformes: applicable.filter((r) => r.value === "COMPLIANT").length,
    desvios: applicable.filter((r) => r.value !== "COMPLIANT").length,
    criticalGaps,
    tone: basicsTone(pct),
    grade: complianceGrade(pct),
  };
}

export function scoreBasicsOverall(elementPcts: (number | null)[], allReqs: ScoredRequirement[]) {
  const valid = elementPcts.filter((p): p is number => p !== null);
  const pct = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  const level1 = allReqs.filter(
    (r) => r.riskLevel === 1 && r.value != null && r.value !== "" && r.value !== "NA",
  );
  const level1Pct = level1.length
    ? level1.reduce((s, r) => s + (BASICS_POINTS[r.value as string] ?? 0), 0) / level1.length
    : null;
  const grade = complianceGrade(pct);
  return { pct, level1Pct, tone: gradeTone(grade), grade, risk: grade ? GRADE_RISK[grade] : null };
}

export function scoreWiseOverall(elementScores: number[], anyAnswered: boolean) {
  const total = elementScores.reduce((a, b) => a + b, 0);
  const grade = anyAnswered ? cultureGrade(total) : null;
  return {
    total,
    pct: total / WISE_MAX_TOTAL,
    grade,
    tone: gradeTone(grade),
    stage: grade ? GRADE_STAGE[grade] : "Não avaliado",
  };
}

/** Um requisito é "desvio" (pode receber plano de ação) quando não está plenamente atendido. */
export function isDeviation(framework: "WISE" | "BASICS", value: string | null | undefined) {
  if (value == null || value === "") return false;
  return framework === "WISE" ? value !== "2" : value !== "COMPLIANT" && value !== "NA";
}
