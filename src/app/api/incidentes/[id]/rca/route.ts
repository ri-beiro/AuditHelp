// RCA da ocorrência em Excel, no layout do formulário "Análise de Causa Raiz (RCA) para Segurança".
import ExcelJS from "exceljs";
import { assertUnitAccess, getCurrentUser } from "@/server/context";
import { loadIncidentDetail } from "@/server/incident-queries";
import { INCIDENT_TYPE_LABEL, type IncidentTypeKey } from "@/lib/incidents";
import { FISHBONE, RCA_BASICS, SIX_W_TWO_H, YES_NO_LABEL, type YesNo } from "@/lib/rca";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const NAVY = "FF0B2E5C";
const LIGHT = "FFEAF1FA";
const BORDER = { style: "thin" as const, color: { argb: "FFCBD5E1" } };

const yn = (v: YesNo) => (v ? YES_NO_LABEL[v] : "");
const br = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return Number.isNaN(+d) ? "" : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const inc = await loadIncidentDetail(id);
  if (!inc) return new Response("Não encontrado", { status: 404 });
  try {
    await assertUnitAccess(user, inc.unitId);
  } catch {
    return new Response("Sem acesso", { status: 403 });
  }
  const r = inc.rca;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Formulário Digital", { views: [{ showGridLines: false }], pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: "landscape" } });
  ws.columns = [{ width: 3 }, { width: 26 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];
  const LAST = 8;
  let row = 1;

  const cell = (r0: number, c: number) => ws.getCell(r0, c);
  const put = (c1: number, c2: number, value: string | number, opts: { bold?: boolean; fill?: string; color?: string; size?: number; height?: number } = {}) => {
    if (c2 > c1) ws.mergeCells(row, c1, row, c2);
    const x = cell(row, c1);
    x.value = value;
    x.alignment = { wrapText: true, vertical: "top" };
    x.font = { bold: opts.bold, color: opts.color ? { argb: opts.color } : undefined, size: opts.size ?? 10 };
    if (opts.fill) x.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
    for (let c = c1; c <= c2; c++) cell(row, c).border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
  };
  const height = (text: string, width: number) => Math.max(18, Math.ceil(Math.max(1, text.length) / (width * 1.1)) * 14 + 4);
  const section = (title: string) => {
    row += 1;
    put(2, LAST, title, { bold: true, fill: NAVY, color: "FFFFFFFF", size: 11 });
    ws.getRow(row).height = 20;
    row += 1;
  };
  const labelValue = (label: string, value: string) => {
    put(2, 2, label, { bold: true, fill: LIGHT });
    put(3, LAST, value);
    ws.getRow(row).height = height(value, 130);
    row += 1;
  };

  put(2, LAST, "Análise de Causa Raiz (RCA) para Segurança", { bold: true, size: 16, color: NAVY });
  ws.getRow(row).height = 26;
  row += 1;
  put(2, LAST, `${inc.number} · ${inc.title}`, { color: "FF64748B" });
  row += 1;

  section("1. Informações do evento");
  labelValue("Tipo de incidente", `${INCIDENT_TYPE_LABEL[inc.type as IncidentTypeKey]}${inc.hipo ? " · HIPO (alto potencial)" : ""}`);
  labelValue("Proprietário da investigação", r.investigationOwner);
  labelValue("Proprietário da área", r.areaOwner);
  labelValue("Data / hora do evento", new Date(inc.occurredAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }));
  labelValue("Área / localização", inc.area);
  labelValue("Equipamento", r.equipment);
  labelValue("Equipe da investigação", inc.participants.replace(/\n+/g, ", "));
  labelValue("Descrição", inc.description);

  section("Resolução inicial do problema — Restauração das condições básicas");
  for (const block of RCA_BASICS) {
    put(2, 6, block.title, { bold: true, fill: LIGHT });
    put(7, 7, "Resposta", { bold: true, fill: LIGHT });
    put(8, 8, "", { fill: LIGHT });
    row += 1;
    for (const g of block.groups) {
      for (const q of g.questions) {
        const ans = r.basics[q.id] ?? "";
        put(2, 3, g.title, { color: "FF475569" });
        put(4, 6, q.text);
        put(7, 7, yn(ans), { bold: true, color: ans === "NAO" ? "FFC9281F" : ans === "SIM" ? "FF15803D" : undefined });
        put(8, 8, "");
        ws.getRow(row).height = 28;
        row += 1;
      }
    }
    const notes = block === RCA_BASICS[0] ? r.equipmentNotes : r.processNotes;
    labelValue("Observações", notes);
  }
  put(2, LAST, "Para cada 'Não', qual é a ação? Se necessário, conduza os 5 porquês e registre no plano de ação.", { color: "FF64748B" });
  row += 1;

  section("2. 6W2H");
  for (const x of SIX_W_TWO_H) labelValue(x.label, r.sixW[x.k]);
  labelValue("Declaração do problema refocalizada", r.problemStatement);
  labelValue("Problema resolvido com melhor compreensão da situação e dos padrões?", yn(r.solvedByBasics));

  section("3. Espinha de peixe");
  labelValue("Problema (cabeça)", r.problemStatement || inc.title);
  for (const f of FISHBONE) labelValue(f.label, r.fishbone[f.k].filter((s) => s.trim()).map((s) => `• ${s.trim()}`).join("\n"));
  labelValue("Fatores essenciais", r.essentialFactors);

  section("4. 5 Porquês — O que levou ao incidente?");
  const hdr = ["Categoria / fator", "Por que 1", "Por que 2", "Por que 3", "Por que 4", "Por que 5", "Causa raiz identificada"];
  hdr.forEach((h, i) => put(2 + i, 2 + i, h, { bold: true, fill: LIGHT }));
  row += 1;
  for (const w of r.whys) {
    const cols = [[w.category, w.factor].filter(Boolean).join("\n"), ...w.whys, [w.causeType, w.rootCause].filter(Boolean).join("\n")];
    cols.forEach((v, i) => put(2 + i, 2 + i, v));
    ws.getRow(row).height = Math.min(300, Math.max(...cols.map((v) => height(v, 22))));
    row += 1;
  }
  labelValue("Foi identificada uma causa raiz?", yn(r.rootCauseFound));
  labelValue("Resumo", r.summary);

  section("5. Ações imediatas");
  put(2, 2, "#", { bold: true, fill: LIGHT });
  put(3, 6, "Ação", { bold: true, fill: LIGHT });
  put(7, 7, "Data de conclusão", { bold: true, fill: LIGHT });
  put(8, 8, "Proprietário", { bold: true, fill: LIGHT });
  row += 1;
  r.immediate
    .filter((a) => a.action.trim())
    .forEach((a, i) => {
      put(2, 2, i + 1);
      put(3, 6, a.action);
      put(7, 7, br(a.date));
      put(8, 8, a.owner);
      ws.getRow(row).height = height(a.action, 85);
      row += 1;
    });

  section("6. Ações corretivas e preventivas (Plano de Ação)");
  ["#", "Ação", "Hierarquia de controle", "Prazo", "Proprietário", "Status", "Causa raiz associada"].forEach((h, i) => put(2 + i, 2 + i, h, { bold: true, fill: LIGHT }));
  row += 1;
  const status: Record<string, string> = { ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída", CANCELADA: "Cancelada" };
  inc.actionList.forEach((a, i) => {
    const cols = [String(i + 1), a.what, a.controlHierarchy, br(a.dueDate), a.ownerName ?? "", status[a.status] ?? a.status, a.rootCauseRef];
    cols.forEach((v, j) => put(2 + j, 2 + j, v));
    ws.getRow(row).height = Math.max(height(a.what, 22), height(a.rootCauseRef, 22));
    row += 1;
  });

  row += 1;
  put(2, 3, `Data da reunião inicial: ${br(inc.meetingAt)}`, { bold: true });
  r.followUps.forEach((d, i) => put(4 + i, 4 + i, `Acompanhamento ${i + 1}: ${br(d)}`, { bold: true }));

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="RCA_${inc.number}.xlsx"`,
    },
  });
}
