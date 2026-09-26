import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Lock, KeyRound } from "lucide-react";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";
import { appOrigin } from "@/lib/interview/links";
import ApiKeysConsole, { type ConsoleTab } from "./ApiKeysConsole";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    tab?: string;
    page?: string;
    kind?: string;
    errorsOnly?: string;
    key?: string;
  }>;
};

const AUDIT_PAGE_SIZE = 25;
const TABS: ConsoleTab[] = ["keys", "activity", "connect"];

export const metadata = {
  title: "API and MCP — Workspace",
  robots: { index: false, follow: false },
};

export default async function WorkspaceApiKeysPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab: ConsoleTab = TABS.includes(sp.tab as ConsoleTab) ? (sp.tab as ConsoleTab) : "keys";
  const kind = sp.kind === "tool" || sp.kind === "resource" ? sp.kind : "ALL";
  const errorsOnly = sp.errorsOnly === "1";
  const keyFilter = sp.key && /^[a-z0-9]{8,40}$/i.test(sp.key) ? sp.key : null;

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
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();

  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");

  if (!growthToolsEnabled(workspace)) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-5 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-fg flex items-center justify-center gap-2">
            <KeyRound className="w-5 h-5 text-secondary" /> API and MCP are on the Growth plan
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-md">
            Upgrade this workspace to <span className="font-bold text-fg">Growth</span> or <span className="font-bold text-fg">Enterprise</span> to create keys and connect Claude, Cursor, or any MCP client to your screening data.
          </p>
        </div>
        <Link
          href={`/w/${slug}?section=billing`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition shadow-md"
        >
          View plans and upgrade
        </Link>
      </div>
    );
  }

  const canManage = await canMember(member, "integration:manage");

  const auditWhere = {
    workspaceId: workspace.id,
    // Outbound rows are the AI interviewer calling a customer's own MCP
    // server; they have their own page under AI screening.
    kind: kind === "ALL" ? { in: ["tool", "resource"] } : kind,
    ...(errorsOnly ? { errorCode: { not: null } } : {}),
    ...(keyFilter ? { apiKeyId: keyFilter } : {}),
  };

  const [keys, totalAuditEntries] = await Promise.all([
    prisma.mcpApiKey.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.mcpAuditLog.count({ where: auditWhere }),
  ]);
  const totalAuditPages = Math.max(1, Math.ceil(totalAuditEntries / AUDIT_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), totalAuditPages);

  const [auditRaw, recentRaw, creators] = await Promise.all([
    tab === "activity"
      ? prisma.mcpAuditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * AUDIT_PAGE_SIZE,
          take: AUDIT_PAGE_SIZE,
          include: { apiKey: { select: { label: true, keyPreview: true } } },
        })
      : Promise.resolve([]),
    tab === "keys"
      ? prisma.mcpAuditLog.findMany({
          where: { workspaceId: workspace.id, kind: { in: ["tool", "resource"] } },
          orderBy: { createdAt: "desc" },
          take: 4,
          include: { apiKey: { select: { label: true, keyPreview: true } } },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { id: { in: [...new Set(keys.map((k) => k.createdByUserId).filter((v): v is string => !!v))] } },
      select: { id: true, name: true, email: true },
    }),
  ]);
  const creatorName = new Map(creators.map((u) => [u.id, u.name?.trim() || u.email || "Unknown"]));

  const toEntry = (e: (typeof auditRaw)[number]) => ({
    id: e.id,
    kind: e.kind,
    name: e.name,
    argsJson: e.argsJson,
    resultSummary: e.resultSummary,
    errorCode: e.errorCode,
    durationMs: e.durationMs,
    createdAt: e.createdAt.toISOString(),
    keyId: e.apiKeyId,
    keyLabel: e.apiKey?.label ?? null,
    keyPreview: e.apiKey?.keyPreview ?? null,
  });

  return (
    <ApiKeysConsole
      workspaceSlug={slug}
      workspaceName={workspace.name}
      mcpUrl={`${await appOrigin()}/api/mcp`}
      canManage={canManage}
      tab={tab}
      now={new Date().toISOString()}
      auditPagination={{
        page,
        totalPages: totalAuditPages,
        totalEntries: totalAuditEntries,
        pageSize: AUDIT_PAGE_SIZE,
        kind,
        errorsOnly,
        keyId: keyFilter,
      }}
      keys={keys.map((k) => ({
        id: k.id,
        label: k.label,
        keyPreview: k.keyPreview,
        scopes: safeParseScopes(k.scopes),
        createdBy: k.createdByUserId ? creatorName.get(k.createdByUserId) ?? null : null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))}
      auditLog={auditRaw.map(toEntry)}
      recent={recentRaw.map(toEntry)}
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
