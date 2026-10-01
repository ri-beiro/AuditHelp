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
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-brand-900 via-brand-950 to-[#04142a] text-brand-100">
      <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 size-56 rounded-full bg-accent-500/10 blur-3xl" />
      <div className="relative px-5 pb-6 pt-6">
        <Logo light />
      </div>
      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 pb-6 scrollbar-thin">
        {groups.map((g) => {
          const items = MODULES.filter((m) => m.group === g && (!m.adminOnly || isAdmin));
          if (!items.length) return null;
          return (
            <div key={g}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200/40">{g}</p>
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
                            ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]"
                            : "text-brand-100/65 hover:bg-white/[0.05] hover:text-white",
                        )}
                      >
                        {active ? <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-accent-500 to-lime-500" /> : null}
                        <Icon className={cn("size-[18px] transition-colors", active ? "text-accent-400" : "text-brand-200/50 group-hover:text-brand-100")} />
                        <span className="flex-1">{m.label}</span>
                        {m.status === "em-breve" ? (
                          <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-200/50">
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
      <div className="relative mx-3 mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <div className="flex gap-1">
          <span className="h-1 w-6 rounded-full bg-accent-500" />
          <span className="h-1 w-3 rounded-full bg-lime-500" />
          <span className="h-1 w-2 rounded-full bg-cream" />
        </div>
        <p className="mt-2.5 font-display text-[13px] font-bold text-white">Segurança é valor e escolha.</p>
        <p className="mt-0.5 text-[11px] text-brand-200/60">Pare · Pense · Aja</p>
      </div>
    </div>
  );
}
