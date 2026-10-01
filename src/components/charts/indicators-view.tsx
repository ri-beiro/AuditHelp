"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Gauge, ListTodo, ShieldAlert, XCircle } from "lucide-react";
import type { FrameworkOverview } from "@/server/queries";
import type { Tone } from "@/lib/scoring";
import { ACTION_STATUS_LABEL, cn, fmtPct, fmtScore, TONE_HEX, TONE_LABEL } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kpi } from "@/components/dashboard/kpi";
import { GradeBadge } from "@/components/grade-badge";

// Séries categóricas validadas (scripts/validate_palette.js do guia de dataviz)
// Laranja WISE (cobre) e azul de apoio — par validado para daltonismo e contraste.
const SERIES = { wise: "#cc7a2a", basics: "#1a64a8" };
const INK = { primary: "#0f172a", secondary: "#475569", muted: "#94a3b8", grid: "#e2e8f0" };

type Props = {
  unitName: string;
  cycle: string;
  wise: FrameworkOverview;
  basics: FrameworkOverview;
  evolution: { month: string; wise: number | null; basics: number | null }[];
  actionsByStatus: Record<string, number>;
};

const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name: string; value: number | null; color?: string; payload?: Record<string, unknown> }[];
  label?: string;
  format: (v: number | null, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label ? <div className="mb-1 font-semibold text-slate-800">{label}</div> : null}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">{format(p.value, p.name)}</span>
        </div>
      ))}
    </div>
  );
}

