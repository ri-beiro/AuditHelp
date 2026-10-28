"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileText, ImagePlus, Loader2, Plus, Save, Trash2, Upload, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import type { IncidentDetail } from "@/server/incident-queries";
import {
  APPLICABILITY,
  HIPO_STATUS,
  POPULATION,
  QUALITY_CHECKS,
  finalMissing,
  initialMissing,
  type FinalPager,
  type InitialPager,
  type OnePagers,
} from "@/lib/one-pager";
import { uploadFile } from "@/lib/upload-client";
import { fileHref } from "@/lib/file-url";
import { cn } from "@/lib/utils";
import { addIncidentAttachment, updateIncident } from "@/server/incidents";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { StepBadge } from "./bits";
import { OnePagerSheet, type SheetKind } from "./one-pager-sheet";

type Patch = Omit<Parameters<typeof updateIncident>[0], "id">;
type Res = { ok: true; data?: IncidentDetail | null } | { ok: false; error: string };

const lines = (s: string) =>
  s
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
const uniq = (l: string[]) => [...new Set(l.map((s) => s.trim()).filter(Boolean))];
const nonEmpty = (l: string[]) => l.some((s) => s.trim());

/** Pré-preenche o One Pager com o que já foi registrado na ocorrência (reporte, RCA e plano de ação). */
function withDefaults(inc: IncidentDetail): OnePagers {
  const p = structuredClone(inc.onePager);
  const i = p.initial;
  if (!i.stop.trim()) i.stop = inc.description;
  if (!nonEmpty(i.think) && inc.rca.essentialFactors.trim()) i.think = lines(inc.rca.essentialFactors);
  if (!nonEmpty(i.act)) {
    const imm = inc.rca.immediate.map((a) => a.action).filter((a) => a.trim());
    if (imm.length) i.act = imm;
  }
  if (!i.reportDue && inc.meetingAt) i.reportDue = inc.meetingAt.slice(0, 10);
  if (!i.photos.length) i.photos = inc.attachments.filter((a) => a.mimeType?.startsWith("image/")).slice(0, 2).map((a) => a.id);
  const f = p.final;
  if (!f.summary.trim()) f.summary = inc.description;
  if (!nonEmpty(f.immediateCauses)) {
    const c = uniq(inc.rca.whys.map((w) => w.factor));
    if (c.length) f.immediateCauses = c;
  }
  if (!nonEmpty(f.rootCauses)) {
    const c = uniq(inc.rca.whys.filter((w) => w.rootCause.trim()).map((w) => w.causeType || w.rootCause));
    if (c.length) f.rootCauses = c;
  }
  if (!nonEmpty(f.preventions)) {
    const c = uniq(inc.actionList.filter((a) => a.status !== "CANCELADA").map((a) => a.what));
    if (c.length) f.preventions = c.slice(0, 5);
  }
  if (!nonEmpty(f.learnings) && inc.howToPrevent.trim()) f.learnings = lines(inc.howToPrevent);
  return p;
}

