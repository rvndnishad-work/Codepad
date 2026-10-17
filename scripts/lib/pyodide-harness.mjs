/**
 * Runs one Python program the way the question page does
 * (src/app/interview-question/[slug]/JsPlayground.tsx): Pyodide 0.25.1,
 * `runPythonAsync(code)`, then every `print(expr)  # expected` line becomes a
 * test that re-evaluates `print(expr)` and compares what it prints with the
 * expected text (quotes and whitespace are ignored, as on the page).
 *
 * Reads {code} as JSON on stdin and prints {stdout, stderr, error, tests} as
 * JSON. Pyodide is not a project dependency: point PYODIDE_DIR at a folder
 * where `npm i pyodide@0.25.1` was run.
 *
 *   echo '{"code":"print(1)  # 1"}' | PYODIDE_DIR=/path node scripts/lib/pyodide-harness.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const dir = process.env.PYODIDE_DIR;
const { loadPyodide } = await import(pathToFileURL(join(dir, "node_modules", "pyodide", "pyodide.mjs")).href);
const { code } = JSON.parse(readFileSync(0, "utf8"));

const out = [], err = [];
const py = await loadPyodide({ stdout: (t) => out.push(t), stderr: (t) => err.push(t) });

// Same parser as parseTestCases() on the page.
const tests = [];
for (const line of code.split("\n")) {
  const m = line.match(/print\((.+?)\);?\s*#\s*(.+)/);
  if (m) tests.push({ expression: m[1].trim(), expected: m[2].trim() });
}

let error = null;
try {
  await py.runPythonAsync(code);
} catch (e) {
  error = String(e?.message ?? e).split("\n").slice(-4).join("\n");
}

const results = [];
if (!error) {
  for (const t of tests) {
    let actual, passed = false, terr = null;
    try {
      const wrapped = "import io as __io, contextlib as __cl\n__buf = __io.StringIO()\nwith __cl.redirect_stdout(__buf):\n    print(" + t.expression + ")\n__buf.getvalue()[:-1]";
      actual = String(await py.runPythonAsync(wrapped));
      const clean = t.expected.replace(/^["']|["']$/g, "");
      const ns = (s) => s.replace(/\s+/g, "");
      passed = actual === t.expected || ns(actual) === ns(t.expected) || actual === clean || ns(actual) === ns(clean);
    } catch (e) {
      terr = String(e?.message ?? e).split("\n").slice(-2).join(" ");
    }
    results.push({ ...t, actual, passed, error: terr });
  }
}

process.stdout.write(JSON.stringify({ stdout: out.join("\n"), stderr: err.join("\n"), error, tests: results }));
