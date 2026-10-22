// Ocorrências em Excel no modelo da "Página da lista de eventos — Resumo" do Sphera:
// exportação (GET), modelo em branco (GET ?modelo=1) e importação (POST).
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import type { IncidentType, StepStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, getWorkspace } from "@/server/context";
import { parseIncidentType, type IncidentTypeKey } from "@/lib/incidents";
import { isSpheraHeader, parseSpheraRows, SPHERA_COLUMNS } from "@/lib/sphera";
import { readSheetRows, sheetDate } from "@/lib/xlsx-rows";
import { listIncidents, nextIncidentNumber } from "@/server/incident-queries";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Tipo de incidente e subtipo no vocabulário do Sphera (para exportar). */
const SPHERA_TYPE: Record<IncidentTypeKey, [string, string]> = {
  FATALIDADE: ["Caso com lesão", "Fatalidade"],
  LTA: ["Caso com lesão", "Com afastamento"],
  NLTA: ["Caso com lesão", "Sem afastamento"],
  FAC: ["Caso com lesão", "Primeiros socorros"],
  INCIDENTE: ["Caso sem lesão", "Incidente apenas com danos a ativos"],
  NEAR_MISS: ["Caso sem lesão", "Quase acidente"],
  CONDICAO_INSEGURA: ["Observação", "Condição insegura"],
  OBSERVACAO: ["Observação", "Ato inseguro"],
};

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return new Response("Sem unidade", { status: 400 });
  const template = new URL(request.url).searchParams.get("modelo") === "1";
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(template ? "Modelo Sphera" : "Eventos");
  ws.addRow(SPHERA_COLUMNS);
  if (template) {
    ws.addRow([
      "28126781", "Observação", unit.name, "", "13/10/2026", "Pedestre fora da faixa na doca 3",
      "Durante a manobra na doca 3, colaborador atravessou fora da faixa de pedestres.", "Nome de quem reportou",
      "Nome do proprietário", "Ato Inseguro", "Não", "Nome do responsável", "Em andamento", "", "-", "Armazém", "-", "Pedestrians",
    ]);
  } else {
    for (const i of await listIncidents(unit.id)) {
      const [tipo, sub] = SPHERA_TYPE[i.type];
      ws.addRow([
        i.spheraId ?? i.number, tipo, unit.name, "", new Date(i.occurredAt), i.title, i.description, i.reportedByName ?? "",
        i.ownerName ?? i.responsible?.name ?? "", i.subtype?.split(" · ").slice(1).join(" · ") || sub, i.hipo ? "Sim" : "Não",
        i.responsible?.name ?? i.ownerName ?? "", i.closed ? "Fechado" : "Em andamento",
        i.steps.investigation === "CONCLUIDO" ? "Fechado" : i.steps.investigation === "NAO_INICIADO" ? "" : "Abrir",
        i.actions.total ? `${i.actions.total - i.actions.open} de ${i.actions.total}` : "-", i.area, "-", i.basicRef ?? "",
      ]);
    }
    ws.getColumn(5).numFmt = "dd/mm/yyyy";
  }
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF13508A" } };
  ws.columns.forEach((c) => (c.width = 25));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const name = template ? "modelo-lista-de-eventos-sphera.xlsx" : `lista-de-eventos-${unit.code}.xlsx`;
  return new Response(await wb.xlsx.writeBuffer(), { headers: { "Content-Type": XLSX, "Content-Disposition": `attachment; filename="${name}"` } });
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const text = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { unit } = await getWorkspace();
  if (!unit) return NextResponse.json({ error: "Sem unidade" }, { status: 400 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo .xlsx" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Limite de 5 MB" }, { status: 400 });

  let rows: unknown[][];
  try {
    rows = await readSheetRows(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Não consegui ler a planilha." }, { status: 400 });
  }
  if (!rows.length) return NextResponse.json({ error: "Planilha vazia." }, { status: 400 });
  const users = await db.user.findMany({ select: { id: true, name: true, email: true } });
  const userByName = (name: string | null) => (name ? (users.find((u) => norm(u.name) === norm(name))?.id ?? null) : null);

  if (isSpheraHeader(rows[0])) {
    const { events, errors, skipped } = parseSpheraRows(rows);
    const existing = new Map(
      (await db.incident.findMany({ where: { unitId: unit.id, spheraId: { not: null } }, select: { id: true, spheraId: true, closedAt: true } })).map(
        (i) => [i.spheraId!, i],
      ),
    );
    let created = 0;
    let updated = 0;
    const done = "CONCLUIDO" as StepStatus;
    for (const e of events) {
      const data = {
        occurredAt: e.occurredAt,
        area: e.area,
        type: e.type as IncidentType,
        hipo: e.hipo,
        title: e.title.slice(0, 200),
        description: e.description,
        reportedByName: e.reportedByName,
        ownerName: e.ownerName,
        basicRef: e.basicRef,
        subtype: e.subtype,
        responsibleId: userByName(e.ownerName),
      };
      // Evento fechado no Sphera entra com as etapas concluídas e encerrado.
      const closing = e.closed
        ? { reportStatus: done, investigationStatus: done, planStatus: done, lessonsStatus: done, closedAt: new Date() }
        : { reportStatus: done, investigationStatus: (e.investigationStatus === "fechado" ? "CONCLUIDO" : "NAO_INICIADO") as StepStatus };
      const cur = existing.get(e.spheraId);
      if (cur) {
        await db.incident.update({ where: { id: cur.id }, data: { ...data, ...(e.closed && !cur.closedAt ? closing : {}) } });
        updated++;
      } else {
        await db.incident.create({
          data: { ...data, ...closing, unitId: unit.id, spheraId: e.spheraId, number: await nextIncidentNumber(unit.id, e.occurredAt), reportedById: user.id },
        });
        created++;
      }
    }
    return NextResponse.json({ created, updated, skipped, errors });
  }

  // Modelo anterior do sistema (Data, Hora, Área, Tipo, HIPO, Título, Descrição, Responsável, ID Sphera).
  const header = rows[0].map((h) => norm(text(h)));
  const col = (name: string) => header.findIndex((h) => h.startsWith(name));
  const idx = { date: col("data"), time: col("hora"), area: col("area"), type: col("tipo"), hipo: col("hipo"), title: col("titulo"), desc: col("descri"), resp: col("respons"), sphera: col("id sphera") };
  if (idx.date < 0 || idx.type < 0 || idx.title < 0)
    return NextResponse.json({ error: "Use o modelo da lista de eventos do Sphera (botão Modelo)." }, { status: 400 });
  const errors: string[] = [];
  let created = 0;
  for (let r = 1; r < rows.length; r++) {
    const get = (i: number) => (i >= 0 ? rows[r][i] : "");
    const title = text(get(idx.title));
    if (!title) continue;
    const occurredAt = sheetDate(get(idx.date));
    const type = parseIncidentType(text(get(idx.type)));
    if (!occurredAt || !type) {
      errors.push(`Linha ${r + 1}: ${!occurredAt ? "data inválida" : "tipo não reconhecido"}`);
      continue;
    }
    const tm = text(get(idx.time)).match(/^(\d{1,2}):(\d{2})/);
    if (tm) occurredAt.setUTCHours(Number(tm[1]) + 3, Number(tm[2]));
    const email = text(get(idx.resp)).toLowerCase();
    await db.incident.create({
      data: {
        unitId: unit.id,
        number: await nextIncidentNumber(unit.id, occurredAt),
        occurredAt,
        area: text(get(idx.area)) || "Não informada",
        type,
        hipo: /^s|^y|^1|true/i.test(text(get(idx.hipo))),
        title: title.slice(0, 200),
        description: text(get(idx.desc)) || title,
        responsibleId: users.find((u) => u.email === email)?.id ?? null,
        spheraId: text(get(idx.sphera)) || null,
        reportedById: user.id,
        reportStatus: "CONCLUIDO",
      },
    });
    created++;
  }
  return NextResponse.json({ created, updated: 0, skipped: 0, errors });
}
