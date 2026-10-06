import { cn } from "@/lib/utils";

/** Selo oficial WISE² ("Somente um já é demais!"), em public/brand/wise-logo.png. */
export function WiseMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/wise-logo.png" alt="WISE² — Somente um já é demais!" className={cn("h-12 w-auto object-contain", className)} />;
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className={cn("grid place-items-center rounded-2xl p-1.5", light ? "bg-white shadow-lift ring-1 ring-white/30" : "bg-white")}>
        <WiseMark className="h-[72px]" />
      </span>
      <div className="leading-tight">
        <div className={cn("font-display text-[17px] font-extrabold tracking-tight", light ? "text-white" : "text-brand-900")}>
          Excelência
        </div>
        <div className={cn("text-[11px] font-medium", light ? "text-white/65" : "text-slate-500")}>Gestão de segurança</div>
      </div>
    </div>
  );
}
