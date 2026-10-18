import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { planLabel, workspaceStatusPills } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "./_data";
import { Pill, fmtDate } from "./_ui";
import { Btn } from "@/app/w/[slug]/(shell)/candidates/_components/ui";
import WorkspaceTabs from "./WorkspaceTabs";
import WorkspaceAction from "./WorkspaceAction";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export default async function WorkspaceDetailLayout({ params, children }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const pills = workspaceStatusPills(ws);
  const n = ws.counts.members;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/admin/workspaces" className="hover:text-fg">
          Workspaces
        </Link>{" "}
        / <span className="text-fg">{ws.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            aria-hidden
            className="w-11 h-11 shrink-0 rounded-[10px] bg-secondary/15 text-secondary-soft flex items-center justify-center font-semibold text-base select-none"
          >
            {ws.name.trim().charAt(0).toUpperCase() || "W"}
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-semibold tracking-tight text-fg">
              <span className="truncate">{ws.name}</span>
              <Pill tone="info">{planLabel(ws.planName)}</Pill>
              {pills.map((p) => (
                <Pill key={p.label} tone={p.tone}>
                  {p.label}
                </Pill>
              ))}
            </h1>
            <div className="text-sm text-muted">
              <span className="font-mono text-[13px]">{ws.slug}</span> · created {fmtDate(ws.createdAt)}
              {ws.owner && (
                <>
                  {" "}
                  · owner {ws.owner.name ?? ws.owner.email}
                </>
              )}{" "}
              · {n === 1 ? "1 member" : `${n} members`}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn href={`/admin/workspaces/${ws.id}/view-as`}>View as owner</Btn>
          <Btn href={`/admin/audit?targetType=workspace&targetId=${ws.id}`}>Audit log</Btn>
          <WorkspaceAction kind="plan" workspaceId={ws.id} label="Change plan" currentPlan={ws.planName} />
          {ws.lockedAt ? (
            <WorkspaceAction kind="unlock" workspaceId={ws.id} label="Unlock" />
          ) : (
            <WorkspaceAction kind="lock" workspaceId={ws.id} label="Lock workspace" variant="danger" />
          )}
        </div>
      </div>

      {ws.lockedAt && (
        <div className="rounded-xl border border-danger/40 bg-surface px-4 py-3 text-sm text-fg">
          Locked on {fmtDate(ws.lockedAt, true)}
          {ws.lockedReason ? `: ${ws.lockedReason}` : ""}. Members are refused and candidate links show a notice.
        </div>
      )}

      <WorkspaceTabs workspaceId={ws.id} counts={ws.counts} />
      <div>{children}</div>
    </div>
  );
}
