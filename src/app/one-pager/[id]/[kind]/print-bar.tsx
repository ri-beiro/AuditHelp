"use client";

import { Printer } from "lucide-react";

export function PrintBar({ title }: { title: string }) {
  return (
    <div className="mx-auto mb-4 flex w-[1280px] items-center justify-between print:hidden">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-800"
      >
        <Printer className="size-4" /> Imprimir / Salvar PDF
      </button>
    </div>
  );
}
