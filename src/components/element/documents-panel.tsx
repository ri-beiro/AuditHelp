"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, ClipboardList, ExternalLink, FileText, Loader2, Paperclip, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { createEvidence, setAuditDocument } from "@/server/actions";
import { buildAuditDocs, DOC_STATUS_LABEL, type AuditDoc, type DocStatus } from "@/lib/audit-docs";
import { uploadFile } from "@/lib/upload-client";
import { fileHref } from "@/lib/file-url";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { SheetCtx } from "./element-sheet";

const STATUS_STYLE: Record<DocStatus, string> = {
  PENDENTE: "bg-atencao text-white border-atencao",
  RECEBIDO: "bg-conforme text-white border-conforme",
  NAO_APLICAVEL: "bg-slate-500 text-white border-slate-500",
};

/**
 * Documentos da auditoria: tudo o que a matriz pede como evidência, agrupado por documento,
 * com as linhas da matriz que pedem cada um, o status e os arquivos anexados.
 */
export function DocumentsPanel({ ctx, onOpenRequirement }: { ctx: SheetCtx; onOpenRequirement: (id: string) => void }) {
  const { detail } = ctx;
  const docs = useMemo(() => buildAuditDocs(detail.requirements), [detail.requirements]);
  const statusOf = useMemo(() => new Map(detail.documents.map((d) => [d.key, d])), [detail.documents]);
  const [filter, setFilter] = useState<"" | DocStatus>("");
  const [q, setQ] = useState("");

  const st = (key: string): DocStatus => statusOf.get(key)?.status ?? "PENDENTE";
  const counts = { PENDENTE: 0, RECEBIDO: 0, NAO_APLICAVEL: 0 } as Record<DocStatus, number>;
  for (const d of docs) counts[st(d.key)]++;
  const applicable = docs.length - counts.NAO_APLICAVEL;
  const pct = applicable ? Math.round((counts.RECEBIDO / applicable) * 100) : 0;

  const term = q.trim().toLowerCase();
  const visible = docs.filter(
    (d) => (!filter || st(d.key) === filter) && (!term || d.name.toLowerCase().includes(term) || d.requirements.some((r) => r.code.toLowerCase().includes(term))),
  );
  const groups: { title: string; hint: string; items: AuditDoc[] }[] = [
    { title: "Documentos e registros", hint: "Solicite ao site antes ou durante a auditoria.", items: visible.filter((d) => d.kind === "documento") },
    { title: "Verificações em campo", hint: "Observações e entrevistas; anexe fotos ou anotações se quiser.", items: visible.filter((d) => d.kind === "campo") },
  ];

  if (!docs.length) return <p className="text-sm text-slate-500">Nenhum documento sugerido para este elemento.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <ClipboardList className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-800">Documentos para a auditoria</h4>
          <p className="text-xs text-slate-500">
            Lista gerada a partir das evidências que a matriz pede em cada linha. Clique no código da linha para abrir o requisito na Matriz.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-conforme transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-700">
              {counts.RECEBIDO}/{applicable} recebidos ({pct}%)
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["", `Todos (${docs.length})`],
              ["PENDENTE", `Pendentes (${counts.PENDENTE})`],
              ["RECEBIDO", `Recebidos (${counts.RECEBIDO})`],
              ["NAO_APLICAVEL", `N/A (${counts.NAO_APLICAVEL})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", filter === k ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
            >
              {label}
            </button>
          ))}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input className="h-8 w-48 pl-8 text-xs" placeholder="Buscar documento ou linha…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {groups.map((g) =>
        g.items.length ? (
          <section key={g.title} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h5 className="text-xs font-bold uppercase tracking-wide text-brand-700">{g.title}</h5>
              <span className="text-[11px] text-slate-400">
                {g.items.length} · {g.hint}
              </span>
            </div>
            <ul className="space-y-1.5">
              {g.items.map((d) => (
                <DocRow key={d.key} doc={d} ctx={ctx} status={st(d.key)} meta={statusOf.get(d.key)} onOpenRequirement={onOpenRequirement} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {!visible.length ? <p className="text-sm text-slate-500">Nenhum documento com este filtro.</p> : null}
    </div>
  );
}

function DocRow({
  doc,
  ctx,
  status,
  meta,
  onOpenRequirement,
}: {
  doc: AuditDoc;
  ctx: SheetCtx;
  status: DocStatus;
  meta?: SheetCtx["detail"]["documents"][number];
  onOpenRequirement: (id: string) => void;
}) {
  const { detail } = ctx;
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const files = detail.evidences.filter((e) => e.documentKey === doc.key);
  const canEdit = ctx.perms.evidence;

  const setStatus = (s: DocStatus) =>
    start(async () => {
      const res = await setAuditDocument({ assessmentId: detail.assessmentId, elementId: detail.element.id, key: doc.key, status: s });
      if (res.ok && res.data) ctx.setDetail(res.data);
      else if (!res.ok) toast.error(res.error);
    });

  const attach = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const url = await uploadFile(file, `${ctx.unitId}/${detail.element.code}`, ctx.blobEnabled);
        const res = await createEvidence({
          assessmentId: detail.assessmentId,
          elementId: detail.element.id,
          requirementId: doc.requirements[0]?.id ?? null,
          kind: "FILE",
          name: file.name,
          url,
          mimeType: file.type || null,
          size: file.size,
          description: doc.name,
          documentKey: doc.key,
        });
        if (res.ok && res.data) ctx.setDetail(res.data);
        else if (!res.ok) throw new Error(res.error);
      }
      toast.success("Documento anexado e marcado como recebido");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <li
      className={cn(
        "rounded-lg border bg-white p-3",
        status === "RECEBIDO" ? "border-conforme/30" : status === "NAO_APLICAVEL" ? "border-slate-200 opacity-70" : "border-slate-200",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        {status === "RECEBIDO" ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-conforme" />
        ) : (
          <FileText className="mt-0.5 size-4 shrink-0 text-slate-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">{doc.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-400">Pedido em:</span>
            {doc.requirements.map((r) => (
              <button
                key={r.id}
                type="button"
                title={r.text}
                onClick={() => onOpenRequirement(r.id)}
                className="rounded border border-brand-100 bg-brand-50 px-1.5 py-px text-[11px] font-semibold text-brand-700 hover:bg-brand-100"
              >
                {r.code}
              </button>
            ))}
          </div>
          {files.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {files.map((f) => (
                <li key={f.id}>
                  <a
                    href={fileHref(f.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    <Paperclip className="size-3" /> {f.name} <ExternalLink className="size-3 opacity-60" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {meta?.updatedBy && status !== "PENDENTE" ? (
            <p className="mt-1 text-[10px] text-slate-400">
              {DOC_STATUS_LABEL[status]} por {meta.updatedBy}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pending ? <Loader2 className="size-4 animate-spin text-slate-400" /> : null}
          <span className="inline-flex overflow-hidden rounded-lg border border-slate-200">
            {(Object.keys(DOC_STATUS_LABEL) as DocStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={!canEdit || pending}
                onClick={() => setStatus(s)}
                className={cn(
                  "border-l border-slate-200 px-2.5 py-1 text-xs font-semibold first:border-l-0 disabled:cursor-not-allowed",
                  status === s ? STATUS_STYLE[s] : "bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                {DOC_STATUS_LABEL[s]}
              </button>
            ))}
          </span>
          {canEdit ? (
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Anexar
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => attach(e.target.files)} />
            </label>
          ) : null}
        </div>
      </div>
    </li>
  );
}
