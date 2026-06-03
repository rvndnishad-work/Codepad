import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import ReplayPlayerClient from "./ReplayPlayerClient";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  });
  return {
    title: attempt ? `Session Replay: ${attempt.user.name || "Candidate"} — Interviewpad` : "Replay not found",
  };
}

export default async function AdminSessionReplayPage({ params }: Props) {
  const { id } = await params;
  
  // Authorize: Only administrator review panels can audit session replays
  const session = await auth().catch(() => null);
  const showAdmin = isAdmin(session);
  if (!showAdmin) {
    redirect("/login?next=" + encodeURIComponent(`/admin/attempts/${id}/replay`));
  }

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
