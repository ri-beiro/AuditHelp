// Exportação do histórico unificado de auditorias em Excel.
import ExcelJS from "exceljs";
import { getCurrentUser, getWorkspace } from "@/server/context";
import { loadAuditHistory } from "@/server/audit-history-queries";

export async function GET() {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return new Response("Sem unidade", { status: 400 });
  const rows = await loadAuditHistory(unit.id);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Histórico de auditorias");
  ws.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Tipo", key: "type", width: 28 },
    { header: "Área", key: "area", width: 24 },
    { header: "Auditor", key: "auditor", width: 22 },
    { header: "Nota", key: "score", width: 10 },
    { header: "Nota máxima", key: "max", width: 12 },
    { header: "% ", key: "pct", width: 10 },
    { header: "Classificação", key: "grade", width: 13 },
    { header: "Resultado", key: "result", width: 32 },
    { header: "Origem", key: "source", width: 14 },
    { header: "Ações (abertas/total)", key: "actions", width: 20 },
    { header: "Observações", key: "notes", width: 40 },
  ];
  for (const r of rows) {
    ws.addRow({
      date: new Date(r.date),
      type: r.type,
      area: r.area,
      auditor: r.auditor,
      score: r.score,
      max: r.maxScore,
      pct: r.pct,
      grade: r.grade ?? "",
      result: r.result,
      source: r.source === "manual" ? "Registro manual" : "Checklist no sistema",
      actions: `${r.actions.open}/${r.actions.total}`,
      notes: r.notes,
    });
  }
  ws.getColumn("date").numFmt = "dd/mm/yyyy";
  ws.getColumn("pct").numFmt = "0.0%";
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13508A" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="historico-auditorias-${unit.code}.xlsx"`,
    },
  });
}
