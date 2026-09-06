/**
 * React Phase R2 — merge the second wave of duplicate-variant questions.
 *
 * The first pass (scripts/react-merge-duplicates.ts) only knew how to strip
 * variants out of prisma/data/question-bank.json. This wave's 9 variants all
 * live in prisma/data/curated/reactjs-2.json, which is seeded by
 * seed-curated-questions.ts, so this script also edits curated/*.json.
 *
 * For every variant it:
 *   1. removes it from whichever seed file defines it (curated/*.json and/or
 *      question-bank.json[reactjs]),
 *   2. deletes the DB row (matched on {title, technology}; comments cascade),
 *   3. records a redirect (variant slug -> canonical slug).
 *
 * Redirects are merged into src/lib/react-merge-redirects.ts (already spread
 * into next.config.ts) so previously-published URLs keep resolving.
 *
 * Idempotent: a second run finds no rows to delete and rewrites the same file.
 *
 *   npx tsx scripts/react-merge-duplicates-2.ts [--dry]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

/**
 * canonical title (kept) -> variant titles (merged away + redirected).
 *
 * Deliberately NOT merged, despite topic overlap — each has a genuinely
 * different angle and they cross-link instead:
 *   - "useFormStatus & useActionState — modern form handling in React 19"
 *     (umbrella) vs. the two focused per-hook docs
 *   - "Server Actions — ... Next.js 15?" (framework-framed) vs.
 *     "What are Server Actions and the `\"use server\"` directive in React 19?"
 *   - "Error Boundaries with RSC" vs. "What can and can't an Error Boundary
 *     catch?" vs. "What are Error Boundaries in React?" (intro/semantics/RSC)
 *   - "React Compiler" vs. "React Compiler pitfalls"
 *   - "cache() and fetch memoization" vs. "Compare render-as-you-fetch, ..."
 */
const MERGES: Record<string, string[]> = {
  "What do `startTransition` and `useTransition` actually do under the hood?": [
    "useTransition vs startTransition — when to use which?",
  ],
  "What are Effect Events (`useEffectEvent`) and what problem do they solve?": [
    "useEffectEvent — separating reactive and non-reactive logic in Effects",
  ],
  "How does `useOptimistic` enable optimistic UI in React 19?": [
    "useOptimistic — how do you build instant UI for Server Actions?",
  ],
  "How did ref handling change in React 19 (ref as a prop, forwardRef, ref cleanup)?": [
    "React 19 ref as prop & ref cleanup — the new cleanup return from ref callbacks",
    "forwardRef removal — how do refs work as props in React 19?",
  ],
  "What is `useDeferredValue` and how does it differ from debouncing?": [
    "Concurrent Rendering — useDeferredValue and time slicing in React 19",
  ],
  "What does the `use()` hook do, and why is it special?": [
    "The `use()` API with Suspense — how do you unwrap promises in render?",
  ],
  "How does streaming SSR with selective hydration work?": [
    "Suspense streaming in React 19 & Next.js 15 — how does HTML stream?",
  ],
  "What changed with Context in React 19 (`<Context>` as a provider)?": [
    "createContext vs use(Context) — new context consumption in React 19",
  ],
};

type Q = { title: string; technology?: string };

