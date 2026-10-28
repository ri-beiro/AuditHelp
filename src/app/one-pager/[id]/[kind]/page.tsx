// Página de impressão dos One Pagers (16:9). Use "Imprimir → Salvar como PDF".
import { notFound } from "next/navigation";
import { assertUnitAccess, getCurrentUser } from "@/server/context";
import { loadIncidentDetail } from "@/server/incident-queries";
import { fileHref } from "@/lib/file-url";
import { OnePagerSheet } from "@/components/incidents/one-pager-sheet";
import { PrintBar } from "./print-bar";

export const metadata = { title: "One Pager" };

export default async function OnePagerPrint({ params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (kind !== "inicial" && kind !== "final") notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const inc = await loadIncidentDetail(id);
  if (!inc) notFound();
  await assertUnitAccess(user, inc.unitId);
  const photos = inc.onePager.initial.photos
    .map((pid) => inc.attachments.find((a) => a.id === pid))
    .filter((a) => a?.mimeType?.startsWith("image/"))
    .map((a) => fileHref(a!.url));
  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:p-0">
      <style>{`@page { size: 1280px 720px; margin: 0 } * { -webkit-print-color-adjust: exact; print-color-adjust: exact } @media print { html, body { background: #fff } }`}</style>
      <PrintBar title={`${inc.number} · One Pager ${kind}`} />
      <div className="mx-auto w-[1280px] shadow-lift print:shadow-none">
        <OnePagerSheet
          kind={kind === "final" ? "final" : "initial"}
          inc={{
            unitName: inc.unitName,
            spheraId: inc.spheraId,
            occurredAt: inc.occurredAt,
            area: inc.area,
            type: inc.type,
            hipo: inc.hipo,
            description: inc.description,
            basicRef: inc.basicRef,
          }}
          pagers={inc.onePager}
          photos={photos}
        />
      </div>
    </div>
  );
}
