import ExcelJS from "exceljs";
import { parseMhc } from "./mhc";

function value(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return v.result;
    if ("text" in v) return v.text;
  }
  return v;
}

/** Lê a aba MHC de um .xlsx/.xlsm (macros são ignoradas). */
export async function readMhcWorkbook(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets.find((w) => w.name.trim().toUpperCase() === "MHC") ?? wb.worksheets[0];
  if (!ws) throw new Error("Planilha vazia.");
  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const cells: unknown[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(value(row.getCell(c).value));
    rows[n - 1] = cells;
  });
  return parseMhc(Array.from(rows, (r) => r ?? []));
}
