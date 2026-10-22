import { describe, expect, it } from "vitest";
import { parseTeams } from "./teams-import";

describe("Planilha de times", () => {
  it("lê blocos Time | CARGO lado a lado", () => {
    const rows = [
      ["Time CD", "CARGO", null, "Time CT", "CARGO", null, "TIME ROTEIRIZAÇÃO  ", "CARGO"],
      ["AMANDA OLIVEIRA", "AN DE DISTRIBUIÇÃO JR", null, "FILIPE SILVA", "AN DE MONITORAMENTO JR", null, "EDUARDO MIRANDA", "AN DE ROTEIRIZAÇÃO PL"],
      ["", "", null, "VITORIA SILVA", "ASS DE MONITORAMENTO"],
    ];
    const p = parseTeams(rows);
    expect(p).toHaveLength(4);
    expect(p[0]).toEqual({ name: "AMANDA OLIVEIRA", cargo: "AN DE DISTRIBUIÇÃO JR", team: "Time CD" });
    expect(p.find((x) => x.name === "EDUARDO MIRANDA")?.team).toBe("Time Roteirização");
  });
});
