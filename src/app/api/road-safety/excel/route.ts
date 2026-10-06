// Road Safety: exportação (GET), modelo (GET ?modelo=1) e importação (POST) do registro de motoristas.
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { can, getCurrentUser, getWorkspace } from "@/server/context";
import { cpfKey, DRIVER_EXCEL_COLUMNS, EFFECTIVE_LABEL, effectiveStatus, parseTrainingStatus } from "@/lib/road-safety";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function text(v: ExcelJS.CellValue | undefined): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return String(v.result ?? "");
  }
  return String(v);
}

function date(v: ExcelJS.CellValue | undefined): Date | null {
  if (v instanceof Date) return v;
  const s = text(v).trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) return new Date(Date.UTC(Number(br[3].length === 2 ? `20${br[3]}` : br[3]), Number(br[2]) - 1, Number(br[1]), 12));
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(+d) ? d : null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return new Response("Sem unidade", { status: 400 });
  const template = new URL(request.url).searchParams.get("modelo") === "1";
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BASE");
  ws.addRow(DRIVER_EXCEL_COLUMNS);
  if (!template) {
    const drivers = await db.driver.findMany({ where: { unitId: unit.id }, orderBy: [{ carrier: "asc" }, { name: "asc" }] });
    for (const d of drivers) {
      ws.addRow([
        d.name,
        d.cpf ?? "",
        d.plate ?? "",
        d.carrier,
        EFFECTIVE_LABEL[effectiveStatus(d.onboardingStatus, d.onboardingValid)].toUpperCase(),
        EFFECTIVE_LABEL[effectiveStatus(d.defensiveStatus, d.defensiveValid)].toUpperCase(),
        d.onboardingAt ?? "",
        d.onboardingValid ?? "",
        d.defensiveAt ?? "",
        d.defensiveValid ?? "",
      ]);
    }
  } else {
    ws.addRow(["Maria da Silva", "000.000.000-00", "ABC1D23", "TRANSPORTADORA", "REALIZADO", "", "10/01/2026", "10/01/2027", "", ""]);
  }
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13508A" } };
  ws.columns.forEach((c, i) => {
    c.width = i === 0 ? 36 : 18;
    if (i >= 6) c.numFmt = "dd/mm/yyyy";
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return new Response(await wb.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="${template ? "modelo-motoristas" : `motoristas-${unit.code}`}.xlsx"`,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "action")) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return NextResponse.json({ error: "Sem unidade" }, { status: 400 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo .xlsx" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Limite de 5 MB" }, { status: 400 });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  // row.values é esparso (índice 0 vazio): Array.from preenche os buracos.
  const header = Array.from(ws.getRow(1).values as ExcelJS.CellValue[], (v) => norm(text(v)));
  const col = (pred: (h: string) => boolean) => header.findIndex(pred);
  const idx = {
    name: col((h) => h.startsWith("nome")),
    cpf: col((h) => h.startsWith("cpf")),
    plate: col((h) => h.startsWith("placa")),
    carrier: col((h) => h.startsWith("transp")),
    onb: col((h) => h.startsWith("onboarding")),
    def: col((h) => h.startsWith("curso") || h.startsWith("direcao")),
    onbAt: col((h) => h.startsWith("data") && h.includes("onboarding")),
    onbValid: col((h) => h.startsWith("validade") && h.includes("onboarding")),
    defAt: col((h) => h.startsWith("data") && h.includes("defensiva")),
    defValid: col((h) => h.startsWith("validade") && h.includes("defensiva")),
  };
  if (idx.name < 0 || idx.carrier < 0)
    return NextResponse.json({ error: "Planilha sem as colunas obrigatórias (Nome, Transportadora). Use o modelo." }, { status: 400 });

  const existing = await db.driver.findMany({ where: { unitId: unit.id } });
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (i: number) => (i > 0 ? row.getCell(i).value : null);
    const name = text(get(idx.name)).trim().replace(/\s+/g, " ");
    if (!name) continue;
    const carrier = text(get(idx.carrier)).trim().toUpperCase();
    if (!carrier) {
      errors.push(`Linha ${r}: transportadora em branco`);
      continue;
    }
    const cpf = text(get(idx.cpf)).trim();
    const key = cpfKey(cpf);
    const data = {
      name,
      cpf: cpf || null,
      cpfKey: key,
      plate: text(get(idx.plate)).toUpperCase().replace(/[^A-Z0-9]/g, "") || null,
      carrier,
      onboardingStatus: parseTrainingStatus(text(get(idx.onb))),
      defensiveStatus: parseTrainingStatus(text(get(idx.def))),
      ...(idx.onbAt > 0 ? { onboardingAt: date(get(idx.onbAt)) } : {}),
      ...(idx.onbValid > 0 ? { onboardingValid: date(get(idx.onbValid)) } : {}),
      ...(idx.defAt > 0 ? { defensiveAt: date(get(idx.defAt)) } : {}),
      ...(idx.defValid > 0 ? { defensiveValid: date(get(idx.defValid)) } : {}),
    };
    // Mesmo motorista: pelo CPF; sem CPF, pelo nome na mesma transportadora.
    const match = existing.find((d) => (key ? d.cpfKey === key : norm(d.name) === norm(name) && d.carrier === carrier));
    if (match) {
      await db.driver.update({ where: { id: match.id }, data });
      updated++;
    } else {
      const d = await db.driver.create({ data: { ...data, unitId: unit.id } });
      existing.push(d);
      created++;
    }
  }
  return NextResponse.json({ created, updated, errors });
}
