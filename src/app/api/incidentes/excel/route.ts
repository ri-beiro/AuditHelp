// Exportação (GET), modelo (GET ?modelo=1) e importação (POST) de ocorrências em Excel.
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, getWorkspace } from "@/server/context";
import { INCIDENT_EXCEL_COLUMNS, INCIDENT_TYPE_LABEL, parseIncidentType, STEP_LABEL, type Step } from "@/lib/incidents";
import { listIncidents, nextIncidentNumber } from "@/server/incident-queries";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13508A" } };
  ws.columns.forEach((c) => (c.width = Math.max(14, String(c.header ?? "").length + 4)));
}

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return new Response("Sem unidade", { status: 400 });
  const wb = new ExcelJS.Workbook();
  const template = new URL(request.url).searchParams.get("modelo") === "1";
  const ws = wb.addWorksheet(template ? "Ocorrências (modelo)" : "Ocorrências");
  if (template) {
    ws.columns = INCIDENT_EXCEL_COLUMNS.map((h) => ({ header: h }));
    ws.addRow(["15/08/2026", "14:30", "Pátio Inbound", "Near miss", "Sim", "Conferente quase atingido por empilhadeira", "Descrição do ocorrido…", "", "28126781"]);
    const help = wb.addWorksheet("Tipos aceitos");
    help.columns = [{ header: "Tipo", width: 40 }];
    Object.values(INCIDENT_TYPE_LABEL).forEach((l) => help.addRow([l]));
  } else {
    ws.columns = [
      "Número", "Data", "Área", "Tipo", "HIPO", "Título", "Descrição", "Responsável", "Reporte", "Investigação",
      "Plano de ação", "Lições aprendidas", "Progresso", "Ações (abertas/total)", "Encerrada", "ID Sphera",
    ].map((h) => ({ header: h }));
    for (const i of await listIncidents(unit.id)) {
      ws.addRow([
        i.number, new Date(i.occurredAt), i.area, INCIDENT_TYPE_LABEL[i.type], i.hipo ? "Sim" : "Não", i.title, i.description,
        i.responsible?.name ?? "", STEP_LABEL[i.steps.report as Step], STEP_LABEL[i.steps.investigation as Step],
        STEP_LABEL[i.steps.plan as Step], STEP_LABEL[i.steps.lessons as Step], `${i.progress}%`,
        `${i.actions.open}/${i.actions.total}`, i.closed ? "Sim" : "Não", i.spheraId ?? "",
      ]);
    }
    ws.getColumn(2).numFmt = "dd/mm/yyyy hh:mm";
  }
  styleHeader(ws);
  const buf = await wb.xlsx.writeBuffer();
  const name = template ? "modelo-ocorrencias.xlsx" : `ocorrencias-${unit.code}.xlsx`;
  return new Response(buf, { headers: { "Content-Type": XLSX, "Content-Disposition": `attachment; filename="${name}"` } });
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("text" in v && v.text) return String(v.text);
    if ("result" in v && v.result != null) return String(v.result);
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
  }
  return String(v);
}

function parseDate(dateCell: ExcelJS.CellValue, timeCell: ExcelJS.CellValue): Date | null {
  let d: Date | null = null;
  if (dateCell instanceof Date) d = new Date(dateCell);
  else {
    const s = cellText(dateCell).trim();
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (br) d = new Date(Date.UTC(Number(br[3].length === 2 ? `20${br[3]}` : br[3]), Number(br[2]) - 1, Number(br[1]), 12));
    else if (s) d = new Date(s);
  }
  if (!d || Number.isNaN(+d)) return null;
  const t = timeCell instanceof Date ? timeCell.toISOString().slice(11, 16) : cellText(timeCell).trim();
  const tm = t.match(/^(\d{1,2}):(\d{2})/);
  if (tm) d.setUTCHours(Number(tm[1]) + 3, Number(tm[2])); // horário de Brasília → UTC
  return d;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return NextResponse.json({ error: "Sem unidade" }, { status: 400 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo .xlsx" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Limite de 5 MB" }, { status: 400 });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  // row.values é esparso (índice 0 vazio): Array.from preenche os buracos antes de normalizar.
  const header = Array.from(ws.getRow(1).values as ExcelJS.CellValue[], (v) =>
    cellText(v ?? null).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
  );
  const col = (name: string) => header.findIndex((h) => h.startsWith(name));
  const idx = {
    date: col("data"), time: col("hora"), area: col("area"), type: col("tipo"), hipo: col("hipo"),
    title: col("titulo"), desc: col("descri"), resp: col("respons"), sphera: col("id sphera"),
  };
  if (idx.date < 0 || idx.type < 0 || idx.title < 0)
    return NextResponse.json({ error: "Planilha sem as colunas obrigatórias (Data, Tipo, Título). Use o modelo." }, { status: 400 });

  const users = await db.user.findMany({ select: { id: true, email: true } });
  const errors: string[] = [];
  let created = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (i: number) => (i > 0 ? row.getCell(i).value : null);
    const title = cellText(get(idx.title)).trim();
    if (!title) continue;
    const occurredAt = parseDate(get(idx.date), get(idx.time));
    const type = parseIncidentType(cellText(get(idx.type)));
    if (!occurredAt || !type) {
      errors.push(`Linha ${r}: ${!occurredAt ? "data inválida" : "tipo não reconhecido"}`);
      continue;
    }
    const email = cellText(get(idx.resp)).trim().toLowerCase();
    await db.incident.create({
      data: {
        unitId: unit.id,
        number: await nextIncidentNumber(unit.id, occurredAt),
        occurredAt,
        area: cellText(get(idx.area)).trim() || "Não informada",
        type,
        hipo: /^s|^y|^1|true/i.test(cellText(get(idx.hipo)).trim()),
        title: title.slice(0, 200),
        description: cellText(get(idx.desc)).trim() || title,
        responsibleId: users.find((u) => u.email === email)?.id ?? null,
        spheraId: cellText(get(idx.sphera)).trim() || null,
        reportedById: user.id,
        reportStatus: "CONCLUIDO",
      },
    });
    created++;
  }
  return NextResponse.json({ created, errors });
}
