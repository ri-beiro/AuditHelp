"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SafetyOverview } from "@/server/incident-queries";
import { PYRAMID_LEVELS } from "@/lib/incidents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SafetyPyramid } from "./pyramid";
import { DaysWithoutAccidentsPanel } from "./days-panel";
import { IncidentExplorer } from "./incident-explorer";

const INK = { secondary: "#475569", grid: "#e2e8f0" };

/** Aba "Segurança" dos indicadores: pirâmide, dias sem acidentes, evolução mensal, áreas e linha do tempo. */
export function SafetyIndicators({ overview }: { overview: SafetyOverview }) {
  const { incidents } = overview;
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthly = months.map((m) => {
    const list = incidents.filter((i) => i.occurredAt.slice(0, 7) === m);
    const [y, mm] = m.split("-");
    return {
      month: new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      ...Object.fromEntries(PYRAMID_LEVELS.map((l) => [l.label, list.filter((i) => l.types.includes(i.type)).length])),
      HIPO: list.filter((i) => i.hipo).length,
    };
  });
  const areaMap = new Map<string, number>();
  for (const i of incidents) areaMap.set(i.area, (areaMap.get(i.area) ?? 0) + 1);
  const byArea = [...areaMap.entries()]
    .map(([area, n]) => ({ area, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);
  const closed = incidents.filter((i) => i.closed).length;
  const actions = incidents.reduce(
    (s, i) => ({ total: s.total + i.actions.total, open: s.open + i.actions.open, overdue: s.overdue + i.actions.overdue }),
    { total: 0, open: 0, overdue: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pirâmide de segurança (Heinrich / Bird)</CardTitle>
            <CardDescription>Quantidade por nível, atualizada a cada registro. Clique para abrir as ocorrências.</CardDescription>
          </CardHeader>
          <CardContent>
            <SafetyPyramid counts={overview.counts} hipo={overview.hipo} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <DaysWithoutAccidentsPanel days={overview.days} baseDate={overview.unit.safetyStartDate} />
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: "Investigações encerradas", v: `${closed}/${incidents.length}` },
              { l: "Ações abertas", v: actions.open },
              { l: "Ações vencidas", v: actions.overdue, red: actions.overdue > 0 },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
                <p className={`text-xl font-extrabold tabular-nums ${k.red ? "text-critico" : "text-brand-950"}`}>{k.v}</p>
                <p className="text-[11px] font-medium text-slate-500">{k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências por mês</CardTitle>
            <CardDescription>Últimos 12 meses por nível da pirâmide.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={INK.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgb(19 80 138 / 0.06)" }} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                {PYRAMID_LEVELS.map((l, idx) => (
                  <Bar key={l.key} dataKey={l.label} stackId="a" fill={l.color} radius={idx === PYRAMID_LEVELS.length - 1 ? [4, 4, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências por área</CardTitle>
            <CardDescription>As 10 áreas com mais registros.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {byArea.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byArea} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="area" width={130} tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgb(19 80 138 / 0.06)" }} contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v) => [v, "Ocorrências"]} />
                  <Bar dataKey="n" fill="#1a64a8" radius={[0, 4, 4, 0]} barSize={14}>
                    <LabelList dataKey="n" position="right" style={{ fontSize: 11, fill: INK.secondary, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-slate-400">Sem ocorrências registradas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-brand-950">Linha do tempo e criticidade</h2>
        <IncidentExplorer incidents={incidents} initialView="timeline" />
      </div>
    </div>
  );
}
