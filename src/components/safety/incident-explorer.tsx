"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, FilterX, GanttChart, ListOrdered, Search } from "lucide-react";
import type { IncidentListItem } from "@/server/incident-queries";
import { INCIDENT_TYPE_LABEL, INCIDENT_TYPES, PYRAMID_LEVELS, criticalityRank, sortByCriticality } from "@/lib/incidents";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { HipoBadge, ProgressPill, TYPE_STYLE, TypeBadge } from "@/components/incidents/bits";
import { MonthCalendar } from "./month-calendar";

export type ExplorerFilters = { q: string; from: string; to: string; area: string; cls: string; status: string };
export const EMPTY_FILTERS: ExplorerFilters = { q: "", from: "", to: "", area: "", cls: "", status: "" };

const TYPE_HEX: Record<string, string> = Object.fromEntries(
  PYRAMID_LEVELS.flatMap((l) => l.types.map((t) => [t, l.color])),
);

function matchCls(i: IncidentListItem, cls: string) {
  if (!cls) return true;
  if (cls === "HIPO") return i.hipo;
  const lvl = PYRAMID_LEVELS.find((l) => l.key === cls);
  if (lvl) return lvl.types.includes(i.type);
  return i.type === cls;
}

function matchStatus(i: IncidentListItem, s: string) {
  switch (s) {
    case "abertas":
      return !i.closed;
    case "encerradas":
      return i.closed;
    case "inv-concluida":
      return i.investigationDone;
    case "inv-aberta":
      return !i.investigationDone;
    case "vencidas":
      return i.actions.overdue > 0;
    default:
      return true;
  }
}

export function StatusChip({ i }: { i: IncidentListItem }) {
  if (i.closed)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-conforme-bg px-2 py-0.5 text-[11px] font-semibold text-conforme">
        <CheckCircle2 className="size-3" /> Encerrada
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
      <Clock3 className="size-3" /> Em investigação
    </span>
  );
}

function ActionsCell({ a }: { a: IncidentListItem["actions"] }) {
  if (!a.total) return <span className="text-xs text-slate-400">Sem plano</span>;
  return (
    <div className="text-xs">
      <span className="font-semibold text-slate-700">{a.total} ação(ões)</span>
      <div className="flex gap-1.5 text-[11px]">
        {a.open ? <span className="text-brand-700">{a.open} aberta(s)</span> : <span className="text-conforme">concluídas</span>}
        {a.overdue ? <span className="font-semibold text-critico">{a.overdue} vencida(s)</span> : null}
      </div>
    </div>
  );
}

