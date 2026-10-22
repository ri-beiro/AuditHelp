"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  FileDown,
  FilterX,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { deleteEmployee, saveEmployee, setEmployeeTraining } from "@/server/employees";
import { isValid, situation, SITUATION_LABEL, type TrainingSituation } from "@/lib/employees";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";

type Training = { id: string; name: string; validityDays: number | null; noExpiry: boolean };
type Role = { id: string; name: string; required: string[] };
type Rec = { doneAt: string; validUntil: string | null };
type Employee = { id: string; name: string; team: string | null; roleId: string | null; roleLabel: string | null; active: boolean; records: Record<string, Rec> };

export const SITUATION_STYLE: Record<TrainingSituation, string> = {
  REALIZADO: "bg-conforme-bg text-conforme",
  A_VENCER: "bg-amber-100 text-amber-800",
  VENCIDO: "bg-critico text-white",
  PENDENTE: "bg-slate-100 text-slate-600",
};

const validity = (t: Training) => (t.noExpiry ? "Sem vencimento" : t.validityDays === 365 ? "Anual" : t.validityDays === 730 ? "Bienal" : t.validityDays ? `${t.validityDays} dias` : "Validade não definida");

export function EmployeesView({
  unit,
  trainings,
  roles,
  employees,
  canEdit,
  canDelete,
}: {
  unit: { id: string; name: string };
  trainings: Training[];
  roles: Role[];
  employees: Employee[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [records, setRecords] = useState(() => Object.fromEntries(employees.map((e) => [e.id, e.records])));
  useEffect(() => setRecords(Object.fromEntries(employees.map((e) => [e.id, e.records]))), [employees]);
  const [f, setF] = useState({ q: "", team: "", role: "", status: "" });
  const [open, setOpen] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Employee | "new" | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const trainingById = useMemo(() => new Map(trainings.map((t) => [t.id, t])), [trainings]);
  const teams = [...new Set(employees.map((e) => e.team).filter(Boolean))] as string[];

  const summary = (e: Employee) => {
    const req = (e.roleId && roleById.get(e.roleId)?.required) || [];
    const sit = req.map((tid) => situation(records[e.id]?.[tid]));
    return {
      req,
      ok: sit.filter(isValid).length,
      pend: sit.filter((s) => s === "PENDENTE").length,
      venc: sit.filter((s) => s === "VENCIDO").length,
      aVencer: sit.filter((s) => s === "A_VENCER").length,
    };
  };

  const active = employees.filter((e) => e.active);
  const totals = active.reduce(
    (acc, e) => {
      const s = summary(e);
      return { req: acc.req + s.req.length, ok: acc.ok + s.ok, pend: acc.pend + s.pend, venc: acc.venc + s.venc };
    },
    { req: 0, ok: 0, pend: 0, venc: 0 },
  );
  const noRole = employees.filter((e) => !e.roleId).length;

  const rows = employees.filter((e) => {
    const q = f.q.trim().toLowerCase();
    const s = summary(e);
    return (
      (!q || `${e.name} ${e.roleLabel ?? ""} ${(e.roleId && roleById.get(e.roleId)?.name) || ""}`.toLowerCase().includes(q)) &&
      (!f.team || e.team === f.team) &&
      (!f.role || (f.role === "none" ? !e.roleId : e.roleId === f.role)) &&
      (!f.status || (f.status === "pendentes" && s.ok < s.req.length) || (f.status === "emdia" && s.req.length > 0 && s.ok === s.req.length) || (f.status === "vencidos" && s.venc > 0))
    );
  });

  const register = (e: Employee, tid: string, date: string | null) => {
    const prev = records[e.id]?.[tid];
    setRecords((p) => {
      const r = { ...(p[e.id] ?? {}) };
      if (date) r[tid] = { doneAt: `${date}T12:00:00.000Z`, validUntil: prev?.validUntil ?? null };
      else delete r[tid];
      return { ...p, [e.id]: r };
    });
    start(async () => {
      const res = await setEmployeeTraining(e.id, tid, date);
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }
      if (date)
        setRecords((p) => ({ ...p, [e.id]: { ...(p[e.id] ?? {}), [tid]: { doneAt: `${date}T12:00:00.000Z`, validUntil: res.validUntil ?? null } } }));
      router.refresh();
    });
  };

  const importFile = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/colaboradores/excel", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(json.error ?? "Falha na importação");
      else {
        toast.success(`${json.created} colaborador(es) incluído(s), ${json.updated} atualizado(s)`, {
          description: json.unmatched?.length ? `Cargos sem correspondência na MHC: ${json.unmatched.join(", ")}` : undefined,
        });
        router.refresh();
      }
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const pct = totals.req ? Math.round((totals.ok / totals.req) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Gestão WISE · Treinamentos</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">Colaboradores</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {unit.name} · o cargo define os treinamentos obrigatórios da MHC. Abra o colaborador para registrar as realizações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/api/colaboradores/excel">
              <FileDown /> Exportar
            </a>
          </Button>
          {canEdit ? (
            <>
              <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
                {pending ? <Loader2 className="animate-spin" /> : <Upload />} Importar times
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
              <Button onClick={() => setDlg("new")}>
                <Plus /> Novo colaborador
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { icon: Users, label: "Colaboradores ativos", value: String(active.length), tone: "text-brand-950" },
          { icon: BadgeCheck, label: "Treinamentos em dia", value: `${String(pct).replace(".", ",")}%`, sub: `${totals.ok} de ${totals.req} obrigatórios`, tone: "text-conforme" },
          { icon: GraduationCap, label: "Pendentes", value: String(totals.pend), tone: totals.pend ? "text-accent-700" : "text-slate-400" },
          { icon: AlertTriangle, label: "Vencidos", value: String(totals.venc), tone: totals.venc ? "text-critico" : "text-slate-400" },
          { icon: Users, label: "Sem cargo da MHC", value: String(noRole), tone: noRole ? "text-atencao-ink" : "text-slate-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <k.icon className="size-4 text-brand-600" />
            <p className={cn("mt-2 text-2xl font-extrabold tabular-nums", k.tone)}>{k.value}</p>
            <p className="text-[11px] font-medium text-slate-500">{k.label}</p>
            {k.sub ? <p className="text-[11px] text-slate-400">{k.sub}</p> : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[2fr_1fr_1.4fr_1fr_auto]">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Buscar colaborador ou cargo…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        </div>
        <Select value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })}>
          <option value="">Todos os times</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="">Todos os cargos</option>
          <option value="none">Sem cargo da MHC</option>
          {roles
            .filter((r) => employees.some((e) => e.roleId === r.id))
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </Select>
        <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">Todas as situações</option>
          <option value="pendentes">Com pendência</option>
          <option value="vencidos">Com vencidos</option>
          <option value="emdia">Em dia</option>
        </Select>
        <Button variant="ghost" onClick={() => setF({ q: "", team: "", role: "", status: "" })}>
          <FilterX /> Limpar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            Nenhum colaborador. {canEdit ? "Importe a planilha de times ou cadastre manualmente." : ""}
          </p>
        ) : (
          rows.map((e) => {
            const s = summary(e);
            const role = e.roleId ? roleById.get(e.roleId) : null;
            const isOpen = open === e.id;
            const p = s.req.length ? (s.ok / s.req.length) * 100 : 0;
            return (
              <div key={e.id} className={cn("border-t border-slate-100 first:border-t-0", !e.active && "opacity-60")}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : e.id)}
                  className={cn("flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left hover:bg-slate-50", isOpen && "bg-brand-50/50")}
                  aria-expanded={isOpen}
                >
                  <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", !isOpen && "-rotate-90")} />
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block truncate font-semibold text-slate-800">{e.name}</span>
                    <span className="block text-xs text-slate-500">
                      {role ? role.name : <span className="font-semibold text-atencao-ink">Sem cargo da MHC</span>}
                      {e.roleLabel && role && e.roleLabel.toUpperCase() !== role.name ? <span className="text-slate-400"> · informado: {e.roleLabel}</span> : null}
                    </span>
                  </span>
                  {e.team ? <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-800">{e.team}</span> : null}
                  <span className="flex w-56 items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className={cn("block h-full rounded-full", p === 100 ? "bg-conforme" : "bg-brand-600")} style={{ width: `${p}%` }} />
                    </span>
                    <span className="w-14 text-right text-xs font-semibold tabular-nums text-slate-700">
                      {s.ok}/{s.req.length}
                    </span>
                  </span>
                  <span className="flex w-40 justify-end gap-1">
                    {s.venc ? <span className="rounded-full bg-critico px-2 py-0.5 text-[10px] font-bold text-white">{s.venc} vencido(s)</span> : null}
                    {s.pend ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{s.pend} pendente(s)</span> : null}
                    {s.req.length && s.ok === s.req.length ? <span className="rounded-full bg-conforme-bg px-2 py-0.5 text-[10px] font-bold text-conforme">Em dia</span> : null}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:pl-12">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-700">
                        Treinamentos obrigatórios {role ? `para ${role.name}` : ""} · {s.req.length}
                      </p>
                      <span className="flex gap-1">
                        {canEdit ? (
                          <Button variant="outline" size="sm" onClick={() => setDlg(e)}>
                            <Pencil /> Editar
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-critico hover:bg-critico-bg hover:text-critico"
                            onClick={() =>
                              confirm(`Excluir ${e.name}?`) &&
                              start(async () => {
                                const res = await deleteEmployee(e.id);
                                if (res.ok) {
                                  toast.success("Colaborador excluído");
                                  router.refresh();
                                } else toast.error(res.error);
                              })
                            }
                          >
                            <Trash2 /> Excluir
                          </Button>
                        ) : null}
                      </span>
                    </div>
                    {!role ? (
                      <p className="rounded-lg border border-atencao/30 bg-atencao-bg px-3 py-2 text-sm text-atencao-ink">
                        Defina o cargo da MHC (Editar) para listar os treinamentos obrigatórios.
                      </p>
                    ) : (
                      <ul className="grid gap-2 lg:grid-cols-2">
                        {s.req.map((tid) => {
                          const t = trainingById.get(tid);
                          if (!t) return null;
                          const rec = records[e.id]?.[tid];
                          const st = situation(rec);
                          return (
                            <li key={tid} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                              <span className="min-w-0 flex-1 basis-48">
                                <span className="block text-sm font-medium leading-snug text-slate-800">{t.name}</span>
                                <span className="block text-[11px] text-slate-500">
                                  {validity(t)}
                                  {rec?.validUntil ? ` · vence ${fmtDate(rec.validUntil)}` : ""}
                                </span>
                              </span>
                              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", SITUATION_STYLE[st])}>{SITUATION_LABEL[st]}</span>
                              <span className="flex items-center gap-1">
                                <Input
                                  type="date"
                                  aria-label={`Data de realização — ${t.name}`}
                                  className="h-8 w-[150px] text-xs"
                                  disabled={!canEdit}
                                  value={rec?.doneAt.slice(0, 10) ?? ""}
                                  max={new Date().toISOString().slice(0, 10)}
                                  onChange={(ev) => ev.target.value && register(e, tid, ev.target.value)}
                                />
                                {canEdit && rec ? (
                                  <button type="button" title="Limpar realização" className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => register(e, tid, null)}>
                                    <X className="size-3.5" />
                                  </button>
                                ) : null}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <p className="text-xs text-slate-500">
        {rows.length} de {employees.length} colaborador(es). A validade é calculada pela MHC a partir da data de realização.
      </p>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent title={dlg === "new" ? "Novo colaborador" : "Editar colaborador"} description="O cargo define os treinamentos obrigatórios (MHC).">
          {dlg ? (
            <EmployeeForm
              unitId={unit.id}
              initial={dlg === "new" ? null : dlg}
              roles={roles}
              teams={teams}
              trainings={trainingById}
              onDone={() => {
                setDlg(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeForm({
  unitId,
  initial,
  roles,
  teams,
  trainings,
  onDone,
}: {
  unitId: string;
  initial: Employee | null;
  roles: Role[];
  teams: string[];
  trainings: Map<string, Training>;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: initial?.name ?? "", team: initial?.team ?? "", roleId: initial?.roleId ?? "", active: initial?.active ?? true });
  const role = roles.find((r) => r.id === f.roleId);
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveEmployee({ id: initial?.id, unitId, name: f.name, team: f.team, roleId: f.roleId || null, active: f.active });
          if (res.ok) {
            toast.success("Colaborador salvo");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Nome" className="sm:col-span-2">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      </Field>
      <Field label="Time">
        <Input list="teams" value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })} placeholder="Ex.: Time CD" />
        <datalist id="teams">
          {teams.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <Field label="Cargo (MHC)">
        <Select value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>
          <option value="">Selecione…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      {role ? (
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:col-span-2" open>
          <summary className="cursor-pointer font-semibold text-slate-700">Treinamentos obrigatórios deste cargo ({role.required.length})</summary>
          <ul className="mt-2 grid gap-1 text-slate-600 sm:grid-cols-2">
            {role.required.map((tid) => (
              <li key={tid} className="flex items-start gap-1.5 text-[13px]">
                <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-brand-600" /> {trainings.get(tid)?.name}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Colaborador ativo
      </label>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}
