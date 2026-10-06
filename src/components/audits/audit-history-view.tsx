"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarRange,
  ClipboardPlus,
  ExternalLink,
  FileDown,
  FileText,
  FilterX,
  Loader2,
  Medal,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingDown,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { AuditHistoryRow } from "@/server/audit-history-queries";
import { deleteAuditRecord, saveAuditRecord } from "@/server/audit-history";
import { AUDIT_RECORD_TYPES, DEFAULT_AREAS } from "@/lib/incidents";
import { uploadFile } from "@/lib/upload-client";
import { fileHref } from "@/lib/file-url";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { GRADE_COLOR, GradeBadge } from "@/components/grade-badge";
import { complianceGrade } from "@/lib/scoring";
import { ActionFormDialog } from "@/components/actions/action-form";

const BLUE = "#1a64a8";
const INK = { secondary: "#475569", grid: "#e2e8f0" };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pctTxt = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1).replace(".", ",")}%`);
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Props = {
  unit: { id: string; name: string };
  rows: AuditHistoryRow[];
  canEdit: boolean;
  canAction: boolean;
  blobEnabled: boolean;
  members: { id: string; name: string }[];
  elements: { id: string; code: string; label: string }[];
};

export function AuditHistoryView({ unit, rows, canEdit, canAction, blobEnabled, members, elements }: Props) {
  const router = useRouter();
  const years = useMemo(() => [...new Set(rows.map((r) => r.date.slice(0, 4)))].sort().reverse(), [rows]);
  const [f, setF] = useState({ year: years[0] ?? String(new Date().getFullYear()), type: "", area: "", q: "" });
  const [dlg, setDlg] = useState<AuditHistoryRow | "new" | null>(null);
  const [actionFor, setActionFor] = useState<AuditHistoryRow | null>(null);
  const [, start] = useTransition();

  const types = [...new Set(rows.map((r) => r.type))].sort();
  const areas = [...new Set(rows.map((r) => r.area))].sort();
  // Filtros de tipo/área/busca valem para tudo; o ano vale para KPIs, evolução mensal, áreas e tabela.
  const base = rows.filter((r) => {
    const q = f.q.trim().toLowerCase();
    return (
      r.pct !== null &&
      (!f.type || r.type === f.type) &&
      (!f.area || r.area === f.area) &&
      (!q || `${r.type} ${r.area} ${r.auditor} ${r.result} ${r.notes}`.toLowerCase().includes(q))
    );
  });
  const inYear = base.filter((r) => !f.year || r.date.startsWith(f.year));
  const prevYear = f.year ? base.filter((r) => r.date.startsWith(String(Number(f.year) - 1))) : [];

  const yearAvg = avg(inYear.map((r) => r.pct!));
  const prevAvg = avg(prevYear.map((r) => r.pct!));
  const lastMonth = inYear[0]?.date.slice(0, 7);
  const monthAvg = avg(inYear.filter((r) => r.date.startsWith(lastMonth ?? "x")).map((r) => r.pct!));
  const best = inYear.reduce<AuditHistoryRow | null>((b, r) => (!b || r.pct! > b.pct! ? r : b), null);
  const worst = inYear.reduce<AuditHistoryRow | null>((w, r) => (!w || r.pct! < w.pct! ? r : w), null);
  const delta = yearAvg !== null && prevAvg !== null ? (yearAvg - prevAvg) * 100 : null;

  const annual = [...new Set(base.map((r) => r.date.slice(0, 4)))]
    .sort()
    .map((y) => {
      const v = avg(base.filter((r) => r.date.startsWith(y)).map((r) => r.pct!))!;
      return { year: y, value: Math.round(v * 1000) / 10 };
    });
  const monthly = MONTHS.map((m, i) => {
    const key = `${f.year}-${String(i + 1).padStart(2, "0")}`;
    const v = avg(base.filter((r) => r.date.startsWith(key)).map((r) => r.pct!));
    return { month: m, value: v === null ? null : Math.round(v * 1000) / 10 };
  });
  const ranking = [...new Set(inYear.map((r) => r.area))]
    .map((area) => {
      const list = inYear.filter((r) => r.area === area);
      const prev = avg(prevYear.filter((r) => r.area === area).map((r) => r.pct!));
      const v = avg(list.map((r) => r.pct!))!;
      return { area, value: Math.round(v * 1000) / 10, pct: v, n: list.length, prev };
    })
    .sort((a, b) => b.value - a.value);

  const remove = (r: AuditHistoryRow) =>
    confirm("Excluir este registro do histórico?") &&
    start(async () => {
      const res = await deleteAuditRecord(r.id);
      if (res.ok) {
        toast.success("Registro excluído");
        router.refresh();
      } else toast.error(res.error);
    });

  const w12 = elements.find((e) => e.code === "W12");

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Auditorias · Histórico unificado</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">{unit.name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Auditorias de contratadas feitas no sistema entram automaticamente; outras auditorias (WISE², 12 Básicos, internas, externas) podem ser registradas manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" asChild>
            <a href="/api/auditorias/historico">
              <FileDown /> Excel
            </a>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> PDF
          </Button>
          {canEdit ? (
            <Button onClick={() => setDlg("new")}>
              <Plus /> Registrar auditoria
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-5 print:hidden">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <Select value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })}>
          <option value="">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="">Todos os tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Button variant="ghost" onClick={() => setF({ year: years[0] ?? "", type: "", area: "", q: "" })}>
          <FilterX /> Limpar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={CalendarRange} label={`Média anual ${f.year || "(todos)"}`} value={pctTxt(yearAvg)} />
        <Kpi icon={CalendarRange} label={lastMonth ? `Média de ${MONTHS[Number(lastMonth.slice(5)) - 1]}/${lastMonth.slice(2, 4)}` : "Média mensal"} value={pctTxt(monthAvg)} />
        <Kpi icon={Award} label={best ? `Melhor · ${best.area}` : "Melhor nota"} value={pctTxt(best?.pct ?? null)} tone="text-conforme" />
        <Kpi icon={TrendingDown} label={worst ? `Pior · ${worst.area}` : "Pior nota"} value={pctTxt(worst?.pct ?? null)} tone="text-critico" />
        <Kpi
          icon={delta !== null && delta < 0 ? ArrowDownRight : ArrowUpRight}
          label={`Evolução vs ${f.year ? Number(f.year) - 1 : "ano anterior"}`}
          value={delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} p.p.`}
          tone={delta === null ? undefined : delta >= 0 ? "text-conforme" : "text-critico"}
        />
        <Kpi icon={FileText} label="Auditorias no período" value={String(inYear.length)} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nota média por ano</CardTitle>
            <CardDescription>Evolução anual (% da nota máxima).</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {annual.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annual} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={INK.grid} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgb(19 80 138 / 0.06)" }} contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v}%`, "Média"]} />
                  <Bar dataKey="value" fill={BLUE} radius={[6, 6, 0, 0]} maxBarSize={56}>
                    <LabelList dataKey="value" position="top" formatter={(v) => `${String(v).replace(".", ",")}`} style={{ fontSize: 11, fontWeight: 700, fill: "#0f172a" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evolução mensal {f.year}</CardTitle>
            <CardDescription>Média das auditorias do mês · linha de referência em 80% (classificação A).</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {f.year && monthly.some((m) => m.value !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={INK.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <ReferenceLine y={80} stroke="#1c9a4a" strokeDasharray="4 4" />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v}%`, "Média"]} />
                  <Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2.5} connectNulls dot={{ r: 4, fill: BLUE }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text={f.year ? "Sem auditorias neste ano." : "Selecione um ano."} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Comparativo entre áreas</CardTitle>
            <CardDescription>Nota média por área no período, colorida pela classificação.</CardDescription>
          </CardHeader>
          <CardContent style={{ height: Math.max(200, ranking.length * 34 + 30) }}>
            {ranking.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranking} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="area" width={150} tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <ReferenceLine x={80} stroke="#1c9a4a" strokeDasharray="4 4" />
                  <Tooltip cursor={{ fill: "rgb(19 80 138 / 0.06)" }} contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v}%`, "Média"]} />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={16}>
                    {ranking.map((r) => (
                      <Cell key={r.area} fill={GRADE_COLOR[complianceGrade(r.pct) ?? "D"]} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v) => `${String(v).replace(".", ",")}%`} style={{ fontSize: 11, fontWeight: 600, fill: INK.secondary }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ranking de áreas</CardTitle>
            <CardDescription>Posição pela nota média · variação vs ano anterior.</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking.length ? (
              <ol className="space-y-1.5">
                {ranking.map((r, i) => {
                  const d = r.prev === null ? null : (r.pct - r.prev) * 100;
                  return (
                    <li key={r.area} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full text-xs font-black",
                          i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {i < 3 ? <Medal className="size-4" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{r.area}</span>
                      <span className="text-[11px] text-slate-400">{r.n}×</span>
                      {d !== null ? (
                        <span className={cn("text-[11px] font-semibold tabular-nums", d >= 0 ? "text-conforme" : "text-critico")}>
                          {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1).replace(".", ",")}
                        </span>
                      ) : null}
                      <span className="w-14 text-right text-sm font-bold tabular-nums text-brand-950">{String(r.value).replace(".", ",")}%</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-3 py-3 font-medium">Tipo</th>
              <th className="px-3 py-3 font-medium">Área</th>
              <th className="px-3 py-3 font-medium">Auditor</th>
              <th className="px-3 py-3 text-right font-medium">Nota</th>
              <th className="px-3 py-3 font-medium">Resultado</th>
              <th className="px-3 py-3 font-medium">Relatório</th>
              <th className="px-3 py-3 font-medium">Plano de ação</th>
              <th className="px-3 py-3 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {inYear.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  Nenhuma auditoria no período.
                </td>
              </tr>
            ) : (
              inYear.map((r) => (
                <tr key={`${r.source}-${r.id}`} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                  <td className="px-4 py-3 tabular-nums text-slate-700">{fmtDate(r.date)}</td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-800">{r.type}</span>
                    {r.source === "contratada" ? (
                      <span className="ml-1 rounded bg-wgreen-100 px-1.5 py-0.5 text-[10px] font-semibold text-wgreen-700">automática</span>
                    ) : null}
                    {r.inProgress ? <span className="ml-1 rounded bg-accent-50 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">em andamento</span> : null}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{r.area}</td>
                  <td className="px-3 py-3 text-slate-700">{r.auditor}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-bold tabular-nums text-brand-950">{String(r.score).replace(".", ",")}</span>
                    <span className="text-xs text-slate-400">/{r.maxScore}</span>
                    <div className="text-[11px] tabular-nums text-slate-500">{pctTxt(r.pct)}</div>
                  </td>
                  <td className="max-w-xs px-3 py-3">
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={r.grade} size="sm" />
                      <span className="line-clamp-2 text-xs text-slate-600">{r.result || "—"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {r.href ? (
                      <Link href={r.href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                        <ExternalLink className="size-3.5" /> Checklist
                      </Link>
                    ) : r.reportUrl ? (
                      <a href={fileHref(r.reportUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                        <FileText className="size-3.5" /> Abrir
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {r.actions.total ? (
                      <Link href={`/acoes?q=${encodeURIComponent(r.source === "manual" ? `Auditoria · ${r.type}` : r.result.split(" · ")[0])}`} className="hover:underline">
                        <span className="font-semibold text-slate-700">{r.actions.total} ação(ões)</span>
                        {r.actions.overdue ? <span className="ml-1 font-semibold text-critico">· {r.actions.overdue} vencida(s)</span> : null}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Sem ações</span>
                    )}
                  </td>
                  <td className="px-3 py-3 print:hidden">
                    <div className="flex justify-end gap-0.5">
                      {r.source === "manual" && canAction ? (
                        <IconBtn title="Criar plano de ação" onClick={() => setActionFor(r)}>
                          <ClipboardPlus className="size-4" />
                        </IconBtn>
                      ) : null}
                      {r.source === "manual" && canEdit ? (
                        <>
                          <IconBtn title="Editar" onClick={() => setDlg(r)}>
                            <Pencil className="size-4" />
                          </IconBtn>
                          <IconBtn title="Excluir" danger onClick={() => remove(r)}>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent title={dlg === "new" ? "Registrar auditoria" : "Editar auditoria"} description="Informe a nota obtida e a nota máxima (ex.: 40 de 65 na curva WISE, ou 87 de 100).">
          {dlg ? (
            <RecordForm
              unitId={unit.id}
              initial={dlg === "new" ? null : dlg}
              areas={areas}
              blobEnabled={blobEnabled}
              onDone={() => {
                setDlg(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ActionFormDialog
        open={!!actionFor}
        onOpenChange={(o) => !o && setActionFor(null)}
        preset={
          actionFor
            ? {
                auditRecordId: actionFor.id,
                elementId: w12?.id,
                why: `Auditoria · ${actionFor.type} — ${actionFor.area} (${fmtDate(actionFor.date)})`,
                where: actionFor.area,
              }
            : undefined
        }
        context={{ unitId: unit.id, elements, members }}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Award; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <Icon className="size-4 text-brand-600" />
      <p className={cn("mt-2 text-2xl font-extrabold tabular-nums text-brand-950", tone)}>{value}</p>
      <p className="truncate text-[11px] font-medium text-slate-500" title={label}>
        {label}
      </p>
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn("rounded p-1 text-slate-400", danger ? "hover:bg-critico-bg hover:text-critico" : "hover:bg-slate-100 hover:text-slate-700")}
    >
      {children}
    </button>
  );
}

function EmptyChart({ text = "Sem dados para os filtros atuais." }: { text?: string }) {
  return <p className="grid h-full min-h-32 place-items-center text-sm text-slate-400">{text}</p>;
}

function RecordForm({
  unitId,
  initial,
  areas,
  blobEnabled,
  onDone,
}: {
  unitId: string;
  initial: AuditHistoryRow | null;
  areas: string[];
  blobEnabled: boolean;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({
    date: initial?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    type: initial?.type ?? AUDIT_RECORD_TYPES[0],
    area: initial?.area ?? "",
    auditor: initial?.auditor ?? "",
    score: initial ? String(initial.score) : "",
    maxScore: initial ? String(initial.maxScore) : "100",
    result: initial?.result ?? "",
    reportUrl: initial?.reportUrl ?? "",
    notes: initial?.notes ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const num = (s: string) => Number(s.replace(",", "."));
  const pct = f.score && num(f.maxScore) > 0 ? num(f.score) / num(f.maxScore) : null;
  const areaOptions = [...new Set([...areas, ...DEFAULT_AREAS])];

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setF((p) => ({ ...p, reportUrl: "" }));
      const url = await uploadFile(file, `${unitId}/auditorias`, blobEnabled);
      setF((p) => ({ ...p, reportUrl: url }));
      toast.success("Relatório anexado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveAuditRecord({
            id: initial?.id,
            unitId,
            date: f.date,
            type: f.type,
            area: f.area,
            auditor: f.auditor,
            score: num(f.score),
            maxScore: num(f.maxScore),
            result: f.result,
            reportUrl: f.reportUrl,
            notes: f.notes,
          });
          if (res.ok) {
            toast.success("Auditoria salva");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Data">
        <Input type="date" value={f.date} onChange={set("date")} required />
      </Field>
      <Field label="Tipo">
        <Input list="audit-types" value={f.type} onChange={set("type")} required />
        <datalist id="audit-types">
          {AUDIT_RECORD_TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <Field label="Área">
        <Input list="audit-areas" value={f.area} onChange={set("area")} required placeholder="Ex.: Armazenagem / Racks" />
        <datalist id="audit-areas">
          {areaOptions.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </Field>
      <Field label="Auditor">
        <Input value={f.auditor} onChange={set("auditor")} required />
      </Field>
      <Field label="Nota obtida">
        <Input inputMode="decimal" value={f.score} onChange={set("score")} required placeholder="Ex.: 40" />
      </Field>
      <Field label="Nota máxima">
        <Input inputMode="decimal" value={f.maxScore} onChange={set("maxScore")} required />
      </Field>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
        Aproveitamento: <strong className="tabular-nums text-brand-950">{pctTxt(pct)}</strong>
      </div>
      <Field label="Resultado / parecer" className="sm:col-span-2">
        <Input value={f.result} onChange={set("result")} placeholder="Ex.: Aprovado com ressalvas" />
      </Field>
      <Field label="Relatório (arquivo ou link)" className="sm:col-span-2">
        <div className="flex gap-2">
          <Input value={f.reportUrl} onChange={set("reportUrl")} placeholder="https://…" />
          <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-soft hover:bg-brand-50/50">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Arquivo
            <input type="file" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>
      </Field>
      <Field label="Observações" className="sm:col-span-2">
        <Textarea rows={3} value={f.notes} onChange={set("notes")} />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={pending || uploading}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}
