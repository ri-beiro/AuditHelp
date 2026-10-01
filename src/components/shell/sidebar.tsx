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
    <div className="flex h-full flex-col bg-brand-950 text-brand-100">
      <div className="px-5 py-5">
        <Logo light />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 scrollbar-thin">
        {groups.map((g) => {
          const items = MODULES.filter((m) => m.group === g && (!m.adminOnly || isAdmin));
          if (!items.length) return null;
          return (
            <div key={g}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-100/40">{g}</p>
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
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active ? "bg-white/10 text-white" : "text-brand-100/70 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <Icon className={cn("size-4", active && "text-accent-500")} />
                        <span className="flex-1">{m.label}</span>
                        {m.status === "em-breve" ? (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-100/60">
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
      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-brand-100/50">
        Segurança é valor e escolha.
      </div>
    </div>
  );
}
