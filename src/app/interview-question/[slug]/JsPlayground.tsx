"use client";

import { useRef, useState, useEffect } from "react";
import { Play, RotateCcw, Loader2, ChevronRight, Trash2, ExternalLink, Check, X } from "lucide-react";
import CodeMirrorEditor from "./CodeMirrorEditor";
import { playgroundFilesHref } from "@/lib/playground-handoff";
import { LANG_COLOR, badge, frame, frameBar, frameLabel, iconBtn, quietBtn, runBtn } from "./_components/codeFrame";

// Cached workers to avoid re-downloading 500KB TS + 20MB Pyodide on every Run
let tsWorkerBlobUrl: string | null = null;
let pyodideInstance: any = null;
let pyodideLoading: Promise<any> | null = null;

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
    let blobUrl: string | null = null;
    if (technology === "typescript") {
      workerSrc = TS_WORKER_SRC;
      if (!tsWorkerBlobUrl) {
        const b = new Blob([workerSrc], { type: "application/javascript" });
        tsWorkerBlobUrl = URL.createObjectURL(b);
      }
      blobUrl = tsWorkerBlobUrl;
    } else if (technology === "python") {
      workerSrc = PY_WORKER_SRC;
    }

    const worker = blobUrl
      ? new Worker(blobUrl)
      : new Worker(URL.createObjectURL(new Blob([workerSrc], { type: "application/javascript" })));
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
    t === "error" ? "text-danger" : t === "warn" ? "text-warning" : "text-muted";

  const lang =
    technology === "typescript"
      ? { key: "typescript", label: "TypeScript" }
      : technology === "python"
        ? { key: "python", label: "Python" }
        : { key: "javascript", label: "JavaScript" };
  const passedCount = testResults.filter((r) => r.passed).length;
  const finished = testResults.length > 0 && testResults.every((r) => r.passed !== undefined);

  const practiceTemplate = technology === "python" ? "empty-python" : technology === "typescript" ? "empty-ts" : "empty-js";
  const fileExtension = technology === "python" ? ".py" : technology === "typescript" ? ".ts" : ".js";

  const tab = (on: boolean) =>
    `relative flex h-10 items-center gap-2 px-3 text-[13px] font-medium transition-colors motion-reduce:transition-none ${
      on ? "text-fg after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent" : "text-subtle hover:text-fg"
    }`;

  return (
    <div className={frame}>
      <div className={frameBar}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={badge}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: LANG_COLOR[lang.key] }} aria-hidden />
            {lang.label}
          </span>
          {label && <span className={frameLabel}>{label}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setSrc(code.trim()); setLogs([]); setHasRun(false); }}
            className={iconBtn}
            aria-label="Reset the code"
            title="Reset the code"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
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
              className={quietBtn}
              title="Open a blank starter in the playground, with this solution beside it"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Practice
            </a>
          )}
          <button type="button" onClick={run} disabled={running} className={runBtn}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5 fill-current" aria-hidden />}
            Run
          </button>
        </div>
      </div>

      <div>
        <CodeMirrorEditor value={src} onChange={setSrc} technology={technology} />
      </div>

      {hasRun && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between border-b border-border bg-bg/40 pl-1 pr-2">
            <div role="tablist" aria-label="Output" className="flex">
              {testCases.length > 0 && (
                <button type="button" role="tab" aria-selected={activeTab === "tests"} onClick={() => setActiveTab("tests")} className={tab(activeTab === "tests")}>
                  Tests
                  <span
                    className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${
                      !finished ? "bg-panel text-subtle" : passedCount === testCases.length ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                    }`}
                  >
                    {passedCount}/{testCases.length}
                  </span>
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "console" || testCases.length === 0}
                onClick={() => setActiveTab("console")}
                className={tab(activeTab === "console" || testCases.length === 0)}
              >
                Console
              </button>
            </div>
            {activeTab === "console" && logs.length > 0 && (
              <button type="button" onClick={() => { setLogs([]); setHasRun(false); }} className={iconBtn} aria-label="Clear the output" title="Clear the output">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>

          <div className="qa-code-scroll max-h-72 overflow-auto bg-[#0b0d12] px-4 py-3 font-mono text-[13px] leading-relaxed">
            {running && logs.length === 0 && testResults.every((r) => r.passed === undefined) ? (
              <div className="flex items-center gap-2 text-subtle"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Running…</div>
            ) : activeTab === "tests" && testCases.length > 0 ? (
              <ul className="divide-y divide-border/70">
                {testResults.map((t, idx) => (
                  <li key={t.id} className="py-2.5 first:pt-0.5 last:pb-0.5">
                    <div className="flex items-center gap-2.5">
                      {t.passed === true ? (
                        <Check className="h-4 w-4 shrink-0 text-success" aria-label="Passed" />
                      ) : t.passed === false ? (
                        <X className="h-4 w-4 shrink-0 text-danger" aria-label="Failed" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border border-border-strong" aria-label="Not run" />
                      )}
                      <span className="text-subtle">{idx + 1}.</span>
                      <code className="min-w-0 truncate text-fg" title={t.expression}>{t.expression}</code>
                    </div>
                    <div className="mt-1 space-y-0.5 pl-[42px] text-xs">
                      <div className="text-subtle">
                        expected <span className="text-success">{t.expected}</span>
                      </div>
                      {t.passed === false && (
                        <div className="text-subtle">
                          got <span className="text-danger">{t.error ? `Error: ${t.error}` : t.actual}</span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
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
