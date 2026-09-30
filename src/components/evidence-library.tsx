"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, FileImage, FileSpreadsheet, FileText, Link2 } from "lucide-react";
import { fmtDateTime } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";

type Item = {
  id: string;
  name: string;
  url: string;
  kind: string;
  mimeType: string | null;
  description: string | null;
  elementCode: string;
  elementName: string;
  framework: string;
  requirementCode: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

const kindOf = (i: Item) =>
  i.kind === "LINK"
    ? "link"
    : i.mimeType?.startsWith("image/")
      ? "foto"
      : i.mimeType === "application/pdf"
        ? "pdf"
        : i.mimeType?.includes("sheet") || i.mimeType?.includes("excel") || i.mimeType === "text/csv"
          ? "planilha"
          : "documento";

const ICON = { link: Link2, foto: FileImage, pdf: FileText, planilha: FileSpreadsheet, documento: FileText };

export function EvidenceLibrary({ unitName, cycle, items }: { unitName: string; cycle: string; items: Item[] }) {
  const [f, setF] = useState({ q: "", framework: "", element: "", kind: "", from: "", to: "" });
  const elements = [...new Map(items.map((i) => [i.elementCode, i.elementName])).entries()].sort();
  const rows = items.filter((i) => {
    const q = f.q.toLowerCase();
    const day = i.createdAt.slice(0, 10);
    return (
      (!q || `${i.name} ${i.description} ${i.elementName} ${i.requirementCode}`.toLowerCase().includes(q)) &&
      (!f.framework || i.framework === f.framework) &&
      (!f.element || i.elementCode === f.element) &&
      (!f.kind || kindOf(i) === f.kind) &&
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to)
    );
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-500">Biblioteca de evidências · Ciclo {cycle}</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{unitName}</h1>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-6">
        <Input className="col-span-2" placeholder="Buscar evidência…" value={f.q} onChange={set("q")} />
        <Select value={f.framework} onChange={set("framework")}>
          <option value="">WISE + Básicos</option>
          <option value="WISE">13 Elementos WISE</option>
          <option value="BASICS">12 Básicos</option>
        </Select>
        <Select value={f.element} onChange={set("element")}>
          <option value="">Todos os elementos</option>
          {elements.map(([code, name]) => (
            <option key={code} value={code}>
              {code} · {name}
            </option>
          ))}
        </Select>
        <Select value={f.kind} onChange={set("kind")}>
          <option value="">Todos os tipos</option>
          <option value="foto">Fotos</option>
          <option value="pdf">PDFs</option>
          <option value="planilha">Planilhas</option>
          <option value="documento">Documentos</option>
          <option value="link">Links</option>
        </Select>
        <div className="flex gap-1">
          <Input type="date" value={f.from} onChange={set("from")} title="Enviadas a partir de" />
          <Input type="date" value={f.to} onChange={set("to")} title="Enviadas até" />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Nenhuma evidência encontrada. Anexe evidências abrindo um elemento no Dashboard.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((i) => {
            const k = kindOf(i);
            const Icon = ICON[k];
            return (
              <li key={i.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                {k === "foto" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.url} alt={i.name} className="h-36 w-full object-cover" />
                ) : (
                  <div className="grid h-36 place-items-center bg-brand-50 text-brand-700">
                    <Icon className="size-10" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <a href={i.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-slate-800 hover:text-brand-700">
                    <span className="truncate">{i.name}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                  {i.description ? <p className="line-clamp-2 text-xs text-slate-600">{i.description}</p> : null}
                  <Link
                    href={`/?tab=${i.framework === "WISE" ? "wise" : "basicos"}&el=${i.elementCode}&view=evidencias`}
                    className="text-xs text-brand-700 hover:underline"
                  >
                    {i.elementCode} · {i.elementName}
                    {i.requirementCode ? ` · ${i.requirementCode}` : ""}
                  </Link>
                  <p className="mt-auto pt-1 text-[11px] text-slate-400">
                    {fmtDateTime(i.createdAt)}
                    {i.uploadedBy ? ` · ${i.uploadedBy}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
