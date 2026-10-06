import Link from "next/link";
import { Flame } from "lucide-react";
import { PYRAMID_LEVELS, type IncidentTypeKey } from "@/lib/incidents";

type Item = { type: IncidentTypeKey; occurredAt: string; hipo: boolean };

// Geometria (em % da largura): centro da pirâmide e larguras do topo e da base.
const CX = 45;
const TOP = 7;
const BASE = 50;

/**
 * Pirâmide de segurança no modelo corporativo: à esquerda o total do ano anterior (cinza claro) e do ano atual,
 * no centro o total do mês atual (caixa vermelha) e à direita o nível. Cada nível abre a lista filtrada.
 */
export function SafetyPyramid({ incidents, hrefBase = "/incidentes" }: { incidents: Item[]; hrefBase?: string }) {
  const now = new Date();
  const year = String(now.getFullYear());
  const prevYear = String(now.getFullYear() - 1);
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const n = PYRAMID_LEVELS.length;
  const width = (k: number) => TOP + ((BASE - TOP) * k) / n;
  const hipo = incidents.filter((i) => i.hipo && i.occurredAt.startsWith(year)).length;
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-full bg-slate-200" /> {prevYear}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-full bg-slate-300" /> {year}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded bg-red-600" /> Mês atual ({monthLabel})
        </span>
      </div>
      <div className="relative">
        {PYRAMID_LEVELS.map((lvl, i) => {
          const t = width(i);
          const b = width(i + 1);
          const of = (pred: (d: string) => boolean) => incidents.filter((x) => lvl.types.includes(x.type) && pred(x.occurredAt)).length;
          const prev = of((d) => d.startsWith(prevYear));
          const cur = of((d) => d.startsWith(year));
          const mon = of((d) => d.startsWith(month));
          const href = `${hrefBase}?nivel=${lvl.key}`;
          return (
            <div key={lvl.key} className="relative h-11">
              {/* faixa da pirâmide */}
              <Link
                href={href}
                title={`${lvl.label}: ${mon} no mês · ${cur} em ${year} · ${prev} em ${prevYear}`}
                className="absolute inset-y-[1.5px] left-0 right-0 transition-[filter] hover:brightness-110"
                style={{
                  background: lvl.color,
                  clipPath: `polygon(${CX - t / 2}% 0, ${CX + t / 2}% 0, ${CX + b / 2}% 100%, ${CX - b / 2}% 100%)`,
                }}
              />
              {/* totais do ano anterior e do ano atual */}
              <div className="pointer-events-none absolute inset-y-1 flex items-center" style={{ right: `calc(${100 - (CX - b / 2)}% - 6px)` }}>
                <span className="grid h-8 min-w-12 place-items-center rounded-l-full bg-slate-200/80 pl-2 pr-4 text-sm font-semibold tabular-nums text-slate-400 shadow-sm">
                  {prev}
                </span>
                <span className="-ml-3 grid h-8 min-w-11 place-items-center rounded-l-full bg-slate-100 pl-2 pr-3 text-base font-bold tabular-nums text-slate-800 shadow-sm ring-1 ring-white">
                  {cur}
                </span>
              </div>
              {/* mês atual */}
              <Link
                href={href}
                className="absolute top-1/2 grid h-7 min-w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border-2 border-white/80 bg-red-600 px-2 text-sm font-extrabold tabular-nums text-white shadow-md transition-transform hover:scale-110"
                style={{ left: `${CX}%` }}
              >
                {mon}
              </Link>
              {/* rótulo */}
              <Link
                href={href}
                className="absolute top-1/2 max-w-[30%] -translate-y-1/2 text-[10px] font-extrabold uppercase leading-tight tracking-wide text-slate-800 hover:text-brand-700 sm:text-[11px]"
                style={{ left: `calc(${CX + b / 2}% + 8px)` }}
              >
                {lvl.label}
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-xs font-semibold text-slate-700">
          <span className="underline decoration-slate-400 underline-offset-2">Near Misses</span>,{" "}
          <span className="underline decoration-slate-400 underline-offset-2">Perdas Materiais</span> e{" "}
          <span className="underline decoration-slate-400 underline-offset-2">Observações</span>
        </p>
        <Link
          href={`${hrefBase}?hipo=1`}
          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-critico to-accent-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-soft hover:opacity-90"
          title={`Ocorrências HIPO em ${year}`}
        >
          <Flame className="size-3.5" /> HIPO {year}: {hipo}
        </Link>
      </div>
    </div>
  );
}
