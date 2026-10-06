import Link from "next/link";
import { BarChart3, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Alterna entre os indicadores WISE/Básicos e os indicadores de segurança. */
export function IndicatorTabs({ active, unitName }: { active: "wise" | "seguranca"; unitName: string }) {
  const tabs = [
    { key: "wise", href: "/indicadores", label: "WISE & 12 Básicos", icon: BarChart3 },
    { key: "seguranca", href: "/indicadores?aba=seguranca", label: "Segurança · Ocorrências", icon: ShieldAlert },
  ] as const;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="inline-flex items-center gap-1 rounded-xl border border-slate-200/70 bg-white/70 p-1 shadow-soft backdrop-blur">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all [&_svg]:size-4",
              active === t.key ? "bg-brand-700 text-white shadow-soft" : "text-slate-500 hover:text-brand-800",
            )}
          >
            <t.icon /> {t.label}
          </Link>
        ))}
      </nav>
      {active === "seguranca" ? <p className="text-sm font-semibold text-slate-500">{unitName}</p> : null}
    </div>
  );
}
