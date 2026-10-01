import { describe, expect, it } from "vitest";
import {
  complianceGrade,
  cultureGrade,
  roundWiseScore,
  scoreBasicsElement,
  scoreBasicsOverall,
  scoreWiseElement,
  scoreWiseOverall,
  siteGrade,
} from "./scoring";

const wise = (level: number, values: (string | null)[]) => values.map((value) => ({ level, value }));

describe("WISE — curva de Bradley", () => {
  it("reproduz o elemento 1 da matriz (0,67 + 0,89 + 0,96 = 2,52 → 2,5)", () => {
    const reqs = [
      ...wise(1, ["2", "1", "1"]),
      ...wise(2, ["2", "2", "2", "2", "2", "1", "1", "2", "2"]),
      ...wise(3, ["2", "2", "2", "2", "2", "1", "2", "2", "2", "2", "2", "2"]),
      ...wise(4, Array(13).fill(null)),
      ...wise(5, Array(9).fill(null)),
    ];
    const r = scoreWiseElement(reqs);
    expect(r.levels.map((l) => l.pct)).toEqual([0.67, 0.89, 0.96, 0, 0]);
    expect(r.raw).toBe(2.52);
    expect(r.score).toBe(2.5);
    expect(r.grade).toBe("B"); // 2,5 × 13 = 32,5 → Independente
    expect(r.tone).toBe("atencao");
    expect(r.levels[1].gateWarning).toBe(true); // nível 1 < 75%
  });

  it("arredonda a fração em quartos como a célula B2", () => {
    expect(roundWiseScore(1.13)).toBe(1);
    expect(roundWiseScore(1.2)).toBe(1.25);
    expect(roundWiseScore(1.5)).toBe(1.5);
    expect(roundWiseScore(1.7)).toBe(1.75);
    expect(roundWiseScore(1.9)).toBe(2);
    expect(roundWiseScore(5)).toBe(5);
  });

  it("elemento sem respostas é neutro", () => {
    const r = scoreWiseElement(wise(1, [null, null]));
    expect(r.score).toBe(0);
    expect(r.tone).toBe("neutro");
  });
});

describe("12 Básicos — compliance", () => {
  it("calcula a média excluindo N/A", () => {
    const r = scoreBasicsElement([
      { value: "COMPLIANT", riskLevel: 2 },
      { value: "PARTIAL", riskLevel: 2 },
      { value: "NA", riskLevel: 1 },
      { value: null, riskLevel: 3 },
    ]);
    expect(r.pct).toBeCloseTo(0.625);
    expect(r.applicable).toBe(2);
    expect(r.grade).toBe("C"); // 40%–65%
    expect(r.tone).toBe("critico");
  });

  it("limita a 50% quando um item de risco 1 está em Básico", () => {
    const r = scoreBasicsElement([
      { value: "COMPLIANT", riskLevel: 2 },
      { value: "COMPLIANT", riskLevel: 2 },
      { value: "COMPLIANT", riskLevel: 2 },
      { value: "BASIC", riskLevel: 1 },
    ]);
    expect(r.rawPct).toBeCloseTo(0.75);
    expect(r.pct).toBe(0.5);
    expect(r.capped).toBe(true);
    expect(r.tone).toBe("critico");
  });

  it("média geral ignora básicos não aplicáveis e calcula o score nível 1", () => {
    const o = scoreBasicsOverall(
      [1, 0.5, null],
      [
        { value: "COMPLIANT", riskLevel: 1 },
        { value: "PARTIAL", riskLevel: 1 },
        { value: "BASIC", riskLevel: 2 },
      ],
    );
    expect(o.pct).toBe(0.75);
    expect(o.level1Pct).toBeCloseTo(0.625);
  });
});

describe("Classificação oficial A/B/C/D (slide 129)", () => {
  it("faixas de cultura", () => {
    expect(cultureGrade(65)).toBe("A");
    expect(cultureGrade(48.75)).toBe("A");
    expect(cultureGrade(37.5)).toBe("B"); // exemplo do treinamento
    expect(cultureGrade(16.25)).toBe("C");
    expect(cultureGrade(16)).toBe("D");
  });

  it("faixas de compliance", () => {
    expect(complianceGrade(0.8)).toBe("A");
    expect(complianceGrade(0.67)).toBe("B"); // exemplo do treinamento (12 Básicos = 67%)
    expect(complianceGrade(0.4)).toBe("C");
    expect(complianceGrade(0.39)).toBe("D");
  });

  it("classe do site é a pior entre cultura e compliance", () => {
    expect(siteGrade("A", "B")).toBe("B");
    expect(siteGrade("C", "A")).toBe("C");
    expect(siteGrade("B", null)).toBeNull();
  });

  it("pontuação geral WISE recebe estágio de Bradley", () => {
    const o = scoreWiseOverall(Array(13).fill(2.5), true);
    expect(o.total).toBe(32.5);
    expect(o.grade).toBe("B");
    expect(o.stage).toBe("Independente");
  });
});
