"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
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
  LayoutDashboard,
  ListChecks,
  Settings,
  Siren,
  Trophy,
};

export function Sidebar({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = ["Gestão WISE", "Auditorias", "Próximos módulos", "Administração"] as const;
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-brand-600 via-brand-700 to-brand-900 text-white">
      <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-brand-400/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 size-56 rounded-full bg-lime-500/15 blur-3xl" />
      <div className="relative px-5 pb-6 pt-6">
        <Logo light />
      </div>
      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 pb-6 scrollbar-thin">
        {groups.map((g) => {
          const items = MODULES.filter((m) => m.group === g && (!m.adminOnly || isAdmin));
          if (!items.length) return null;
          return (
            <div key={g}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{g}</p>
              <ul className="space-y-0.5">
                {items.map((m) => {
                  const Icon = ICONS[m.icon];
                  const active = m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
                  return (
                    <li key={m.slug}>
                      <Link
                        href={m.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all",
                          active
                            ? "bg-white/[0.18] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14),0_6px_16px_-8px_rgb(43_20_6/0.5)]"
                            : "text-white/80 hover:bg-white/[0.10] hover:text-white",
                        )}
                      >
                        {active ? <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-cream to-lime-500" /> : null}
                        <Icon className={cn("size-[18px] transition-colors", active ? "text-white" : "text-white/65 group-hover:text-white")} />
                        <span className="flex-1">{m.label}</span>
                        {m.status === "em-breve" ? (
                          <span className="rounded-md bg-black/[0.12] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70">
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
      <div className="relative mx-3 mb-4 rounded-2xl border border-white/15 bg-black/[0.12] p-4 backdrop-blur">
        <div className="flex gap-1">
          <span className="h-1 w-6 rounded-full bg-cream" />
          <span className="h-1 w-3 rounded-full bg-lime-500" />
          <span className="h-1 w-2 rounded-full bg-white/70" />
        </div>
        <p className="mt-2.5 font-display text-[13px] font-bold text-white">Segurança é valor e escolha.</p>
        <p className="mt-0.5 text-[11px] text-white/70">Pare · Pense · Aja</p>
      </div>
    </div>
  );
}
