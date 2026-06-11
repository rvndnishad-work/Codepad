import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import ReplayPlayerClient from "@/app/admin/attempts/[id]/replay/ReplayPlayerClient";

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  return {
    title: attempt ? `Workspace Session Replay: ${attempt.user.name || "Candidate"} — Interviewpad` : "Replay not found",
  };
}

export default async function WorkspaceSessionReplayPage({ params }: Props) {
  const { slug, id } = await params;
  
  // 1. Authenticate user
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/attempts/${id}/replay`)}`);
  }

  // 2. Fetch workspace and check existence
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!workspace) notFound();

  // 3. Retrieve attempt with related workspace contexts
  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      challenge: { select: { title: true, workspaceId: true } },
      eventLog: true,
      integrityReport: true,
      takeHomeAssignment: { select: { workspaceId: true } },
    },
  });

  if (!attempt) notFound();

  // 4. Verify candidate attempt belongs to active recruiter workspace context
  const belongsToWorkspace = 
    attempt.challenge.workspaceId === workspace.id || 
    attempt.takeHomeAssignment?.workspaceId === workspace.id;

  const showAdmin = await staffCan(session, "platform:admin");

  // Secure: Return 404 on cross-tenant attempts unless logged in as a site administrator
  if (!belongsToWorkspace && !showAdmin) {
    notFound();
  }

  // Parse eventsData list
  let events = [];
  if (attempt.eventLog?.eventsData) {
    try {
      events = JSON.parse(attempt.eventLog.eventsData);
    } catch {
      events = [];
    }
  }

  // Parse integrity reports
  let integrity = null;
  if (attempt.integrityReport) {
    let pasteDetails = [];
    try {
      pasteDetails = JSON.parse(attempt.integrityReport.pasteDetails);
    } catch {
      pasteDetails = [];
    }

    integrity = {
      suspicionScore: attempt.integrityReport.suspicionScore,
      totalBlurSec: attempt.integrityReport.totalBlurSec,
      blurCount: attempt.integrityReport.blurCount,
      pasteCount: attempt.integrityReport.pasteCount,
      pasteDetails,
    };
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <ReplayPlayerClient
        attempt={{
          id: attempt.id,
          candidateName: attempt.user.name || "Anonymous",
          candidateEmail: attempt.user.email || "No email",
          challengeTitle: attempt.challenge.title,
          startedAt: attempt.startedAt.toISOString(),
          durationSec: attempt.durationSec ?? 0,
          score: attempt.score,
        }}
        events={events}
        integrity={integrity}
        backUrl={`/w/${slug}/attempts/${attempt.id}`}
      />
    </div>
  );
}
