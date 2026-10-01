"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertOctagon, CalendarDays, ClipboardCheck, DoorOpen, Loader2, Plus, SprayCan, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createAudit } from "@/server/audits";
import type { Grade } from "@/lib/scoring";
import { cn, fmtDate, fmtPct } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { GradeBadge } from "@/components/grade-badge";

type TemplateInfo = {
  code: string;
  name: string;
  shortName: string;
  description: string;
  icon: "DoorOpen" | "SprayCan";
  items: number;
  critical: number;
};

type AuditRow = {
  id: string;
  template: string;
  templateName: string;
  contractor: string;
  auditDate: string;
  auditor: string | null;
  status: string;
  pct: number | null;
  grade: Grade | null;
  answered: number;
  total: number;
  nc: number;
  criticalNc: number;
  actions: number;
};

const ICON = { DoorOpen, SprayCan };

export function AuditsView({
  unit,
  templates,
  audits,
  members,
  canCreate,
  currentUserId,
}: {
  unit: { id: string; name: string };
  templates: TemplateInfo[];
  audits: AuditRow[];
  members: { id: string; name: string }[];
  canCreate: boolean;
  currentUserId: string;
}) {
  const [f, setF] = useState({ template: "", status: "", q: "" });
  const [newFor, setNewFor] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      audits.filter(
        (a) =>
          (!f.template || a.template === f.template) &&
          (!f.status || a.status === f.status) &&
          (!f.q || a.contractor.toLowerCase().includes(f.q.toLowerCase())),
      ),
    [audits, f],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-500">Auditorias · Elemento 13 e Básico 11</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Auditoria de empresas contratadas</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Checklists para o auditor avaliar terceiros em campo: gestão da contratada (seleção, treinamento, contrato,
          preparação, auditoria e avaliação), requisitos dos 12 Básicos aplicáveis à atividade e entrevistas de cultura.
          Itens críticos não conformes limitam a nota a 50%.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => {
          const Icon = ICON[t.icon];
          const done = audits.filter((a) => a.template === t.code);
          return (
            <div key={t.code} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow">
                  <Icon className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-slate-900">{t.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{t.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {t.items} itens · {t.critical} críticos · {done.length} auditoria(s) realizada(s)
                  </p>
                </div>
              </div>
              {canCreate ? (
                <Button className="mt-4 self-start" onClick={() => setNewFor(t.code)}>
                  <Plus /> Nova auditoria de {t.shortName}
                </Button>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-sm font-semibold text-slate-800">Auditorias realizadas · {unit.name}</h3>
          <Input className="w-56" placeholder="Buscar contratada…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          <Select className="w-44" value={f.template} onChange={(e) => setF({ ...f, template: e.target.value })}>
            <option value="">Todos os checklists</option>
            {templates.map((t) => (
              <option key={t.code} value={t.code}>
                {t.shortName}
              </option>
            ))}
          </Select>
          <Select className="w-44" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">Todos os status</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDA">Concluída</option>
          </Select>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nenhuma auditoria encontrada.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((a) => (
              <Link
                key={a.id}
                href={`/auditorias/${a.id}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <GradeBadge grade={a.grade} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{a.templateName}</div>
                    <div className="truncate font-semibold text-slate-900 group-hover:text-brand-800">{a.contractor}</div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" /> {fmtDate(a.auditDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserRound className="size-3" /> {a.auditor ?? "—"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xl font-bold tabular-nums text-slate-900">{fmtPct(a.pct)}</span>
                </div>
                <Progress value={a.answered / a.total} className="mt-3 h-1.5" />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium",
                      a.status === "CONCLUIDA" ? "bg-conforme-bg text-conforme" : "bg-brand-50 text-brand-700",
                    )}
                  >
                    {a.status === "CONCLUIDA" ? "Concluída" : "Em andamento"}
                  </span>
                  <span>
                    {a.answered}/{a.total} itens
                  </span>
                  <span>{a.nc} NC</span>
                  {a.criticalNc ? (
                    <span className="flex items-center gap-1 font-semibold text-critico">
                      <AlertOctagon className="size-3" /> {a.criticalNc} crítico(s)
                    </span>
                  ) : null}
                  <span className="ml-auto flex items-center gap-1">
                    <ClipboardCheck className="size-3" /> {a.actions} ação(ões)
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!newFor} onOpenChange={(o) => !o && setNewFor(null)}>
        <DialogContent
          title={`Nova auditoria — ${templates.find((t) => t.code === newFor)?.shortName ?? ""}`}
          description="Informe a empresa contratada auditada e os dados da auditoria."
        >
          {newFor ? (
            <NewAuditForm unitId={unit.id} template={newFor} members={members} currentUserId={currentUserId} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewAuditForm({
  unitId,
  template,
  members,
  currentUserId,
}: {
  unitId: string;
  template: string;
  members: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    contractor: "",
    auditDate: new Date().toISOString().slice(0, 10),
    auditorId: currentUserId,
    accompaniedBy: "",
  });
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createAudit({ unitId, template, ...f });
          if (res.ok && res.data) {
            toast.success("Auditoria criada");
            router.push(`/auditorias/${res.data.id}`);
          } else if (!res.ok) toast.error(res.error);
        });
      }}
    >
      <Field label="Empresa contratada" className="sm:col-span-2">
        <Input value={f.contractor} onChange={(e) => setF({ ...f, contractor: e.target.value })} required placeholder="Razão social / nome fantasia" />
      </Field>
      <Field label="Data da auditoria">
        <Input type="date" value={f.auditDate} onChange={(e) => setF({ ...f, auditDate: e.target.value })} required />
      </Field>
      <Field label="Auditor">
        <Select value={f.auditorId} onChange={(e) => setF({ ...f, auditorId: e.target.value })}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Acompanhado por (gestor do contrato / encarregado)" className="sm:col-span-2">
        <Input value={f.accompaniedBy} onChange={(e) => setF({ ...f, accompaniedBy: e.target.value })} />
      </Field>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} Iniciar auditoria
        </Button>
      </div>
    </form>
  );
}
