import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ChallengeAttemptClient from "./ChallengeAttemptClient";
import HarnessAttemptClient from "./HarnessAttemptClient";
import TrackHelpPanel, { type TrackHelpContext } from "./TrackHelpPanel";
import { parseVideoUrl } from "@/lib/video";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { title: true },
  });
  return {
    title: challenge ? `Solve: ${challenge.title} — Interviewpad` : "Challenge not found",
  };
}

export default async function ChallengeAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    session?: string;
    step?: string;
    invite?: string;
    multiplayer?: string;
    sim?: string;
    token?: string;
  }>;
}) {
  const { slug } = await params;
  const {
    session: sessionIdParam,
    step: stepParam,
    invite: inviteToken,
    multiplayer: multiplayerParam,
    sim: simParam,
    token: tokenParam,
  } = await searchParams;

  const session = await auth().catch(() => null);

  let isCollabPeer = false;
  let isInterviewer = false;
  let candidateName = "";
  if (sessionIdParam) {
    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionIdParam },
      select: { shareToken: true, userId: true, creatorRole: true, candidateName: true },
    });
    if (interviewSession) {
      candidateName = interviewSession.candidateName ?? "";
      const isSessionOwner = session?.user?.id === interviewSession.userId;
      const hasValidToken = !!tokenParam && tokenParam === interviewSession.shareToken;

      if (hasValidToken) isCollabPeer = true;

      // Determine this viewer's role based on creatorRole logic
      if (interviewSession.creatorRole === "interviewer") {
        // Owner is the Interviewer, token-holder is the Candidate
        isInterviewer = isSessionOwner;
      } else {
        // Default: Owner is Candidate, token-holder is Interviewer
        isInterviewer = hasValidToken;
      }
    }
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: {
      steps: { orderBy: { position: "asc" } },
    },
  });
  if (!challenge) notFound();

  let takeHomeAssignment = null;
  if (tokenParam) {
    takeHomeAssignment = await prisma.takeHomeAssignment.findUnique({
      where: { token: tokenParam },
    });
  }

  const isTakeHomeValid = !!(takeHomeAssignment && takeHomeAssignment.challengeId === challenge.id);

  if (!isCollabPeer && !isTakeHomeValid && !session?.user?.id) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/challenges/${slug}/attempt${stepParam ? `?step=${stepParam}` : ""}`
      )}`
    );
  }
  
  const userId = session?.user?.id ?? "collab-peer";
  const userEmail = session?.user?.email?.toLowerCase() ?? null;

  // ── Access control (mirrors /tracks/[slug] page) ──────────────────────
  // - Author/admin always.
  // - published+public → anyone.
  // - published+private → must hold a magic-link token or already have an
  //   accepted invitation.
  // - Anything else → 404 (non-enumerable, like /tracks did).
  const isOwner = challenge.authorId === userId;
  const callerIsAdmin = await staffCan(session, "content:curate");
  let canView = isCollabPeer || isOwner || callerIsAdmin;

  if (isTakeHomeValid && takeHomeAssignment) {
    const now = new Date();
    const timeLimitMs = takeHomeAssignment.timeLimitMin * 60 * 1000;
    const startedAtTime = takeHomeAssignment.startedAt ? takeHomeAssignment.startedAt.getTime() : now.getTime();
    const isTimeUp = now.getTime() > startedAtTime + timeLimitMs;

    if (takeHomeAssignment.status === "ACTIVE" && isTimeUp) {
      // Auto-conclude the take-home assessment
      await prisma.takeHomeAssignment.update({
        where: { token: tokenParam },
        data: { status: "SUBMITTED", submittedAt: now },
      });
      takeHomeAssignment.status = "SUBMITTED";
    }

    if (takeHomeAssignment.status !== "ACTIVE") {
      redirect(`/take-home/${tokenParam}`);
    }

    canView = true; // Fully authorized via valid active take-home link
  }

  if (!canView) {
    if (!challenge.published) notFound();
    if (challenge.visibility === "public") {
      canView = true;
    } else {
      // private
      if (inviteToken) {
        const inv = await prisma.challengeInvitation.findUnique({
          where: { token: inviteToken },
          select: { id: true, challengeId: true, status: true, userId: true },
        });
        if (
          inv &&
          inv.challengeId === challenge.id &&
          inv.status !== "revoked"
        ) {
          if (inv.status === "pending" || inv.userId !== userId) {
            await prisma.challengeInvitation.update({
              where: { id: inv.id },
              data: {
                status: "accepted",
                userId,
                acceptedAt: inv.status === "pending" ? new Date() : undefined,
              },
            });
          }
          canView = true;
        }
      }
      if (!canView) {
        const orClauses: Array<{ userId: string } | { email: string }> = [
          { userId },
        ];
        if (userEmail) orClauses.push({ email: userEmail });
        const matched = await prisma.challengeInvitation.findFirst({
          where: {
            challengeId: challenge.id,
            status: { not: "revoked" },
            OR: orClauses,
          },
          select: { id: true },
        });
        if (matched) canView = true;
      }
    }
  }

  if (!canView) notFound();

  // ── Resolve active step ───────────────────────────────────────────────
  const steps = challenge.steps;
  if (steps.length === 0) {
    // Defensive: should never happen after Stage 1 backfill, but if a row
    // somehow lacks steps, we'd otherwise crash on undefined access.
    notFound();
  }
  const requested = stepParam ? parseInt(stepParam, 10) : 0;
  const stepIndex = Number.isFinite(requested)
    ? Math.max(0, Math.min(steps.length - 1, requested))
    : 0;
  const activeStep = steps[stepIndex];

  const starterFiles = JSON.parse(activeStep.starterFiles) as Record<string, string>;
  const testFiles = JSON.parse(activeStep.testFiles) as Record<string, string>;

  // ── Harness (multi-language) challenges: build SAFE props. We deliberately
  // withhold reference solutions and hidden cases' expected values; the judge
  // runs server-side, so the client never needs them. ──
  const isHarness = activeStep.judgingMode === "harness";
  const safeJsonParse = <T,>(raw: string | null | undefined, fallback: T): T => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  const harnessProps = isHarness
    ? (() => {
        const sig = safeJsonParse<{ params: { name: string; type: string }[]; returnType: string }>(
          activeStep.signatureJson,
          { params: [], returnType: "void" }
        );
        const languages = safeJsonParse<string[]>(activeStep.languagesJson, []);
        const starterCode = safeJsonParse<Record<string, string>>(activeStep.starterCodeJson, {});
        type StoredCase = { id: string; name: string; argsJson: string; expectedJson: string; isHidden: boolean };
        const allCases = safeJsonParse<StoredCase[]>(activeStep.harnessTestsJson, []);
        const publicCases = allCases
          .filter((c) => !c.isHidden)
          .map((c) => ({ name: c.name, argsJson: c.argsJson, expectedJson: c.expectedJson }));
        const hiddenCount = allCases.filter((c) => c.isHidden).length;
        return {
          functionName: activeStep.functionName ?? "solve",
          signature: sig,
          languages,
          starterCode,
          publicCases,
          hiddenCount,
        };
      })()
    : null;

  const isMulti = steps.length > 1;

  // ── Help panel: only when there's genuinely useful content ─────────────
  // Show it for an author hint/video, or — on MULTI-step series — the per-step
  // note + "Step X of Y" position. A single-step challenge's step title just
  // duplicates the challenge title, so we never render a "Step 1 of 1" panel
  // (that was redundant chrome cluttering the header on every standalone
  // challenge).
  const stepHasHelp = !!(activeStep.hint || activeStep.videoUrl || (isMulti && activeStep.title));
  const helpContext: TrackHelpContext | null = stepHasHelp
    ? {
        trackSlug: challenge.slug,
        trackTitle: challenge.title,
        positionLabel: isMulti ? `Step ${stepIndex + 1} of ${steps.length}` : null,
        authorNote: isMulti ? (activeStep.title ?? null) : null,
        hint: activeStep.hint,
        video: parseVideoUrl(activeStep.videoUrl),
      }
    : null;
  
  // Preserve essential query parameters for peers navigating between steps
  const queryParams = new URLSearchParams();
  if (sessionIdParam) queryParams.set("session", sessionIdParam);
  if (tokenParam) queryParams.set("token", tokenParam);
  if (multiplayerParam) queryParams.set("multiplayer", multiplayerParam);
  if (simParam) queryParams.set("sim", simParam);
  
  const baseQueryStr = queryParams.toString() ? `&${queryParams.toString()}` : "";

  const prevHref =
    stepIndex > 0
      ? `/challenges/${slug}/attempt?step=${stepIndex - 1}${baseQueryStr}`
      : null;
  const nextHref =
    stepIndex < steps.length - 1
      ? `/challenges/${slug}/attempt?step=${stepIndex + 1}${baseQueryStr}`
      : null;

  const username = isInterviewer
    ? session?.user?.name?.split(/\s+/)[0] || "Interviewer"
    : candidateName.trim() || "Candidate";

  return (
    <>
      {isMulti && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <StepNavigator
            slug={challenge.slug}
            steps={steps.map((s, i) => ({
              position: i,
              title: s.title ?? `Question ${i + 1}`,
            }))}
            currentStep={stepIndex}
            prevHref={prevHref}
            nextHref={nextHref}
            baseQueryStr={baseQueryStr}
          />
        </div>
      )}
      {helpContext && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <TrackHelpPanel context={helpContext} />
        </div>
      )}
      {isHarness && harnessProps ? (
        <HarnessAttemptClient
          slug={challenge.slug}
          stepId={activeStep.id}
          title={
            isMulti && activeStep.title ? `${challenge.title} · ${activeStep.title}` : challenge.title
          }
          description={activeStep.description}
          difficulty={challenge.difficulty}
          functionName={harnessProps.functionName}
          signature={harnessProps.signature}
          languages={harnessProps.languages}
          starterCode={harnessProps.starterCode}
          publicCases={harnessProps.publicCases}
          hiddenCount={harnessProps.hiddenCount}
          token={tokenParam ?? null}
          sessionId={sessionIdParam ?? null}
        />
      ) : (
      <ChallengeAttemptClient
        challenge={{
          id: challenge.id,
          slug: challenge.slug,
          // For multi-step we render the step's own title; for single-step
          // the parent Challenge title is the canonical one.
          title: isMulti && activeStep.title
            ? `${challenge.title} · ${activeStep.title}`
            : challenge.title,
          description: activeStep.description,
          difficulty: challenge.difficulty,
          template: activeStep.template,
          estimatedMinutes: activeStep.estimatedMinutes,
        }}
        starterFiles={starterFiles}
        testFiles={testFiles}
        testCasesJson={activeStep.testCasesJson || "[]"}
        stepId={activeStep.id}
        takeHomeStartedAtIso={takeHomeAssignment?.startedAt ? takeHomeAssignment.startedAt.toISOString() : undefined}
        takeHomeTimeLimitMin={takeHomeAssignment?.timeLimitMin ?? undefined}
        sessionId={sessionIdParam ?? null}
        multiplayer={multiplayerParam === "true"}
        sim={simParam === "true"}
        isInterviewer={isInterviewer}
        shareToken={tokenParam ?? ""}
        username={username}
      />
      )}
    </>
  );
}

