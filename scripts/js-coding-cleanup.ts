/**
 * JS Coding bank cleanup — Phase 0 for the "showcase the thought process"
 * practical-coding retrofit of `technology='javascript-coding'`.
 *
 * The raw bank had 190 rows: 40 hand-curated (DSA/Frontend rounds, solid)
 * plus 150 under a non-canonical `round: "Technical"`, riddled with exact
 * and near-duplicates both against the curated 40 AND against each other
 * (e.g. three separate "detect a circular reference" questions). A full
 * audit classified every row as keep / cut / merge, reassigned every kept
 * Technical-round row into a real canonical round (DSA/Frontend/Low-Level
 * Design), and reworded several vague titles into specific, interview-
 * realistic ones. See the project memory for the full audit rationale.
 *
 * This script applies that audit:
 *   1. CUTS — delete rows that are exact/near-duplicates of another kept
 *      row, or too trivial to showcase real problem-solving.
 *   2. MERGES — for each cluster of near-duplicate rows, keep exactly one
 *      (renamed to a clear canonical title, reassigned round/difficulty),
 *      delete the rest.
 *   3. REASSIGNS — for every other kept row, apply its final title (where
 *      reworded) and correct round/difficulty.
 *
 * Matches by exact CURRENT title (idempotent in spirit — a row already
 * renamed to its target title simply won't match the old-title lookup on
 * a second run, so re-running after a partial run is safe; it will just
 * report "not found" for anything already migrated).
 *
 *   npx tsx scripts/js-coding-cleanup.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TECH = "javascript-coding";

const CUTS: string[] = [
  "Apply context shims",
  "Array Chunking",
  "Array Deduplication (Unique)",
  "Array Difference",
  "Array Intersection",
  "Array Shuffle (Fisher-Yates)",
  "Array.prototype.filter Polyfill",
  "Array.prototype.flat Polyfill",
  "Array.prototype.map Polyfill",
  "Array.prototype.reduce Polyfill",
  "Bind context shims",
  "Call context shims",
  "Curry placeholders",
  "Deep Clone Object",
  "Deep Compare / Equals",
  "Deep Merge Objects",
  "Debounce (Leading & Trailing)",
  "Debounce with cancel method",
  "Throttle (Leading & Trailing)",
  "Throttle with cancel method",
  "Throttled click triggers",
  "Promise.all Polyfill",
  "Promise.allSettled Polyfill",
  "Promise.any Polyfill",
  "Promise.race Polyfill",
  "Group By Utility",
  "LRU cache cache clear",
  "LRU cache eviction list",
  "Memoize cache limits",
  "Memoize memory size limits",
  "Limit Async Concurrency",
  "Function once decorator",
  "Event emitter unsubscribe logic",
  "Compose functions list",
  "Pipe functions list",
  "Range Generator",
  "Promise delay helper",
  "Cancellable async delay",
  "String Path Getter",
  "String Path Setter",
  "Unflatten Object",
  "Flatten Object",
  "Promise fallback retry",
  "Sum of odd numbers",
  "Negate predicate check",
  "Batch API fetch requests",
];

type MergeCluster = { keeperOldTitle: string; newTitle: string; newRound: string; newDifficulty: string; deleteTitles: string[] };
const MERGES: MergeCluster[] = [
  {
    keeperOldTitle: "Check Cyclic Reference",
    newTitle: "Detect a Circular Reference in Any Object or Array Graph",
    newRound: "DSA",
    newDifficulty: "medium",
    deleteTitles: ["Check array cyclic references", "JSON serialization circular check"],
  },
  {
    keeperOldTitle: "Convert Snake/Camel Case",
    newTitle: "Convert Between snake_case and camelCase Object Keys (Including Nested Objects)",
    newRound: "Frontend",
    newDifficulty: "medium",
    deleteTitles: ["Convert snake to camel case keys"],
  },
  {
    keeperOldTitle: "LFU cache cache clear",
    newTitle: "Implement an LFU (Least Frequently Used) Cache",
    newRound: "Low-Level Design",
    newDifficulty: "hard",
    deleteTitles: ["LFU cache frequency counters"],
  },
  {
    keeperOldTitle: "Priority Task Runner",
    newTitle: "Build an Async Priority Task Scheduler",
    newRound: "Low-Level Design",
    newDifficulty: "medium",
    deleteTitles: ["Async queue priority tasks"],
  },
  {
    keeperOldTitle: "Promise waterfall flow",
    newTitle: "Run Async Functions in Sequence, Each Using the Previous Result (Promise Waterfall)",
    newRound: "Frontend",
    newDifficulty: "medium",
    deleteTitles: ["Custom promise sequence"],
  },
  {
    keeperOldTitle: "Pick Object Properties",
    newTitle: "Implement pick(obj, paths) Supporting Both Shallow and Nested Paths",
    newRound: "DSA",
    newDifficulty: "medium",
    deleteTitles: ["Pick nested keys"],
  },
  {
    keeperOldTitle: "Omit Object Properties",
    newTitle: "Implement omit(obj, paths) Supporting Both Shallow and Nested Paths",
    newRound: "DSA",
    newDifficulty: "medium",
    deleteTitles: ["Omit nested keys"],
  },
];

type Reassign = { oldTitle: string; newTitle: string; newRound: string; newDifficulty: string };
const REASSIGNS: Reassign[] = [
  { oldTitle: "Array Union", newTitle: "Array Union", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Array subset check", newTitle: "Array subset check", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Array.prototype.forEach Polyfill", newTitle: "Array.prototype.forEach Polyfill", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Async filter utility", newTitle: "Async filter utility", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Async interval clock", newTitle: "Build a Drift-Corrected Interval Clock (setInterval Alone Drifts Over Time)", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Async map limit concurrency", newTitle: "Async map limit concurrency", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Async reduce utility", newTitle: "Async reduce utility", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Binary search implementation", newTitle: "Binary search implementation", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Binary search tree validations", newTitle: "Validate a Binary Search Tree", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Browser window scroll resize handlers", newTitle: "Wire Up Debounced Resize and Throttled Scroll Handlers on a Real Component", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Clear Nullish Values", newTitle: "Clear Nullish Values", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Count occurrences of items", newTitle: "Count Occurrences of Each Element in an Array (Frequency Counter)", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Create lazy evaluator", newTitle: "Create lazy evaluator", newRound: "Frontend", newDifficulty: "hard" },
  { oldTitle: "Create object from key-value pairs", newTitle: "Polyfill Object.fromEntries() — Handle Duplicate and Symbol Keys", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Currying with arbitrary calls", newTitle: "Implement curry(fn) That Supports Any Call Pattern — curry(1)(2)(3), curry(1,2,3), or curry(1,2)(3)", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Custom Array.prototype.flatmap polyfill", newTitle: "Custom Array.prototype.flatmap polyfill", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Custom Object.assign polyfill", newTitle: "Custom Object.assign polyfill", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Custom Object.create polyfill", newTitle: "Custom Object.create polyfill", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Custom Set class with hash", newTitle: "Custom Set class with hash", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "Custom String.prototype.trim polyfill", newTitle: "Custom String.prototype.trim polyfill", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Custom WeakMap reference tracker", newTitle: "Implement a WeakMap-Like API Shape (and Why True Weak References Cannot Be Polyfilled)", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "Custom getElementById traverse", newTitle: "Custom getElementById traverse", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Custom getElementsByClassName traverse", newTitle: "Custom getElementsByClassName traverse", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Custom iterator range loop", newTitle: "Implement a Range Class Using the Iterator Protocol Manually (No Generator Functions Allowed)", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "DOM event delegation target", newTitle: "DOM event delegation target", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "DOM offset absolute coordinate", newTitle: "DOM offset absolute coordinate", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "DOM select elements custom selector", newTitle: "DOM select elements custom selector", newRound: "Low-Level Design", newDifficulty: "hard" },
  { oldTitle: "Document tree depth check", newTitle: "Document tree depth check", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Debounce async promise resolver", newTitle: "Debounce async promise resolver", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Throttle async promise resolver", newTitle: "Throttle async promise resolver", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Throttled API poll client", newTitle: "Throttled API poll client", newRound: "Frontend", newDifficulty: "hard" },
  { oldTitle: "Deep Freeze Object", newTitle: "Deep Freeze Object", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "Deep Map Keys", newTitle: "Deep Map Keys", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Double ended queue structures", newTitle: "Implement a Double-Ended Queue (Deque) From Scratch", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Fetch wrapper auto-retry", newTitle: "Fetch wrapper auto-retry", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Find Last Element", newTitle: "Polyfill Array.prototype.findLast() and findLastIndex()", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Find duplicates in array", newTitle: "Find duplicates in array", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Find missing number", newTitle: "Find missing number", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Find nearest common ancestor node", newTitle: "Find nearest common ancestor node", newRound: "Frontend", newDifficulty: "hard" },
  { oldTitle: "Flatten Array (Iterative)", newTitle: "Flatten a Deeply Nested Array Iteratively (No Recursion, No Call-Stack Limit)", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "Function spy logs", newTitle: "Build a Minimal jest.fn()-Style Spy/Mock Utility", newRound: "Low-Level Design", newDifficulty: "hard" },
  { oldTitle: "Graph bfs traversal", newTitle: "Graph bfs traversal", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Graph dfs traversal", newTitle: "Graph dfs traversal", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "HTML tag tree parser", newTitle: "HTML tag tree parser", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "HTML template compiler", newTitle: "HTML template compiler", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "Immer-like draft proxies", newTitle: "Immer-like draft proxies", newRound: "Low-Level Design", newDifficulty: "easy" },
  { oldTitle: "Immutable set properties", newTitle: "Implement an Immutable setIn(obj, path, value) That Never Mutates the Original", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Index By Utility", newTitle: "Index By Utility", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Infinite scroll list simulator", newTitle: "Infinite scroll list simulator", newRound: "Frontend", newDifficulty: "hard" },
  { oldTitle: "Intersection of multiple arrays", newTitle: "Find the Intersection of N Arrays (Not Just Two)", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "Invert Object Keys", newTitle: "Invert Object Keys", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "JSON schema validator", newTitle: "JSON schema validator", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "JSON string path evaluator", newTitle: "Implement a JSONPath-Lite Query Evaluator (Supports Wildcards Like $.users[*].name)", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "JSON.parse Polyfill", newTitle: "JSON.parse Polyfill", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "JSON.stringify Polyfill", newTitle: "JSON.stringify Polyfill", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "Linked list node lookup", newTitle: "Detect a Cycle in a Linked List (Floyd's Tortoise and Hare)", newRound: "Low-Level Design", newDifficulty: "hard" },
  { oldTitle: "Local storage storage sync events", newTitle: "Sync State Across Tabs Using the storage Event", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "LocalStorage wrapper items TTL", newTitle: "LocalStorage wrapper items TTL", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Merge sorted arrays", newTitle: "Merge sorted arrays", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Merge sparse structures", newTitle: "Efficiently Merge Two Sparse Arrays (With Holes) Without Iterating Every Index", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "Microtask scheduler task runner", newTitle: "Microtask scheduler task runner", newRound: "Low-Level Design", newDifficulty: "hard" },
  { oldTitle: "Move Zeroes to End", newTitle: "Move Zeroes to End", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Object Difference", newTitle: "Object Difference", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Object map transformations", newTitle: "Implement objectMap(obj, fn) — Transform Every Value via Object.entries/fromEntries", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Object prototype clean copy", newTitle: "Safely Merge Untrusted Input Into an Object Without a Prototype-Pollution Vulnerability", newRound: "Low-Level Design", newDifficulty: "hard" },
  { oldTitle: "Object tree traversal", newTitle: "Object tree traversal", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Observable map/filter operators", newTitle: "Observable map/filter operators", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "Partial application bindings", newTitle: "Partial application bindings", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Partition Array", newTitle: "Partition Array", newRound: "DSA", newDifficulty: "medium" },
  { oldTitle: "Priority queue binary heap", newTitle: "Priority queue binary heap", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "Promise Retry with Backoff", newTitle: "Promise Retry with Backoff", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Promise Timeout", newTitle: "Promise Timeout", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Pub-Sub topic structures", newTitle: "Pub-Sub topic structures", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Query String Generator", newTitle: "Query String Generator", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Query String Parser", newTitle: "Query String Parser", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Query text highlighter", newTitle: "Query text highlighter", newRound: "Frontend", newDifficulty: "hard" },
  { oldTitle: "Queue via two stacks", newTitle: "Queue via two stacks", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "Rate Limiter bucket logic", newTitle: "Rate Limiter bucket logic", newRound: "Frontend", newDifficulty: "easy" },
  { oldTitle: "Remove elements in-place", newTitle: "Remove elements in-place", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Rotate array N times", newTitle: "Rotate array N times", newRound: "DSA", newDifficulty: "hard" },
  { oldTitle: "Stack min value retrieval", newTitle: "Design a Stack That Supports getMin() in O(1) (Min Stack)", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Trie autocomplete suffix search", newTitle: "Trie autocomplete suffix search", newRound: "Low-Level Design", newDifficulty: "medium" },
  { oldTitle: "Unzip Array", newTitle: "Unzip Array", newRound: "DSA", newDifficulty: "easy" },
  { oldTitle: "Virtual DOM diff algorithm", newTitle: "Virtual DOM diff algorithm", newRound: "Low-Level Design", newDifficulty: "hard" },
  { oldTitle: "Virtual DOM element mapper", newTitle: "Virtual DOM element mapper", newRound: "Low-Level Design", newDifficulty: "hard" },
  { oldTitle: "WebSocket reconnect logic", newTitle: "WebSocket reconnect logic", newRound: "Frontend", newDifficulty: "medium" },
  { oldTitle: "Wrap methods hook decorator", newTitle: "Wrap methods hook decorator", newRound: "Low-Level Design", newDifficulty: "easy" },
  { oldTitle: "Zip Arrays", newTitle: "Zip Arrays", newRound: "DSA", newDifficulty: "easy" },
];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "question";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  let slug = root;
  let n = 2;
  while (await prisma.prepQuestion.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${root}-${n++}`;
  }
  return slug;
}

async function main() {
  let cutCount = 0;
  let mergeKeptCount = 0;
  let mergeDeletedCount = 0;
  let reassignCount = 0;
  let notFound = 0;

  for (const title of CUTS) {
    const row = await prisma.prepQuestion.findFirst({ where: { title, technology: TECH }, select: { id: true } });
    if (!row) { notFound++; continue; }
    await prisma.prepQuestion.delete({ where: { id: row.id } });
    cutCount++;
  }
  console.log(`cuts: deleted ${cutCount} rows`);

  for (const m of MERGES) {
    const keeper = await prisma.prepQuestion.findFirst({ where: { title: m.keeperOldTitle, technology: TECH }, select: { id: true, slug: true } });
    if (keeper) {
      const newSlug = await uniqueSlug(m.newTitle);
      await prisma.prepQuestion.update({
        where: { id: keeper.id },
        data: { title: m.newTitle, slug: newSlug, round: m.newRound, difficulty: m.newDifficulty },
      });
      mergeKeptCount++;
      console.log(`merge: "${m.keeperOldTitle}" -> "${m.newTitle}" [${m.newRound}|${m.newDifficulty}]`);
    } else {
      notFound++;
    }
    for (const dupTitle of m.deleteTitles) {
      const dup = await prisma.prepQuestion.findFirst({ where: { title: dupTitle, technology: TECH }, select: { id: true } });
      if (!dup) { notFound++; continue; }
      await prisma.prepQuestion.delete({ where: { id: dup.id } });
      mergeDeletedCount++;
    }
  }
  console.log(`merges: kept ${mergeKeptCount} canonical rows, deleted ${mergeDeletedCount} duplicates`);

  for (const r of REASSIGNS) {
    const row = await prisma.prepQuestion.findFirst({ where: { title: r.oldTitle, technology: TECH }, select: { id: true, title: true, round: true, difficulty: true } });
    if (!row) { notFound++; continue; }
    const needsTitle = row.title !== r.newTitle;
    const needsRound = row.round !== r.newRound;
    const needsDiff = row.difficulty !== r.newDifficulty;
    if (!needsTitle && !needsRound && !needsDiff) continue;
    const newSlug = needsTitle ? await uniqueSlug(r.newTitle) : undefined;
    await prisma.prepQuestion.update({
      where: { id: row.id },
      data: {
        ...(needsTitle ? { title: r.newTitle, slug: newSlug } : {}),
        round: r.newRound,
        difficulty: r.newDifficulty,
      },
    });
    reassignCount++;
  }
  console.log(`reassigns: updated ${reassignCount} rows`);

  if (notFound > 0) console.log(`NOTE: ${notFound} lookups found no matching row (already migrated, or a re-run) — safe if this is a second run`);

  const remaining = await prisma.prepQuestion.count({ where: { technology: TECH } });
  console.log(`\nremaining javascript-coding rows: ${remaining}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
