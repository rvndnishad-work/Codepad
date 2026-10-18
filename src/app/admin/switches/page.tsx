import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { SWITCHES, type SwitchState } from "@/lib/admin/switches";
import { OpsHeader, OpsTabs } from "../maintenance/_parts";
import SwitchesTable, { type SwitchRow } from "./SwitchesTable";

export const metadata = {
  title: "Feature switches — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function normalise(s: string | null | undefined): SwitchState {
  return s === "off" || s === "read_only" ? s : "on";
}

export default async function SwitchesPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  await requireAdminAccess("platform:admin");
  const { key } = await searchParams;
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const dayAgo = new Date(now.getTime() - 24 * 3_600_000);

  // Read fresh from the database (the registry cache is for hot paths).
  const [rows, runsHour, runsDay] = await Promise.all([
    prisma.featureSwitch.findMany({ where: { key: { in: SWITCHES.map((s) => s.key) } } }),
    prisma.activityEvent.count({ where: { kind: "playground_run", createdAt: { gte: hourAgo } } }),
    prisma.activityEvent.count({ where: { kind: "playground_run", createdAt: { gte: dayAgo } } }),
  ]);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const userIds = [...new Set(rows.map((r) => r.updatedById).filter((x): x is string => !!x))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const names = new Map(users.map((u) => [u.id, u.name || u.email || "Unknown"]));

  const data: SwitchRow[] = SWITCHES.map((d) => {
    const r = byKey.get(d.key);
    const expired = !!r?.resumeAt && r.resumeAt.getTime() <= now.getTime();
    return {
      key: d.key,
      label: d.label,
      side: d.side,
      appliesTo: d.appliesTo,
      description: d.description,
      alsoAffects: d.alsoAffects ?? [],
      defaultMessage: d.defaultMessage,
      state: expired ? "on" : normalise(r?.state),
      message: r?.message ?? null,
      resumeAt: !expired && r?.resumeAt ? r.resumeAt.toISOString() : null,
      changedBy: r?.updatedById ? names.get(r.updatedById) ?? "Unknown" : null,
      changedAt: r ? r.updatedAt.toISOString() : null,
      note: r?.updatedNote ?? null,
      load: d.key === "playground-run" ? `${runsDay.toLocaleString("en-US")} runs today, ${runsHour.toLocaleString("en-US")} in the last hour` : null,
    };
  });

  return (
    <div className="space-y-6">
      <OpsHeader
        title="Feature switches"
        description="One switch per function, read by the code everywhere the function runs. Pages stay up; the function shows your message instead."
        action={
          <Link
            href="/admin/maintenance?tab=history"
            className="h-9 px-3.5 inline-flex items-center rounded-lg border border-border text-sm text-fg hover:bg-panel"
          >
            History
          </Link>
        }
      />
      <OpsTabs active="switches" />
      <SwitchesTable rows={data} initialKey={key ?? null} />
    </div>
  );
}
