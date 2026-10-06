"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  BadgeCheck,
  FileDown,
  FileSpreadsheet,
  FilterX,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { deleteDriver, saveDriver } from "@/server/drivers";
import { EFFECTIVE_LABEL, effectiveStatus, isDone, TRAININGS, type EffectiveStatus } from "@/lib/road-safety";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export type DriverRow = {
  id: string;
  name: string;
  cpf: string;
  plate: string;
  carrier: string;
  active: boolean;
  notes: string;
  onboardingStatus: "REALIZADO" | "PENDENTE";
  onboardingAt: string | null;
  onboardingValid: string | null;
  defensiveStatus: "REALIZADO" | "PENDENTE";
  defensiveAt: string | null;
  defensiveValid: string | null;
};

// Séries validadas (azul e laranja WISE) e cores de status do sistema.
const SERIES = { onboarding: "#1a64a8", defensive: "#cc7a2a" };
const STATUS_HEX: Record<EffectiveStatus, string> = { REALIZADO: "#1c9a4a", A_VENCER: "#e8a600", VENCIDO: "#c9281f", PENDENTE: "#cbd5e1" };
const STATUS_CLS: Record<EffectiveStatus, string> = {
  REALIZADO: "bg-conforme-bg text-conforme",
  A_VENCER: "bg-amber-100 text-amber-800",
  VENCIDO: "bg-critico text-white",
  PENDENTE: "bg-slate-100 text-slate-600",
};
const INK = { secondary: "#475569", grid: "#e2e8f0" };
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const pctTxt = (v: number) => `${String(v).replace(".", ",")}%`;

function statusOf(d: DriverRow) {
  return {
    onboarding: effectiveStatus(d.onboardingStatus, d.onboardingValid),
    defensive: effectiveStatus(d.defensiveStatus, d.defensiveValid),
  };
}

function StatusBadge({ s, at, valid }: { s: EffectiveStatus; at: string | null; valid: string | null }) {
  return (
    <div>
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CLS[s])}>{EFFECTIVE_LABEL[s]}</span>
      {at || valid ? (
        <div className="mt-0.5 text-[10.5px] tabular-nums text-slate-500">
          {at ? fmtDate(at) : ""}
          {valid ? ` · vence ${fmtDate(valid)}` : ""}
        </div>
      ) : null}
    </div>
  );
}