export function OnePagerStep({
  kind,
  inc,
  editable,
  blobEnabled,
  save,
  apply,
}: {
  kind: SheetKind;
  inc: IncidentDetail;
  editable: boolean;
  blobEnabled: boolean;
  save: (patch: Patch, msg?: string) => void;
  apply: (fn: () => Promise<Res>, msg?: string) => void;
}) {
  const [p, setP] = useState<OnePagers>(() => withDefaults(inc));
  const [busy, setBusy] = useState(false);
  const status = kind === "initial" ? inc.steps.onePager : (inc.steps.finalPager ?? "NAO_INICIADO");
  const statusKey = kind === "initial" ? "onePagerStatus" : "finalPagerStatus";
  const missing = kind === "initial" ? initialMissing(p.initial, inc.description) : finalMissing(p.final);
  const setI = (patch: Partial<InitialPager>) => setP((x) => ({ ...x, initial: { ...x.initial, ...patch } }));
  const setF = (patch: Partial<FinalPager>) => setP((x) => ({ ...x, final: { ...x.final, ...patch } }));
  const images = inc.attachments.filter((a) => a.mimeType?.startsWith("image/"));
  const photos = p.initial.photos.map((id) => images.find((a) => a.id === id)).filter(Boolean).map((a) => fileHref(a!.url));
  const file = kind === "initial" ? p.initial.file : p.final.file;

  const persist = (next: OnePagers, extra: Patch = {}, msg = "One Pager salvo") => save({ onePager: next, ...extra }, msg);

  const uploadOfficial = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const url = await uploadFile(f, `incidentes/${inc.id}/one-pager`, blobEnabled);
      const next = kind === "initial" ? { ...p, initial: { ...p.initial, file: { name: f.name, url } } } : { ...p, final: { ...p.final, file: { name: f.name, url } } };
      setP(next);
      persist(next, status === "NAO_INICIADO" ? { [statusKey]: "EM_ANDAMENTO" } : {}, "Arquivo do One Pager anexado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadFile(f, `incidentes/${inc.id}`, blobEnabled);
        apply(() => addIncidentAttachment({ incidentId: inc.id, name: f.name, url, mimeType: f.type || null, size: f.size }), "Foto enviada");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  const title = kind === "initial" ? (inc.hipo ? "One-Pager Inicial de Incidente (HIPO)" : "Alerta de Segurança · One Pager inicial") : "One-Pager Final de Incidente (HIPO)";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <FileText className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-brand-950">{title}</h2>
              <p className="text-sm text-slate-500">
                {kind === "initial"
                  ? "Primeiro passo da investigação. Preencha aqui ou anexe o arquivo oficial. Os dados do reporte entram automaticamente."
                  : "Obrigatório para HIPO. Resume conclusões, qualidade da investigação, aprendizados e medidas de prevenção."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StepBadge status={status} />
            <Button variant="outline" asChild>
              <a href={`/one-pager/${inc.id}/${kind === "initial" ? "inicial" : "final"}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Abrir para imprimir / PDF
              </a>
            </Button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
          {/* Formulário */}
          <fieldset disabled={!editable} className="space-y-4">
            {kind === "initial" ? (
              <InitialForm p={p.initial} set={setI} inc={inc} images={images} photosBusy={busy} onUploadPhotos={uploadPhotos} />
            ) : (
              <FinalForm p={p.final} set={setF} />
            )}
          </fieldset>

          {/* Prévia */}
          <div className="space-y-3 self-start xl:sticky xl:top-20">
            <Preview>
              <OnePagerSheet
                kind={kind}
                inc={{
                  unitName: inc.unitName,
                  spheraId: inc.spheraId,
                  occurredAt: inc.occurredAt,
                  area: inc.area,
                  type: inc.type,
                  hipo: inc.hipo,
                  description: inc.description,
                  basicRef: inc.basicRef,
                }}
                pagers={p}
                photos={photos}
              />
            </Preview>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <Upload className="size-4 text-brand-600" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-slate-700">Arquivo oficial do One Pager</p>
                {file ? (
                  <a href={fileHref(file.url)} target="_blank" rel="noreferrer" className="block truncate text-brand-700 hover:underline">
                    {file.name}
                  </a>
                ) : (
                  <p className="text-xs text-slate-500">PowerPoint ou PDF. Anexar o arquivo também permite concluir a etapa.</p>
                )}
              </div>
              {editable ? (
                <>
                  {file ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-critico hover:bg-critico-bg hover:text-critico"
                      onClick={() => {
                        const next = kind === "initial" ? { ...p, initial: { ...p.initial, file: null } } : { ...p, final: { ...p.final, file: null } };
                        setP(next);
                        persist(next, {}, "Arquivo removido");
                      }}
                    >
                      <X /> Remover
                    </Button>
                  ) : null}
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {file ? "Substituir" : "Enviar arquivo"}
                    <input type="file" accept=".pptx,.ppt,.pdf,image/*" className="hidden" onChange={(e) => uploadOfficial(e.target.files?.[0])} />
                  </label>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {editable ? (
          <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lift backdrop-blur">
            {missing.length ? (
              <span className="mr-auto text-xs text-slate-500">
                <b className="text-slate-700">Falta:</b> {missing.join(" · ")}
              </span>
            ) : (
              <span className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-conforme">
                <CheckCircle2 className="size-4" /> Pronto para concluir
              </span>
            )}
            <Button type="button" variant="outline" onClick={() => persist(p, status === "NAO_INICIADO" ? { [statusKey]: "EM_ANDAMENTO" } : {})}>
              <Save /> Salvar
            </Button>
            {status === "CONCLUIDO" ? (
              <Button type="button" variant="outline" onClick={() => persist(p, { [statusKey]: "EM_ANDAMENTO" }, "Etapa reaberta")}>
                Reabrir etapa
              </Button>
            ) : (
              <Button type="button" variant="green" disabled={missing.length > 0} onClick={() => persist(p, { [statusKey]: "CONCLUIDO" }, "One Pager concluído")}>
                <CheckCircle2 /> Concluir One Pager
              </Button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Mostra a folha 1280×720 reduzida para a largura disponível. */
function Preview({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-slate-200 shadow-soft" style={{ height: 720 * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1280, height: 720 }}>{children}</div>
    </div>
  );
}

function ListEditor({ label, value, onChange, placeholder, max = 8 }: { label: string; value: string[]; onChange: (l: string[]) => void; placeholder?: string; max?: number }) {
  return (
    <Field label={label}>
      <div className="space-y-1.5">
        {value.map((v, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-2 w-5 shrink-0 text-right text-xs font-bold text-slate-400">{i + 1}.</span>
            <Textarea rows={1} value={v} placeholder={placeholder} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} className="min-h-9 py-1.5 text-sm" style={{ fieldSizing: "content" } as React.CSSProperties} />
            {value.length > 1 ? (
              <button type="button" title="Remover" className="mt-1.5 rounded p-1 text-slate-400 hover:bg-critico-bg hover:text-critico" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
        ))}
        {value.length < max ? (
          <button type="button" className="ml-6 flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline" onClick={() => onChange([...value, ""])}>
            <Plus className="size-3.5" /> Adicionar item
          </button>
        ) : null}
      </div>
    </Field>
  );
}

function Seg({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <span className="inline-flex overflow-hidden rounded-lg border border-slate-200">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? "" : o)}
          className={cn("border-l border-slate-200 px-3 py-1.5 text-xs font-semibold first:border-l-0", value === o ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
        >
          {o}
        </button>
      ))}
    </span>
  );
}

function InitialForm({
  p,
  set,
  inc,
  images,
  photosBusy,
  onUploadPhotos,
}: {
  p: InitialPager;
  set: (x: Partial<InitialPager>) => void;
  inc: IncidentDetail;
  images: IncidentDetail["attachments"];
  photosBusy: boolean;
  onUploadPhotos: (f: FileList | null) => void;
}) {
  return (
    <>
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        Vêm do reporte: <b>site</b> ({inc.unitName}), <b>Sphera ID</b> ({inc.spheraId ?? "—"}), <b>local</b>, <b>data/hora</b>, <b>tipo de evento</b>, <b>HIPO</b> e <b>12 Básicos</b> ({inc.basicRef ?? "—"}). Para alterar, use a etapa Reporte.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {!inc.hipo ? (
          <Field label="Zona / CBU">
            <Input value={p.zone} onChange={(e) => set({ zone: e.target.value })} />
          </Field>
        ) : null}
        <Field label={inc.hipo ? "Lesão" : "Tipo e gravidade da lesão / possível lesão"} className={inc.hipo ? "sm:col-span-2" : ""}>
          <Input value={p.injury} onChange={(e) => set({ injury: e.target.value })} placeholder="Ex.: Não houve lesões / contusões, cortes…" />
        </Field>
        {!inc.hipo ? (
          <Field label="Danos patrimoniais">
            <Seg value={p.propertyDamage} options={["Sim", "Não"]} onChange={(v) => set({ propertyDamage: v })} />
          </Field>
        ) : null}
      </div>
      <Field label={inc.hipo ? "STOP · Descrição do incidente" : "PARE · Descrição do incidente"}>
        <Textarea rows={3} value={p.stop} onChange={(e) => set({ stop: e.target.value })} />
      </Field>
      <ListEditor
        label={inc.hipo ? "THINK · (potenciais) consequências / fatores influenciadores" : "PENSE · (potenciais) consequências / fatores de influência"}
        value={p.think}
        onChange={(think) => set({ think })}
        placeholder="Ex.: Altura e padrão de paletização: …"
      />
      <ListEditor
        label={inc.hipo ? "ACT · Contenção imediata e aprendizado inicial" : "AJA · Principais ações para evitar recorrência / aprendizados"}
        value={p.act}
        onChange={(act) => set({ act })}
        placeholder="Ex.: Avaliação do local"
      />
      {inc.rca.immediate.some((a) => a.action.trim()) ? (
        <button
          type="button"
          className="-mt-2 ml-6 flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          onClick={() => set({ act: inc.rca.immediate.map((a) => a.action).filter((a) => a.trim()) })}
        >
          <Wand2 className="size-3.5" /> Usar as ações imediatas da RCA
        </button>
      ) : null}

      <Field label="Fotos e ilustração (até 4)">
        <div className="flex flex-wrap gap-2">
          {images.map((a) => {
            const on = p.photos.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                title={a.name}
                onClick={() => set({ photos: on ? p.photos.filter((x) => x !== a.id) : p.photos.length < 4 ? [...p.photos, a.id] : p.photos })}
                className={cn("relative size-16 overflow-hidden rounded-lg border-2", on ? "border-brand-600 ring-2 ring-brand-500/30" : "border-slate-200 opacity-60 hover:opacity-100")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileHref(a.url)} alt="" className="size-full object-cover" />
                {on ? <CheckCircle2 className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white text-brand-600" /> : null}
              </button>
            );
          })}
          <label className="grid size-16 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-300 hover:text-brand-600">
            {photosBusy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadPhotos(e.target.files)} />
          </label>
        </div>
      </Field>

      {inc.hipo ? (
        <Field label="Status atual da investigação">
          <div className="grid gap-1.5 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
            {HIPO_STATUS.map((s) => (
              <label key={s.k} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={p.status[s.k]} onChange={(e) => set({ status: { ...p.status, [s.k]: e.target.checked } })} />
                {s.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              Relatório previsto
              <Input type="date" className="h-8 w-40" value={p.reportDue} onChange={(e) => set({ reportDue: e.target.value })} />
            </label>
          </div>
        </Field>
      ) : null}
    </>
  );
}

function FinalForm({ p, set }: { p: FinalPager; set: (x: Partial<FinalPager>) => void }) {
  return (
    <>
      <Field label="1. Breve descrição do incidente (máx. 3 linhas)">
        <Textarea rows={3} maxLength={600} value={p.summary} onChange={(e) => set({ summary: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <ListEditor label="2. Causas imediatas" value={p.immediateCauses} onChange={(immediateCauses) => set({ immediateCauses })} placeholder="O que causou diretamente" max={5} />
        <ListEditor label="2. Causas raiz" value={p.rootCauses} onChange={(rootCauses) => set({ rootCauses })} placeholder="Falhas no sistema" max={5} />
      </div>
      <Field label="3. Qualidade da investigação e verificação de evidências">
        <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
          {QUALITY_CHECKS.map((q) => (
            <label key={q.k} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={p.quality[q.k]} onChange={(e) => set({ quality: { ...p.quality, [q.k]: e.target.checked } })} />
              {q.label}
            </label>
          ))}
        </div>
      </Field>
      <ListEditor label="4. Principais aprendizados para o negócio" value={p.learnings} onChange={(learnings) => set({ learnings })} placeholder="O que aprendemos?" max={4} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Isso poderia acontecer em outro lugar?">
          <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
            {APPLICABILITY.map((a) => (
              <label key={a.k} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="applicability" checked={p.applicability === a.k} onChange={() => set({ applicability: a.k })} />
                {a.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="População impactada">
          <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
            {POPULATION.map((a) => (
              <label key={a.k} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={p.population.includes(a.k)}
                  onChange={(e) => set({ population: e.target.checked ? [...p.population, a.k] : p.population.filter((x) => x !== a.k) })}
                />
                {a.label}
              </label>
            ))}
          </div>
        </Field>
      </div>
      <ListEditor label="5. Principais medidas de prevenção" value={p.preventions} onChange={(preventions) => set({ preventions })} placeholder="Medida para prevenir a recorrência" max={5} />
    </>
  );
}
