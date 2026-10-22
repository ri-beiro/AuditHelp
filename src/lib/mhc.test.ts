import { describe, expect, it } from "vitest";
import { parseMhc } from "./mhc";

describe("MHC", () => {
  const rows = [
    ["Cargos", "INTEGRAÇÃO DE SEGURANÇA", "NR 17 ERGONOMIA", "SOLVACE"],
    ["Vencimento", null, null, null],
    ["Método", "PRESENCIAL", null, "ONLINE"],
    ["Avaliação de Eficácia", "sim", null, null],
    ["Nota de Corte", 70, null, null],
    ["SUP DISTRIBUICAO", "S", "S", "N"],
    ["AUX LOGISTICA", "S", "NA", "N"],
    [null],
    ["TRENAMENTO", "VALIDADE"],
    ["INTEGRAÇÃO DE SEGURANÇA", 365],
    ["NR 17 ERGONOMIA", 730],
    ["SOLVACE", "NA"],
  ];
  it("lê treinamentos, regras e cargos", () => {
    const d = parseMhc(rows);
    expect(d.trainings.map((t) => t.name)).toEqual(["INTEGRAÇÃO DE SEGURANÇA", "NR 17 ERGONOMIA", "SOLVACE"]);
    expect(d.trainings[0]).toMatchObject({ validityDays: 365, method: "PRESENCIAL", effectiveness: true, passingScore: 70 });
    expect(d.trainings[1].validityDays).toBe(730);
    expect(d.trainings[2]).toMatchObject({ validityDays: null, noExpiry: true });
    expect(d.roles).toHaveLength(2);
    expect(d.roles[1].values).toEqual({ "INTEGRAÇÃO DE SEGURANÇA": "S", "NR 17 ERGONOMIA": "NA", SOLVACE: "N" });
  });
});
