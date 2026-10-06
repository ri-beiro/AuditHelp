import { db } from "@/lib/db";
import { can, getWorkspace } from "@/server/context";
import { unitMembers } from "@/server/queries";
import { loadAuditHistory } from "@/server/audit-history-queries";
import { NoUnit } from "@/components/no-unit";
import { AuditHistoryView } from "@/components/audits/audit-history-view";

export default async function AuditHistoryPage() {
  const { user, unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const [rows, members, elements] = await Promise.all([
    loadAuditHistory(unit.id),
    unitMembers(unit.id),
    db.element.findMany({ orderBy: [{ framework: "desc" }, { number: "asc" }] }),
  ]);
  return (
    <AuditHistoryView
      unit={{ id: unit.id, name: unit.name }}
      rows={rows}
      canEdit={can(user.role, "score")}
      canAction={can(user.role, "action")}
      blobEnabled={!!process.env.BLOB_READ_WRITE_TOKEN}
      members={members}
      elements={elements.map((e) => ({ id: e.id, code: e.code, label: `${e.code} · ${e.shortName}` }))}
    />
  );
}
