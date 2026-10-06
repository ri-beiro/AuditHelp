"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  ListPlus,
  Loader2,
  Lock,
  Printer,
  Save,
  Trash2,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import {
  addAuditAttachment,
  deleteAudit,
  deleteAuditAttachment,
  reloadAudit,
  saveAuditAnswer,
  updateAuditInfo,
  type AuditState,
} from "@/server/audits";
import { scoreAudit, type AuditItem, type AuditTemplate } from "@/lib/audit-templates";
import { complianceGrade } from "@/lib/scoring";
import { uploadFile } from "@/lib/upload-client";
import { UPLOAD_ACCEPT } from "@/lib/uploads";
import { ACTION_STATUS_LABEL, cn, fmtDate, fmtDateTime, fmtPct } from "@/lib/utils";
import { fileHref } from "@/lib/file-url";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { GradeBadge } from "@/components/grade-badge";
import { ScoreScale, type ScaleOption } from "@/components/element/requirement-row";
import { ActionFormDialog, type ActionPreset } from "@/components/actions/action-form";

const OPTIONS: ScaleOption[] = [
  { value: "C", short: "C", label: "Conforme", className: "bg-conforme text-white" },
  { value: "NC", short: "NC", label: "Não conforme", className: "bg-critico text-white" },
  { value: "NA", short: "N/A", label: "Não aplicável", className: "bg-slate-500 text-white" },
];

// Checklist simplificado: perguntas que agrupam vários pontos aceitam "Parcial".
const OPTIONS_PARTIAL: ScaleOption[] = [
  { value: "C", short: "Sim", label: "Sim — todos os pontos atendidos", className: "bg-conforme text-white" },
  { value: "P", short: "Parcial", label: "Parcial — algum ponto não atendido", className: "bg-atencao text-white" },
  { value: "NC", short: "Não", label: "Não — pontos principais não atendidos", className: "bg-critico text-white" },
  { value: "NA", short: "N/A", label: "Não aplicável", className: "bg-slate-500 text-white" },
];

type AuditInfo = {
  id: string;
  unitId: string;
  unitName: string;
  contractor: string;
  auditDate: string;
  auditorId: string | null;
  auditorName: string | null;
  accompaniedBy: string;
  strengths: string;
  opportunities: string;
  conclusion: string;
};

type Perms = { score: boolean; evidence: boolean; action: boolean; admin: boolean };