/** Lista de criticidade, linha do tempo mensal e agenda das ocorrências — com filtros avançados compartilhados. */
export function IncidentExplorer({
  incidents,
  initial,
  initialView = "lista",
}: {
  incidents: IncidentListItem[];
  initial?: Partial<ExplorerFilters>;
  initialView?: "lista" | "timeline" | "agenda";
}) {
  const [f, setF] = useState<ExplorerFilters>({ ...EMPTY_FILTERS, ...initial });
  const [view, setView] = useState(initialView);
  const set = (k: keyof ExplorerFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const areas = useMemo(() => [...new Set(incidents.map((i) => i.area))].sort(), [incidents]);

  const rows = incidents.filter((i) => {
    const q = f.q.trim().toLowerCase();
    const day = i.occurredAt.slice(0, 10);
    return (
      (!q || `${i.number} ${i.title} ${i.description} ${i.area} ${i.responsible?.name ?? ""} ${i.spheraId ?? ""}`.toLowerCase().includes(q)) &&
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to) &&
      (!f.area || i.area === f.area) &&
      matchCls(i, f.cls) &&
      matchStatus(i, f.status)
    );
  });

  const byMonth = useMemo(() => {
    const m = new Map<string, IncidentListItem[]>();
    for (const i of rows) {
      const k = i.occurredAt.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const VIEWS = [
    { key: "lista", label: "Lista de criticidade", icon: ListOrdered },
    { key: "timeline", label: "Linha do tempo", icon: GanttChart },
    { key: "agenda", label: "Agenda", icon: CalendarDays },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200/70 bg-white/70 p-1 shadow-soft">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all [&_svg]:size-4",
                view === v.key ? "bg-brand-700 text-white shadow-soft" : "text-slate-500 hover:text-brand-800",
              )}
            >
              <v.icon /> <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {rows.length} de {incidents.length} ocorrência(s)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3 2xl:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.9fr))_repeat(3,minmax(0,1.2fr))]">
        <div className="relative col-span-2 md:col-span-3 2xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar número, título, área, responsável…" value={f.q} onChange={set("q")} />
        </div>
        <Input type="date" value={f.from} onChange={set("from")} title="Período: de" />
        <Input type="date" value={f.to} onChange={set("to")} title="Período: até" />
        <Select value={f.area} onChange={set("area")}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={f.cls} onChange={set("cls")}>
          <option value="">Todas as classificações</option>
          <option value="HIPO">HIPO (alto potencial)</option>
          <optgroup label="Níveis da pirâmide">
            {PYRAMID_LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Tipos">
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {INCIDENT_TYPE_LABEL[t]}
              </option>
            ))}
          </optgroup>
        </Select>
        <div className="col-span-2 flex gap-2 md:col-span-1">
          <Select value={f.status} onChange={set("status")}>
            <option value="">Todos os status</option>
            <option value="abertas">Em investigação</option>
            <option value="encerradas">Encerradas</option>
            <option value="inv-aberta">Investigação aberta</option>
            <option value="inv-concluida">Investigação concluída</option>
            <option value="vencidas">Com ações vencidas</option>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setF(EMPTY_FILTERS)} title="Limpar filtros">
            <FilterX />
          </Button>
        </div>
      </div>

      {view === "lista" ? <CriticalityTable rows={sortByCriticality(rows)} /> : null}

      {view === "timeline" ? (
        byMonth.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-5">
            {byMonth.map(([month, list]) => (
              <section key={month} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <header className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold text-brand-950 first-letter:uppercase">
                    {new Date(`${month}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{list.length}</span>
                  {list.some((i) => i.hipo) ? <HipoBadge /> : null}
                  <div className="ml-auto flex h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                    {PYRAMID_LEVELS.map((l) => {
                      const n = list.filter((i) => l.types.includes(i.type)).length;
                      return n ? <span key={l.key} style={{ width: `${(n / list.length) * 100}%`, background: l.color }} title={`${l.label}: ${n}`} /> : null;
                    })}
                  </div>
                </header>
                <ol className="relative ml-2 border-l-2 border-slate-100">
                  {list.map((i) => (
                    <li key={i.id} className="relative pb-3 pl-5 last:pb-0">
                      <span
                        className={cn("absolute -left-[7px] top-3 size-3 rounded-full ring-4 ring-white", i.hipo && "animate-pulse")}
                        style={{ background: i.hipo ? "#c9281f" : TYPE_HEX[i.type] }}
                      />
                      <Link
                        href={`/incidentes/${i.id}`}
                        className={cn(
                          "block rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-soft",
                          i.hipo ? "border-critico/30 bg-critico-bg/60" : "border-slate-100 hover:border-brand-200",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold tabular-nums text-slate-700">{fmtDate(i.occurredAt)}</span>
                          <span className="font-mono">{i.number}</span>
                          <TypeBadge type={i.type} />
                          {i.hipo ? <HipoBadge /> : null}
                          <span>· {i.area}</span>
                          <span className="ml-auto">
                            <StatusChip i={i} />
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-slate-800">{i.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3">
                          <ProgressPill value={i.progress} closed={i.closed} />
                          <ActionsCell a={i.actions} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )
      ) : null}

      {view === "agenda" ? (
        <div className="space-y-2">
          <MonthCalendar
            events={[
              ...rows.map((i) => ({
                id: `o-${i.id}`,
                date: i.occurredAt,
                label: `${i.hipo ? "HIPO · " : ""}${i.number.split("-").pop()} ${i.title}`,
                title: `${i.number} — ${i.title}`,
                color: i.hipo ? "#c9281f" : TYPE_HEX[i.type],
                href: `/incidentes/${i.id}`,
              })),
              ...rows
                .filter((i) => i.meetingAt)
                .map((i) => ({
                  id: `m-${i.id}`,
                  date: i.meetingAt!,
                  label: `Reunião ${new Date(i.meetingAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
                  title: `Reunião de investigação — ${i.number}`,
                  color: "#13508a",
                  href: `/incidentes/${i.id}?etapa=investigacao`,
                })),
            ]}
          />
          <p className="text-[11px] text-slate-500">Ocorrências na cor da classificação · reuniões de investigação em azul.</p>
        </div>
      ) : null}
    </div>
  );
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">Nenhuma ocorrência encontrada.</div>;
}

export function CriticalityTable({ rows }: { rows: IncidentListItem[] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className="w-1 p-0" />
            <th className="px-3 py-3 font-medium">Número</th>
            <th className="px-3 py-3 font-medium">Data</th>
            <th className="px-3 py-3 font-medium">Área</th>
            <th className="px-3 py-3 font-medium">Descrição</th>
            <th className="px-3 py-3 font-medium">Responsável</th>
            <th className="px-3 py-3 font-medium">Classificação</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Plano de ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id} className={cn("group border-t border-slate-100 align-top hover:bg-slate-50/60", i.hipo && "bg-critico-bg/40")}>
              <td className="p-0">
                <span className={cn("block h-full min-h-14 w-1", criticalityRank(i) <= 3 ? "bg-critico" : "")} style={criticalityRank(i) > 3 ? { background: TYPE_HEX[i.type] } : undefined} />
              </td>
              <td className="px-3 py-3">
                <Link href={`/incidentes/${i.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                  {i.number}
                </Link>
                {i.spheraId ? <div className="text-[10px] text-slate-400">Sphera {i.spheraId}</div> : null}
              </td>
              <td className="px-3 py-3 tabular-nums text-slate-700">{fmtDate(i.occurredAt)}</td>
              <td className="px-3 py-3 text-slate-700">{i.area}</td>
              <td className="max-w-sm px-3 py-3">
                <Link href={`/incidentes/${i.id}`} className="font-medium text-slate-800 hover:text-brand-800">
                  {i.title}
                </Link>
                <div className="line-clamp-2 text-xs text-slate-500">{i.description}</div>
              </td>
              <td className="px-3 py-3 text-slate-700">{i.responsible?.name ?? <span className="text-slate-400">A definir</span>}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {i.hipo ? <HipoBadge /> : null}
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", TYPE_STYLE[i.type])}>{INCIDENT_TYPE_LABEL[i.type]}</span>
                </div>
              </td>
              <td className="space-y-1.5 px-3 py-3">
                <StatusChip i={i} />
                <ProgressPill value={i.progress} closed={i.closed} />
              </td>
              <td className="px-3 py-3">
                <ActionsCell a={i.actions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
