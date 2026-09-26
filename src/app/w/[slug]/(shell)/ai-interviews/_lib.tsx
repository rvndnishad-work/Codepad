/**
 * Access check shared by every AI screening page: signed in, a member of the
 * workspace, and on a plan with AI screening (others see an upgrade card).
 * Server-only.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePageAccess } from "@/lib/settings";
import { effectivePlanAllowsAiScreening } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";
import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credits";

export type AiAccess = {
  workspace: { id: string; name: string; slug: string };
  userId: string;
  canCreate: boolean;
  canBuy: boolean;
  packs: { id: string; label: string; credits: number; priceCents: number }[];
};

export async function loadAiAccess(slug: string, path: string): Promise<AiAccess | { gate: React.ReactNode }> {
  const session = await auth().catch(() => null);
  await validatePageAccess("/w/ai-screening", session);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(path)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { where: { userId: session.user.id }, select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();
  const member = workspace.members[0];
  if (!member) redirect("/dashboard");

  if (!effectivePlanAllowsAiScreening(workspace)) return { gate: <PlanGate slug={slug} /> };

  const [canCreate, canBuy] = await Promise.all([canMember(member, "interview:conduct"), canMember(member, "billing:manage")]);
  return {
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    userId: session.user.id,
    canCreate,
    canBuy,
    packs: AI_CREDIT_PACKS.map((p) => ({ id: p.id, label: p.label, credits: p.credits, priceCents: p.priceCents })),
  };
}

function PlanGate({ slug }: { slug: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-5 max-w-2xl mx-auto">
      <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary-soft">
        <Lock className="w-5 h-5" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-fg flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-secondary-soft" />
          AI screening is part of Growth
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-md">
          An AI interviewer runs a short coding interview with each candidate, and you review the results. Upgrade to Growth or
          Enterprise to use it.
        </p>
      </div>
      <Link
        href={`/w/${slug}?section=billing`}
        className="inline-flex items-center h-9 px-4 rounded-lg bg-secondary text-bg text-[13px] font-medium hover:brightness-110"
      >
        See plans
      </Link>
    </div>
  );
}
