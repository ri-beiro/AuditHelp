"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flag,
  Lightbulb,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { IncidentDetail } from "@/server/incident-queries";
import type { ActionDTO } from "@/server/queries";
import {
  addIncidentAttachment,
  approveLessons,
  closeIncident,
  deleteIncident,
  deleteIncidentAttachment,
  reloadIncident,
  updateIncident,
} from "@/server/incidents";
import { DEFAULT_AREAS, INCIDENT_TYPE_LABEL, INCIDENT_TYPES, type IncidentTypeKey, type Step } from "@/lib/incidents";
import { uploadFile } from "@/lib/upload-client";
import { fileHref } from "@/lib/file-url";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ActionFormDialog } from "@/components/actions/action-form";
import { ActionStatusBadge, isOverdue } from "@/components/actions/action-badges";
import { MonthCalendar } from "@/components/safety/month-calendar";
import { HipoBadge, StepBadge, TypeBadge } from "./bits";

type StepKey = "reporte" | "investigacao" | "plano" | "licoes" | "encerramento";

const STEPS: { key: StepKey; label: string; short: string; icon: typeof FileText }[] = [
  { key: "reporte", label: "Reporte", short: "Reporte", icon: FileText },
  { key: "investigacao", label: "Investigação", short: "Investig.", icon: CalendarClock },
  { key: "plano", label: "Plano de Ação", short: "Plano", icon: ClipboardList },
  { key: "licoes", label: "Lições Aprendidas", short: "Lições", icon: Lightbulb },
  { key: "encerramento", label: "Encerramento", short: "Encerr.", icon: Flag },
];

/** ISO → valor de <input type="datetime-local"> no fuso do navegador. */
function toLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type Ctx = {
  canManage: boolean;
  canApprove: boolean;
  isAdmin: boolean;
  blobEnabled: boolean;
  members: { id: string; name: string }[];
  elements: { id: string; label: string; code: string }[];
  areas: string[];
};

