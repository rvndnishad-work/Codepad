/**
 * Runs every example in the TypeScript "ultra" files and checks that the docs
 * only claim what really happens, the way the question page runs it.
 *
 * Each example is checked twice:
 *
 *   tsc 5.4.5    type-checks with strict on (target ES2022, lib ES2022 + DOM).
 *                It must pass. To show a compile error, put
 *                `// @ts-expect-error` on the line above it: tsc then fails
 *                if that line does NOT error, so the claim is verified too.
 *   page run     scripts/lib/js-page-runner.mjs runs it like the page:
 *                ts.transpile to ES2022, new Function('console', code), the
 *                page's console formatting, 1.2 s of async output. It must not
 *                throw, every `console.log(expr); // expected` test must pass,
 *                and the answer must quote the printed lines in a ~~~text block.
 *
 * An example with `runnable: false` is type-checked only.
 *
 * TypeScript 5.4.5 is not a project dependency. Set TS_DIR to a folder where
 * `npm i typescript@5.4.5` was run.
 *
 *   TS_DIR=... npx tsx scripts/verify-ts-examples.ts [--file <name>] [--title <substring>] [--jobs 4]
 */
import { spawn } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const onlyFile = arg("--file")?.split("/").pop(); // "prisma/data/x.ts" or "x.ts"
const onlyTitle = arg("--title");
const JOBS = Number(arg("--jobs") ?? 4);
const TS_DIR = process.env.TS_DIR;
const CACHE = join(tmpdir(), "ts-verify-cache");
mkdirSync(CACHE, { recursive: true });

type Example = { label?: string; code: string; runnable?: boolean };
type Item = { file: string; title: string; answer: string; examples: Example[] };
type Run = { stdout: string; stderr: string; code: number | null; timedOut: boolean };
type PageRun = { logs: { type: string; text: string }[]; tests: { expression: string; expected: string; actual?: string; passed: boolean; error: string | null }[]; error: string | null; transpileError: string | null };

function sh(cmd: string, args: string[], cwd: string, input?: string, timeoutMs = 30000, env: NodeJS.ProcessEnv = process.env): Promise<Run> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, env });
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

const TSCONFIG = JSON.stringify({
  compilerOptions: { strict: true, noEmit: true, target: "ES2022", lib: ["ES2022", "DOM"], moduleDetection: "force", skipLibCheck: true, types: [] },
  files: ["main.ts"],
});

function typecheck(code: string): Promise<Run> {
  return cached(`tsc5.4.5\0${TSCONFIG}\0${code}`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "tsv-"));
    try {
      writeFileSync(join(dir, "main.ts"), code);
      writeFileSync(join(dir, "tsconfig.json"), TSCONFIG);
      return await sh("node", [join(TS_DIR!, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json", "--pretty", "false"], dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, (r) => !r.timedOut);
}

function pageRun(code: string): Promise<PageRun> {
  return cached(`page-ts-es2022\0${code}`, async () => {
    const runner = join(process.cwd(), "scripts", "lib", "js-page-runner.mjs");
    const r = await sh("node", [runner], process.cwd(), JSON.stringify({ code, technology: "typescript" }), 10000, { ...process.env, TS_DIR });
    if (r.timedOut) return { logs: [], tests: [], error: "timed out (the page stops at 3 s)", transpileError: null };
    try { return JSON.parse(r.stdout) as PageRun; }
    catch { return { logs: [], tests: [], error: "runner failed: " + r.stderr.slice(0, 300), transpileError: null }; }
  }, (r) => !r.error?.startsWith("runner failed"));
}

const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();

function quotedBlocks(md: string): string[] {
  return [...md.matchAll(/^(~~~|```)\s*(text|output|console|txt|plaintext)\s*\n([\s\S]*?)^\1\s*$/gm)].map((m) => norm(m[3]));
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function loadItems(): Promise<Item[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir).filter((f) => /^typescript-augments-ultra-\d+\.ts$/.test(f)).filter((f) => !onlyFile || f === onlyFile).sort();
  const items: Item[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const a of (mod.default ?? []) as Record<string, any>[]) {
      if (onlyTitle && !a.title.toLowerCase().includes(onlyTitle.toLowerCase())) continue;
      items.push({ file: f, title: a.title, answer: a.answer ?? "", examples: a.examples ?? [] });
    }
  }
  return items;
}

async function main() {
  if (!TS_DIR || !existsSync(join(TS_DIR, "node_modules", "typescript", "package.json"))) {
    console.log("✖ Set TS_DIR to a folder where `npm i typescript@5.4.5` was run.");
    process.exit(1);
  }
  const items = await loadItems();
  const jobs = items.flatMap((it) => it.examples.map((ex, idx) => ({ it, ex, idx })));
  const problems: string[] = [];
  let done = 0;
  await pool(jobs, JOBS, async ({ it, ex, idx }) => {
    const where = `${it.file} ${it.title.slice(0, 60)} example ${idx + 1}`;
    const tc = await typecheck(ex.code);
    if (tc.timedOut) problems.push(`${where}: tsc timed out`);
    else if (tc.code !== 0) problems.push(`${where}: tsc --strict fails (use // @ts-expect-error above a line that is meant to error):\n      ${(tc.stdout + tc.stderr).trim().split("\n").slice(0, 5).join("\n      ")}`);
    if (ex.runnable !== false) {
      const p = await pageRun(ex.code);
      if (p.transpileError) problems.push(`${where}: ${p.transpileError}`);
      if (p.error) problems.push(`${where}: throws in the page: ${p.error}`);
      for (const t of p.tests.filter((t) => !t.passed))
        problems.push(`${where}: in-page test "console.log(${t.expression.slice(0, 50)}); // ${t.expected}" fails: ${t.error ?? "got " + t.actual}`);
      const out = norm(p.logs.map((l) => l.text).join("\n"));
      if (!out) problems.push(`${where}: printed nothing`);
      else if (!quotedBlocks(it.answer).includes(out))
        problems.push(`${where}: the answer does not quote this output in a ~~~text block:\n      ${out.split("\n").slice(0, 10).join("\n      ")}`);
    }
    if (++done % 20 === 0) process.stdout.write(`  ran ${done}/${jobs.length}\n`);
  });

  console.log(`\nChecked ${jobs.length} example(s) for ${items.length} question(s) (tsc 5.4.5 strict + page run).`);
  if (!problems.length) { console.log("✔ Every example type-checks, runs as the page runs it, and its output is quoted."); return; }
  console.log(`\n✖ ${problems.length} problem(s):\n`);
  for (const p of problems.sort()) console.log("  " + p);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