export function IndicatorsView({ unitName, cycle, wise, basics, evolution, actionsByStatus }: Props) {
  const [fw, setFw] = useState<"wise" | "basicos">("wise");
  const ov = fw === "wise" ? wise : basics;
  const isWise = fw === "wise";

  const radarData = ov.elements.map((e) => ({
    name: `${isWise ? "E" : "B"}${e.number}`,
    full: e.shortName,
    value: isWise ? (e.score ?? 0) : Math.round((e.pct ?? 0) * 100),
  }));
  const barData = ov.elements.map((e) => ({
    name: `${isWise ? "E" : "B"}${e.number} ${e.shortName}`,
    value: isWise ? (e.score ?? 0) : Math.round((e.pct ?? 0) * 100),
    tone: e.tone,
    label: isWise ? fmtScore(e.score) : fmtPct(e.pct),
  }));
  const pillarData = ov.pillars.map((p) => ({
    name: p.name,
    critico: p.tones.critico,
    atencao: p.tones.atencao,
    conforme: p.tones.conforme,
    neutro: p.tones.neutro,
    score: isWise ? fmtScore(p.score) : fmtPct(p.pct),
  }));
  const evoData = evolution.map((e) => ({
    month: monthLabel(e.month),
    "WISE (% de 65)": e.wise === null ? null : Math.round(e.wise * 1000) / 10,
    "12 Básicos": e.basics === null ? null : Math.round(e.basics * 1000) / 10,
  }));
  const hasEvolution = evolution.some((e) => e.wise !== null || e.basics !== null);
  const totalActions = Object.values(actionsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Indicadores · Ciclo {cycle}</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">{unitName}</h1>
        </div>
        <Tabs value={fw} onValueChange={(v) => setFw(v as "wise" | "basicos")}>
          <TabsList>
            <TabsTrigger value="wise">13 Elementos WISE</TabsTrigger>
            <TabsTrigger value="basicos">12 Básicos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          icon={Gauge}
          label={isWise ? "Score geral WISE" : "Compliance 12 Básicos"}
          value={
            isWise ? (
              <>
                {fmtScore(wise.overall.score)}
                <span className="ml-1 text-sm font-semibold text-slate-400">/ 65</span>
              </>
            ) : (
              fmtPct(basics.overall.pct)
            )
          }
          hint={
            isWise
              ? `Classe ${wise.overall.grade ?? "–"} · ${wise.overall.stage}`
              : `Classe ${basics.overall.grade ?? "–"} · risco nível 1: ${fmtPct(basics.overall.level1Pct)}`
          }
        />
        <Kpi icon={CheckCircle2} label="Itens conformes" value={ov.totals.conformes} accent="bg-conforme-bg text-conforme" hint={`${ov.totals.answered}/${ov.totals.total} avaliados`} />
        <Kpi icon={XCircle} label="Desvios" value={ov.totals.desvios} accent="bg-critico-bg text-critico" />
        <Kpi
          icon={ListTodo}
          label="Ações pendentes"
          value={ov.totals.pendingActions}
          accent="bg-atencao-bg text-atencao-ink"
          hint={`${ov.totals.overdueActions} em atraso`}
        />
        <Kpi icon={ShieldAlert} label="Elementos críticos" value={ov.totals.criticalElements} accent="bg-critico-bg text-critico" />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Radar por elemento</CardTitle>
            <CardDescription>{isWise ? "Nota de 0 a 5 (curva de Bradley)" : "Atendimento de 0% a 100%"}</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={INK.grid} />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: INK.secondary }} />
                <PolarRadiusAxis
                  domain={[0, isWise ? 5 : 100]}
                  tickCount={6}
                  tick={{ fontSize: 10, fill: INK.muted }}
                  axisLine={false}
                />
                <Radar
                  name={isWise ? "Nota" : "Atendimento %"}
                  dataKey="value"
                  stroke={SERIES.wise}
                  strokeWidth={2}
                  fill={SERIES.wise}
                  fillOpacity={0.18}
                  dot={{ r: 4, fill: SERIES.wise, stroke: "#fff", strokeWidth: 2 }}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                        <div className="font-semibold text-slate-800">{payload[0].payload.full}</div>
                        <div className="text-slate-600">
                          {isWise ? `Nota ${fmtScore(payload[0].value as number)}` : `${payload[0].value}%`}
                        </div>
                      </div>
                    ) : null
                  }
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pontuação por elemento</CardTitle>
            <CardDescription>Cor indica a situação: crítico, atenção ou conforme</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 48 }} barCategoryGap={4}>
                <CartesianGrid horizontal={false} stroke={INK.grid} />
                <XAxis
                  type="number"
                  domain={[0, isWise ? 5 : 100]}
                  ticks={isWise ? [0, 1, 2, 3, 4, 5] : [0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: INK.muted }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={190}
                  tick={{ fontSize: 11, fill: INK.secondary }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                        <div className="font-semibold text-slate-800">{payload[0].payload.name}</div>
                        <div className="text-slate-600">
                          {payload[0].payload.label} · {TONE_LABEL[payload[0].payload.tone as Tone]}
                        </div>
                      </div>
                    ) : null
                  }
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                  shape={(p: unknown) => {
                    const { x, y, width, height, payload } = p as {
                      x: number;
                      y: number;
                      width: number;
                      height: number;
                      payload: { tone: Tone };
                    };
                    const w = Math.max(width, 0);
                    const r = Math.min(4, w / 2, height / 2);
                    return (
                      <path
                        d={`M${x},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${height - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} z`}
                        fill={TONE_HEX[payload.tone]}
                      />
                    );
                  }}
                >
                  <LabelList dataKey="label" position="right" style={{ fontSize: 11, fill: INK.primary, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução mensal</CardTitle>
            <CardDescription>
              Percentual de atendimento no fechamento de cada mês (registrado automaticamente a cada avaliação)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {hasEvolution ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evoData} margin={{ top: 16, right: 24, left: -8 }}>
                  <CartesianGrid vertical={false} stroke={INK.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: INK.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: INK.muted, strokeDasharray: "3 3" }}
                    content={(p) => (
                      <ChartTooltip
                        {...(p as object)}
                        format={(v) => (v === null || v === undefined ? "—" : `${v.toLocaleString("pt-BR")}%`)}
                      />
                    )}
                  />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: INK.secondary }}>{v}</span>} />
                  <Line
                    type="monotone"
                    dataKey="WISE (% de 65)"
                    stroke={SERIES.wise}
                    strokeWidth={2}
                    dot={{ r: 4, fill: SERIES.wise, stroke: "#fff", strokeWidth: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="12 Básicos"
                    stroke={SERIES.basics}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 4, fill: SERIES.basics, stroke: "#fff", strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-500">
                A evolução aparece assim que as primeiras avaliações forem registradas.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status por pilar</CardTitle>
            <CardDescription>Quantidade de elementos em cada situação</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pillarData} layout="vertical" margin={{ left: 8, right: 56 }} barCategoryGap={14}>
                <CartesianGrid horizontal={false} stroke={INK.grid} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 11, fill: INK.secondary }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  content={(p) => <ChartTooltip {...(p as object)} format={(v) => `${v ?? 0} elemento(s)`} />}
                />
                <Legend
                  content={() => (
                    <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs" style={{ color: INK.secondary }}>
                      {(["critico", "atencao", "conforme", "neutro"] as Tone[]).map((t) => (
                        <span key={t} className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full" style={{ background: TONE_HEX[t] }} />
                          {TONE_LABEL[t]}
                        </span>
                      ))}
                    </div>
                  )}
                />
                {(["critico", "atencao", "conforme", "neutro"] as Tone[]).map((t, i, arr) => (
                  <Bar
                    key={t}
                    dataKey={t}
                    name={TONE_LABEL[t]}
                    stackId="s"
                    fill={TONE_HEX[t]}
                    stroke="#fff"
                    strokeWidth={2}
                    radius={i === arr.length - 1 ? [0, 4, 4, 0] : 0}
                  >
                    {i === arr.length - 1 ? (
                      <LabelList dataKey="score" position="right" style={{ fontSize: 11, fill: INK.primary, fontWeight: 600 }} />
                    ) : null}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tabela de pontuação</CardTitle>
            <CardDescription>Visão tabular dos mesmos dados dos gráficos</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3 font-medium">Elemento</th>
                  <th className="py-2 pr-3 font-medium">Pilar</th>
                  <th className="py-2 pr-3 text-right font-medium">{isWise ? "Nota" : "Atendimento"}</th>
                  <th className="py-2 pr-3 text-right font-medium">Avaliados</th>
                  <th className="py-2 pr-3 text-right font-medium">Desvios</th>
                  <th className="py-2 pr-3 font-medium">Classe</th>
                  <th className="py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {ov.elements.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {e.code} · {e.shortName}
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{e.pillar.name}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{isWise ? fmtScore(e.score) : fmtPct(e.pct)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">
                      {e.answered}/{e.total}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{e.desvios}</td>
                    <td className="py-2 pr-3">
                      <GradeBadge grade={e.grade} size="sm" />
                    </td>
                    <td className="py-2">
                      <span className="flex items-center gap-1.5 text-xs text-slate-700">
                        <span className="size-2 rounded-full" style={{ background: TONE_HEX[e.tone] }} />
                        {TONE_LABEL[e.tone]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Planos de ação da unidade</CardTitle>
            <CardDescription>{totalActions} plano(s) cadastrado(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(ACTION_STATUS_LABEL).map(([k, label]) => {
              const n = actionsByStatus[k] ?? 0;
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{label}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{n}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full", k === "CONCLUIDA" ? "bg-conforme" : k === "CANCELADA" ? "bg-slate-300" : "bg-brand-600")}
                      style={{ width: `${totalActions ? (n / totalActions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
