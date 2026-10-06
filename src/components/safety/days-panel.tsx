import { ShieldCheck, Trophy } from "lucide-react";
import type { SafetyStreak } from "@/lib/incidents";
import { cn, fmtDate } from "@/lib/utils";

function Digits({ value, size = "lg" }: { value: number; size?: "lg" | "sm" }) {
  const s = String(value).padStart(4, "0");
  return (
    <div className="flex gap-1">
      {s.split("").map((c, i) => (
        <span
          key={i}
          className={cn(
            "grid place-items-center rounded-md border border-white/10 bg-black/50 font-mono font-black tabular-nums shadow-[inset_0_2px_6px_rgb(0_0_0/0.6)]",
            size === "lg" ? "h-16 w-11 text-[44px] sm:h-20 sm:w-14 sm:text-[56px]" : "h-9 w-6 text-2xl",
            i < s.length - String(value).length ? "text-wgreen-400/20" : "text-wgreen-400 [text-shadow:0_0_14px_rgb(195_210_63/0.75)]",
          )}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

/** Painel "Dias sem acidentes" no estilo dos placares industriais. Atualiza a cada acesso (dia corrente). */
export function DaysWithoutAccidentsPanel({
  days,
  baseDate,
  showHistory = true,
  className,
}: {
  days: { current: number; record: number; lastAccident: string | null; history: SafetyStreak[] };
  baseDate: string;
  showHistory?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-5 text-white shadow-lift", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(255_255_255/0.025)_14px_28px)]" />
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(135deg,#ec9631_0_12px,#111_12px_24px)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
            <ShieldCheck className="size-4 text-wgreen-400" /> Dias sem acidentes
          </p>
          <div className="mt-3">
            <Digits value={days.current} />
          </div>
          <p className="mt-2 text-[11px] text-white/55">Acidentes registráveis (FAT, LTA, NLTA) zeram o contador.</p>
        </div>
        <div className="grid min-w-[150px] gap-3 text-sm">
          <div>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent-400">
              <Trophy className="size-3.5" /> Recorde
            </p>
            <div className="mt-1">
              <Digits value={days.record} size="sm" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Último acidente</p>
            <p className="font-semibold">{days.lastAccident ? fmtDate(days.lastAccident) : "Nenhum registrado"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Contagem desde</p>
            <p className="font-semibold">{fmtDate(baseDate)}</p>
          </div>
        </div>
      </div>
      {showHistory && days.history.length > 1 ? (
        <div className="relative mt-4 border-t border-white/10 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Histórico de períodos</p>
          <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {days.history.slice(0, 8).map((h) => (
              <li key={h.from} className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                <p className={cn("text-base font-black tabular-nums", h.days === days.record ? "text-accent-400" : "text-white")}>{h.days} dias</p>
                <p className="text-[10px] text-white/50">
                  {fmtDate(h.from)} → {h.to ? fmtDate(h.to) : "hoje"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
