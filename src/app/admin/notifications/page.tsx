import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminBroadcastConsole from "./AdminBroadcastConsole";
import { listBroadcastsAction } from "@/lib/notifications/broadcast";

export const metadata = {
  title: "Notifications — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminNotificationsPage() {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) redirect("/");

  // Pre-load the sent log + workspace list (for the WORKSPACE audience picker)
  // server-side so the first paint is complete.
  const [sent, workspaces] = await Promise.all([
    listBroadcastsAction(50),
    prisma.workspace.findMany({
      select: { id: true, name: true, slug: true, planName: true },
      orderBy: { name: "asc" },
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