// Inline server component — keeps the layout shift-free and JS-free.
function StepNavigator({
  slug,
  steps,
  currentStep,
  prevHref,
  nextHref,
  baseQueryStr,
}: {
  slug: string;
  steps: { position: number; title: string }[];
  currentStep: number;
  prevHref: string | null;
  nextHref: string | null;
  baseQueryStr: string;
}) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-3 flex items-center gap-3">
      <Link
        href={baseQueryStr.includes("session=") ? `/interview/${new URLSearchParams(baseQueryStr).get("session")}?lobby=true` : `/challenges/${slug}`}
        className="text-xs font-bold text-muted hover:text-fg transition whitespace-nowrap"
      >
        {baseQueryStr.includes("session=") ? "← Back to Lobby" : "← Back to challenge"}
      </Link>
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {steps.map((s) => {
          const isActive = s.position === currentStep;
          return (
            <Link
              key={s.position}
              href={`/challenges/${slug}/attempt?step=${s.position}${baseQueryStr}`}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                isActive
                  ? "bg-accent text-bg border-accent"
                  : "bg-surface text-muted border-border hover:text-fg hover:border-border-strong"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="font-mono tabular-nums opacity-70 mr-1.5">
                {s.position + 1}
              </span>
              <span className="truncate max-w-[160px] inline-block align-bottom">
                {s.title}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {prevHref ? (
          <Link
            href={prevHref}
            className="w-8 h-8 rounded-lg border border-border bg-surface text-muted hover:text-fg hover:border-border-strong grid place-items-center transition"
            aria-label="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <div className="w-8 h-8 rounded-lg border border-border grid place-items-center text-muted/30">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            className="w-8 h-8 rounded-lg border border-border bg-surface text-muted hover:text-fg hover:border-border-strong grid place-items-center transition"
            aria-label="Next step"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="w-8 h-8 rounded-lg border border-border grid place-items-center text-muted/30">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
