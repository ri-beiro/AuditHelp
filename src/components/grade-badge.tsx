import { cn } from "@/lib/utils";
import type { Grade } from "@/lib/scoring";

// Cores da classificação oficial (slide 129): A verde, B amarelo, C laranja, D grafite.
export const GRADE_COLOR: Record<Grade, string> = {
  A: "#1c9a4a",
  B: "#e8a600",
  C: "#f26b1d",
  D: "#1e272e",
};

export function GradeBadge({
  grade,
  size = "md",
  className,
  title,
}: {
  grade: Grade | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  title?: string;
}) {
  const dims = { sm: "size-5 text-[10px]", md: "size-7 text-xs", lg: "size-10 text-lg", xl: "size-16 text-3xl" }[size];
  return (
    <span
      title={title ?? (grade ? `Classe ${grade}` : "Sem classificação")}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-lg font-extrabold text-white shadow-sm",
        dims,
        !grade && "bg-slate-200 text-slate-400",
        className,
      )}
      style={grade ? { background: GRADE_COLOR[grade] } : undefined}
    >
      {grade ?? "–"}
    </span>
  );
}
