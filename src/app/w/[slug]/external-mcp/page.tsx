import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Lock, Plug } from "lucide-react";
import { workspacePlanAllowsAiScreening } from "@/lib/ai-interview/credits";
import ExternalMcpConsole from "./ExternalMcpConsole";

type Props = {
  params: Promise<{ slug: string }>;
};

export const metadata = {
  title: "External MCP Servers — Workspace",
  robots: { index: false, follow: false },
};

export default async function WorkspaceExternalMcpPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/external-mcp`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      allowExternalMcp: true,
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
            <Plug className="w-5 h-5 text-accent" /> External MCP is a Growth feature
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-md">
            Upgrade this workspace to <span className="font-bold text-fg">Growth</span> or <span className="font-bold text-fg">Enterprise</span> to wire your internal MCP servers (docs, ATS, repos) into Interviewpad screenings.
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

  const servers = await prisma.externalMcpServer.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ExternalMcpConsole
      workspaceSlug={slug}
      canManage={canManage}
      allowExternalMcp={workspace.allowExternalMcp}
      servers={servers.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        hasAuthToken: !!s.authToken, // NEVER ship the plaintext to the client
        enabled: s.enabled,
        lastTestedAt: s.lastTestedAt?.toISOString() ?? null,
        lastTestStatus: s.lastTestStatus,
        lastTestSummary: s.lastTestSummary,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
