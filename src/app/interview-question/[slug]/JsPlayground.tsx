"use client";

import { useRef, useState, useEffect } from "react";
import { Play, RotateCcw, Loader2, ChevronRight, Trash2, ExternalLink, Check, X } from "lucide-react";
import CodeMirrorEditor from "./CodeMirrorEditor";
import { playgroundFilesHref } from "@/lib/playground-handoff";

type TestCase = {
  id: number;
  expression: string;
  expected: string;
  actual?: string;
  passed?: boolean;
  error?: string | null;
};

function parseTestCases(originalCode: string, technology: string): TestCase[] {
  const lines = originalCode.split("\n");
  const testCases: TestCase[] = [];
  let id = 1;

  if (technology === "python") {
    // Match Python: print(someExpr) # expectedOutput
    const logRegex = /print\((.+?)\);?\s*#\s*(.+)/;
    for (const line of lines) {
      const match = line.match(logRegex);
      if (match) {
        testCases.push({
          id: id++,
          expression: match[1].trim(),
          expected: match[2].trim(),
        });
      }
    }
  } else {
    // Match JS/TS: console.log(someExpr); // expectedOutput
    const logRegex = /console\.log\((.+?)\);?\s*\/\/\s*(.+)/;
    for (const line of lines) {
      const match = line.match(logRegex);
      if (match) {
        testCases.push({
          id: id++,
          expression: match[1].trim(),
          expected: match[2].trim(),
        });
      }
    }
  }

  return testCases;
}

function generateTestHarness(testCases: TestCase[]): string {
  if (testCases.length === 0) return "";

  return `
;(function() {
  const tests = ${JSON.stringify(testCases)};
  const results = [];

  function formatValue(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v); }
    catch (_) { return String(v); }
  }

  for (const t of tests) {
    let actualValue;
    let passed = false;
    let errorMsg = null;
    try {
      actualValue = eval(t.expression);
      const actualStr = formatValue(actualValue);
      const cleanExpected = t.expected.replace(/^["']|["']$/g, '');
      passed = (actualStr === t.expected || 
                actualStr.replace(/\\s+/g, '') === t.expected.replace(/\\s+/g, '') ||
                actualStr === cleanExpected ||
                actualStr.replace(/\\s+/g, '') === cleanExpected.replace(/\\s+/g, ''));
    } catch (err) {
      errorMsg = err.message;
    }
    results.push({
      id: t.id,
      expression: t.expression,
      expected: t.expected,
      actual: formatValue(actualValue),
      passed,
      error: errorMsg
    });
  }

  self.postMessage({ kind: 'testSuiteResults', results });
})();
`;
}

type LogLine = { type: "log" | "warn" | "error"; text: string };

const JS_WORKER_SRC = `
self.onmessage = function (e) {
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v); }
    catch (_) { return String(v); }
  }
  function send(type, args) {
    self.postMessage({ kind: 'log', type: type, text: Array.prototype.map.call(args, fmt).join(' ') });
  }
  var sandbox = {
    log:   function () { send('log', arguments); },
    info:  function () { send('log', arguments); },
    debug: function () { send('log', arguments); },
    warn:  function () { send('warn', arguments); },
    error: function () { send('error', arguments); },
  };
  try {
    var fn = new Function('console', e.data);
    var result = fn(sandbox);
    if (result !== undefined) send('log', ['=> ' + fmt(result)]);
  } catch (err) {
    self.postMessage({ kind: 'log', type: 'error', text: fmt(err) });
  }
  self.postMessage({ kind: 'syncDone' });
};
`;

const TS_WORKER_SRC = `
importScripts("https://cdnjs.cloudflare.com/ajax/libs/typescript/5.4.5/typescript.min.js");

self.onmessage = function (e) {
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v); }
    catch (_) { return String(v); }
  }
  function send(type, args) {
    self.postMessage({ kind: 'log', type: type, text: Array.prototype.map.call(args, fmt).join(' ') });
  }
  var sandbox = {
    log:   function () { send('log', arguments); },
    info:  function () { send('log', arguments); },
    debug: function () { send('log', arguments); },
    warn:  function () { send('warn', arguments); },
    error: function () { send('error', arguments); },
  };
  try {
    var jsCode = ts.transpile(e.data);
    var fn = new Function('console', jsCode);
    var result = fn(sandbox);
    if (result !== undefined) send('log', ['=> ' + fmt(result)]);
  } catch (err) {
    self.postMessage({ kind: 'log', type: 'error', text: fmt(err) });
  }
  self.postMessage({ kind: 'syncDone' });
};
`;

