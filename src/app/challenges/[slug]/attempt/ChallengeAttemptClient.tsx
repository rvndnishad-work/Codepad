"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackTests,
  useSandpack,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import { cobalt2 } from "@codesandbox/sandpack-themes";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { ArrowLeft, CheckCircle2, XCircle, Send, RotateCcw, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ChallengeDescription from "../../ChallengeDescription";

type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  template: string;
  estimatedMinutes: number;
};

type FlatTest = {
  path: string;
  name: string;
  status: "pass" | "fail" | "idle" | "running";
  error: string | null;
};

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

export default function ChallengeAttemptClient({
  challenge,
  starterFiles,
  testFiles,
  sessionId,
}: {
  challenge: Challenge;
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
  sessionId: string | null;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Test state
  const [testRun, setTestRun] = useState<{
    passed: number;
    total: number;
    tests: FlatTest[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"passed" | "failed" | null>(null);

  // Elapsed time
  const startedAtRef = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compose Sandpack files: starter (editable) + tests (hidden)
  const files: SandpackFiles = useMemo(() => {
    const out: SandpackFiles = {};
    for (const [path, code] of Object.entries(starterFiles)) {
      out[path] = { code };
    }
    for (const [path, code] of Object.entries(testFiles)) {
      out[path] = { code, hidden: true, readOnly: true };
    }
    return out;
  }, [starterFiles, testFiles]);

  // Ref to current file state so submit can read them
  const filesRef = useRef<SandpackFiles>(files);

  function handleTestsComplete(specs: Record<string, any>) {
    const flat: FlatTest[] = [];
    function walk(node: any, path: string) {
      if (node.tests) {
        for (const [name, test] of Object.entries<any>(node.tests)) {
          flat.push({
            path,
            name,
            status: (test.status === "pass" || test.status === "fail" ? test.status : "idle") as FlatTest["status"],
            error: Array.isArray(test.errors) && test.errors.length > 0
              ? String(test.errors[0]?.message ?? test.errors[0] ?? "Failed")
              : null,
          });
        }
      }
      if (node.describes) {
        for (const child of Object.values<any>(node.describes)) {
          walk(child, path);
        }
      }
    }
    for (const [path, spec] of Object.entries(specs)) {
      walk(spec, path);
    }
    const passed = flat.filter((t) => t.status === "pass").length;
    setTestRun({ passed, total: flat.length, tests: flat });
  }

  async function handleSubmit() {
    if (!testRun) {
      toast.error("Run the tests first.");
      return;
    }
    setSubmitting(true);
    try {
      // Strip hidden test files from submitted payload
      const submittedFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(filesRef.current)) {
        if (testFiles[path]) continue;
        const code = typeof file === "string" ? file : (file as { code: string }).code;
        submittedFiles[path] = code;
      }
      const res = await fetch(`/api/challenges/${challenge.slug}/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: submittedFiles,
          testResults: testRun,
          durationSec: elapsedSec,
          sessionId,
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      setSubmittedStatus(data.status);
      if (data.status === "passed") {
        toast.success("Challenge passed!", { description: `${testRun.passed}/${testRun.total} tests` });
      } else {
        toast.error("Some tests failed", { description: `${testRun.passed}/${testRun.total} tests` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Submission failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/challenges/${challenge.slug}`}
            className="text-muted hover:text-fg transition shrink-0"
            title="Back to challenge"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-fg truncate">{challenge.title}</h1>
            <div className="flex items-center gap-2 text-[10px] text-muted/70">
              <span className={`uppercase font-bold tracking-wider ${difficultyColor[challenge.difficulty]}`}>
                {challenge.difficulty}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(elapsedSec)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {testRun && (
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                testRun.passed === testRun.total
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-500 border border-rose-500/30"
              }`}
            >
              {testRun.passed === testRun.total ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {testRun.passed}/{testRun.total}
            </div>
          )}

          {submittedStatus === "passed" ? (
            <div className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Submitted
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!testRun || submitting}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(var(--accent-rgb),0.2)]"
              title={!testRun ? "Run the tests first" : "Submit attempt"}
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Submitting…" : "Submit"}
            </button>
          )}

          {submittedStatus && (
            <button
              onClick={() => {
                setTestRun(null);
                setSubmittedStatus(null);
                startedAtRef.current = Date.now();
                setElapsedSec(0);
              }}
              className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5"
              title="Try again"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </header>

      {/* Body: 3 panes */}
      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* Description */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 overflow-y-auto border-r border-border bg-bg p-6">
          <ChallengeDescription markdown={challenge.description} />
        </aside>

        {/* Editor + Tests via Sandpack */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 min-h-0">
          <SandpackProvider
            key={challenge.id}
            template={challenge.template as any}
            theme={isDark ? cobalt2 : "light"}
            files={files}
            options={{
              autorun: true,
              autoReload: true,
              initMode: "immediate",
              recompileMode: "delayed",
              recompileDelay: 300,
            }}
          >
            <FilesTracker filesRef={filesRef} />
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
              <div className="min-h-0 border-r border-border">
                <SandpackCodeEditor
                  showLineNumbers
                  showTabs
                  closableTabs={false}
                  wrapContent
                  extensions={[javascript({ jsx: true, typescript: true })]}
                  style={{ height: "100%" }}
                />
              </div>
              <div className="min-h-0">
                <SandpackTests
                  onComplete={handleTestsComplete}
                  showVerboseButton
                  showWatchButton
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </SandpackProvider>
        </div>
      </div>
    </div>
  );
}

/**
 * Tracks the current Sandpack file state into a ref so the submit button
 * can capture the most recent code without re-renders.
 */
function FilesTracker({
  filesRef,
}: {
  filesRef: React.MutableRefObject<SandpackFiles>;
}) {
  const { sandpack } = useSandpack();
  useEffect(() => {
    filesRef.current = sandpack.files;
  }, [sandpack.files, filesRef]);
  return null;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
