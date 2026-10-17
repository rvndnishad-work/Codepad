/**
 * Runs every example in the System Design or AI Engineering "ultra" files and
 * checks that the docs only claim output that really prints.
 *
 * An example is either one program ({ tech, code }) or the same program in
 * several languages ({ variants: [{ tech, code }, ...] }, CLAUDE.md §5).
 * Every program runs with the real toolchain:
 *
 *   node     node main.js            (node 22)
 *   python   python3.12 main.py
 *   go       go run main.go
 *   java     javac Main.java && java Main
 *
 * Checks:
 *   run          exits 0 within 30 s, nothing on stderr
 *   same-output  all variants of one example print exactly the same stdout
 *   quoted       the answer quotes that stdout in a ~~~text block
 *   order        for variants, "node" comes first (CLAUDE.md §5)
 *
 * These sections do not run code in the page, so nothing is exempt: an
 * example that needs a network, a server or an API key is rewritten to run
 * against an in-process stub, and says so.
 *
 *   npx tsx scripts/verify-variant-examples.ts --section <system-design|ai> [--file <name>] [--title <substring>] [--jobs 4]
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
const PREFIX = arg("--section");
if (PREFIX !== "system-design" && PREFIX !== "ai") {
  console.log("Usage: npx tsx scripts/verify-variant-examples.ts --section <system-design|ai> [--file <name>] [--title <substring>]");
  process.exit(1);
}
const onlyFile = arg("--file")?.split("/").pop(); // "prisma/data/x.ts" or "x.ts"
const onlyTitle = arg("--title");
const JOBS = Number(arg("--jobs") ?? 4);
const CACHE = join(tmpdir(), "variant-verify-cache");
mkdirSync(CACHE, { recursive: true });
const GO = existsSync("/usr/local/go/bin/go") ? "/usr/local/go/bin/go" : "go";

type Program = { tech: string; code: string };
type Example = { label?: string; tech?: string; code?: string; variants?: Program[] };
type Run = { stdout: string; stderr: string; code: number | null; timedOut: boolean };

function sh(cmd: string, args: string[], cwd: string, timeoutMs = 30000): Promise<Run> {
  return new Promise((resolve) => {
    const env = { ...process.env, PYTHONHASHSEED: "0", GOFLAGS: "-mod=mod", GOCACHE: join(tmpdir(), "go-build-cache"), GOPATH: join(tmpdir(), "gopath") };
    delete (env as Record<string, string | undefined>).JAVA_TOOL_OPTIONS;
    const p = spawn(cmd, args, { cwd, env });
    let stdout = "", stderr = "", timedOut = false;
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    const t = setTimeout(() => { timedOut = true; p.kill("SIGKILL"); }, timeoutMs);
    p.on("close", (code) => { clearTimeout(t); resolve({ stdout, stderr, code, timedOut }); });
  });
}

async function execute({ tech, code }: Program): Promise<Run> {
  const file = join(CACHE, createHash("sha256").update(tech + "\0" + code).digest("hex").slice(0, 24) + ".json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const dir = mkdtempSync(join(tmpdir(), "var-"));
  let r: Run;
  try {
    if (tech === "node") { writeFileSync(join(dir, "main.js"), code); r = await sh("node", ["main.js"], dir); }
    else if (tech === "python") { writeFileSync(join(dir, "main.py"), code); r = await sh("python3.12", ["main.py"], dir); }
    else if (tech === "go") { writeFileSync(join(dir, "main.go"), code); r = await sh(GO, ["run", "main.go"], dir, 120000); }
    else if (tech === "java") {
      writeFileSync(join(dir, "Main.java"), code);
      const c = await sh("javac", ["-Xlint:none", "Main.java"], dir, 90000);
      r = c.code === 0 ? await sh("java", ["Main"], dir) : { ...c, stderr: "COMPILE: " + c.stderr };
    } else r = { stdout: "", stderr: `unsupported tech "${tech}" (use node, python, go or java)`, code: 1, timedOut: false };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  r.stderr = r.stderr.replace(/^Picked up JAVA_TOOL_OPTIONS:.*\n?/m, "");
  if (r.code === 0 && !r.timedOut) writeFileSync(file, JSON.stringify(r));
  return r;
}

const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
const quotedBlocks = (md: string) =>
  [...md.matchAll(/^(~~~|```)\s*(text|output|console|txt|plaintext)\s*\n([\s\S]*?)^\1\s*$/gm)].map((m) => norm(m[3]));

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  const dir = join(process.cwd(), "prisma", "data");
  const pattern = new RegExp(`^${PREFIX}-augments-ultra-\\d+\\.ts$`);
  const files = readdirSync(dir).filter((f) => pattern.test(f)).filter((f) => !onlyFile || f === onlyFile).sort();
  const problems: string[] = [];
  const jobs: { where: string; answer: string; programs: Program[] }[] = [];
  let questions = 0;
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const a of (mod.default ?? []) as { title: string; answer?: string; examples?: Example[] }[]) {
      if (onlyTitle && !a.title.toLowerCase().includes(onlyTitle.toLowerCase())) continue;
      questions++;
      (a.examples ?? []).forEach((ex, idx) => {
        const where = `${f} ${a.title.slice(0, 60)} example ${idx + 1}`;
        const programs = ex.variants?.length ? ex.variants : ex.code ? [{ tech: ex.tech ?? "", code: ex.code }] : [];
        if (!programs.length) { problems.push(`${where}: no code`); return; }
        if (ex.variants?.length && ex.variants[0].tech !== "node") problems.push(`${where}: the node variant must come first`);
        jobs.push({ where, answer: a.answer ?? "", programs });
      });
    }
  }

  let done = 0;
  await pool(jobs, JOBS, async ({ where, answer, programs }) => {
    const outs = new Map<string, string>();
    for (const p of programs) {
      const r = await execute(p);
      const w = `${where} [${p.tech}]`;
      if (r.timedOut) { problems.push(`${w}: timed out`); continue; }
      if (r.code !== 0) { problems.push(`${w}: exit ${r.code}\n      ${r.stderr.trim().split("\n").slice(-6).join("\n      ")}`); continue; }
      if (r.stderr.trim()) problems.push(`${w}: wrote to stderr: ${r.stderr.trim().slice(0, 200)}`);
      const out = norm(r.stdout);
      if (!out) problems.push(`${w}: printed nothing`);
      outs.set(p.tech, out);
    }
    const distinct = new Set(outs.values());
    if (distinct.size > 1)
      problems.push(`${where}: variants print different output:\n` + [...outs].map(([t, o]) => `      ${t}: ${o.split("\n").slice(0, 3).join(" | ")}`).join("\n"));
    const out = [...outs.values()][0];
    if (out && !quotedBlocks(answer).includes(out))
      problems.push(`${where}: the answer does not quote this output in a ~~~text block:\n      ${out.split("\n").slice(0, 10).join("\n      ")}`);
    if (++done % 10 === 0) process.stdout.write(`  ran ${done}/${jobs.length}\n`);
  });

  console.log(`\nRan ${jobs.length} example(s) for ${questions} question(s).`);
  if (!problems.length) { console.log("✔ Every example runs, every variant prints the same, and the output is quoted."); return; }
  console.log(`\n✖ ${problems.length} problem(s):\n`);
  for (const p of problems.sort()) console.log("  " + p);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
