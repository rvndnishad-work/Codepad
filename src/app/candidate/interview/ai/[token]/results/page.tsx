import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Bot, Code2, MessageSquareText, RotateCcw } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";
import { resolveRoundsContent } from "@/lib/ai-interview/round-content";
import { parseAnswers, parseTheoryRound, type TheoryVerdict } from "@/lib/ai-interview/theory";

export const metadata = {
  title: "Practice interview feedback",
};

const VERDICT: Record<TheoryVerdict, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-success/10 text-success ring-success/25" },
  partial: { label: "Partly there", cls: "bg-warning/10 text-warning ring-warning/25" },
  missed: { label: "Missed", cls: "bg-danger/10 text-danger ring-danger/25" },
  skipped: { label: "Skipped", cls: "bg-panel text-muted ring-border" },
  unscored: { label: "Not scored", cls: "bg-panel text-muted ring-border" },
};

function ratingsOf(raw: string | null): { label: string; value: number }[] {
  if (!raw) return [];
  try {
    const r = JSON.parse(raw) as Record<string, number>;
    return [
      { label: "Problem solving", value: r.ProblemSolving },
      { label: "Communication", value: r.Communication },
      { label: "Code quality", value: r.CodeQuality },
    ].filter((x) => typeof x.value === "number");
  } catch {
    return [];
  }
}