export function RoadSafetyView({
  unit,
  drivers,
  canEdit,
  canDelete,
}: {
  unit: { id: string; name: string };
  drivers: DriverRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState({ q: "", carrier: "", status: "" });
  const [dlg, setDlg] = useState<DriverRow | "new" | null>(null);
  const [pending, start] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = drivers.filter((d) => d.active);
  const carriers = useMemo(() => [...new Set(drivers.map((d) => d.carrier))].sort(), [drivers]);
  const scoped = active.filter((d) => !f.carrier || d.carrier === f.carrier);

  // Indicadores por treinamento
  const byTraining = TRAININGS.map((t) => {
    const counts: Record<EffectiveStatus, number> = { REALIZADO: 0, A_VENCER: 0, VENCIDO: 0, PENDENTE: 0 };
    for (const d of scoped) counts[statusOf(d)[t.key]]++;
    const done = counts.REALIZADO + counts.A_VENCER;
    return { ...t, counts, done, pendentes: scoped.length - done, pct: pct(done, scoped.length) };
  });
  const aptos = scoped.filter((d) => {
    const s = statusOf(d);
    return isDone(s.onboarding) && isDone(s.defensive);
  }).length;
  const vencidos = scoped.reduce((n, d) => {
    const s = statusOf(d);
    return n + (s.onboarding === "VENCIDO" ? 1 : 0) + (s.defensive === "VENCIDO" ? 1 : 0);
  }, 0);

  // Indicadores por transportadora
  const byCarrier = carriers
    .map((c) => {
      const list = active.filter((d) => d.carrier === c);
      const done = (k: "onboarding" | "defensive") => list.filter((d) => isDone(statusOf(d)[k])).length;
      return {
        carrier: c,
        label: `${c} (${list.length})`,
        total: list.length,
        onbDone: done("onboarding"),
        defDone: done("defensive"),
        Onboarding: pct(done("onboarding"), list.length),
        "Direção Defensiva": pct(done("defensive"), list.length),
      };
    })
    .filter((c) => c.total > 0);

  const pendList = scoped.filter((d) => {
    const s = statusOf(d);
    return !isDone(s.onboarding) || !isDone(s.defensive);
  });

  const rows = drivers.filter((d) => {
    const q = f.q.trim().toLowerCase();
    const s = statusOf(d);
    return (
      (!q || `${d.name} ${d.cpf} ${d.plate} ${d.carrier}`.toLowerCase().includes(q)) &&
      (!f.carrier || d.carrier === f.carrier) &&
      (!f.status ||
        (f.status === "aptos" && isDone(s.onboarding) && isDone(s.defensive)) ||
        (f.status === "pendentes" && (!isDone(s.onboarding) || !isDone(s.defensive))) ||
        (f.status === "vencidos" && (s.onboarding === "VENCIDO" || s.defensive === "VENCIDO")) ||
        (f.status === "inativos" && !d.active))
    );
  });

  const importFile = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/road-safety/excel", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Falha na importação");
        return;
      }
      toast.success(`${json.created} motorista(s) incluído(s), ${json.updated} atualizado(s)`, {
        description: json.errors?.length ? json.errors.slice(0, 3).join(" · ") : undefined,
      });
      router.refresh();
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (d: DriverRow) =>
    confirm(`Excluir ${d.name} do registro?`) &&
    start(async () => {
      const res = await deleteDriver(d.id);
      if (res.ok) {
        toast.success("Motorista excluído");
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Gestão WISE · Road Safety</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">Registro de motoristas</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unit.name} · Onboarding e Curso de Direção Defensiva por motorista e transportadora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/api/road-safety/excel?modelo=1">
              <FileSpreadsheet /> Modelo
            </a>
          </Button>
          {canEdit ? (
            <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
              {pending ? <Loader2 className="animate-spin" /> : <Upload />} Importar planilha
            </Button>
          ) : null}
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
          <Button variant="outline" asChild>
            <a href="/api/road-safety/excel">
              <FileDown /> Exportar
            </a>
          </Button>
          {canEdit ? (
            <Button onClick={() => setDlg("new")}>
              <Plus /> Novo motorista
            </Button>
          ) : null}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={Users} label="Motoristas ativos" value={String(scoped.length)} tone="text-brand-950" />
        <Kpi icon={GraduationCap} label="Onboarding realizado" value={pctTxt(byTraining[0].pct)} sub={`${byTraining[0].pendentes} pendente(s)`} tone="text-brand-700" />
        <Kpi icon={ShieldCheck} label="Direção Defensiva realizada" value={pctTxt(byTraining[1].pct)} sub={`${byTraining[1].pendentes} pendente(s)`} tone="text-accent-700" />
        <Kpi icon={BadgeCheck} label="Aptos (2 treinamentos)" value={pctTxt(pct(aptos, scoped.length))} sub={`${aptos} de ${scoped.length}`} tone="text-conforme" />
        <Kpi icon={AlertTriangle} label="Treinamentos vencidos" value={String(vencidos)} tone={vencidos ? "text-critico" : "text-slate-400"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        {/* Por treinamento */}
        <Card>
          <CardHeader>
            <CardTitle>Realizados x pendentes por treinamento</CardTitle>
            <CardDescription>{f.carrier ? `Transportadora ${f.carrier}` : "Todas as transportadoras"} · motoristas ativos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {byTraining.map((t) => (
              <div key={t.key}>
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold text-slate-800">{t.label}</p>
                  <p className="text-sm tabular-nums text-slate-500">
                    <span className="text-xl font-extrabold text-brand-950">{pctTxt(t.pct)}</span> realizado
                  </p>
                </div>
                <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-slate-100">
                  {(["REALIZADO", "A_VENCER", "VENCIDO", "PENDENTE"] as EffectiveStatus[]).map((s) =>
                    t.counts[s] ? (
                      <span
                        key={s}
                        className="h-full border-r-2 border-white last:border-r-0"
                        style={{ width: `${(t.counts[s] / Math.max(1, scoped.length)) * 100}%`, background: STATUS_HEX[s] }}
                        title={`${EFFECTIVE_LABEL[s]}: ${t.counts[s]}`}
                      />
                    ) : null,
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {(["REALIZADO", "A_VENCER", "VENCIDO", "PENDENTE"] as EffectiveStatus[]).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm" style={{ background: STATUS_HEX[s] }} />
                      {EFFECTIVE_LABEL[s]} <strong className="tabular-nums text-slate-800">{t.counts[s]}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Por transportadora */}
        <Card>
          <CardHeader>
            <CardTitle>% realizado por transportadora</CardTitle>
            <CardDescription>Clique em uma barra para filtrar a transportadora.</CardDescription>
          </CardHeader>
          <CardContent style={{ height: Math.max(220, byCarrier.length * 58 + 60) }}>
            {byCarrier.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byCarrier}
                  layout="vertical"
                  margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
                  onClick={(e) => {
                    const c = (e as { activeLabel?: string } | null)?.activeLabel?.replace(/ \(\d+\)$/, "");
                    if (c) setF((p) => ({ ...p, carrier: p.carrier === c ? "" : c }));
                  }}
                >
                  <CartesianGrid horizontal={false} stroke={INK.grid} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} unit="%" />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    tick={{ fontSize: 11, fill: INK.secondary, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgb(19 80 138 / 0.06)" }}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    formatter={(v, name, item) => {
                      const p = item.payload as (typeof byCarrier)[number];
                      const n = name === "Onboarding" ? p.onbDone : p.defDone;
                      return [`${pctTxt(Number(v))} (${n}/${p.total})`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="Onboarding" fill={SERIES.onboarding} radius={[0, 4, 4, 0]} barSize={12} minPointSize={3} className="cursor-pointer">
                    <LabelList dataKey="Onboarding" position="right" formatter={(v) => pctTxt(Number(v))} style={{ fontSize: 10.5, fill: INK.secondary, fontWeight: 600 }} />
                  </Bar>
                  <Bar dataKey="Direção Defensiva" fill={SERIES.defensive} radius={[0, 4, 4, 0]} barSize={12} minPointSize={3} className="cursor-pointer">
                    <LabelList dataKey="Direção Defensiva" position="right" formatter={(v) => pctTxt(Number(v))} style={{ fontSize: 10.5, fill: INK.secondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-slate-400">Importe a planilha ou cadastre motoristas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pendentes */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-accent-600" /> Pendências de treinamento
            </CardTitle>
            <CardDescription>Motoristas ativos com Onboarding ou Direção Defensiva pendente ou vencido — lista para cobrança das transportadoras.</CardDescription>
          </div>
          <span className="rounded-full bg-accent-50 px-3 py-1 text-sm font-bold tabular-nums text-accent-700">{pendList.length}</span>
        </CardHeader>
        <CardContent>
          {pendList.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(showAll ? pendList : pendList.slice(0, 9)).map((d) => {
                const s = statusOf(d);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setDlg(d)}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition-all hover:border-brand-200 hover:shadow-soft disabled:cursor-default"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <Truck className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{d.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        {d.carrier}
                        {d.plate ? ` · ${d.plate}` : ""}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {!isDone(s.onboarding) ? (
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", STATUS_CLS[s.onboarding])}>
                            Onboarding · {EFFECTIVE_LABEL[s.onboarding]}
                          </span>
                        ) : null}
                        {!isDone(s.defensive) ? (
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", STATUS_CLS[s.defensive])}>
                            Dir. Defensiva · {EFFECTIVE_LABEL[s.defensive]}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {pendList.length > 9 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Por transportadora:{" "}
                {carriers
                  .map((c) => [c, pendList.filter((d) => d.carrier === c).length] as const)
                  .filter(([, n]) => n)
                  .map(([c, n]) => `${c} ${n}`)
                  .join(" · ")}
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Mostrar menos" : `Mostrar todos (${pendList.length})`}
              </Button>
            </div>
          ) : null}
          {pendList.length === 0 ? (
            <p className="py-6 text-center text-sm text-conforme">Nenhuma pendência — todos os motoristas ativos estão aptos.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Registro */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[2fr_1fr_1fr_auto]">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar nome, CPF, placa…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <Select value={f.carrier} onChange={(e) => setF({ ...f, carrier: e.target.value })}>
          <option value="">Todas as transportadoras</option>
          {carriers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">Todos os status</option>
          <option value="aptos">Aptos</option>
          <option value="pendentes">Com pendência</option>
          <option value="vencidos">Com treinamento vencido</option>
          <option value="inativos">Inativos</option>
        </Select>
        <Button variant="ghost" onClick={() => setF({ q: "", carrier: "", status: "" })}>
          <FilterX /> Limpar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-3 py-3 font-medium">CPF</th>
              <th className="px-3 py-3 font-medium">Placa</th>
              <th className="px-3 py-3 font-medium">Transportadora</th>
              <th className="px-3 py-3 font-medium">Onboarding</th>
              <th className="px-3 py-3 font-medium">Curso Direção Defensiva</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Nenhum motorista encontrado.
                </td>
              </tr>
            ) : (
              rows.map((d) => {
                const s = statusOf(d);
                return (
                  <tr key={d.id} className={cn("border-t border-slate-100 align-top hover:bg-slate-50/60", !d.active && "opacity-50")}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {d.name}
                      {!d.active ? <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">inativo</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">{d.cpf || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-700">{d.plate || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">{d.carrier}</span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge s={s.onboarding} at={d.onboardingAt} valid={d.onboardingValid} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge s={s.defensive} at={d.defensiveAt} valid={d.defensiveValid} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-0.5">
                        {canEdit ? (
                          <button type="button" title="Editar" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setDlg(d)}>
                            <Pencil className="size-4" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button type="button" title="Excluir" className="rounded p-1 text-slate-400 hover:bg-critico-bg hover:text-critico" onClick={() => remove(d)}>
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {rows.length} de {drivers.length} motorista(s). Treinamento realizado com validade expirada volta a contar como pendente.
      </p>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent title={dlg === "new" ? "Novo motorista" : "Editar motorista"} description="Dados do motorista e situação dos treinamentos obrigatórios.">
          {dlg ? (
            <DriverForm
              unitId={unit.id}
              initial={dlg === "new" ? null : dlg}
              carriers={carriers}
              onDone={() => {
                setDlg(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof Users; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <Icon className="size-4 text-brand-600" />
      <p className={cn("mt-2 text-2xl font-extrabold tabular-nums", tone)}>{value}</p>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      {sub ? <p className="text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

function DriverForm({ unitId, initial, carriers, onDone }: { unitId: string; initial: DriverRow | null; carriers: string[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const d10 = (v: string | null | undefined) => v?.slice(0, 10) ?? "";
  const [f, setF] = useState({
    name: initial?.name ?? "",
    cpf: initial?.cpf ?? "",
    plate: initial?.plate ?? "",
    carrier: initial?.carrier ?? "",
    active: initial?.active ?? true,
    notes: initial?.notes ?? "",
    onboardingStatus: initial?.onboardingStatus ?? "PENDENTE",
    onboardingAt: d10(initial?.onboardingAt),
    onboardingValid: d10(initial?.onboardingValid),
    defensiveStatus: initial?.defensiveStatus ?? "PENDENTE",
    defensiveAt: d10(initial?.defensiveAt),
    defensiveValid: d10(initial?.defensiveValid),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const training = (prefix: "onboarding" | "defensive", label: string) => {
    const st = `${prefix}Status` as const;
    return (
      <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:col-span-2 sm:grid-cols-3">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand-800">{label}</legend>
        <Field label="Status">
          <Select
            value={f[st]}
            onChange={(e) => {
              const v = e.target.value as "REALIZADO" | "PENDENTE";
              // Ao marcar como realizado sem data, sugere a data de hoje.
              const atKey = `${prefix}At` as const;
              setF({ ...f, [st]: v, ...(v === "REALIZADO" && !f[atKey] ? { [atKey]: new Date().toISOString().slice(0, 10) } : {}) });
            }}
          >
            <option value="REALIZADO">Realizado</option>
            <option value="PENDENTE">Pendente</option>
          </Select>
        </Field>
        <Field label="Data de realização">
          <Input type="date" value={f[`${prefix}At`]} onChange={set(`${prefix}At`)} disabled={f[st] !== "REALIZADO"} />
        </Field>
        <Field label="Validade">
          <Input type="date" value={f[`${prefix}Valid`]} onChange={set(`${prefix}Valid`)} disabled={f[st] !== "REALIZADO"} />
        </Field>
      </fieldset>
    );
  };

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveDriver({
            ...f,
            id: initial?.id,
            unitId,
            onboardingStatus: f.onboardingStatus as "REALIZADO" | "PENDENTE",
            defensiveStatus: f.defensiveStatus as "REALIZADO" | "PENDENTE",
            onboardingAt: f.onboardingStatus === "REALIZADO" ? f.onboardingAt : null,
            onboardingValid: f.onboardingStatus === "REALIZADO" ? f.onboardingValid : null,
            defensiveAt: f.defensiveStatus === "REALIZADO" ? f.defensiveAt : null,
            defensiveValid: f.defensiveStatus === "REALIZADO" ? f.defensiveValid : null,
          });
          if (res.ok) {
            toast.success("Motorista salvo");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Nome" className="sm:col-span-2">
        <Input value={f.name} onChange={set("name")} required />
      </Field>
      <Field label="CPF">
        <Input value={f.cpf} onChange={set("cpf")} placeholder="000.000.000-00" />
      </Field>
      <Field label="Placa">
        <Input value={f.plate} onChange={set("plate")} placeholder="ABC1D23" />
      </Field>
      <Field label="Transportadora">
        <Input list="carriers" value={f.carrier} onChange={set("carrier")} required />
        <datalist id="carriers">
          {carriers.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Motorista ativo
      </label>
      {training("onboarding", "Onboarding")}
      {training("defensive", "Curso Direção Defensiva")}
      <Field label="Observações" className="sm:col-span-2">
        <Textarea rows={2} value={f.notes} onChange={set("notes")} />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}
