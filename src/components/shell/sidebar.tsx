"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  GitBranch,
  History,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Settings,
  Siren,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  GitBranch,
  History,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Settings,
  Siren,
  Trophy,
};

export function Sidebar({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = ["Gestão WISE", "Segurança", "Auditorias", "Próximos módulos", "Administração"] as const;
  // O item ativo é o de rota mais específica (ex.: /auditorias/historico não ativa /auditorias).
  const activeHref = MODULES.filter((m) => (m.href === "/" ? pathname === "/" : pathname === m.href || pathname.startsWith(m.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-brand-800 via-brand-900 to-brand-950 text-white">
      <div className="wise-stripe absolute inset-x-0 top-0 h-1" />
      <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-1/2 size-48 rounded-full bg-wgreen-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 size-56 rounded-full bg-accent-500/20 blur-3xl" />
      <div className="relative px-5 pb-6 pt-6">
        <Logo light />
      </div>
      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 pb-6 scrollbar-thin">
        {groups.map((g) => {
          const items = MODULES.filter((m) => m.group === g && (!m.adminOnly || isAdmin));
          if (!items.length) return null;
          return (
            <div key={g}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{g}</p>
              <ul className="space-y-0.5">
                {items.map((m) => {
                  const Icon = ICONS[m.icon];
                  const active = m.href === activeHref;
                  return (
                    <li key={m.slug}>
                      <Link
                        href={m.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all",
                          active
                            ? "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.10),0_6px_16px_-8px_rgb(0_0_0/0.5)]"
                            : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                        )}
                      >
                        {active ? <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-500 via-wgreen-400 to-accent-500" /> : null}
                        <Icon className={cn("size-[18px] transition-colors", active ? "text-wgreen-400" : "text-white/55 group-hover:text-white")} />
                        <span className="flex-1">{m.label}</span>
                        {m.status === "em-breve" ? (
                          <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70">
                            Em breve
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="relative mx-3 mb-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
        <div className="flex gap-1">
          <span className="h-1 w-6 rounded-full bg-brand-500" />
          <span className="h-1 w-4 rounded-full bg-wgreen-400" />
          <span className="h-1 w-3 rounded-full bg-accent-500" />
        </div>
        <p className="mt-2.5 font-display text-[13px] font-bold text-white">Segurança é valor e escolha.</p>
        <p className="mt-0.5 text-[11px] text-white/70">Pare · Pense · Aja</p>
      </div>
    </div>
  );
}
