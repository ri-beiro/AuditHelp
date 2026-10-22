import { describe, expect, it } from "vitest";
import { matchRole, situation, validUntilFor } from "./employees";

const ROLES = [
  "SUP DISTRIBUICAO", "SUP LOGISTICA", "ASSIST DISTRIBUICAO", "ASSIST MONIT ENTREGA", "AUX PREST CONTAS",
  "AN PLANEJ ROTA PL", "AN DISTRIBUICAO JR", "AN DISTRIBUICAO PL", "AN MONIT ENTREGA JR", "GER DISTRIBUICAO PL",
].map((name) => ({ name }));

describe("Colaboradores", () => {
  it("associa os cargos da planilha TIMES à MHC", () => {
    const m = (s: string) => matchRole(s, ROLES)?.name;
    expect(m("AN DE DISTRIBUIÇÃO JR")).toBe("AN DISTRIBUICAO JR");
    expect(m("AN DE DISTRIBUIÇÃO PL")).toBe("AN DISTRIBUICAO PL");
    expect(m("AUX DE PRESTAÇÃO DE CONTAS")).toBe("AUX PREST CONTAS");
    expect(m("ASS DE DISTRIBUIÇÃO")).toBe("ASSIST DISTRIBUICAO");
    expect(m("SUPERVISORA DE DISTRIBUIÇÃO")).toBe("SUP DISTRIBUICAO");
    expect(m("AN DE MONITORAMENTO JR")).toBe("AN MONIT ENTREGA JR");
    expect(m("ASS DE MONITORAMENTO")).toBe("ASSIST MONIT ENTREGA");
    expect(m("AN DE ROTEIRIZAÇÃO PL")).toBe("AN PLANEJ ROTA PL");
    expect(m("GERENTE DE LOGISITICA")).toBe("GER DISTRIBUICAO PL");
    expect(m("SUPERVISOR DE ROTEIRIZAÇÃO")).toBe("SUP LOGISTICA");
  });
  it("calcula validade e situação", () => {
    const done = new Date("2026-01-10T12:00:00Z");
    expect(validUntilFor(done, { validityDays: 365, noExpiry: false })?.toISOString().slice(0, 10)).toBe("2027-01-10");
    expect(validUntilFor(done, { validityDays: null, noExpiry: true })).toBeNull();
    const today = new Date("2026-10-22T12:00:00Z");
    expect(situation(null, today)).toBe("PENDENTE");
    expect(situation({ doneAt: done, validUntil: "2026-10-01" }, today)).toBe("VENCIDO");
    expect(situation({ doneAt: done, validUntil: "2026-11-10" }, today)).toBe("A_VENCER");
    expect(situation({ doneAt: done, validUntil: null }, today)).toBe("REALIZADO");
  });
});
