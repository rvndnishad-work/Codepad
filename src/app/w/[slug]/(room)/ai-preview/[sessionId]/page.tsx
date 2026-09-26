import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";
import { resolveRoundsContent } from "@/lib/ai-interview/round-content";
import { parseTheorySettings } from "@/lib/ai-interview/theory";
import { PREVIEW_TOKEN } from "@/lib/ai-interview/preview-fetch";
import { loadAiAccess } from "../../../(shell)/ai-interviews/_lib";
import PreviewClient from "./PreviewClient";

type Props = { params: Promise<{ slug: string; sessionId: string }> };

export const metadata = { title: "Preview as candidate — Interviewpad", robots: { index: false, follow: false } };

/**
 * "Preview as candidate": the screening's candidate screen, from the starter
 * code, for a recruiter. Nothing is created: no candidate, no session, no
 * credit. The screen runs against a browser-side stand-in for the screening
 * APIs (see preview-fetch), and a placeholder invite token.
 */
export default async function AiScreeningPreviewPage({ params }: Props) {
  const { slug, sessionId } = await params;
  const access = await loadAiAccess(slug, `/w/${slug}/ai-preview/${sessionId}`);
  if ("gate" in access) return <div className="p-6 sm:p-10">{access.gate}</div>;
  if (!access.canCreate) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <p className="max-w-md text-center text-sm text-muted">Only people who can run screenings in this workspace can preview the candidate screen.</p>
      </main>
    );
  }

  const session = await prisma.aIInterviewSession.findFirst({
    where: { id: sessionId, workspaceId: access.workspace.id, practice: false },
    include: { rounds: true },
  });
  if (!session) notFound();

  const content = await resolveRoundsContent(resolveSessionRounds(session), session.workspaceId);
  const rounds = content.map((r) => ({
    roundId: r.roundId,
    order: r.order,
    title: r.title,
    description: r.description,
    kind: r.kind,
    language: r.language,
    estimatedMinutes: r.estimatedMinutes,
    // What the candidate starts from, never their saved work.
    files: r.kind === "conversation" || r.kind === "theory" ? {} : r.starterFiles,
    status: "PENDING",
    theory: r.kind === "theory" ? theoryInfo(session.rounds.find((x) => x.id === r.roundId)?.theoryJson) : undefined,
  }));
  if (!rounds.length) notFound();

  return (
    <PreviewClient
      backHref={`/w/${slug}/ai-interviews/${session.id}`}
      session={{
        inviteToken: PREVIEW_TOKEN,
        candidateName: session.candidateName,
        candidateEmail: "",
        positionTitle: session.positionTitle,
        status: "PENDING",
        startedAt: null,
        estimatedMinutes: rounds.reduce((n, r) => n + (r.estimatedMinutes || 0), 0) || 30,
        engagementLevel: session.engagementLevel,
      }}
      rounds={rounds}
      initialChat={[]}
      serverTranscribe={false}
    />
  );
}

function theoryInfo(json: string | null | undefined) {
  const s = parseTheorySettings(json);
  return { answerMode: s.answerMode, recordAudio: s.recordAudio };
}
