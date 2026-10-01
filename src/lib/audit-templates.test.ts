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
