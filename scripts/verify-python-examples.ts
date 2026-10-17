/**
 * Runs every example in the Python "ultra" files and checks that the docs only
 * claim output that really prints, the way the question page runs it.
 *
 * Runnable examples (the default) run in the page on Pyodide 0.25.1, which is
 * CPython 3.11. Each one is run twice:
 *
 *   python3.11   exits 0 within 20 s with nothing on stderr
 *   Pyodide      the page harness (scripts/lib/pyodide-harness.mjs): same
 *                stdout as python3.11, no error, and every
 *                `print(expr)  # expected` line passes as the page's test
 *
 * An example with `runnable: false` (threads, processes, 3.12+ syntax) runs
 * once with the interpreter named in its `python` field (default 3.12).
 *
 * In both cases the answer must quote the exact stdout inside a ~~~text block.
 *
 * Pyodide is not a project dependency. Set PYODIDE_DIR to a folder where
 * `npm i pyodide@0.25.1` was run; without it the Pyodide pass is skipped and a
 * line-by-line check of the `# expected` comments is used instead.
 *
 *   npx tsx scripts/verify-python-examples.ts [--file <name>] [--title <substring>] [--jobs 4]
 *   npx tsx scripts/verify-python-examples.ts --dsa      # the Python bundles of the DSA files
 */
import { execFileSync, spawn } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const onlyFile = arg("--file");
const onlyTitle = arg("--title");
const DSA = process.argv.includes("--dsa");
const JOBS = Number(arg("--jobs") ?? 4);
const PYODIDE_DIR = process.env.PYODIDE_DIR;
const CACHE = join(tmpdir(), "py-verify-cache");
mkdirSync(CACHE, { recursive: true });

type Example = { label?: string; code: string; runnable?: boolean; python?: string };
type Item = { file: string; title: string; answer: string; examples: Example[] };
type Run = { stdout: string; stderr: string; code: number | null; timedOut: boolean };
type PyodideRun = { stdout: string; stderr: string; error: string | null; tests: { expression: string; expected: string; actual?: string; passed: boolean; error: string | null }[] };

function sh(cmd: string, args: string[], cwd: string, input?: string, timeoutMs = 20000): Promise<Run> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, env: { ...process.env, PYTHONHASHSEED: "0" } });
    let stdout = "", stderr = "", timedOut = false;
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    if (input !== undefined) p.stdin.end(input);
    const t = setTimeout(() => { timedOut = true; p.kill("SIGKILL"); }, timeoutMs);
    p.on("close", (code) => { clearTimeout(t); resolve({ stdout, stderr, code, timedOut }); });
  });
}

