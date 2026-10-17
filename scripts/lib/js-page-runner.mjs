/**
 * Runs one JavaScript or TypeScript example the way the question page does
 * (src/app/interview-question/[slug]/JsPlayground.tsx), so a verifier can
 * compare what a reader will really see.
 *
 * What it copies from the page:
 *   - `console.log(expr); // expected` lines become tests, evaluated after the
 *     program by `eval(expr)` in the same function scope
 *   - TypeScript is transpiled with typescript 5.4.5 `ts.transpile`, target
 *     ES2022 (no type checking happens in the page)
 *   - the code runs as `new Function('console', code)` with a console whose
 *     arguments are formatted like the page's fmt(): strings as-is, Errors as
 *     "Name: message", objects through JSON.stringify
 *   - output is collected until 1.2 s after the synchronous part finishes
 *     (the page stops there), with a 3 s hard cap
 *   - only browser-worker globals are available: no require, process or Buffer
 *
 * stdin:  {"code": "...", "technology": "javascript" | "typescript"}
 * stdout: {"logs": [{"type", "text"}], "tests": [...], "error": null | "...", "transpileError": null | "..."}
 *
 * TS_DIR must point to a folder where `npm i typescript@5.4.5` was run (TypeScript only).
 */
import vm from "node:vm";
import { createRequire } from "node:module";
import { join } from "node:path";

const input = JSON.parse(await new Promise((r) => { let s = ""; process.stdin.on("data", (d) => (s += d)); process.stdin.on("end", () => r(s)); }));
const { code, technology } = input;

function parseTests(src) {
  const re = /console\.log\((.+?)\);?\s*\/\/\s*(.+)/;
  const out = [];
  let id = 0;
  for (const line of src.split("\n")) {
    const m = line.match(re);
    if (m) out.push({ id: id++, expression: m[1].trim(), expected: m[2].trim() });
  }
  return out;
}

// Same text as generateTestHarness() in JsPlayground.tsx.
function harness(tests) {
  if (!tests.length) return "";
  return `
;(function() {
  const tests = ${JSON.stringify(tests)};
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
    results.push({ id: t.id, expression: t.expression, expected: t.expected, actual: formatValue(actualValue), passed, error: errorMsg });
  }
  self.postMessage({ kind: 'testSuiteResults', results });
})();
`;
}

const tests = parseTests(code);
let source = code + "\n" + harness(tests);
let transpileError = null;
if (technology === "typescript") {
  const require = createRequire(join(process.env.TS_DIR ?? process.cwd(), "package.json"));
  const ts = require("typescript");
  if (ts.version !== "5.4.5") transpileError = `TS_DIR has typescript ${ts.version}, the page uses 5.4.5`;
  source = ts.transpile(source, { target: ts.ScriptTarget.ES2022 });
}

const logs = [];
let testResults = [];
let error = null;
const t0 = Date.now();
let finished = false;

const ctx = vm.createContext({});
// Build fmt and the console inside the context so instanceof/JSON see that realm.
vm.runInContext(`
  var __logs = [];
  function __fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v); }
    catch (_) { return String(v); }
  }
  function __send(type, args) { __push(type, Array.prototype.map.call(args, __fmt).join(' ')); }
  var __console = {
    log: function () { __send('log', arguments); }, info: function () { __send('log', arguments); },
    debug: function () { __send('log', arguments); }, warn: function () { __send('warn', arguments); },
    error: function () { __send('error', arguments); },
  };
`, ctx);
ctx.__push = (type, text) => { if (!finished) logs.push({ type, text, ms: Date.now() - t0 }); };
const host = { setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, structuredClone, URL, URLSearchParams,
  TextEncoder, TextDecoder, AbortController, AbortSignal, Event, EventTarget, performance, crypto, atob, btoa, fetch, Blob,
  MessageChannel, BroadcastChannel };
Object.assign(ctx, host);
ctx.self = ctx;
ctx.globalThis = ctx;
ctx.postMessage = (m) => { if (m?.kind === "testSuiteResults") testResults = m.results; };
ctx.__src = source;

try {
  const result = vm.runInContext("(new Function('console', __src))(__console)", ctx);
  if (result !== undefined) ctx.__push("log", "=> " + vm.runInContext("__fmt", ctx)(result));
} catch (err) {
  const fmt = vm.runInContext("__fmt", ctx);
  ctx.__push("error", fmt(err));
  error = fmt(err);
}
const syncMs = Date.now() - t0;
process.on("unhandledRejection", (e) => { error = error ?? "unhandled rejection: " + String(e?.message ?? e); });

const done = () => {
  if (finished) return;
  finished = true;
  process.stdout.write(JSON.stringify({ logs, tests: testResults, error, transpileError, syncMs }));
  process.exit(0);
};
setTimeout(done, Math.max(0, Math.min(1200, 3000 - syncMs)));
