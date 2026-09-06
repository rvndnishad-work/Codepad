/**
 * Build / refresh the React "ultra" rewrite progress ledger.
 *
 * Reads every technology='reactjs' question, buckets it by topic, assigns a
 * batch, and reconciles against what the ultra files actually define — so a
 * later session can resume by skipping rows already marked done.
 *
 * Status is DERIVED, never hand-edited:
 *   pending  — no ultra entry for this title yet
 *   drafted  — an ultra entry exists
 *   checked  — ...and check-react-ultra.ts passed (recorded by --checks-passed)
 *   done     — ...and its examples executed (recorded by --examples-passed)
 *
 *   npx tsx scripts/react-ultra-ledger.ts [--checks-passed] [--examples-passed]
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const prisma = new PrismaClient();
const JSON_PATH = join(process.cwd(), "prisma", "data", "react-ultra-progress.json");
const MD_PATH = join(process.cwd(), "prisma", "data", "react-ultra-progress.md");

const PILOT = [
  "What is the role of `react-dom`?",
  "How do you handle side effects in functional components?",
  "What is the difference between `useState` and `useReducer`?",
  'What is "tearing" in concurrent React?',
  "React Compiler — how does auto-memoization work in React 19?",
];

/** Ordered topic buckets — first match wins. Keeps cross-linked docs together. */
const BUCKETS: [string, RegExp][] = [
  ["fundamentals", /what is react|main features|advantages of using react|design principles|element and component|react-dom|create-react-app|bundler|proptypes|developer tools|debug/i],
  ["jsx-components", /jsx|fragment|component[s]? in react|are react components|composition|render props|higher-order|hoc/i],
  ["hooks-core", /usestate|usereducer|custom hook|rules of hooks|usedebugvalue|useid/i],
  ["effects", /useeffect|side effect|cleanup|effect event|stale closure|uselayouteffect|memory leak|async|race condition|asynchronous operations/i],
  ["state-context", /context|prop drilling|lifting state|global state|unidirectional|immutab|state and props|state management|usesyncexternalstore|tearing/i],
  ["performance", /memo|usememo|usecallback|re-render|optimi[sz]|performance|batching|deps array|key prop/i],
  ["forms-events", /form|controlled|uncontrolled|event|action[s]? in react 19|useactionstate|useformstatus|useoptimistic/i],
  ["refs", /useref|forwardref|useimperativehandle|ref handling|ref as a prop/i],
  ["rendering-internals", /virtual dom|reconciliation|fiber|shadow dom|portal|strictmode|lifecycle|element/i],
  ["concurrent", /transition|deferredvalue|concurrent|time slicing|responsive during/i],
  ["suspense-data", /suspense|use\(\)|`use\(\)`|data.?fetch|fetch data|waterfall|render-as-you-fetch|external apis|cache\(\)/i],
  ["ssr-hydration", /ssr|server-side rendering|client-side rendering|hydrat|streaming|metadata|preload|prerender|ppr/i],
  ["rsc-react19", /server component|rsc|use server|use client|server action|react compiler|activity|instrumentation|react 19/i],
  ["errors", /error boundar|error handling|security|xss/i],
  ["arch-tooling", /routing|structure|typescript|test|webpack|large react application/i],
];

const bucketOf = (title: string, tags: string[]) => {
  const hay = `${title} ${tags.join(" ")}`;
  for (const [name, re] of BUCKETS) if (re.test(hay)) return name;
  return "misc";
};

type Row = {
  slug: string;
  title: string;
  difficulty: string;
  bucket: string;
  batch: string;
  status: "pending" | "drafted" | "checked" | "done";
  examples: number;
  hasDescription: boolean;
  hasSeo: boolean;
  hasDiagram: boolean;
  answerChars: number;
  notes?: string;
};

async function ultraTitles() {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir).filter((f) => /^react-augments-ultra.*\.(ts|json)$/.test(f)).sort();
  const map = new Map<string, { file: string; a: any }>();
  for (const f of files) {
    const full = join(dir, f);
    const arr = f.endsWith(".json")
      ? JSON.parse(readFileSync(full, "utf8"))
      : (await import(pathToFileURL(full).href + `?t=${Date.now()}`)).default;
    for (const a of arr ?? []) map.set(a.title, { file: f, a });
  }
  return map;
}

