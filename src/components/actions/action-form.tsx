"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveActionPlan, type ActionInput } from "@/server/actions";
import type { ActionDTO } from "@/server/queries";
import { ACTION_STATUS_LABEL, PRIORITY_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export type ActionFormContext = {
  unitId: string;
  assessmentId?: string | null;
  elements: { id: string; label: string }[];
  requirements?: { id: string; label: string; elementId: string }[];
  members: { id: string; name: string }[];
};

export type ActionPreset = {
  elementId?: string;
  requirementId?: string | null;
  what?: string;
  why?: string;
  where?: string;
  priority?: string;
  auditId?: string | null;
  auditItemCode?: string | null;
  incidentId?: string | null;
  auditRecordId?: string | null;
};

export function ActionFormDialog({
  open,
  onOpenChange,
  context,
  initial,
  preset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  context: ActionFormContext;
  initial?: ActionDTO | null;
  preset?: ActionPreset;
  onSaved?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={initial ? "Editar plano de ação" : "Novo plano de ação"}
        description="Modelo 5W2H: O quê, Por quê, Quem, Quando, Onde, Como e Quanto."
      >
        {open ? (
          <ActionForm
            key={initial?.id ?? "new"}
            context={context}
            initial={initial}
            preset={preset}
            onDone={() => {
              onOpenChange(false);
              onSaved?.();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  context,
  initial,
  preset,
  onDone,
}: {
  context: ActionFormContext;
  initial?: ActionDTO | null;
  preset?: ActionPreset;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    elementId: initial?.elementId ?? preset?.elementId ?? context.elements[0]?.id ?? "",
    requirementId: initial?.requirementId ?? preset?.requirementId ?? "",
    what: initial?.what ?? preset?.what ?? "",
    why: initial?.why ?? preset?.why ?? "",
    ownerId: initial?.ownerId ?? "",
    dueDate: initial?.dueDate?.slice(0, 10) ?? "",
    where: initial?.where ?? preset?.where ?? "",
    how: initial?.how ?? "",
    cost: initial?.cost != null ? String(initial.cost) : "",
    spheraId: initial?.spheraId ?? "",
    evidence: initial?.evidence ?? "",
    priority: initial?.priority ?? preset?.priority ?? "MEDIA",
    status: initial?.status ?? "ABERTA",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const reqs = context.requirements?.filter((r) => r.elementId === f.elementId) ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const payload: ActionInput = {
        id: initial?.id,
        unitId: context.unitId,
        assessmentId: context.assessmentId ?? null,
        elementId: f.elementId,
        requirementId: f.requirementId || null,
        what: f.what,
        why: f.why,
        ownerId: f.ownerId || null,
        dueDate: f.dueDate || null,
        where: f.where,
        how: f.how,
        cost: f.cost ? Number(f.cost.replace(",", ".")) : null,
        spheraId: f.spheraId,
        auditId: initial?.auditId ?? preset?.auditId ?? null,
        auditItemCode: initial?.auditItemCode ?? preset?.auditItemCode ?? null,
        incidentId: initial?.incidentId ?? preset?.incidentId ?? null,
        auditRecordId: initial?.auditRecordId ?? preset?.auditRecordId ?? null,
        evidence: f.evidence,
        priority: f.priority as ActionInput["priority"],
        status: f.status as ActionInput["status"],
      };
      const res = await saveActionPlan(payload);
      if (res.ok) {
        toast.success("Plano de ação salvo");
        onDone();
      } else toast.error(res.error);
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Elemento" className="sm:col-span-2">
        <Select value={f.elementId} onChange={(e) => setF({ ...f, elementId: e.target.value, requirementId: "" })} required>
          {context.elements.map((el) => (
            <option key={el.id} value={el.id}>
              {el.label}
            </option>
          ))}
        </Select>
      </Field>
      {context.requirements ? (
        <Field label="Requisito da matriz" className="sm:col-span-2">
          <Select value={f.requirementId} onChange={set("requirementId")}>
            <option value="">Elemento (geral)</option>
            {reqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="O quê? (ação)" className="sm:col-span-2">
        <Textarea rows={2} value={f.what} onChange={set("what")} required placeholder="O que será feito" />
      </Field>
      <Field label="Por quê? (justificativa)" className="sm:col-span-2">
        <Textarea rows={2} value={f.why} onChange={set("why")} placeholder="Desvio / causa que a ação trata" />
      </Field>
      <Field label="Quem? (responsável)">
        <Select value={f.ownerId} onChange={set("ownerId")}>
          <option value="">A definir</option>
          {context.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Quando? (vencimento)">
        <Input type="date" value={f.dueDate} onChange={set("dueDate")} />
      </Field>
      <Field label="Onde?">
        <Input value={f.where} onChange={set("where")} placeholder="Área, doca, setor…" />
      </Field>
      <Field label="Quanto? (R$)">
        <Input inputMode="decimal" value={f.cost} onChange={set("cost")} placeholder="0,00" />
      </Field>
      <Field label="Como?" className="sm:col-span-2">
        <Textarea rows={3} value={f.how} onChange={set("how")} placeholder="Etapas / método de execução" />
      </Field>
      <Field label="Evidência de conclusão (texto ou link)" className="sm:col-span-2">
        <Input value={f.evidence} onChange={set("evidence")} placeholder="Ex.: foto do isolamento instalado, link do treinamento…" />
      </Field>
      <Field label="ID Sphera (finding / evento)" className="sm:col-span-2">
        <Input value={f.spheraId} onChange={set("spheraId")} placeholder="Ex.: 28126781" />
      </Field>
      <Field label="Prioridade">
        <Select value={f.priority} onChange={set("priority")}>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={f.status} onChange={set("status")}>
          {Object.entries(ACTION_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} Salvar
        </Button>
      </div>
    </form>
  );
}
