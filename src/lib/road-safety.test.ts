import { describe, expect, it } from "vitest";
import { cpfKey, effectiveStatus, parseTrainingStatus } from "./road-safety";

describe("Road Safety", () => {
  const today = new Date("2026-10-06T12:00:00Z");
  it("validade vencida volta a ser pendência", () => {
    expect(effectiveStatus("REALIZADO", null, today)).toBe("REALIZADO");
    expect(effectiveStatus("REALIZADO", "2026-10-01", today)).toBe("VENCIDO");
    expect(effectiveStatus("REALIZADO", "2026-10-20", today)).toBe("A_VENCER");
    expect(effectiveStatus("REALIZADO", "2027-10-20", today)).toBe("REALIZADO");
    expect(effectiveStatus("PENDENTE", "2027-10-20", today)).toBe("PENDENTE");
  });
  it("lê a planilha", () => {
    expect(parseTrainingStatus("REALIZADO")).toBe("REALIZADO");
    expect(parseTrainingStatus("")).toBe("PENDENTE");
    expect(parseTrainingStatus("pendente")).toBe("PENDENTE");
    expect(cpfKey("307.819.778-60")).toBe("30781977860");
    expect(cpfKey("")).toBeNull();
  });
});
