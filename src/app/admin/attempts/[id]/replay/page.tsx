import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireAdminAccess, staffCan } from "@/lib/permissions/staff";
import ReplayPlayerClient from "./ReplayPlayerClient";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  // Metadata runs on its own, so it must check access before reading the
  // attempt; otherwise the candidate name leaks into the <title>.
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) return { title: "Not found", robots: { index: false } };
  const { id } = await params;
  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id },
    select: { user: { select: { name: true } } },
  });
  return {
    title: attempt ? `Session Replay: ${attempt.user.name || "Candidate"} — Interviewpad` : "Replay not found",
  };
}

export default async function AdminSessionReplayPage({ params }: Props) {
  const { id } = await params;
  
  // Only platform admins can watch replays (they show candidate code).
  await requireAdminAccess("platform:admin");

  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      challenge: { select: { title: true } },
      eventLog: true,
      integrityReport: true,
    },
  });

  if (!attempt) notFound();

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
      />
    </div>
  );
}
