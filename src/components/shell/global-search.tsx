"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = { type: string; title: string; subtitle: string; href: string };

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = await res.json();
        setResults(json.results ?? []);
        setActive(0);
      } catch {
        /* ignorado: requisição cancelada */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (r: Result) => {
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          if (e.key === "Enter" && results[active]) go(results[active]);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Buscar elementos, requisitos, evidências, ações…"
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-400 sm:block">
        Ctrl K
      </kbd>
      {open && q.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl scrollbar-thin">
          {loading && !results.length ? (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">Nenhum resultado para “{q}”.</div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.href}-${i}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left",
                  i === active ? "bg-brand-50" : "hover:bg-slate-50",
                )}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                    {r.type}
                  </span>
                  <span className="truncate text-sm font-medium text-slate-800">{r.title}</span>
                </span>
                <span className="line-clamp-1 text-xs text-slate-500">{r.subtitle}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
