import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import AcceptInviteButton from "./AcceptInviteButton";

/**
 * Workspace invite acceptance (IP-73). The invitee lands here from the email
 * link. Membership is created only here, on an authenticated accept — no more
 * silent placeholder-User minting. Guardrails:
 *   - invite must exist, be unexpired, and unaccepted
 *   - the signed-in user's email must match the invited email
 *   - accepting is idempotent (already-a-member just forwards to the workspace)
 */
type Props = { params: Promise<{ token: string }> };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col items-center justify-center px-4 py-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-120px] left-[-120px] w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-120px] w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="w-full max-w-md bg-surface/70 border border-border backdrop-blur-xl rounded-3xl p-8 shadow-sm relative z-10 text-center space-y-5">
        {children}
      </div>
    </div>
  );
}

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!invite) {
    return (
      <Shell>
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black tracking-tight">Invitation not found</h1>
        <p className="text-sm text-muted leading-relaxed">
          This invite link is invalid. Ask whoever invited you to send a fresh one.
        </p>
      </Shell>
    );
  }

  const session = await auth().catch(() => null);
  const expired = invite.expiresAt.getTime() < new Date().getTime();
  const alreadyAccepted = !!invite.acceptedAt;

  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // If they're already a member, just take them in — accepting twice is a no-op.
  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: invite.workspace.id, userId: session.user.id },
    select: { id: true },
  });
  if (existingMember) {
    redirect(`/w/${invite.workspace.slug}`);
  }

  if (expired || alreadyAccepted) {
    return (
      <Shell>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black tracking-tight">
          {expired ? "Invitation expired" : "Invitation already used"}
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Ask an admin of {invite.workspace.name} to send you a new invite.
        </p>
        <Link href="/w" className="inline-block text-xs font-black uppercase tracking-wider text-accent hover:underline">
          Go to your workspaces
        </Link>
      </Shell>
    );
  }

  const emailMatches =
    (session.user.email ?? "").toLowerCase() === invite.email.toLowerCase();

  if (!emailMatches) {
    return (
      <Shell>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black tracking-tight">Wrong account</h1>
        <p className="text-sm text-muted leading-relaxed">
          This invite was sent to <span className="font-mono text-fg">{invite.email}</span>, but
          you&apos;re signed in as <span className="font-mono text-fg">{session.user.email}</span>.
          Sign in with the invited email to accept.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-500 mx-auto">
        <Building2 className="w-7 h-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-black tracking-tight">Join {invite.workspace.name}</h1>
        <p className="text-sm text-muted leading-relaxed">
          You&apos;ve been invited as a{" "}
          <span className="text-fg font-semibold">
            {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
          </span>
          . Accept to start collaborating.
        </p>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-500">
        <CheckCircle2 className="w-3.5 h-3.5" /> Signed in as {session.user.email}
      </div>
      <AcceptInviteButton token={token} workspaceSlug={invite.workspace.slug} />
    </Shell>
  );
}
