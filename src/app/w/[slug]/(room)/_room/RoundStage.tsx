"use client";

/**
 * A round on the shared stage: the task on the left, the shared editor on
 * the right, and underneath it either the live preview (frontend and
 * playground rounds) or the test results (graded rounds). Both sides type
 * in the same document; test results are shared too, so the interviewer
 * sees exactly what the candidate sees.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, ChevronDown, FileCode2, FlaskConical, Loader2, Play, Send, XCircle } from "lucide-react";
import * as Y from "yjs";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { templatesById } from "@/lib/templates";
import type { CodeLang } from "@/lib/interview/tools";
import { seedDoc } from "@/lib/interview/relay-seed";
import { ROUND_META, roundText } from "@/lib/interview/room";
import type { StageRound } from "@/lib/interview/room-server";
import type { ToolsRoom } from "@/app/interview/[id]/tools/useToolsRoom";
import SharedEditor from "@/app/interview/[id]/tools/SharedEditor";

const LivePreview = dynamic(() => import("./LivePreview"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading the preview
    </div>
  ),
});

type TestResult = {
  by: "interviewer" | "candidate";
  kind: "run" | "submit";
  at: number;
  status: string;
  passed: number;
  total: number;
  error?: string | null;
  stderr?: string | null;
  results: { name: string; status: string; isHidden?: boolean; got?: string; expected?: string; error?: string }[];
};

function langOf(path: string): CodeLang | "markdown" {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx"].includes(ext)) return "typescript";
  if (["js", "jsx", "mjs", "cjs", "vue", "svelte"].includes(ext)) return "javascript";
  if (ext === "py") return "python";
  if (ext === "html") return "html";
  if (["css", "scss"].includes(ext)) return "css";
  if (ext === "sql") return "sql";
  if (ext === "md") return "markdown";
  return "text";
}

function harnessLang(id: string): CodeLang {
  if (id === "python") return "python";
  if (id === "typescript" || id === "ts") return "typescript";
  if (id === "javascript" || id === "js" || id === "node") return "javascript";
  return "text";
}

const LANG_NAME: Record<string, string> = { python: "Python", javascript: "JavaScript", typescript: "TypeScript", java: "Java", go: "Go", cpp: "C++", rust: "Rust", csharp: "C#", ruby: "Ruby" };

/** Reads one value of the shared round settings and re-renders on change. */
function useMeta(doc: Y.Doc, key: string): [string | undefined, (v: string) => void] {
  const map = useMemo(() => doc.getMap<string>(ROUND_META), [doc]);
  const [v, setV] = useState(() => map.get(key));
  useEffect(() => {
    const on = () => setV(map.get(key));
    on();
    map.observe(on);
    return () => map.unobserve(on);
  }, [map, key]);
  return [v, (next: string) => map.set(key, next)];
}

/** Current text of several shared files, re-read on every change. */
function useTexts(doc: Y.Doc, names: string[]): Record<string, string> {
  const texts = useMemo(() => names.map((n) => [n, doc.getText(n)] as const), [doc, names]);
  const read = useCallback(() => Object.fromEntries(texts.map(([n, t]) => [n, t.toString()])), [texts]);
  const [v, setV] = useState(read);
  useEffect(() => {
    setV(read());
    const on = () => setV(read());
    for (const [, t] of texts) t.observe(on);
    return () => {
      for (const [, t] of texts) t.unobserve(on);
    };
  }, [texts, read]);
  return v;
}

