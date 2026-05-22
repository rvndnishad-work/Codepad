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
import { javascript } from "@codemirror/lang-javascript";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { yCollab } from "y-codemirror.next";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
  foldGutter,
} from "@codemirror/language";
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Clock,
  FlaskConical,
  Terminal,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ChallengeDescription from "../../ChallengeDescription";
import SessionTimer from "@/components/SessionTimer";

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

type LiveLog = { id: string; method: string; data: unknown[]; ts: number };

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
  multiplayer = false,
  sim = false,
  isInterviewer = false,
  shareToken = "",
  username = "Anonymous",
}: {
  challenge: Challenge;
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
  sessionId: string | null;
  multiplayer?: boolean;
  sim?: boolean;
  isInterviewer?: boolean;
  shareToken?: string;
  username?: string;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Sync active challenge with backend for auto-routing
  useEffect(() => {
    if (multiplayer && sessionId && challenge.id) {
      // Intentionally swallowing errors since this is non-critical optimization
      fetch(`/api/interview/${sessionId}/active`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id }),
      }).catch(() => {});
    }
  }, [multiplayer, sessionId, challenge.id]);

  // Yjs and WebRTC Real-Time State
  const [yDoc] = useState(() => new Y.Doc());
  const [webrtcProvider, setWebrtcProvider] = useState<WebrtcProvider | null>(null);

  // Dynamic user presence updates
  useEffect(() => {
    if (!webrtcProvider) return;
    const color = isInterviewer ? "#8b5cf6" : "#10b981";
    const roleLabel = isInterviewer ? " (Interviewer)" : " (Candidate)";
    webrtcProvider.awareness.setLocalStateField("user", {
      name: username + roleLabel,
      color: color,
      colorLight: color + "33",
    });
  }, [webrtcProvider, username, isInterviewer]);

  useEffect(() => {
    if (!multiplayer || !sessionId) return;

    // Connect to secure WebRTC room.
    //
    // NOTE on signaling servers:
    //  - ws://localhost:4444 only works when the dev signaling server is
    //    running (`npm run dev:signal`). It's the most reliable choice for
    //    cross-browser-profile testing on a single machine.
    //  - wss://signaling.yjs.dev is the public Yjs signaling fallback. It
    //    works for genuine WAN testing but has been flaky / rate-limited
    //    in the past. (The old `y-webrtc-signaling-eu.herokuapp.com` URL
    //    in this list pre-dated Heroku's free tier shutdown and now hangs
    //    every connection attempt — removed.)
    const roomName = `interviewpad-room-${sessionId}`;
    const provider = new WebrtcProvider(roomName, yDoc, {
      signaling: [
        "ws://localhost:4444",        // local dev signaling
        "wss://signaling.yjs.dev",    // public fallback
      ],
    });

    // Set initial awareness (Cursor colors and User tags)
    const color = isInterviewer ? "#8b5cf6" : "#10b981"; // Sleek Purple for Interviewer, Vibrant Emerald for Candidate
    const roleLabel = isInterviewer ? " (Interviewer)" : " (Candidate)";
    provider.awareness.setLocalStateField("user", {
      name: username + roleLabel,
      color: color,
      colorLight: color + "33", // Sleek translucent selection
    });

    // Diagnostic logging — visible in DevTools so the user can confirm
    // both tabs land in the same room and watch peer discovery.
    if (typeof window !== "undefined") {
      console.info(
        `[multiplayer] joined room "${roomName}" as ${
          isInterviewer ? "interviewer" : "candidate"
        } (clientID ${yDoc.clientID})`
      );
      const logStatus = () => {
        const peers = [...provider.awareness.getStates().keys()].filter(
          (id) => id !== yDoc.clientID
        );
        console.info(
          `[multiplayer] peers=${peers.length} connected=${provider.connected} bcconns=${(provider as unknown as { room?: { bcConns?: Set<unknown> } }).room?.bcConns?.size ?? 0}`
        );
      };
      provider.on("peers", logStatus);
      provider.awareness.on("change", logStatus);
      provider.on("synced", logStatus);
    }

    setWebrtcProvider(provider);

    return () => {
      provider.destroy();
      setWebrtcProvider(null);
    };
  }, [multiplayer, sessionId, yDoc, sim]);

  // Test state
  const [testRun, setTestRun] = useState<{
    passed: number;
    total: number;
    tests: FlatTest[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"passed" | "failed" | null>(null);

  // Tabbed sidebar state (Console or Tests)
  const [sidebarTab, setSidebarTab] = useState<"console" | "tests">("console");

  // Live console logs
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([]);
  useEffect(() => {
    type Op = { kind: "log"; item: LiveLog } | { kind: "clear" };
    const pending: Op[] = [];
    let rafId: number | null = null;

    function flush() {
      rafId = null;
      if (pending.length === 0) return;
      const ops = pending.splice(0);
      setLiveLogs((prev) => {
        let next = prev;
        let mutated = false;
        for (const op of ops) {
          if (op.kind === "clear") {
            if (!mutated) {
              next = [];
              mutated = true;
            } else {
              next.length = 0;
            }
          } else {
            if (!mutated) {
              next = [...prev];
              mutated = true;
            }
            next.push(op.item);
          }
        }
        return next.length > 300 ? next.slice(next.length - 300) : next;
      });
    }

    function onMessage(e: MessageEvent) {
      const data = e.data as
        | { type?: string; codesandbox?: boolean; log?: unknown }
        | null;
      if (!data || data.type !== "console" || !data.codesandbox) return;
      const items = Array.isArray(data.log) ? data.log : [data.log];
      for (const raw of items) {
        const item = raw as { id?: string; method?: string; data?: unknown[] };
        if (item?.method === "clear") {
          pending.push({ kind: "clear" });
          continue;
        }
        pending.push({
          kind: "log",
          item: {
            id: item?.id ?? `${Date.now()}-${Math.random()}`,
            method: item?.method ?? "log",
            data: Array.isArray(item?.data) ? item.data : [],
            ts: Date.now(),
          },
        });
      }
      if (rafId === null) rafId = requestAnimationFrame(flush);
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const clearLiveLogs = () => setLiveLogs([]);

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

  const visibleFiles = useMemo(() => Object.keys(starterFiles), [starterFiles]);
  const activeFile = useMemo(
    () => (starterFiles["/index.ts"] ? "/index.ts" : visibleFiles[0]),
    [starterFiles, visibleFiles]
  );

  const filesRef = useRef<SandpackFiles>(files);

  type SandpackBridge = {
    updateFile: (path: string, code: string) => void;
    addFile?: (path: string, code: string) => void;
    files: SandpackFiles;
    runSandpack?: () => void;
    clients?: Record<string, { dispatch?: (msg: unknown) => void } | undefined>;
  };
  const sandpackBridgeRef = useRef<SandpackBridge | null>(null);

  const DEBUG_BEGIN = "// ─── @debug-run (auto, edit input above) ───";
  const DEBUG_END = "// ─── end @debug-run ───";

  function stripDebugBlock(src: string): string {
    const begin = src.indexOf(DEBUG_BEGIN);
    if (begin === -1) return src;
    const end = src.indexOf(DEBUG_END, begin);
    if (end === -1) return src.slice(0, begin).replace(/\n+$/, "") + "\n";
    return (
      src.slice(0, begin).replace(/\n+$/, "") +
      "\n" +
      src.slice(end + DEBUG_END.length).replace(/^\n+/, "")
    );
  }

  function runDebug() {
    const bridge = sandpackBridgeRef.current;
    const indexFile = bridge?.files["/index.ts"];
    const rawCode =
      typeof indexFile === "string"
        ? indexFile
        : (indexFile as { code: string } | undefined)?.code ?? "";

    const baseCode = stripDebugBlock(rawCode);
    runLocalDebug(baseCode);
  }

  function runLocalDebug(tsCode: string) {
    const js = stripTsAnnotations(tsCode);
    const sendLog = (method: string, data: unknown[]) => {
      window.postMessage(
        {
          type: "console",
          codesandbox: true,
          log: [
            {
              id: `local-${Date.now()}-${Math.random()}`,
              method,
              data,
            },
          ],
        },
        "*"
      );
    };

    const orig = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };
    console.log = (...a: unknown[]) => sendLog("log", a);
    console.error = (...a: unknown[]) => sendLog("error", a);
    console.warn = (...a: unknown[]) => sendLog("warn", a);
    console.info = (...a: unknown[]) => sendLog("info", a);

    try {
      // Evaluate the raw Javascript block inside a fresh sandbox scope
      const factory = new Function(js);
      factory();
    } catch (e: unknown) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      sendLog("error", [`[run code error]`, msg]);
    } finally {
      console.log = orig.log;
      console.error = orig.error;
      console.warn = orig.warn;
      console.info = orig.info;
    }
  }

  function stripTsAnnotations(src: string): string {
    let s = src;
    
    // Remove export statements (keep the declaration itself)
    s = s.replace(
      /^\s*export\s+(?:default\s+)?(?=(?:async\s+)?(?:function|const|let|var|class))/gm,
      ""
    );
    
    // Remove interface declarations
    s = s.replace(/^\s*interface\s+\w+(?:\s+extends\s+[\w,<>\s]+)?\s*\{[^}]*\}\s*/gm, "");
    
    // Remove type declarations
    s = s.replace(/^\s*type\s+\w+(?:<[^>]+>)?\s*=\s*[^;]+;\s*/gm, "");
    
    // Remove function/class generics (e.g., fizzBuzz<T>)
    s = s.replace(/(\bfunction\s+\w+|\bclass\s+\w+)<[^>]+>/g, "$1");
    
    // Remove parameter type annotations (e.g., n: number or array: string[])
    s = s.replace(/([\w$]+)\s*\??\s*:\s*[\w<>\[\]|&,\s.'"]+(?=\s*[,)])/g, "$1");
    
    // Remove function return type annotations (e.g., ): string[] { or ): void =>)
    s = s.replace(/\)\s*:\s*[\w<>\[\]|&,\s.'"]+(?=\s*[{=])/g, ")");
    
    // Remove type assertions (e.g., as const or as string)
    s = s.replace(/\s+as\s+(?:const|[\w<>\[\]|&]+)/g, "");
    
    return s;
  }

  const [runningTests, setRunningTests] = useState(false);
  function runTests() {
    const triggerRerun = () => {
      const watchBtn = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button")
      ).find(
        (b) =>
          b.textContent?.trim() === "Watch" &&
          b.className?.includes("sp-test-header")
      );
      if (!watchBtn) return false;
      watchBtn.click();
      window.setTimeout(() => watchBtn.click(), 200);
      return true;
    };

    sandpackBridgeRef.current?.runSandpack?.();
    setRunningTests(true);
    window.setTimeout(() => setRunningTests(false), 4000);
    if (!triggerRerun()) {
      let tries = 0;
      const interval = window.setInterval(() => {
        tries++;
        if (triggerRerun() || tries > 20) window.clearInterval(interval);
      }, 150);
    }
  }

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
    
    queueMicrotask(() => {
      setTestRun({ passed, total: flat.length, tests: flat });
    });
  }

  const submitAfterTestsRef = useRef(false);
  async function handleSubmit() {
    setSidebarTab("tests");
    if (!testRun) {
      toast.info("Running tests before submission…");
      submitAfterTestsRef.current = true;
      runTests();
      return;
    }
    setSubmitting(true);
    try {
      const submittedFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(filesRef.current)) {
        if (testFiles[path]) continue;
        const code = typeof file === "string" ? file : (file as { code: string }).code;
        submittedFiles[path] = path === "/index.ts" ? stripDebugBlock(code) : code;
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

  useEffect(() => {
    if (submitAfterTestsRef.current && testRun) {
      submitAfterTestsRef.current = false;
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testRun]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SandpackProvider
      key={challenge.id}
      template={challenge.template as any}
      theme={isDark ? cobalt2 : "light"}
      files={files}
      options={{
        autorun: false,
        autoReload: false,
        initMode: "lazy",
        recompileMode: "delayed",
        recompileDelay: 300,
        visibleFiles,
        activeFile,
      }}
    >
      <FilesTracker filesRef={filesRef} bridgeRef={sandpackBridgeRef} />

      <div className="flex flex-col h-screen bg-bg overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={sessionId ? `/interview/${sessionId}` : `/challenges/${challenge.slug}`}
              className="text-muted hover:text-fg transition shrink-0"
              title="Back to session queue"
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

          {/* Live Remaining Interview Timer */}
          {sessionId && (
            <SessionTimer
              sessionId={sessionId}
              shareToken={shareToken}
              isInterviewer={isInterviewer}
            />
          )}

          {/* Toolbar Center/Right buttons */}
          <div className="flex items-center gap-3 shrink-0">
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

            {/* Run Code trigger button in Toolbar */}
            {submittedStatus !== "passed" && (
              <button
                onClick={() => {
                  setSidebarTab("console");
                  runDebug();
                }}
                className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-fg flex items-center gap-1.5 transition shadow-sm"
                title="Execute index.ts script immediately and view logs"
              >
                <Play className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                Run code
              </button>
            )}

            {submittedStatus !== "passed" && (
              <button
                onClick={() => {
                  setSidebarTab("tests");
                  runTests();
                }}
                disabled={runningTests}
                className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-fg flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Run the full test suite against your code"
              >
                <FlaskConical className="w-3.5 h-3.5 text-accent" />
                {runningTests ? "Running…" : "Run tests"}
              </button>
            )}

            {submittedStatus === "passed" ? (
              <div className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submitted
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(var(--accent-rgb),0.2)]"
                title={!testRun ? "Tests will run first, then submit" : "Submit attempt"}
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Submitting…" : "Submit Solution"}
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
                className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5 shadow-sm"
                title="Try again"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        </header>

        {/* Body: Flat responsive layout grid — stretches 100% full height */}
        <div className="flex-1 grid grid-cols-12 min-h-0 h-full overflow-hidden">
          {/* Description Panel (3/12 columns on desktop) */}
          <aside className="col-span-12 md:col-span-4 lg:col-span-3 overflow-y-auto border-r border-border bg-bg p-5 h-full">
            <ChallengeDescription markdown={challenge.description} />
          </aside>

          {/* Center Editor Panel (6/12 columns on desktop) — stretches 100% full height */}
          <div className="col-span-12 md:col-span-8 lg:col-span-6 min-h-0 flex flex-col border-r border-border h-full overflow-hidden">
            <div className="flex-1 min-h-0 h-full relative flex flex-col">
              {multiplayer ? (
                <SyncingEditor
                  yDoc={yDoc}
                  provider={webrtcProvider}
                  starterFiles={starterFiles}
                  isInterviewer={isInterviewer}
                  isDark={isDark}
                />
              ) : (
                <SandpackCodeEditor
                  showLineNumbers
                  showTabs
                  closableTabs={false}
                  wrapContent
                  extensions={[javascript({ jsx: true, typescript: true })]}
                  style={{ height: "100%", width: "100%" }}
                />
              )}
            </div>
          </div>

          {/* Desktop & Mobile Split Sidebar: Console and Tests Tabs (3/12 columns on desktop) — stretches 100% full height */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col min-h-0 bg-bg border-l border-border h-full overflow-hidden">
            {/* Tab Switcher Header */}
            <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface/30">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSidebarTab("console")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
                    sidebarTab === "console"
                      ? "bg-bg text-fg shadow-sm border border-border"
                      : "text-muted hover:text-fg hover:bg-surface/50"
                  }`}
                >
                  <Terminal className="w-3 h-3 text-accent" />
                  Console
                  {liveLogs.length > 0 && (
                    <span className="px-1 py-0.5 rounded text-[8px] bg-accent/15 text-accent font-mono ml-1">
                      {liveLogs.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("tests")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
                    sidebarTab === "tests"
                      ? "bg-bg text-fg shadow-sm border border-border"
                      : "text-muted hover:text-fg hover:bg-surface/50"
                  }`}
                >
                  <FlaskConical className="w-3 h-3 text-accent" />
                  Tests
                  {testRun && (
                    <span
                      className={`px-1 py-0.5 rounded text-[8px] font-mono ml-1 ${
                        testRun.passed === testRun.total
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-rose-500/15 text-rose-500"
                      }`}
                    >
                      {testRun.passed}/{testRun.total}
                    </span>
                  )}
                </button>
              </div>
              
              {sidebarTab === "console" && (
                <button
                  type="button"
                  onClick={clearLiveLogs}
                  disabled={liveLogs.length === 0}
                  className="px-2 py-0.5 rounded hover:bg-surface text-[10px] text-muted hover:text-fg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 min-h-0 relative">
              <div className={`absolute inset-0 ${sidebarTab === "console" ? "block" : "hidden"}`}>
                <LiveConsole
                  logs={liveLogs}
                  onClear={clearLiveLogs}
                />
              </div>
              <div className={`absolute inset-0 ${sidebarTab === "tests" ? "block" : "hidden"}`}>
                <SandpackTests
                  onComplete={handleTestsComplete}
                  showVerboseButton
                  showWatchButton
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SandpackProvider>
  );
}

function FilesTracker({
  filesRef,
  bridgeRef,
}: {
  filesRef: React.MutableRefObject<SandpackFiles>;
  bridgeRef?: React.MutableRefObject<{
    updateFile: (path: string, code: string) => void;
    addFile?: (path: string, code: string) => void;
    files: SandpackFiles;
    runSandpack?: () => void;
    clients?: Record<string, { dispatch?: (msg: unknown) => void } | undefined>;
  } | null>;
}) {
  const { sandpack } = useSandpack();
  useEffect(() => {
    filesRef.current = sandpack.files;
    if (bridgeRef) {
      const sp = sandpack as unknown as {
        updateFile: (p: string, c: string) => void;
        addFile?: (p: string, c: string) => void;
        files: SandpackFiles;
        runSandpack?: () => void;
        clients?: Record<string, { dispatch?: (msg: unknown) => void } | undefined>;
      };
      bridgeRef.current = {
        updateFile: sp.updateFile,
        addFile: sp.addFile,
        files: sp.files,
        runSandpack: sp.runSandpack,
        clients: sp.clients,
      };
    }
  }, [sandpack, sandpack.files, filesRef, bridgeRef]);
  return null;
}

function LiveConsole({
  logs,
  onClear,
}: {
  logs: LiveLog[];
  onClear: () => void;
}) {

  function formatArg(v: unknown): string {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint")
      return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  const methodStyle: Record<string, string> = {
    error: "border-rose-500 text-rose-400",
    warn: "border-amber-500 text-amber-400",
    info: "border-sky-500 text-sky-400",
    log: "border-transparent text-fg/90",
  };

  return (
    <div className="flex flex-col h-full bg-bg font-mono text-xs">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-muted/50 text-center py-8 text-[11px] leading-relaxed px-4">
            Add <code className="px-1 py-0.5 rounded bg-surface/60 text-fg/80">console.log(...)</code> in your code, then click <strong className="text-fg/80">Run code</strong> in the header toolbar above (or let the tests run).
          </div>
        ) : (
          <ul>
            {logs.map((l) => (
              <li
                key={l.id}
                className={`px-3 py-1 border-l-2 whitespace-pre-wrap break-words ${
                  methodStyle[l.method] ?? methodStyle.log
                }`}
              >
                <span className="text-muted/40 mr-2 text-[10px] uppercase tabular-nums">
                  {l.method}
                </span>
                {l.data.map((d, i) => (
                  <span key={i} className="mr-2">
                    {formatArg(d)}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Collaborative sync editor matching the main WebRTC connection room.
//
// IMPORTANT: We do NOT use SandpackCodeEditor here. Sandpack initialises its
// own CodeMirror EditorState from sandpack.files[activeFile].code, so when
// yCollab later inserts the seeded text into the same view you end up with
// the starter code rendered twice (the "duplicate code" bug). Sandpack also
// owns the doc, so y-codemirror.next's bidirectional binding never actually
// pushes local edits into yText, which is why edits don't sync.
//
// Instead we mount a raw CodeMirror 6 EditorView whose initial doc IS the
// yText, and mirror any yText changes back into Sandpack via
// `sandpack.updateFile` so the test runner still picks them up.
function SyncingEditor({
  yDoc,
  provider,
  starterFiles,
  isInterviewer,
  isDark,
}: {
  yDoc: Y.Doc;
  provider: WebrtcProvider | null;
  starterFiles: Record<string, string>;
  isInterviewer: boolean;
  isDark: boolean;
}) {
  const { sandpack } = useSandpack();
  const { activeFile } = sandpack;

  const [synced, setSynced] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  // Resolve the shared Y.Text for the active file. `yDoc.getText(path)` is
  // idempotent (same logical instance per yDoc) and is a TOP-LEVEL shared
  // type, so it's automatically synced with peers — no map-key race that
  // can leave clients bound to orphaned Y.Text instances.
  const yText = useMemo(() => yDoc.getText(activeFile), [yDoc, activeFile]);

  useEffect(() => {
    if (!provider) return;
    if (provider.connected) setSynced(true);
    const handle = ({ synced: isSynced }: { synced: boolean }) => {
      if (isSynced) setSynced(true);
    };
    provider.on("synced", handle);
    const onAware = () => {
      const remote = [...provider.awareness.getStates().keys()].filter(
        (id) => id !== yDoc.clientID
      );
      setPeerCount(remote.length);
    };
    provider.awareness.on("change", onAware);
    onAware();
    return () => {
      provider.off("synced", handle);
      provider.awareness.off("change", onAware);
    };
  }, [provider, yDoc]);

  // Seed starter files into the shared doc.
  //
  // Either role can seed (so the candidate joining first still gets code),
  // and we coordinate with three guards to avoid duplicate content:
  //
  //   1. `yMeta.seeded` — a shared boolean. The first peer to transact()
  //      flips it; any later peer with synced doc sees it true and bails.
  //
  //   2. A deterministic clientID tiebreaker — when peers can see each
  //      other in awareness, only the lowest clientID seeds.
  //
  //   3. `isInterviewer` as a soft hint — if we appear alone and we're
  //      the candidate, we wait an extra grace window so the interviewer
  //      (the natural seeder) gets a chance to win.
  //
  // We INTENTIONALLY do NOT gate on the `synced` event here. In y-webrtc,
  // `synced` only fires after a sync handshake with a peer (or with a
  // signaling server that retains state). If the only available signaling
  // server is unreachable AND there's no peer, `synced` never fires, and
  // gating on it would leave the editor empty forever. Instead we wait a
  // fixed wall-clock window, then run the decision regardless. If a peer
  // shows up later, the CRDT merge + `yMeta.seeded` flag keeps content
  // single-copy.
  useEffect(() => {
    if (!provider) return;
    const yMeta = yDoc.getMap<boolean>("meta");

    let cancelled = false;

    const performSeed = () => {
      if (cancelled) return;
      if (yMeta.get("seeded")) return;
      yDoc.transact(() => {
        if (yMeta.get("seeded")) return;
        for (const [path, code] of Object.entries(starterFiles)) {
          const t = yDoc.getText(path);
          if (t.length === 0) t.insert(0, code);
        }
        yMeta.set("seeded", true);
      });
    };

    function maybeSeed() {
      if (cancelled || yMeta.get("seeded")) return;
      const remoteIds = [...provider!.awareness.getStates().keys()].filter(
        (id) => id !== yDoc.clientID
      );

      if (remoteIds.length === 0) {
        // Appear to be alone. The interviewer seeds straight away; the
        // candidate waits a bit longer in case the interviewer is just
        // slow to peer with us.
        if (!isInterviewer) {
          window.setTimeout(performSeed, 1500);
        } else {
          performSeed();
        }
        return;
      }

      // Peers are present: deterministic tiebreaker (lowest clientID wins).
      const lowest = Math.min(yDoc.clientID, ...remoteIds);
      if (lowest === yDoc.clientID) {
        performSeed();
      } else {
        // Other peer should seed; fall back if they don't within 2.5s.
        window.setTimeout(performSeed, 2500);
      }
    }

    // Wait ~1.2s for awareness to populate so the tiebreaker has accurate
    // peer information. After that we commit — no further waiting on
    // signaling state.
    const t = window.setTimeout(maybeSeed, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [provider, yDoc, starterFiles, isInterviewer]);

  // Mirror yText changes into Sandpack so the test runner & "Run code"
  // button operate on the latest collaborative content.
  useEffect(() => {
    const handlers: Array<{ text: Y.Text; fn: () => void }> = [];
    for (const path of Object.keys(starterFiles)) {
      const t = yDoc.getText(path);
      const fn = () => {
        const newCode = t.toString();
        const current = sandpack.files[path]?.code;
        if (current !== newCode) sandpack.updateFile(path, newCode);
      };
      t.observe(fn);
      handlers.push({ text: t, fn });
    }
    return () => {
      for (const { text, fn } of handlers) text.unobserve(fn);
    };
  }, [yDoc, starterFiles, sandpack]);

  return (
    <>
      {/* Simple file-tab strip — matches the look of SandpackCodeEditor's tabs. */}
      <div className="h-9 shrink-0 flex items-stretch border-b border-border bg-surface text-[11px] font-mono">
        <div className="flex items-center gap-2 px-3 border-r border-border bg-bg text-fg">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="truncate">{activeFile.replace(/^\//, "")}</span>
        </div>
        <div className="flex-1" />
        <div className="px-3 flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold">
          {provider ? (
            peerCount > 0 ? (
              <span className="text-emerald-500">● Live · {peerCount} peer{peerCount === 1 ? "" : "s"}</span>
            ) : synced ? (
              <span className="text-amber-500" title="Connected to signaling but no peer in the room yet. If this persists, see the README — `npm run dev:signal` is the most reliable path locally.">● Waiting for peer…</span>
            ) : (
              <span className="text-amber-500" title="Could not reach a signaling server. Editor still works offline; collaboration will start once peering succeeds.">● Offline</span>
            )
          ) : (
            <span className="text-muted/60">Solo</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <CollabCodeMirror
          key={activeFile}
          yText={yText}
          provider={provider}
          path={activeFile}
          isDark={isDark}
        />
      </div>

      {/* Global CSS overrides to style collaborative cursors with an elite, futuristic HUD look */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Premium custom caretaker selection colors */
        .cm-ySelection {
          border-radius: 2px !important;
        }
        .cm-ySelectionCaret, .cm-ySelection-caret {
          position: relative !important;
          border-left: 2px solid currentColor !important;
          border-right: none !important;
          margin-left: -1px !important;
          margin-right: -1px !important;
          height: 1.25em !important;
          align-self: center !important;
        }
        /* Sleek glowing pin dot at the top of caret line */
        .cm-ySelectionCaret::after, .cm-ySelection-caret::after {
          content: "" !important;
          position: absolute !important;
          top: 0 !important;
          left: -2.5px !important;
          width: 6px !important;
          height: 6px !important;
          border-radius: 50% !important;
          background-color: currentColor !important;
          box-shadow: 0 0 10px currentColor !important;
        }
        /* Custom high-contrast HUD hover label badge */
        .cm-ySelectionInfo, .cm-ySelection-info {
          position: absolute !important;
          top: -1.8em !important;
          left: 0 !important;
          color: #ffffff !important;
          font-family: "Outfit", "Inter", sans-serif !important;
          font-size: 9px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
          padding: 2px 6px !important;
          border-radius: 3px !important;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4) !important;
          white-space: nowrap !important;
          opacity: 1 !important;
          pointer-events: none !important;
          z-index: 100 !important;
        }
        /* Dynamic pointer/arrow at the bottom of name tag inheriting the user's inline background color */
        .cm-ySelectionInfo::after, .cm-ySelection-info::after {
          content: "" !important;
          position: absolute !important;
          bottom: -3px !important;
          left: 6px !important;
          width: 6px !important;
          height: 6px !important;
          background-color: inherit !important;
          transform: rotate(45deg) !important;
          box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.2) !important;
          z-index: -1 !important;
        }
      ` }} />
    </>
  );
}

/**
 * Raw CodeMirror 6 editor whose document IS the shared Y.Text. yCollab
 * handles bidirectional sync — local edits land in yText (and thus reach
 * peers), and remote edits land in this view automatically.
 *
 * `yText` is a top-level shared type from `yDoc.getText(path)`, so it
 * starts empty and gets populated by either the local seed (interviewer)
 * or remote sync (candidate). yCollab applies those updates to the view
 * as soon as they arrive.
 */
function CollabCodeMirror({
  yText,
  provider,
  path,
  isDark,
}: {
  yText: Y.Text;
  provider: WebrtcProvider | null;
  path: string;
  isDark: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!hostRef.current || !provider) return;

    const themeExt = isDark ? [oneDark] : [];

    const state = EditorState.create({
      doc: yText.toString(),
      extensions: [
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        history(),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        javascript({ jsx: true, typescript: /\.tsx?$/.test(path) }),
        ...themeExt,
        // ── The crucial binding ─────────────────────────────────
        // yText IS the editor doc. No Sandpack layer fighting us for
        // ownership, so local edits flow into yText (→ peers) and
        // remote edits flow into the view automatically.
        yCollab(yText, provider.awareness),
        EditorView.theme({
          "&": { height: "100%", background: "transparent" },
          ".cm-scroller": {
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: "13px",
            lineHeight: "1.6",
          },
          ".cm-gutters": {
            background: "transparent",
            borderRight: isDark
              ? "1px solid rgba(255,255,255,0.07)"
              : "1px solid rgba(0,0,0,0.08)",
          },
          ".cm-activeLineGutter": {
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [provider, yText, isDark, path]);

  return <div ref={hostRef} className="absolute inset-0 overflow-auto" />;
}
