"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  ListTodo,
  Loader2,
  MessageCircleQuestion,
  NotebookPen,
} from "lucide-react";
import { toast } from "sonner";
import type { ElementStatus } from "@prisma/client";
import type { ElementDetail } from "@/server/queries";
import { getElementDetailAction, updateElementInfo } from "@/server/actions";
import { cn, fmtDateTime, fmtPct, fmtScore, STATUS_LABEL, TONE_CLASSES, TONE_LABEL } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ElementIcon } from "@/components/element-icon";
import type { Perms } from "@/components/dashboard/dashboard";
import { MatrixWise } from "./matrix-wise";
import { MatrixBasics } from "./matrix-basics";
import { EvidencePanel } from "./evidence-panel";
import { ActionsPanel } from "./actions-panel";
import { InterviewPanel } from "./interview-panel";

type Props = {
  code: string | null;
  assessmentId: string;
  unitId: string;
  initialView: string | null;
  focusRequirement: string | null;
  perms: Perms;
  blobEnabled: boolean;
  siblings: string[];
  onClose: () => void;
  onNavigate: (code: string) => void;
};

export type SheetCtx = {
  detail: ElementDetail;
  setDetail: (d: ElementDetail) => void;
  perms: Perms;
  blobEnabled: boolean;
  unitId: string;
  openEvidenceFor: (requirementId: string) => void;
  openActionFor: (requirementId: string) => void;
};

