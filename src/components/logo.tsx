import { cn } from "@/lib/utils";

/** Emblema inspirado no selo WISE²: anel creme com as metades verde-limão e laranja. */
export function WiseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-10", className)} aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#13508a" />
      <circle cx="24" cy="24" r="21" fill="#f3e3d3" />
      <circle cx="24" cy="24" r="16.5" fill="#fbf6f0" />
      <path d="M24 9.5a14.5 14.5 0 0 0 0 29Z" fill="#c3d23f" />
      <path d="M24 9.5a14.5 14.5 0 0 1 0 29c-3.2-2.6-4.4-6-3.6-9.6l1.8-1.4-1.6-2.4 1.7-2.2c-.9-4.7-.3-9.3 1.7-13.4Z" fill="#ec9631" />
      <text x="36.5" y="15" fontSize="11" fontWeight="800" fill="#c3d23f" fontFamily="var(--font-display)">2</text>
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <WiseMark className="size-10 drop-shadow-sm" />
      <div className="leading-tight">
        <div className={cn("font-display text-[17px] font-extrabold tracking-tight", light ? "text-white" : "text-brand-900")}>
          wise<sup className="text-[10px] text-wgreen-500">2</sup>
          <span className={cn("ml-1.5 font-semibold", light ? "text-white/70" : "text-slate-500")}>Excelência</span>
        </div>
        <div className={cn("text-[10.5px] font-medium tracking-wide", light ? "text-accent-400" : "text-accent-700")}>
          Somente um já é demais
        </div>
      </div>
    </div>
  );
}
