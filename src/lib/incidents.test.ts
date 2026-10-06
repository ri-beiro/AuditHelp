import { describe, expect, it } from "vitest";
import { daysWithoutAccidents, investigationProgress, planStepStatus, sortByCriticality } from "./incidents";

describe("Dias sem acidentes", () => {
  it("conta a partir do último acidente registrável e guarda o recorde", () => {
    const r = daysWithoutAccidents(
      [new Date("2026-01-10"), new Date("2026-06-01")],
      new Date("2025-01-01"),
      new Date("2026-10-06T15:00:00Z"),
    );
    expect(r.current).toBe(127); // 01/06 → 06/10
    expect(r.record).toBe(374); // 01/01/2025 → 10/01/2026
    expect(r.lastAccident?.slice(0, 10)).toBe("2026-06-01");
    expect(r.history[0].to).toBeNull();
  });

  it("sem acidentes usa a data base", () => {
    const r = daysWithoutAccidents([], new Date("2026-10-01"), new Date("2026-10-06"));
    expect(r.current).toBe(5);
    expect(r.lastAccident).toBeNull();
  });
});

describe("Criticidade e investigação", () => {
  it("HIPO vem primeiro, depois a gravidade", () => {
    const list = sortByCriticality([
      { type: "OBSERVACAO" as const, hipo: false, occurredAt: "2026-01-01" },
      { type: "NEAR_MISS" as const, hipo: true, occurredAt: "2026-01-01" },
      { type: "LTA" as const, hipo: false, occurredAt: "2026-01-01" },
    ]);
    expect(list.map((i) => i.type)).toEqual(["NEAR_MISS", "LTA", "OBSERVACAO"]);
  });

  it("progresso em etapas de 25%", () => {
    expect(investigationProgress({ report: "EM_ANDAMENTO", investigation: "NAO_INICIADO", plan: "NAO_INICIADO", lessons: "NAO_INICIADO" })).toBe(0);
    expect(investigationProgress({ report: "CONCLUIDO", investigation: "CONCLUIDO", plan: "EM_ANDAMENTO", lessons: "NAO_INICIADO" })).toBe(50);
    expect(investigationProgress({ report: "CONCLUIDO", investigation: "CONCLUIDO", plan: "CONCLUIDO", lessons: "CONCLUIDO" })).toBe(100);
  });

  it("plano conclui quando todas as ações terminam", () => {
    expect(planStepStatus("NAO_INICIADO", [])).toBe("NAO_INICIADO");
    expect(planStepStatus("NAO_INICIADO", [{ status: "ABERTA" }, { status: "CONCLUIDA" }])).toBe("EM_ANDAMENTO");
    expect(planStepStatus("NAO_INICIADO", [{ status: "CANCELADA" }, { status: "CONCLUIDA" }])).toBe("CONCLUIDO");
  });
});
