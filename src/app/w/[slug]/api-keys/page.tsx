import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Lock, KeyRound } from "lucide-react";
import { workspacePlanAllowsAiScreening } from "@/lib/ai-interview/credits";
import ApiKeysConsole from "./ApiKeysConsole";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    kind?: "tool" | "resource";
    errorsOnly?: "1";
  }>;
};

const AUDIT_PAGE_SIZE = 25;

export const metadata = {
  title: "MCP API Keys — Workspace",
  robots: { index: false, follow: false },
};

export default async function WorkspaceApiKeysPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const auditFilter: {
    kind?: "tool" | "resource";
    errorCode?: { not: null };
  } = {};
  if (sp.kind === "tool" || sp.kind === "resource") auditFilter.kind = sp.kind;
  if (sp.errorsOnly === "1") auditFilter.errorCode = { not: null };
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/api-keys`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) notFound();

  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");

  if (!workspacePlanAllowsAiScreening(workspace.planName)) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-5 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-fg flex items-center justify-center gap-2">
            <KeyRound className="w-5 h-5 text-accent" /> MCP API is a Growth feature
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-md">
            Upgrade this workspace to <span className="font-bold text-fg">Growth</span> or <span className="font-bold text-fg">Enterprise</span> to mint API keys and connect Claude, Cursor, or any MCP-compatible client to your hiring pipeline.
          </p>
        </div>
        <Link
          href={`/w/${slug}?section=billing`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition shadow-md"
        >
          View plans &amp; upgrade
        </Link>
      </div>
    );
  }

  const canManage = member.role === "OWNER" || member.role === "ADMIN";

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const auditWhere = { workspaceId: workspace.id, ...auditFilter };

  const [keys, recentAuditRaw, totalAuditEntries, callsLast24h, lastCallRow] =
    await Promise.all([
      prisma.mcpApiKey.findMany({
        where: { workspaceId: workspace.id },
        orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.mcpAuditLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * AUDIT_PAGE_SIZE,
        take: AUDIT_PAGE_SIZE,
        include: {
          apiKey: { select: { label: true, keyPreview: true } },
        },
      }),
      prisma.mcpAuditLog.count({ where: auditWhere }),
      prisma.mcpAuditLog.count({
        where: { workspaceId: workspace.id, createdAt: { gte: last24h } },
      }),
      prisma.mcpAuditLog.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  const totalAuditPages = Math.max(1, Math.ceil(totalAuditEntries / AUDIT_PAGE_SIZE));

  const activeKeyCount = keys.filter((k) => !k.revokedAt).length;

  return (
    <ApiKeysConsole
      workspaceSlug={slug}
      workspaceName={workspace.name}
      canManage={canManage}
      stats={{
        activeKeyCount,
        callsLast24h,
        lastCallAt: lastCallRow?.createdAt?.toISOString() ?? null,
      }}
      auditPagination={{
        page,
        totalPages: totalAuditPages,
        totalEntries: totalAuditEntries,
        pageSize: AUDIT_PAGE_SIZE,
        kind: sp.kind ?? "ALL",
        errorsOnly: sp.errorsOnly === "1",
      }}
      keys={keys.map((k) => ({
        id: k.id,
        label: k.label,
        keyPreview: k.keyPreview,
        scopes: safeParseScopes(k.scopes),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))}
      auditLog={recentAuditRaw.map((e) => ({
        id: e.id,
        kind: e.kind,
        name: e.name,
        argsJson: e.argsJson,
        resultSummary: e.resultSummary,
        errorCode: e.errorCode,
        durationMs: e.durationMs,
        createdAt: e.createdAt.toISOString(),
        keyLabel: e.apiKey?.label ?? null,
        keyPreview: e.apiKey?.keyPreview ?? null,
      }))}
    />
  );
}

function safeParseScopes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
  } catch {
    /* ignore */
  }
  return ["read"];
}
