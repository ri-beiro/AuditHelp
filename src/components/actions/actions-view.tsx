"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FilterX, Pencil, Plus } from "lucide-react";
import type { ActionDTO } from "@/server/queries";
import { ACTION_STATUS_LABEL, fmtDate, fmtMoney, PRIORITY_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ActionFormDialog } from "./action-form";
import { ActionStatusBadge, PriorityBadge, isOverdue } from "./action-badges";

type Row = ActionDTO & { requirementLabel: string | null };
type El = { id: string; code: string; framework: string; label: string; pillarId: string; pillarName: string };

const EMPTY = { q: "", framework: "", element: "", pillar: "", status: "pendentes", owner: "", priority: "", from: "", to: "" };

export function ActionsView({
  unit,
  actions,
  elements,
  members,
  canEdit,
  initialQuery,
}: {
  unit: { id: string; name: string };
  actions: Row[];
  elements: El[];
  members: { id: string; name: string }[];
  canEdit: boolean;
  initialQuery: string;
}) {
  const router = useRouter();
  const [f, setF] = useState({ ...EMPTY, q: initialQuery, status: initialQuery ? "" : "pendentes" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const elById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const pillars = useMemo(() => [...new Map(elements.map((e) => [e.pillarId, e.pillarName])).entries()], [elements]);

  const rows = actions.filter((a) => {
    const el = elById.get(a.elementId);
    const q = f.q.trim().toLowerCase();
    return (
      (!q || `${a.what} ${a.why} ${a.how} ${a.where} ${el?.label}`.toLowerCase().includes(q)) &&
      (!f.framework || el?.framework === f.framework) &&
      (!f.element || a.elementId === f.element) &&
      (!f.pillar || el?.pillarId === f.pillar) &&
      (!f.status ||
        (f.status === "pendentes"
          ? a.status === "ABERTA" || a.status === "EM_ANDAMENTO"
          : f.status === "atrasadas"
            ? isOverdue(a)
            : a.status === f.status)) &&
      (!f.owner || (f.owner === "none" ? !a.ownerId : a.ownerId === f.owner)) &&
      (!f.priority || a.priority === f.priority) &&
      (!f.from || (a.dueDate && a.dueDate.slice(0, 10) >= f.from)) &&
      (!f.to || (a.dueDate && a.dueDate.slice(0, 10) <= f.to))
    );
  });

  const exportCsv = () => {
    const head = ["Elemento", "Requisito", "O quê", "Por quê", "Quem", "Quando", "Onde", "Como", "Quanto", "Prioridade", "Status"];
    const lines = rows.map((a) =>
      [
        elById.get(a.elementId)?.label,
        a.requirementLabel ?? "",
        a.what,
        a.why,
        a.ownerName ?? "",
        fmtDate(a.dueDate),
        a.where,
        a.how,
        a.cost ?? "",
        PRIORITY_LABEL[a.priority],
        ACTION_STATUS_LABEL[a.status],
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planos-de-acao-${unit.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-500">Planos de ação · 5W2H</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{unit.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download /> Exportar CSV
          </Button>
          {canEdit ? (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus /> Novo plano de ação
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-4 xl:grid-cols-9">
        <Input className="col-span-2" placeholder="Buscar…" value={f.q} onChange={set("q")} />
        <Select value={f.framework} onChange={set("framework")}>
          <option value="">WISE + Básicos</option>
          <option value="WISE">13 Elementos WISE</option>
          <option value="BASICS">12 Básicos</option>
        </Select>
        <Select value={f.pillar} onChange={set("pillar")}>
          <option value="">Todos os pilares</option>
          {pillars.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <Select value={f.element} onChange={set("element")}>
          <option value="">Todos os elementos</option>
          {elements
            .filter((e) => !f.framework || e.framework === f.framework)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
        </Select>
        <Select value={f.status} onChange={set("status")}>
          <option value="">Todos os status</option>
          <option value="pendentes">Pendentes</option>
          <option value="atrasadas">Em atraso</option>
          {Object.entries(ACTION_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={f.owner} onChange={set("owner")}>
          <option value="">Todos os responsáveis</option>
          <option value="none">Sem responsável</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select value={f.priority} onChange={set("priority")}>
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <div className="col-span-2 flex items-center gap-1 md:col-span-2 xl:col-span-1">
          <Input type="date" value={f.from} onChange={set("from")} title="Vencimento a partir de" />
        </div>
        <div className="col-span-2 flex items-center gap-1 md:col-span-2 xl:col-span-1">
          <Input type="date" value={f.to} onChange={set("to")} title="Vencimento até" />
        </div>
        <Button variant="ghost" onClick={() => setF({ ...EMPTY, status: "" })}>
          <FilterX /> Limpar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">O quê / Por quê</th>
              <th className="px-3 py-3 font-medium">Elemento</th>
              <th className="px-3 py-3 font-medium">Quem</th>
              <th className="px-3 py-3 font-medium">Quando</th>
              <th className="px-3 py-3 font-medium">Onde</th>
              <th className="px-3 py-3 text-right font-medium">Quanto</th>
              <th className="px-3 py-3 font-medium">Prioridade</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  Nenhum plano de ação encontrado.
                </td>
              </tr>
            ) : (
              rows.map((a) => {
                const el = elById.get(a.elementId);
                return (
                  <tr key={a.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                    <td className="max-w-md px-4 py-3">
                      <div className="font-medium text-slate-800">{a.what}</div>
                      {a.why ? <div className="line-clamp-2 text-xs text-slate-500">{a.why}</div> : null}
                      {a.requirementLabel ? (
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{a.requirementLabel}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {el ? (
                        <Link
                          href={`/?tab=${el.framework === "WISE" ? "wise" : "basicos"}&el=${el.code}&view=acoes`}
                          className="text-brand-700 hover:underline"
                        >
                          {el.label}
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{a.ownerName ?? <span className="text-slate-400">A definir</span>}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-700">{fmtDate(a.dueDate)}</td>
                    <td className="px-3 py-3 text-slate-600">{a.where || "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600">{fmtMoney(a.cost)}</td>
                    <td className="px-3 py-3">
                      <PriorityBadge value={a.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <ActionStatusBadge value={a.status} overdue={isOverdue(a)} />
                    </td>
                    <td className="px-3 py-3">
                      {canEdit ? (
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => {
                            setEditing(a);
                            setOpen(true);
                          }}
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{rows.length} plano(s) exibido(s) de {actions.length}.</p>

      <ActionFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        context={{ unitId: unit.id, elements: elements.map((e) => ({ id: e.id, label: e.label })), members }}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
