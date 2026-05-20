import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import type { SandpackFiles } from "@codesandbox/sandpack-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CollaborativePlaygroundLoader from "@/components/CollaborativePlaygroundLoader";
import SessionTimer from "@/components/SessionTimer";

export const metadata = {
  title: "Interview Playground — Interviewpad",
};

export default async function InterviewPlaygroundPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; snippetId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id, snippetId } = await params;
  const { token } = await searchParams;

  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      shareToken: true,
      sourceType: true,
      playgroundIds: true,
      candidateName: true,
      totalSec: true,
      startedAt: true,
      status: true,
      creatorRole: true,
    },
  });
  if (!interview) notFound();
  if (interview.sourceType !== "playground") notFound();

  const session = await auth().catch(() => null);
  const isOwner =
    !!session?.user?.id && session.user.id === interview.userId;
  const hasShareToken = !!token && token === interview.shareToken;
  if (!isOwner && !hasShareToken) {
    if (!session?.user?.id) {
      redirect(
        `/login?next=${encodeURIComponent(
          `/interview/${id}/play/${snippetId}${token ? `?token=${token}` : ""}`
        )}`
      );
    }
    notFound();
  }

  // Resolve dynamic interviewer role
  let isInterviewer = false;
  if (interview.creatorRole === "interviewer") {
    isInterviewer = isOwner;
  } else {
    isInterviewer = isOwner ? false : hasShareToken;
  }

  // Snippet must be in the interview's queue.
  let queue: string[] = [];
  try {
    const parsed = JSON.parse(interview.playgroundIds);
    if (Array.isArray(parsed)) {
      queue = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {}
  if (!queue.includes(snippetId)) notFound();

  const snippet = await prisma.snippet.findUnique({
    where: { id: snippetId },
    select: { id: true, slug: true, title: true, template: true, files: true },
  });
  if (!snippet) notFound();

  let initialFiles: SandpackFiles = {};
  try {
    initialFiles = JSON.parse(snippet.files) as SandpackFiles;
  } catch {
    initialFiles = { "/index.js": "// (failed to load files)" };
  }

  // Display label for cursor presence.
  const username = isInterviewer
    ? session?.user?.name?.split(/\s+/)[0] || "Interviewer"
    : interview.candidateName?.trim() || "Candidate";

  // Stable room id ties the Y.Doc to this interview + snippet pair so two
  // sessions over the same snippet don't share state.
  const roomId = `${interview.id}:${snippet.id}`;

  // Build a back-href that preserves the candidate's share token so they
  // land back on the lobby with access intact.
  const backHref = isOwner
    ? `/interview/${interview.id}?lobby=true`
    : `/interview/${interview.id}?token=${interview.shareToken}&lobby=true`;

  return (
    <div className="h-screen w-screen flex flex-col bg-bg text-fg overflow-hidden">
      <header className="shrink-0 h-12 border-b border-border bg-surface/40 px-4 flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-fg transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to session
        </Link>

        {/* Live Remaining Interview Timer */}
        <SessionTimer
          sessionId={interview.id}
          shareToken={interview.shareToken}
          isInterviewer={isInterviewer}
          initialTotalSec={interview.totalSec}
          initialStartedAtIso={interview.startedAt ? interview.startedAt.toISOString() : null}
          initialStatus={interview.status}
        />

        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent shrink-0">
            {isInterviewer ? "Interviewer view" : "Candidate view"}
          </span>
          <span className="text-xs text-fg/80 truncate">{snippet.title}</span>
          <span className="text-[10px] font-mono text-muted/60 truncate hidden sm:inline">
            · {interview.title}
          </span>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <CollaborativePlaygroundLoader
          roomId={roomId}
          template={snippet.template}
          initialFiles={initialFiles}
          username={username}
          isInterviewer={isInterviewer}
        />
      </main>
    </div>
  );
}
