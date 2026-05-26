import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Square,
  FileCode,
  Briefcase,
  ExternalLink,
  Award,
  Sparkles,
  Play
} from "lucide-react";
import AIRubricDraft from "./AIRubricDraft";

interface AdminAttemptDetailPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGE: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  passed: { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  failed: { color: "text-red-500 bg-red-500/10 border-red-500/20", icon: XCircle },
  in_progress: {
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    icon: AlertCircle,
  },
  abandoned: { color: "text-muted bg-muted/10 border-border", icon: Square },
};

type TestResultEntry = { name: string; status: string; error?: string | null };
type TestResults = {
  tests?: TestResultEntry[];
  passed?: number;
  total?: number;
};

function parseTestResults(raw: string | null): TestResults | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TestResults;
  } catch {
    return null;
  }
}

function parseFiles(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") result[k] = v;
      else if (
        typeof v === "object" &&
        v !== null &&
        "code" in v &&
        typeof (v as { code: unknown }).code === "string"
      ) {
        result[k] = (v as { code: string }).code;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m ${sec % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export default async function AdminAttemptDetailPage({ params }: AdminAttemptDetailPageProps) {
  const { id } = await params;

  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      challenge: {
        select: { id: true, slug: true, title: true, difficulty: true, category: true },
      },
      step: { select: { id: true, title: true, position: true } },
      integrityReport: true,
      eventLog: { select: { id: true } },
    },
  });

  if (!attempt) notFound();

  const badge = STATUS_BADGE[attempt.status] ?? STATUS_BADGE.abandoned;
  const Icon = badge.icon;
  const tests = parseTestResults(attempt.testResults);
  const files = parseFiles(attempt.files);
  const fileEntries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/attempts"
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted hover:text-fg transition"
      >
        <ArrowLeft className="w-3 h-3" />
        All attempts
      </Link>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.color}`}
          >
            <Icon className="w-3 h-3" />
            {attempt.status.replace("_", " ")}
          </span>
          <span className="text-[10px] font-mono text-muted/60">{attempt.id}</span>
          {attempt.sessionId && (
            <Link
              href={`/admin/interviews/${attempt.sessionId}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 hover:bg-accent/15 transition"
            >
              <Briefcase className="w-3 h-3" />
              In interview
            </Link>
          )}
        </div>

        <h2 className="text-2xl font-black tracking-tight">
          <Link
            href={`/challenges/${attempt.challenge.slug}`}
            className="hover:text-accent transition"
          >
            {attempt.challenge.title}
          </Link>
        </h2>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted flex-wrap">
          <Link href={`/u/${attempt.user.id}`} className="hover:text-accent transition">
            {attempt.user.name ?? "Anonymous"}
          </Link>
          <span className="text-muted/30">·</span>
          <span className="font-mono text-muted/60">{attempt.user.email}</span>
          <span className="text-muted/30">·</span>
          <span className="uppercase tracking-wider">
            {attempt.challenge.difficulty}
            {attempt.challenge.category ? ` · ${attempt.challenge.category}` : ""}
          </span>
          {attempt.step && (
            <>
              <span className="text-muted/30">·</span>
              <span>
                Step {attempt.step.position + 1}
                {attempt.step.title ? `: ${attempt.step.title}` : ""}
              </span>
            </>
          )}
          <Link
            href={`/admin/challenges/${attempt.challenge.id}/edit`}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg hover:bg-elevated transition"
          >
            Edit challenge
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <Stat icon={Clock} label="Duration" value={formatDuration(attempt.durationSec)} />
          <Stat
            icon={Calendar}
            label="Started"
            value={attempt.startedAt.toLocaleString()}
          />
          <Stat
            icon={Calendar}
            label="Finished"
            value={attempt.finishedAt ? attempt.finishedAt.toLocaleString() : "—"}
          />
          <Stat
            icon={CheckCircle2}
            label="Tests"
            value={
              tests && typeof tests.total === "number"
                ? `${tests.passed ?? 0} / ${tests.total}`
                : "—"
            }
          />
          <Stat
            icon={Award}
            label="Grade Score"
            value={attempt.score != null ? `${attempt.score} / 100` : "—"}
          />
        </div>
      </div>

      {/* Corporate AI Assessment Telemetry & Session Replay proctoring block */}
      {attempt.integrityReport && (
        <div className="rounded-3xl border border-indigo-500/20 bg-[#161B2E]/60 backdrop-blur-md p-6 flex flex-col gap-6 shadow-xl relative overflow-hidden transition-all hover:border-accent/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 max-w-xl">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" /> AI Proctoring & Replay Log Auditor
              </h3>
              <p className="text-sm font-black text-[#F3F4F6]">
                Risk Assessment Rating:{" "}
                <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ml-1.5 ${
                  attempt.integrityReport.suspicionScore < 25
                    ? "text-emerald-400 border-emerald-500/35 bg-emerald-500/10"
                    : attempt.integrityReport.suspicionScore < 55
                    ? "text-amber-400 border-amber-400/35 bg-amber-400/10"
                    : "text-rose-500 border-rose-500/35 bg-rose-500/10 font-black animate-pulse"
                }`}>
                  {attempt.integrityReport.suspicionScore}%{" "}
                  {attempt.integrityReport.suspicionScore < 25
                    ? "Secure"
                    : attempt.integrityReport.suspicionScore < 55
                    ? "Low Risk"
                    : "High Risk"}
                </span>
              </p>
              <p className="text-xs text-muted leading-relaxed">
                We tracked <span className="text-[#F3F4F6] font-bold">{attempt.integrityReport.blurCount} browser tab blurs</span> (candidate left screen for <span className="text-[#F3F4F6] font-bold">{attempt.integrityReport.totalBlurSec} seconds</span>) and <span className="text-[#F3F4F6] font-bold">{attempt.integrityReport.pasteCount} keyboard block pastes</span>. Large copy-pastes or high-speed typing bursts indicate external AI code generation.
              </p>
            </div>

            <Link
              href={`/admin/attempts/${attempt.id}/replay`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition-colors shadow-soft shrink-0 w-full md:w-auto text-center justify-center cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch Session Replay</span>
            </Link>
          </div>

          <AIRubricDraft
            suspicionScore={attempt.integrityReport.suspicionScore}
            blurCount={attempt.integrityReport.blurCount}
            totalBlurSec={attempt.integrityReport.totalBlurSec}
            pasteCount={attempt.integrityReport.pasteCount}
            passedCount={tests?.passed ?? 0}
            totalCount={tests?.total ?? 0}
          />
        </div>
      )}

      {tests?.tests && tests.tests.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-elevated/30">
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
              Test results ({tests.tests.length})
            </h3>
          </div>
          <ul className="divide-y divide-border-strong">
            {tests.tests.map((t, i) => {
              const testBadge =
                t.status === "passed" || t.status === "pass"
                  ? STATUS_BADGE.passed
                  : t.status === "failed" || t.status === "fail"
                  ? STATUS_BADGE.failed
                  : STATUS_BADGE.abandoned;
              const TIcon = testBadge.icon;
              return (
                <li key={i} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${testBadge.color}`}
                    >
                      <TIcon className="w-3 h-3" />
                      {t.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-fg break-words">{t.name}</div>
                      {t.error && (
                        <pre className="mt-2 text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                          {t.error}
                        </pre>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted mb-3 flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5" />
          Submitted files ({fileEntries.length})
        </h3>
        {fileEntries.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            No submitted files recorded for this attempt.
          </div>
        ) : (
          <div className="space-y-3">
            {fileEntries.map(([path, code]) => (
              <details
                key={path}
                className="rounded-2xl border border-border bg-surface overflow-hidden group"
                open={fileEntries.length <= 2}
              >
                <summary className="px-5 py-3 cursor-pointer flex items-center justify-between bg-elevated/30 hover:bg-elevated/50 transition list-none">
                  <span className="text-xs font-mono font-bold text-fg">{path}</span>
                  <span className="text-[10px] text-muted">
                    {code.split(/\r?\n/).length} lines · {code.length.toLocaleString()} chars
                  </span>
                </summary>
                <pre className="text-[12px] font-mono text-fg/90 bg-bg p-4 overflow-x-auto leading-relaxed border-t border-border max-h-[480px]">
                  {code || "(empty)"}
                </pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-bold text-fg truncate">{value}</div>
    </div>
  );
}
