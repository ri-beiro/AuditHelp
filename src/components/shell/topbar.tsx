"use client";

import { useTransition, useState } from "react";
import { Building2, CalendarRange, LogOut, Menu } from "lucide-react";
import { selectCycle, selectUnit, logoutAction } from "@/server/actions";
import { ROLE_LABEL } from "@/lib/utils";
import { GlobalSearch } from "./global-search";
import { Sidebar } from "./sidebar";

type Props = {
  units: { id: string; name: string }[];
  unitId: string | null;
  cycles: string[];
  cycle: string;
  user: { name: string; role: string };
};

export function Topbar({ units, unitId, cycles, cycle, user }: Props) {
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-30 flex print:hidden h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
        <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenu(true)} aria-label="Menu">
          <Menu className="size-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white pl-2.5 text-sm">
            <Building2 className="size-4 text-brand-700" />
            <select
              aria-label="Unidade"
              className="h-9 max-w-44 bg-transparent pr-2 font-medium text-slate-800 outline-none"
              value={unitId ?? ""}
              disabled={pending || units.length === 0}
              onChange={(e) => start(() => selectUnit(e.target.value))}
            >
              {units.length === 0 ? <option value="">Sem unidade</option> : null}
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white pl-2.5 text-sm sm:flex">
            <CalendarRange className="size-4 text-brand-700" />
            <select
              aria-label="Ciclo"
              className="h-9 bg-transparent pr-2 font-medium text-slate-800 outline-none"
              value={cycle}
              disabled={pending}
              onChange={(e) => start(() => selectCycle(e.target.value))}
            >
              {[...new Set([...cycles, cycle, String(new Date().getFullYear() + 1)])]
                .sort()
                .reverse()
                .map((c) => (
                  <option key={c} value={c}>
                    Ciclo {c}
                  </option>
                ))}
            </select>
          </div>
          <div className="ml-auto w-full max-w-md">
            <GlobalSearch />
          </div>
        </div>
        <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 md:flex">
          <div className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
            {user.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-800">{user.name}</div>
            <div className="text-[11px] text-slate-500">{ROLE_LABEL[user.role]}</div>
          </div>
          <form action={logoutAction}>
            <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Sair">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>
      {menu ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-in">
            <Sidebar isAdmin={user.role === "ADMIN"} onNavigate={() => setMenu(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
