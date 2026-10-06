"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDown, FileSpreadsheet, Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReportIncidentDialog } from "./report-dialog";

/** Ações do topo da lista: reportar, importar/exportar Excel e baixar o modelo. */
export function IncidentsToolbar({
  unitId,
  members,
  areas,
}: {
  unitId: string;
  members: { id: string; name: string }[];
  areas: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const importFile = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/incidentes/excel", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Falha na importação");
        return;
      }
      const errors: string[] = json.errors ?? [];
      toast.success(`${json.created} ocorrência(s) importada(s)`, {
        description: errors.length ? `${errors.length} linha(s) ignorada(s): ${errors.slice(0, 3).join(" · ")}` : undefined,
      });
      router.refresh();
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <Button variant="outline" asChild>
        <a href="/api/incidentes/excel?modelo=1">
          <FileSpreadsheet /> Modelo
        </a>
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} Importar Excel
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
      <Button variant="outline" asChild>
        <a href="/api/incidentes/excel">
          <FileDown /> Exportar
        </a>
      </Button>
      <Button variant="accent" onClick={() => setOpen(true)}>
        <Plus /> Reportar ocorrência
      </Button>
      <ReportIncidentDialog open={open} onOpenChange={setOpen} unitId={unitId} members={members} areas={areas} />
    </>
  );
}
