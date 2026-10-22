// Colaboradores: importação da planilha de times (pares "Time | CARGO" lado a lado, ou Nome | Cargo | Time)
// e exportação com a situação de cada treinamento obrigatório.
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { can, getCurrentUser, getWorkspace } from "@/server/context";
import { matchRole, situation, SITUATION_LABEL } from "@/lib/employees";
import { readSheetRows } from "@/lib/xlsx-rows";
import { parseTeams } from "@/lib/teams-import";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "action")) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return NextResponse.json({ error: "Sem unidade" }, { status: 400 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie a planilha (.xlsx)." }, { status: 400 });
  const people = parseTeams(await readSheetRows(await file.arrayBuffer()));
  if (!people.length) return NextResponse.json({ error: "Não encontrei colunas Nome/Time + CARGO na planilha." }, { status: 400 });
  const roles = await db.jobRole.findMany();
  const existing = await db.employee.findMany({ where: { unitId: unit.id } });
  let created = 0;
  let updated = 0;
  const unmatched = new Set<string>();
  for (const p of people) {
    const role = matchRole(p.cargo, roles);
    if (!role) unmatched.add(p.cargo);
    const data = { team: p.team, roleLabel: p.cargo, roleId: role?.id ?? null };
    const cur = existing.find((e) => e.name === p.name);
    if (cur) {
      await db.employee.update({ where: { id: cur.id }, data });
      updated++;
    } else {
      await db.employee.create({ data: { ...data, name: p.name, unitId: unit.id } });
      created++;
    }
  }
  revalidatePath("/colaboradores");
  revalidatePath("/treinamentos");
  return NextResponse.json({ created, updated, unmatched: [...unmatched] });
}

export async function GET() {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return new Response("Sem unidade", { status: 400 });
  const [trainings, employees] = await Promise.all([
    db.training.findMany({ orderBy: { order: "asc" } }),
    db.employee.findMany({
      where: { unitId: unit.id },
      include: { role: { include: { trainings: true } }, trainings: true },
      orderBy: [{ team: "asc" }, { name: "asc" }],
    }),
  ]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Colaboradores");
  ws.addRow(["Nome", "Time", "Cargo (MHC)", "Cargo informado", "Obrigatórios", "Em dia", ...trainings.map((t) => t.name)]);
  for (const e of employees) {
    const req = new Set(e.role?.trainings.filter((c) => c.value === "S").map((c) => c.trainingId) ?? []);
    const rec = new Map(e.trainings.map((r) => [r.trainingId, r]));
    const cells = trainings.map((t) => {
      if (!req.has(t.id)) return "";
      const r = rec.get(t.id);
      const s = situation(r);
      return r ? `${SITUATION_LABEL[s]} (${r.doneAt.toLocaleDateString("pt-BR")})` : SITUATION_LABEL[s];
    });
    const ok = trainings.filter((t) => req.has(t.id) && ["REALIZADO", "A_VENCER"].includes(situation(rec.get(t.id)))).length;
    ws.addRow([e.name, e.team ?? "", e.role?.name ?? "", e.roleLabel ?? "", req.size, ok, ...cells]);
  }
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13508A" } };
  ws.columns.forEach((c, i) => (c.width = i < 4 ? 28 : 16));
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  return new Response(await wb.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="colaboradores-treinamentos-${unit.code}.xlsx"`,
    },
  });
}