export function IncidentWorkflow({ initial, ctx, initialStep }: { initial: IncidentDetail; ctx: Ctx; initialStep?: string }) {
  const router = useRouter();
  const [inc, setInc] = useState(initial);
  const [pending, start] = useTransition();
  const firstOpen = (): StepKey => {
    if (inc.closed) return "encerramento";
    if (inc.steps.report !== "CONCLUIDO") return "reporte";
    if (inc.steps.investigation !== "CONCLUIDO") return "investigacao";
    if (inc.steps.plan !== "CONCLUIDO") return "plano";
    if (inc.steps.lessons !== "CONCLUIDO") return "licoes";
    return "encerramento";
  };
  const [step, setStep] = useState<StepKey>(STEPS.some((s) => s.key === initialStep) ? (initialStep as StepKey) : firstOpen());
  const editable = ctx.canManage && !inc.closed;

  const statusOf: Record<StepKey, Step> = {
    reporte: inc.steps.report,
    investigacao: inc.steps.investigation,
    plano: inc.steps.plan,
    licoes: inc.steps.lessons,
    encerramento: inc.closed ? "CONCLUIDO" : inc.progress === 100 ? "EM_ANDAMENTO" : "NAO_INICIADO",
  };

  type Res = { ok: true; data?: IncidentDetail | null } | { ok: false; error: string };
  const apply = (fn: () => Promise<Res>, msg?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data) setInc(res.data);
      if (msg) toast.success(msg);
      router.refresh();
    });

  const save = (patch: Omit<Parameters<typeof updateIncident>[0], "id">, msg = "Alterações salvas") =>
    apply(() => updateIncident({ id: inc.id, ...patch }), msg);

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <Link href="/incidentes" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <ArrowLeft className="size-4" /> Ocorrências
      </Link>

      {/* Cabeçalho */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-white p-5 shadow-soft",
          inc.hipo ? "border-critico/30" : "border-slate-200",
        )}
      >
        {inc.hipo ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-critico via-accent-500 to-critico" /> : <div className="wise-stripe absolute inset-x-0 top-0 h-1" />}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">{inc.number}</span>
              <TypeBadge type={inc.type} />
              {inc.hipo ? <HipoBadge /> : null}
              {inc.spheraId ? <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Sphera {inc.spheraId}</span> : null}
              {inc.closed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-conforme-bg px-2 py-0.5 text-[11px] font-semibold text-conforme">
                  <Lock className="size-3" /> Encerrada em {fmtDate(inc.closedAt)}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-brand-950">{inc.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {fmtDateTime(inc.occurredAt)} · {inc.area} · Responsável: {inc.responsible?.name ?? "a definir"}
              {inc.reportedBy ? ` · Reportado por ${inc.reportedBy}` : ""}
            </p>
          </div>
          <div className="w-full shrink-0 lg:w-72">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Progresso</span>
              <span className="text-2xl font-black tabular-nums text-brand-900">{inc.closed ? 100 : inc.progress}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full transition-all", inc.closed ? "bg-conforme" : "bg-gradient-to-r from-brand-600 via-wgreen-500 to-accent-500")}
                style={{ width: `${inc.closed ? 100 : inc.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stepper */}
        <ol className="mt-6 grid grid-cols-5 gap-1">
          {STEPS.map((s, idx) => {
            const st = statusOf[s.key];
            const done = st === "CONCLUIDO";
            const active = step === s.key;
            return (
              <li key={s.key} className="relative">
                {idx > 0 ? (
                  <span
                    className={cn(
                      "absolute right-1/2 top-5 h-0.5 w-full -translate-y-1/2",
                      statusOf[STEPS[idx - 1].key] === "CONCLUIDO" ? "bg-conforme" : "bg-slate-200",
                    )}
                  />
                ) : null}
                <button type="button" onClick={() => setStep(s.key)} className="group relative flex w-full flex-col items-center gap-1.5 text-center">
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-full border-2 transition-all",
                      done
                        ? "border-conforme bg-conforme text-white"
                        : st === "NAO_INICIADO"
                          ? "border-slate-200 bg-white text-slate-400"
                          : "border-brand-600 bg-brand-50 text-brand-700",
                      active && "scale-110 ring-4 ring-brand-500/25",
                    )}
                  >
                    {done ? <Check className="size-5" /> : <s.icon className="size-[18px]" />}
                  </span>
                  <span className={cn("text-[11px] font-semibold leading-tight sm:text-xs", active ? "text-brand-900" : "text-slate-600")}>
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                  <span className="hidden sm:block">
                    <StepBadge status={st} />
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums text-slate-400">{(idx + 1) * 25 - 25}%</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={cn(pending && "pointer-events-none opacity-70 transition-opacity")}>
        {step === "reporte" ? <ReportStep inc={inc} ctx={ctx} editable={editable} save={save} apply={apply} /> : null}
        {step === "investigacao" ? <InvestigationStep inc={inc} ctx={ctx} editable={editable} save={save} apply={apply} /> : null}
        {step === "plano" ? <PlanStep inc={inc} ctx={ctx} editable={editable} save={save} reload={() => apply(() => reloadIncident(inc.id))} /> : null}
        {step === "licoes" ? <LessonsStep inc={inc} ctx={ctx} editable={editable} save={save} apply={apply} /> : null}
        {step === "encerramento" ? (
          <ClosingStep
            inc={inc}
            ctx={ctx}
            goTo={setStep}
            onClose={(c) => apply(() => closeIncident(inc.id, c), c ? "Investigação encerrada" : "Ocorrência reaberta")}
            onDelete={() =>
              start(async () => {
                if (!confirm("Excluir definitivamente esta ocorrência? Os planos de ação vinculados permanecem.")) return;
                const res = await deleteIncident(inc.id);
                if (res.ok) {
                  toast.success("Ocorrência excluída");
                  router.push("/incidentes");
                } else toast.error(res.error);
              })
            }
          />
        ) : null}
      </div>
      {pending ? (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand-900 px-4 py-2 text-sm text-white shadow-lift">
          <Loader2 className="size-4 animate-spin" /> Salvando…
        </div>
      ) : null}
    </div>
  );
}

type SaveFn = (patch: Omit<Parameters<typeof updateIncident>[0], "id">, msg?: string) => void;
type ApplyFn = (fn: () => Promise<{ ok: true; data?: IncidentDetail | null } | { ok: false; error: string }>, msg?: string) => void;

function Panel({ title, description, icon: Icon, right, children }: { title: string; description?: string; icon: typeof FileText; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-brand-950">{title}</h2>
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          </div>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function StatusSelect({ value, options, onChange, disabled }: { value: Step; options: Step[]; onChange: (s: Step) => void; disabled?: boolean }) {
  const label: Record<Step, string> = { NAO_INICIADO: "Não iniciado", EM_ANDAMENTO: "Em andamento", AGENDADO: "Agendado", CONCLUIDO: "Concluído" };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">Status da etapa</span>
      <Select className="w-40" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as Step)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {label[o]}
          </option>
        ))}
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Etapa 1 — Reporte
// ---------------------------------------------------------------------------

function ReportStep({ inc, ctx, editable, save, apply }: { inc: IncidentDetail; ctx: Ctx; editable: boolean; save: SaveFn; apply: ApplyFn }) {
  const [f, setF] = useState({
    occurredAt: toLocal(inc.occurredAt),
    area: inc.area,
    type: inc.type as IncidentTypeKey,
    hipo: inc.hipo,
    title: inc.title,
    description: inc.description,
    responsibleId: inc.responsibleId ?? "",
    spheraId: inc.spheraId ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const payload = () => ({ ...f, occurredAt: new Date(f.occurredAt).toISOString(), responsibleId: f.responsibleId || null });
  const areas = [...new Set([...ctx.areas, ...DEFAULT_AREAS])];
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel
        title="Etapa 1 · Reporte"
        description="Dados do evento. Conclua a etapa quando as informações estiverem validadas."
        icon={FileText}
        right={
          <StatusSelect
            value={inc.steps.report}
            options={["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO"]}
            disabled={!editable}
            onChange={(s) => save({ ...payload(), reportStatus: s as "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO" }, "Etapa atualizada")}
          />
        }
      >
        <fieldset disabled={!editable} className="grid gap-4 sm:grid-cols-2">
          <Field label="Data e hora">
            <Input type="datetime-local" value={f.occurredAt} onChange={set("occurredAt")} required />
          </Field>
          <Field label="Área">
            <Input list="areas-detail" value={f.area} onChange={set("area")} />
            <datalist id="areas-detail">
              {areas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>
          <Field label="Classificação">
            <Select value={f.type} onChange={set("type")}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INCIDENT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsável">
            <Select value={f.responsibleId} onChange={set("responsibleId")}>
              <option value="">A definir</option>
              {ctx.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <label className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm sm:col-span-2", f.hipo ? "border-critico/40 bg-critico-bg" : "border-slate-200")}>
            <input type="checkbox" checked={f.hipo} onChange={(e) => setF({ ...f, hipo: e.target.checked })} />
            <span className="font-semibold text-slate-800">HIPO — alto potencial de lesão grave ou fatalidade</span>
          </label>
          <Field label="Título" className="sm:col-span-2">
            <Input value={f.title} onChange={set("title")} />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <Textarea rows={5} value={f.description} onChange={set("description")} />
          </Field>
          <Field label="ID Sphera">
            <Input value={f.spheraId} onChange={set("spheraId")} />
          </Field>
          {editable ? (
            <div className="flex items-end justify-end">
              <Button type="button" onClick={() => save(payload())}>
                <Save /> Salvar reporte
              </Button>
            </div>
          ) : null}
        </fieldset>
      </Panel>
      <Attachments inc={inc} ctx={ctx} apply={apply} title="Evidências do evento" hint="Fotos do local, croquis, relatos, documentos." />
    </div>
  );
}

function Attachments({ inc, ctx, apply, title, hint }: { inc: IncidentDetail; ctx: Ctx; apply: ApplyFn; title: string; hint: string }) {
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, `incidentes/${inc.id}`, ctx.blobEnabled);
        apply(() => addIncidentAttachment({ incidentId: inc.id, name: file.name, url, mimeType: file.type || null, size: file.size }), "Anexo enviado");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title={title} description={hint} icon={Paperclip}>
      {!inc.closed ? (
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 hover:border-brand-300 hover:bg-brand-50/40">
          {busy ? <Loader2 className="size-5 animate-spin text-brand-600" /> : <Upload className="size-5 text-brand-600" />}
          <span className="font-semibold text-slate-700">Enviar arquivos</span>
          <span className="text-xs">Imagens, PDF, Office — até o limite configurado</span>
          <input type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        </label>
      ) : null}
      <ul className="mt-3 space-y-2">
        {inc.attachments.length === 0 ? <li className="text-sm text-slate-400">Nenhum anexo.</li> : null}
        {inc.attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
            {a.mimeType?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileHref(a.url)} alt="" className="size-10 rounded-lg object-cover" />
            ) : (
              <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <a href={fileHref(a.url)} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-brand-700 hover:underline">
                {a.name}
              </a>
              <p className="text-[11px] text-slate-400">
                {fmtDateTime(a.createdAt)}
                {a.uploadedBy ? ` · ${a.uploadedBy}` : ""}
              </p>
            </div>
            {!inc.closed ? (
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-critico-bg hover:text-critico"
                title="Remover"
                onClick={() => confirm("Remover este anexo?") && apply(() => deleteIncidentAttachment(a.id), "Anexo removido")}
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Etapa 2 — Investigação / agenda
// ---------------------------------------------------------------------------

function InvestigationStep({ inc, ctx, editable, save, apply }: { inc: IncidentDetail; ctx: Ctx; editable: boolean; save: SaveFn; apply: ApplyFn }) {
  const [f, setF] = useState({
    meetingAt: toLocal(inc.meetingAt),
    participants: inc.participants,
    meetingNotes: inc.meetingNotes,
  });
  const day = f.meetingAt.slice(0, 10) || null;
  const payload = () => ({ ...f, meetingAt: f.meetingAt ? new Date(f.meetingAt).toISOString() : null });
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <Panel title="Agenda da investigação" description="Clique em um dia para marcar a reunião." icon={CalendarClock}>
          <MonthCalendar
            compact
            initialDate={inc.meetingAt ?? inc.occurredAt}
            selected={day}
            onSelectDay={editable ? (d) => setF({ ...f, meetingAt: `${d}T${f.meetingAt.slice(11, 16) || "09:00"}` }) : undefined}
            events={[
              { id: "occ", date: inc.occurredAt, label: "Ocorrência", color: "#c9281f" },
              ...(inc.meetingAt ? [{ id: "meet", date: inc.meetingAt, label: "Reunião", color: "#13508a" }] : []),
            ]}
          />
          <p className="mt-2 flex gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-critico" /> Ocorrência
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-brand-700" /> Reunião agendada
            </span>
          </p>
        </Panel>
      </div>
      <Panel
        title="Etapa 2 · Investigação"
        description="Reunião de análise com os envolvidos e registro da ata."
        icon={CalendarClock}
        right={
          <StatusSelect
            value={inc.steps.investigation}
            options={["NAO_INICIADO", "AGENDADO", "CONCLUIDO"]}
            disabled={!editable}
            onChange={(s) => save({ ...payload(), investigationStatus: s as "NAO_INICIADO" | "AGENDADO" | "CONCLUIDO" }, "Etapa atualizada")}
          />
        }
      >
        <fieldset disabled={!editable} className="grid gap-4">
          <Field label="Data e hora da reunião">
            <Input type="datetime-local" value={f.meetingAt} onChange={(e) => setF({ ...f, meetingAt: e.target.value })} />
          </Field>
          <Field label="Participantes">
            <Textarea rows={3} value={f.participants} onChange={(e) => setF({ ...f, participants: e.target.value })} placeholder="Nome — função (um por linha)" />
          </Field>
          <Field label="Registro da reunião / ata">
            <Textarea rows={8} value={f.meetingNotes} onChange={(e) => setF({ ...f, meetingNotes: e.target.value })} placeholder="Fatos levantados, entrevistas, análise (5 porquês, Ishikawa), conclusões…" />
          </Field>
          {editable ? (
            <div className="flex flex-wrap justify-end gap-2">
              {f.meetingAt && inc.steps.investigation === "NAO_INICIADO" ? (
                <Button type="button" variant="outline" onClick={() => save({ ...payload(), investigationStatus: "AGENDADO" }, "Reunião agendada")}>
                  <CalendarClock /> Agendar
                </Button>
              ) : null}
              <Button type="button" onClick={() => save(payload())}>
                <Save /> Salvar investigação
              </Button>
            </div>
          ) : null}
        </fieldset>
        <div className="mt-5">
          <Attachments inc={inc} ctx={ctx} apply={apply} title="Ata e documentos" hint="Anexe a ata assinada, lista de presença e análises." />
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Etapa 3 — Plano de ação (mesmos registros da aba Planos de Ação)
// ---------------------------------------------------------------------------

function PlanStep({ inc, ctx, editable, save, reload }: { inc: IncidentDetail; ctx: Ctx; editable: boolean; save: SaveFn; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActionDTO | null>(null);
  const list = inc.actionList;
  const done = list.filter((a) => a.status === "CONCLUIDA" || a.status === "CANCELADA").length;
  const overdue = list.filter(isOverdue).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const w11 = ctx.elements.find((e) => e.code === "W11");
  return (
    <Panel
      title="Etapa 3 · Plano de Ação"
      description="As ações ficam sincronizadas com a aba Planos de Ação. A etapa conclui quando todas as ações forem concluídas."
      icon={ClipboardList}
      right={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/acoes?q=${encodeURIComponent(inc.number)}`}>Ver em Planos de Ação</Link>
          </Button>
          {editable ? (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus /> Nova ação
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Ações", value: list.length, cls: "text-brand-900" },
          { label: "Abertas", value: list.length - done, cls: "text-brand-700" },
          { label: "Vencidas", value: overdue, cls: overdue ? "text-critico" : "text-slate-400" },
          { label: "% concluído", value: `${pct}%`, cls: "text-conforme" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className={cn("text-2xl font-extrabold tabular-nums", k.cls)}>{k.value}</p>
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>
      {overdue ? (
        <p className="mt-3 rounded-xl border border-critico/30 bg-critico-bg px-3 py-2 text-sm font-medium text-critico">
          {overdue} ação(ões) com prazo vencido — atualize o status ou renegocie o prazo.
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">Ação</th>
              <th className="px-3 py-2.5 font-medium">Responsável</th>
              <th className="px-3 py-2.5 font-medium">Prazo</th>
              <th className="px-3 py-2.5 font-medium">Evidência</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Nenhuma ação cadastrada.
                  {editable && inc.steps.plan !== "CONCLUIDO" ? (
                    <button type="button" className="ml-1 font-semibold text-brand-700 hover:underline" onClick={() => save({ planStatus: "CONCLUIDO" }, "Etapa concluída sem ações")}>
                      Concluir etapa sem ações necessárias
                    </button>
                  ) : null}
                  {editable && inc.steps.plan === "CONCLUIDO" ? (
                    <button type="button" className="ml-1 font-semibold text-brand-700 hover:underline" onClick={() => save({ planStatus: "NAO_INICIADO" }, "Etapa reaberta")}>
                      Reabrir etapa
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              list.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 align-top">
                  <td className="max-w-sm px-3 py-2.5">
                    <p className="font-medium text-slate-800">{a.what}</p>
                    {a.how ? <p className="line-clamp-2 text-xs text-slate-500">{a.how}</p> : null}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{a.ownerName ?? <span className="text-slate-400">A definir</span>}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">{fmtDate(a.dueDate)}</td>
                  <td className="max-w-[200px] px-3 py-2.5 text-xs text-slate-600">
                    {a.evidence ? (
                      /^https?:\/\//.test(a.evidence) ? (
                        <a href={a.evidence} target="_blank" rel="noreferrer" className="break-all text-brand-700 hover:underline">
                          {a.evidence}
                        </a>
                      ) : (
                        a.evidence
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <ActionStatusBadge value={a.status} overdue={isOverdue(a)} />
                  </td>
                  <td className="px-3 py-2.5">
                    {editable ? (
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Editar"
                        onClick={() => {
                          setEditing(a);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ActionFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        preset={{
          incidentId: inc.id,
          elementId: w11?.id,
          why: `Ocorrência ${inc.number}: ${inc.title}`,
          where: inc.area,
          priority: inc.hipo ? "CRITICA" : "ALTA",
        }}
        context={{ unitId: inc.unitId, elements: ctx.elements, members: ctx.members }}
        onSaved={reload}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Etapa 4 — Lições aprendidas
// ---------------------------------------------------------------------------

function LessonsStep({ inc, ctx, editable, save, apply }: { inc: IncidentDetail; ctx: Ctx; editable: boolean; save: SaveFn; apply: ApplyFn }) {
  const [f, setF] = useState({
    rootCause: inc.rootCause,
    whatHappened: inc.whatHappened,
    howToPrevent: inc.howToPrevent,
    goodPractices: inc.goodPractices,
    sharedWith: inc.sharedWith,
  });
  const fields: { k: keyof typeof f; label: string; ph: string; rows: number }[] = [
    { k: "whatHappened", label: "O que aconteceu", ph: "Resumo objetivo do evento e de suas consequências", rows: 3 },
    { k: "rootCause", label: "Causa raiz", ph: "Resultado da análise (5 porquês / Ishikawa)", rows: 3 },
    { k: "howToPrevent", label: "O que poderia ter evitado", ph: "Barreiras que faltaram ou falharam", rows: 3 },
    { k: "goodPractices", label: "Boas práticas", ph: "O que funcionou bem e deve ser replicado", rows: 3 },
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel
        title="Etapa 4 · Lições Aprendidas"
        description="Após aprovação, a lição entra no banco de lições pesquisável."
        icon={Lightbulb}
        right={inc.steps.lessons !== "CONCLUIDO" && editable && inc.steps.lessons === "NAO_INICIADO" ? (
          <Button variant="outline" size="sm" onClick={() => save({ ...f, lessonsStatus: "EM_ANDAMENTO" }, "Etapa iniciada")}>
            Iniciar etapa
          </Button>
        ) : <StepBadge status={inc.steps.lessons} />}
      >
        <fieldset disabled={!editable || !!inc.approvedAt} className="grid gap-4">
          {fields.map((x) => (
            <Field key={x.k} label={x.label}>
              <Textarea rows={x.rows} value={f[x.k]} placeholder={x.ph} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />
            </Field>
          ))}
          <Field label="Compartilhamento">
            <Input value={f.sharedWith} placeholder="Ex.: DDS de todos os turnos, Reunião CDs, alerta regional" onChange={(e) => setF({ ...f, sharedWith: e.target.value })} />
          </Field>
          {editable && !inc.approvedAt ? (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => save({ ...f, lessonsStatus: inc.steps.lessons === "NAO_INICIADO" ? "EM_ANDAMENTO" : undefined })}
              >
                <Save /> Salvar lições
              </Button>
            </div>
          ) : null}
        </fieldset>
      </Panel>
      <Panel title="Aprovação" description="Auditores e administradores aprovam a lição aprendida." icon={ShieldCheck}>
        {inc.approvedAt ? (
          <div className="rounded-xl border border-conforme/30 bg-conforme-bg p-4">
            <p className="flex items-center gap-2 font-semibold text-conforme">
              <CheckCircle2 className="size-5" /> Aprovada
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {inc.approvedBy ?? "—"} · {fmtDateTime(inc.approvedAt)}
            </p>
            {ctx.canApprove && !inc.closed ? (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => apply(() => approveLessons(inc.id, false), "Aprovação revogada")}>
                <XCircle /> Revogar aprovação
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {f.rootCause.trim() ? "Lição pronta para avaliação." : "Preencha e salve a causa raiz antes de enviar para aprovação."}
            </p>
            {ctx.canApprove && !inc.closed ? (
              <Button variant="green" disabled={!inc.rootCause.trim()} onClick={() => apply(() => approveLessons(inc.id, true), "Lição aprovada")}>
                <ShieldCheck /> Aprovar lição aprendida
              </Button>
            ) : (
              <p className="text-xs text-slate-400">Aguardando aprovação de um auditor.</p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Encerramento
// ---------------------------------------------------------------------------

function ClosingStep({
  inc,
  ctx,
  goTo,
  onClose,
  onDelete,
}: {
  inc: IncidentDetail;
  ctx: Ctx;
  goTo: (s: StepKey) => void;
  onClose: (close: boolean) => void;
  onDelete: () => void;
}) {
  const checks: { key: StepKey; label: string; st: Step }[] = [
    { key: "reporte", label: "Reporte validado", st: inc.steps.report },
    { key: "investigacao", label: "Investigação concluída", st: inc.steps.investigation },
    { key: "plano", label: "Plano de ação concluído", st: inc.steps.plan },
    { key: "licoes", label: "Lições aprendidas aprovadas", st: inc.steps.lessons },
  ];
  return (
    <Panel title="Encerramento" description="A ocorrência só pode ser encerrada com as quatro etapas concluídas (100%)." icon={Flag}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              onClick={() => goTo(c.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-brand-200",
                c.st === "CONCLUIDO" ? "border-conforme/30 bg-conforme-bg/60" : "border-slate-200",
              )}
            >
              {c.st === "CONCLUIDO" ? <CheckCircle2 className="size-5 text-conforme" /> : <span className="size-5 rounded-full border-2 border-slate-300" />}
              <span className="flex-1 text-sm font-medium text-slate-800">{c.label}</span>
              <StepBadge status={c.st} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {ctx.canManage ? (
            inc.closed ? (
              <Button variant="outline" onClick={() => onClose(false)}>
                <RotateCcw /> Reabrir ocorrência
              </Button>
            ) : (
              <Button variant="green" disabled={inc.progress < 100} onClick={() => onClose(true)}>
                <Lock /> Encerrar investigação
              </Button>
            )
          ) : null}
        </div>
        {ctx.isAdmin ? (
          <Button variant="ghost" className="text-critico hover:bg-critico-bg hover:text-critico" onClick={onDelete}>
            <Trash2 /> Excluir ocorrência
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
