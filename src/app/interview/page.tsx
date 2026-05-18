import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Play,
  CheckCircle,
  Clock,
  Radio,
  Share2,
  Calendar,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import CopyLinkButton from "./CopyLinkButton";
import DeleteSessionButton from "./DeleteSessionButton";

export const metadata = {
  title: "Mock & Live Interview Sessions — Interviewpad",
};

export default async function InterviewDashboardPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/interview")}`);
  }

  const userId = session.user.id;

  // Retrieve all interview slots created by the logged-in candidate
  const interviews = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all challenge titles so we can list challenge queues beautifully on the slots
  const allChallengeIds = Array.from(
    new Set(
      interviews.flatMap((i) => {
        try {
          const parsed = JSON.parse(i.challengeIds);
          return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
        } catch {
          return [];
        }
      })
    )
  );

  const challenges = await prisma.challenge.findMany({
    where: { id: { in: allChallengeIds } },
    select: { id: true, title: true },
  });
  const challengeMap = new Map(challenges.map((c) => [c.id, c.title]));

  return (
    <div className="min-h-screen bg-surface py-10 px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Dash Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-fg">Your Interviews</h1>
            <p className="text-xs text-muted mt-1">Review past logs, launch scheduled sessions, or coordinate live team trials.</p>
          </div>
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-black text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Schedule Interview
          </Link>
        </div>

        {/* Dynamic slots list / Empty State */}
        {interviews.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg p-12 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/20 grid place-items-center mx-auto">
              <Briefcase className="w-6 h-6 text-accent" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-fg">No interview rounds scheduled yet</h3>
              <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                Set up a structured interview session with chosen technical challenges. You can invite colleagues for live cooperative reviews, practice audio video sessions, or complete them solo!
              </p>
            </div>
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold text-xs uppercase tracking-wider transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Your First Session
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {interviews.map((slot) => {
              const parsedIds: string[] = (() => {
                try {
                  const parsed = JSON.parse(slot.challengeIds);
                  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
                } catch {
                  return [];
                }
              })();

              const dateLabel = formatRelativeTime(slot.createdAt);

              // Status styles maps
              const isScheduled = slot.status === "scheduled";
              const isInProgress = slot.status === "in_progress";
              const isCompleted = slot.status === "completed";

              const statusBg = isScheduled
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : isInProgress
                  ? "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";

              const statusText = isScheduled
                ? "Scheduled"
                : isInProgress
                  ? "In Progress"
                  : "Completed";

              const isLive = slot.type === "live";
              const typeBg = isLive
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20";
              const typeText = isLive ? "Live Screen" : "Mock Practice";

              const href = `/interview/${slot.id}`;
              const inviteUrl = `${process.env.NEXTAUTH_URL || ""}/interview/${slot.id}?token=${slot.shareToken}`;

              return (
                <div
                  key={slot.id}
                  className="rounded-2xl border border-border bg-bg p-5 flex flex-col gap-4 transition hover:shadow-sm"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusBg}`}>
                          {statusText}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${typeBg}`}>
                          {typeText}
                        </span>
                        {slot.verdict && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            slot.verdict === "success"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : slot.verdict === "failed"
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                : slot.verdict === "left_in_between"
                                  ? "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}>
                            {slot.verdict === "success" && "🟢 Met Bar"}
                            {slot.verdict === "failed" && "🔴 Failed"}
                            {slot.verdict === "left_in_between" && "⚪ Walkout"}
                            {slot.verdict === "suspicious" && "⚠️ Suspicious"}
                          </span>
                        )}
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateLabel}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h3 className="text-base font-black text-fg truncate">
                          {slot.title}
                        </h3>
                        {slot.candidateName && (
                          <p className="text-xs text-muted/80">
                            Candidate: <span className="text-fg font-semibold">{slot.candidateName}</span>
                          </p>
                        )}
                      </div>

                      {/* Challenge list queue */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted/80 pt-1">
                        <span className="font-bold">{parsedIds.length} challenges:</span>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {parsedIds.map((cid, idx) => {
                            const title = challengeMap.get(cid) || "Loading challenge...";
                            return (
                              <span
                                key={cid}
                                className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-fg/80 max-w-[150px] truncate"
                                title={title}
                              >
                                {idx + 1}. {title}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
                      {/* Share invite links */}
                      <CopyLinkButton inviteUrl={inviteUrl} />

                      {/* Action buttons redirects */}
                      <Link
                        href={href}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 ${
                          isScheduled
                            ? "bg-accent text-bg hover:bg-accent-soft"
                            : isInProgress
                              ? "bg-amber-500 text-white hover:bg-amber-600"
                              : "bg-surface border border-border text-muted hover:text-fg hover:bg-panel"
                        }`}
                      >
                        {isScheduled ? (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Start Round
                          </>
                        ) : isInProgress ? (
                          <>
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                            Resume Practice
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Revisit Results
                          </>
                        )}
                      </Link>

                      {/* Hard delete button */}
                      <DeleteSessionButton sessionId={slot.id} />
                    </div>
                  </div>

                  {/* Private notes excerpt if recorded */}
                  {slot.notes && (
                    <div className="p-3.5 rounded-xl bg-surface/50 border border-border/40 text-[11px] leading-relaxed text-muted/90 max-w-3xl">
                      <span className="font-bold uppercase tracking-wider text-accent text-[9px] block mb-1">Evaluator Notes Log</span>
                      <p className="whitespace-pre-wrap font-sans">{slot.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSec(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  return `${mins} min limit`;
}

function formatRelativeTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return "created just now";
  }
  if (diffMin < 60) {
    return `created ${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffHr < 24) {
    return `created ${diffHr} ${diffHr === 1 ? "hour" : "hours"} ago`;
  }
  if (diffDays < 7) {
    return `created ${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  }

  // Fallback to absolute date format: "18 May 2026"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