export function AuditRunner({
  audit,
  template,
  initialState,
  members,
  elements,
  perms,
  blobEnabled,
}: {
  audit: AuditInfo;
  template: AuditTemplate;
  initialState: AuditState;
  members: { id: string; name: string }[];
  elements: { id: string; code: string; label: string }[];
  perms: Perms;
  blobEnabled: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [info, setInfo] = useState(audit);
  const [filter, setFilter] = useState<"" | "pendentes" | "nc" | "criticos">("");
  const [actionPreset, setActionPreset] = useState<ActionPreset | null>(null);
  const [pending, start] = useTransition();
  const locked = state.status === "CONCLUIDA";
  const canScore = perms.score && !locked;

  const answers = useMemo(
    () => Object.fromEntries(Object.entries(state.answers).map(([k, v]) => [k, v.value])),
    [state.answers],
  );
  const score = scoreAudit(template, answers);
  const grade = complianceGrade(score.pct);

  const setAnswer = (itemCode: string, patch: { value?: string | null; observation?: string }) =>
    start(async () => {
      if (patch.value !== undefined) {
        setState((s) => ({
          ...s,
          answers: {
            ...s.answers,
            [itemCode]: {
              ...(s.answers[itemCode] ?? { observation: "", updatedAt: new Date().toISOString(), updatedBy: null }),
              value: patch.value ?? null,
            },
          },
        }));
      }
      const res = await saveAuditAnswer({ auditId: audit.id, itemCode, ...patch });
      if (res.ok && res.data) setState(res.data);
      else if (!res.ok) toast.error(res.error);
    });

  const saveInfo = (patch: Partial<AuditInfo> & { status?: "EM_ANDAMENTO" | "CONCLUIDA" }, msg = "Auditoria atualizada") =>
    start(async () => {
      const res = await updateAuditInfo({
        auditId: audit.id,
        contractor: patch.contractor,
        auditDate: patch.auditDate?.slice(0, 10),
        auditorId: patch.auditorId,
        accompaniedBy: patch.accompaniedBy,
        strengths: patch.strengths,
        opportunities: patch.opportunities,
        conclusion: patch.conclusion,
        status: patch.status,
      });
      if (res.ok) {
        toast.success(msg);
        if (patch.status) setState((s) => ({ ...s, status: patch.status! }));
        router.refresh();
      } else toast.error(res.error);
    });

  const matches = (i: AuditItem) => {
    const v = answers[i.code];
    return filter === "pendentes" ? !v : filter === "nc" ? v === "NC" || v === "P" : filter === "criticos" ? !!i.critical : true;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/auditorias" className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
          <ArrowLeft className="size-4" /> Auditorias
        </Link>
        <div className="ml-auto flex flex-wrap gap-2">
          {perms.score ? (
            locked ? (
              <Button variant="outline" onClick={() => saveInfo({ status: "EM_ANDAMENTO" }, "Auditoria reaberta")} disabled={pending}>
                <Unlock /> Reabrir
              </Button>
            ) : (
              <Button
                variant="green"
                disabled={pending}
                onClick={() => {
                  if (score.answered < score.total && !confirm(`Ainda há ${score.total - score.answered} item(ns) sem avaliação. Concluir mesmo assim?`)) return;
                  saveInfo({ status: "CONCLUIDA" }, "Auditoria concluída");
                }}
              >
                <Lock /> Concluir auditoria
              </Button>
            )
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir / PDF
          </Button>
          {perms.admin ? (
            <Button
              variant="ghost"
              onClick={() =>
                confirm("Excluir esta auditoria e todas as respostas? Esta ação não pode ser desfeita.") &&
                start(async () => {
                  const res = await deleteAudit(audit.id);
                  if (res.ok) router.push("/auditorias");
                  else toast.error(res.error);
                })
              }
            >
              <Trash2 /> Excluir
            </Button>
          ) : null}
        </div>
      </div>

      {/* Cabeçalho */}
      <section className="rounded-2xl wise-hero p-6 text-white shadow-lg print:rounded-none">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{template.name}</p>
            <h1 className="mt-1 text-2xl font-extrabold">{info.contractor}</h1>
            <p className="mt-1 text-sm text-brand-100/80">
              {info.unitName} · {fmtDate(info.auditDate)} · Auditor: {info.auditorName ?? "—"}
              {info.accompaniedBy ? ` · Acompanhado por ${info.accompaniedBy}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className={cn("rounded-full px-2.5 py-1 font-semibold", locked ? "bg-conforme text-white" : "bg-white/15")}>
                {locked ? "Concluída" : "Em andamento"}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1">
                {score.answered}/{score.total} itens avaliados
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1">{score.naoConformes} não conformes</span>
              {score.parciais ? <span className="rounded-full bg-white/15 px-2.5 py-1">{score.parciais} parciais</span> : null}
              {score.criticalNc ? (
                <span className="flex items-center gap-1 rounded-full bg-critico px-2.5 py-1 font-semibold">
                  <AlertOctagon className="size-3" /> {score.criticalNc} crítico(s) · nota limitada a 50%
                </span>
              ) : null}
            </div>
          </div>
          <div className="glass flex items-center gap-4 rounded-2xl border p-4 backdrop-blur-md">
            <GradeBadge grade={grade} size="xl" />
            <div>
              <div className="text-xs text-brand-100/80">Conformidade</div>
              <div className="text-3xl font-extrabold tabular-nums">{fmtPct(score.pct)}</div>
              <div className="text-[11px] text-brand-100/80">
                {grade ? `Classe ${grade}` : "Sem itens avaliados"}
                {score.capped ? ` · sem limitador: ${fmtPct(score.rawPct)}` : ""}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dados da auditoria */}
      {perms.score ? (
        <AuditHeaderForm info={info} members={members} disabled={locked || pending} onSave={(p) => { setInfo({ ...info, ...p }); saveInfo(p); }} />
      ) : null}

      {/* Seções */}
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {score.sections.map((s) => (
          <a key={s.code} href={`#sec-${s.code}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-brand-500/40">
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-1 text-xs font-semibold text-slate-700">{s.title}</span>
              <span className="text-sm font-bold tabular-nums text-slate-900">{fmtPct(s.pct)}</span>
            </div>
            <Progress value={s.pct} className="mt-2 h-1.5" barClassName={s.nc ? "bg-atencao" : "bg-conforme"} />
            <div className="mt-1 text-[11px] text-slate-500">
              {s.answered}/{s.total} · {s.nc} desvio(s)
            </div>
          </a>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-1 text-xs print:hidden">
        {(
          [
            ["", "Todos"],
            ["pendentes", "Não avaliados"],
            ["nc", template.partial ? "Com desvio (Parcial/Não)" : "Não conformes"],
            ["criticos", "Somente críticos"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn("rounded-md px-2.5 py-1 font-medium", filter === k ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-slate-500">
          {template.partial
            ? "Sim = todos os pontos atendidos (1) · Parcial = algum ponto falha (0,5) · Não = 0 · N/A fora do cálculo"
            : "C = Conforme · NC = Não conforme · N/A = Não aplicável"}
        </span>
      </div>

      {template.sections.map((sec) => {
        const items = sec.items.filter(matches);
        if (!items.length) return null;
        return (
          <section key={sec.code} id={`sec-${sec.code}`} className="scroll-mt-20 space-y-2">
            <div className="rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 py-2.5 text-white shadow-soft">
              <div className="text-sm font-semibold">
                {sec.code} · {sec.title}
              </div>
              {sec.description ? <div className="text-[11px] text-white/90">{sec.description}</div> : null}
            </div>
            {items.map((item) => (
              <AuditItemRow
                key={item.code}
                item={item}
                answer={state.answers[item.code]}
                attachments={state.attachments.filter((a) => a.itemCode === item.code)}
                actions={state.actions.filter((a) => a.itemCode === item.code)}
                canScore={canScore}
                canAttach={perms.evidence && !locked}
                canAction={perms.action}
                onAnswer={(patch) => setAnswer(item.code, patch)}
                onUpload={async (files) => {
                  for (const file of Array.from(files)) {
                    try {
                      const url = await uploadFile(file, `auditorias/${audit.id}`, blobEnabled);
                      const res = await addAuditAttachment({
                        auditId: audit.id,
                        itemCode: item.code,
                        name: file.name,
                        url,
                        mimeType: file.type || null,
                        size: file.size,
                      });
                      if (res.ok && res.data) setState(res.data);
                      else if (!res.ok) throw new Error(res.error);
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }
                }}
                onDeleteAttachment={(id) =>
                  start(async () => {
                    const res = await deleteAuditAttachment(id);
                    if (res.ok && res.data) setState(res.data);
                  })
                }
                onCreateAction={() =>
                  setActionPreset({
                    elementId: elements.find((e) => e.code === "B11")?.id,
                    auditId: audit.id,
                    auditItemCode: item.code,
                    why: `Não conformidade na auditoria de ${template.shortName} (${info.contractor}) — item ${item.code}: ${item.text}`,
                    where: template.shortName,
                    priority: item.critical ? "ALTA" : "MEDIA",
                  })
                }
              />
            ))}
          </section>
        );
      })}

      {/* Fechamento */}
      <ClosingForm info={info} disabled={!perms.score || locked} onSave={(p) => { setInfo({ ...info, ...p }); saveInfo(p, "Fechamento salvo"); }} pending={pending} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Planos de ação desta auditoria ({state.actions.length})</h3>
        {state.actions.length ? (
          <ul className="divide-y divide-slate-100">
            {state.actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{a.itemCode}</span>
                <span className="min-w-0 flex-1 text-slate-800">{a.what}</span>
                <span className="text-xs text-slate-500">{a.ownerName ?? "A definir"}</span>
                <span className="text-xs tabular-nums text-slate-500">{fmtDate(a.dueDate)}</span>
                {a.spheraId ? <span className="text-xs text-slate-500">Sphera {a.spheraId}</span> : null}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{ACTION_STATUS_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Crie planos de ação a partir dos itens não conformes.</p>
        )}
        <Link href="/acoes" className="mt-3 inline-block text-xs text-brand-700 hover:underline print:hidden">
          Gerenciar na página de Planos de Ação →
        </Link>
      </section>

      <ActionFormDialog
        open={!!actionPreset}
        onOpenChange={(o) => !o && setActionPreset(null)}
        preset={actionPreset ?? undefined}
        context={{ unitId: audit.unitId, elements: elements.map((e) => ({ id: e.id, label: e.label })), members }}
        onSaved={async () => {
          const res = await reloadAudit(audit.id);
          if (res.ok && res.data) setState(res.data);
        }}
      />
    </div>
  );
}

function AuditItemRow({
  item,
  answer,
  attachments,
  actions,
  canScore,
  canAttach,
  canAction,
  onAnswer,
  onUpload,
  onDeleteAttachment,
  onCreateAction,
}: {
  item: AuditItem;
  answer?: { value: string | null; observation: string; updatedAt: string; updatedBy: string | null };
  attachments: AuditState["attachments"];
  actions: AuditState["actions"];
  canScore: boolean;
  canAttach: boolean;
  canAction: boolean;
  onAnswer: (p: { value?: string | null; observation?: string }) => void;
  onUpload: (files: FileList) => Promise<void>;
  onDeleteAttachment: (id: string) => void;
  onCreateAction: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState(answer?.observation ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nc = answer?.value === "NC";
  const partial = answer?.value === "P";
  return (
    <div
      className={cn(
        "rounded-lg border bg-white print:break-inside-avoid",
        nc ? "border-l-4 border-critico/50 border-l-critico" : partial ? "border-l-4 border-atencao/50 border-l-atencao" : "border-slate-200",
      )}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
        <button onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-slate-400 transition-transform print:hidden", !open && "-rotate-90")} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">{item.code}</span>
              {item.critical ? (
                <span className="rounded border border-critico/30 bg-critico-bg px-1.5 py-px text-[10px] font-semibold text-critico">Crítico</span>
              ) : null}
              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[10px] text-slate-500">{item.ref}</span>
            </div>
            <p className={cn("leading-snug text-slate-800", item.checks ? "text-[15px] font-semibold" : "text-sm")}>{item.text}</p>
            {item.checks ? (
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {item.checks.map((c) => (
                  <li key={c} className="flex gap-1.5 text-[12.5px] leading-snug text-slate-600">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {item.hint ? <p className="mt-1 text-[11px] italic text-slate-500">{item.hint}</p> : null}
            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-400">
              {answer?.observation ? <span className="text-slate-500">Observação registrada</span> : null}
              {attachments.length ? (
                <span className="flex items-center gap-1 text-brand-700">
                  <Camera className="size-3" /> {attachments.length} anexo(s)
                </span>
              ) : null}
              {actions.length ? <span className="text-atencao-ink">{actions.length} plano(s) de ação</span> : null}
            </div>
            {answer?.observation ? <p className="mt-1 hidden text-xs text-slate-600 print:block">Obs.: {answer.observation}</p> : null}
          </div>
        </button>
        <div className="self-end sm:self-start">
          <ScoreScale options={item.checks ? OPTIONS_PARTIAL : OPTIONS} value={answer?.value ?? null} disabled={!canScore} onChange={(v) => onAnswer({ value: v })} />
        </div>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 pl-9 print:hidden">
          <Textarea
            className="min-h-16 bg-white"
            value={obs}
            disabled={!canScore}
            onChange={(e) => setObs(e.target.value)}
            onBlur={() => obs !== (answer?.observation ?? "") && onAnswer({ observation: obs })}
            placeholder="Evidência observada, entrevistado, local, documento verificado…"
          />
          {attachments.length ? (
            <ul className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <li key={a.id} className="group relative">
                  {a.mimeType?.startsWith("image/") ? (
                    <a href={fileHref(a.url)} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileHref(a.url)} alt={a.name} className="size-20 rounded-lg object-cover ring-1 ring-slate-200" />
                    </a>
                  ) : (
                    <a
                      href={fileHref(a.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-20 w-36 items-center gap-1 rounded-lg bg-white p-2 text-xs text-brand-700 ring-1 ring-slate-200"
                    >
                      <ExternalLink className="size-3 shrink-0" /> <span className="line-clamp-3">{a.name}</span>
                    </a>
                  )}
                  {canAttach ? (
                    <button
                      onClick={() => confirm("Remover anexo?") && onDeleteAttachment(a.id)}
                      className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-white p-1 text-critico shadow group-hover:block"
                      title="Remover"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {canAttach ? (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />} Foto / documento
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={UPLOAD_ACCEPT}
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    if (!e.target.files?.length) return;
                    setBusy(true);
                    await onUpload(e.target.files);
                    setBusy(false);
                    e.target.value = "";
                  }}
                />
              </>
            ) : null}
            {canAction ? (
              <button
                onClick={onCreateAction}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
                  nc ? "border-accent-500/40 bg-accent-50 text-accent-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                <ListPlus className="size-3.5" /> Criar plano de ação
              </button>
            ) : null}
            {answer?.updatedAt ? (
              <span className="ml-auto text-[11px] text-slate-400">
                {fmtDateTime(answer.updatedAt)}
                {answer.updatedBy ? ` · ${answer.updatedBy}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AuditHeaderForm({
  info,
  members,
  disabled,
  onSave,
}: {
  info: AuditInfo;
  members: { id: string; name: string }[];
  disabled: boolean;
  onSave: (p: Partial<AuditInfo>) => void;
}) {
  const [f, setF] = useState({
    contractor: info.contractor,
    auditDate: info.auditDate.slice(0, 10),
    auditorId: info.auditorId ?? "",
    accompaniedBy: info.accompaniedBy,
  });
  const dirty =
    f.contractor !== info.contractor ||
    f.auditDate !== info.auditDate.slice(0, 10) ||
    f.auditorId !== (info.auditorId ?? "") ||
    f.accompaniedBy !== info.accompaniedBy;
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 print:hidden">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">Dados da auditoria</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Empresa contratada" className="lg:col-span-2">
          <Input value={f.contractor} disabled={disabled} onChange={(e) => setF({ ...f, contractor: e.target.value })} />
        </Field>
        <Field label="Data">
          <Input type="date" value={f.auditDate} disabled={disabled} onChange={(e) => setF({ ...f, auditDate: e.target.value })} />
        </Field>
        <Field label="Auditor">
          <Select value={f.auditorId} disabled={disabled} onChange={(e) => setF({ ...f, auditorId: e.target.value })}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Acompanhado por">
          <Input value={f.accompaniedBy} disabled={disabled} onChange={(e) => setF({ ...f, accompaniedBy: e.target.value })} />
        </Field>
      </div>
      <Button
        size="sm"
        className="mt-3"
        disabled={!dirty || disabled}
        onClick={() =>
          onSave({
            ...f,
            auditDate: f.auditDate,
            auditorName: members.find((m) => m.id === f.auditorId)?.name ?? info.auditorName,
          })
        }
      >
        <Save /> Salvar dados
      </Button>
    </details>
  );
}

function ClosingForm({
  info,
  disabled,
  pending,
  onSave,
}: {
  info: AuditInfo;
  disabled: boolean;
  pending: boolean;
  onSave: (p: Partial<AuditInfo>) => void;
}) {
  const [f, setF] = useState({ strengths: info.strengths, opportunities: info.opportunities, conclusion: info.conclusion });
  const dirty = f.strengths !== info.strengths || f.opportunities !== info.opportunities || f.conclusion !== info.conclusion;
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 print:break-inside-avoid">
      <h3 className="text-sm font-semibold text-slate-800">Fechamento da auditoria</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Pontos fortes">
          <Textarea rows={5} value={f.strengths} disabled={disabled} onChange={(e) => setF({ ...f, strengths: e.target.value })} />
        </Field>
        <Field label="Oportunidades de melhoria">
          <Textarea rows={5} value={f.opportunities} disabled={disabled} onChange={(e) => setF({ ...f, opportunities: e.target.value })} />
        </Field>
        <Field label="Conclusão / recomendações ao gestor do contrato" className="md:col-span-2">
          <Textarea rows={4} value={f.conclusion} disabled={disabled} onChange={(e) => setF({ ...f, conclusion: e.target.value })} />
        </Field>
      </div>
      {!disabled ? (
        <Button size="sm" disabled={!dirty || pending} onClick={() => onSave(f)} className="print:hidden">
          {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Salvar fechamento
        </Button>
      ) : null}
      <p className="hidden text-[11px] text-slate-400 print:block">
        Classe por compliance: A ≥ 80% · B 65–80% · C 40–65% · D &lt; 40%. Itens críticos não conformes limitam a nota a 50%.
      </p>
    </section>
  );
}
