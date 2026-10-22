import { can, getWorkspace } from "@/server/context";
import { listSafetyContents } from "@/server/safety-content-queries";
import { NoUnit } from "@/components/no-unit";
import { SafetyContentsView } from "@/components/safety-contents/safety-contents-view";

export default async function SafetyContentsPage() {
  const { user, units, unit } = await getWorkspace();
  if (!unit) return <NoUnit />;
  const contents = await listSafetyContents(user, unit.id);
  return (
    <SafetyContentsView
      unit={{ id: unit.id, name: unit.name }}
      units={units.map((u) => ({ id: u.id, name: u.name }))}
      contents={contents}
      canManage={can(user.role, "admin")}
      blobEnabled={!!process.env.BLOB_READ_WRITE_TOKEN}
    />
  );
}
