"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Briefcase,
  CalendarClock,
  Check,
  FileDown,
  GraduationCap,
  Grid3x3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { deleteJobRole, deleteTraining, saveJobRole, saveTraining, setMhcCell } from "@/server/trainings";
import { cn, fmtDate } from "@/lib/utils";
import { situation, SITUATION_LABEL, type TrainingSituation } from "@/lib/employees";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";

type Value = "S" | "N" | "NA";
export type TrainingRow = {
  id: string;
  name: string;
  validityDays: number | null;
  noExpiry: boolean;
  method: string | null;
  effectiveness: boolean | null;
  passingScore: number | null;
};
export type RoleRow = { id: string; name: string; values: Record<string, Value> };
export type EmployeeRow = { id: string; name: string; roleId: string | null; records: Record<string, { doneAt: string; validUntil: string | null }> };

const CHIP: Record<TrainingSituation, string> = {
  REALIZADO: "border-conforme/30 bg-conforme-bg text-conforme",
  A_VENCER: "border-amber-300 bg-amber-50 text-amber-800",
  VENCIDO: "border-critico bg-critico text-white",
  PENDENTE: "border-slate-200 bg-white text-slate-600",
};

/** Nomes dos colaboradores que precisam do treinamento, com a situação de cada um. */
function People({ people }: { people: { id: string; name: string; st: TrainingSituation; validUntil: string | null }[] }) {
  if (!people.length) return null;
  const ok = people.filter((p) => p.st === "REALIZADO" || p.st === "A_VENCER").length;
  return (
    <div className="mt-1.5">
      <p className="mb-1 text-[11px] font-semibold text-slate-500">
        Colaboradores · {ok}/{people.length} em dia
      </p>
      <div className="flex flex-wrap gap-1">
        {people.map((p) => (
          <span
            key={p.id}
            title={`${SITUATION_LABEL[p.st]}${p.validUntil ? ` · vence ${fmtDate(p.validUntil)}` : ""}`}
            className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", CHIP[p.st])}
          >
            {p.name.split(" ").slice(0, 2).join(" ")}
          </span>
        ))}
      </div>
    </div>
  );
}

const NEXT: Record<string, Value | null> = { "": "S", S: "N", N: "NA", NA: null };

export function validityLabel(t: Pick<TrainingRow, "validityDays" | "noExpiry">) {
  if (t.noExpiry) return "Sem vencimento";
  if (!t.validityDays) return "Não definido";
  if (t.validityDays === 365) return "Anual";
  if (t.validityDays === 730) return "Bienal";
  return `${t.validityDays} dias`;
}

function ValidityBadge({ t }: { t: TrainingRow }) {
  const cls = t.noExpiry
    ? "bg-slate-100 text-slate-500"
    : !t.validityDays
      ? "bg-atencao-bg text-atencao-ink"
      : t.validityDays <= 365
        ? "bg-brand-50 text-brand-700"
        : "bg-wgreen-100 text-wgreen-700";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>{validityLabel(t)}</span>;
}

