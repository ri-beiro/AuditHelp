"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reportIncident } from "@/server/incidents";
import { DEFAULT_AREAS, INCIDENT_TYPE_LABEL, INCIDENT_TYPES, type IncidentTypeKey } from "@/lib/incidents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export function ReportIncidentDialog({
  open,
  onOpenChange,
  unitId,
  members,
  areas,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unitId: string;
  members: { id: string; name: string }[];
  areas: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString();
  const [f, setF] = useState({
    date: now.slice(0, 10),
    time: now.slice(11, 16),
    area: "",
    type: "NEAR_MISS" as IncidentTypeKey,
    hipo: false,
    title: "",
    description: "",
    responsibleId: "",
    spheraId: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const areaOptions = [...new Set([...areas, ...DEFAULT_AREAS])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Reportar ocorrência" description="Etapa 1 — Reporte. Registre o quanto antes; detalhes podem ser completados na investigação.">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await reportIncident({
                unitId,
                occurredAt: new Date(`${f.date}T${f.time || "12:00"}`).toISOString(),
                area: f.area,
                type: f.type,
                hipo: f.hipo,
                title: f.title,
                description: f.description,
                responsibleId: f.responsibleId || null,
                spheraId: f.spheraId,
              });
              if (res.ok && res.data) {
                toast.success("Ocorrência registrada");
                onOpenChange(false);
                router.push(`/incidentes/${res.data.id}`);
              } else if (!res.ok) toast.error(res.error);
            });
          }}
        >
          <Field label="Data">
            <Input type="date" value={f.date} onChange={set("date")} required />
          </Field>
          <Field label="Hora">
            <Input type="time" value={f.time} onChange={set("time")} />
          </Field>
          <Field label="Área">
            <Input list="areas-list" value={f.area} onChange={set("area")} required placeholder="Ex.: Pátio Inbound" />
            <datalist id="areas-list">
              {areaOptions.map((a) => (
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
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 sm:col-span-2",
              f.hipo ? "border-critico/40 bg-critico-bg" : "border-slate-200",
            )}
          >
            <input type="checkbox" className="mt-1" checked={f.hipo} onChange={(e) => setF({ ...f, hipo: e.target.checked })} />
            <span>
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                <Flame className="size-4 text-critico" /> HIPO — High Potential Incident
              </span>
              <span className="text-xs text-slate-500">
                Potencial de fatalidade ou lesão grave/irreversível. Exige investigação completa com causa raiz.
              </span>
            </span>
          </label>
          <Field label="Título" className="sm:col-span-2">
            <Input value={f.title} onChange={set("title")} required placeholder="Resumo curto do evento" />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <Textarea rows={4} value={f.description} onChange={set("description")} required placeholder="O que aconteceu, onde, quem estava envolvido…" />
          </Field>
          <Field label="Responsável pela investigação">
            <Select value={f.responsibleId} onChange={set("responsibleId")}>
              <option value="">A definir</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ID Sphera (opcional)">
            <Input value={f.spheraId} onChange={set("spheraId")} placeholder="28126781" />
          </Field>
          <p className="text-[11px] text-slate-500 sm:col-span-2">Fotos e documentos podem ser anexados na tela da ocorrência após o registro.</p>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Registrar ocorrência</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