export default function RoundStage({
  round,
  room,
  sessionId,
  isInterviewer,
  readOnly,
  dark,
  startedAt,
}: {
  round: StageRound;
  room: ToolsRoom;
  sessionId: string;
  isInterviewer: boolean;
  readOnly: boolean;
  dark: boolean;
  startedAt: string | null;
}) {
  const { doc } = room;
  const key = round.key;

  // Starter code goes in once the relay has sent what it already holds.
  // Both sides may seed; the seed update is identical, so nothing doubles.
  useEffect(() => {
    if (!room.synced) return;
    if (round.mode === "harness") {
      seedDoc(doc, `seed:${key}`, Object.fromEntries(round.languages.map((l) => [`lang:${l.id}`, l.starter])), (p) => roundText(key, p));
    } else {
      seedDoc(doc, `seed:${key}`, Object.fromEntries(round.files.map((f) => [f.path, f.code])), (p) => roundText(key, p));
    }
  }, [room.synced, doc, key, round]);

  const [lang, setLang] = useMeta(doc, `${key}:lang`);
  const activeLang = round.mode === "harness" ? (round.languages.find((l) => l.id === lang)?.id ?? round.languages[0]?.id ?? "python") : null;

  const visible = useMemo(() => round.files.filter((f) => !/(^|\/)package(-lock)?\.json$/.test(f.path)).map((f) => f.path), [round.files]);
  const [file, setFile] = useState<string>(() => visible.find((p) => /App\.|index\.|solution|main/.test(p)) ?? visible[0] ?? "");
  useEffect(() => {
    if (!visible.includes(file)) setFile(visible[0] ?? "");
  }, [visible, file]);

  const editorName = round.mode === "harness" ? roundText(key, `lang:${activeLang}`) : roundText(key, file);
  const text = useMemo(() => doc.getText(editorName), [doc, editorName]);

  const allNames = useMemo(() => round.files.map((f) => roundText(key, f.path)), [round.files, key]);
  const current = useTexts(doc, allNames);
  const filesNow = useMemo(() => Object.fromEntries(round.files.map((f) => [f.path, current[roundText(key, f.path)] ?? ""])), [round.files, current, key]);

  const pg = round.mode === "playground" && round.template ? templatesById[round.template] : null;
  const previewTemplate = round.mode === "frontend" ? round.template : pg && pg.mode !== "console" ? pg.base : null;
  const graded = round.mode === "harness" || round.mode === "unit-js";

  const [result] = useMeta(doc, `${key}:result`);
  const parsed = useMemo<TestResult | null>(() => {
    try {
      return result ? (JSON.parse(result) as TestResult) : null;
    } catch {
      return null;
    }
  }, [result]);
  const resultMap = useMemo(() => doc.getMap<string>(ROUND_META), [doc]);
  const [running, setRunning] = useState<"run" | "submit" | null>(null);

  const runTests = async (kind: "run" | "submit") => {
    if (!round.slug || !round.stepId || running) return;
    setRunning(kind);
    await room.provider.flush();
    const body =
      round.mode === "harness"
        ? { stepId: round.stepId, language: activeLang, code: doc.getText(roundText(key, `lang:${activeLang}`)).toString() }
        : { stepId: round.stepId, files: Object.fromEntries(visible.map((p) => [p, filesNow[p] ?? ""])) };
    let out: TestResult;
    try {
      const r = await fetch(`/api/challenges/${round.slug}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          dryRun: kind === "run",
          sessionId,
          durationSec: startedAt ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)) : undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        out = { by: isInterviewer ? "interviewer" : "candidate", kind, at: Date.now(), status: "error", passed: 0, total: 0, error: typeof j.error === "string" ? j.error : "Tests could not run. Try again.", results: [] };
      } else {
        out = {
          by: isInterviewer ? "interviewer" : "candidate",
          kind,
          at: Date.now(),
          status: j.status ?? (j.passed === j.total ? "passed" : "failed"),
          passed: j.passed ?? 0,
          total: j.total ?? 0,
          stderr: j.stderr ?? null,
          results: (j.results ?? []).slice(0, 40),
        };
      }
    } catch {
      out = { by: isInterviewer ? "interviewer" : "candidate", kind, at: Date.now(), status: "error", passed: 0, total: 0, error: "You look offline. Your code is saved; try again in a moment.", results: [] };
    }
    resultMap.set(`${key}:result`, JSON.stringify(out));
    setRunning(null);
  };

  const [promptOpen, setPromptOpen] = useState(true);

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(300px,34%)_minmax(0,1fr)]">
      {/* Task */}
      <section aria-label="Task" className="min-w-0 min-h-0 border-b lg:border-b-0 lg:border-r border-border bg-surface flex flex-col">
        <button
          type="button"
          onClick={() => setPromptOpen((o) => !o)}
          aria-expanded={promptOpen}
          className="lg:pointer-events-none flex items-center gap-2 px-5 h-12 shrink-0 border-b border-border text-left"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-secondary-soft">{round.kind === "prompt" ? "Scenario" : round.steps > 1 ? `Step ${round.step + 1} of ${round.steps}` : "Task"}</span>
          <ChevronDown className={`ml-auto w-4 h-4 text-muted lg:hidden transition-transform ${promptOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <div className={`${promptOpen ? "block" : "hidden"} lg:block flex-1 min-h-0 overflow-y-auto px-5 py-5 max-h-[38vh] lg:max-h-none`}>
          <h2 className="text-[18px] font-semibold tracking-tight">{round.title}</h2>
          {round.signature && <p className="mt-3 font-mono text-[12.5px] text-muted bg-panel rounded-lg px-3 py-2 ring-1 ring-inset ring-border break-all">{round.signature}</p>}
          <div className="mt-4 text-[14px] leading-relaxed text-fg/90 prose-room">
            {round.description ? <MarkdownRenderer content={round.description} /> : <p className="text-muted">Your interviewer will explain the task.</p>}
          </div>
          {isInterviewer && round.hint && (
            <details className="mt-5 rounded-lg bg-panel ring-1 ring-inset ring-border px-3 py-2 text-[13px]">
              <summary className="cursor-pointer text-muted">Hint (only you see this)</summary>
              <p className="mt-2 whitespace-pre-wrap">{round.hint}</p>
            </details>
          )}
        </div>
      </section>

      {/* Editor and output */}
      <section aria-label="Shared editor" className="min-w-0 min-h-0 flex flex-col bg-bg">
        <div className="h-11 shrink-0 flex items-center gap-1 px-2 border-b border-border overflow-x-auto">
          {round.mode === "harness" ? (
            <label className="flex items-center gap-2 px-2 text-[12px] text-muted">
              Language
              <select
                value={activeLang ?? ""}
                disabled={readOnly}
                onChange={(e) => setLang(e.target.value)}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-[12.5px] text-fg focus:outline-none focus:border-secondary/60"
              >
                {round.languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {LANG_NAME[l.id] ?? l.id}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div role="tablist" aria-label="Files" className="flex items-center gap-1">
              {visible.map((p) => (
                <button
                  key={p}
                  role="tab"
                  type="button"
                  aria-selected={p === file}
                  onClick={() => setFile(p)}
                  className={`h-8 px-2.5 rounded-md text-[12.5px] font-mono whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${p === file ? "bg-panel text-fg ring-1 ring-inset ring-border-strong" : "text-muted hover:text-fg hover:bg-panel/60"}`}
                >
                  <FileCode2 className="w-3.5 h-3.5 opacity-70" aria-hidden />
                  {p.replace(/^\//, "")}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5 pl-2">
            {graded && !readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => void runTests("run")}
                  disabled={!!running || !room.synced}
                  className="h-8 px-3 rounded-lg border border-border bg-surface text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-panel disabled:opacity-50"
                >
                  {running === "run" ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Play className="w-3.5 h-3.5 text-muted" aria-hidden />}
                  Run tests
                </button>
                {!isInterviewer && (
                  <button
                    type="button"
                    onClick={() => void runTests("submit")}
                    disabled={!!running || !room.synced}
                    className="h-8 px-3 rounded-lg bg-secondary text-bg text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50"
                  >
                    {running === "submit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Send className="w-3.5 h-3.5" aria-hidden />}
                    Submit
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className={`flex-1 min-h-0 grid ${(previewTemplate && room.synced) || graded ? "grid-rows-[minmax(0,1fr)_minmax(0,38%)]" : "grid-rows-1"}`}>
          <div className="min-h-0 relative">
            {!room.synced ? (
              <div className="h-full flex items-center justify-center gap-2 text-[13px] text-muted">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Opening the shared editor
              </div>
            ) : (
              <SharedEditor
                key={`${editorName}-${dark}-${readOnly}`}
                text={text}
                awareness={room.awareness}
                language={round.mode === "harness" ? harnessLang(activeLang ?? "") : langOf(file)}
                prose={round.mode === "prompt"}
                dark={dark}
                readOnly={readOnly}
                label={round.mode === "prompt" ? "Shared answer" : `Shared editor, ${file || activeLang}`}
                placeholder={round.mode === "prompt" ? "Write the answer here. Both of you can type." : ""}
              />
            )}
          </div>
          {previewTemplate && room.synced && Object.values(filesNow).some(Boolean) && (
            <div className="min-h-0 border-t border-border bg-surface">
              <LivePreview template={previewTemplate} dependencies={pg?.dependencies} files={filesNow} roundKey={key} dark={dark} />
            </div>
          )}
          {graded && <ResultsPanel result={parsed} running={running} />}
        </div>
      </section>
    </div>
  );
}

function ResultsPanel({ result, running }: { result: TestResult | null; running: "run" | "submit" | null }) {
  return (
    <div className="min-h-0 border-t border-border bg-surface flex flex-col" aria-live="polite">
      <div className="h-10 shrink-0 flex items-center gap-2 px-4 border-b border-border text-[12.5px]">
        <FlaskConical className="w-3.5 h-3.5 text-muted" aria-hidden />
        <span className="font-medium">Tests</span>
        {running ? (
          <span className="text-muted inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> Running
          </span>
        ) : result ? (
          <span className="text-muted">
            {result.kind === "submit" ? "Submitted" : "Last run"} by the {result.by} · {new Date(result.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
        {result && result.status !== "error" && (
          <span className={`ml-auto h-6 px-2 rounded-md text-[12px] font-semibold tabular-nums inline-flex items-center ${result.passed === result.total && result.total > 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
            {result.passed}/{result.total} passing
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 text-[13px]">
        {!result ? (
          <p className="text-muted">Run the tests to see results here. Both of you see the same results.</p>
        ) : result.status === "error" ? (
          <p className="text-danger">{result.error}</p>
        ) : (
          <>
            {result.stderr && <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-danger/10 text-danger p-3 text-[12px] font-mono">{result.stderr}</pre>}
            <ul className="grid gap-1.5">
              {result.results.map((t, i) => (
                <li key={i} className="flex gap-2">
                  {t.status === "pass" ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" aria-label="Passed" /> : <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-label="Failed" />}
                  <div className="min-w-0">
                    <p className="font-medium">{t.isHidden ? "Hidden test" : t.name}</p>
                    {!t.isHidden && t.status !== "pass" && (t.error || t.got !== undefined) && (
                      <p className="text-muted font-mono text-[12px] break-all">
                        {t.error ? t.error : `Expected ${t.expected}, got ${t.got}`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
