"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, Search, Share2, ShieldAlert, Sparkles, Target } from "lucide-react";
import { INCIDENT_TYPE_LABEL, INCIDENT_TYPES, type IncidentTypeKey } from "@/lib/incidents";
import { cn, fmtDate } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";
import { HipoBadge, TypeBadge } from "./bits";

type Lesson = {
  id: string;
  number: string;
  unit: string;
  occurredAt: string;
  area: string;
  type: IncidentTypeKey;
  hipo: boolean;
  title: string;
  whatHappened: string;
  rootCause: string;
  howToPrevent: string;
  goodPractices: string;
  sharedWith: string;
  approvedBy: string | null;
  approvedAt: string;
};

export function LessonsBrowser({ lessons, initialQuery, currentUnit }: { lessons: Lesson[]; initialQuery: string; currentUnit: string }) {
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState("");
  const [unit, setUnit] = useState("");
  const [area, setArea] = useState("");
  const units = [...new Set(lessons.map((l) => l.unit))].sort();
  const areas = [...new Set(lessons.map((l) => l.area))].sort();
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = lessons.filter((l) => {
    const text = `${l.number} ${l.title} ${l.area} ${l.whatHappened} ${l.rootCause} ${l.howToPrevent} ${l.goodPractices}`.toLowerCase();
    return terms.every((t) => text.includes(t)) && (!type || (type === "HIPO" ? l.hipo : l.type === type)) && (!unit || l.unit === unit) && (!area || l.area === area);
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Pesquisar causa raiz, área, equipamento, palavra-chave…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todas as classificações</option>
          <option value="HIPO">Somente HIPO</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {INCIDENT_TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="">Todas as unidades</option>
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
        <Select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-slate-500">{rows.length} lição(ões) encontrada(s)</p>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          <Lightbulb className="mx-auto mb-2 size-8 text-slate-300" />
          Nenhuma lição aprovada ainda. Elas aparecem aqui quando a etapa 4 da investigação é aprovada.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((l) => (
            <article key={l.id} className={cn("flex flex-col rounded-2xl border bg-white p-5 shadow-soft transition-all hover:shadow-lift", l.hipo ? "border-critico/30" : "border-slate-200")}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <TypeBadge type={l.type} />
                {l.hipo ? <HipoBadge /> : null}
                <span>{fmtDate(l.occurredAt)}</span>
                <span>· {l.area}</span>
                {l.unit !== currentUnit ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{l.unit}</span> : null}
              </div>
              <h3 className="mt-2 font-display text-base font-bold text-brand-950">{l.title}</h3>
              <dl className="mt-3 space-y-2.5 text-sm">
                {[
                  { icon: ShieldAlert, label: "O que aconteceu", v: l.whatHappened, cls: "text-slate-500" },
                  { icon: Target, label: "Causa raiz", v: l.rootCause, cls: "text-critico" },
                  { icon: Lightbulb, label: "O que poderia ter evitado", v: l.howToPrevent, cls: "text-accent-600" },
                  { icon: Sparkles, label: "Boas práticas", v: l.goodPractices, cls: "text-wgreen-600" },
                ]
                  .filter((x) => x.v)
                  .map((x) => (
                    <div key={x.label} className="flex gap-2">
                      <x.icon className={cn("mt-0.5 size-4 shrink-0", x.cls)} />
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{x.label}</dt>
                        <dd className="whitespace-pre-line text-slate-700">{x.v}</dd>
                      </div>
                    </div>
                  ))}
              </dl>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Share2 className="size-3.5" /> {l.sharedWith || "Compartilhamento não informado"}
                </span>
                <span>
                  Aprovada por {l.approvedBy ?? "—"} · {fmtDate(l.approvedAt)}
                </span>
                <Link href={`/incidentes/${l.id}?etapa=licoes`} className="font-semibold text-brand-700 hover:underline">
                  {l.number} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
