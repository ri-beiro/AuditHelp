// MHC: exportação (GET) no mesmo formato da aba e importação (POST) de .xlsx/.xlsm.
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { can, getCurrentUser } from "@/server/context";
import { readMhcWorkbook } from "@/lib/mhc-excel";
import { applyMhc } from "@/lib/mhc-apply";

export async function GET() {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const [trainings, roles] = await Promise.all([
    db.training.findMany({ orderBy: { order: "asc" } }),
    db.jobRole.findMany({ orderBy: { order: "asc" }, include: { trainings: true } }),
  ]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("MHC");
  ws.addRow(["Cargos", ...trainings.map((t) => t.name)]);
  ws.addRow(["Vencimento", ...trainings.map((t) => (t.noExpiry ? "NA" : (t.validityDays ?? "")))]);
  ws.addRow(["Método", ...trainings.map((t) => t.method ?? "")]);
  ws.addRow(["Avaliação de Eficácia", ...trainings.map((t) => (t.effectiveness === null ? "" : t.effectiveness ? "SIM" : "NÃO"))]);
  ws.addRow(["Nota de Corte", ...trainings.map((t) => t.passingScore ?? "")]);
  for (const r of roles) {
    const v = new Map(r.trainings.map((c) => [c.trainingId, c.value]));
    ws.addRow([r.name, ...trainings.map((t) => v.get(t.id) ?? "")]);
  }
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13508A" } };
  head.alignment = { textRotation: 90, vertical: "bottom", horizontal: "center", wrapText: true };
  head.height = 190;
  ws.getColumn(1).width = 34;
  for (let c = 2; c <= trainings.length + 1; c++) ws.getColumn(c).width = 6;
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 5 }];
  return new Response(await wb.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="MHC-CDs.xlsx"`,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "admin")) return NextResponse.json({ error: "Apenas administradores atualizam a MHC." }, { status: 403 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie a planilha (.xlsx ou .xlsm)." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Limite de 10 MB." }, { status: 400 });
  try {
    const data = await readMhcWorkbook(await file.arrayBuffer());
    if (!data.trainings.length || !data.roles.length) throw new Error("Não encontrei treinamentos e cargos na aba MHC.");
    const r = await applyMhc(db, data);
    revalidatePath("/treinamentos");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao ler a planilha." }, { status: 400 });
  }
}
