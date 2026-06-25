/**
 * React Phase R0 — merge duplicate-variant questions into one canonical each.
 * For every variant this:
 *   1. removes it from question-bank.json[reactjs] (its seed source),
 *   2. deletes the DB row (match {slug,title} so it's idempotent; comments cascade),
 *   3. records a redirect (variant slug → canonical slug).
 * The 2 seed-interview-questions.ts variants are removed from that file by hand.
 * Orphaned react-augments*.ts entries for deleted titles become harmless no-ops.
 *
 * Writes the redirect list to src/lib/react-merge-redirects.ts (spread into
 * next.config.ts). Idempotent.
 *
 *   npx tsx scripts/react-merge-duplicates.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// canonical title (kept) → variant titles (merged away + redirected)
const MERGES: Record<string, string[]> = {
  "What is the purpose of the `key` prop when rendering lists in React?": [
    "What is the significance of the `key` prop when rendering lists in React?",
    "What are keys in React lists?",
    "What is the purpose of `key` prop when rendering lists in React?",
    "What is the role of a 'key' prop when rendering lists in React?",
  ],
  "What is 'prop drilling' and how can it be avoided?": [
    "Explain the concept of 'prop drilling' and how can it be avoided?",
    "Explain 'prop drilling' and how to mitigate it.",
    "Explain the concept of 'prop drilling' and how to mitigate it.",
  ],
  "What is the difference between `useState` and `useReducer`?": [
    "Differentiate between `useState` and `useReducer` hooks.",
    "Explain the difference between `useState` and `useReducer`.",
  ],
  "What is the Virtual DOM in React?": [
    "Explain the virtual DOM and how React uses it", // seed-iq
    "Explain the Virtual DOM in React.",
  ],
  "What is the difference between controlled and uncontrolled components?": [
    "What is the difference between a controlled and an uncontrolled component?",
    "Differentiate between controlled and uncontrolled components.",
    "Explain the concept of 'uncontrolled components'.",
  ],
  "Why must React state updates be immutable?": [
    "Explain the concept of immutability in React state management.",
    "Why should we not update state directly?",
    "What is the concept of immutability in React state management?",
  ],
  "How does React handle events?": [
    "Explain how React handles events.",
    "Explain how event handling works in React.",
  ],
  "What is `React.memo` and when would you use it?": [
    "What is the purpose of `React.memo`?",
  ],
  "What is the difference between useMemo and useCallback?": [
    "What is useMemo and when should you use it?", // seed-iq
    "When would you use `useMemo` or `useCallback`?",
  ],
  "Explain the concept of 'lifting state up' in React.": [
    "Explain the concept of 'lifting state up'.",
  ],
  "Explain the concept of 'unidirectional data flow' in React.": [
    "Describe the concept of unidirectional data flow in React.",
  ],
  "What are React Developer Tools and how do you use them?": [
    "What are React Developer Tools?",
  ],
  "What are React custom hooks and when should you use them?": [
    "What are custom hooks and why would you create one?",
  ],
  "How do you manage global state in a large React application?": [
    "How do you handle global state management in a large React application?",
  ],
  "How do you debug React applications?": [
    "Explain how to debug React applications.",
  ],
  "What are Higher-Order Components (HOCs) in React?": [
    "Explain the concept of Higher-Order Components (HOCs) in React.",
  ],
  "What is the Context API in React and when would you use it?": [
    "What is the Context API in React?",
  ],
  "What is the purpose of the `deps` array in `useEffect` and `useCallback`?": [
    "What is the purpose of the `deps` array in `useEffect`?",
    "What is the significance of the `deps` array in `useEffect`?",
    "What is dependency array in `useEffect` and `useCallback`?",
  ],
  "What is the purpose of `React.StrictMode`?": [
    "What is Strict Mode in React?",
  ],
  "What are React's design principles?": [
    "What are the core principles behind React's design?",
  ],
  "How do you prevent unnecessary re-renders in functional components?": [
    "How do you prevent re-renders in functional components?",
  ],
};

const SEED_IQ_VARIANTS = new Set([
  "Explain the virtual DOM and how React uses it",
  "What is useMemo and when should you use it?",
]);

async function main() {
  const variantTitles = Object.values(MERGES).flat();
  const dataDir = join(process.cwd(), "prisma", "data");

  // 1. validate canonicals exist
  for (const canon of Object.keys(MERGES)) {
    const c = await prisma.prepQuestion.findFirst({ where: { title: canon, technology: "reactjs" }, select: { id: true } });
    if (!c) console.log(`⚠ CANONICAL MISSING: ${canon}`);
  }

  // 2. remove variants from question-bank.json[reactjs]
  const qbPath = join(dataDir, "question-bank.json");
  const qbRaw = readFileSync(qbPath, "utf8");
  const qb = JSON.parse(qbRaw);
  const before = qb.reactjs.length;
  const removeSet = new Set(variantTitles.filter((t) => !SEED_IQ_VARIANTS.has(t)));
  qb.reactjs = qb.reactjs.filter((q: any) => !removeSet.has(q.title));
  const indent = /\n( +)"/.exec(qbRaw)?.[1].length ?? 2;
  writeFileSync(qbPath, JSON.stringify(qb, null, indent));
  console.log(`question-bank.json[reactjs]: ${before} → ${qb.reactjs.length} (removed ${before - qb.reactjs.length})`);

  // 3. delete DB rows + collect redirects
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
      await prisma.prepQuestion.delete({ where: { id: row.id } });
      redirects.push({ from: `/interview-question/${row.slug}`, to: `/interview-question/${c.slug}` });
      console.log(`  deleted ${row.slug} → ${c.slug} (cascaded ${row._count.comments} comments)`);
    }
  }

  // 4. write redirect module (merge with any prior, dedup by `from`)
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
    `// AUTO-GENERATED by scripts/react-merge-duplicates.ts — merged duplicate React\n` +
    `// questions redirect to their canonical pages. Spread into next.config redirects().\n` +
    `export const reactMergeRedirects = ${JSON.stringify(all, null, 2)}.map((r) => ({\n` +
    `  source: r.from,\n  destination: r.to,\n  permanent: true,\n}));\n`;
  writeFileSync(redirPath, body);
  console.log(`\nWrote ${all.length} redirects → src/lib/react-merge-redirects.ts`);
  console.log("MANUAL: remove these 2 from prisma/seed-interview-questions.ts:", [...SEED_IQ_VARIANTS]);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
