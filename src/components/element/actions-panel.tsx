"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Pencil, Plus, UserRound, Wallet } from "lucide-react";
import { fmtDate, fmtMoney } from "@/lib/utils";
import type { ActionDTO } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { ActionFormDialog } from "@/components/actions/action-form";
import { ActionStatusBadge, PriorityBadge, isOverdue } from "@/components/actions/action-badges";
import type { SheetCtx } from "./element-sheet";

export function ActionsPanel({
  ctx,
  presetRequirement,
  onPresetUsed,
  onSaved,
}: {
  ctx: SheetCtx;
  presetRequirement: string | null;
  onPresetUsed: () => void;
  onSaved: () => void;
}) {
  const { detail } = ctx;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActionDTO | null>(null);
  const [preset, setPreset] = useState<{ requirementId?: string | null; why?: string }>({});

  useEffect(() => {
    if (presetRequirement) {
      const r = detail.requirements.find((x) => x.id === presetRequirement);
      setEditing(null);
      setPreset({
        requirementId: presetRequirement,
        why: r ? `Desvio no requisito ${r.code}: ${r.text}` : "",
      });
      setOpen(true);
      onPresetUsed();
    }
  }, [presetRequirement, onPresetUsed, detail.requirements]);

  const reqLabel = (id: string | null) => {
    const r = detail.requirements.find((x) => x.id === id);
    return r ? `${r.code} — ${r.text}` : "Elemento (geral)";
  };
  const deviations = detail.requirements.filter((r) => r.deviation);
  const withoutAction = deviations.filter((r) => !detail.actions.some((a) => a.requirementId === r.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Planos de ação do elemento</h4>
          <p className="text-xs text-slate-500">
            {deviations.length} desvio(s) na matriz · {withoutAction.length} ainda sem plano de ação
          </p>
        </div>
        {ctx.perms.action ? (
          <Button
            onClick={() => {
              setEditing(null);
              setPreset({});
              setOpen(true);
            }}
          >
            <Plus /> Novo plano de ação
          </Button>
        ) : null}
      </div>

      {withoutAction.length > 0 && ctx.perms.action ? (
        <div className="rounded-xl border border-accent-500/30 bg-accent-50 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">Desvios sem plano de ação</p>
          <ul className="space-y-1">
            {withoutAction.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="line-clamp-1 flex-1">
                  <strong>{r.code}</strong> {r.text}
                </span>
                <button
                  className="shrink-0 rounded-md bg-white px-2 py-1 font-medium text-brand-700 hover:bg-brand-50"
                  onClick={() => {
                    setEditing(null);
                    setPreset({ requirementId: r.id, why: `Desvio no requisito ${r.code}: ${r.text}` });
                    setOpen(true);
                  }}
                >
                  Criar ação
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail.actions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Nenhum plano de ação para este elemento.
        </div>
      ) : (
        <ul className="space-y-2">
          {detail.actions.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{a.what}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{reqLabel(a.requirementId)}</p>
                </div>
                <PriorityBadge value={a.priority} />
                <ActionStatusBadge value={a.status} overdue={isOverdue(a)} />
                {ctx.perms.action ? (
                  <button
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
              </div>
              {a.why ? <p className="mt-2 text-xs text-slate-600"><strong>Por quê:</strong> {a.why}</p> : null}
              {a.how ? <p className="mt-1 text-xs text-slate-600"><strong>Como:</strong> {a.how}</p> : null}
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><UserRound className="size-3.5" /> {a.ownerName ?? "A definir"}</span>
                <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {fmtDate(a.dueDate)}</span>
                {a.spheraId ? <span className="font-medium text-slate-600">Sphera {a.spheraId}</span> : null}
                {a.where ? <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {a.where}</span> : null}
                {a.cost != null ? <span className="flex items-center gap-1"><Wallet className="size-3.5" /> {fmtMoney(a.cost)}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActionFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        preset={{ elementId: detail.element.id, ...preset }}
        context={{
          unitId: detail.unitId,
          assessmentId: detail.assessmentId,
          elements: [{ id: detail.element.id, label: `${detail.element.code} · ${detail.element.shortName}` }],
          requirements: detail.requirements.map((r) => ({
            id: r.id,
            elementId: detail.element.id,
            label: `${r.code} — ${r.text.slice(0, 90)}${r.text.length > 90 ? "…" : ""}`,
          })),
          members: detail.members,
        }}
        onSaved={onSaved}
      />
    </div>
  );
}