const PY_WORKER_SRC = `
importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js");

let pyodide = null;

async function init() {
  if (pyodide) return;
  pyodide = await loadPyodide({
    stdout: (text) => {
      self.postMessage({ kind: 'log', type: 'log', text: text });
    },
    stderr: (text) => {
      self.postMessage({ kind: 'log', type: 'error', text: text });
    }
  });
}

self.onmessage = async function(e) {
  const { code, testCases } = e.data;
  try {
    await init();
    
    // Run candidate code in global Python scope
    await pyodide.runPythonAsync(code);
    
    if (testCases && testCases.length > 0) {
      const results = [];
      for (const t of testCases) {
        let actualVal;
        let passed = false;
        let errorMsg = null;
        try {
          const res = await pyodide.runPythonAsync(t.expression);
          if (res !== undefined && res !== null) {
            actualVal = String(res);
          } else {
            actualVal = "None";
          }
          
          const cleanExpected = t.expected.replace(/^["']|["']$/g, '');
          passed = (actualVal === t.expected || 
                    actualVal.replace(/\\s+/g, '') === t.expected.replace(/\\s+/g, '') ||
                    actualVal === cleanExpected ||
                    actualVal.replace(/\\s+/g, '') === cleanExpected.replace(/\\s+/g, ''));
        } catch (err) {
          errorMsg = err.message;
        }
        results.push({
          id: t.id,
          expression: t.expression,
          expected: t.expected,
          actual: actualVal,
          passed,
          error: errorMsg
        });
      }
      self.postMessage({ kind: 'testSuiteResults', results });
    }
  } catch (err) {
    self.postMessage({ kind: 'log', type: 'error', text: String(err) });
  }
  self.postMessage({ kind: 'syncDone' });
};
`;

function buildPracticeStub(title: string, description: string, technology: string): string {
  const descLines = description
    .split("\n")
    .map((line) => technology === "python" ? `# ${line}` : ` * ${line}`)
    .join("\n");
    
  if (technology === "python") {
    return [
      `# ${title}`,
      `#`,
      descLines,
      `#`,
      ``,
      `# Write your solution below:`,
      ``,
    ].join("\n");
  }
  
  return [
    `/**`,
    ` * ${title}`,
    ` *`,
    descLines,
    ` */`,
    ``,
    `// Write your solution below:`,
    ``,
  ].join("\n");
}

