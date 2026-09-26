"use client";

import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import type { ReportRound } from "@/lib/ai-interview/console-server";
import type { TestRun } from "@/lib/ai-interview/report-extras";
import { Btn } from "../../../candidates/_components/ui";
import { runRoundTestsAction } from "../../report-actions";
import OpenInPlayground from "./OpenInPlayground";

/**
 * The Tests pane: the candidate's final code against the task's hidden tests.
 * Challenge rounds with unit tests can be run (and re-run) from here; the last
 * run is stored on the round. Other rounds have no tests, and say so.
 */
export default function TestsTab({
  slug,
  sessionId,
  round,
  canRun,
  toast,
}: {
  slug: string;
  sessionId: string;
  round: ReportRound | undefined;
  canRun: boolean;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const [run, setRun] = useState<TestRun | null>(round?.tests ?? null);
  const [pending, start] = useTransition();
  if (!round) return null;

  const hasCode = Object.keys(round.files).length > 0;
  const runTests = () =>
    start(async () => {
      const res = await runRoundTestsAction(slug, sessionId, round.id);
      if (!res.ok) return toast(res.error, "error");
      setRun(res.tests);
      toast(res.tests.total ? `${res.tests.passed} of ${res.tests.total} tests passed` : "The tests ran, but none reported a result");
    });

  const actions = (
    <div className="flex flex-wrap gap-2 pt-1">
      {round.testable && canRun && hasCode && (
        <Btn icon={pending ? Loader2 : Play} disabled={pending} onClick={runTests} className={pending ? "[&>svg]:animate-spin" : ""}>
          {pending ? "Running" : run ? "Run again" : "Run tests"}
        </Btn>
      )}
      <OpenInPlayground round={round} />
    </div>
  );

  if (!round.testable && !run) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-fg">Tests</h2>
        <p className="text-sm text-muted leading-relaxed">
          This task has no automated tests, so there is nothing to run. The AI graded it from the code and the conversation. Open the
          final code in the playground to try it yourself.
        </p>
        {actions}
      </section>
    );
  }

  const allPassed = !!run && run.total > 0 && run.passed === run.total;
  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <h2 className="text-[15px] font-semibold text-fg">Tests</h2>
        {run && !run.compileError && run.total > 0 && (
          <span className={`text-sm font-semibold ${allPassed ? "text-success" : run.passed === 0 ? "text-danger" : "text-fg"}`}>
            {run.passed} of {run.total} passed
          </span>
        )}
      </div>

      {!run ? (
        <p className="text-sm text-muted leading-relaxed py-2">
          The tests have not been run on this code yet.
          {!canRun && " Someone who can manage screenings can run them."}
        </p>
      ) : run.compileError || run.total === 0 ? (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-sm text-fg">{run.compileError ? "The code did not compile, so no test ran." : "No test reported a result."}</p>
          {run.stderr && (
            <pre className="rounded-lg bg-danger/10 px-3 py-2.5 font-mono text-xs text-danger whitespace-pre-wrap break-words max-h-48 overflow-auto">
              {run.stderr}
            </pre>
          )}
        </div>
      ) : (
        <ul className="flex flex-col">
          {run.tests.map((t, i) => (
            <li key={i} className="flex flex-col gap-2 py-2.5 border-t border-border">
              <div className="flex items-start gap-3 text-sm">
                <span className={`w-9 shrink-0 font-semibold ${t.status === "pass" ? "text-success" : "text-danger"}`}>
                  {t.status === "pass" ? "Pass" : "Fail"}
                </span>
                <span className="font-mono text-[13px] text-fg break-words min-w-0">{t.name}</span>
              </div>
              {t.status === "fail" && t.error && (
                <pre className="ml-12 rounded-lg bg-danger/10 px-3 py-2 font-mono text-xs text-danger whitespace-pre-wrap break-words">{t.error}</pre>
              )}
            </li>
          ))}
        </ul>
      )}

      {run?.ranAt && (
        <p className="text-xs text-subtle pt-2">
          Last run {new Date(run.ranAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}, on the code as
          submitted.
        </p>
      )}
      {actions}
    </section>
  );
}
