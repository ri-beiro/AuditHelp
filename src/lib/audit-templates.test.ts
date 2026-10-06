import { describe, expect, it } from "vitest";
import { AUDIT_TEMPLATES, getTemplate, scoreAudit } from "./audit-templates";

describe("Checklists de contratadas", () => {
  it("tem Portaria e Limpeza com códigos únicos", () => {
    for (const t of AUDIT_TEMPLATES) {
      const codes = t.sections.flatMap((s) => s.items.map((i) => i.code));
      expect(new Set(codes).size).toBe(codes.length);
    }
    expect(getTemplate("CONTRATADA_PORTARIA")).not.toBeNull();
    expect(getTemplate("CONTRATADA_LIMPEZA")).not.toBeNull();
  });

  it("calcula % sem N/A e limita a 50% com item crítico não conforme", () => {
    const t = getTemplate("CONTRATADA_LIMPEZA")!;
    const all = t.sections.flatMap((s) => s.items);
    const answers: Record<string, string> = Object.fromEntries(all.map((i) => [i.code, "C"]));
    answers["G.1"] = "NA";
    answers["G.2"] = "NC"; // não crítico
    const r1 = scoreAudit(t, answers);
    expect(r1.pct).toBeCloseTo((all.length - 2) / (all.length - 1));
    expect(r1.capped).toBe(false);

    answers["L1.2"] = "NC"; // crítico
    const r2 = scoreAudit(t, answers);
    expect(r2.criticalNc).toBe(1);
    expect(r2.capped).toBe(true);
    expect(r2.pct).toBe(0.5);
  });
});

describe("Checklist simplificado (v2)", () => {
  it("oferece só as versões simplificadas para novas auditorias", async () => {
    const { ACTIVE_TEMPLATES } = await import("./audit-templates");
    expect(ACTIVE_TEMPLATES.map((t) => t.code)).toEqual(["CONTRATADA_PORTARIA_V2", "CONTRATADA_LIMPEZA_V2"]);
    for (const t of ACTIVE_TEMPLATES) {
      const items = t.sections.flatMap((s) => s.items);
      expect(items.length).toBeLessThanOrEqual(10);
      expect(items.every((i) => (i.checks?.length ?? 0) >= 3)).toBe(true);
    }
  });

  it("Parcial vale meio ponto", () => {
    const t = getTemplate("CONTRATADA_PORTARIA_V2")!;
    const all = t.sections.flatMap((s) => s.items);
    const answers: Record<string, string> = Object.fromEntries(all.map((i) => [i.code, "C"]));
    answers["P3"] = "P"; // não crítica
    const r = scoreAudit(t, answers);
    expect(r.pct).toBeCloseTo((all.length - 0.5) / all.length);
    expect(r.parciais).toBe(1);
    expect(r.capped).toBe(false);
  });
});
