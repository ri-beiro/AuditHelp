"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SafetyOverview } from "@/server/incident-queries";
import { PYRAMID_LEVELS } from "@/lib/incidents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SafetyPyramid } from "./pyramid";
import { DaysWithoutAccidentsPanel } from "./days-panel";
import { IncidentExplorer } from "./incident-explorer";

const INK = { secondary: "#475569", grid: "#e2e8f0" };

/** Aba "Segurança" dos indicadores: pirâmide, dias sem acidentes, evolução mensal, áreas e linha do tempo. */
export function SafetyIndicators({ overview, audits }: { overview: SafetyOverview; audits: { year: string; value: number; n: number }[] }) {
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
            <SafetyPyramid incidents={overview.incidents} />
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
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Histórico de auditorias</CardTitle>
              <CardDescription>Nota média por ano (% da nota máxima).</CardDescription>
            </div>
            <Link href="/auditorias/historico" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              Ver histórico <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="h-72">
            {audits.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={audits} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={INK.grid} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: INK.secondary }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgb(19 80 138 / 0.06)" }}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    formatter={(v, _n, item) => [`${String(v).replace(".", ",")}% · ${(item.payload as { n: number }).n} auditoria(s)`, "Média"]}
                  />
                  <Bar dataKey="value" fill="#1a64a8" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    <LabelList dataKey="value" position="top" formatter={(v) => String(v).replace(".", ",")} style={{ fontSize: 11, fontWeight: 700, fill: "#0f172a" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-slate-400">Nenhuma auditoria registrada.</p>
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
