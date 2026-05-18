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
import randomColor from "randomcolor";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Clock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  Users,
  Radio,
  Wifi,
  Sparkles,
  Smartphone,
  FlaskConical,
  ChevronUp,
  ChevronDown,
  GripHorizontal,
  Terminal,
} from "lucide-react";
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

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSystem?: boolean;
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
  multiplayer = false,
  sim = false,
  isInterviewer = false,
}: {
  challenge: Challenge;
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
  sessionId: string | null;
  multiplayer?: boolean;
  sim?: boolean;
  isInterviewer?: boolean;
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

  // Real-time Multiplayer Workspace States
  const [colleagueActive, setColleagueActive] = useState(sim);
  const [userMicActive, setUserMicActive] = useState(true);
  const [userCamActive, setUserCamActive] = useState(true);
  const [peerDecibels, setPeerDecibels] = useState<number[]>([10, 10, 10, 10, 10]);
  const [inputChat, setInputChat] = useState("");

  // Yjs and WebRTC Real-Time State
  const [yDoc] = useState(() => new Y.Doc());
  const [webrtcProvider, setWebrtcProvider] = useState<WebrtcProvider | null>(null);

  useEffect(() => {
    if (!multiplayer || !sessionId) return;
    
    // Connect to secure WebRTC room
    const roomName = `interviewpad-room-${sessionId}`;
    const provider = new WebrtcProvider(roomName, yDoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });

    // Set awareness (Cursor colors and User tags)
    const username = isInterviewer ? "Interviewer" : "Candidate";
    const color = randomColor({ luminosity: "dark", format: "hex" });
    provider.awareness.setLocalStateField("user", {
      name: username,
      color: color,
      colorLight: color + "80", // 50% opacity
    });

    setWebrtcProvider(provider);

    return () => {
      provider.destroy();
    };
  }, [multiplayer, sessionId, yDoc, sim]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const list: ChatMessage[] = [];
    if (multiplayer) {
      list.push({
        id: "sys_1",
        sender: "System",
        text: "Multiplayer session initialized. Concurrency CRDT code synchronization channel online.",
        time: "Just now",
        isSystem: true,
      });
      if (sim) {
        list.push({
          id: "sys_2",
          sender: "Arvind Nishad (Interviewer)",
          text: "Hi! I'm Arvind. I will be observing your workspace and providing structural hints here as you type. Let me know when you are ready to write code!",
          time: "Just now",
        });
      }
    }
    return list;
  });

  // Animated colleague audio decibels loop when speaking
  useEffect(() => {
    if (!multiplayer || !colleagueActive) return;
    const interval = setInterval(() => {
      // Simulate speaking activity with random decibel indicators
      setPeerDecibels(Array.from({ length: 5 }, () => Math.floor(Math.random() * 50) + 5));
    }, 180);
    return () => clearInterval(interval);
  }, [multiplayer, colleagueActive]);

  // Simulated Interviewer Active Feedback Loop
  const hintCounterRef = useRef(0);
  useEffect(() => {
    if (!multiplayer || !sim) return;

    // Trigger dynamic helpful hints based on chronological timers to mimic active code observation
    const timer1 = setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `hint_${Date.now()}`,
          sender: "Arvind Nishad (Interviewer)",
          text: "🔍 Tip: Make sure to review basic input constraints first. Validating standard null/empty states now will avoid unit test failures later!",
          time: "Just now",
        }
      ]);
      toast.info("New message from Interviewer", { description: "Review tips in the sidebar chat." });
    }, 12000);

    const timer2 = setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `hint_${Date.now()}`,
          sender: "Arvind Nishad (Interviewer)",
          text: "💡 Optimization Hint: We are looking for an O(N) linear time complexity implementation here. Try to achieve it without using nested loop counts if possible!",
          time: "Just now",
        }
      ]);
      toast.info("Interviewer posted a hint", { description: "Check code time complexity target." });
    }, 32000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [multiplayer, sim]);

  // Test state
  const [testRun, setTestRun] = useState<{
    passed: number;
    total: number;
    tests: FlatTest[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"passed" | "failed" | null>(null);

  // Bottom Tests drawer: collapsed by default, drag-to-resize when open.
  const [testsOpen, setTestsOpen] = useState(false);
  const [testsHeightPct, setTestsHeightPct] = useState(45);
  const [drawerTab, setDrawerTab] = useState<"tests" | "console">("tests");

  // Live console: captures console.log messages from every Sandpack iframe
  // (preview AND tests client) via window postMessage. Lives at this level so
  // it captures output regardless of which tab is open or even before the
  // user has expanded the drawer.
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([]);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as
        | { type?: string; codesandbox?: boolean; log?: unknown }
        | null;
      if (!data || data.type !== "console" || !data.codesandbox) return;
      const items = Array.isArray(data.log) ? data.log : [data.log];
      setLiveLogs((prev) => {
        const next = [...prev];
        for (const raw of items) {
          const item = raw as { id?: string; method?: string; data?: unknown[] };
          if (item?.method === "clear") {
            next.length = 0;
            continue;
          }
          next.push({
            id: item?.id ?? `${Date.now()}-${Math.random()}`,
            method: item?.method ?? "log",
            data: Array.isArray(item?.data) ? item.data : [],
            ts: Date.now(),
          });
        }
        return next.length > 300 ? next.slice(next.length - 300) : next;
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  const clearLiveLogs = () => setLiveLogs([]);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const pane = editorPaneRef.current;
      if (!pane) return;
      const rect = pane.getBoundingClientRect();
      const fromBottom = rect.bottom - e.clientY;
      const pct = (fromBottom / rect.height) * 100;
      setTestsHeightPct(Math.max(20, Math.min(80, pct)));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function startDragTests(e: React.MouseEvent) {
    if (!testsOpen) return;
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }

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
    [starterFiles, visibleFiles],
  );

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
    // Defer state update — SandpackTests can invoke this synchronously during
    // its own render, which would otherwise trigger React's "setState during
    // render of another component" warning.
    queueMicrotask(() => {
      setTestRun({ passed, total: flat.length, tests: flat });
    });

    // Interactive simulated interviewer reaction to test runs
    if (multiplayer && sim) {
      setTimeout(() => {
        const passRate = flat.length > 0 ? passed / flat.length : 0;
        let responseText = "";
        if (passRate === 1) {
          responseText = "🎉 Fantastic! All unit tests passed on your first run. The structural flow is completely sound. Go ahead and submit your solution!";
        } else if (passRate > 0.5) {
          responseText = "⚡ Good progress. Most tests are passing, but you have a couple of failing cases. Check the stack traces on the right to squash the remaining edge bugs.";
        } else {
          responseText = "🔧 No worries! That's what mock playground rounds are for. Walk me through your design plan and we can fix the logical issues together.";
        }
        setChatMessages((prev) => [
          ...prev,
          {
            id: `test_reaction_${Date.now()}`,
            sender: "Arvind Nishad (Interviewer)",
            text: responseText,
            time: "Just now"
          }
        ]);
      }, 1000);
    }
  }

  async function handleSubmit() {
    setTestsOpen(true);
    setDrawerTab("tests");
    if (!testRun) {
      toast.error("Run the tests first.");
      return;
    }
    setSubmitting(true);
    try {
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

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!inputChat.trim()) return;

    const userMsg: ChatMessage = {
      id: `chat_${Date.now()}`,
      sender: "You (Candidate)",
      text: inputChat.trim(),
      time: "Just now",
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputChat("");

    // Simulate interviewer immediate vocal/chat feedback
    if (sim && colleagueActive) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `reply_${Date.now()}`,
            sender: "Arvind Nishad (Interviewer)",
            text: "Got it! Your logic here looks clear. Let's make sure it handles high volumetric payloads efficiently.",
            time: "Just now",
          }
        ]);
      }, 1500);
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

        {/* Presence Indicator Overlay */}
        {multiplayer && (
          <div className="hidden sm:flex items-center gap-1.5 bg-bg border border-border px-2.5 py-1 rounded-full shadow-sm">
            <div className="flex -space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-accent border border-bg flex items-center justify-center text-[8px] font-black text-bg" title="You (Candidate)">
                C
              </div>
              {colleagueActive && (
                <div className="w-5 h-5 rounded-full bg-violet-500 border border-bg flex items-center justify-center text-[8px] font-black text-white" title="Arvind (Interviewer)">
                  A
                </div>
              )}
            </div>
            <span className="text-[9px] font-black uppercase text-muted tracking-wider">
              {colleagueActive ? "2 Developers Online" : "Solo Practice Lobby"}
            </span>
          </div>
        )}

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
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(var(--accent-rgb),0.2)]"
              title={!testRun ? "Tests will open below — run them first" : "Submit attempt"}
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
              className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5"
              title="Try again"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </header>

      {/* Body: Responsive grid panes */}
      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* Description */}
        <aside className={`${multiplayer ? "col-span-12 md:col-span-3 lg:col-span-2.5" : "col-span-12 md:col-span-4 lg:col-span-3"} overflow-y-auto border-r border-border bg-bg p-5`}>
          <ChallengeDescription markdown={challenge.description} />
        </aside>

        {/* Editor + Tests (bottom drawer) via Sandpack */}
        <div className={`${multiplayer ? "col-span-12 md:col-span-6 lg:col-span-6.5" : "col-span-12 md:col-span-8 lg:col-span-9"} min-h-0`}>
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
            <FilesTracker filesRef={filesRef} />
            <div ref={editorPaneRef} className="flex flex-col h-full">
              {/* Editor — fills remaining space */}
              <div className="flex-1 min-h-0">
                {multiplayer ? (
                  <SyncingEditor yDoc={yDoc} provider={webrtcProvider} />
                ) : (
                  <SandpackCodeEditor
                    showLineNumbers
                    showTabs
                    closableTabs={false}
                    wrapContent
                    extensions={[javascript({ jsx: true, typescript: true })]}
                    style={{ height: "100%" }}
                  />
                )}
              </div>

              {/* Tests drawer — collapsed by default, drag-to-resize when open */}
              <div
                className="shrink-0 border-t border-border bg-bg flex flex-col overflow-hidden"
                style={{ height: testsOpen ? `${testsHeightPct}%` : "36px" }}
              >
                {testsOpen && (
                  <div
                    onMouseDown={startDragTests}
                    className="h-1.5 cursor-ns-resize bg-border/40 hover:bg-accent/40 transition shrink-0 group flex items-center justify-center"
                    title="Drag to resize"
                  >
                    <GripHorizontal className="w-3 h-3 text-muted/50 group-hover:text-accent transition" />
                  </div>
                )}
                <div className="h-9 shrink-0 flex items-center justify-between gap-2 pl-2 pr-3 border-b border-border/40 bg-surface/30">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!testsOpen) setTestsOpen(true);
                        setDrawerTab("tests");
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition ${
                        testsOpen && drawerTab === "tests"
                          ? "bg-bg text-fg shadow-sm border border-border"
                          : "text-muted hover:text-fg hover:bg-surface"
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-accent" />
                      Tests
                      {testRun && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums normal-case tracking-normal ${
                            testRun.passed === testRun.total
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-rose-500/15 text-rose-500"
                          }`}
                        >
                          {testRun.passed}/{testRun.total}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!testsOpen) setTestsOpen(true);
                        setDrawerTab("console");
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition ${
                        testsOpen && drawerTab === "console"
                          ? "bg-bg text-fg shadow-sm border border-border"
                          : "text-muted hover:text-fg hover:bg-surface"
                      }`}
                      title="See console.log output from your code when tests run"
                    >
                      <Terminal className="w-3.5 h-3.5 text-accent" />
                      Console
                    </button>
                    {!testsOpen && (
                      <span className="ml-2 text-[10px] font-bold text-muted/60 normal-case tracking-normal">
                        Click a tab to expand
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestsOpen((v) => !v)}
                    className="p-1 rounded-md text-muted hover:text-fg hover:bg-surface transition"
                    title={testsOpen ? "Collapse" : "Expand"}
                    aria-label={testsOpen ? "Collapse panel" : "Expand panel"}
                  >
                    {testsOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  {drawerTab === "tests" ? (
                    <SandpackTests
                      onComplete={handleTestsComplete}
                      showVerboseButton
                      showWatchButton
                      style={{ height: "100%" }}
                    />
                  ) : (
                    <LiveConsole />
                  )}
                </div>
              </div>
            </div>
          </SandpackProvider>
        </div>

        {/* Multiplayer Video Audio Calling & Chat Sidebar */}
        {multiplayer && (
          <aside className="col-span-12 md:col-span-3 lg:col-span-3 border-l border-border bg-bg flex flex-col min-h-0 justify-between">
            {/* Colleague Active Media Stream Frame */}
            <div className="p-4 border-b border-border space-y-3 shrink-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted flex items-center justify-between">
                <span>Interviewer Stream</span>
                <span className="flex items-center gap-1 text-[9px] text-accent normal-case">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-accent" />
                  Live WebRTC Link
                </span>
              </div>

              {colleagueActive ? (
                <div className="rounded-xl border border-border bg-surface relative overflow-hidden aspect-video flex flex-col justify-end p-3">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-accent/5 flex items-center justify-center">
                    <div className="text-center space-y-1.5">
                      <div className="w-11 h-11 rounded-full bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-500 font-black text-sm relative mx-auto">
                        AN
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border border-surface" />
                      </div>
                      <div className="text-[10px] font-bold text-fg/80">Arvind Nishad</div>
                    </div>
                  </div>

                  {/* Decibel meters */}
                  <div className="absolute bottom-3 left-3 flex items-end gap-0.5 h-4">
                    {peerDecibels.map((db, idx) => (
                      <div 
                        key={idx} 
                        style={{ height: `${db}%` }} 
                        className="w-[3px] rounded-full bg-violet-500 transition-all duration-150" 
                      />
                    ))}
                  </div>

                  <div className="absolute top-2.5 right-2.5 bg-black/40 text-white rounded-full px-2 py-0.5 text-[8px] font-mono flex items-center gap-0.5">
                    <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                    12ms
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface/40 flex flex-col items-center justify-center p-4 text-center gap-1.5 aspect-video">
                  <Users className="w-6 h-6 text-muted/50" />
                  <div className="text-[10px] font-bold text-muted">Interviewer not in call</div>
                  <button 
                    onClick={() => setColleagueActive(true)}
                    className="px-2.5 py-1 rounded bg-accent/15 text-accent text-[9px] font-black uppercase hover:bg-accent/25 transition mt-1"
                  >
                    Simulate Colleague Join
                  </button>
                </div>
              )}
            </div>

            {/* Glassmorphic Real-time Chat Feed */}
            <div className="flex-1 flex flex-col min-h-0 bg-surface/20">
              <div className="px-4 py-2 border-b border-border text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1 shrink-0">
                <MessageSquare className="w-3 h-3 text-accent" />
                Collaborator hint stream
              </div>

              {/* Chat Container scroll block */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {chatMessages.map((msg) => {
                  const isUser = msg.sender.startsWith("You");
                  return (
                    <div key={msg.id} className={`space-y-0.5 ${isUser ? "text-right" : ""}`}>
                      <div className="text-[8px] font-black text-muted/70 tracking-wide uppercase">
                        {msg.sender}
                      </div>
                      <div className={`inline-block max-w-[90%] rounded-xl p-2.5 text-xs text-left leading-relaxed ${
                        msg.isSystem
                          ? "bg-muted/10 border border-border text-muted font-mono text-[10px]"
                          : isUser
                            ? "bg-accent text-bg font-semibold shadow-sm rounded-tr-none"
                            : "bg-surface border border-border text-fg/90 shadow-sm rounded-tl-none border-l-2 border-l-violet-500"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Form submission bottom */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-border bg-bg flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={inputChat}
                  onChange={(e) => setInputChat(e.target.value)}
                  placeholder="Ask for feedback or hints..."
                  className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="w-8 h-8 rounded-lg bg-accent text-bg hover:bg-accent-soft flex items-center justify-center shrink-0 shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

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

// SandpackConsole only subscribes to clients that exist when it mounts, so it
// misses logs from the tests client (which Sandpack registers later for the
// Jest worker). We listen on window postMessage instead to catch console
// output from every Sandpack iframe — preview, tests, anything.
type LiveLog = { id: string; method: string; data: unknown[]; ts: number };

function LiveConsole() {
  const [logs, setLogs] = useState<LiveLog[]>([]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as
        | { type?: string; codesandbox?: boolean; log?: unknown }
        | null;
      if (!data || data.type !== "console" || !data.codesandbox) return;
      const items = Array.isArray(data.log) ? data.log : [data.log];
      setLogs((prev) => {
        const next = [...prev];
        for (const raw of items) {
          const item = raw as { id?: string; method?: string; data?: unknown[] };
          if (item?.method === "clear") {
            next.length = 0;
            continue;
          }
          next.push({
            id: item?.id ?? `${Date.now()}-${Math.random()}`,
            method: item?.method ?? "log",
            data: Array.isArray(item?.data) ? item.data : [],
            ts: Date.now(),
          });
        }
        // Cap to keep the list snappy
        return next.length > 300 ? next.slice(next.length - 300) : next;
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
      <div className="px-3 py-1.5 border-b border-border/40 shrink-0 flex items-center justify-between text-[10px] text-muted/70">
        <span>
          {logs.length === 0
            ? "console output appears here"
            : `${logs.length} message${logs.length === 1 ? "" : "s"}`}
        </span>
        <button
          type="button"
          onClick={() => setLogs([])}
          disabled={logs.length === 0}
          className="px-2 py-0.5 rounded hover:bg-surface text-muted hover:text-fg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-muted/50 text-center py-8 text-[11px] leading-relaxed px-4">
            Add <code className="px-1 py-0.5 rounded bg-surface/60 text-fg/80">console.log(...)</code> in your code, then run the tests.
            <br />
            Output from every test invocation will appear here.
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

function SyncingEditor({
  yDoc,
  provider,
}: {
  yDoc: Y.Doc;
  provider: WebrtcProvider | null;
}) {
  const { sandpack } = useSandpack();
  const { activeFile } = sandpack;
  const activeCode = sandpack.files[activeFile]?.code ?? "";

  // Insert initial code into Y.Text if it is empty.
  // Using a ref to prevent looping during rapid peer sync
  const initializedRef = useRef<Record<string, boolean>>({});
  
  useEffect(() => {
    if (!activeFile) return;
    const yText = yDoc.getText(activeFile);
    
    // If the doc is entirely empty and hasn't been initialized locally
    if (yText.length === 0 && !initializedRef.current[activeFile]) {
      yDoc.transact(() => {
        yText.insert(0, activeCode);
      });
      initializedRef.current[activeFile] = true;
    }
  }, [activeFile, yDoc, activeCode]);

  const extensions = useMemo(() => {
    const exts: any[] = [javascript({ jsx: true, typescript: true })];
    if (provider) {
      const yText = yDoc.getText(activeFile);
      exts.push(yCollab(yText, provider.awareness));
    }
    return exts;
  }, [provider, activeFile, yDoc]);

  return (
    <SandpackCodeEditor
      key={activeFile} // Force remount if file changes to fully re-bind yCollab to new Y.Text
      showLineNumbers
      showTabs
      closableTabs={false}
      wrapContent
      extensions={extensions}
      style={{ height: "100%" }}
    />
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
