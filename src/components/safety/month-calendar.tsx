"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarEvent = { id: string; date: string; label: string; color: string; href?: string; title?: string };

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Calendário mensal simples com eventos por dia (ocorrências, reuniões de investigação…). */
export function MonthCalendar({
  events,
  initialDate,
  selected,
  onSelectDay,
  compact,
}: {
  events: CalendarEvent[];
  initialDate?: string | null;
  selected?: string | null;
  onSelectDay?: (day: string) => void;
  compact?: boolean;
}) {
  const start = initialDate ? new Date(initialDate) : new Date();
  const [cursor, setCursor] = useState(new Date(start.getFullYear(), start.getMonth(), 1));
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const days: Date[] = [];
  for (let i = -first.getDay(); days.length < 42; i++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), 1 + i));
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const k = key(new Date(e.date));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const today = key(new Date());
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => shift(-1)} aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-display text-sm font-bold text-brand-950 first-letter:uppercase">
          {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => shift(1)} aria-label="Próximo mês">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {WEEK.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = key(d);
          const list = byDay.get(k) ?? [];
          const out = d.getMonth() !== cursor.getMonth();
          return (
            <div
              key={k}
              role={onSelectDay ? "button" : undefined}
              onClick={onSelectDay ? () => onSelectDay(k) : undefined}
              className={cn(
                "flex flex-col rounded-lg border p-1 text-left transition-colors",
                compact ? "min-h-11" : "min-h-20",
                out ? "border-transparent bg-slate-50/50 text-slate-300" : "border-slate-100 text-slate-700",
                onSelectDay && "cursor-pointer hover:border-brand-200 hover:bg-brand-50/40",
                selected === k && "border-brand-500 bg-brand-50 ring-1 ring-brand-500",
              )}
            >
              <span className={cn("text-[11px] font-semibold tabular-nums", k === today && "grid size-5 place-items-center rounded-full bg-brand-700 text-white")}>
                {d.getDate()}
              </span>
              {compact ? (
                <div className="mt-auto flex flex-wrap gap-0.5">
                  {list.map((e) => (
                    <span key={e.id} className="size-1.5 rounded-full" style={{ background: e.color }} title={e.title ?? e.label} />
                  ))}
                </div>
              ) : (
                <div className="mt-0.5 space-y-0.5">
                  {list.slice(0, 3).map((e) => {
                    const pill = (
                      <span
                        className="block truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                        style={{ background: e.color }}
                        title={e.title ?? e.label}
                      >
                        {e.label}
                      </span>
                    );
                    return e.href ? (
                      <Link key={e.id} href={e.href} onClick={(ev) => ev.stopPropagation()} className="block hover:opacity-85">
                        {pill}
                      </Link>
                    ) : (
                      <div key={e.id}>{pill}</div>
                    );
                  })}
                  {list.length > 3 ? <span className="block text-[10px] text-slate-400">+{list.length - 3}</span> : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
