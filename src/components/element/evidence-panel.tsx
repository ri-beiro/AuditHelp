"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { createEvidence, deleteEvidence } from "@/server/actions";
import { cn, fmtDateTime } from "@/lib/utils";
import { fileHref } from "@/lib/file-url";
import { MAX_UPLOAD_MB, UPLOAD_ACCEPT } from "@/lib/uploads";
import { uploadFile } from "@/lib/upload-client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { SheetCtx } from "./element-sheet";

function iconFor(mime: string | null, kind: string) {
  if (kind === "LINK") return Link2;
  if (mime?.startsWith("image/")) return FileImage;
  if (mime?.includes("sheet") || mime?.includes("excel") || mime === "text/csv") return FileSpreadsheet;
  return FileText;
}

const fmtSize = (n: number | null) =>
  n == null ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

export function EvidencePanel({
  ctx,
  presetRequirement,
  onPresetUsed,
}: {
  ctx: SheetCtx;
  presetRequirement: string | null;
  onPresetUsed: () => void;
}) {
  const { detail } = ctx;
  const [mode, setMode] = useState<"FILE" | "LINK">("FILE");
  const [requirementId, setRequirementId] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState({ name: "", url: "" });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (presetRequirement) {
      setRequirementId(presetRequirement);
      onPresetUsed();
    }
  }, [presetRequirement, onPresetUsed]);

  const reqLabel = (id: string | null) => {
    const r = detail.requirements.find((x) => x.id === id);
    return r ? `${r.code} — ${r.text.slice(0, 80)}${r.text.length > 80 ? "…" : ""}` : "Elemento (geral)";
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, `${ctx.unitId}/${detail.element.code}`, ctx.blobEnabled);
        const res = await createEvidence({
          assessmentId: detail.assessmentId,
          elementId: detail.element.id,
          requirementId: requirementId || null,
          kind: "FILE",
          name: file.name,
          url,
          mimeType: file.type || null,
          size: file.size,
          description: description || null,
        });
        if (res.ok && res.data) ctx.setDetail(res.data);
        else if (!res.ok) throw new Error(res.error);
      }
      toast.success("Evidência(s) anexada(s)");
      setDescription("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addLink = () =>
    start(async () => {
      const res = await createEvidence({
        assessmentId: detail.assessmentId,
        elementId: detail.element.id,
        requirementId: requirementId || null,
        kind: "LINK",
        name: link.name || link.url,
        url: link.url.trim(),
        description: description || null,
      });
      if (res.ok && res.data) {
        ctx.setDetail(res.data);
        setLink({ name: "", url: "" });
        setDescription("");
        toast.success("Link adicionado");
      } else if (!res.ok) toast.error(res.error);
    });

  const list = detail.evidences.filter((e) => !filter || (filter === "geral" ? !e.requirementId : e.requirementId === filter));

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      {ctx.perms.evidence ? (
        <div className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-800">Nova evidência</h4>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {(["FILE", "LINK"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium",
                  mode === m ? "bg-white text-brand-800 shadow-sm" : "text-slate-500",
                )}
              >
                {m === "FILE" ? <Upload className="size-3.5" /> : <Link2 className="size-3.5" />}
                {m === "FILE" ? "Arquivo / foto" : "Link"}
              </button>
            ))}
          </div>
          <Field label="Vincular a">
            <Select value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
              <option value="">Elemento (geral)</option>
              {detail.requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {reqLabel(r.id)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição (opcional)">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Foto da doca 3 com calço" />
          </Field>
          {mode === "FILE" ? (
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-brand-500 hover:bg-brand-50",
                busy && "pointer-events-none opacity-60",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                uploadFiles(e.dataTransfer.files);
              }}
            >
              {busy ? <Loader2 className="size-6 animate-spin text-brand-600" /> : <Upload className="size-6 text-brand-600" />}
              <span className="text-sm font-medium text-slate-700">{busy ? "Enviando…" : "Arraste ou clique para enviar"}</span>
              <span className="text-[11px] text-slate-500">Fotos, PDFs, planilhas, documentos · até {MAX_UPLOAD_MB} MB</span>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={UPLOAD_ACCEPT}
                className="hidden"
                onChange={(e) => uploadFiles(e.target.files)}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <Field label="Título">
                <Input value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder="Procedimento POP-012" />
              </Field>
              <Field label="URL do documento">
                <Input
                  value={link.url}
                  onChange={(e) => setLink({ ...link, url: e.target.value })}
                  placeholder="https://sharepoint…"
                />
              </Field>
              <Button onClick={addLink} disabled={!link.url || pending} className="w-full">
                {pending ? <Loader2 className="animate-spin" /> : <Link2 />} Adicionar link
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800">{list.length} evidência(s)</h4>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-64">
            <option value="">Todas</option>
            <option value="geral">Somente gerais do elemento</option>
            {[...new Set(detail.evidences.map((e) => e.requirementId).filter(Boolean))].map((id) => (
              <option key={id} value={id!}>
                {reqLabel(id)}
              </option>
            ))}
          </Select>
        </div>
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nenhuma evidência anexada ainda.
          </div>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {list.map((e) => {
              const Icon = iconFor(e.mimeType, e.kind);
              const isImage = e.mimeType?.startsWith("image/");
              return (
                <li key={e.id} className="group flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileHref(e.url)} alt={e.name} className="size-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={fileHref(e.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm font-medium text-slate-800 hover:text-brand-700"
                    >
                      <span className="truncate">{e.name}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                    {e.description ? <p className="line-clamp-1 text-xs text-slate-600">{e.description}</p> : null}
                    <p className="line-clamp-1 text-[11px] text-slate-400">{reqLabel(e.requirementId)}</p>
                    <p className="text-[11px] text-slate-400">
                      {fmtDateTime(e.createdAt)}
                      {e.uploadedBy ? ` · ${e.uploadedBy}` : ""} {fmtSize(e.size)}
                    </p>
                  </div>
                  {ctx.perms.evidence ? (
                    <button
                      title="Remover"
                      onClick={() =>
                        confirm("Remover esta evidência?") &&
                        start(async () => {
                          const res = await deleteEvidence(e.id);
                          if (res.ok && res.data) ctx.setDetail(res.data);
                          else if (!res.ok) toast.error(res.error);
                        })
                      }
                      className="self-start rounded p-1 text-slate-300 opacity-0 transition hover:bg-critico-bg hover:text-critico group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