/** Feedback for a developer's own AI practice run: scores, each answer against the reference, and the AI's notes. */
export default async function PracticeResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const path = `/candidate/interview/ai/${encodeURIComponent(token)}/results`;
  const auth_ = await auth().catch(() => null);
  if (!auth_?.user?.id) redirect(`/login?next=${encodeURIComponent(path)}`);
  const s = await prisma.aIInterviewSession.findUnique({ where: { inviteToken: token }, include: { rounds: true } });
  if (!s || !s.practice || (auth_.user.email ?? "").toLowerCase() !== s.candidateEmail.toLowerCase()) notFound();

  const title = s.positionTitle.replace(/^Practice\s+—\s+/, "");
  const runHref = `/candidate/interview/ai/${encodeURIComponent(token)}`;

  if (s.status !== "COMPLETED") {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-[22px] font-semibold text-fg">{title}</h1>
        <p className="text-[14px] text-muted mt-2">This practice interview is not finished yet, so there is no feedback to show.</p>
        <Link href={runHref} className="inline-flex items-center gap-2 mt-6 h-10 px-5 rounded-lg bg-accent text-accent-ink text-[14px] font-semibold">
          {s.startedAt ? "Continue the interview" : "Start the interview"}
        </Link>
      </main>
    );
  }

  const content = await resolveRoundsContent(resolveSessionRounds(s), s.workspaceId);
  const rounds = content.map((c) => {
    const row = s.rounds.find((r) => r.id === c.roundId);
    const theory = c.kind === "theory" ? parseTheoryRound(row?.theoryJson) : null;
    const answers = c.kind === "theory" ? parseAnswers(row?.answersJson).items : [];
    return { ...c, score: row?.score ?? null, ratings: ratingsOf(row?.ratings ?? null), theory, answers };
  });
  const overall = ratingsOf(s.ratings);
  const score = s.score ?? 0;
  const tone = score >= 70 ? "text-success" : score >= 45 ? "text-warning" : "text-danger";

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 sm:px-6 py-8 pb-24">
      <Link href="/candidate/interview" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Practice arena
      </Link>

      <header className="mt-4 rounded-2xl border border-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-subtle flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" /> AI mock interview, {s.finishedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <h1 className="text-[24px] font-semibold tracking-tight text-fg mt-1">{title}</h1>
          <p className="text-[14px] text-muted mt-1">
            {rounds.length} round{rounds.length === 1 ? "" : "s"}. Compare your answers with the reference answers below, then try again with the same or a fresh set.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/candidate/interview/new?mode=ai" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-accent text-accent-ink text-[13px] font-semibold">
              <RotateCcw className="w-3.5 h-3.5" /> Practise again
            </Link>
          </div>
        </div>
        <div className="sm:w-[220px] shrink-0 rounded-xl border border-border bg-bg/40 p-4">
          <p className="text-xs text-subtle">Overall</p>
          <p className={`text-[44px] font-semibold leading-none tabular-nums ${tone}`}>
            {score}
            <span className="text-[18px] text-muted">/100</span>
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {overall.map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-xs text-muted">
                  <span>{r.label}</span>
                  <span className="tabular-nums">{r.value.toFixed(1)}/5</span>
                </div>
                <div className="h-1.5 rounded-full bg-panel overflow-hidden mt-1">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, (r.value / 5) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {s.aiSummary && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-[16px] font-semibold text-fg">What the interviewer noticed</h2>
          <div className="mt-2 text-[14px] text-fg/90">
            <MarkdownRenderer content={s.aiSummary} />
          </div>
        </section>
      )}

      {rounds.map((r, i) => (
        <section key={r.roundId} className="mt-6 rounded-2xl border border-border bg-surface overflow-hidden">
          <header className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-panel flex items-center justify-center text-fg shrink-0">
                {r.kind === "theory" || r.kind === "conversation" ? <MessageSquareText className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-subtle">Round {i + 1}</p>
                <h2 className="text-[16px] font-semibold text-fg truncate">{r.title}</h2>
              </div>
            </div>
            {r.score != null && <span className="text-[15px] font-semibold tabular-nums text-fg">{r.score}/100</span>}
          </header>

          {r.kind === "theory" && r.theory ? (
            <ol className="divide-y divide-border">
              {r.theory.items.map((q, qi) => {
                const a = r.answers[qi];
                const g = a?.grade;
                const v = VERDICT[g?.verdict ?? (a?.skipped ? "skipped" : "unscored")];
                return (
                  <li key={qi} className="px-6 py-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-medium text-fg">
                        <span className="text-subtle tabular-nums mr-1.5">{qi + 1}.</span>
                        {q.q}
                      </p>
                      <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-medium ring-1 ring-inset shrink-0 ${v.cls}`}>
                        {v.label}
                        {g && g.verdict !== "skipped" && g.verdict !== "unscored" ? `, ${g.score}/5` : ""}
                      </span>
                    </div>
                    {a && !a.skipped ? (
                      <blockquote className="border-l-2 border-border-strong pl-3 text-[14px] text-muted whitespace-pre-wrap">{a.a}</blockquote>
                    ) : (
                      <p className="text-[13px] text-subtle">{a ? "You skipped this one." : "Not reached in time."}</p>
                    )}
                    {a?.followUps?.map((f, fi) => (
                      <div key={fi} className="pl-3 text-[13px]">
                        <p className="text-fg">Follow-up: {f.q}</p>
                        <p className="text-muted mt-0.5 whitespace-pre-wrap">{f.a || "No answer."}</p>
                      </div>
                    ))}
                    {g && (g.covered || g.missed) && (
                      <div className="grid sm:grid-cols-2 gap-2 text-[13px]">
                        {g.covered && (
                          <div className="rounded-lg bg-success/[0.07] border border-success/20 px-3 py-2">
                            <p className="text-xs font-medium text-success">You covered</p>
                            <p className="text-fg mt-0.5">{g.covered}</p>
                          </div>
                        )}
                        {g.missed && (
                          <div className="rounded-lg bg-warning/[0.07] border border-warning/20 px-3 py-2">
                            <p className="text-xs font-medium text-warning">Worth adding</p>
                            <p className="text-fg mt-0.5">{g.missed}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {q.a && (
                      <details className="group rounded-lg border border-border bg-bg/40">
                        <summary className="cursor-pointer list-none px-3 py-2 text-[13px] font-medium text-fg flex items-center justify-between">
                          Reference answer
                          <span className="text-xs text-subtle group-open:hidden">Show</span>
                          <span className="text-xs text-subtle hidden group-open:inline">Hide</span>
                        </summary>
                        <div className="px-3 pb-3 text-[14px] max-h-[520px] overflow-y-auto">
                          <MarkdownRenderer content={q.a} allowHtml docs />
                        </div>
                      </details>
                    )}
                    {q.src && (
                      <a href={`/interview-question/${q.src}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-fg self-start">
                        Read the full write-up
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="px-6 py-5 flex flex-wrap gap-6">
              {r.ratings.map((x) => (
                <div key={x.label}>
                  <p className="text-xs text-subtle">{x.label}</p>
                  <p className="text-[18px] font-semibold tabular-nums text-fg">{x.value}/5</p>
                </div>
              ))}
              {r.ratings.length === 0 && <p className="text-[13px] text-muted">Scored with the round total above.</p>}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
