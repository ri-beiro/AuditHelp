import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-accent-500 to-amber-400 shadow-sm">
        <ShieldCheck className="size-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className={cn("text-[15px] font-extrabold tracking-tight", light ? "text-white" : "text-brand-900")}>
          WISE<sup className="text-[10px]">2</sup> Excelência
        </div>
        <div className={cn("text-[11px] font-medium", light ? "text-brand-100/80" : "text-slate-500")}>
          Segurança · Qualidade · Compliance
        </div>
      </div>
    </div>
  );
}
