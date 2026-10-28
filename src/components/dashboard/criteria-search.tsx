"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  code: string;
  framework: "WISE" | "BASICS";
  element: { code: string; number: number; shortName: string };
  matches: { label: string; text: string }[];
};
type Response = { total: number; counts: Record<string, number>; results: Result[] };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Pesquisa por palavra-chave nos critérios dos níveis de todos os elementos (WISE e Básicos).
 * Os resultados aparecem agrupados por elemento; clicar abre o elemento já no requisito.
 */
export function CriteriaSearch({
  onOpen,
  onCounts,
}: {
  onOpen: (r: Result) => void;
  onCounts: (counts: Record<string, number> | null) => void;
}) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<"all" | "WISE" | "BASICS">("all");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      onCounts(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/matriz-busca?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: Response) => {
          setData(d);
          onCounts(d.counts);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const terms = useMemo(() => norm(q.trim()).split(/\s+/).filter((t) => t.length > 0), [q]);

  const groups = useMemo(() => {
    const map = new Map<string, { element: Result["element"]; framework: Result["framework"]; items: Result[] }>();
    for (const r of data?.results ?? []) {
      if (scope !== "all" && r.framework !== scope) continue;
      const g = map.get(r.element.code) ?? { element: r.element, framework: r.framework, items: [] };
      g.items.push(r);
      map.set(r.element.code, g);
    }
    return [...map.values()];
  }, [data, scope]);

  const wiseCount = data?.results.filter((r) => r.framework === "WISE").length ?? 0;
  const basicsCount = (data?.results.length ?? 0) - wiseCount;
  const active = q.trim().length >= 2;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      <div className="flex items-center gap-3 p-2 pl-4">
        {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-brand-600" /> : <Search className="size-4 shrink-0 text-brand-600" />}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQ("")}
          placeholder="Pesquisar palavra-chave nos critérios dos níveis (WISE e Básicos)… ex.: empilhadeira, LOTO, EPI"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        {active ? (
          <button onClick={() => setQ("")} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Limpar pesquisa">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {active && data ? (
        <div className="border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs text-slate-500">
            <span>
              <b className="text-slate-800">{data.total}</b> {data.total === 1 ? "requisito encontrado" : "requisitos encontrados"} em{" "}
              <b className="text-slate-800">{Object.keys(data.counts).length}</b> elementos
            </span>
            <span className="ml-auto flex gap-1">
              {(
                [
                  ["all", `Todos (${data.total})`],
                  ["WISE", `WISE (${wiseCount})`],
                  ["BASICS", `Básicos (${basicsCount})`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setScope(k)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-semibold transition",
                    scope === k ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </span>
          </div>
          {groups.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-slate-500">Nenhum critério contém “{q.trim()}”.</p>
          ) : (
            <div className="scrollbar-thin max-h-[460px] space-y-3 overflow-y-auto px-4 pb-4">
              {groups.map((g) => (
                <div key={g.element.code}>
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-white py-1.5">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        g.framework === "WISE" ? "bg-brand-50 text-brand-700" : "bg-accent-50 text-accent-700",
                      )}
                    >
                      {g.framework === "WISE" ? "WISE" : "Básico"}
                    </span>
                    <span className="text-sm font-bold text-brand-950">
                      {g.element.code} · {g.element.shortName}
                    </span>
                    <span className="text-xs text-slate-400">
                      {g.items.length} {g.items.length === 1 ? "requisito" : "requisitos"}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {g.items.map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => onOpen(r)}
                          className="group flex w-full items-start gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left transition hover:border-brand-200 hover:bg-brand-50/40"
                        >
                          <span className="mt-0.5 w-16 shrink-0 font-mono text-[11px] font-semibold text-slate-400">{r.code}</span>
                          <span className="min-w-0 flex-1 space-y-1">
                            {r.matches.map((m, i) => (
                              <span key={i} className="block text-[13px] leading-snug text-slate-700">
                                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-px text-[10.5px] font-semibold text-slate-500">{m.label}</span>
                                <Highlight text={snippet(m.text, terms)} terms={terms} />
                              </span>
                            ))}
                          </span>
                          <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-300 group-hover:text-brand-600" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {data.total > data.results.length ? (
                <p className="text-center text-xs text-slate-400">Mostrando os primeiros {data.results.length}. Refine a pesquisa para ver mais.</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Mapeia cada caractere do texto para sua forma sem acento, preservando as posições. */
function normalized(text: string) {
  let s = "";
  const pos: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const n = norm(text[i]);
    for (let j = 0; j < n.length; j++) {
      s += n[j];
      pos.push(i);
    }
  }
  return { s, pos };
}

function ranges(text: string, terms: string[]) {
  const { s, pos } = normalized(text);
  const out: [number, number][] = [];
  for (const t of terms) {
    let from = 0;
    for (;;) {
      const i = s.indexOf(t, from);
      if (i < 0) break;
      out.push([pos[i], pos[i + t.length - 1] + 1]);
      from = i + t.length;
    }
  }
  out.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

/** Recorta textos longos em volta da primeira ocorrência. */
function snippet(text: string, terms: string[], max = 220) {
  if (text.length <= max) return text;
  const first = ranges(text, terms)[0]?.[0] ?? 0;
  let start = Math.max(0, first - 70);
  // Começa e termina em limite de palavra.
  if (start > 0) start = text.indexOf(" ", start) + 1 || start;
  let end = Math.min(text.length, start + max);
  if (end < text.length) end = text.lastIndexOf(" ", end) > first ? text.lastIndexOf(" ", end) : end;
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const rs = ranges(text, terms);
  if (!rs.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  rs.forEach(([a, b], i) => {
    if (a > at) parts.push(text.slice(at, a));
    parts.push(
      <mark key={i} className="rounded bg-amber-200/80 px-0.5 font-semibold text-slate-900">
        {text.slice(a, b)}
      </mark>,
    );
    at = b;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
