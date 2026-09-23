"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { getLanguageFromPath, isBackendLanguage } from "@/lib/playground-languages";
import {
  describeExecution,
  formatRunMeta,
  summarizeRun,
  type RunSummary,
} from "@/lib/exec-result";
import { stdinKey } from "@/lib/run-payload";
import { postExecute, executeBodyForFiles } from "@/lib/execute-client";

export type BackendLog = { method: string; data: string[]; stream?: "stdout" | "stderr" };

/** One finished backend run, kept so users can compare before and after a change. */
export type RunRecord = {
  id: number;
  at: number;
  file: string;
  logs: BackendLog[];
  summary: RunSummary;
  meta: string | null;
};

/** How many past runs the console keeps. */
export const RUN_HISTORY_SIZE = 5;

export type Runner = ReturnType<typeof useRunner>;

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function codeAt(files: SandpackFiles, path: string): string {
  const f = files[path];
  return typeof f === "string" ? f : f?.code ?? "";
}

/**
 * Everything about running code: the browser bundler (via RunBridge) for
 * frontend templates, Piston via /api/execute for backend ones, the stdin
 * draft, the backend console lines, and speculative warm-ups.
 */
export function useRunner({
  templateId,
  isBackend,
  signedIn,
  filesRef,
  activeFileRef,
}: {
  templateId: string;
  isBackend: boolean;
  signedIn: boolean;
  filesRef: MutableRefObject<SandpackFiles>;
  activeFileRef: MutableRefObject<string>;
}) {
  const [running, setRunning] = useState(false);
  const [backendLogs, setBackendLogs] = useState<BackendLog[]>([]);
  // Provenance of the last explicit run for the console footer.
  const [runMeta, setRunMeta] = useState<string | null>(null);
  // Outcome line for the backend console footer ("Exited with code 0").
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  // Last few backend runs, newest first.
  const [history, setHistory] = useState<RunRecord[]>([]);
  const runIdRef = useRef(0);

  // Program input for backend runs. Local-only draft per template — it rides
  // the run request but never enters saved snippets.
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const stdinRef = useRef("");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(stdinKey(templateId));
      setStdin(saved ?? "");
      stdinRef.current = saved ?? "";
      // A restored draft opens the bar so the applied input is visible.
      if (saved && saved.trim()) setStdinOpen(true);
    } catch {
      /* private mode — run without a draft */
    }
  }, [templateId]);
  useEffect(() => {
    stdinRef.current = stdin;
    try {
      window.localStorage.setItem(stdinKey(templateId), stdin);
    } catch {
      /* ignore */
    }
  }, [stdin, templateId]);

  // Browser runs go through Sandpack: RunBridge registers its run() here.
  const runRef = useRef<(() => void) | null>(null);
  // JsConsole registers the Sandpack console hook's own reset() here, which
  // drains the client's log store directly, so clearing can never desync
  // from what the bundler holds. (Index baselines were tried and abandoned —
  // they race the async bundler and can hide fresh output after a Run.)
  const consoleResetRef = useRef<(() => void) | null>(null);
  const backendFetchRef = useRef(false);

  const clearConsole = useCallback(() => {
    consoleResetRef.current?.();
    setBackendLogs([]);
    setRunSummary(null);
    setRunMeta(null);
  }, []);

  const activePath = () =>
    activeFileRef.current || Object.keys(filesRef.current)[0] || "/index.ts";

  async function handleRun() {
    if (backendFetchRef.current) return; // rapid clicks: one execution at a time
    setRunning(true);
    try {
      const activeFilePath = activePath();
      const activeCode = codeAt(filesRef.current, activeFilePath);
      const executionLanguage = getLanguageFromPath(activeFilePath, templateId);

      // Backend languages (Python, Go, Java, C++, Rust) execute server-side
      if (activeCode.trim() && isBackendLanguage(executionLanguage, templateId)) {
        setBackendLogs([]);
        setRunMeta(null);
        setRunSummary(null);
        backendFetchRef.current = true;

        // Multi-file workspaces travel whole: sibling modules ride as Piston
        // extra files so imports resolve server-side.
        const { status, data: runResult } = await postExecute(
          executeBodyForFiles({
            language: executionLanguage,
            activeFilePath,
            files: filesRef.current,
            speculative: false,
            codeHash: simpleHash(activeCode),
            stdin,
          }),
        );
        const meta = formatRunMeta(runResult);
        const summary = summarizeRun(status, runResult);
        const logs: BackendLog[] = describeExecution(status, runResult).map((line) => ({
          method: line.method,
          data: [line.text],
          ...(line.stream ? { stream: line.stream } : {}),
        }));
        setRunMeta(meta);
        setRunSummary(summary);
        setBackendLogs(logs);
        const record: RunRecord = {
          id: ++runIdRef.current,
          at: Date.now(),
          file: activeFilePath.replace(/^\//, ""),
          logs,
          summary,
          meta,
        };
        setHistory((prev) => [record, ...prev].slice(0, RUN_HISTORY_SIZE));
      } else {
        // Frontend languages (JS, TS, React, etc.) — Sandpack's in-browser bundler
        clearConsole();
        runRef.current?.();
      }
    } catch (err) {
      console.error("Run execution error:", err);
      if (isBackend) {
        setBackendLogs([{ method: "error", data: [`Could not reach the runner: ${String(err)}`] }]);
        setRunSummary({ tone: "error", text: "Could not run" });
      }
    } finally {
      backendFetchRef.current = false;
      setRunning(false);
    }
  }

  // Speculative pre-compilation — backend languages, signed-in users only.
  // Debounced on every edit and skipped when the exact payload was already
  // warmed. Guests are excluded: their 10 runs a minute are too few to spend
  // on background work.
  const speculativeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWarmedRef = useRef("");
  const scheduleSpeculative = useCallback(() => {
    if (!isBackend || !signedIn) return;
    if (speculativeTimerRef.current) clearTimeout(speculativeTimerRef.current);
    speculativeTimerRef.current = setTimeout(() => {
      speculativeTimerRef.current = null;
      // No background executor spend for hidden tabs or mid-run.
      if (document.hidden || backendFetchRef.current) return;
      const activeFilePath =
        activeFileRef.current || Object.keys(filesRef.current)[0] || "/index.ts";
      const activeCode = codeAt(filesRef.current, activeFilePath);
      if (!activeCode.trim()) return;
      const executionLanguage = getLanguageFromPath(activeFilePath, templateId);
      if (!isBackendLanguage(executionLanguage, templateId)) return;
      // Same body the explicit run will send, so the server keys match.
      const body = executeBodyForFiles({
        language: executionLanguage,
        activeFilePath,
        files: filesRef.current,
        speculative: true,
        codeHash: simpleHash(activeCode),
        stdin: stdinRef.current,
      });
      const signature = simpleHash(JSON.stringify(body));
      if (signature === lastWarmedRef.current) return;
      lastWarmedRef.current = signature;
      postExecute(body).catch((err) => {
        console.warn("[Speculative] Pre-compilation background warning:", err);
      });
    }, 1500);
  }, [isBackend, signedIn, templateId, filesRef, activeFileRef]);
  useEffect(
    () => () => {
      if (speculativeTimerRef.current) clearTimeout(speculativeTimerRef.current);
    },
    [],
  );

  return {
    running,
    setRunning,
    backendLogs,
    runMeta,
    runSummary,
    history,
    stdin,
    setStdin,
    stdinOpen,
    setStdinOpen,
    runRef,
    consoleResetRef,
    clearConsole,
    handleRun,
    scheduleSpeculative,
  };
}
