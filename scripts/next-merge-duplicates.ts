/**
 * Next.js ULTRA — merge duplicate-variant questions into one canonical each.
 * For every variant this:
 *   1. removes it from its seed source (prisma/data/curated/nextjs.json and nextjs-2.json),
 *   2. deletes the DB row (match {title, technology} so it is idempotent; comments cascade),
 *   3. records a redirect (variant slug -> canonical slug).
 * Orphaned nextjs-augments*.ts entries for deleted titles become harmless no-ops.
 *
 * Writes the redirect list to src/lib/next-merge-redirects.ts (spread into
 * next.config.ts). Idempotent.
 *
 *   npx tsx scripts/next-merge-duplicates.ts [--dry]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

// canonical title (kept) -> variant titles (merged away + redirected)
const MERGES: Record<string, string[]> = {
  "What is the difference between Server Components and Client Components in Next.js?": [
    "How do Server and Client Components compose in Next.js?"
  ],
  "What is the difference between layout.js and template.js in Next.js?": [
    "What are layouts and nested layouts in the Next.js App Router?"
  ],
  "What are parallel routes (@slot) in Next.js and when would you use them?": [
    "Parallel routes (@slot) — how do you build a dashboard with independent slots?"
  ],
  "What are intercepting routes in Next.js and what are they used for?": [
    "Intercepting routes — how do you build an Instagram-style modal?"
  ],
  "What is loading.js in Next.js and how does Suspense streaming work?": [
    "What is streaming SSR with Suspense in Next.js?",
    "How do you handle loading and error states for data fetching in Next.js?"
  ],
  "What is Partial Prerendering (PPR) in Next.js?": [
    "Partial Prerendering (PPR) — how do you enable it incrementally?"
  ],
  "What is the difference between static and dynamic rendering in the Next.js App Router?": [
    "How does Next.js decide between static and dynamic rendering at build time?"
  ],
  "How does fetch caching work in the Next.js App Router (force-cache, no-store, revalidate)?": [
    "What is the Data Cache in Next.js and how do you opt out of it?"
  ],
  "What is on-demand revalidation in Next.js (revalidatePath / revalidateTag)?": [
    "revalidateTag vs revalidatePath — when to use which?",
    "How do you revalidate data after a mutation in Next.js?"
  ],
  "What changed about caching defaults in Next.js 15?": [
    "Caching defaults in Next 15 — what is no longer cached by default?"
  ],
  "What are Route Handlers in Next.js and how do they differ from Pages API routes?": [
    "How do you read request data and return responses in a Next.js Route Handler?"
  ],
  "How does next/font work and why does it improve performance?": [
    "next/font — how does it eliminate layout shift and external requests?"
  ],
  "How do environment variables work in Next.js (the NEXT_PUBLIC_ prefix)?": [
    "What is the difference between build-time and runtime environment variables in Next.js?"
  ],
  "What is Turbopack in Next.js and how does it compare to Webpack?": [
    "Turbopack — why is it 10x faster than Webpack in Next.js 15?",
    "Migrating Webpack config to Turbopack — what breaks?",
    "How do you run Turbopack locally — `next dev --turbo` vs default?"
  ],
  "How do you handle instrumentation and observability in Next.js (instrumentation.ts)?": [
    "instrumentation.ts — what changed for observability in Next 15?",
    "Observability with OpenTelemetry in Next 15 — how is OTEL wired?"
  ],
  "What are Cache Components in Next.js 16 and how does the 'use cache' directive work?": [
    "What does `use cache` unlock in Next.js 15?"
  ],
  "What is proxy.ts in Next.js 16 and how do you migrate from middleware.ts?": [
    "Middleware in Next 15 — what breaks from the 14 upgrade?"
  ],
  "How does prefetching and navigation caching work in Next.js 16?": [
    "What is prefetching in Next.js and how does next/link prefetch routes?"
  ],
  "How do you enable and evaluate the React Compiler in Next.js 16?": [
    "next.config `reactCompiler` — should you enable the React Compiler?"
  ]
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "question";

async function main() {
  const variantTitles = Object.values(MERGES).flat();
  const dataDir = join(process.cwd(), "prisma", "data", "curated");

  // 1. validate canonicals exist
  for (const canon of Object.keys(MERGES)) {
    const c = await prisma.prepQuestion.findFirst({ where: { title: canon, technology: "nextjs" }, select: { id: true } });
    if (!c) console.log(`⚠ CANONICAL MISSING: ${canon}`);
  }

  // 2. remove variants from the curated seed files
  const removeSet = new Set(variantTitles);
  for (const f of ["nextjs.json", "nextjs-2.json"]) {
    const p = join(dataDir, f);
    const raw = readFileSync(p, "utf8");
    const arr = JSON.parse(raw) as { title: string }[];
    const kept = arr.filter((q) => !removeSet.has(q.title));
    const indent = /\n( +)"/.exec(raw)?.[1].length ?? 2;
    console.log(`${f}: ${arr.length} -> ${kept.length} (removed ${arr.length - kept.length})`);
    if (!DRY) writeFileSync(p, JSON.stringify(kept, null, indent) + (raw.endsWith("\n") ? "\n" : ""));
  }

  // 3. delete DB rows + collect redirects (slug computed deterministically so a
  //    redirect is recorded even if the row was already deleted in a prior run)
  const redirects: { from: string; to: string }[] = [];
  for (const [canon, variants] of Object.entries(MERGES)) {
    const canonRow = await prisma.prepQuestion.findFirst({ where: { title: canon, technology: "nextjs" }, select: { slug: true } });
    const canonSlug = canonRow?.slug ?? slugify(canon);
    for (const v of variants) {
      const row = await prisma.prepQuestion.findFirst({
        where: { title: v, technology: "nextjs" },
        select: { id: true, slug: true, _count: { select: { comments: true } } },
      });
      const fromSlug = row?.slug ?? slugify(v);
      redirects.push({ from: `/interview-question/${fromSlug}`, to: `/interview-question/${canonSlug}` });
      if (!row) { console.log(`  (already merged) ${v}`); continue; }
      if (DRY) { console.log(`  would delete ${row.slug} -> ${canonSlug}`); continue; }
      await prisma.prepQuestion.delete({ where: { id: row.id } });
      console.log(`  deleted ${row.slug} -> ${canonSlug} (cascaded ${row._count.comments} comments)`);
    }
  }

  // 4. write redirect module (merge with any prior, dedup by `from`)
  const redirPath = join(process.cwd(), "src", "lib", "next-merge-redirects.ts");
  let existing: { from: string; to: string }[] = [];
  try {
    const prev = readFileSync(redirPath, "utf8");
    const m = prev.match(/= (\[[\s\S]*?\])\.map/);
    if (m) existing = JSON.parse(m[1]);
  } catch { /* first run */ }
  const byFrom = new Map(existing.map((r) => [r.from, r]));
  for (const r of redirects) byFrom.set(r.from, r);
  const all = [...byFrom.values()];
  const body =
    `// AUTO-GENERATED by scripts/next-merge-duplicates.ts — merged duplicate Next.js\n` +
    `// questions redirect to their canonical pages. Spread into next.config redirects().\n` +
    `export const nextMergeRedirects = ${JSON.stringify(all, null, 2)}.map((r) => ({\n` +
    `  source: r.from,\n  destination: r.to,\n  permanent: true,\n}));\n`;
  if (!DRY) writeFileSync(redirPath, body);
  console.log(`\n${DRY ? "(dry run) would write" : "Wrote"} ${all.length} redirects -> src/lib/next-merge-redirects.ts`);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
