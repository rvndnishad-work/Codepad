/**
 * Runs every example in the DSA per-language "ultra" files and checks that the
 * docs only claim output that really prints.
 *
 * For each question and language it compiles/runs every example with the real
 * toolchain (python3, node, javac + java, g++ -std=c++17) and checks:
 *
 *   run          exits 0 within 20 s, with nothing on stderr
 *   quoted       the answer quotes the exact stdout of each example inside a
 *                ~~~text (or ~~~output) block, so "Verified" output is real
 *   same-output  example N prints the same stdout in all four languages
 *                (CLAUDE.md §5: ports must behave identically)
 *   inline-tests `print(x)  # v` / `console.log(x); // v` comments, which the
 *                in-page runner turns into tests, match what that line prints
 *
 *   npx tsx scripts/verify-dsa-examples.ts [--file <name>] [--title <substring>] [--jobs 4]
 *
 * Results are cached by code hash in the system temp folder, so a
 * re-run only executes changed examples.
 */
import { execFileSync, spawn } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";
import { DSA_LANGUAGES, type DsaLanguage, type DsaUltraAugment } from "../prisma/data/dsa-augments.types";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const onlyFile = arg("--file");
const onlyTitle = arg("--title");
const JOBS = Number(arg("--jobs") ?? 4);
const CACHE = join(tmpdir(), "dsa-verify-cache");
mkdirSync(CACHE, { recursive: true });

type Run = { stdout: string; stderr: string; code: number | null; timedOut: boolean };

function sh(cmd: string, args: string[], cwd: string, timeoutMs = 20000): Promise<Run> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, env: { ...process.env, JAVA_TOOL_OPTIONS: "" } });
    let stdout = "", stderr = "", timedOut = false;
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    const t = setTimeout(() => { timedOut = true; p.kill("SIGKILL"); }, timeoutMs);
    p.on("close", (code) => { clearTimeout(t); resolve({ stdout, stderr, code, timedOut }); });
  });
}

