import ExcelJS from "exceljs";
import JSZip from "jszip";

/** Linhas da primeira aba de um .xlsx/.xlsm como matriz de valores (strings, números ou datas). */
export async function readSheetRows(buffer: ArrayBuffer, sheetName?: string): Promise<unknown[][]> {
  try {
    return await viaExcelJs(buffer, sheetName);
  } catch {
    // Exportações de sistemas como o Sphera geram arquivos que o ExcelJS não abre: lê o XML direto.
    return viaXml(buffer);
  }
}

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return v.result;
    if ("text" in v) return v.text;
  }
  return v;
}

async function viaExcelJs(buffer: ArrayBuffer, sheetName?: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = (sheetName && wb.worksheets.find((w) => w.name.trim().toUpperCase() === sheetName.toUpperCase())) || wb.worksheets[0];
  if (!ws) throw new Error("Planilha vazia.");
  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const cells: unknown[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(cellValue(row.getCell(c).value));
    rows[n - 1] = cells;
  });
  return Array.from(rows, (r) => r ?? []);
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const colIndex = (ref: string) => {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
};

async function viaXml(buffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sheetPath = Object.keys(zip.files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(p))
    .sort()[0];
  if (!sheetPath) throw new Error("Não encontrei planilhas no arquivo.");
  const shared: string[] = [];
  const ss = zip.file("xl/sharedStrings.xml");
  if (ss) {
    for (const m of (await ss.async("string")).matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)) {
      shared.push(decode([...m[1].matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((t) => t[1]).join("")));
    }
  }
  const xml = await zip.file(sheetPath)!.async("string");
  const rows: unknown[][] = [];
  for (const rm of xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const cells: unknown[] = [];
    let next = 0;
    for (const cm of rm[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = cm[1];
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const idx = ref ? colIndex(ref) : next;
      next = idx + 1;
      const type = attrs.match(/\bt="(\w+)"/)?.[1];
      const body = cm[2] ?? "";
      const v = body.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      let value: unknown = "";
      if (type === "s" && v !== undefined) value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = decode([...body.matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((t) => t[1]).join(""));
      else if (type === "str" || type === "e") value = decode(v ?? "");
      else if (type === "b") value = v === "1";
      else if (v !== undefined) value = Number.isFinite(Number(v)) ? Number(v) : decode(v);
      cells[idx] = value;
    }
    rows.push(Array.from(cells, (c) => c ?? ""));
  }
  return rows;
}

/** Converte data de planilha (Date, número serial do Excel ou dd/mm/aaaa) em Date. */
export function sheetDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(+v) ? null : v;
  if (typeof v === "number" || (typeof v === "string" && /^\d+(\.\d+)?$/.test(v.trim()))) {
    const n = Number(v);
    if (n > 20000 && n < 80000) return new Date(Math.round((n - 25569) * 86400000));
  }
  const s = String(v ?? "").trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (br) {
    const y = Number(br[3].length === 2 ? `20${br[3]}` : br[3]);
    return new Date(Date.UTC(y, Number(br[2]) - 1, Number(br[1]), br[4] ? Number(br[4]) + 3 : 12, br[5] ? Number(br[5]) : 0));
  }
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(+d) ? d : null;
}