export function ElementSheet(props: Props) {
  const { code, assessmentId, onClose } = props;
  const [detail, setDetail] = useState<ElementDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("matriz");
  const [evidenceReq, setEvidenceReq] = useState<string | null>(null);
  const [actionReq, setActionReq] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    const res = await getElementDetailAction(assessmentId, code);
    setLoading(false);
    if (res.ok && res.data) setDetail(res.data);
    else if (!res.ok) toast.error(res.error);
  }, [assessmentId, code]);

  useEffect(() => {
    setDetail(null);
    setView(props.initialView === "evidencias" ? "evidencias" : "matriz");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, assessmentId]);

  const idx = code ? props.siblings.indexOf(code) : -1;

  return (
    <Sheet open={!!code} onOpenChange={(o) => !o && onClose()}>
      <SheetContent aria-describedby={undefined}>
        {!detail ? (
          <div className="flex flex-1 items-center justify-center">
            <SheetTitle className="sr-only">Carregando elemento</SheetTitle>
            <Loader2 className="size-6 animate-spin text-brand-600" />
          </div>
        ) : (
          <SheetBody
            detail={detail}
            ctx={{
              detail,
              setDetail,
              perms: props.perms,
              blobEnabled: props.blobEnabled,
              unitId: props.unitId,
              openEvidenceFor: (id) => {
                setEvidenceReq(id);
                setView("evidencias");
              },
              openActionFor: (id) => {
                setActionReq(id);
                setView("acoes");
              },
            }}
            view={view}
            setView={setView}
            loading={loading}
            focusRequirement={props.focusRequirement}
            evidenceReq={evidenceReq}
            clearEvidenceReq={() => setEvidenceReq(null)}
            actionReq={actionReq}
            clearActionReq={() => setActionReq(null)}
            onPrev={idx > 0 ? () => props.onNavigate(props.siblings[idx - 1]) : undefined}
            onNext={idx >= 0 && idx < props.siblings.length - 1 ? () => props.onNavigate(props.siblings[idx + 1]) : undefined}
            reload={load}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({
  detail,
  ctx,
  view,
  setView,
  loading,
  focusRequirement,
  evidenceReq,
  clearEvidenceReq,
  actionReq,
  clearActionReq,
  onPrev,
  onNext,
  reload,
}: {
  detail: ElementDetail;
  ctx: SheetCtx;
  view: string;
  setView: (v: string) => void;
  loading: boolean;
  focusRequirement: string | null;
  evidenceReq: string | null;
  clearEvidenceReq: () => void;
  actionReq: string | null;
  clearActionReq: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  reload: () => void;
}) {
  const { element, result, info } = detail;
  const isWise = result.kind === "WISE";
  const tone = TONE_CLASSES[result.tone];
  const pendingActions = detail.actions.filter((a) => a.status === "ABERTA" || a.status === "EM_ANDAMENTO").length;

  return (
    <>
      {/* Cabeçalho */}
      <header className="shrink-0 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-6 pb-5 pt-5 text-white">
        <div className="flex items-center gap-2 pr-10 text-xs text-brand-100/70">
          <button disabled={!onPrev} onClick={onPrev} className="rounded p-1 hover:bg-white/10 disabled:opacity-30" title="Anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button disabled={!onNext} onClick={onNext} className="rounded p-1 hover:bg-white/10 disabled:opacity-30" title="Próximo">
            <ChevronRight className="size-4" />
          </button>
          <span className="font-semibold uppercase tracking-widest">
            {isWise ? "Elemento WISE" : "Básico de Segurança"} {element.number} · {element.pillar.name}
          </span>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
        </div>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              className="grid size-14 shrink-0 place-items-center rounded-2xl shadow-lg ring-2 ring-white/20"
              style={{ background: element.pillar.color }}
            >
              <ElementIcon name={element.icon} className="size-7" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-xl font-bold leading-tight md:text-2xl">{element.name}</SheetTitle>
              <SheetDescription className="mt-1 text-sm text-brand-100/80">{element.description}</SheetDescription>
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            <ScoreTile
              label={isWise ? "Nota do elemento" : "Atendimento"}
              value={isWise ? fmtScore(result.score) : fmtPct(result.pct)}
              suffix={isWise ? "/ 5" : undefined}
              sub={isWise ? result.stage : result.capped ? "Limitado a 50% (risco 1)" : `${result.applicable} itens aplicáveis`}
              toneLabel={result.grade ? `Classe ${result.grade} · ${TONE_LABEL[result.tone]}` : TONE_LABEL[result.tone]}
              barClass={tone.bar}
              pct={isWise ? result.pct : result.pct}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <InfoPanel detail={detail} ctx={ctx} />

        <Tabs value={view} onValueChange={setView} className="px-6 pb-10">
          <div className="sticky top-0 z-10 -mx-6 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="matriz">
                <ClipboardList /> Matriz
                <span className="text-xs text-slate-400">
                  {result.answered}/{result.total}
                </span>
              </TabsTrigger>
              <TabsTrigger value="evidencias">
                <FileText /> Evidências <span className="text-xs text-slate-400">{detail.evidences.length}</span>
              </TabsTrigger>
              <TabsTrigger value="acoes">
                <ListTodo /> Planos de ação{" "}
                <span className={cn("text-xs", pendingActions ? "font-semibold text-atencao-ink" : "text-slate-400")}>
                  {pendingActions}
                </span>
              </TabsTrigger>
              {isWise ? (
                <TabsTrigger value="roteiro">
                  <MessageCircleQuestion /> Roteiro do auditor
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="parecer">
                <NotebookPen /> Parecer
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="matriz" className="pt-4">
            {isWise ? (
              <MatrixWise ctx={ctx} focusRequirement={focusRequirement} />
            ) : (
              <MatrixBasics ctx={ctx} focusRequirement={focusRequirement} />
            )}
          </TabsContent>
          <TabsContent value="evidencias" className="pt-4">
            <EvidencePanel ctx={ctx} presetRequirement={evidenceReq} onPresetUsed={clearEvidenceReq} />
          </TabsContent>
          <TabsContent value="acoes" className="pt-4">
            <ActionsPanel ctx={ctx} presetRequirement={actionReq} onPresetUsed={clearActionReq} onSaved={reload} />
          </TabsContent>
          {isWise ? (
            <TabsContent value="roteiro" className="pt-4">
              <InterviewPanel elementNumber={element.number} storageKey={`${detail.assessmentId}:${element.code}`} />
            </TabsContent>
          ) : null}
          <TabsContent value="parecer" className="pt-4">
            <OpinionPanel ctx={ctx} />
          </TabsContent>
        </Tabs>
        <p className="px-6 pb-6 text-[11px] text-slate-400">
          Última atualização: {fmtDateTime(info.updatedAt)}
          {info.updatedBy ? ` por ${info.updatedBy}` : ""}
        </p>
      </div>
    </>
  );
}

function ScoreTile({
  label,
  value,
  suffix,
  sub,
  toneLabel,
  barClass,
  pct,
}: {
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  toneLabel: string;
  barClass: string;
  pct: number | null;
}) {
  return (
    <div className="w-56 rounded-xl border border-white/15 bg-white/10 p-3.5">
      <div className="flex items-center justify-between text-xs text-brand-100/80">
        <span>{label}</span>
        <span className="font-semibold text-white">{toneLabel}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold tabular-nums">{value}</span>
        {suffix ? <span className="text-sm text-brand-100/70">{suffix}</span> : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${(pct ?? 0) * 100}%` }} />
      </div>
      {sub ? <div className="mt-1.5 text-[11px] text-brand-100/80">{sub}</div> : null}
    </div>
  );
}

function InfoPanel({ detail, ctx }: { detail: ElementDetail; ctx: SheetCtx }) {
  const [pending, start] = useTransition();
  const { info, element } = detail;
  const save = (patch: { responsibleId?: string | null; status?: ElementStatus | null }) =>
    start(async () => {
      const res = await updateElementInfo({ assessmentId: detail.assessmentId, elementId: element.id, ...patch });
      if (res.ok && res.data) {
        ctx.setDetail(res.data);
        toast.success("Elemento atualizado");
      } else if (!res.ok) toast.error(res.error);
    });

  return (
    <section className="grid gap-4 border-b border-slate-200 bg-white px-6 py-5 md:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3">
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Objetivo</h4>
          <p className="mt-1 text-sm text-slate-700">{element.objective}</p>
        </div>
        {element.glossary ? (
          <details className="text-sm text-slate-600">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Glossário do elemento
            </summary>
            <p className="mt-1 text-xs leading-relaxed">{element.glossary}</p>
          </details>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Responsável</span>
          <Select
            value={info.responsibleId ?? ""}
            disabled={!ctx.perms.editElement || pending}
            onChange={(e) => save({ responsibleId: e.target.value || null })}
          >
            <option value="">Sem responsável</option>
            {detail.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</span>
          <Select
            value={info.statusManual ?? ""}
            disabled={!ctx.perms.editElement || pending}
            onChange={(e) => save({ status: (e.target.value || null) as ElementStatus | null })}
          >
            <option value="">Automático ({STATUS_LABEL[info.status]})</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Última atualização</span>
          <span className="text-sm text-slate-700">
            {fmtDateTime(info.updatedAt)}
            {info.updatedBy ? <span className="text-slate-400"> · {info.updatedBy}</span> : null}
          </span>
        </div>
      </div>
    </section>
  );
}

function OpinionPanel({ ctx }: { ctx: SheetCtx }) {
  const { detail } = ctx;
  const [summary, setSummary] = useState(detail.info.summary);
  const [rec, setRec] = useState(detail.info.recommendations);
  const [pending, start] = useTransition();
  const dirty = summary !== detail.info.summary || rec !== detail.info.recommendations;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-800">Avaliação e conclusões</h4>
        <p className="mb-2 text-xs text-slate-500">
          Resumo do raciocínio por trás da pontuação, com pontos positivos e negativos.
        </p>
        <Textarea
          rows={10}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={!ctx.perms.editElement}
          placeholder="Ex.: A liderança realiza caminhadas semanais, porém…"
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-800">Recomendações</h4>
        <p className="mb-2 text-xs text-slate-500">Atividades práticas para que o site suba um nível.</p>
        <Textarea
          rows={10}
          value={rec}
          onChange={(e) => setRec(e.target.value)}
          disabled={!ctx.perms.editElement}
          placeholder="Ex.: Formalizar a RACI de segurança por setor…"
        />
      </div>
      {ctx.perms.editElement ? (
        <div className="lg:col-span-2">
          <Button
            disabled={!dirty || pending}
            onClick={() =>
              start(async () => {
                const res = await updateElementInfo({
                  assessmentId: detail.assessmentId,
                  elementId: detail.element.id,
                  summary,
                  recommendations: rec,
                });
                if (res.ok && res.data) {
                  ctx.setDetail(res.data);
                  toast.success("Parecer salvo");
                } else if (!res.ok) toast.error(res.error);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null} Salvar parecer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