async function execute(lang: DsaLanguage, code: string): Promise<Run> {
  const key = createHash("sha256").update(lang + "\0" + code).digest("hex").slice(0, 24);
  const cached = join(CACHE, key + ".json");
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, "utf8"));
  const dir = mkdtempSync(join(tmpdir(), "dsa-"));
  let r: Run;
  try {
    if (lang === "python") {
      writeFileSync(join(dir, "main.py"), code);
      r = await sh("python3", ["main.py"], dir);
    } else if (lang === "javascript") {
      writeFileSync(join(dir, "main.js"), code);
      r = await sh("node", ["main.js"], dir);
    } else if (lang === "java") {
      writeFileSync(join(dir, "Main.java"), code);
      const c = await sh("javac", ["-Xlint:none", "Main.java"], dir, 60000);
      r = c.code === 0 ? await sh("java", ["-Xss64m", "Main"], dir) : { ...c, stderr: "COMPILE: " + c.stderr };
    } else {
      writeFileSync(join(dir, "main.cpp"), code);
      const c = await sh("g++", ["-std=c++17", "-O2", "-o", "main", "main.cpp"], dir, 60000);
      r = c.code === 0 ? await sh("./main", [], dir) : { ...c, stderr: "COMPILE: " + c.stderr };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // Java prints "Picked up JAVA_TOOL_OPTIONS" on stderr when that variable is set anywhere.
  r.stderr = r.stderr.replace(/^Picked up JAVA_TOOL_OPTIONS:.*\n?/m, "");
  if (r.code === 0 && !r.timedOut) writeFileSync(cached, JSON.stringify(r));
  return r;
}

const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();

/** Text inside every ~~~text / ~~~output block of an answer. */
function quotedBlocks(md: string): string[] {
  return [...md.matchAll(/^(~~~|```)\s*(text|output|console|txt|plaintext)\s*\n([\s\S]*?)^\1\s*$/gm)].map((m) => norm(m[3]));
}

/**
 * Lines like `print(x)  # 3` or `console.log(x); // 3` become tests in the
 * page runner. When every printing statement is a top-level one-liner, the
 * n-th annotated print maps to the n-th output line, so check it.
 */
function inlineTests(lang: DsaLanguage, code: string, stdout: string): string[] {
  if (lang !== "python" && lang !== "javascript") return [];
  const printRe = lang === "python" ? /^print\(/ : /^console\.log\(/;
  const annRe = lang === "python" ? /^print\((.*)\)\s*#\s*(.+)$/ : /^console\.log\((.*)\);?\s*\/\/\s*(.+)$/;
  const lines = code.split("\n");
  // Only safe when no print happens inside a function, loop or block.
  const prints = lines.filter((l) => /\bprint\(|console\.log\(/.test(l));
  if (prints.some((l) => !printRe.test(l))) return [];
  const out = norm(stdout).split("\n");
  if (out.length !== prints.length) return [];
  const errs: string[] = [];
  prints.forEach((l, i) => {
    const m = annRe.exec(l.trim());
    if (!m) return;
    const want = m[2].trim().replace(/^["']|["']$/g, "");
    const got = out[i].trim();
    if (got !== want && got.replace(/\s+/g, "") !== want.replace(/\s+/g, ""))
      errs.push(`line "${l.trim().slice(0, 60)}" says ${want} but printed ${got}`);
  });
  return errs;
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  for (const tool of [["python3", "--version"], ["node", "--version"], ["javac", "-version"], ["g++", "--version"]])
    try { execFileSync(tool[0], [tool[1]], { stdio: "ignore" }); } catch { console.log(`✖ ${tool[0]} is not installed`); process.exit(1); }

  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir).filter((f) => /^dsa-augments-ultra-\d+\.ts$/.test(f)).filter((f) => !onlyFile || f === onlyFile).sort();
  const jobs: { file: string; a: DsaUltraAugment; lang: DsaLanguage; idx: number; code: string }[] = [];
  const augs: { file: string; a: DsaUltraAugment }[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const a of (mod.default ?? []) as DsaUltraAugment[]) {
      if (onlyTitle && !a.title.toLowerCase().includes(onlyTitle.toLowerCase())) continue;
      augs.push({ file: f, a });
      for (const lang of DSA_LANGUAGES)
        (a.languages?.[lang]?.examples ?? []).forEach((ex, idx) => {
          if (ex.runnable !== false) jobs.push({ file: f, a, lang, idx, code: ex.code });
        });
    }
  }

  const results = new Map<string, Run>();
  let done = 0;
  await pool(jobs, JOBS, async (j) => {
    results.set(`${j.a.title}\0${j.lang}\0${j.idx}`, await execute(j.lang, j.code));
    done++;
    if (done % 20 === 0) process.stdout.write(`  ran ${done}/${jobs.length}\n`);
  });

  const problems: string[] = [];
  for (const { file, a } of augs) {
    const byIdx = new Map<number, Map<DsaLanguage, string>>();
    for (const lang of DSA_LANGUAGES) {
      const b = a.languages?.[lang];
      if (!b) continue;
      const quoted = quotedBlocks(b.answer);
      b.examples.forEach((ex, idx) => {
        if (ex.runnable === false) return;
        const r = results.get(`${a.title}\0${lang}\0${idx}`)!;
        const where = `${file} ${a.title.slice(0, 60)} [${lang}] example ${idx + 1}`;
        if (r.timedOut) { problems.push(`${where}: timed out`); return; }
        if (r.code !== 0) { problems.push(`${where}: exit ${r.code}\n      ${r.stderr.trim().split("\n").slice(0, 6).join("\n      ")}`); return; }
        if (r.stderr.trim()) problems.push(`${where}: wrote to stderr: ${r.stderr.trim().slice(0, 200)}`);
        const out = norm(r.stdout);
        if (!out) problems.push(`${where}: printed nothing`);
        else if (!quoted.includes(out)) problems.push(`${where}: the answer does not quote this output in a ~~~text block:\n      ${out.split("\n").slice(0, 8).join("\n      ")}`);
        for (const e of inlineTests(lang, ex.code, r.stdout)) problems.push(`${where}: ${e}`);
        if (!byIdx.has(idx)) byIdx.set(idx, new Map());
        byIdx.get(idx)!.set(lang, out);
      });
    }
    for (const [idx, outs] of byIdx) {
      const distinct = new Set(outs.values());
      if (distinct.size > 1)
        problems.push(`${file} ${a.title.slice(0, 60)} example ${idx + 1}: languages print different output:\n` +
          [...outs].map(([l, o]) => `      ${l}: ${o.split("\n").slice(0, 3).join(" | ")}`).join("\n"));
    }
  }

  console.log(`\nRan ${jobs.length} example(s) for ${augs.length} question(s).`);
  if (!problems.length) { console.log("✔ Every example runs, prints the same in all four languages, and its output is quoted."); return; }
  console.log(`\n✖ ${problems.length} problem(s):\n`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
