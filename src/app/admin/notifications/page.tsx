import { requireAdminAccess } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import AdminBroadcastConsole from "./AdminBroadcastConsole";
import { listBroadcastsAction } from "@/lib/notifications/broadcast";

export const metadata = {
  title: "Notifications — Admin",
  robots: { index: false, follow: false },
};

/** Cap on the workspace picker. Larger platforms should target by user
 *  email or pick from the newest workspaces. */
const WORKSPACE_PICKER_LIMIT = 500;

export default async function AdminNotificationsPage() {
  await requireAdminAccess("platform:admin");

  // Pre-load the sent log + workspace list (for the WORKSPACE audience picker)
  // server-side so the first paint is complete.
  const [sent, workspaces] = await Promise.all([
    listBroadcastsAction(50),
    prisma.workspace.findMany({
      select: { id: true, name: true, slug: true, planName: true },
      orderBy: { name: "asc" },
      take: WORKSPACE_PICKER_LIMIT,
    }),
  ]);

  return (
    <AdminBroadcastConsole
      initialSent={sent}
      workspaces={workspaces.map((w) => ({
        id: w.id,
        label: `${w.name} (${w.slug}) · ${w.planName}`,
      }))}
    />
  );
}
