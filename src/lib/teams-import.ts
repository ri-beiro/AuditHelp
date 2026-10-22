// Leitura da planilha de times de colaboradores.

const text = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const norm = (v: unknown) => text(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const pretty = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/\bCd\b|\bCt\b/g, (c) => c.toUpperCase());

/** Lê a planilha em blocos de colunas: [Time ou Nome] [CARGO] (e opcionalmente [TIME]). */
export function parseTeams(rows: unknown[][]) {
  const header = rows[0] ?? [];
  const people: { name: string; cargo: string; team: string | null }[] = [];
  for (let j = 0; j < header.length; j++) {
    if (norm(header[j + 1]) !== "CARGO") continue;
    const first = norm(header[j]);
    const teamCol = header.findIndex((h, k) => k > j + 1 && k <= j + 2 && norm(h).startsWith("TIME"));
    const team = first.startsWith("NOME") || first.startsWith("COLABORADOR") ? null : pretty(text(header[j]));
    for (const r of rows.slice(1)) {
      const name = text(r[j]).toUpperCase();
      const cargo = text(r[j + 1]);
      if (!name || !cargo) continue;
      people.push({ name, cargo, team: teamCol > 0 ? text(r[teamCol]) || team : team });
    }
  }
  return people;
}
