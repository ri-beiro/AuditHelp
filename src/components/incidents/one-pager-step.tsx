"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileText, ImagePlus, Loader2, Maximize2, Minimize2, MousePointerClick, Save, Upload, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import type { IncidentDetail } from "@/server/incident-queries";
import {
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StepBadge } from "./bits";
import { OnePagerSheet, type SheetEdit, type SheetKind } from "./one-pager-sheet";

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
  basics,
}: {
  basics: string[];
  kind: SheetKind;
  inc: IncidentDetail;
  editable: boolean;
  blobEnabled: boolean;
  save: (patch: Patch, msg?: string) => void;
  apply: (fn: () => Promise<Res>, msg?: string) => void;
}) {
  const [p, setP] = useState<OnePagers>(() => withDefaults(inc));
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const [picking, setPicking] = useState(false);
  const status = kind === "initial" ? inc.steps.onePager : (inc.steps.finalPager ?? "NAO_INICIADO");
  const statusKey = kind === "initial" ? "onePagerStatus" : "finalPagerStatus";
  const missing = kind === "initial" ? initialMissing(p.initial, inc.description) : finalMissing(p.final);
  const setI = (patch: Partial<InitialPager>) => setP((x) => ({ ...x, initial: { ...x.initial, ...patch } }));
  const setF = (patch: Partial<FinalPager>) => setP((x) => ({ ...x, final: { ...x.final, ...patch } }));
  const images = inc.attachments.filter((a) => a.mimeType?.startsWith("image/"));
  const photos = p.initial.photos.map((id) => images.find((a) => a.id === id)).filter(Boolean).map((a) => fileHref(a!.url));
  const file = kind === "initial" ? p.initial.file : p.final.file;
  // Dados do reporte editados na própria folha; vão junto no salvar.
  const [rep, setRep] = useState({ occurredAt: inc.occurredAt, type: inc.type, hipo: inc.hipo, spheraId: inc.spheraId, basicRef: inc.basicRef });
  const repPatch = (): Patch => ({
    ...(rep.occurredAt !== inc.occurredAt ? { occurredAt: rep.occurredAt } : {}),
    ...(rep.type !== inc.type ? { type: rep.type } : {}),
    ...(rep.hipo !== inc.hipo ? { hipo: rep.hipo } : {}),
    ...((rep.spheraId ?? "") !== (inc.spheraId ?? "") ? { spheraId: rep.spheraId ?? "" } : {}),
    ...((rep.basicRef ?? "") !== (inc.basicRef ?? "") ? { basicRef: rep.basicRef ?? "" } : {}),
  });
  const sheetEdit: SheetEdit | undefined = editable
    ? {
        setInitial: setI,
        setFinal: setF,
        onPhotos: () => setPicking(true),
        setReport: (patch) => setRep((r) => ({ ...r, ...patch })),
        basics,
      }
    : undefined;

  const persist = (next: OnePagers, extra: Patch = {}, msg = "One Pager salvo") => save({ onePager: next, ...repPatch(), ...extra }, msg);

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

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const title =
    kind === "initial" ? "One-Pager Inicial de Incidente" : `One-Pager Final de Incidente (${inc.hipo ? "HIPO" : "acidente com lesão"})`;

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
                  : "Obrigatório para HIPO e acidentes com lesão. Resume conclusões, qualidade da investigação, aprendizados e medidas de prevenção."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StepBadge status={status} />
            <Button variant="outline" onClick={() => setFull(true)}>
              <Maximize2 /> Tela cheia
            </Button>
            <Button variant="outline" asChild>
              <a href={`/one-pager/${inc.id}/${kind === "initial" ? "inicial" : "final"}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Abrir para imprimir / PDF
              </a>
            </Button>
          </div>
        </header>

        {editable ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <MousePointerClick className="size-4" />
            <span>
              <b>Edite direto na folha:</b> clique nos textos para escrever, <kbd className="rounded bg-white px-1">Enter</kbd> cria um novo item da lista,
              clique nas caixas para marcar e na área de fotos para escolher as imagens. Data, tipo de evento, HIPO, Sphera ID e 12 Básicos também
              são editáveis aqui e atualizam o reporte ao salvar.
            </span>
            {kind === "initial" && inc.rca.immediate.some((a) => a.action.trim()) ? (
              <button
                type="button"
                className="ml-auto flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                onClick={() => setI({ act: inc.rca.immediate.map((a) => a.action).filter((a) => a.trim()) })}
              >
                <Wand2 className="size-3.5" /> Usar ações imediatas da RCA
              </button>
            ) : null}
          </div>
        ) : null}

        <div className={cn(full && "fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-slate-900/90 p-4")}>
          {full ? (
            <div className="flex w-full max-w-[1600px] items-center justify-between text-white">
              <span className="text-sm font-semibold">{title}</span>
              <div className="flex gap-2">
                {editable ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => persist(p)}>
                    <Save /> Salvar
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => setFull(false)}>
                  <Minimize2 /> Sair da tela cheia
                </Button>
              </div>
            </div>
          ) : null}
          <div className={cn("relative w-full", full && "max-w-[min(1600px,calc((100vh-90px)*16/9))]")}>
            <Preview>
              <OnePagerSheet
                kind={kind}
                inc={{
                  unitName: inc.unitName,
                  spheraId: rep.spheraId,
                  occurredAt: rep.occurredAt,
                  area: inc.area,
                  type: rep.type,
                  hipo: rep.hipo,
                  description: inc.description,
                  basicRef: rep.basicRef,
                }}
                pagers={p}
                photos={photos}
                edit={sheetEdit}
              />
            </Preview>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
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

        <Dialog open={picking} onOpenChange={setPicking}>
          <DialogContent title="Fotos e ilustração" description="Escolha até 4 imagens entre os anexos da ocorrência ou envie novas.">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((a) => {
                const on = p.initial.photos.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    title={a.name}
                    onClick={() =>
                      setI({ photos: on ? p.initial.photos.filter((x) => x !== a.id) : p.initial.photos.length < 4 ? [...p.initial.photos, a.id] : p.initial.photos })
                    }
                    className={cn("relative aspect-square overflow-hidden rounded-xl border-2", on ? "border-brand-600 ring-2 ring-brand-500/30" : "border-slate-200 opacity-70 hover:opacity-100")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileHref(a.url)} alt="" className="size-full object-cover" />
                    {on ? (
                      <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {p.initial.photos.indexOf(a.id) + 1}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-300 hover:text-brand-600">
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />} Enviar fotos
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => setPicking(false)}>
                Pronto
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