export default function JsPlayground({
  code,
  label,
  title,
  description,
  backFrom,
  technology = "javascript",
}: {
  code: string;
  label?: string;
  title?: string;
  description?: string;
  backFrom?: string;
  technology?: string;
}) {
  const [src, setSrc] = useState(code.trim());
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [running, setRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Parse test cases based on active technology
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testResults, setTestResults] = useState<TestCase[]>([]);
  const [activeTab, setActiveTab] = useState<"console" | "tests">("console");

  // Re-parse when code or technology changes
  useEffect(() => {
    const parsed = parseTestCases(src, technology);
    setTestCases(parsed);
    setTestResults(parsed);
  }, [code, technology]);

  function cleanup() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  function run() {
    cleanup();
    setLogs([]);
    setHasRun(true);
    setRunning(true);

    setTestResults(testCases.map((t) => ({ ...t, passed: undefined, actual: undefined, error: null })));
    // As per user instructions: keep console as the primary/default selected tab with running output
    setActiveTab("console");

    let workerSrc = JS_WORKER_SRC;
    if (technology === "typescript") {
      workerSrc = TS_WORKER_SRC;
    } else if (technology === "python") {
      workerSrc = PY_WORKER_SRC;
    }

    const blob = new Blob([workerSrc], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    const collected: LogLine[] = [];
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (extra?: LogLine) => {
      if (extra) collected.push(extra);
      cleanup();
      if (graceTimer) clearTimeout(graceTimer);
      clearTimeout(hardTimer);
      setLogs(collected.length ? [...collected] : [{ type: "log", text: "(no output)" }]);
      setRunning(false);
    };

    // Hard cap: Pyodide loads and runs, give Python slightly more time (5s) than JS (3s) for startup WASM loading
    const timeoutLimit = technology === "python" ? 8000 : 3000;
    const hardTimer = setTimeout(() => {
      finish({ type: "warn", text: `⏱ stopped after ${timeoutLimit / 1000}s` });
    }, timeoutLimit);

    worker.onmessage = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.kind === "log") {
        collected.push({ type: m.type, text: m.text });
        setLogs([...collected]);
      } else if (m.kind === "testSuiteResults") {
        setTestResults(m.results);
      } else if (m.kind === "syncDone") {
        graceTimer = setTimeout(() => finish(), 1200);
      }
    };
    worker.onerror = (e) => {
      setTestResults((prev) =>
        prev.map((t) => ({ ...t, passed: false, error: e.message }))
      );
      finish({ type: "error", text: e.message });
    };

    if (technology === "python") {
      worker.postMessage({ code: src, testCases });
    } else {
      const harness = generateTestHarness(testCases);
      const fullSource = src + "\n" + harness;
      worker.postMessage(fullSource);
    }
  }

  const logColor = (t: LogLine["type"]) =>
    t === "error"
      ? "text-rose-600 dark:text-rose-400"
      : t === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  // Dynamic tag badges based on technology
  const renderBadge = () => {
    if (technology === "typescript") {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-blue-500/15 text-blue-500 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-sm bg-blue-500" /> TS
        </span>
      );
    }
    if (technology === "python") {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500" /> PY
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-amber-400/15 text-amber-500 border border-amber-400/20">
        <span className="w-1.5 h-1.5 rounded-sm bg-amber-400" /> JS
      </span>
    );
  };

  const practiceTemplate = technology === "python" ? "empty-python" : technology === "typescript" ? "empty-ts" : "empty-js";
  const fileExtension = technology === "python" ? ".py" : technology === "typescript" ? ".ts" : ".js";

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-border bg-bg/40">
        <div className="flex items-center gap-2 min-w-0">
          {renderBadge()}
          {label && <span className="text-xs font-bold text-muted truncate">{label}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setSrc(code.trim()); setLogs([]); setHasRun(false); }}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition"
            title="Reset to original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {title && description && (
            <a
              href={playgroundFilesHref(
                {
                  [`/index${fileExtension}`]: buildPracticeStub(title, description, technology),
                  [`/solution${fileExtension}`]: code.trim(),
                },
                practiceTemplate,
                backFrom,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 text-accent text-xs font-black uppercase tracking-wider hover:bg-accent/10 transition shadow-sm"
              title="Open in playground with a practice stub to solve"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Practice
            </a>
          )}
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-60 shadow-sm"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Run
          </button>
        </div>
      </div>

      {/* Editor */}
      <div>
        <CodeMirrorEditor value={src} onChange={setSrc} technology={technology} />
      </div>

      {/* Output Console & Tests Tabs */}
      {hasRun && (
        <div className="border-t border-border bg-bg/60">
          <div className="flex items-center justify-between px-3.5 border-b border-border">
            <div className="flex gap-1.5 -mb-px">
              {testCases.length > 0 && (
                <button
                  onClick={() => setActiveTab("tests")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition ${
                    activeTab === "tests"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-fg"
                  }`}
                >
                  Test Cases ({testResults.filter(r => r.passed).length}/{testCases.length})
                </button>
              )}
              <button
                onClick={() => setActiveTab("console")}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition ${
                  activeTab === "console" || testCases.length === 0
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-fg"
                }`}
              >
                Console
              </button>
            </div>
            {activeTab === "console" && logs.length > 0 && (
              <button
                onClick={() => { setLogs([]); setHasRun(false); }}
                className="text-muted/70 hover:text-fg transition mr-3.5"
                title="Clear output"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="px-3.5 py-3 font-mono text-[12px] leading-relaxed max-h-60 overflow-auto bg-slate-50/50 dark:bg-black/25">
            {running && logs.length === 0 && testResults.every(r => r.passed === undefined) ? (
              <div className="text-muted flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> running…</div>
            ) : activeTab === "tests" && testCases.length > 0 ? (
              <div className="space-y-3">
                {testResults.map((t, idx) => (
                  <div key={t.id} className="p-3 rounded-xl border border-border bg-surface/50 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                       <span className="font-bold text-[10px] text-muted uppercase tracking-wider">Test Case {idx + 1}</span>
                      {t.passed === true ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          <Check className="w-3.5 h-3.5" /> Passed
                        </span>
                      ) : t.passed === false ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                          <X className="w-3.5 h-3.5" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-muted bg-surface border border-border px-2 py-0.5 rounded-md">
                          Ready
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs text-fg/90">
                      <div>
                        <span className="text-muted font-bold">Expression:</span> <code className="bg-bg px-1.5 py-0.5 rounded border border-border">{t.expression}</code>
                      </div>
                      <div>
                        <span className="text-muted font-bold">Expected:</span> <code className="bg-bg px-1.5 py-0.5 rounded border border-border text-emerald-500">{t.expected}</code>
                      </div>
                      {t.passed === false && (
                        <div>
                          <span className="text-muted font-bold">Actual:</span> <code className="bg-bg px-1.5 py-0.5 rounded border border-border text-rose-500">{t.error ? `Error: ${t.error}` : t.actual}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {logs.map((l, i) => (
                  <div key={i} className={`whitespace-pre-wrap ${logColor(l.type)}`}>{l.text}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
