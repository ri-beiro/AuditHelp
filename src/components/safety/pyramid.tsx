import Link from "next/link";
import { Flame } from "lucide-react";
import { INCIDENT_TYPE_SHORT, PYRAMID_LEVELS, type IncidentTypeKey } from "@/lib/incidents";

/** Pirâmide de Heinrich/Bird: cada nível abre a lista filtrada; o HIPO fica destacado no centro. */
export function SafetyPyramid({
  counts,
  hipo,
  hrefBase = "/incidentes",
}: {
  counts: Record<IncidentTypeKey, number>;
  hipo: number;
  hrefBase?: string;
}) {
  const n = PYRAMID_LEVELS.length;
  const minTop = 0.14;
  const width = (i: number) => minTop + ((1 - minTop) * i) / n;
  return (
    <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-stretch gap-x-4">
      <div className="relative">
        {PYRAMID_LEVELS.map((lvl, i) => {
          const top = width(i) * 100;
          const bot = width(i + 1) * 100;
          const total = lvl.types.reduce((s, t) => s + (counts[t] ?? 0), 0);
          return (
            <Link
              key={lvl.key}
              href={`${hrefBase}?nivel=${lvl.key}`}
              className="group relative block h-12 transition-transform hover:scale-[1.03]"
              title={`${lvl.label}: ${total}`}
            >
              <span
                className="absolute inset-x-0 inset-y-[2px] grid place-items-center text-lg font-extrabold tabular-nums text-white drop-shadow transition-[filter] group-hover:brightness-110"
                style={{
                  background: `linear-gradient(180deg, ${lvl.color}, ${lvl.color}dd)`,
                  clipPath: `polygon(${50 - top / 2}% 0, ${50 + top / 2}% 0, ${50 + bot / 2}% 100%, ${50 - bot / 2}% 100%)`,
                }}
              >
                {i === 2 ? null : total}
              </span>
            </Link>
          );
        })}
        <Link
          href={`${hrefBase}?hipo=1`}
          className="absolute left-1/2 top-[calc(2*3rem+1.5rem)] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl bg-gradient-to-br from-critico to-accent-600 px-3 py-1.5 text-white shadow-lift ring-4 ring-white transition-transform hover:scale-105"
          title="Ocorrências de alto potencial (HIPO)"
        >
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest">
            <Flame className="size-3" /> HIPO
          </span>
          <span className="text-xl font-black leading-none tabular-nums">{hipo}</span>
        </Link>
      </div>
      <ul className="flex flex-col">
        {PYRAMID_LEVELS.map((lvl, i) => {
          const total = lvl.types.reduce((s, t) => s + (counts[t] ?? 0), 0);
          return (
            <li key={lvl.key} className="flex h-12 items-center">
              <Link href={`${hrefBase}?nivel=${lvl.key}`} className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: lvl.color }} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-slate-800 group-hover:text-brand-800">
                    {lvl.label}
                    {i === 2 ? <span className="ml-1 tabular-nums text-slate-500">· {total}</span> : null}
                  </span>
                  {lvl.types.length > 1 ? (
                    <span className="block truncate text-[10.5px] text-slate-500">
                      {lvl.types.map((t) => `${INCIDENT_TYPE_SHORT[t]} ${counts[t] ?? 0}`).join(" · ")}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
