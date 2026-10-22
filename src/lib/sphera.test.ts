import { describe, expect, it } from "vitest";
import { parseSpheraRows, spheraType, SPHERA_COLUMNS } from "./sphera";

describe("Importação Sphera", () => {
  it("classifica tipo e subtipos", () => {
    expect(spheraType("Observação", "Ato Inseguro")).toBe("OBSERVACAO");
    expect(spheraType("Observação", "Condição insegura")).toBe("CONDICAO_INSEGURA");
    expect(spheraType("Caso sem lesão", "Quase acidente")).toBe("NEAR_MISS");
    expect(spheraType("Caso sem lesão", "Incidente apenas com danos a ativos")).toBe("INCIDENTE");
    expect(spheraType("Caso sem lesão", "")).toBe("INCIDENTE");
    expect(spheraType("Caso com lesão", "")).toBe("NLTA");
  });
  it("lê linhas e ignora relatórios inválidos", () => {
    const row = (id: string, status: string) => {
      const r = SPHERA_COLUMNS.map(() => "");
      r[0] = id; r[1] = "Observação"; r[4] = "46308"; r[6] = "Motorista no veículo ligado. Outro texto."; r[7] = "SAMUEL";
      r[9] = "Ato Inseguro"; r[10] = "Não"; r[12] = status; r[15] = "Armazém"; r[17] = "Pedestrians";
      return r;
    };
    const { events, skipped } = parseSpheraRows([SPHERA_COLUMNS, row("1", "Fechado"), row("2", "Relatório de evento inválido")]);
    expect(skipped).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ spheraId: "1", type: "OBSERVACAO", area: "Armazém", closed: true, title: "Motorista no veículo ligado.", basicRef: "Pedestrians" });
    expect(events[0].occurredAt.toISOString().slice(0, 10)).toBe("2026-10-13");
  });
});