function Cell({ v }: { v?: Value }) {
  if (v === "S")
    return (
      <span className="mx-auto grid size-6 place-items-center rounded-md bg-conforme text-white shadow-sm">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (v === "N") return <span className="mx-auto block size-1.5 rounded-full bg-slate-300" />;
  if (v === "NA") return <span className="text-[9px] font-bold text-slate-400">NA</span>;
  return null;
}

export function MhcView({
  trainings,
  roles,
  canEdit,
  employees = [],
}: {
  trainings: TrainingRow[];
  roles: RoleRow[];
  canEdit: boolean;
  employees?: EmployeeRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"matriz" | "cargo" | "treinamentos">("matriz");
  const [values, setValues] = useState(() => Object.fromEntries(roles.map((r) => [r.id, r.values])) as Record<string, Record<string, Value>>);
  // Após importar ou criar cargos, os dados do servidor substituem o estado local.
  useEffect(() => setValues(Object.fromEntries(roles.map((r) => [r.id, r.values]))), [roles]);
  const [qRole, setQRole] = useState("");
  const [qTraining, setQTraining] = useState("");
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [trainingDlg, setTrainingDlg] = useState<TrainingRow | "new" | null>(null);
  const [roleDlg, setRoleDlg] = useState<RoleRow | "new" | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const required = (rid: string) => trainings.filter((t) => values[rid]?.[t.id] === "S").length;
  const byTraining = (tid: string) => roles.filter((r) => values[r.id]?.[tid] === "S").length;
  const peopleFor = (tid: string, onlyRole?: string) =>
    employees
      .filter((e) => e.roleId && values[e.roleId]?.[tid] === "S" && (!onlyRole || e.roleId === onlyRole))
      .map((e) => {
        const rec = e.records[tid];
        return { id: e.id, name: e.name, st: situation(rec), validUntil: rec?.validUntil ?? null };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  const totalS = roles.reduce((s, r) => s + required(r.id), 0);
  const defined = trainings.filter((t) => t.noExpiry || t.validityDays).length;

  const shownRoles = roles.filter((r) => !qRole.trim() || r.name.toLowerCase().includes(qRole.trim().toLowerCase()));
  const shownTrainings = trainings.filter((t) => !qTraining.trim() || t.name.toLowerCase().includes(qTraining.trim().toLowerCase()));

  const toggle = (rid: string, tid: string) => {
    if (!canEdit) return;
    const cur = values[rid]?.[tid] ?? "";
    const next = NEXT[cur];
    setValues((p) => {
      const row = { ...(p[rid] ?? {}) };
      if (next) row[tid] = next;
      else delete row[tid];
      return { ...p, [rid]: row };
    });
    start(async () => {
      const res = await setMhcCell(rid, tid, next);
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
      }
    });
  };

  const importFile = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/treinamentos/mhc", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(json.error ?? "Falha na importação");
      else {
        toast.success(`MHC atualizada: ${json.trainings} treinamentos e ${json.roles} cargos`);
        router.refresh();
      }
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const role = roles.find((r) => r.id === roleId);
  const roleReq = role ? trainings.filter((t) => values[role.id]?.[t.id] === "S") : [];
  const roleOther = role ? trainings.filter((t) => values[role.id]?.[t.id] !== "S") : [];

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Gestão WISE · Treinamentos</p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">Matriz de Treinamentos (MHC)</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Quais treinamentos cada cargo dos CDs precisa fazer, com validade, método e nota de corte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/api/treinamentos/mhc">
              <FileDown /> Exportar Excel
            </a>
          </Button>
          {canEdit ? (
            <>
              <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
                {pending ? <Loader2 className="animate-spin" /> : <Upload />} Importar MHC
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
              <Button variant="outline" onClick={() => setRoleDlg("new")}>
                <Plus /> Cargo
              </Button>
              <Button onClick={() => setTrainingDlg("new")}>
                <Plus /> Treinamento
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Briefcase, label: "Cargos", value: roles.length },
          { icon: GraduationCap, label: "Treinamentos", value: trainings.length },
          { icon: UserCheck, label: "Média de obrigatórios por cargo", value: roles.length ? (totalS / roles.length).toFixed(1).replace(".", ",") : "—" },
          { icon: CalendarClock, label: "Com validade definida", value: `${defined}/${trainings.length}` },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <k.icon className="size-4 text-brand-600" />
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-950">{k.value}</p>
            <p className="text-[11px] font-medium text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200/70 bg-white/70 p-1 shadow-soft">
        {(
          [
            ["matriz", "Matriz", Grid3x3],
            ["cargo", "Por cargo", Briefcase],
            ["treinamentos", "Treinamentos", BookOpenCheck],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all [&_svg]:size-4",
              tab === k ? "bg-brand-700 text-white shadow-soft" : "text-slate-500 hover:text-brand-800",
            )}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>

      {tab === "matriz" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Filtrar cargo…" value={qRole} onChange={(e) => setQRole(e.target.value)} />
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Filtrar treinamento…" value={qTraining} onChange={(e) => setQTraining(e.target.value)} />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Cell v="S" /> Obrigatório
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Cell v="N" /> Não obrigatório
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Cell v="NA" /> Não aplicável
              </span>
              {canEdit ? <span className="text-slate-400">· clique na célula para alterar</span> : null}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white scrollbar-thin">
            <table className="border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 min-w-56 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left align-bottom text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Cargo
                  </th>
                  {shownTrainings.map((t) => (
                    <th
                      key={t.id}
                      onMouseEnter={() => setHoverCol(t.id)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={cn(
                        "sticky top-0 z-20 h-52 w-9 min-w-9 border-b border-slate-200 bg-slate-50 px-0 align-bottom",
                        hoverCol === t.id && "bg-brand-50",
                      )}
                      title={`${t.name} · ${validityLabel(t)}`}
                    >
                      <div className="mx-auto flex h-full items-end justify-center pb-2">
                        <span className="line-clamp-2 max-h-48 text-left text-[10.5px] font-semibold leading-tight text-slate-700 [writing-mode:vertical-rl] rotate-180">
                          {t.name}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="sticky top-0 z-20 border-b border-l border-slate-200 bg-slate-50 px-2 align-bottom text-[10px] font-bold uppercase text-slate-500">Total</th>
                </tr>
                <tr>
                  <th className="sticky left-0 top-52 z-30 border-b border-r border-slate-200 bg-white px-3 py-1 text-left text-[10px] font-semibold text-slate-400">Validade</th>
                  {shownTrainings.map((t) => (
                    <th key={t.id} className={cn("sticky top-52 z-20 border-b border-slate-200 bg-white py-1 text-[9px] font-bold", hoverCol === t.id && "bg-brand-50")}>
                      <span className={cn(t.noExpiry ? "text-slate-400" : !t.validityDays ? "text-atencao-ink" : "text-brand-700")}>
                        {t.noExpiry ? "NA" : t.validityDays ? (t.validityDays === 365 ? "1a" : t.validityDays === 730 ? "2a" : `${t.validityDays}d`) : "?"}
                      </span>
                    </th>
                  ))}
                  <th className="sticky top-52 z-20 border-b border-l border-slate-200 bg-white" />
                </tr>
              </thead>
              <tbody>
                {shownRoles.map((r) => (
                  <tr key={r.id} className="group">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-slate-100 bg-white px-3 py-1.5 font-semibold text-slate-700 group-hover:bg-brand-50">
                      {r.name}
                    </td>
                    {shownTrainings.map((t) => (
                      <td
                        key={t.id}
                        onMouseEnter={() => setHoverCol(t.id)}
                        onClick={() => toggle(r.id, t.id)}
                        className={cn(
                          "h-8 border-b border-slate-100 text-center group-hover:bg-brand-50/60",
                          hoverCol === t.id && "bg-brand-50/60",
                          canEdit && "cursor-pointer hover:!bg-brand-100",
                        )}
                      >
                        <Cell v={values[r.id]?.[t.id]} />
                      </td>
                    ))}
                    <td className="border-b border-l border-slate-100 px-2 text-center font-bold tabular-nums text-brand-900 group-hover:bg-brand-50">{required(r.id)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 border-r border-t-2 border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-500">
                    Cargos que exigem
                  </td>
                  {shownTrainings.map((t) => (
                    <td key={t.id} className="border-t-2 border-slate-200 bg-slate-50 text-center font-bold tabular-nums text-brand-900">
                      {byTraining(t.id)}
                    </td>
                  ))}
                  <td className="border-l border-t-2 border-slate-200 bg-slate-50" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "cargo" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-sm font-semibold text-slate-700">Cargo</span>
            <Select className="w-full sm:w-80" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            {role ? (
              <span className="text-sm text-slate-500">
                <strong className="text-brand-900">{roleReq.length}</strong> treinamentos obrigatórios de {trainings.length}
              </span>
            ) : null}
            {canEdit && role ? (
              <span className="ml-auto flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setRoleDlg(role)}>
                  <Pencil /> Renomear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-critico hover:bg-critico-bg hover:text-critico"
                  onClick={() =>
                    confirm(`Excluir o cargo ${role.name} da MHC?`) &&
                    start(async () => {
                      const res = await deleteJobRole(role.id);
                      if (res.ok) {
                        toast.success("Cargo excluído");
                        setRoleId(roles.find((x) => x.id !== role.id)?.id ?? "");
                        router.refresh();
                      } else toast.error(res.error);
                    })
                  }
                >
                  <Trash2 /> Excluir
                </Button>
              </span>
            ) : null}
          </div>
          {role ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {roleReq.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-conforme-bg text-conforme">
                      <GraduationCap className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug text-slate-800">{t.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                        <ValidityBadge t={t} />
                        {t.method ? <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{t.method}</span> : null}
                        {t.passingScore ? <span className="rounded-full bg-accent-50 px-2 py-0.5 font-semibold text-accent-700">Nota de corte {t.passingScore}</span> : null}
                        {t.effectiveness ? <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">Avaliação de eficácia</span> : null}
                      </div>
                      <People people={peopleFor(t.id, role.id)} />
                    </div>
                  </div>
                ))}
              </div>
              {roleOther.length ? (
                <details className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-600">Não obrigatórios para este cargo ({roleOther.length})</summary>
                  <ul className="mt-2 grid gap-1 text-slate-500 sm:grid-cols-2 xl:grid-cols-3">
                    {roleOther.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <Cell v={values[role.id]?.[t.id]} /> {t.name}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "treinamentos" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Treinamento</th>
                <th className="px-3 py-3 font-medium">Validade</th>
                <th className="px-3 py-3 font-medium">Método</th>
                <th className="px-3 py-3 font-medium">Avaliação de eficácia</th>
                <th className="px-3 py-3 font-medium">Nota de corte</th>
                <th className="px-3 py-3 font-medium">Cargos que exigem</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {trainings.map((t) => {
                const n = byTraining(t.id);
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="max-w-xl px-4 py-2.5">
                      <span className="font-medium text-slate-800">{t.name}</span>
                      <People people={peopleFor(t.id)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ValidityBadge t={t} />
                      {t.validityDays ? <span className="ml-1 text-[11px] text-slate-400">{t.validityDays} dias</span> : null}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{t.method ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{t.effectiveness === null ? "—" : t.effectiveness ? "Sim" : "Não"}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-600">{t.passingScore ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-600" style={{ width: `${roles.length ? (n / roles.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-slate-600">
                          {n}/{roles.length}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {canEdit ? (
                        <div className="flex justify-end gap-0.5">
                          <button type="button" title="Editar" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setTrainingDlg(t)}>
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            title="Excluir"
                            className="rounded p-1 text-slate-400 hover:bg-critico-bg hover:text-critico"
                            onClick={() =>
                              confirm(`Excluir ${t.name} da MHC?`) &&
                              start(async () => {
                                const res = await deleteTraining(t.id);
                                if (res.ok) {
                                  toast.success("Treinamento excluído");
                                  router.refresh();
                                } else toast.error(res.error);
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={!!trainingDlg} onOpenChange={(o) => !o && setTrainingDlg(null)}>
        <DialogContent title={trainingDlg === "new" ? "Novo treinamento" : "Editar treinamento"} description="Regras do treinamento na MHC.">
          {trainingDlg ? (
            <TrainingForm
              initial={trainingDlg === "new" ? null : trainingDlg}
              onDone={() => {
                setTrainingDlg(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleDlg} onOpenChange={(o) => !o && setRoleDlg(null)}>
        <DialogContent title={roleDlg === "new" ? "Novo cargo" : "Renomear cargo"}>
          {roleDlg ? (
            <RoleForm
              initial={roleDlg === "new" ? null : roleDlg}
              roles={roles}
              onDone={() => {
                setRoleDlg(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrainingForm({ initial, onDone }: { initial: TrainingRow | null; onDone: () => void }) {
  const [pending, start] = useTransition();
  const preset = initial?.noExpiry ? "NA" : initial?.validityDays === 365 ? "365" : initial?.validityDays === 730 ? "730" : initial?.validityDays ? "custom" : "";
  const [f, setF] = useState({
    name: initial?.name ?? "",
    validity: preset,
    days: initial?.validityDays ? String(initial.validityDays) : "",
    method: initial?.method ?? "",
    effectiveness: initial?.effectiveness === null || initial?.effectiveness === undefined ? "" : initial.effectiveness ? "S" : "N",
    passingScore: initial?.passingScore ? String(initial.passingScore) : "",
  });
  const days = useMemo(() => (f.validity === "custom" ? Number(f.days) || null : f.validity && f.validity !== "NA" ? Number(f.validity) : null), [f]);
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveTraining({
            id: initial?.id,
            name: f.name,
            validityDays: days,
            noExpiry: f.validity === "NA",
            method: f.method || null,
            effectiveness: f.effectiveness ? f.effectiveness === "S" : null,
            passingScore: f.passingScore ? Number(f.passingScore) : null,
          });
          if (res.ok) {
            toast.success("Treinamento salvo");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Nome" className="sm:col-span-2">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      </Field>
      <Field label="Validade">
        <Select value={f.validity} onChange={(e) => setF({ ...f, validity: e.target.value })}>
          <option value="">Não definida</option>
          <option value="365">Anual (365 dias)</option>
          <option value="730">Bienal (730 dias)</option>
          <option value="custom">Outro prazo</option>
          <option value="NA">Sem vencimento (NA)</option>
        </Select>
      </Field>
      {f.validity === "custom" ? (
        <Field label="Prazo em dias">
          <Input inputMode="numeric" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value.replace(/\D/g, "") })} />
        </Field>
      ) : (
        <div />
      )}
      <Field label="Método">
        <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
          <option value="">—</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="ONLINE">Online</option>
          <option value="PRESENCIAL/ONLINE">Presencial/Online</option>
        </Select>
      </Field>
      <Field label="Avaliação de eficácia">
        <Select value={f.effectiveness} onChange={(e) => setF({ ...f, effectiveness: e.target.value })}>
          <option value="">—</option>
          <option value="S">Sim</option>
          <option value="N">Não</option>
        </Select>
      </Field>
      <Field label="Nota de corte">
        <Input inputMode="numeric" value={f.passingScore} onChange={(e) => setF({ ...f, passingScore: e.target.value.replace(/\D/g, "") })} placeholder="Ex.: 70" />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}

function RoleForm({ initial, roles, onDone }: { initial: RoleRow | null; roles: RoleRow[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [copy, setCopy] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveJobRole({ id: initial?.id, name, copyFromId: copy || null });
          if (res.ok) {
            toast.success("Cargo salvo");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Cargo">
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex.: AN DISTRIBUICAO JR" />
      </Field>
      {!initial ? (
        <Field label="Copiar treinamentos de (opcional)">
          <Select value={copy} onChange={(e) => setCopy(e.target.value)}>
            <option value="">Começar em branco</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}