async function main() {
  const rows = await prisma.prepQuestion.findMany({
    where: { technology: "reactjs" },
    select: { slug: true, title: true, difficulty: true, tags: true },
    orderBy: { title: "asc" },
  });

  const prev: Record<string, Row> = existsSync(JSON_PATH)
    ? Object.fromEntries((JSON.parse(readFileSync(JSON_PATH, "utf8")).questions as Row[]).map((r) => [r.title, r]))
    : {};

  const ultra = await ultraTitles();

  // Bucket, then order: pilot first, then by bucket order, difficulty, title.
  const bucketOrder = new Map(BUCKETS.map(([n], i) => [n, i]));
  bucketOrder.set("misc", BUCKETS.length);
  const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

  const enriched = rows.map((r) => {
    let tags: string[] = [];
    try { tags = JSON.parse(r.tags); } catch { /* ignore */ }
    return { ...r, bucket: bucketOf(r.title, tags) };
  });

  const pilot = enriched.filter((r) => PILOT.includes(r.title));
  const missingPilot = PILOT.filter((t) => !pilot.some((p) => p.title === t));
  if (missingPilot.length) console.log("⚠ pilot titles not found:", missingPilot);

  const rest = enriched
    .filter((r) => !PILOT.includes(r.title))
    .sort((a, b) =>
      (bucketOrder.get(a.bucket)! - bucketOrder.get(b.bucket)!) ||
      (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1) ||
      a.title.localeCompare(b.title));

  const ordered = [...pilot, ...rest];
  const out: Row[] = ordered.map((r, i) => {
    const batch = i < PILOT.length ? "ultra-01" : `ultra-${String(Math.floor((i - PILOT.length) / 8) + 2).padStart(2, "0")}`;
    const hit = ultra.get(r.title);
    const a = hit?.a;
    const p = prev[r.title];
    let status: Row["status"] = "pending";
    if (a) {
      status = "drafted";
      if (process.argv.includes("--checks-passed")) status = "checked";
      else if (p && (p.status === "checked" || p.status === "done")) status = p.status;
      if (process.argv.includes("--examples-passed") && (status === "checked" || p?.status === "done")) status = "done";
    }
    return {
      slug: r.slug,
      title: r.title,
      difficulty: r.difficulty,
      bucket: r.bucket,
      batch: hit ? hit.file.replace(/^react-augments-|\.ts$|\.json$/g, "") : batch,
      status,
      examples: a?.examples?.length ?? 0,
      hasDescription: Boolean(a?.description),
      hasSeo: Boolean(a?.seoDescription),
      hasDiagram: /<svg/.test(a?.answer ?? ""),
      answerChars: (a?.answer ?? "").length,
      ...(p?.notes ? { notes: p.notes } : {}),
    };
  });

  const counts = out.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  writeFileSync(JSON_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), total: out.length, counts, questions: out }, null, 2) + "\n");

  // Human-readable companion.
  const byBatch = new Map<string, Row[]>();
  for (const r of out) byBatch.set(r.batch, [...(byBatch.get(r.batch) ?? []), r]);
  const icon = (s: string) => ({ pending: "☐", drafted: "◐", checked: "◑", done: "☑" } as Record<string, string>)[s] ?? "?";
  let md = `# React "ultra" rewrite — progress\n\n`;
  md += `Auto-generated by \`npx tsx scripts/react-ultra-ledger.ts\`. Do not hand-edit.\n\n`;
  md += `**${out.length} questions** — ` + Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") + `\n\n`;
  md += `Resume by taking the first batch whose rows are not all ☑.\n\n`;
  for (const [batch, rs] of [...byBatch.entries()].sort()) {
    md += `## ${batch} — ${rs.filter((r) => r.status === "done").length}/${rs.length} done\n\n`;
    md += `| | Question | Diff | Bucket | Ex | Chars |\n| :-: | :--- | :-- | :-- | :-: | --: |\n`;
    for (const r of rs) md += `| ${icon(r.status)} | ${r.title.replace(/\|/g, "\\|")} | ${r.difficulty} | ${r.bucket} | ${r.examples || "—"} | ${r.answerChars || "—"} |\n`;
    md += `\n`;
  }
  writeFileSync(MD_PATH, md);

  console.log(`Ledger: ${out.length} questions — ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}`);
  console.log(`  → prisma/data/react-ultra-progress.json`);
  console.log(`  → prisma/data/react-ultra-progress.md`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
