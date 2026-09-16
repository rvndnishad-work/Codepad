/**
 * JS ULTRA retrofit — Phase 0 dedup + rename.
 *
 * The raw `technology='javascript'` bank had 90 duplicate rows seeded as
 * "Tricky JavaScript Scenario #N" (30 real topics, each seeded 3 times —
 * #N, #N+30, #N+60 — with identical round/difficulty and a NULL answer).
 * This script collapses each triplicate group down to ONE canonical row,
 * renamed to a realistic interview-style title, matching the redirect
 * mapping already committed in src/lib/js-merge-redirects.ts (which THIS
 * script originally generated, in an earlier, uncommitted run against the
 * dev database — this file reconstructs it so the same migration can be
 * run against any other environment, e.g. production, safely).
 *
 * For each of the 30 groups:
 *   - If a row with the canonical `dest` slug already exists: the group
 *     is already migrated (or partially migrated) here — just delete any
 *     leftover `sources` rows, if present. This makes the script fully
 *     idempotent; re-running it against an already-migrated database
 *     (like this project's own dev DB) is a safe no-op.
 *   - Otherwise: find whichever `sources` rows exist, pick the first as
 *     the keeper (rename its title + slug to the canonical `dest`), and
 *     delete the rest. All 3 source rows are functionally identical
 *     duplicates (seeded together, same round/difficulty, NULL answer),
 *     so which one specifically is kept does not matter.
 *   - If none of the `sources` rows exist either, the group is skipped
 *     (nothing to migrate).
 *
 * This does NOT touch the `answer` field — it only fixes title/slug so
 * that `npm run augment:js-ultra` (which matches by exact title) can
 * find and fill in the gold-standard content afterward.
 *
 *   npx tsx scripts/js-merge-duplicates-ultra.ts
 *
 * Prod deploy order (mirrors the Node.js/Next.js ULTRA prod-push pattern):
 *   1. push this code
 *   2. DATABASE_URL=<prod> npx tsx scripts/js-merge-duplicates-ultra.ts
 *   3. DATABASE_URL=<prod> npm run seed:curated   (adds the 9 Phase-1 net-new titles)
 *   4. DATABASE_URL=<prod> npm run augment:js-ultra
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Group = { dest: string; title: string; sources: string[] };

const GROUPS: Group[] = [
  {
    dest: "how-does-use-strict-change-what-this-refers-to-inside-a-regular-function-called-",
    title: "How does 'use strict' change what `this` refers to inside a regular function called without a receiver, compared to non-strict mode?",
    sources: ["tricky-javascript-scenario-70-strict-mode-this-bindings-binding-rules", "tricky-javascript-scenario-100-strict-mode-this-bindings-binding-rules", "tricky-javascript-scenario-40-strict-mode-this-bindings-binding-rules"],
  },
  {
    dest: "how-would-you-use-object-groupby-to-group-an-array-of-orders-by-status-and-how-d",
    title: "How would you use Object.groupBy() to group an array of orders by status, and how does it compare to a manual reduce()?",
    sources: ["tricky-javascript-scenario-41-object-groupby", "tricky-javascript-scenario-71-object-groupby", "tricky-javascript-scenario-11-object-groupby"],
  },
  {
    dest: "when-would-you-reach-for-map-groupby-instead-of-object-groupby-and-what-problem-",
    title: "When would you reach for Map.groupBy() instead of Object.groupBy(), and what problem does it solve with non-string keys?",
    sources: ["tricky-javascript-scenario-42-map-groupby", "tricky-javascript-scenario-72-map-groupby", "tricky-javascript-scenario-12-map-groupby"],
  },
  {
    dest: "how-does-array-prototype-tosorted-differ-from-sort-and-why-does-that-matter-when",
    title: "How does Array.prototype.toSorted() differ from .sort(), and why does that matter when updating state immutably?",
    sources: ["tricky-javascript-scenario-43-array-prototype-tosorted", "tricky-javascript-scenario-73-array-prototype-tosorted", "tricky-javascript-scenario-13-array-prototype-tosorted"],
  },
  {
    dest: "how-does-array-prototype-toreversed-avoid-the-classic-bug-of-accidentally-mutati",
    title: "How does Array.prototype.toReversed() avoid the classic bug of accidentally mutating a shared array reference?",
    sources: ["tricky-javascript-scenario-44-array-prototype-toreversed", "tricky-javascript-scenario-74-array-prototype-toreversed", "tricky-javascript-scenario-14-array-prototype-toreversed"],
  },
  {
    dest: "how-would-you-remove-an-item-from-an-array-immutably-using-tospliced-and-how-doe",
    title: "How would you remove an item from an array immutably using toSpliced(), and how does it compare to splice()?",
    sources: ["tricky-javascript-scenario-45-array-prototype-tospliced", "tricky-javascript-scenario-75-array-prototype-tospliced", "tricky-javascript-scenario-15-array-prototype-tospliced"],
  },
  {
    dest: "how-does-array-prototype-with-let-you-replace-one-array-element-immutably-and-wh",
    title: "How does Array.prototype.with() let you replace one array element immutably, and where would that pattern actually help?",
    sources: ["tricky-javascript-scenario-46-array-prototype-with", "tricky-javascript-scenario-76-array-prototype-with", "tricky-javascript-scenario-16-array-prototype-with"],
  },
  {
    dest: "how-would-you-use-reflect-ownkeys-inside-a-proxy-to-correctly-enumerate-both-str",
    title: "How would you use Reflect.ownKeys() inside a Proxy to correctly enumerate both string and symbol keys, including non-enumerable ones?",
    sources: ["tricky-javascript-scenario-47-reflect-ownkeys", "tricky-javascript-scenario-77-reflect-ownkeys", "tricky-javascript-scenario-17-reflect-ownkeys"],
  },
  {
    dest: "how-would-you-write-a-proxy-set-trap-that-validates-a-value-before-allowing-an-a",
    title: "How would you write a Proxy 'set' trap that validates a value before allowing an assignment, and what happens if you return false?",
    sources: ["tricky-javascript-scenario-48-proxy-traps-custom-sets", "tricky-javascript-scenario-78-proxy-traps-custom-sets", "tricky-javascript-scenario-18-proxy-traps-custom-sets"],
  },
  {
    dest: "how-would-you-use-a-proxy-get-trap-to-implement-lazy-loaded-or-computed-properti",
    title: "How would you use a Proxy 'get' trap to implement lazy-loaded or computed properties on a plain object?",
    sources: ["tricky-javascript-scenario-49-proxy-traps-custom-gets", "tricky-javascript-scenario-79-proxy-traps-custom-gets", "tricky-javascript-scenario-19-proxy-traps-custom-gets"],
  },
  {
    dest: "how-would-you-make-a-custom-class-iterable-with-for-of-by-implementing-symbol-it",
    title: "How would you make a custom class iterable with for...of by implementing Symbol.iterator as a generator method?",
    sources: ["tricky-javascript-scenario-50-symbol-iterator-custom-generator", "tricky-javascript-scenario-80-symbol-iterator-custom-generator", "tricky-javascript-scenario-20-symbol-iterator-custom-generator"],
  },
  {
    dest: "how-would-you-implement-symbol-asynciterator-on-a-class-to-transparently-page-th",
    title: "How would you implement Symbol.asyncIterator on a class to transparently page through a paginated API with for await...of?",
    sources: ["tricky-javascript-scenario-51-symbol-asynciterator-paging-fetches", "tricky-javascript-scenario-81-symbol-asynciterator-paging-fetches", "tricky-javascript-scenario-21-symbol-asynciterator-paging-fetches"],
  },
  {
    dest: "why-would-you-choose-a-weakset-over-a-set-to-track-a-group-of-dom-elements-and-w",
    title: "Why would you choose a WeakSet over a Set to track a group of DOM elements, and what happens to its entries once those elements are removed?",
    sources: ["tricky-javascript-scenario-52-weakset-garbage-collection-behavior", "tricky-javascript-scenario-82-weakset-garbage-collection-behavior", "tricky-javascript-scenario-22-weakset-garbage-collection-behavior"],
  },
  {
    dest: "how-would-you-write-a-deep-clone-function-that-correctly-handles-a-self-referenc",
    title: "How would you write a deep-clone function that correctly handles a self-referencing (circular) object without infinite recursion?",
    sources: ["tricky-javascript-scenario-53-deepclone-with-cycles-detection", "tricky-javascript-scenario-83-deepclone-with-cycles-detection", "tricky-javascript-scenario-23-deepclone-with-cycles-detection"],
  },
  {
    dest: "how-would-you-implement-a-curry-function-that-supports-partial-application-with-",
    title: "How would you implement a curry() function that supports partial application with placeholder arguments?",
    sources: ["tricky-javascript-scenario-54-function-currying-with-placeholder-inputs", "tricky-javascript-scenario-84-function-currying-with-placeholder-inputs", "tricky-javascript-scenario-24-function-currying-with-placeholder-inputs"],
  },
  {
    dest: "how-would-you-implement-a-debounce-utility-that-also-exposes-a-cancel-method-to-",
    title: "How would you implement a debounce utility that also exposes a .cancel() method to cancel a pending call?",
    sources: ["tricky-javascript-scenario-55-custom-debounce-with-cancel-method", "tricky-javascript-scenario-85-custom-debounce-with-cancel-method", "tricky-javascript-scenario-25-custom-debounce-with-cancel-method"],
  },
  {
    dest: "how-would-you-implement-a-throttle-function-with-configurable-leading-and-traili",
    title: "How would you implement a throttle function with configurable leading- and trailing-edge execution?",
    sources: ["tricky-javascript-scenario-56-custom-throttle-with-leading-flags", "tricky-javascript-scenario-86-custom-throttle-with-leading-flags", "tricky-javascript-scenario-26-custom-throttle-with-leading-flags"],
  },
  {
    dest: "why-can-pushing-a-single-non-numeric-value-into-a-large-numeric-array-tank-its-p",
    title: "Why can pushing a single non-numeric value into a large numeric array tank its performance in V8, and how would you avoid it?",
    sources: ["tricky-javascript-scenario-57-array-element-kinds-optimization", "tricky-javascript-scenario-87-array-element-kinds-optimization", "tricky-javascript-scenario-27-array-element-kinds-optimization"],
  },
  {
    dest: "how-does-sharedarraybuffer-let-two-web-workers-share-memory-directly-and-what-ra",
    title: "How does SharedArrayBuffer let two Web Workers share memory directly, and what race conditions do you need to guard against?",
    sources: ["tricky-javascript-scenario-58-sharedarraybuffer-thread-isolation", "tricky-javascript-scenario-88-sharedarraybuffer-thread-isolation", "tricky-javascript-scenario-28-sharedarraybuffer-thread-isolation"],
  },
  {
    dest: "how-would-you-transfer-a-large-arraybuffer-between-a-worker-and-the-main-thread-",
    title: "How would you transfer a large ArrayBuffer between a worker and the main thread without copying it, using postMessage's transfer list?",
    sources: ["tricky-javascript-scenario-59-postmessage-transferable-streams", "tricky-javascript-scenario-89-postmessage-transferable-streams", "tricky-javascript-scenario-29-postmessage-transferable-streams"],
  },
  {
    dest: "how-would-you-use-the-broadcastchannel-api-to-sync-application-state-across-mult",
    title: "How would you use the BroadcastChannel API to sync application state across multiple open browser tabs?",
    sources: ["tricky-javascript-scenario-60-broadcastchannel-multi-tab-updates", "tricky-javascript-scenario-90-broadcastchannel-multi-tab-updates", "tricky-javascript-scenario-30-broadcastchannel-multi-tab-updates"],
  },
  {
    dest: "how-would-you-use-the-history-api-s-pushstate-and-the-popstate-event-to-build-cl",
    title: "How would you use the History API's pushState and the popstate event to build client-side routing that survives the back button?",
    sources: ["tricky-javascript-scenario-61-history-api-route-state-handling", "tricky-javascript-scenario-91-history-api-route-state-handling", "tricky-javascript-scenario-31-history-api-route-state-handling"],
  },
  {
    dest: "what-causes-layout-thrashing-when-you-read-and-write-dom-properties-in-a-loop-an",
    title: "What causes layout thrashing when you read and write DOM properties in a loop, and how would you batch those operations to avoid it?",
    sources: ["tricky-javascript-scenario-62-dom-layout-thrashing-remedies", "tricky-javascript-scenario-92-dom-layout-thrashing-remedies", "tricky-javascript-scenario-32-dom-layout-thrashing-remedies"],
  },
  {
    dest: "why-would-you-add-passive-true-to-a-scroll-or-touchstart-listener-and-what-probl",
    title: "Why would you add { passive: true } to a scroll or touchstart listener, and what problem does it solve for scroll performance?",
    sources: ["tricky-javascript-scenario-63-passive-event-listener-scroll-enhancements", "tricky-javascript-scenario-93-passive-event-listener-scroll-enhancements", "tricky-javascript-scenario-33-passive-event-listener-scroll-enhancements"],
  },
  {
    dest: "why-is-navigator-sendbeacon-the-right-tool-for-sending-analytics-data-when-a-use",
    title: "Why is navigator.sendBeacon() the right tool for sending analytics data when a user closes a tab, instead of a normal fetch call?",
    sources: ["tricky-javascript-scenario-64-navigator-sendbeacon-final-telemetry", "tricky-javascript-scenario-94-navigator-sendbeacon-final-telemetry", "tricky-javascript-scenario-34-navigator-sendbeacon-final-telemetry"],
  },
  {
    dest: "why-would-you-use-performance-now-instead-of-date-now-to-measure-how-long-a-func",
    title: "Why would you use performance.now() instead of Date.now() to measure how long a function takes to run?",
    sources: ["tricky-javascript-scenario-65-high-resolution-time-api-precision", "tricky-javascript-scenario-95-high-resolution-time-api-precision", "tricky-javascript-scenario-35-high-resolution-time-api-precision"],
  },
  {
    dest: "how-would-you-use-the-page-visibility-api-to-pause-a-setinterval-based-poller-wh",
    title: "How would you use the Page Visibility API to pause a setInterval-based poller when a user switches to a different browser tab?",
    sources: ["tricky-javascript-scenario-66-page-visibility-api-interval-freezing", "tricky-javascript-scenario-96-page-visibility-api-interval-freezing", "tricky-javascript-scenario-36-page-visibility-api-interval-freezing"],
  },
  {
    dest: "how-would-you-use-intersectionobserver-to-lazy-load-images-only-as-they-scroll-i",
    title: "How would you use IntersectionObserver to lazy-load images only as they scroll into the viewport?",
    sources: ["tricky-javascript-scenario-67-intersectionobserver-lazy-loaded-content", "tricky-javascript-scenario-97-intersectionobserver-lazy-loaded-content", "tricky-javascript-scenario-37-intersectionobserver-lazy-loaded-content"],
  },
  {
    dest: "how-would-you-use-resizeobserver-to-react-to-an-element-s-size-changing-without-",
    title: "How would you use ResizeObserver to react to an element's size changing, without polling getBoundingClientRect() on every frame?",
    sources: ["tricky-javascript-scenario-68-resizeobserver-sizing-alterations-tracking", "tricky-javascript-scenario-98-resizeobserver-sizing-alterations-tracking", "tricky-javascript-scenario-38-resizeobserver-sizing-alterations-tracking"],
  },
  {
    dest: "how-would-you-use-mutationobserver-to-detect-when-a-third-party-script-injects-n",
    title: "How would you use MutationObserver to detect when a third-party script injects new nodes into the DOM?",
    sources: ["tricky-javascript-scenario-69-mutationobserver-tree-monitoring", "tricky-javascript-scenario-99-mutationobserver-tree-monitoring", "tricky-javascript-scenario-39-mutationobserver-tree-monitoring"],
  },
];

async function main() {
  let migrated = 0;
  let alreadyDone = 0;
  let skippedMissing = 0;

  for (const group of GROUPS) {
    const destRow = await prisma.prepQuestion.findFirst({
      where: { slug: group.dest, technology: "javascript" },
      select: { id: true },
    });

    const sourceRows = await prisma.prepQuestion.findMany({
      where: { slug: { in: group.sources }, technology: "javascript" },
      select: { id: true, slug: true, _count: { select: { comments: true } } },
    });

    if (destRow) {
      // Already migrated (possibly partially) — just clean up any leftover dupes.
      if (sourceRows.length) {
        for (const row of sourceRows) {
          await prisma.prepQuestion.delete({ where: { id: row.id } });
        }
        console.log(`${group.dest}: already migrated, deleted ${sourceRows.length} leftover duplicate(s)`);
      } else {
        alreadyDone++;
      }
      continue;
    }

    if (!sourceRows.length) {
      console.log(`${group.dest}: SKIPPED — no dest row and no source rows found`);
      skippedMissing++;
      continue;
    }

    const [keeper, ...rest] = sourceRows;
    await prisma.prepQuestion.update({
      where: { id: keeper.id },
      data: { title: group.title, slug: group.dest },
    });
    for (const row of rest) {
      await prisma.prepQuestion.delete({ where: { id: row.id } });
    }
    console.log(
      `${group.dest}: migrated (renamed ${keeper.slug} -> ${group.dest}, deleted ${rest.length} duplicate(s))`
    );
    migrated++;
  }

  console.log(
    `\nDone. migrated=${migrated} alreadyDone=${alreadyDone} skippedMissing=${skippedMissing} (of ${GROUPS.length} groups)`
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