async function cached<T>(key: string, fn: () => Promise<T>, ok: (r: T) => boolean): Promise<T> {
  const file = join(CACHE, createHash("sha256").update(key).digest("hex").slice(0, 24) + ".json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const r = await fn();
  if (ok(r)) writeFileSync(file, JSON.stringify(r));
  return r;
}

function cpython(version: string, code: string): Promise<Run> {
  return cached(`cpython${version}\0${code}`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "pyv-"));
    try {
      writeFileSync(join(dir, "main.py"), code);
      return await sh(`python${version}`, ["main.py"], dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, (r) => r.code === 0 && !r.timedOut);
}

function pyodide(code: string): Promise<PyodideRun> {
  return cached(`pyodide0.25.1\0${code}`, async () => {
    const harness = join(process.cwd(), "scripts", "lib", "pyodide-harness.mjs");
    const r = await sh("node", [harness], process.cwd(), JSON.stringify({ code }), 60000);
    if (r.timedOut) return { stdout: "", stderr: "", error: "timed out", tests: [] };
    try { return JSON.parse(r.stdout) as PyodideRun; }
    catch { return { stdout: "", stderr: r.stderr, error: "harness failed: " + r.stderr.slice(0, 300), tests: [] }; }
  }, (r) => !r.error);
}

const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();

function quotedBlocks(md: string): string[] {
  return [...md.matchAll(/^(~~~|```)\s*(text|output|console|txt|plaintext)\s*\n([\s\S]*?)^\1\s*$/gm)].map((m) => norm(m[3]));
}

/** Without Pyodide: when every print is a top-level one-liner, the n-th
 *  annotated print maps to the n-th output line. */
function lineTests(code: string, stdout: string): string[] {
  const prints = code.split("\n").filter((l) => /\bprint\(/.test(l));
  if (prints.some((l) => !/^print\(/.test(l))) return [];
  const out = norm(stdout).split("\n");
  if (out.length !== prints.length) return [];
  const errs: string[] = [];
  prints.forEach((l, i) => {
    const m = /^print\((.*)\)\s*#\s*(.+)$/.exec(l.trim());
    if (!m) return;
    const want = m[2].trim().replace(/^["']|["']$/g, "");
    if (out[i].trim() !== want && out[i].replace(/\s+/g, "") !== want.replace(/\s+/g, ""))
      errs.push(`line "${l.trim().slice(0, 60)}" says ${want} but printed ${out[i].trim()}`);
  });
  return errs;
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function loadItems(): Promise<Item[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const pattern = DSA ? /^dsa-augments-ultra-\d+\.ts$/ : /^python-augments-ultra-\d+\.ts$/;
  const files = readdirSync(dir).filter((f) => pattern.test(f)).filter((f) => !onlyFile || f === onlyFile).sort();
  const items: Item[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const a of (mod.default ?? []) as Record<string, any>[]) {
      if (onlyTitle && !a.title.toLowerCase().includes(onlyTitle.toLowerCase())) continue;
      const b = DSA ? a.languages?.python : a;
      if (b) items.push({ file: f, title: a.title, answer: b.answer ?? "", examples: b.examples ?? [] });
    }
  }
  return items;
}

async function main() {
  const versions = new Set(["3.11"]);
  const items = await loadItems();
  for (const it of items) for (const ex of it.examples) if (ex.runnable === false) versions.add(ex.python ?? "3.12");
  for (const v of versions)
    try { execFileSync(`python${v}`, ["--version"], { stdio: "ignore" }); } catch { console.log(`✖ python${v} is not installed`); process.exit(1); }
  if (!PYODIDE_DIR) console.log("⚠ PYODIDE_DIR is not set: skipping the in-page (Pyodide) pass.");

  const jobs = items.flatMap((it) => it.examples.map((ex, idx) => ({ it, ex, idx })));
  const problems: string[] = [];
  let done = 0;
  await pool(jobs, JOBS, async ({ it, ex, idx }) => {
    const where = `${it.file} ${it.title.slice(0, 60)} example ${idx + 1}`;
    const inPage = ex.runnable !== false;
    const version = inPage ? "3.11" : ex.python ?? "3.12";
    const r = await cpython(version, ex.code);
    if (r.timedOut) problems.push(`${where}: timed out on python${version}`);
    else if (r.code !== 0) problems.push(`${where}: python${version} exit ${r.code}\n      ${r.stderr.trim().split("\n").slice(-4).join("\n      ")}`);
    else {
      if (r.stderr.trim()) problems.push(`${where}: wrote to stderr on python${version}: ${r.stderr.trim().slice(0, 200)}`);
      const out = norm(r.stdout);
      if (!out) problems.push(`${where}: printed nothing`);
      else if (!quotedBlocks(it.answer).includes(out))
        problems.push(`${where}: the answer does not quote this output in a ~~~text block:\n      ${out.split("\n").slice(0, 8).join("\n      ")}`);
      if (inPage && PYODIDE_DIR) {
        const p = await pyodide(ex.code);
        if (p.error) problems.push(`${where}: fails in the page (Pyodide 0.25.1): ${p.error}\n      (if it cannot run in a browser, set runnable: false and python: "3.12")`);
        else {
          if (norm(p.stdout) !== out) problems.push(`${where}: prints differently in the page (Pyodide) than on python3.11:\n      page: ${norm(p.stdout).split("\n").slice(0, 4).join(" | ")}\n      3.11: ${out.split("\n").slice(0, 4).join(" | ")}`);
          for (const t of p.tests.filter((t) => !t.passed))
            problems.push(`${where}: in-page test "print(${t.expression.slice(0, 50)})  # ${t.expected}" fails: ${t.error ?? "got " + t.actual}`);
        }
      } else if (inPage) for (const e of lineTests(ex.code, r.stdout)) problems.push(`${where}: ${e}`);
    }
    if (++done % 20 === 0) process.stdout.write(`  ran ${done}/${jobs.length}\n`);
  });

  console.log(`\nRan ${jobs.length} example(s) for ${items.length} question(s)${PYODIDE_DIR ? " (python3.11 + Pyodide page harness)" : ""}.`);
  if (!problems.length) { console.log("✔ Every example runs as the page runs it, and its output is quoted."); return; }
  console.log(`\n✖ ${problems.length} problem(s):\n`);
  for (const p of problems.sort()) console.log("  " + p);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
