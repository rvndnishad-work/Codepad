import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BellRing, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";
import { decryptAtRest } from "@/lib/crypto/at-rest";
import { appOrigin } from "@/lib/interview/links";
import { maskedUrl } from "@/lib/alerts/format";
import { slackOAuthConfigured } from "@/lib/alerts/slack-oauth";
import AlertsClient, { type ChannelView } from "./AlertsClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ channel?: string; error?: string; connected?: string }>;
};

export const metadata = { title: "Slack and Teams alerts", robots: { index: false, follow: false } };

function safeMask(encrypted: string): string {
  try {
    return maskedUrl(decryptAtRest(encrypted));
  } catch {
    return "saved URL";
  }
}

export default async function AlertsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/alerts`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
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
      <div className="rounded-2xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-4 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-fg flex items-center justify-center gap-2">
            <BellRing className="w-5 h-5 text-secondary" /> Slack and Teams alerts are part of Growth
          </h1>
          <p className="text-sm text-muted leading-relaxed max-w-md">
            Post a short note in a Slack or Teams channel when a take home comes in, a screening is ready, or a
            recruiter makes a decision. Upgrade to Growth or Enterprise to connect a channel.
          </p>
        </div>
        <Link
          href={`/w/${slug}?section=billing`}
          className="inline-flex items-center h-9 px-4 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition"
        >
          See plans
        </Link>
      </div>
    );
  }

  const canManage = await canMember(member, "integration:manage");
  const rows = await prisma.alertChannel.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });
  const channels: ChannelView[] = rows.map((c) => ({
    id: c.id,
    provider: c.provider === "teams" ? "teams" : "slack",
    mode: c.mode === "oauth" ? "oauth" : "webhook",
    target: c.target,
    teamName: c.teamName,
    urlHint: safeMask(c.url),
    events: c.events,
    includeScore: c.includeScore,
    active: c.active,
    lastSentAt: c.lastSentAt?.toISOString() ?? null,
    lastError: c.lastError,
    lastErrorAt: c.lastErrorAt?.toISOString() ?? null,
  }));
  const selected = channels.find((c) => c.id === sp.channel) ?? channels[0] ?? null;

  return (
    <AlertsClient
      slug={slug}
      workspaceName={workspace.name}
      origin={await appOrigin()}
      canManage={canManage}
      slackAppReady={slackOAuthConfigured()}
      channels={channels}
      selectedId={selected?.id ?? null}
      flashError={typeof sp.error === "string" ? sp.error.slice(0, 300) : null}
      justConnected={sp.connected === "1"}
    />
  );
}