async function main() {
  const dataDir = join(process.cwd(), "prisma", "data");
  const curatedDir = join(dataDir, "curated");
  const variantTitles = Object.values(MERGES).flat();
  const removeSet = new Set(variantTitles);

  // ── 1. validate every canonical and variant is a real, known title ────────
  let fatal = false;
  for (const canon of Object.keys(MERGES)) {
    const c = await prisma.prepQuestion.findFirst({ where: { title: canon, technology: "reactjs" }, select: { id: true } });
    if (!c) { console.log(`✖ CANONICAL MISSING IN DB: ${canon}`); fatal = true; }
  }
  if (fatal) {
    console.log("\nRefusing to run — a canonical target does not exist, so variants would be orphaned.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── 2. strip variants out of the seed files that define them ─────────────
  // curated/*.json are top-level arrays; question-bank.json is keyed by tech.
  let removedFromSeeds = 0;
  for (const f of readdirSync(curatedDir).filter((f) => f.endsWith(".json"))) {
    const p = join(curatedDir, f);
    const raw = readFileSync(p, "utf8");
    const arr = JSON.parse(raw) as Q[];
    if (!Array.isArray(arr)) continue;
    const next = arr.filter((q) => !removeSet.has(q.title));
    if (next.length === arr.length) continue;
    const indent = /\n( +)"/.exec(raw)?.[1].length ?? 2;
    if (!DRY) writeFileSync(p, JSON.stringify(next, null, indent) + (raw.endsWith("\n") ? "\n" : ""));
    console.log(`curated/${f}: ${arr.length} → ${next.length}`);
    removedFromSeeds += arr.length - next.length;
  }

  const qbPath = join(dataDir, "question-bank.json");
  const qbRaw = readFileSync(qbPath, "utf8");
  const qb = JSON.parse(qbRaw);
  const before = qb.reactjs.length;
  qb.reactjs = qb.reactjs.filter((q: Q) => !removeSet.has(q.title));
  if (qb.reactjs.length !== before) {
    const indent = /\n( +)"/.exec(qbRaw)?.[1].length ?? 2;
    if (!DRY) writeFileSync(qbPath, JSON.stringify(qb, null, indent));
    console.log(`question-bank.json[reactjs]: ${before} → ${qb.reactjs.length}`);
    removedFromSeeds += before - qb.reactjs.length;
  }
  console.log(`Removed ${removedFromSeeds}/${variantTitles.length} variants from seed files.`);

  // ── 3. delete DB rows + collect redirects ────────────────────────────────
  const redirects: { from: string; to: string }[] = [];
  for (const [canon, variants] of Object.entries(MERGES)) {
    const c = await prisma.prepQuestion.findFirst({ where: { title: canon, technology: "reactjs" }, select: { slug: true } });
    if (!c) continue;
    for (const v of variants) {
      const row = await prisma.prepQuestion.findFirst({
        where: { title: v, technology: "reactjs" },
        select: { id: true, slug: true, _count: { select: { comments: true } } },
      });
      if (!row) { console.log(`  (already merged) ${v}`); continue; }
      redirects.push({ from: `/interview-question/${row.slug}`, to: `/interview-question/${c.slug}` });
      if (!DRY) await prisma.prepQuestion.delete({ where: { id: row.id } });
      console.log(`  ${DRY ? "would delete" : "deleted"} ${row.slug} → ${c.slug} (${row._count.comments} comments cascade)`);
    }
  }

  // ── 4. merge into the shared redirect module (dedup by `from`) ───────────
  const redirPath = join(process.cwd(), "src", "lib", "react-merge-redirects.ts");
  let existing: { from: string; to: string }[] = [];
  try {
    const prev = readFileSync(redirPath, "utf8");
    const m = prev.match(/\[([\s\S]*)\]/);
    if (m) existing = JSON.parse("[" + m[1].replace(/,\s*$/, "") + "]");
  } catch { /* first run */ }
  const byFrom = new Map(existing.map((r) => [r.from, r]));
  for (const r of redirects) byFrom.set(r.from, r);
  const all = [...byFrom.values()];
  const body =
    `// AUTO-GENERATED by scripts/react-merge-duplicates.ts and -2.ts — merged\n` +
    `// duplicate React questions redirect to their canonical pages. Spread into\n` +
    `// next.config redirects().\n` +
    `export const reactMergeRedirects = ${JSON.stringify(all, null, 2)}.map((r) => ({\n` +
    `  source: r.from,\n  destination: r.to,\n  permanent: true,\n}));\n`;
  if (!DRY) writeFileSync(redirPath, body);
  console.log(`\n${DRY ? "[dry] " : ""}Wrote ${all.length} redirects (${redirects.length} new) → src/lib/react-merge-redirects.ts`);

  const remaining = await prisma.prepQuestion.count({ where: { technology: "reactjs" } });
  console.log(`reactjs questions remaining: ${remaining}`);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
