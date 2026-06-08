"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackTests,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
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
  CheckCircle2,
  XCircle,
  Send,
  RotateCcw,
  Clock,
  FlaskConical,
  Terminal,
  Play,
  Monitor,
  PanelBottom,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ChallengeDescription from "../../ChallengeDescription";
import SessionTimer from "@/components/SessionTimer";
import FileExplorer from "@/components/FileExplorer";
import ThemeToggle from "@/components/ThemeToggle";
import { getSignalingUrls } from "@/lib/signaling";
import { challengeSurface } from "@/lib/templates";
import { getSandpackTheme } from "@/lib/sandpack-theme";
import { describeExecution } from "@/lib/exec-result";
import { useResizable } from "@/hooks/useResizable";
import { useResizableHeight } from "@/hooks/useResizableHeight";

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

function extractDefaultExpression(starterFiles: Record<string, string>): string {
  const code = starterFiles["/index.ts"] || "";
  if (code.includes("fizzBuzz")) {
    return "fizzBuzz(5)";
  }
  if (code.includes("twoSum")) {
    return "twoSum([2, 7, 11, 15], 9)";
  }
  if (code.includes("debounce")) {
    return `// Debounce template
const log = debounce((val) => console.log(val), 100);
log('hello');
log('world');`;
  }
  if (code.includes("flatten")) {
    return "flatten([1, [2, [3, [4]], 5]])";
  }
  if (code.includes("reverseList")) {
    return `// Reverse List template
const head = new ListNode(1, new ListNode(2, new ListNode(3)));
const rev = reverseList(head);
console.log(JSON.stringify(rev));`;
  }
  
  // Generic fallback: regex match for exported function or class
  const funcMatch = code.match(/(?:export\s+)?function\s+(\w+)/);
  if (funcMatch && funcMatch[1]) {
    return `${funcMatch[1]}()`;
  }
  const classMatch = code.match(/(?:export\s+)?class\s+(\w+)/);
  if (classMatch && classMatch[1]) {
    return `new ${classMatch[1]}()`;
  }
  return "";
}

function generateStarterCode(language: string, originalCode: string): string {
  const isFizzBuzz = originalCode.includes("fizzBuzz");
  const isTwoSum = originalCode.includes("twoSum");
  const isDebounce = originalCode.includes("debounce");
  const isFlatten = originalCode.includes("flatten");
  const isReverseList = originalCode.includes("reverseList");

  switch (language) {
    case "python":
      if (isTwoSum) {
        return `def twoSum(nums, target):\n    # Write your Python solution here\n    # Example: return [0, 1]\n    pass\n\n# Test the solution\nprint(twoSum([2, 7, 11, 15], 9))\n`;
      }
      if (isFizzBuzz) {
        return `def fizzBuzz(n):\n    # Write your Python solution here\n    # Return a list of strings\n    pass\n\n# Test the solution\nprint(fizzBuzz(15))\n`;
      }
      return `def solve():\n    # Write your Python solution here\n    print("Hello from Python solve!")\n\nsolve()\n`;

    case "go":
      if (isTwoSum) {
        return `package main\n\nimport "fmt"\n\nfunc twoSum(nums []int, target int) []int {\n    // Write your Go solution here\n    return []int{0, 0}\n}\n\nfunc main() {\n    fmt.Println(twoSum([]int{2, 7, 11, 15}, 9))\n}\n`;
      }
      if (isFizzBuzz) {
        return `package main\n\nimport "fmt"\n\nfunc fizzBuzz(n int) []string {\n    // Write your Go solution here\n    return nil\n}\n\nfunc main() {\n    fmt.Println(fizzBuzz(15))\n}\n`;
      }
      return `package main\n\nimport "fmt"\n\nfunc solve() {\n    fmt.Println("Hello from Go solve!")\n}\n\nfunc main() {\n    solve()\n}\n`;

    case "java":
      if (isTwoSum) {
        return `import java.util.Arrays;\n\npublic class Main {\n    public static int[] twoSum(int[] nums, int target) {\n        // Write your Java solution here\n        return new int[]{0, 0};\n    }\n\n    public static void main(String[] args) {\n        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9)));\n    }\n}\n`;
      }
      if (isFizzBuzz) {
        return `import java.util.List;\nimport java.util.ArrayList;\n\npublic class Main {\n    public static List<String> fizzBuzz(int n) {\n        // Write your Java solution here\n        return new ArrayList<>();\n    }\n\n    public static void main(String[] args) {\n        System.out.println(fizzBuzz(15));\n    }\n}\n`;
      }
      return `public class Main {\n    public static void solve() {\n        System.out.println("Hello from Java solve!");\n    }\n\n    public static void main(String[] args) {\n        solve();\n    }\n}\n`;

    case "cpp":
      if (isTwoSum) {
        return `#include <iostream>\n#include <vector>\n\nstd::vector<int> twoSum(std::vector<int>& nums, int target) {\n    // Write your C++ solution here\n    return {0, 0};\n}\n\nint main() {\n    std::vector<int> nums = {2, 7, 11, 15};\n    auto res = twoSum(nums, 9);\n    std::cout << "[" << res[0] << ", " << res[1] << "]" << std::endl;\n    return 0;\n}\n`;
      }
      if (isFizzBuzz) {
        return `#include <iostream>\n#include <vector>\n#include <string>\n\nstd::vector<std::string> fizzBuzz(int n) {\n    // Write your C++ solution here\n    return {};\n}\n\nint main() {\n    auto res = fizzBuzz(15);\n    for (const auto& s : res) {\n        std::cout << s << " ";\n    }\n    std::cout << std::endl;\n    return 0;\n}\n`;
      }
      return `#include <iostream>\n\nvoid solve() {\n    std::cout << "Hello from C++ solve!" << std::endl;\n}\n\nint main() {\n    solve();\n    return 0;\n}\n`;

    case "rust":
      if (isTwoSum) {
        return `fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {\n    // Write your Rust solution here\n    vec![0, 0]\n}\n\nfn main() {\n    println!("{:?}", two_sum(vec![2, 7, 11, 15], 9));\n}\n`;
      }
      if (isFizzBuzz) {
        return `fn fizz_buzz(n: i32) -> Vec<String> {\n    // Write your Rust solution here\n    vec![]\n}\n\nfn main() {\n    println!("{:?}", fizz_buzz(15));\n}\n`;
      }
      return `fn solve() {\n    println!("Hello from Rust solve!");\n}\n\nfn main() {\n    solve();\n}\n`;

    default:
      return originalCode;
  }
}

function CompetitorLanguageSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  const options = [
    { value: "typescript", label: "TypeScript", pct: "31%", avg: "96", color: "bg-blue-400" },
    { value: "javascript", label: "JavaScript", pct: "42%", avg: "94", color: "bg-yellow-400" },
    { value: "python", label: "Python", pct: "18%", avg: "91", color: "bg-indigo-400" },
    { value: "go", label: "Go", pct: "5%", avg: "89", color: "bg-cyan-400" },
    { value: "java", label: "Java", pct: "3%", avg: "87", color: "bg-orange-400" },
    { value: "cpp", label: "C++", pct: "1%", avg: "95", color: "bg-indigo-500" },
    { value: "rust", label: "Rust", pct: "0.5%", avg: "98", color: "bg-red-500" },
  ];

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-fg transition shadow-sm"
      >
        <span className={`w-2 h-2 rounded-full ${selected.color}`} />
        <span className="whitespace-nowrap">{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-64 py-1.5 rounded-xl z-[100] animate-in fade-in slide-in-from-top-1 duration-150 border border-border shadow-2xl bg-panel"
          style={{
            boxShadow: "0 16px 48px rgba(0,0,0,0.15), 0 0 0 1px var(--border) inset"
          }}
        >
          <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted/40 border-b border-border/60 mb-1.5 flex justify-between select-none">
            <span>Competitor Support</span>
            <span>Avg Score</span>
          </div>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-[11px] transition-all duration-100 ${
                opt.value === value
                  ? "text-accent bg-accent/10"
                  : "text-muted hover:text-fg hover:bg-elevated"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${opt.color}`} />
                <span className="font-semibold">{opt.label}</span>
                <span className="text-[9px] text-muted/60">({opt.pct})</span>
              </div>
              <span className="font-mono text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-muted font-bold">{opt.avg}/100</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChallengeAttemptClient({
  challenge,
  starterFiles,
  testFiles,
  testCasesJson = "[]",
  stepId,
  takeHomeStartedAtIso,
  takeHomeTimeLimitMin,
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
  testCasesJson?: string;
  stepId: string;
  takeHomeStartedAtIso?: string;
  takeHomeTimeLimitMin?: number;
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

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (challenge.template.includes("py") || challenge.template.includes("python")) return "python";
    if (challenge.template.includes("go")) return "go";
    if (challenge.template.includes("java")) return "java";
    if (challenge.template.includes("cpp")) return "cpp";
    if (challenge.template.includes("rust")) return "rust";
    if (challenge.template.includes("js") || challenge.template.includes("javascript")) return "javascript";
    return "typescript";
  });

  const currentTemplate = ["python", "go", "java", "cpp", "rust"].includes(selectedLanguage)
    ? "vanilla"
    : challenge.template;

  // Which surface to render: "dsa" (Console + Tests, auto-graded) vs
  // "frontend" (live Preview + file tree, submitted for manual review).
  const isFrontend = challengeSurface(challenge.template) === "frontend";
  // Frontend file tree can collapse to an icon-only rail to free up editor room.
  const [fileTreeCollapsed, setFileTreeCollapsed] = useState(false);
  // Drag-resizable panels (frontend surface): editor-area width + console height.
  const { width: editorW, onPointerDown: onEditorDrag, setWidth: setEditorW } = useResizable(520, 280, 2000);
  const { height: consoleH, onPointerDown: onConsoleDrag, setHeight: setConsoleH } = useResizableHeight(180, 80, 900);
  // Output view: preview only / split / console only.
  const [outputView, setOutputView] = useState<"preview" | "both" | "console">("both");
  // Default the splits to code↔output = 50/50 and preview↔console = 70/30, and
  // keep that ratio as the layout settles / the window resizes — until the user
  // drags a handle, which locks in their chosen sizes (userResizedRef).
  const splitRowRef = useRef<HTMLDivElement | null>(null);
  const outputPaneRef = useRef<HTMLElement | null>(null);
  const userResizedRef = useRef(false);
  useEffect(() => {
    if (!mounted || !isFrontend) return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) return;
    const recompute = () => {
      if (userResizedRef.current) return;
      const splitW = splitRowRef.current?.clientWidth ?? 0;
      const outH = outputPaneRef.current?.clientHeight ?? 0;
      // Code editor = 60% of the post-description region (minus the ~6px handle).
      if (splitW > 0) setEditorW(Math.round((splitW - 6) * 0.6));
      // Console = 30% of the output area below its header (~40px) + handle (~6px).
      if (outH > 0) setConsoleH(Math.max(80, Math.round((outH - 46) * 0.3)));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (splitRowRef.current) ro.observe(splitRowRef.current);
    if (outputPaneRef.current) ro.observe(outputPaneRef.current);
    return () => ro.disconnect();
  }, [mounted, isFrontend, setEditorW, setConsoleH]);
  // Exit-assessment flow.
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  function handleExit() {
    if (isTakeHome) {
      // Timer keeps running — confirm before leaving.
      setExitConfirmOpen(true);
    } else if (sessionId) {
      window.location.href = `/interview/${sessionId}`;
    } else {
      window.location.href = `/challenges/${challenge.slug}`;
    }
  }

  // Custom Expression run state
  const initialCustomExpr = useMemo(() => {
    return extractDefaultExpression(starterFiles);
  }, [starterFiles]);

  const [customExpression, setCustomExpression] = useState(() => {
    if (typeof window !== "undefined") {
      const key = `${sessionId || challenge.slug}:custom_expression`;
      try {
        const stored = sessionStorage.getItem(key);
        if (stored !== null) return stored;
      } catch (e) {
        console.warn("Failed to load customExpression from sessionStorage", e);
      }
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = `${sessionId || challenge.slug}:custom_expression`;
      const stored = sessionStorage.getItem(key);
      if (stored === null) {
        setCustomExpression(initialCustomExpr);
      }
    } else {
      setCustomExpression(initialCustomExpr);
    }
  }, [initialCustomExpr, sessionId, challenge.slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${sessionId || challenge.slug}:custom_expression`;
    sessionStorage.setItem(key, customExpression);
  }, [customExpression, sessionId, challenge.slug]);

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
      signaling: getSignalingUrls(),
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
  } | null>(() => {
    if (typeof window !== "undefined") {
      const key = `${sessionId || challenge.slug}:test_run`;
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn("Failed to load testRun from sessionStorage", e);
      }
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${sessionId || challenge.slug}:test_run`;
    if (testRun) {
      sessionStorage.setItem(key, JSON.stringify(testRun));
    } else {
      sessionStorage.removeItem(key);
    }
  }, [testRun, sessionId, challenge.slug]);

  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"passed" | "failed" | "submitted" | null>(null);

  // Tabbed sidebar state (Console or Tests)
  const [sidebarTab, setSidebarTab] = useState<"console" | "tests">(() => {
    if (typeof window !== "undefined") {
      const key = `${sessionId || challenge.slug}:sidebar_tab`;
      try {
        const stored = sessionStorage.getItem(key);
        if (stored === "console" || stored === "tests") return stored as "console" | "tests";
      } catch (e) {
        console.warn("Failed to load sidebarTab from sessionStorage", e);
      }
    }
    return "console";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${sessionId || challenge.slug}:sidebar_tab`;
    sessionStorage.setItem(key, sidebarTab);
  }, [sidebarTab, sessionId, challenge.slug]);

  // Live console logs
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>(() => {
    if (typeof window !== "undefined") {
      const key = `${sessionId || challenge.slug}:console_logs`;
      try {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn("Failed to parse console logs from sessionStorage", e);
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = `${sessionId || challenge.slug}:console_logs`;
      try {
        if (liveLogs.length === 0) {
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, JSON.stringify(liveLogs));
        }
      } catch (e) {
        console.warn("Failed to save console logs to sessionStorage", e);
      }
    }
  }, [liveLogs, sessionId, challenge.slug]);

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
      const data = e.data as any;
      if (!data) return;

      if (data.type === "execution-complete") {
        if (jsStartRef.current) {
          const t1 = performance.now();
          const memAfter = (performance as any).memory?.usedJSHeapSize || null;
          const durationMs = t1 - jsStartRef.current.t0;
          const memoryUsedBytes = memAfter && jsStartRef.current.memBefore 
            ? Math.max(0, memAfter - jsStartRef.current.memBefore) 
            : null;
          
          pending.push({
            kind: "log",
            item: {
              id: `profile-${Date.now()}-${Math.random()}`,
              method: "profile",
              data: [{ durationMs, memoryBytes: memoryUsedBytes }],
              ts: Date.now(),
            }
          });
          jsStartRef.current = null;
        }
        if (rafId === null) rafId = requestAnimationFrame(flush);
        return;
      }

      if (data.type !== "console" || !data.codesandbox) return;
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

  // B2B Take-Home Countdown Timer & Auto-Submit
  const [extendedMinutes, setExtendedMinutes] = useState(0);
  const isTakeHome = !!takeHomeStartedAtIso && !!takeHomeTimeLimitMin;
  const takeHomeStartMs = useMemo(() => takeHomeStartedAtIso ? new Date(takeHomeStartedAtIso).getTime() : Date.now(), [takeHomeStartedAtIso]);
  const takeHomeDurationMs = useMemo(() => ((takeHomeTimeLimitMin || 60) + extendedMinutes) * 60 * 1000, [takeHomeTimeLimitMin, extendedMinutes]);

  const [remainingTakeHomeSec, setRemainingTakeHomeSec] = useState(() => {
    if (!isTakeHome) return 0;
    const elapsed = Date.now() - takeHomeStartMs;
    return Math.max(0, Math.floor((takeHomeDurationMs - elapsed) / 1000));
  });

  const handleExtendTakeHomeTime = () => {
    setExtendedMinutes((prev) => {
      const next = prev + 15;
      const newDurationMs = ((takeHomeTimeLimitMin || 60) + next) * 60 * 1000;
      const elapsed = Date.now() - takeHomeStartMs;
      const newRemaining = Math.max(0, Math.floor((newDurationMs - elapsed) / 1000));
      setRemainingTakeHomeSec(newRemaining);
      return next;
    });
    toast.success("Added 15 minutes to your take-home session!");
  };

  async function handleAutoSubmitOnTimeExpiration() {
    toast.error("Time has expired!", {
      description: "Auto-submitting your code and locking your workspace...",
    });
    setSubmitting(true);
    try {
      const submittedFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(filesRef.current)) {
        if (testFiles[path]) continue;
        const code = typeof file === "string" ? file : (file as { code: string }).code;
        submittedFiles[path] = path === "/index.ts" ? stripDebugBlock(code) : code;
      }
      const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || undefined : undefined;
      const res = await fetch(`/api/challenges/${challenge.slug}/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: submittedFiles,
          testResults: testRun || { passed: 0, total: 0, tests: [] },
          durationSec: elapsedSec,
          sessionId,
          stepId,
          token,
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      toast.success("Assessment locked successfully.");
      window.location.reload();
    } catch (err) {
      console.error("Auto-submission failed:", err);
      window.location.reload();
    }
  }

  useEffect(() => {
    if (!isTakeHome) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - takeHomeStartMs;
      const remaining = Math.max(0, Math.floor((takeHomeDurationMs - elapsed) / 1000));
      setRemainingTakeHomeSec(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        handleAutoSubmitOnTimeExpiration();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isTakeHome, takeHomeStartMs, takeHomeDurationMs]);

  // ── B2B Candidate Telemetry & Integrity Recording ───────────────────
  const eventsBufferRef = useRef<Array<{ t: number; type: "snapshot" | "blur" | "focus" | "paste" | "keystroke"; payload: any }>>([]);
  const telemetryStartMsRef = useRef<number>(Date.now());
  const prevSnapshotFilesRef = useRef<string>("");

  const logTelemetryEvent = useCallback((type: "snapshot" | "blur" | "focus" | "paste" | "keystroke", payload: any) => {
    const elapsedMs = Date.now() - telemetryStartMsRef.current;
    eventsBufferRef.current.push({ t: elapsedMs, type, payload });
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      logTelemetryEvent("blur", { timestamp: Date.now() });
    };
    const handleFocus = () => {
      logTelemetryEvent("focus", { timestamp: Date.now() });
    };
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") || "";
      logTelemetryEvent("paste", {
        timestamp: Date.now(),
        length: text.length,
        snippet: text.substring(0, 100),
      });
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // Capture key timings for alphanumeric, backspace, delete, and punctuation
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
        logTelemetryEvent("keystroke", {
          timestamp: Date.now(),
          key: e.key.length === 1 ? "alphanumeric" : e.key,
        });
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [logTelemetryEvent]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (eventsBufferRef.current.length === 0) return;
      const toFlush = [...eventsBufferRef.current];
      eventsBufferRef.current = [];

      const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || undefined : undefined;

      try {
        const res = await fetch(`/api/challenges/${challenge.slug}/telemetry`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            events: toFlush,
            token,
          }),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("Failed to flush candidate telemetry:", err);
        eventsBufferRef.current = [...toFlush, ...eventsBufferRef.current];
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [challenge.slug]);

  const visualTestCases = useMemo(() => {
    try {
      return JSON.parse(testCasesJson) as {
        id: string;
        name: string;
        input: string;
        expected: string;
        isHidden: boolean;
        weight: number;
      }[];
    } catch {
      return [];
    }
  }, [testCasesJson]);

  // Compose Sandpack files: starter (editable) + tests (hidden)
  const files: SandpackFiles = useMemo(() => {
    if (["python", "go", "java", "cpp", "rust"].includes(selectedLanguage)) {
      const originalCode = starterFiles["/index.ts"] || starterFiles["/index.js"] || Object.values(starterFiles)[0] || "";
      const starterCode = generateStarterCode(selectedLanguage, originalCode);
      
      let entryFile = "/index.py";
      if (selectedLanguage === "go") entryFile = "/main.go";
      else if (selectedLanguage === "java") entryFile = "/Main.java";
      else if (selectedLanguage === "cpp") entryFile = "/main.cpp";
      else if (selectedLanguage === "rust") entryFile = "/main.rs";
      
      return {
        [entryFile]: { code: starterCode },
        "/package.json": { code: JSON.stringify({ main: entryFile, dependencies: {} }), hidden: true },
      };
    }

    const out: SandpackFiles = {};
    for (const [path, code] of Object.entries(starterFiles)) {
      out[path] = { code };
    }

    // Frontend/playground challenges have no hidden test suite — the candidate
    // builds against a live preview and the work is kept for manual review.
    if (isFrontend) return out;

    if (visualTestCases && visualTestCases.length > 0) {
      // Dynamic Jest test case compilation
      const entryPath = starterFiles["/index.ts"] ? "/index.ts" : Object.keys(starterFiles)[0] || "/index.ts";
      const entryModule = entryPath.replace(/\.(ts|js|tsx|jsx)$/, "").replace(/^\//, "./");

      const code = starterFiles[entryPath] || "";
      let fnName = "solve";
      const funcMatch = code.match(/(?:export\s+)?function\s+(\w+)/);
      if (funcMatch && funcMatch[1]) {
        fnName = funcMatch[1];
      }

      let codeLines = [
        `import * as Solution from '${entryModule}';`,
        ``,
        `// Auto-generated B2B visual test grading suite`,
      ];

      visualTestCases.forEach((tc, idx) => {
        codeLines.push(`test(${JSON.stringify(tc.name || `Test Case #${idx + 1}`)}, () => {`);
        codeLines.push(`  const fn = (Solution as any).${fnName} || (Solution as any).default || Solution;`);
        codeLines.push(`  if (typeof fn !== 'function') {`);
        codeLines.push(`    throw new Error('Could not find function "${fnName}" in entry file.');`);
        codeLines.push(`  }`);
        codeLines.push(`  const result = fn(${tc.input});`);
        codeLines.push(`  expect(result).toEqual(${tc.expected});`);
        codeLines.push(`});`);
        codeLines.push(``);
      });

      out["/visual_grader.test.ts"] = { code: codeLines.join("\n"), hidden: true, readOnly: true };
    } else {
      for (const [path, code] of Object.entries(testFiles)) {
        out[path] = { code, hidden: true, readOnly: true };
      }
    }
    return out;
  }, [starterFiles, testFiles, visualTestCases, isFrontend, selectedLanguage]);

  const visibleFiles = useMemo(() => {
    if (selectedLanguage === "python") return ["/index.py"];
    if (selectedLanguage === "go") return ["/main.go"];
    if (selectedLanguage === "java") return ["/Main.java"];
    if (selectedLanguage === "cpp") return ["/main.cpp"];
    if (selectedLanguage === "rust") return ["/main.rs"];
    return Object.keys(starterFiles);
  }, [starterFiles, selectedLanguage]);

  const activeFile = useMemo(() => {
    if (selectedLanguage === "python") return "/index.py";
    if (selectedLanguage === "go") return "/main.go";
    if (selectedLanguage === "java") return "/Main.java";
    if (selectedLanguage === "cpp") return "/main.cpp";
    if (selectedLanguage === "rust") return "/main.rs";
    return starterFiles["/index.ts"]
      ? "/index.ts"
      : starterFiles["/App.js"]
        ? "/App.js"
        : starterFiles["/App.tsx"]
          ? "/App.tsx"
          : visibleFiles[0];
  }, [starterFiles, visibleFiles, selectedLanguage]);

  const filesRef = useRef<SandpackFiles>(files);

  type SandpackBridge = {
    updateFile: (path: string, code: string) => void;
    addFile?: (path: string, code: string) => void;
    files: SandpackFiles;
    activeFile: string;
    runSandpack?: () => void;
    clients?: Record<string, { dispatch?: (msg: unknown) => void } | undefined>;
  };
  const sandpackBridgeRef = useRef<SandpackBridge | null>(null);

  // Sandbox refs
  const sandboxIframeRef = useRef<HTMLIFrameElement | null>(null);
  const jsStartRef = useRef<{ t0: number; memBefore: number | null } | null>(null);

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

  const sendProfile = (durationMs: number, memoryBytes: number | null) => {
    window.postMessage(
      {
        type: "console",
        codesandbox: true,
        log: [
          {
            id: `profile-${Date.now()}-${Math.random()}`,
            method: "profile",
            data: [{ durationMs, memoryBytes }],
          },
        ],
      },
      "*"
    );
  };

  async function runDebug(expr: string = customExpression) {
    const bridge = sandpackBridgeRef.current;
    
    let entryFile = "/index.ts";
    if (selectedLanguage === "python") entryFile = "/index.py";
    else if (selectedLanguage === "go") entryFile = "/main.go";
    else if (selectedLanguage === "java") entryFile = "/Main.java";
    else if (selectedLanguage === "cpp") entryFile = "/main.cpp";
    else if (selectedLanguage === "rust") entryFile = "/main.rs";

    const activeFile = bridge?.activeFile || entryFile;
    const indexFile = bridge?.files[activeFile];
    const rawCode =
      typeof indexFile === "string"
        ? indexFile
        : (indexFile as { code: string } | undefined)?.code ?? "";

    if (["python", "go", "java", "cpp", "rust"].includes(selectedLanguage)) {
      // Clear console
      window.postMessage({
        type: "console",
        codesandbox: true,
        log: { method: "clear", data: [] }
      }, "*");

      // Calculate SHA-256 code hash
      const encoder = new TextEncoder();
      const data = encoder.encode(rawCode);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      try {
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language: selectedLanguage,
            code: rawCode,
            speculative: false,
            codeHash: hashHex,
          }),
        });

        const runResult = await res.json().catch(() => null);
        for (const line of describeExecution(res.status, runResult)) {
          window.postMessage({
            type: "console",
            codesandbox: true,
            log: { method: line.method, data: [line.text] },
          }, "*");
        }
      } catch (err) {
        console.error("Backend sandbox run error:", err);
        window.postMessage({
          type: "console",
          codesandbox: true,
          log: { method: "error", data: ["Could not reach the code execution service. Check your connection and try again."] },
        }, "*");
      }
      return;
    }

    const baseCode = stripDebugBlock(rawCode);
    let codeToRun = baseCode;
    if (expr.trim()) {
      const trimmed = expr.trim();
      const isSimpleExpr = !trimmed.includes(";") &&
                           !trimmed.includes("\n") &&
                           !trimmed.includes("console.log") &&
                           !trimmed.includes("const ") &&
                           !trimmed.includes("let ") &&
                           !trimmed.includes("var ");
      if (isSimpleExpr) {
        codeToRun = `${baseCode}\n${DEBUG_BEGIN}\nconsole.log(${trimmed});\n${DEBUG_END}`;
      } else {
        codeToRun = `${baseCode}\n${DEBUG_BEGIN}\n${trimmed}\n${DEBUG_END}`;
      }
    }
    runLocalDebug(codeToRun);
  }

  function runLocalDebug(tsCode: string) {
    const js = stripTsAnnotations(tsCode);
    const iframe = sandboxIframeRef.current;
    if (iframe && iframe.contentWindow) {
      jsStartRef.current = {
        t0: performance.now(),
        memBefore: (performance as any).memory?.usedJSHeapSize || null
      };
      iframe.contentWindow.postMessage({ action: 'execute', code: js }, '*');
    } else {
      console.warn("Sandbox iframe not ready");
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

  // Submit is graded SERVER-SIDE (authoritative): we send the candidate's
  // editable files to /grade, which runs the hidden tests on Piston. The
  // in-browser "Run tests" button stays for interactive feedback, but the
  // client no longer reports pass/fail — the hidden tests live only on the
  // server, so they can't be tampered with.
  async function handleSubmit() {
    setSidebarTab("tests");
    setSubmitting(true);
    try {
      const submittedFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(filesRef.current)) {
        if (testFiles[path]) continue;
        const code = typeof file === "string" ? file : (file as { code: string }).code;
        submittedFiles[path] = path === "/index.ts" ? stripDebugBlock(code) : code;
      }
      const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || undefined : undefined;
      const res = await fetch(`/api/challenges/${challenge.slug}/grade`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: submittedFiles,
          durationSec: elapsedSec,
          sessionId,
          stepId,
          token,
        }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `HTTP ${res.status}`);

      // Reflect the authoritative results in the tests panel.
      if (Array.isArray(data.results)) {
        setTestRun({
          passed: data.passed,
          total: data.total,
          tests: data.results.map((r: { name: string; status: string; error?: string }) => ({
            path: "",
            name: r.name,
            status: (r.status === "pass" ? "pass" : "fail") as FlatTest["status"],
            error: r.error ?? null,
          })),
        });
      }
      setSubmittedStatus(data.status);
      if (data.compileError) {
        toast.error("Compilation failed", { description: "Fix the errors and resubmit." });
      } else if (data.status === "passed") {
        toast.success("Challenge passed!", { description: `${data.passed}/${data.total} tests` });
      } else {
        toast.error("Some tests failed", { description: `${data.passed}/${data.total} tests` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Submission failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // Frontend/playground challenges have no automated tests — snapshot the
  // candidate's files and record the attempt for manual review (no test gate).
  async function handleSubmitForReview() {
    setSubmitting(true);
    try {
      const submittedFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(filesRef.current)) {
        if (testFiles[path]) continue;
        submittedFiles[path] =
          typeof file === "string" ? file : (file as { code: string }).code;
      }
      const token =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("token") || undefined
          : undefined;
      const res = await fetch(`/api/challenges/${challenge.slug}/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: submittedFiles,
          testResults: { passed: 0, total: 0, tests: [] },
          durationSec: elapsedSec,
          sessionId,
          stepId,
          token,
          gradingMode: "manual",
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      setSubmittedStatus(data.status ?? "submitted");
      toast.success("Submitted for review", {
        description: "Your solution was saved for the reviewer.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Submission failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // Treat both an auto-graded pass and a manual-review submission as "done".
  const isSubmittedDone =
    submittedStatus === "passed" || submittedStatus === "submitted";

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SandpackProvider
      key={`${challenge.id}_${selectedLanguage}`}
      template={currentTemplate as any}
      theme={getSandpackTheme(isDark)}
      files={files}
      options={{
        // Frontend challenges need the bundler running for a live preview;
        // DSA challenges stay lazy and only run on explicit Run/Run tests.
        autorun: isFrontend,
        autoReload: isFrontend,
        initMode: isFrontend ? "immediate" : "lazy",
        recompileMode: "delayed",
        recompileDelay: 300,
        visibleFiles,
        activeFile,
      }}
    >
      <FilesTracker
        filesRef={filesRef}
        bridgeRef={sandpackBridgeRef}
        logTelemetryEvent={logTelemetryEvent}
        prevSnapshotFilesRef={prevSnapshotFilesRef}
      />

      {/* Hidden sandboxed iframe for secure JS/TS execution */}
      <iframe
        ref={sandboxIframeRef}
        srcDoc={`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline';">
            <script>
              const sendLog = (method, data) => {
                window.parent.postMessage({
                  type: 'console',
                  codesandbox: true,
                  log: [{
                    id: 'sandbox-' + Date.now() + '-' + Math.random(),
                    method,
                    data
                  }]
                }, '*');
              };
              window.console = {
                log: (...args) => sendLog('log', args),
                error: (...args) => sendLog('error', args),
                warn: (...args) => sendLog('warn', args),
                info: (...args) => sendLog('info', args),
              };
              window.onerror = (msg, url, line, col, err) => {
                sendLog('error', [msg]);
                return true;
              };
              window.addEventListener('message', (event) => {
                if (event.data && event.data.action === 'execute') {
                  try {
                    const fn = new Function(event.data.code);
                    fn();
                  } catch (e) {
                    const msg = e instanceof Error ? e.name + ': ' + e.message : String(e);
                    sendLog('error', [msg]);
                  } finally {
                    window.parent.postMessage({ type: 'execution-complete' }, '*');
                  }
                }
              });
            </script>
          </head>
          <body></body>
          </html>
        `}
        sandbox="allow-scripts"
        className="hidden"
      />

      <div className="flex flex-col h-screen bg-bg overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-surface shrink-0">
          {/* Left: exit + title + difficulty */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleExit}
              title="Exit the assessment"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 text-xs font-bold transition shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-black text-[15px] leading-tight text-fg truncate">{challenge.title}</h1>
              <span className={`text-[11px] uppercase font-black tracking-wider ${difficultyColor[challenge.difficulty]}`}>
                {challenge.difficulty}
              </span>
            </div>
          </div>

          {/* Center: countdown (take-home) / session timer / elapsed — prominent */}
          <div className="flex items-center justify-center shrink-0 gap-2">
            {isTakeHome ? (
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono tabular-nums shadow-sm ${
                    remainingTakeHomeSec < 60
                      ? "text-rose-700 dark:text-rose-300 border-rose-500/35 bg-rose-500/15 animate-pulse"
                      : remainingTakeHomeSec < 300
                      ? "text-amber-700 dark:text-amber-300 border-amber-500/35 bg-amber-500/15"
                      : "text-emerald-700 dark:text-emerald-300 border-emerald-500/35 bg-emerald-500/15"
                  }`}
                  title="Time remaining"
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-lg font-bold leading-none">{formatDuration(remainingTakeHomeSec)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleExtendTakeHomeTime}
                  title="Extend timer by 15 minutes"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-elevated text-slate-700 dark:text-slate-300 hover:text-fg text-xs font-black tracking-wider transition cursor-pointer shrink-0 active:scale-95 shadow-sm"
                >
                  +15m
                </button>
              </div>
            ) : sessionId ? (
              <SessionTimer
                sessionId={sessionId}
                shareToken={shareToken}
                isInterviewer={isInterviewer}
              />
            ) : (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-bg text-muted font-mono tabular-nums text-sm"
                title="Elapsed time"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{formatDuration(elapsedSec)}</span>
              </div>
            )}
          </div>

          {/* Toolbar Center/Right buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-1 justify-end">
            {/* Language picker is only meaningful for code challenges — a
                React/UI challenge has no language choice. */}
            {!isFrontend && (
              <CompetitorLanguageSelector value={selectedLanguage} onChange={setSelectedLanguage} />
            )}
            <ThemeToggle />

            {!isFrontend && testRun && (
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

            {/* Run Code trigger button in Toolbar — DSA challenges only */}
            {!isFrontend && submittedStatus !== "passed" && (
              <button
                onClick={() => {
                  setSidebarTab("console");
                  runDebug();
                }}
                className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-fg flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0"
                title="Execute index.ts script immediately and view logs"
              >
                <Play className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                Run code
              </button>
            )}

            {!isFrontend && submittedStatus !== "passed" && (
              <button
                onClick={() => {
                  setSidebarTab("tests");
                  runTests();
                }}
                disabled={runningTests}
                className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-elevated text-xs font-bold text-fg flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap shrink-0"
                title="Run the full test suite against your code"
              >
                <FlaskConical className="w-3.5 h-3.5 text-accent" />
                {runningTests ? "Running…" : "Run tests"}
              </button>
            )}

            {isSubmittedDone ? (
              <div className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submitted
              </div>
            ) : (
              <button
                onClick={isFrontend ? handleSubmitForReview : handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(var(--accent-rgb),0.2)] whitespace-nowrap shrink-0"
                title={
                  isFrontend
                    ? "Submit your work for manual review"
                    : !testRun
                      ? "Tests will run first, then submit"
                      : "Submit attempt"
                }
              >
                <Send className="w-3.5 h-3.5" />
                {submitting
                  ? "Submitting…"
                  : isFrontend
                    ? "Submit for review"
                    : "Submit Solution"}
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

        {/* Body: layout depends on challenge type — frontend/playground gets a
            file tree + editor + live preview; DSA gets editor + console/tests. */}
        {isFrontend ? (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 h-full overflow-hidden">
          {/* Description */}
          <aside className="w-full lg:w-[21rem] lg:shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border bg-bg p-5 lg:h-full max-h-[38vh] lg:max-h-none">
            <ChallengeDescription markdown={challenge.description} />
          </aside>

          {/* Split region (editor | output) — measured on load so code/output
              defaults to 50/50 of the space after the description. */}
          <div
            ref={splitRowRef}
            className="flex-1 min-w-0 flex flex-col lg:flex-row min-h-0 lg:h-full overflow-hidden"
          >

          {/* File tree + editor — width is drag-resizable on desktop. Reuses the
              same <FileExplorer> as the /play playground & interview rounds. */}
          <div
            className="w-full lg:w-[var(--ide-editor-w)] lg:shrink-0 min-h-[18rem] lg:min-h-0 flex border-b lg:border-b-0 border-border lg:h-full overflow-hidden"
            style={{ "--ide-editor-w": `${editorW}px` } as React.CSSProperties}
          >
            <div className={`${fileTreeCollapsed ? "w-12" : "w-48"} shrink-0 hidden sm:block h-full transition-[width] duration-200`}>
              <FileExplorer
                templateId={currentTemplate}
                readOnly={isInterviewer}
                showDownload={false}
                collapsed={fileTreeCollapsed}
                onToggleCollapse={() => setFileTreeCollapsed((v) => !v)}
                plainFolders
              />
            </div>
            <div className="flex-1 min-w-0 min-h-0 h-full relative flex flex-col border-l border-border">
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

          {/* Drag handle: code ↔ output (desktop). The hooks add a full-screen
              overlay during drag so it works over the preview iframe. */}
          <div
            onPointerDown={(e) => {
              userResizedRef.current = true;
              onEditorDrag(e);
            }}
            title="Drag to resize"
            role="separator"
            aria-orientation="vertical"
            className="hidden lg:block w-1.5 shrink-0 cursor-col-resize bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors"
          />

          {/* Output: preview + console with a view toggle (preview / split /
              console) and a drag-resizable split. Both panes stay mounted
              (toggled via display) so they don't reload/lose state on switch. */}
          <aside
            ref={outputPaneRef}
            className="flex-1 min-w-0 flex flex-col min-h-[20rem] lg:min-h-0 bg-bg lg:h-full overflow-hidden"
          >
            <div className="h-10 shrink-0 flex items-center justify-between gap-2 px-3 border-b border-border bg-surface/30">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-fg">
                <Monitor className="w-3 h-3 text-accent" />
                Output
              </span>
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg p-0.5">
                {([
                  { key: "preview", title: "Preview only", icon: Monitor },
                  { key: "both", title: "Split — preview + console", icon: PanelBottom },
                  { key: "console", title: "Console only", icon: Terminal },
                ] as const).map(({ key, title, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOutputView(key)}
                    title={title}
                    aria-pressed={outputView === key}
                    className={`p-1 rounded-md transition ${
                      outputView === key
                        ? "bg-accent text-bg"
                        : "text-muted hover:text-fg hover:bg-surface"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Preview (hidden in console-only mode) */}
            <div
              style={{
                display: outputView === "console" ? "none" : "flex",
                flex: "1 1 0",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton
                style={{ height: "100%", width: "100%" }}
              />
            </div>

            {/* Drag handle: preview ↔ console (split mode only) */}
            <div
              onPointerDown={(e) => {
                userResizedRef.current = true;
                onConsoleDrag(e);
              }}
              title="Drag to resize"
              role="separator"
              aria-orientation="horizontal"
              style={{ display: outputView === "both" ? "block" : "none" }}
              className="h-1.5 shrink-0 cursor-row-resize bg-border/40 hover:bg-accent/60 active:bg-accent/70 transition-colors"
            />

            {/* Console (hidden in preview-only mode; fixed resizable height when
                split, full height when console-only) */}
            <div
              className="flex flex-col min-h-0 border-t border-border"
              style={{
                display: outputView === "preview" ? "none" : "flex",
                minHeight: 0,
                ...(outputView === "both"
                  ? { flex: "0 0 auto", height: `${consoleH}px` }
                  : { flex: "1 1 0" }),
              }}
            >
              <div className="h-9 shrink-0 flex items-center gap-1.5 px-3 border-b border-border bg-surface/30 text-[10px] font-black uppercase tracking-wider text-muted">
                <Terminal className="w-3 h-3 text-accent" />
                Console
              </div>
              <div className="flex-1 min-h-0">
                <SandpackConsole resetOnPreviewRestart style={{ height: "100%" }} />
              </div>
            </div>
          </aside>
          </div>
        </div>
        ) : (
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
                  customExpression={customExpression}
                  setCustomExpression={setCustomExpression}
                  defaultExpression={initialCustomExpr}
                  onRun={() => runDebug(customExpression)}
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
        )}

        {/* Exit confirmation — the take-home countdown keeps running. */}
        {exitConfirmOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setExitConfirmOpen(false);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-scale-in">
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500">
                  <LogOut className="w-6 h-6" />
                </div>
                <h2 className="mt-3 text-base font-black text-fg">Exit the assessment?</h2>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">
                  Your countdown <strong className="text-fg font-bold">keeps running</strong> while
                  you&apos;re away. You can return any time using your take-home link.
                </p>
              </div>
              <div className="flex items-center gap-2.5 px-6 pb-5">
                <button
                  type="button"
                  onClick={() => setExitConfirmOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-panel/50 text-sm font-bold text-muted hover:text-fg hover:bg-panel transition"
                >
                  Keep working
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-black transition"
                >
                  <LogOut className="w-4 h-4" />
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SandpackProvider>
  );
}

function FilesTracker({
  filesRef,
  bridgeRef,
  logTelemetryEvent,
  prevSnapshotFilesRef,
}: {
  filesRef: React.MutableRefObject<SandpackFiles>;
  bridgeRef?: React.MutableRefObject<{
    updateFile: (path: string, code: string) => void;
    addFile?: (path: string, code: string) => void;
    files: SandpackFiles;
    activeFile: string;
    runSandpack?: () => void;
    clients?: Record<string, { dispatch?: (msg: unknown) => void } | undefined>;
  } | null>;
  logTelemetryEvent?: (type: "snapshot" | "blur" | "focus" | "paste", payload: any) => void;
  prevSnapshotFilesRef?: React.MutableRefObject<string>;
}) {
  const { sandpack } = useSandpack();
  useEffect(() => {
    filesRef.current = sandpack.files;
    if (bridgeRef) {
      const sp = sandpack as unknown as {
        updateFile: (p: string, c: string) => void;
        addFile?: (p: string, c: string) => void;
        files: SandpackFiles;
        activeFile: string;
        runSandpack?: () => void;
        clients?: Record<string, { dispatch?: (msg: unknown) => void } | undefined>;
      };
      bridgeRef.current = {
        updateFile: sp.updateFile,
        addFile: sp.addFile,
        files: sp.files,
        activeFile: sp.activeFile,
        runSandpack: sp.runSandpack,
        clients: sp.clients,
      };
    }

    // Reactively compile and log file snapshots upon code modifications
    if (logTelemetryEvent && prevSnapshotFilesRef) {
      const flattenedFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(sandpack.files)) {
        flattenedFiles[path] = typeof file === "string" ? file : file.code;
      }
      const filesStr = JSON.stringify(flattenedFiles);
      
      if (filesStr !== prevSnapshotFilesRef.current) {
        prevSnapshotFilesRef.current = filesStr;
        
        logTelemetryEvent("snapshot", {
          activeFile: sandpack.activeFile,
          files: flattenedFiles,
        });
      }
    }
  }, [sandpack, sandpack.files, sandpack.activeFile, filesRef, bridgeRef, logTelemetryEvent, prevSnapshotFilesRef]);

  // AuraSandbox Challenge Speculative Pre-compilation
  useEffect(() => {
    const activeFileExt = sandpack.activeFile.split(".").pop();
    const extToLang: Record<string, string> = {
      py: "python",
      go: "go",
      java: "java",
      cpp: "cpp",
      rs: "rust",
    };
    const inferredLang = activeFileExt ? extToLang[activeFileExt] : null;
    if (!inferredLang) return;

    const fileObj = sandpack.files[sandpack.activeFile];
    const activeCode = typeof fileObj === "string" ? fileObj : fileObj?.code ?? "";
    if (!activeCode || !activeCode.trim()) return;

    const timer = setTimeout(async () => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(activeCode);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        await fetch("/api/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language: inferredLang,
            code: activeCode,
            speculative: true,
            codeHash: hashHex,
          }),
        });
        console.info(`[AuraSandbox] Challenge Speculator queued (Language: ${inferredLang}, Hash: ${hashHex})`);
      } catch (err) {
        console.warn("[AuraSandbox] Challenge Speculator warning:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [sandpack.files, sandpack.activeFile]);

  return null;
}

function LiveConsole({
  logs,
  onClear,
  customExpression,
  setCustomExpression,
  defaultExpression,
  onRun,
}: {
  logs: LiveLog[];
  onClear: () => void;
  customExpression: string;
  setCustomExpression: (val: string) => void;
  defaultExpression: string;
  onRun: () => void;
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
    profile: "border-emerald-500 text-emerald-400",
  };

  return (
    <div className="flex flex-col h-full bg-bg font-mono text-xs">
      {/* Custom Run Expression Panel */}
      <div className="flex flex-col gap-2 p-3 bg-surface/30 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider text-muted flex items-center gap-1 font-sans">
            <Play className="w-2.5 h-2.5 text-emerald-500 fill-current" />
            Custom Run Expression
          </span>
          {defaultExpression && customExpression !== defaultExpression && (
            <button
              type="button"
              onClick={() => setCustomExpression(defaultExpression)}
              className="text-[9px] font-bold text-accent hover:text-accent-soft transition uppercase tracking-wider font-sans"
            >
              Reset to template
            </button>
          )}
        </div>
        <div className="relative group">
          <textarea
            value={customExpression}
            onChange={(e) => setCustomExpression(e.target.value)}
            placeholder="e.g. twoSum([2, 7, 11, 15], 9)"
            rows={Math.min(4, Math.max(1, customExpression.split("\n").length))}
            className="w-full bg-surface border border-border focus:border-accent rounded-lg p-2 pr-10 text-fg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none transition-all duration-200 shadow-sm leading-relaxed"
            style={{ minHeight: "36px", maxHeight: "120px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onRun();
              }
            }}
          />
          <button
            type="button"
            onClick={onRun}
            className="absolute right-2 bottom-2 p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 transition duration-200 shadow-sm hover:shadow-emerald-500/10"
            title="Run Expression (Ctrl + Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
        <div className="text-[9px] text-muted/65 leading-relaxed font-sans mt-0.5">
          Press <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[8px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[8px] font-mono">Enter</kbd> to execute and print the returned value below.
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-muted/50 text-center py-8 text-[11px] leading-relaxed px-4 font-sans">
            No console outputs yet. Click the <strong className="text-fg/80">Play</strong> button above to run your custom expression, or insert <code className="px-1 py-0.5 rounded bg-surface/60 text-fg/80 font-mono">console.log(...)</code> in your code.
          </div>
        ) : (
          <ul>
            {logs.map((l) => {
              if (l.method === "profile") {
                const profileData = l.data[0] as { durationMs: number; memoryBytes: number | null };
                return (
                  <li
                    key={l.id}
                    className="mx-3 my-2.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-fg font-sans backdrop-blur-md relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Space-Time Execution Profile
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-muted mb-0.5 font-sans">Execution Time</div>
                        <div className="text-xs font-bold text-fg font-mono">
                          {profileData.durationMs < 1 
                            ? `${profileData.durationMs.toFixed(3)} ms` 
                            : `${profileData.durationMs.toFixed(1)} ms`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted mb-0.5 font-sans">Estimated Memory</div>
                        <div className="text-xs font-bold text-fg font-mono">
                          {profileData.memoryBytes !== null 
                            ? `${(profileData.memoryBytes / 1024).toFixed(1)} KB` 
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-muted/65 mt-2 font-mono flex items-center gap-1 font-sans">
                      <span>⚡ Zero-Cost WASM Thread Execution</span>
                    </div>
                  </li>
                );
              }
              return (
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
              );
            })}
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
            fontFamily: 'var(--font-mono), "Fira Code", "Cascadia Code", monospace',
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
