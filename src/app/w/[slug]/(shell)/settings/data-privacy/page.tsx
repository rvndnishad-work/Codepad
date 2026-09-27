import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { formatWorkspaceDate } from "@/lib/workspace/settings";
import { planRetentionStep, retentionCutoff, withRetentionDefaults } from "@/lib/workspace/data-privacy";
import { countForRule } from "@/lib/workspace/data-privacy-server";
import DataPrivacyClient, { type ExportRow, type RequestRow, type RuleRow } from "./DataPrivacyClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Data and privacy settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/**
 * Settings > Data and privacy: retention rules, candidate data requests,
 * export everything, delete the workspace, and who processes the data.
 */
export default async function DataAndPrivacySettingsPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getSettingsPageContext(slug);
  const wsId = ctx.workspace.id;
  const now = new Date();
  const fmt = (d: Date | null, withTime = false) => (d ? formatWorkspaceDate(d, ctx.settings, withTime) : null);

  // Requests name candidates and exports hold everything, so only owners and admins see them.
  const [ruleRows, requests, exports] = await Promise.all([
    prisma.retentionRule.findMany({ where: { workspaceId: wsId } }),
    !ctx.canEdit
      ? []
      : prisma.dataRequest.findMany({
          where: { workspaceId: wsId, OR: [{ status: "OPEN" }, { completedAt: { gte: new Date(now.getTime() - 90 * 86_400_000) } }] },
          orderBy: [{ status: "desc" }, { dueAt: "asc" }],
          take: 50,
        }),
    !ctx.canEdit ? [] : prisma.workspaceExport.findMany({ where: { workspaceId: wsId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const userIds = [
    ...new Set([...requests.flatMap((r) => [r.requestedById, r.completedById]), ...exports.map((e) => e.requestedById)].filter((x): x is string => !!x)),
  ];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  const who = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name || u.email || null : null;
  };

  const rules = withRetentionDefaults(ruleRows);
  // What each saved rule covers today, so people can see its reach before turning it on.
  const coverage = await Promise.all(rules.map((r) => countForRule(wsId, r.kind, retentionCutoff(r.amount, r.unit, now)).catch(() => null)));

  const ruleView: RuleRow[] = rules.map((r, i) => {
    const plan = planRetentionStep(r, now);
    return {
      kind: r.kind,
      enabled: r.enabled,
      amount: r.amount,
      unit: r.unit,
      coversNow: coverage[i],
      nextEraseAt: plan.step === "wait" || plan.step === "erase" ? fmt(r.nextNoticeAt) : null,
      lastRunAt: fmt(r.lastRunAt),
      lastErasedCount: r.lastErasedCount,
    };
  });

  const requestView: RequestRow[] = requests.map((r) => ({
    id: r.id,
    email: r.email,
    kind: r.kind === "ERASE" ? "ERASE" : "COPY",
    status: r.status === "DONE" || r.status === "CANCELLED" ? r.status : "OPEN",
    dueAt: r.dueAt.toISOString(),
    dueLabel: fmt(r.dueAt)!,
    createdLabel: fmt(r.createdAt)!,
    completedLabel: fmt(r.completedAt),
    itemCount: r.itemCount,
    by: who(r.completedById ?? r.requestedById),
  }));

  const exportView: ExportRow[] = exports.map((e) => ({
    id: e.id,
    status: e.status === "READY" && e.expiresAt && e.expiresAt <= now ? "EXPIRED" : e.status,
    createdLabel: fmt(e.createdAt, true)!,
    expiresLabel: fmt(e.expiresAt),
    sizeBytes: e.sizeBytes,
    by: who(e.requestedById),
    downloadUrl: `/api/workspace-exports/${e.id}`,
  }));

  return (
    <DataPrivacyClient
      slug={slug}
      workspaceName={ctx.workspace.name}
      canEdit={ctx.canEdit}
      owner={ctx.owner}
      now={now.toISOString()}
      rules={ruleView}
      requests={requestView}
      exports={exportView}
    />
  );
}
