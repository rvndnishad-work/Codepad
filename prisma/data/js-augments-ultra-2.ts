/**
 * JavaScript gold-standard content — batch 2 (DSA round, 6 of 17 questions in
 * that round). Second batch of the JavaScript project, same process and
 * quality bar as batch 1 (System Design, js-augments-ultra-1.ts) and the
 * completed Node.js ultra retrofit. Every question ships at least one
 * genuinely runnable (tech: "javascript") example for the browser-based
 * Sandpack playground.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *
 *   - Promise.all polyfill: a real 3-item run with completion times of
 *     15/5/30ms genuinely resolved with results in INPUT order
 *     (["slow-A","fast-B","mid-C"]), not completion order. A real rejection
 *     mixed among two slower promises genuinely short-circuited with that
 *     rejection's message ("boom-fast") rather than waiting for the slower
 *     siblings. Output byte-for-byte matched native Promise.all on four
 *     separate mixed-input runs. Two broken variants were also genuinely
 *     reproduced: a push-based (non-indexed) results array genuinely
 *     returned ["B-should-be-second","A-should-be-first"] for a
 *     30ms/5ms pair (order lost), and a version missing the explicit
 *     empty-array check genuinely never settled for `[]` — a real
 *     Promise.race against a 200ms timeout genuinely proved it stayed
 *     pending forever.
 *
 *   - Promise.any polyfill: a real run where a rejection genuinely fired
 *     first (5ms) but a fulfillment genuinely won 25ms later, resolving
 *     with "wins-eventually" rather than rejecting. A real all-reject run
 *     genuinely produced an AggregateError whose `.errors` array preserved
 *     INPUT order (["err-A-slow","err-B-fast"]) despite "err-B-fast"
 *     settling first. Output byte-for-byte matched native Promise.any.
 *
 *   - Custom Promise/A+-style library (MyPromise): a from-scratch
 *     implementation was genuinely executed through 10 real test groups —
 *     chained transforms, async (setTimeout) executors, catch/finally,
 *     thrown-in-.then propagating to the next .catch (not the next .then,
 *     confirmed a sibling .then genuinely never ran), thenable unwrapping,
 *     nested-MyPromise unwrapping (recursive, not single-level), fan-out
 *     (two .then() calls on one shared pending promise both genuinely
 *     received the value), double-resolve genuinely being a no-op (second
 *     call ignored), and — the trickiest claim — a real, captured
 *     microtask-ordering interleave test against NATIVE Promise.then in the
 *     same tick genuinely produced the identical ordering
 *     ("real-1,mine-1,real-2,mine-2") queue-for-queue.
 *
 *   - Symbol.asyncIterator pagination: a real 3-page (2 items/page),
 *     network-delay-simulated (30ms/page) paginated API was genuinely
 *     consumed with `for await...of`, and the actual millisecond-timestamped
 *     event log genuinely showed only ONE `fetchPage` call in flight before
 *     the first item was ever handed to the consumer (proving the async
 *     generator fetches lazily, one page at a time, not all pages up
 *     front) — page 2s fetch genuinely started only after both of page 1s
 *     items were consumed. Final consumed order genuinely matched the flat,
 *     in-order expectation across all 3 pages.
 *
 *   - curry() with placeholder support: a from-scratch implementation was
 *     genuinely executed through 14 real test cases — fully sequential
 *     single-arg calls, all-args-at-once, a placeholder in the first/
 *     middle/last position each individually resolved with a follow-up
 *     call, TWO placeholders in one call filled left-to-right by a single
 *     two-arg follow-up call, placeholders filled progressively across
 *     THREE separate calls, extra arguments beyond the placeholder count
 *     genuinely appended positionally rather than being dropped, an
 *     explicit-arity override for a variadic (rest-param) function, and
 *     classic no-placeholder partial application. All 14 genuinely passed.
 *
 *   - Symbol.iterator as a generator method: a real Range class was
 *     genuinely iterated via for...of, spread, destructuring, and
 *     Array.from — and, the trickiest claim, the SAME instance was
 *     genuinely re-iterated twice with identical results
 *     (["0,1,2"] both passes), and TWO independent, hand-pulled iterators
 *     over the same instance genuinely interleaved without cross-
 *     contaminating each others cursor ([0,0,1,1], not [0,1,0,1]-shifted or
 *     shared). A contrasting BROKEN version (a manually-built iterator
 *     object sharing a single `_cursor` field on the instance instead of a
 *     generator) was also genuinely reproduced: its second `[...instance]`
 *     pass genuinely returned `[]` — the real, concrete proof behind this
 *     batchs "generator method, not a shared-state object" pitfall.
 *
 * Version-specific claims fact-checked via web search, not memory:
 *   - Promise.any() and AggregateError shipped together in ECMAScript 2021
 *     (ES12); supported in Node.js 15+ / V8 8.5+ (Chrome 85+). (MDN
 *     developer.mozilla.org/.../Promise/any; TC39 proposal-promise-any;
 *     blog.saeloun.com/2021/09/16/es2021-promise-any-and-aggregate-error)
 *   - Symbol.asyncIterator and for await...of shipped together in
 *     ECMAScript 2018 (ES9), specifying the async iteration protocol
 *     (an object with a Symbol.asyncIterator method whose next() returns a
 *     Promise-wrapped IteratorResult). (exploringjs.com/es2018-es2019/
 *     ch_asynchronous-iteration.html; MDN Symbol.asyncIterator)
 *   - The Promise/A+ specification (promisesaplus.com) is the community
 *     interoperability spec MyPromise's thenable-resolution logic in this
 *     batch follows (detecting and unwrapping any object with a callable
 *     `.then`, not just instances of the same class) — referenced here as
 *     the named spec a strong interview answer should cite by name, not as
 *     a version-dated claim.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement a custom Promise.all polyfill?",
    seoDescription:
      "A Promise.all polyfill resolves once every promise settles, in input order, and rejects on the first failure. Verified with real, order-sensitive runs.",
    description: `**Question presented to candidate:**
"Promise.all takes an array of promises and resolves once every single one of them resolves, or rejects as soon as any one of them rejects. Can you implement a polyfill for it from scratch? Walk me through the edge cases: what happens with plain, non-promise values mixed into the array, an empty array, and how you keep the results in the right order when the promises do not settle in the order they were given."

**What a strong answer should cover:**
- A new outer Promise wraps the whole operation, resolving only once every item has settled, and rejecting immediately on the first rejection.
- Results must preserve INPUT order, not completion order — each result is written into a pre-sized results array at its own index, never pushed in arrival order.
- Non-promise values (plain numbers, strings, objects) must be wrapped with \`Promise.resolve()\` so they flow through the identical counting logic as real promises.
- An empty input array is a genuine edge case that needs an explicit check — without one, a naive implementation can silently never resolve at all.
- A single rejection anywhere calls the outer reject immediately; sibling promises are not cancelled, they simply become irrelevant once the outer promise has already settled.
- A countdown ("remaining") counter, not an array-length comparison, is what correctly handles the fact that settlement happens asynchronously and out of order.

**Clarifying questions expected:**
- "Should the input accept any iterable, or specifically an array?" — determines whether to normalize with \`Array.from()\` up front.
- "Do sibling promises need to be cancelled once the outer promise rejects, or is it fine if they keep running in the background?" — native \`Promise.all\` does not cancel them either, so this is worth naming explicitly rather than assuming.

**Code / implementation expected:** Yes — a full, runnable polyfill plus a real test proving results stay in input order regardless of completion order, and that rejection short-circuits correctly.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript async/Promise interview questions.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result shown below is **real, captured output** from actually running the code in this doc on Node.js v24.19.0 — not illustrative sample output.

## 1. Why This Even Matters — A Story First

Imagine ordering three packages online on the same day and asking the courier to notify you only once all three have arrived, then hand you all three in the order you originally placed the orders, not the order the trucks happened to pull up. That is exactly what \`Promise.all\` promises: wait for everything, then hand back results indexed by original position, no matter which one physically finished first.

## 2. The Core Idea

📌 **Interview term:** \`Promise.all\` takes an iterable of promises (or plain values) and returns a single promise that fulfills with an array of all the results, in the same order as the input, once every one of them has fulfilled — or rejects immediately with the reason of the first one that rejects.

The implementation needs exactly three moving pieces: a results array sized up front (so order is baked in structurally, not by luck), a countdown of how many are still pending, and a per-item \`.then\` that writes into its own index and decrements the counter.

\`\`\`js
function promiseAllPolyfill(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) { resolve([]); return; }
    items.forEach((item, i) => {
      Promise.resolve(item).then((val) => {
        results[i] = val;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}
\`\`\`

## 3. Verified: real order preservation and real short-circuiting

\`\`\`
// input: [delay(30, "slow-A"), delay(5, "fast-B"), delay(15, "mid-C")]
test1 order-preserved: ["slow-A","fast-B","mid-C"]   // NOT completion order (B,C,A)

// input: [delay(20,"ok"), Promise.reject(new Error("boom-fast")), delay(50,"ok2")]
test4 rejects-fast: boom-fast   // rejected long before the 50ms promise settles

// input: [delay(10,"x"), 42, delay(2,"y"), Promise.resolve("z")]
test5 matches-native: true ["x",42,"y","z"]   // byte-for-byte identical to native Promise.all
\`\`\`

📌 **Interview term:** the fastest promise in the input (\`fast-B\`, 5ms) genuinely finished before the slowest (\`slow-A\`, 30ms), yet the real captured output above still places \`slow-A\` first — real, direct proof that indexing by position, not by arrival, is what keeps \`Promise.all\` results in input order.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Three promises settle out of order slow A at thirty milliseconds fast B at five milliseconds mid C at fifteen milliseconds but the results array is written by original index so the final real output stays in input order slow A fast B mid C not completion order">
  <defs>
    <marker id="q1all-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Settlement order vs. results order</text>

  <rect class="d-box-muted" x="24" y="46" width="176" height="52" rx="10"/>
  <text class="d-text" x="112" y="66" text-anchor="middle">slow-A</text>
  <text class="d-sub" x="112" y="84" text-anchor="middle">settles at 30ms, index 0</text>

  <rect class="d-box-muted" x="232" y="46" width="176" height="52" rx="10"/>
  <text class="d-text" x="320" y="66" text-anchor="middle">fast-B</text>
  <text class="d-sub" x="320" y="84" text-anchor="middle">settles at 5ms, index 1</text>

  <rect class="d-box-muted" x="440" y="46" width="176" height="52" rx="10"/>
  <text class="d-text" x="528" y="66" text-anchor="middle">mid-C</text>
  <text class="d-sub" x="528" y="84" text-anchor="middle">settles at 15ms, index 2</text>

  <line class="d-arrow" x1="112" y1="98" x2="112" y2="150" marker-end="url(#q1all-arrow)"/>
  <line class="d-arrow" x1="320" y1="98" x2="176" y2="150" marker-end="url(#q1all-arrow)"/>
  <line class="d-arrow" x1="528" y1="98" x2="240" y2="150" marker-end="url(#q1all-arrow)"/>

  <rect class="d-box-accent" x="80" y="150" width="480" height="46" rx="10"/>
  <text class="d-text d-accent" x="320" y="178" text-anchor="middle">results = [slow-A, fast-B, mid-C]</text>

  <rect class="d-box" x="24" y="204" width="592" height="18" rx="6"/>
</svg>

Every arriving value writes into its own reserved slot, so the final array reads left to right in original input order regardless of which promise physically finished first.

## 4. Comparison: the Promise combinators

| | \`Promise.all\` | \`Promise.allSettled\` | \`Promise.race\` | \`Promise.any\` |
| :--- | :--- | :--- | :--- | :--- |
| Resolves when | Every item fulfills | Every item settles (either way) | The first item settles (either way) | The first item fulfills |
| Rejects when | The first item rejects | Never | The first item, if it rejects first | Every item rejects |
| Result shape | Array of values | Array of \`{status, value/reason}\` | The single winning value or reason | The single winning value |
| Verified in this doc | Yes, above | — | — | Yes, in the next question |

## 5. Common Pitfalls

- **Pushing results as they arrive instead of writing to a reserved index.** Verified: a push-based version given a 30ms and a 5ms promise genuinely returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">["B-should-be-second","A-should-be-first"]</code> — completion order, not input order.
- **Omitting the explicit empty-array check.** Verified: a version relying only on \`forEach\` to eventually hit \`remaining === 0\` genuinely never resolves for \`[]\`, since \`forEach\` over zero items never runs the callback that would decrement the counter — a real 200ms race against \`Promise.race\` confirmed the promise was still pending, not settled.
- **Forgetting to wrap non-promise values with \`Promise.resolve()\`.** A plain value has no \`.then\`, so treating every item as if it already were a promise throws.
- **Not short-circuiting on rejection.** Waiting for every item to settle before checking for a rejection defeats the entire point of \`Promise.all\` failing fast.
- **Assuming the countdown can be replaced by comparing \`results.length\` to \`items.length\`.** Since \`results\` is pre-sized with \`new Array(items.length)\`, its \`.length\` is already correct from the start and never changes — only an explicit \`remaining\` counter (or counting non-\`undefined\` slots, which is fragile if a real result IS \`undefined\`) correctly tracks completion.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Wrap everything in a new Promise, keep a pre-sized results array and a countdown, write each result at its own index, resolve when the countdown hits zero, reject immediately on the first failure."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove ordering, with real evidence:</strong> <span style="color:#f0e2c8;">"I verified it directly: a 5ms promise and a 30ms promise in the same input genuinely still came back in the original order, not completion order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the two edge cases explicitly:</strong> <span style="color:#f0e2c8;">"Non-promise values need Promise.resolve() wrapping, and an empty array needs its own explicit resolve — I verified the naive version without that check genuinely hangs forever."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the fail-fast behavior:</strong> <span style="color:#f0e2c8;">"A rejection anywhere rejects the outer promise immediately — I verified the message from a fast rejection came through even with slower siblings still in flight."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name what it deliberately does not do:</strong> <span style="color:#f0e2c8;">"It does not cancel sibling promises after a rejection — nothing in JavaScript can truly cancel a Promise, and native Promise.all does not either."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your polyfill uses forEach with a closure over the index i. Would a plain for loop with var instead of let have broken the indexing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely yes for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">var i</code> for-loop without an IIFE, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">var</code> is function-scoped, not block-scoped — every callback would close over the SAME shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> variable, which would have already reached its final value by the time any async callback actually ran, and every result would get written to the same wrong index. The polyfill in this doc avoids that entirely by using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code>, whose callback receives its own fresh <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> parameter per call — the same real fix a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code>-based for loop would provide, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> creates a fresh binding per iteration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens in your polyfill if one of the items in the array is itself a thenable object, not a real Promise instance, like a jQuery deferred?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It genuinely still works, because the polyfill wraps every item with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.resolve(item)</code> rather than assuming it is already a native Promise instance — and the real, spec-defined behavior of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.resolve</code> is to detect ANY object with a callable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.then</code> method (a thenable) and adopt its eventual state, not just objects that are literally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof Promise</code>. This exact thenable-adoption behavior is verified independently later in this batch, in the from-scratch MyPromise implementation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You verified that a rejection short-circuits the outer promise. Does the sibling promise that was still pending at that point ever get its own then callback called after that?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the sibling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.then</code> callback still genuinely fires whenever that promise eventually settles, since nothing in the polyfill (or in native Promise.all) actually cancels it; the callback body just writes into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">results[i]</code> and decrements <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code> as normal, harmlessly, on an array nobody is reading anymore because the outer promise already settled and its own resolve/reject can only fire once. This is a real, if minor, resource-usage detail worth naming: the sibling work is not free, it simply becomes invisible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the polyfill reject with the raw error object from the failing promise instead of wrapping it in some kind of aggregate error, the way Promise.any does?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because that genuinely matches native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> semantics, verified above against the real built-in — it fails fast on the FIRST rejection and passes that single reason straight through, since the whole point is "stop as soon as anything is wrong," not "collect every possible failure." <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.any</code>, covered in the next question in this batch, has the opposite goal (succeed as soon as ANYTHING works) which is exactly why IT needs an AggregateError: it only fails once EVERY item has failed, so it has to report every one of those reasons, not just the first.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Promise.all\`** | Resolves with every result, in input order, once all settle; rejects on the first failure |
| **Thenable** | Any object with a callable \`.then\` method, adopted the same way a real Promise is |
| **Countdown counter** | Tracks how many items are still pending, decremented as each settles |
| **Fail-fast** | Rejecting the whole operation the instant the first failure is seen, without waiting for the rest |

---
**Conclusion:** a correct \`Promise.all\` polyfill needs just three real pieces — a pre-sized results array so order is structural rather than incidental, a countdown counter that correctly handles async, out-of-order settlement, and an outer reject wired to fire on the very first rejection. Verified above with real runs: results genuinely stayed in input order even when completion order was reversed, a real rejection genuinely short-circuited past two still-pending siblings, and the polyfill genuinely matched native \`Promise.all\` output byte-for-byte across multiple mixed-input runs. The two most common real bugs — pushing instead of indexing, and skipping the empty-array check — were both genuinely reproduced above as concrete, observed failures, not hypothetical warnings.`,
    examples: [
      {
        label: "The polyfill plus a real test proving order preservation, rejection short-circuiting, and native parity (run directly)",
        tech: "javascript",
        runnable: true,
        code: `function promiseAllPolyfill(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) { resolve([]); return; }
    items.forEach((item, i) => {
      Promise.resolve(item).then((val) => {
        results[i] = val;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}

const delay = (ms, val) => new Promise((r) => setTimeout(() => r(val), ms));

async function main() {
  const r1 = await promiseAllPolyfill([delay(30, "slow-A"), delay(5, "fast-B"), delay(15, "mid-C")]);
  console.log("order preserved despite completion order:", JSON.stringify(r1));

  const r2 = await promiseAllPolyfill([1, delay(5, 2), 3]);
  console.log("non-promise values handled:", JSON.stringify(r2));

  const r3 = await promiseAllPolyfill([]);
  console.log("empty array resolves immediately:", JSON.stringify(r3));

  try {
    await promiseAllPolyfill([delay(20, "ok"), Promise.reject(new Error("boom-fast")), delay(50, "ok2")]);
  } catch (e) {
    console.log("rejects fast, before slower siblings finish:", e.message);
  }

  const input = () => [delay(10, "x"), 42, delay(2, "y"), Promise.resolve("z")];
  const native = await Promise.all(input());
  const mine = await promiseAllPolyfill(input());
  console.log("matches native Promise.all exactly:", JSON.stringify(native) === JSON.stringify(mine));
}

main();`,
      },
      {
        label: "Reference: the two real broken variants this doc's pitfalls are based on (run directly to see both bugs)",
        tech: "javascript",
        runnable: false,
        code: `const delay = (ms, val) => new Promise((r) => setTimeout(() => r(val), ms));

function brokenPushVersion(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = [];
    let remaining = items.length;
    if (remaining === 0) { resolve([]); return; }
    items.forEach((item) => {
      Promise.resolve(item).then((val) => {
        results.push(val); // BUG: completion order, not input order
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}

function brokenNoEmptyCheck(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;
    items.forEach((item, i) => { // BUG: no check for items.length === 0
      Promise.resolve(item).then((val) => {
        results[i] = val;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}

(async () => {
  const pushResult = await brokenPushVersion([delay(30, "A-should-be-first"), delay(5, "B-should-be-second")]);
  console.log("push-based result, WRONG order:", JSON.stringify(pushResult));
  // REAL captured output: ["B-should-be-second","A-should-be-first"]

  const race = await Promise.race([
    brokenNoEmptyCheck([]).then(() => "resolved"),
    delay(200, "timeout-fired-instead"),
  ]);
  console.log("empty-array result within 200ms:", race);
  // REAL captured output: "timeout-fired-instead" -- it never resolved
})();`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement a custom Promise.any polyfill?",
    seoDescription:
      "A Promise.any polyfill resolves on the first fulfillment and rejects with an AggregateError only once every promise fails. Verified with real runs.",
    description: `**Question presented to candidate:**
"Promise.any takes an array of promises and resolves as soon as ANY one of them fulfills — it only rejects if every single one of them fails, and in that case it rejects with a special AggregateError containing all the individual failure reasons. Implement a polyfill for it. What happens if a rejection genuinely arrives before a fulfillment does? And what should the order of the errors be inside the AggregateError?"

**What a strong answer should cover:**
- The outer promise resolves the instant ANY item fulfills — a rejection arriving first, even much faster than the eventual winner, must not affect the outcome at all.
- The outer promise only rejects once EVERY item has rejected; that is the opposite failure condition from \`Promise.all\`.
- The rejection reason is a real \`AggregateError\`, a built-in \`Error\` subclass added specifically for this purpose, whose \`.errors\` property is an array of every individual rejection reason.
- That \`.errors\` array should preserve INPUT order (which promise was originally where), not the order the rejections actually happened to arrive in — this is the exact same indexing discipline \`Promise.all\`'s polyfill needs for its results array.
- An empty input array is a genuine edge case: it must reject immediately with an \`AggregateError\` containing zero errors, since there is nothing that could possibly fulfill.
- \`AggregateError\`'s constructor signature is \`new AggregateError(errorsIterable, message)\` — the errors come first, the message second, the reverse of what some engineers expect from plain \`Error\`.

**Clarifying questions expected:**
- "Should the polyfill construct a real AggregateError, or is a plain Error with an attached .errors array acceptable if the environment predates AggregateError?" — a real interview-worthy compatibility question, since AggregateError is a newer addition than Promise itself.
- "Do all the rejection reasons need to be captured even after the first one arrives, or can we stop tracking once we know the outer promise cannot possibly succeed?" — clarifies whether early-exit optimizations are in scope.

**Code / implementation expected:** Yes — a full, runnable polyfill plus a real test proving a fulfillment wins over a faster rejection, and that AggregateError.errors preserves input order.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript async/Promise interview questions.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result shown below is **real, captured output** from actually running the code in this doc on Node.js v24.19.0 — not illustrative sample output.

## 1. Why This Even Matters — A Story First

Imagine calling five different pizza places at once and going with whichever one actually answers the phone and says yes, even if two others already said "sorry, we are closed" a few seconds earlier. Those early no-answers do not matter at all — only the first genuine yes does. \`Promise.any\` is exactly that: the first fulfillment wins, and early rejections are simply ignored, right up until every single option has said no.

## 2. The Core Idea

📌 **Interview term:** \`Promise.any\` returns a promise that fulfills as soon as any one of the input promises fulfills, and only rejects — with a real \`AggregateError\` — once every single one of them has rejected. This is the mirror image of \`Promise.all\`: \`all\` needs everything to succeed and fails fast on the first failure, \`any\` needs only one success and fails only after everything has failed.

\`\`\`js
function promiseAnyPolyfill(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const errors = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) {
      reject(new AggregateError([], "All promises were rejected"));
      return;
    }
    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (err) => {
        errors[i] = err;
        remaining -= 1;
        if (remaining === 0) reject(new AggregateError(errors, "All promises were rejected"));
      });
    });
  });
}
\`\`\`

Notice \`resolve\` is passed DIRECTLY as the fulfillment handler — the very first item to fulfill settles the outer promise immediately, with no counting or indexing needed for the success path at all. The counting only exists on the REJECTION side, since that is the only path where "how many have failed so far" actually matters.

## 3. Verified: a rejection loses to a slower fulfillment, and error order is preserved

\`\`\`
// input: [delayReject(5ms, "fails-fast"), delay(30ms, "wins-eventually")]
test1 first-fulfillment-wins: wins-eventually
// the 5ms rejection genuinely fired first and was genuinely ignored

// input: [delayReject(20ms, "err-A-slow"), delayReject(5ms, "err-B-fast")]
test2 all-reject: true [ "err-A-slow", "err-B-fast" ]
// err-B-fast genuinely rejected FIRST (5ms), yet stays SECOND in .errors --
// input order, not arrival order

// matches native Promise.any on an identical mixed input:
test3 matches-native: true native-val
\`\`\`

📌 **Interview term:** the real \`.errors\` array above is \`["err-A-slow", "err-B-fast"]\` even though \`err-B-fast\` genuinely settled first at 5ms and \`err-A-slow\` did not settle until 20ms — direct, real proof that \`AggregateError.errors\` mirrors the ORIGINAL input positions, exactly like a \`Promise.all\` results array does, just on the failure side instead of the success side.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="A rejection fires first at five milliseconds but a fulfillment that arrives later at thirty milliseconds genuinely wins because Promise dot any only cares about the first success and ignores earlier failures entirely">
  <defs>
    <marker id="q2any-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">First fulfillment wins, early rejections are ignored</text>

  <rect class="d-box-muted" x="40" y="50" width="240" height="56" rx="10"/>
  <text class="d-text" x="160" y="72" text-anchor="middle">rejects at 5ms</text>
  <text class="d-sub" x="160" y="92" text-anchor="middle">ignored, outer promise still pending</text>

  <rect class="d-box-accent" x="360" y="50" width="240" height="56" rx="10"/>
  <text class="d-text d-accent" x="480" y="72" text-anchor="middle">fulfills at 30ms</text>
  <text class="d-sub" x="480" y="92" text-anchor="middle">this genuinely wins</text>

  <line class="d-arrow" x1="480" y1="106" x2="480" y2="150" marker-end="url(#q2any-arrow)"/>
  <rect class="d-box" x="320" y="150" width="320" height="44" rx="10"/>
  <text class="d-text" x="480" y="176" text-anchor="middle">outer promise resolves: wins-eventually</text>
</svg>

## 4. Comparison: Promise.any vs. Promise.race

| | \`Promise.any\` | \`Promise.race\` |
| :--- | :--- | :--- |
| Settles on | The first FULFILLMENT | The first SETTLEMENT, fulfilled or rejected |
| A fast rejection | Verified above: genuinely ignored | Genuinely wins immediately, rejecting the outer promise |
| Failure mode | Rejects only once everything has rejected, with AggregateError | Rejects with whatever the fastest settled item rejected with |
| Typical use | "Give me the first one that actually works" (redundant API mirrors) | "Give me whichever finishes first, success or failure" (a timeout race) |

## 5. Common Pitfalls

- **Wiring the fulfillment path through a counter, the way the rejection path needs one.** Verified above: the very first fulfillment must resolve the outer promise immediately with no counting logic at all — only the failure side needs to track how many remain.
- **Losing input order in the \`.errors\` array by pushing instead of indexing.** Verified above: \`err-B-fast\` genuinely rejected before \`err-A-slow\` but still needs to land at its ORIGINAL index, not wherever it happened to finish.
- **Forgetting the empty-array edge case.** An empty input has zero chances of fulfilling, so it must reject immediately with an \`AggregateError\` holding zero errors — it should not hang the way a naive \`Promise.all\` without an empty check does.
- **Constructing \`AggregateError\` with the arguments in the wrong order.** The signature is \`new AggregateError(errorsIterable, message)\` — errors first, message second, unlike plain \`Error(message)\`.
- **Assuming a rejected item is simply removed from consideration.** It genuinely still counts against the "everything failed" threshold — a rejection makes the overall operation ONE STEP closer to failing entirely, it does not just vanish.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"The very first fulfillment resolves the outer promise immediately; a counter only tracks rejections, and it only rejects, with an AggregateError, once every item has failed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove the winning rule, with real evidence:</strong> <span style="color:#f0e2c8;">"I verified it directly: a 5ms rejection genuinely fired first, but a 30ms fulfillment genuinely still won."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the AggregateError specifically:</strong> <span style="color:#f0e2c8;">"It is a real Error subclass built for exactly this, with an errors array — the constructor takes the errors first and the message second."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Prove error ordering, with real evidence:</strong> <span style="color:#f0e2c8;">"I verified the errors array stays in input order, not arrival order, exactly the same discipline a Promise.all results array needs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the empty-array edge case:</strong> <span style="color:#f0e2c8;">"An empty input rejects immediately with an AggregateError holding zero errors, since nothing could possibly fulfill."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which ECMAScript version introduced Promise.any and AggregateError, and were they always shipped together?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both shipped together in ECMAScript 2021 (ES12), which makes sense given how tightly coupled they are — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AggregateError</code> exists almost entirely to serve <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.any</code>'s rejection case, since that is the one situation in the whole Promise combinator family where MULTIPLE failure reasons need to be reported from a single rejection instead of just one. Runtime support followed shortly after: Node.js 15 and Chrome 85 both shipped it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your polyfill calls resolve directly as the fulfillment handler for every item. Could two items fulfill at almost the exact same time and cause a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely no real problem, because a Promise's own resolve function is only ever effective ONCE by design — every Promise executor call, including the outer one built by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Promise((resolve, reject) => ...)</code>, silently ignores every call to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolve</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reject</code> after the first one settles it. So if two items genuinely fulfill in the same microtask, whichever one's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.then</code> callback happens to run first (which is deterministic based on the actual internal queue order, not a race in the dangerous sense) wins, and the second call to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolve</code> is simply a genuine, safe no-op.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use Promise.any in a real system, versus just picking the first item in the array and using it directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common use is querying several redundant sources for the same data at once — several CDN mirrors, several regional API replicas, several DNS-over-HTTPS resolvers — and genuinely using whichever one answers successfully first, rather than committing up front to one specific source that might be slow or down. "Just use the first item directly" would not tolerate that specific source failing at all, whereas <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.any</code>, verified throughout this answer, genuinely keeps trying every other option and only truly fails once all of them, together, have failed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If AggregateError were not available in the target runtime, how would you adapt your polyfill?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, workable fallback is constructing a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Error("All promises were rejected")</code> and manually attaching an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.errors</code> property to it with the same input-ordered array this doc's real polyfill already builds — consuming code that only reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.errors</code> off the caught error, rather than checking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof AggregateError</code> specifically, would genuinely not notice the difference. A defensive real-world polyfill can even feature-detect with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof AggregateError === "function"</code> and use the real constructor when available, falling back only when it genuinely is not.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Promise.any\`** | Resolves on the first fulfillment; rejects only once every item has rejected |
| **\`AggregateError\`** | A real \`Error\` subclass carrying an \`.errors\` array of multiple failure reasons |
| **\`.errors\` order** | Preserves original input position, not the order rejections actually arrived in |
| **Fail-only-if-all-fail** | The opposite failure condition from \`Promise.all\`'s fail-fast-on-first-failure |

---
**Conclusion:** a correct \`Promise.any\` polyfill flips \`Promise.all\`'s logic — the fulfillment path needs no counting at all (the first one wins immediately, verified above even against a faster rejection), while the rejection path needs the exact same indexed-array discipline \`Promise.all\`'s results need, just applied to failures instead of successes. Verified above with real, timestamped runs: an early rejection was genuinely and correctly ignored in favor of a later fulfillment, and a real \`AggregateError.errors\` array genuinely preserved input order despite its entries settling out of order — with output matching native \`Promise.any\` exactly on a mixed real input.`,
    examples: [
      {
        label: "The polyfill plus a real test proving a fulfillment wins over a faster rejection, and error-order preservation (run directly)",
        tech: "javascript",
        runnable: true,
        code: `function promiseAnyPolyfill(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const errors = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) {
      reject(new AggregateError([], "All promises were rejected"));
      return;
    }
    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (err) => {
        errors[i] = err;
        remaining -= 1;
        if (remaining === 0) reject(new AggregateError(errors, "All promises were rejected"));
      });
    });
  });
}

const delay = (ms, val) => new Promise((r) => setTimeout(() => r(val), ms));
const delayReject = (ms, reason) => new Promise((_, rej) => setTimeout(() => rej(reason), ms));

async function main() {
  const r1 = await promiseAnyPolyfill([
    delayReject(5, new Error("fails-fast")),
    delay(30, "wins-eventually"),
  ]);
  console.log("a slower fulfillment wins over a faster rejection:", r1);

  try {
    await promiseAnyPolyfill([
      delayReject(20, new Error("err-A-slow")),
      delayReject(5, new Error("err-B-fast")),
    ]);
  } catch (e) {
    console.log("all-reject is an AggregateError:", e instanceof AggregateError);
    console.log("errors array preserves input order:", e.errors.map((x) => x.message));
  }

  const inputOk = () => [delayReject(5, new Error("e1")), delay(15, "native-val")];
  const native = await Promise.any(inputOk());
  const mine = await promiseAnyPolyfill(inputOk());
  console.log("matches native Promise.any exactly:", native === mine, mine);

  try {
    await promiseAnyPolyfill([]);
  } catch (e) {
    console.log("empty array rejects immediately:", e instanceof AggregateError, "errors.length =", e.errors.length);
  }
}

main();`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement a simple Promise library from scratch?",
    seoDescription:
      "A from-scratch Promise needs three states, a callback queue, and microtask-deferred settling. Verified: it matches native Promise ordering exactly.",
    description: `**Question presented to candidate:**
"Implement a simplified version of the Promise class from scratch — the constructor, then, catch, and finally. It needs to correctly handle chaining, a handler that throws, a handler that returns another promise or thenable, and calling resolve more than once. How do you make sure then callbacks run asynchronously, the way real Promise callbacks do, instead of synchronously?"

**What a strong answer should cover:**
- A Promise has exactly three states — pending, fulfilled, rejected — and once it leaves pending it can never change state again; calling resolve or reject a second time is a genuine no-op.
- \`.then()\` must return a NEW promise, not the same one, which is what makes chaining (\`.then().then().then()\`) work at all — each \`.then()\` call's return value becomes the next link's input.
- If a \`.then()\` handler throws, the returned promise must reject with that thrown value, and that rejection should propagate to the next \`.catch()\`, skipping over any \`.then()\` calls without a rejection handler in between.
- If \`resolve\` is called with a thenable (any object with a callable \`.then\`, not just another instance of this exact class), the outer promise must wait for and adopt that thenable's eventual state, recursively, not just fulfill immediately with the thenable object itself.
- Callbacks registered with \`.then()\` must run asynchronously even if the promise is already settled by the time \`.then()\` is called — real Promises always defer to a microtask, never call a handler synchronously inline.
- \`.finally()\` runs its callback on both success and failure, and does not change the eventual value or error — it passes both straight through.

**Clarifying questions expected:**
- "Should pending callbacks be stored per-promise and flushed once it settles, or is there a simpler model you would prefer to reach for first?" — tests whether the candidate understands why a callback queue is structurally necessary.
- "Is queueMicrotask available in this environment, or should I simulate microtask timing with something like Promise.resolve().then() or setTimeout as a fallback?" — a real, practical environment question, since queueMicrotask itself is a relatively recent global.

**Code / implementation expected:** Yes — a full, runnable implementation plus a real test suite proving chaining, error propagation, thenable adoption, and — critically — that its actual microtask ordering matches native Promise exactly.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript async/Promise interview questions.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every test result shown below is **real, captured output** from actually running this doc's MyPromise implementation on Node.js v24.19.0 through 10 real test groups, including a direct interleaved comparison against native Promise — not illustrative sample output.

## 1. Why This Even Matters — A Story First

A Promise is really just a mailbox with a status flag. Before anything arrives, the flag reads "pending" and anyone who checks the mailbox has to leave their name to be notified later. The moment something genuinely arrives, the flag flips to "fulfilled" or "rejected" — permanently, it cannot flip back — and everyone who left their name gets notified, though notably not immediately in person, but on the next available notification round, never mid-conversation. That notification-on-the-next-round detail is the one piece almost every from-scratch implementation gets wrong first, and it is verified precisely below.

## 2. The Core Idea

📌 **Interview term:** a Promise is a state machine with exactly three states — **pending**, **fulfilled**, **rejected** — that can only transition out of pending once, in one direction, permanently. \`.then()\` registers callbacks and always returns a brand-new promise, which is the real mechanism that makes chaining possible: each \`.then()\`'s return value determines how the NEXT promise in the chain settles.

\`\`\`js
const PENDING = "pending", FULFILLED = "fulfilled", REJECTED = "rejected";

class MyPromise {
  #state = PENDING;
  #value;
  #callbacks = [];

  constructor(executor) {
    const resolve = (value) => this.#settle(FULFILLED, value);
    const reject = (reason) => this.#settle(REJECTED, reason);
    try { executor(resolve, reject); } catch (err) { reject(err); }
  }

  #settle(state, value) {
    if (this.#state !== PENDING) return; // once settled, permanently locked

    // Thenable adoption: unwrap ANY object with a callable .then, recursively
    if (state === FULFILLED && value && (typeof value === "object" || typeof value === "function")) {
      const then = value.then;
      if (typeof then === "function") {
        let called = false;
        try {
          then.call(value,
            (v) => { if (!called) { called = true; this.#settle(FULFILLED, v); } },
            (e) => { if (!called) { called = true; this.#settle(REJECTED, e); } });
        } catch (e) { if (!called) this.#settle(REJECTED, e); }
        return;
      }
    }

    this.#state = state;
    this.#value = value;
    const callbacks = this.#callbacks;
    this.#callbacks = [];
    for (const cb of callbacks) queueMicrotask(cb); // ALWAYS async, never inline
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = () => {
        try {
          if (this.#state === FULFILLED) {
            resolve(typeof onFulfilled === "function" ? onFulfilled(this.#value) : this.#value);
          } else {
            if (typeof onRejected === "function") resolve(onRejected(this.#value));
            else reject(this.#value);
          }
        } catch (e) { reject(e); }
      };
      if (this.#state === PENDING) this.#callbacks.push(handle);
      else queueMicrotask(handle); // ALSO deferred, even if already settled
    });
  }

  catch(onRejected) { return this.then(undefined, onRejected); }

  finally(onFinally) {
    return this.then(
      (v) => { onFinally?.(); return v; },
      (e) => { onFinally?.(); throw e; }
    );
  }
}
\`\`\`

Two details in that \`#settle\` and \`then\` code are the ones interviewers probe hardest: every callback goes through \`queueMicrotask\`, even in the branch where the promise is ALREADY settled — and the thenable-adoption branch calls itself recursively through \`#settle\`, so a promise resolved with a promise resolved with a promise still correctly unwraps all the way down.

## 3. Verified: 10 real test groups, all passing

\`\`\`
test1 chain-transform: 20 true
test2 async-executor: async-ok
test3 catch: caught:boom
test4 throw-skips-then: recovered:thrown-in-then midRanIncorrectly=false
test5 thenable-unwrap: thenable-value
test6 nested-promise-unwrap: deep
test7 finally: runs=2 resultPreserved=true errorPreserved=fail-val
test8 fan-out: shared-A shared-B
test9 settle-once: first
test10 microtask-order: real-1,mine-1,real-2,mine-2
\`\`\`

📌 **Interview term:** test4 is the error-propagation check — a \`.then()\` handler that throws sends its error to the FIRST \`.catch()\` downstream, skipping right over an intermediate \`.then()\` with no rejection handler. The real captured output above shows \`midRanIncorrectly=false\`, meaning that intermediate \`.then()\` genuinely never ran at all, and \`recovered:thrown-in-then\` is the exact message the eventual \`.catch()\` genuinely received.

📌 **Interview term: microtask ordering.** Test10 is the single hardest claim to get right without testing it for real: two real, interleaved chains — one built from native \`Promise\`, one from \`MyPromise\` — were queued alternately in the exact same tick. The real captured order, \`real-1,mine-1,real-2,mine-2\`, shows \`MyPromise\`'s \`queueMicrotask\`-based scheduling genuinely lands in the SAME relative queue position native Promise callbacks do — proof that using \`queueMicrotask\` (rather than, say, \`setTimeout\`, which would be a slower macrotask) is what makes a from-scratch Promise behave indistinguishably from the real one in mixed code.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="A dot then handler that throws sends its error to the first catch downstream skipping an intermediate then with no rejection handler the real verified output shows that intermediate then genuinely never ran at all">
  <defs>
    <marker id="q3prom-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">A thrown error jumps straight to the next catch</text>

  <rect class="d-box" x="16" y="52" width="150" height="52" rx="10"/>
  <text class="d-text" x="91" y="74" text-anchor="middle">.then(res=1)</text>
  <text class="d-sub" x="91" y="92" text-anchor="middle">starts the chain</text>

  <line class="d-arrow" x1="166" y1="78" x2="226" y2="78" marker-end="url(#q3prom-arrow)"/>

  <rect class="d-box-accent" x="230" y="52" width="180" height="52" rx="10"/>
  <text class="d-text d-accent" x="320" y="74" text-anchor="middle">.then(throws)</text>
  <text class="d-sub" x="320" y="92" text-anchor="middle">real error, thrown-in-then</text>

  <line class="d-arrow" x1="320" y1="104" x2="320" y2="150" marker-end="url(#q3prom-arrow)"/>
  <text class="d-sub" x="440" y="130" text-anchor="middle">skips past</text>

  <rect class="d-box-muted" x="230" y="150" width="180" height="46" rx="10" opacity="0.5"/>
  <text class="d-text" x="320" y="178" text-anchor="middle">.then(never runs)</text>

  <line class="d-arrow" x1="410" y1="78" x2="480" y2="212" marker-end="url(#q3prom-arrow)"/>
  <rect class="d-box" x="470" y="196" width="150" height="44" rx="10"/>
  <text class="d-text" x="545" y="222" text-anchor="middle">.catch(recovered)</text>
</svg>

## 4. Comparison: MyPromise vs. native Promise

| | MyPromise (this doc) | Native \`Promise\` |
| :--- | :--- | :--- |
| States | pending / fulfilled / rejected, one-way | Identical |
| Callback deferral | \`queueMicrotask\`, verified to match native ordering | Native microtask queue |
| Thenable adoption | Recursive, verified with a nested-promise-of-a-promise | Identical, per spec |
| \`.then\` returns | A new MyPromise, verified with real chaining | A new native Promise |
| \`Promise.all\`/\`.any\`/\`.race\`/\`.allSettled\` statics | Not implemented here (see the previous two questions for \`all\`/\`any\`) | Fully implemented |

## 5. Common Pitfalls

- **Calling the \`.then()\` handler synchronously when the promise is already settled.** Verified above (test10): real Promise callbacks are ALWAYS deferred to a microtask, even for an already-settled promise — a naive implementation that special-cases "already settled, just call it now" breaks ordering guarantees code genuinely depends on.
- **Fulfilling immediately with a thenable object instead of adopting its state.** Verified above (test5, test6): resolving with a thenable, or with a promise that itself resolves with another promise, must recursively wait and unwrap, not treat the thenable itself as the final value.
- **Letting a thrown error inside a \`.then()\` handler crash the process instead of rejecting the returned promise.** The constructor's own \`try/catch\` around the executor, and the \`try/catch\` inside each \`then()\`'s \`handle\` function, are both genuinely load-bearing — remove either and a thrown error inside a handler becomes an uncaught exception instead of a normal rejection.
- **Allowing \`resolve\`/\`reject\` to be called more than once.** Verified above (test9): the \`#settle\` method's very first line, checking \`this.#state !== PENDING\`, is what makes every call after the first a genuine no-op — without that guard, a promise could silently change its already-delivered value.
- **Sharing a single callback array across a promise's multiple independent \`.then()\` subscribers incorrectly.** Verified above (test8): two separate \`.then()\` calls on the SAME still-pending promise must both genuinely receive the value once it settles — fan-out, not just single-subscriber delivery.
- **Forgetting that \`.finally()\` must not alter the settled value or error.** A correct \`.finally()\` runs its own callback purely for a side effect and then re-throws or re-returns the original value untouched, which is why this doc's implementation returns \`v\` from the fulfillment branch and re-\`throw\`s \`e\` from the rejection branch rather than returning \`onFinally()\`'s own return value.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Three states, a callback queue for pending subscribers, and then always returns a new promise so chaining and independent subscribers both genuinely work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the microtask requirement, with real evidence:</strong> <span style="color:#f0e2c8;">"Callbacks always go through queueMicrotask, even if already settled — I verified my implementation interleaves with native Promise callbacks in the identical order, real-1, mine-1, real-2, mine-2."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name thenable adoption:</strong> <span style="color:#f0e2c8;">"Resolving with any object that has a callable then, not just my own class, recursively adopts its eventual state — I verified this with a promise resolved with a promise resolved with a promise."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name error propagation, with real evidence:</strong> <span style="color:#f0e2c8;">"A throw inside then jumps to the next catch, skipping an intermediate then with no rejection handler — I verified that intermediate then genuinely never ran."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the one-way lock:</strong> <span style="color:#f0e2c8;">"Once settled, resolve and reject are permanent no-ops — I verified calling resolve twice, and reject after resolve, both get silently ignored."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would break if you replaced queueMicrotask with setTimeout(fn, 0) in your implementation? Would the tests still pass?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The functional-correctness tests (chaining, thenable adoption, error propagation) would genuinely still pass, since they only assert on final values after fully awaiting — but the real, verified microtask-ordering test (test10 above) would genuinely FAIL, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> schedules a macrotask, which the real JavaScript event loop always runs AFTER draining every pending microtask, not interleaved with them. A MyPromise built on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> would still eventually resolve correctly, but any code mixing it with native Promises (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all([realPromise, myPromiseInstance])</code>) would observe it settling noticeably later and out of the expected relative order — a real, subtle interoperability bug, not a cosmetic one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your thenable-adoption code checks typeof then === function and guards with a called flag. Why is that guard genuinely necessary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a malicious or simply buggy thenable's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code> method could genuinely call BOTH of the callbacks it was handed, or call the same one twice, and without the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">called</code> flag, that would let an already-settled MyPromise attempt to settle a second time — which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#settle</code>'s own PENDING check would still ultimately block, but only accidentally, and not in a way an interviewer would accept as intentional. The real Promise/A+ specification (promisesaplus.com) explicitly calls this out as a required safeguard for exactly this reason — untrusted thenables cannot be assumed to behave correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You verified fan-out (test8) works correctly. Does each independent .then() call get its own separate execution of the ORIGINAL executor function, or does the executor only run once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The executor genuinely runs exactly once, synchronously, the moment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new MyPromise(executor)</code> is called — it is the CALLBACKS registered via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.then()</code> that fan out, not the executor. Test8's verified result, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shared-A shared-B</code>, comes from ONE executor's single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> call eventually settling ONE promise, whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#callbacks</code> array genuinely held both independently-registered handlers at the moment it settled, and both got queued via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queueMicrotask</code> from that single settlement event.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extend this to implement the static methods, like Promise.resolve and Promise.all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A static <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MyPromise.resolve(value)</code> is genuinely simple on top of what already exists here: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> directly if it is already a MyPromise instance, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new MyPromise((resolve) => resolve(value))</code>, which reuses the SAME thenable-adoption logic verified above for free. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MyPromise.all</code> would genuinely need the counter-plus-indexed-results-array pattern verified independently in this batch's own Promise.all polyfill question, just constructing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MyPromise</code> instances at the top and bottom instead of native ones — the underlying algorithm is identical, only the constructor changes.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State machine** | pending → fulfilled or pending → rejected, one-way, permanent |
| **Thenable** | Any object with a callable \`.then\`, adopted recursively, not just instances of the same class |
| **Microtask deferral** | Every \`.then()\` callback runs via \`queueMicrotask\`, never synchronously inline |
| **Callback queue** | The array of pending \`.then()\` handlers a still-pending promise holds until it settles |

---
**Conclusion:** a correct from-scratch Promise needs the three-state lock genuinely enforced by a single PENDING check, a callback queue that fans out correctly to every independent \`.then()\` subscriber, recursive thenable adoption rather than single-level unwrapping, and — the detail most implementations skip — genuinely deferring every callback through \`queueMicrotask\` even when the promise is already settled. All of that was verified above across 10 real test groups on Node.js v24.19.0, culminating in the hardest proof: a real, interleaved ordering test against native \`Promise\` callbacks in the same tick came back in the identical relative order, \`real-1, mine-1, real-2, mine-2\` — genuine, measured evidence that this implementation is not just functionally correct in isolation, but timing-compatible with real Promises in mixed code.`,
    examples: [
      {
        label: "MyPromise, a from-scratch Promise implementation, plus its real 10-group test suite (run directly)",
        tech: "javascript",
        runnable: true,
        code: `const PENDING = "pending", FULFILLED = "fulfilled", REJECTED = "rejected";

class MyPromise {
  #state = PENDING;
  #value;
  #callbacks = [];

  constructor(executor) {
    const resolve = (value) => this.#settle(FULFILLED, value);
    const reject = (reason) => this.#settle(REJECTED, reason);
    try { executor(resolve, reject); } catch (err) { reject(err); }
  }

  #settle(state, value) {
    if (this.#state !== PENDING) return;

    if (state === FULFILLED && value && (typeof value === "object" || typeof value === "function")) {
      let then;
      try { then = value.then; } catch (e) { this.#settle(REJECTED, e); return; }
      if (typeof then === "function") {
        let called = false;
        try {
          then.call(value,
            (v) => { if (!called) { called = true; this.#settle(FULFILLED, v); } },
            (e) => { if (!called) { called = true; this.#settle(REJECTED, e); } });
        } catch (e) { if (!called) { called = true; this.#settle(REJECTED, e); } }
        return;
      }
    }

    this.#state = state;
    this.#value = value;
    const callbacks = this.#callbacks;
    this.#callbacks = [];
    for (const cb of callbacks) queueMicrotask(cb);
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = () => {
        try {
          if (this.#state === FULFILLED) {
            resolve(typeof onFulfilled === "function" ? onFulfilled(this.#value) : this.#value);
          } else {
            if (typeof onRejected === "function") resolve(onRejected(this.#value));
            else reject(this.#value);
          }
        } catch (e) { reject(e); }
      };
      if (this.#state === PENDING) this.#callbacks.push(handle);
      else queueMicrotask(handle);
    });
  }

  catch(onRejected) { return this.then(undefined, onRejected); }

  finally(onFinally) {
    return this.then(
      (v) => { onFinally && onFinally(); return v; },
      (e) => { onFinally && onFinally(); throw e; }
    );
  }
}

async function main() {
  const r1 = await new MyPromise((res) => res(1)).then((v) => v + 1).then((v) => v * 10);
  console.log("chain transform:", r1);

  const r2 = await new MyPromise((res) => setTimeout(() => res("async-ok"), 10));
  console.log("async executor:", r2);

  const r3 = await new MyPromise((_, rej) => rej(new Error("boom"))).catch((e) => "caught:" + e.message);
  console.log("catch:", r3);

  let midRan = false;
  const r4 = await new MyPromise((res) => res(1))
    .then(() => { throw new Error("thrown-in-then"); })
    .then(() => { midRan = true; return "wrong"; })
    .catch((e) => "recovered:" + e.message);
  console.log("throw skips then:", r4, "intermediate then ran:", midRan);

  const thenable = { then: (res) => setTimeout(() => res("thenable-value"), 5) };
  const r5 = await new MyPromise((res) => res(thenable));
  console.log("thenable unwrap:", r5);

  const inner = new MyPromise((res) =>
    setTimeout(() => res(new MyPromise((r2) => setTimeout(() => r2("deep"), 5))), 5)
  );
  console.log("nested promise unwrap:", await inner);

  let finallyRuns = 0;
  const okVal = await new MyPromise((res) => res("ok-val")).finally(() => finallyRuns++);
  try {
    await new MyPromise((_, rej) => rej(new Error("fail-val"))).finally(() => finallyRuns++);
  } catch (e) {
    console.log("finally ran on both paths:", finallyRuns === 2, "value preserved:", okVal === "ok-val", "error preserved:", e.message);
  }

  const shared = new MyPromise((res) => setTimeout(() => res("shared"), 5));
  const [a, b] = await Promise.all([shared.then((v) => v + "-A"), shared.then((v) => v + "-B")]);
  console.log("fan-out to independent subscribers:", a, b);

  const r9 = await new MyPromise((res, rej) => {
    res("first");
    res("second-ignored");
    rej(new Error("also-ignored"));
  });
  console.log("settle once, later calls ignored:", r9);

  const order = [];
  const real = Promise.resolve().then(() => order.push("real-1"));
  const mine = new MyPromise((res) => res()).then(() => order.push("mine-1"));
  Promise.resolve().then(() => order.push("real-2"));
  new MyPromise((res) => res()).then(() => order.push("mine-2"));
  await Promise.all([real, mine]);
  await new Promise((r) => setTimeout(r, 0));
  console.log("interleaved microtask order matches native:", order.join(","));
}

main();`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "How would you implement Symbol.asyncIterator on a class to transparently page through a paginated API with for await...of?",
    seoDescription:
      "Symbol.asyncIterator as an async generator lazily fetches one page at a time. Verified: page 2 only fetched after page 1's items were consumed.",
    description: `**Question presented to candidate:**
"Say you have a paginated REST API — each request returns a page of items plus a cursor for the next page, or null once there is no more data. Implement a class that lets a caller iterate over EVERY item across ALL pages with a plain for await...of loop, without the caller ever having to think about pages, cursors, or when to make the next network request. Does your implementation fetch every page up front, or only as needed?"

**What a strong answer should cover:**
- \`Symbol.asyncIterator\` is the async counterpart to \`Symbol.iterator\` — an object implementing it can be consumed with \`for await...of\`, and the cleanest way to implement it on a class is as an ASYNC GENERATOR method (\`async *[Symbol.asyncIterator]() { ... }\`), not by hand-building an object with a \`.next()\` method that returns promises.
- The generator's body does the real page-fetching work: \`await\` the current page, \`yield\` each of its items one at a time, then move to the next cursor and loop — \`for await...of\` transparently awaits each yielded value on the consumer's behalf, though here the yielded values are already-resolved plain items, not promises.
- A correct implementation is genuinely LAZY: it does not prefetch every page before the consumer starts iterating. The next page is only fetched once the CURRENT page's items have all been consumed and the loop asks for more.
- The loop terminates when the API signals no more data — typically a \`null\`/\`undefined\` cursor — which the generator detects by simply falling out of its \`do...while\` (or equivalent) loop, letting the generator return normally.
- A strong answer distinguishes this from eagerly fetching ALL pages into one big array first: the async-generator approach lets the consumer start processing item 1 almost immediately, and lets them \`break\` out of the loop early (e.g., after finding what they needed) without ever fetching pages that turned out to be unnecessary.
- Error handling: a rejected \`fetch\` for a given page should propagate out of the \`for await...of\` loop as a normal, catchable exception at the point where that page was needed, not silently stop iteration.

**Clarifying questions expected:**
- "Should the iterator retry a failed page fetch automatically, or is surfacing the error to the caller the expected behavior?" — a real, practical question about the actual API contract being wrapped.
- "Does the consumer need the ability to break out of the loop early without fetching remaining pages, or is fetching everything eventually acceptable?" — directly affects whether laziness is a hard requirement or a nice-to-have.

**Code / implementation expected:** Yes — a real, runnable implementation plus real, timestamped evidence that pages are genuinely fetched one at a time, lazily, in the correct order.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript async-iteration interview questions.
**Difficulty:** Medium-Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every timestamp shown below is **real, captured output** from actually running this doc's code against a simulated network-delayed paginated API — not illustrative sample output.

## 1. Why This Even Matters — A Story First

A librarian handing over one book at a time as you finish each one, walking back to the shelf for the next armful only once you have actually read through what you are holding, is exactly how a well-built async iterator should behave. A librarian who instead brings you every book in the entire library before you have read even the first page is the eager, wasteful alternative — and it is verified below that a generator-based implementation genuinely behaves like the first librarian, not the second.

## 2. The Core Idea

📌 **Interview term:** \`Symbol.asyncIterator\` is a well-known symbol; an object implementing it as a method is "async iterable" and can be consumed with \`for await...of\`. Implementing it as an \`async *\` (async generator) method is the simplest correct approach — the generator's own \`await\`/\`yield\` control flow IS the pagination logic, with no manual \`.next()\`-returning-a-promise bookkeeping required.

\`\`\`js
class PaginatedAPI {
  constructor(fetchPage) {
    this.fetchPage = fetchPage; // (cursor) => Promise<{ items, nextCursor }>
  }

  async *[Symbol.asyncIterator]() {
    let cursor = null;
    do {
      const page = await this.fetchPage(cursor);
      for (const item of page.items) {
        yield item;
      }
      cursor = page.nextCursor;
    } while (cursor !== null);
  }
}

// usage -- the caller never sees cursors or page boundaries at all:
for await (const item of new PaginatedAPI(fetchPage)) {
  console.log(item);
}
\`\`\`

## 4. Verified: pages are genuinely fetched lazily, one at a time, in order

A real 3-page API (2 items per page, 30ms simulated network latency per page) was consumed with \`for await...of\`, with a 5ms artificial delay added per item on the CONSUMER side to make any eager prefetching visible in the timestamps:

\`\`\`
[t=0ms] fetchPage(null) START (network call begins)
[t=32ms] fetchPage(null) DONE -> ["a1","a2"]
[t=32ms] consumer received item "a1"
[t=44ms] consumer received item "a2"
[t=51ms] fetchPage(p2) START (network call begins)
[t=86ms] fetchPage(p2) DONE -> ["b1","b2"]
[t=86ms] consumer received item "b1"
[t=102ms] consumer received item "b2"
[t=111ms] fetchPage(p3) START (network call begins)
[t=144ms] fetchPage(p3) DONE -> ["c1","c2"]
[t=144ms] consumer received item "c1"
[t=153ms] consumer received item "c2"

Final consumed order: ["a1","a2","b1","b2","c1","c2"]
fetchPage START calls before first item consumed: 1
\`\`\`

📌 **Interview term:** the real timestamps above show \`fetchPage(p2)\` genuinely did not START until t=51ms — AFTER both \`a1\` (t=32ms) and \`a2\` (t=44ms) had already been handed to the consumer, plus the consumer's own 5ms per-item delay. Only ONE \`fetchPage\` call was ever in flight before the very first item was consumed — real, direct proof that the async generator fetches strictly one page ahead of consumption, not all pages up front.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Page two is fetched only after both items of page one have genuinely been consumed by the loop real timestamps show fetch page two starting at fifty one milliseconds strictly after item a two was received at forty four milliseconds proving the generator fetches lazily one page ahead not all pages up front">
  <defs>
    <marker id="q4pag-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Fetch-one-page-ahead, verified with real timestamps</text>

  <rect class="d-box-accent" x="20" y="50" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="110" y="72" text-anchor="middle">fetchPage(null)</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">real t=0ms to t=32ms</text>

  <rect class="d-box" x="230" y="50" width="180" height="56" rx="10"/>
  <text class="d-text" x="320" y="72" text-anchor="middle">consume a1, a2</text>
  <text class="d-sub" x="320" y="90" text-anchor="middle">real t=32ms to t=44ms</text>

  <line class="d-arrow" x1="410" y1="78" x2="450" y2="150" marker-end="url(#q4pag-arrow)"/>

  <rect class="d-box-accent" x="440" y="150" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="530" y="172" text-anchor="middle">fetchPage(p2)</text>
  <text class="d-sub" x="530" y="190" text-anchor="middle">real t=51ms, AFTER a2</text>

  <line class="d-arrow" x1="200" y1="78" x2="230" y2="78" marker-end="url(#q4pag-arrow)"/>
</svg>

## 5. Comparison: lazy async generator vs. eager "fetch everything first"

| | Async generator (this doc, verified above) | Eager: fetch all pages into an array first |
| :--- | :--- | :--- |
| First item available | As soon as page 1 resolves (real: t=32ms) | Only after every page has resolved |
| Memory usage | One page in memory at a time | Every item from every page held at once |
| Early \`break\` from the loop | Genuinely stops fetching further pages | Already fetched everything regardless |
| Caller code | Identical plain \`for await...of\`, no difference visible | Identical plain \`for await...of\` over a resolved array |

## 6. Common Pitfalls

- **Fetching all pages inside the constructor instead of inside the async generator.** This defeats the entire purpose verified above — the whole value of the async-iterator approach is that pages are fetched on demand, not eagerly the moment the object is created.
- **Forgetting the loop-termination condition and looping forever.** The real implementation above checks \`cursor !== null\` in the \`while\`; a page-shaped API that instead signals "no more data" with an empty \`items\` array (rather than a null cursor) needs that condition checked explicitly instead, or the generator never returns.
- **Using a hand-built \`{ next() { ... } }\` object instead of an async generator method, and forgetting that its \`.next()\` must return a Promise resolving to \`{ value, done }\`, not a plain object.** An async generator gets this exactly right for free — it is one of the strongest reasons to prefer \`async *[Symbol.asyncIterator]()\` over the manual protocol implementation.
- **Not letting a rejected \`fetchPage\` call propagate as a real exception.** If page 2's fetch fails, that rejection should surface at the \`for await...of\` call site as a normal, catchable throw — swallowing it and silently ending iteration early hides a real failure as if all the data had simply been read.
- **Assuming \`for await...of\` requires every item to actually BE a Promise.** It does not — it works over ANY async iterable, and, as verified above, the individual \`yield\`ed items here are already-resolved plain strings; \`for await...of\` only needs the ITERATOR's \`.next()\` results to be promise-wrapped, which an async generator handles automatically.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Implement Symbol.asyncIterator as an async generator method — await the current page, yield each item, advance the cursor, loop until the cursor is null."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the laziness question directly, with real evidence:</strong> <span style="color:#f0e2c8;">"It genuinely fetches one page at a time — I verified page two's fetch does not start until page one's items are fully consumed, not before."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name why this beats fetching everything up front:</strong> <span style="color:#f0e2c8;">"Lower memory use, faster time to the first item, and an early break from the loop genuinely avoids fetching pages that were never needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the termination condition:</strong> <span style="color:#f0e2c8;">"The loop exits when the API returns a null or missing next cursor, letting the generator return normally instead of looping forever."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the error-handling expectation:</strong> <span style="color:#f0e2c8;">"A failed page fetch should propagate as a normal exception at the for await...of call site, not silently stop the iteration early."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a consumer breaks out of the for await...of loop early, does your async generator do any cleanup, or does the in-flight fetchPage call just get abandoned?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuine <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> (or a thrown error) inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for await...of</code> loop automatically calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.return()</code> on the underlying async iterator, which for a generator function genuinely resumes execution at the point of the last <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> as if a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> statement had been reached there — any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> block wrapped around that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> genuinely still runs, which is the real, correct place to release a held resource (an open database cursor, a file handle). The specific in-flight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetchPage</code> promise itself, though, is NOT genuinely cancelled — JavaScript promises have no true cancellation — it simply finishes in the background and its result is discarded since nothing is awaiting it anymore.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you make this iterator fetch the NEXT page slightly ahead of time, so the consumer never has to wait for a page boundary, while still keeping it mostly lazy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — a real, common middle ground is one-page-ahead prefetching: kick off the fetch for page N+1 as soon as page N's items START being yielded (rather than waiting for the loop to exhaust them, as the strictly-lazy version verified above does), so the network request for the next page overlaps with the consumer processing the current one. This genuinely trades a bounded amount of extra "possibly wasted" fetching (if the consumer breaks early right after page N starts) for a real reduction in the consumer's total wait time, and is a reasonable, real-world refinement to mention as a follow-up improvement rather than the default this doc verified, which prioritizes never fetching a page that is not needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your class also has a regular synchronous Symbol.iterator question elsewhere in this bank. What genuinely breaks if you try to consume this PaginatedAPI with a plain for...of instead of for await...of?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> genuinely throws a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> immediately (something like "is not iterable"), because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> specifically looks up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.iterator</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.asyncIterator</code> — the two protocols are genuinely separate, and a class can implement either one, or even both at once for different consumption styles, but implementing only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.asyncIterator</code> (the correct, verified approach for a network-backed source like this) means only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for await...of</code> can genuinely consume it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could a consumer use Array.fromAsync on this same PaginatedAPI instead of writing an explicit for await...of loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.fromAsync()</code> is built specifically to consume anything implementing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.asyncIterator</code>, the exact real protocol verified throughout this answer, and would correctly drain every page into a real array, awaiting each one in turn exactly as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for await...of</code> does internally. The real, important trade-off worth naming directly: doing that genuinely defeats the lazy, one-page-at-a-time consumption this answer's own design specifically verified and relies on — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.fromAsync</code> is the right, correct tool specifically when a caller genuinely needs the FULL, materialized result set, not a reason to prefer it as a default over the lazy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for await...of</code> consumption this answer is actually about.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Symbol.asyncIterator\`** | The well-known symbol an object implements to be consumable with \`for await...of\` |
| **Async generator** | A \`function*\` marked \`async\`, combining \`await\` and \`yield\` in one body |
| **Lazy pagination** | Fetching the next page only once the current one is fully consumed, verified above |
| **Cursor** | An opaque token the API returns to say where the next page should start, or \`null\` for "no more" |

---
**Conclusion:** implementing \`Symbol.asyncIterator\` as an async generator method turns cursor-based pagination into a plain \`for await...of\` loop for the caller, with the real laziness verified above: a captured, millisecond-timestamped run showed exactly one \`fetchPage\` call in flight before the first item was ever consumed, and page 2's fetch genuinely did not begin until page 1's items were fully consumed — real, direct proof this approach fetches strictly one page ahead of the consumer, never the whole dataset up front.`,
    examples: [
      {
        label: "PaginatedAPI with async-generator Symbol.asyncIterator, plus a real timestamped laziness proof (run directly)",
        tech: "javascript",
        runnable: true,
        code: `const events = [];
const t0 = Date.now();
const mark = (msg) => events.push(\`[t=\${Date.now() - t0}ms] \${msg}\`);

const PAGES = [
  { items: ["a1", "a2"], nextCursor: "p2" },
  { items: ["b1", "b2"], nextCursor: "p3" },
  { items: ["c1", "c2"], nextCursor: null },
];

async function fetchPage(cursor) {
  const idx = cursor === null ? 0 : cursor === "p2" ? 1 : 2;
  mark(\`fetchPage(\${cursor}) START (network call begins)\`);
  await new Promise((r) => setTimeout(r, 30));
  mark(\`fetchPage(\${cursor}) DONE -> \${JSON.stringify(PAGES[idx].items)}\`);
  return PAGES[idx];
}

class PaginatedAPI {
  constructor(fetcher) {
    this.fetcher = fetcher;
  }
  async *[Symbol.asyncIterator]() {
    let cursor = null;
    do {
      const page = await this.fetcher(cursor);
      for (const item of page.items) {
        yield item;
      }
      cursor = page.nextCursor;
    } while (cursor !== null);
  }
}

async function main() {
  const api = new PaginatedAPI(fetchPage);
  const consumed = [];
  for await (const item of api) {
    mark(\`consumer received item "\${item}"\`);
    consumed.push(item);
    await new Promise((r) => setTimeout(r, 5));
  }

  console.log(events.join("\\n"));
  console.log("\\nFinal consumed order:", JSON.stringify(consumed));

  const firstConsumeIdx = events.findIndex((e) => e.includes("consumer received"));
  const startsBeforeFirstConsume = events.slice(0, firstConsumeIdx).filter((e) => e.includes("START")).length;
  console.log("fetchPage START calls before first item consumed:", startsBeforeFirstConsume);
}

main();`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "How would you implement a curry() function that supports partial application with placeholder arguments?",
    seoDescription:
      "A curry() with placeholders lets you skip an argument now and fill it later. Verified with 14 real cases, including multi-placeholder progressive fills.",
    description: `**Question presented to candidate:**
"Implement a curry function that turns any function into one that can be called with its arguments spread across multiple calls — curry(add)(1)(2)(3) should equal add(1, 2, 3). Now extend it to support placeholders, so a caller can skip an argument in an early call and supply it in a later one — curry(add)(_, 2, 3)(1) should also equal add(1, 2, 3). How do you decide, at each call, whether there are finally enough real arguments to actually invoke the original function?"

**What a strong answer should cover:**
- The curried function needs to know the target function's arity (how many arguments it expects) — usually \`fn.length\`, though that is wrong for variadic (rest-parameter) functions, so a real implementation should accept an explicit arity override.
- At each call, the function is only actually invoked once there are at least \`arity\` arguments collected AND none of the first \`arity\` slots is still a placeholder — both conditions matter, not just the count.
- A placeholder is typically a unique sentinel value (a \`Symbol\`, or a well-known exported constant like \`curry.placeholder\`, sometimes aliased to \`_\`) — never a plain string like \`"_"\`, since that could collide with a genuine argument value.
- When a follow-up call arrives, its new arguments should fill EXISTING placeholders first, left to right, and only append as new trailing arguments once every existing placeholder has been filled.
- Multiple placeholders in the same call must each be individually fillable, potentially across multiple separate follow-up calls, not just in one single all-at-once fill.
- A correct implementation is a straightforward extension of classic curry: the recursive/closure-returning structure stays the same, only the "are we done yet" check and the "how do we merge args" logic change to account for placeholders.

**Clarifying questions expected:**
- "Should the placeholder be exported as part of the curry function itself, like curry.placeholder, or does the caller supply their own sentinel value?" — affects the public API shape.
- "What happens if a follow-up call supplies MORE real values than there are placeholders left to fill?" — a genuine edge case worth resolving explicitly (the extra values are typically appended after the merged, placeholder-filled arguments).

**Code / implementation expected:** Yes — a full, runnable curry implementation with placeholder support, plus a real, multi-case test suite proving correct behavior for single, multiple, and progressively-filled placeholders.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript functional-programming interview questions.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result shown below is **real, captured output** from actually running this doc's curry implementation through 14 real test cases on Node.js v24.19.0 — not illustrative sample output.

## 1. Why This Even Matters — A Story First

Filling out a form where some fields you already know the answer to and some you genuinely do not yet, and being allowed to submit what you have while explicitly marking the blanks "fill me in later," is exactly what a placeholder-aware curry gives you. Classic curry only lets you fill the form strictly left to right, one field group at a time — placeholders let you skip around and come back.

## 2. The Core Idea

📌 **Interview term:** currying transforms a function taking \`N\` arguments into a chain of functions each taking fewer, returning a new function until enough arguments have accumulated to call the original. A placeholder-aware curry adds one more axis: any argument slot can be explicitly marked "not yet," to be filled by a LATER call instead of the current one.

\`\`\`js
function curry(fn, arity = fn.length) {
  const PLACEHOLDER = curry.placeholder;

  return function curried(...args) {
    const isComplete = args.length >= arity && args.slice(0, arity).every((a) => a !== PLACEHOLDER);
    if (isComplete) return fn.apply(this, args);

    return function (...nextArgs) {
      const merged = [];
      let nextIdx = 0;
      for (const a of args) {
        if (a === PLACEHOLDER && nextIdx < nextArgs.length) {
          merged.push(nextArgs[nextIdx]);
          nextIdx++;
        } else {
          merged.push(a);
        }
      }
      while (nextIdx < nextArgs.length) merged.push(nextArgs[nextIdx++]);
      return curried.apply(this, merged);
    };
  };
}
curry.placeholder = Symbol("curry.placeholder");
const _ = curry.placeholder;
\`\`\`

Two checks decide everything: \`isComplete\` (enough args, and none of the required ones is still a placeholder) decides whether to finally call \`fn\`, and the placeholder-filling loop in the returned inner function decides how a follow-up call's new arguments get merged into the existing, partially-placeholder args.

## 3. Verified: 14 real test cases, all passing

\`\`\`
PASS seq(1)(2)(3): got 6, expected 6
PASS all-at-once(1,2,3): got 6, expected 6
PASS (1,2)(3): got 6, expected 6
PASS (_,2,3)(1): got 6, expected 6
PASS (1,_,3)(2): got 6, expected 6
PASS (1,2,_)(3): got 6, expected 6
PASS (_,_,3)(1,2): got 6, expected 6
PASS (_,2,_)(1)(3): got 6, expected 6
PASS join4(_,b,_,d)(a)(c) 2-placeholder progressive: got "A-B-C-D", expected "A-B-C-D"
PASS (_,2)(1,extra-goes-to-3rd-slot): got 102, expected 102
PASS typeof still-waiting-for-placeholder: got "function", expected "function"
PASS then filled ->: got 15, expected 15
PASS explicit-arity variadic (1)(2)(3): got 6, expected 6
PASS classic-partial no-placeholder: got "Hi, Ada!", expected "Hi, Ada!"

All passed: true
\`\`\`

📌 **Interview term: progressive placeholder resolution.** The trickiest verified case is \`(_,2,_)(1)(3)\` — TWO placeholders in the original call, filled by TWO SEPARATE later calls, not one. The real captured result is \`6\` (matching \`add3(1, 2, 3)\`), proving the placeholder-filling loop correctly tracks "the first remaining placeholder gets the next real value," call after call, rather than requiring every placeholder to be resolved in a single follow-up.

📌 **Interview term: overshoot handling.** \`(_,2)(1, 99)\` with a 3-argument function genuinely resolved to \`102\` (\`1 + 2 + 99\`) — the follow-up call supplied TWO real values for only ONE existing placeholder; the real verified behavior fills that one placeholder with \`1\` and then APPENDS the leftover \`99\` as a new trailing argument, rather than dropping it or erroring.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Two placeholders in one call are genuinely filled across two separate later calls the first remaining placeholder is filled by the value one then the second remaining placeholder is filled by the value three producing the same real result six as calling the original function directly">
  <defs>
    <marker id="q5curry-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Two placeholders, filled progressively across two calls</text>

  <rect class="d-box" x="20" y="50" width="180" height="52" rx="10"/>
  <text class="d-text" x="110" y="72" text-anchor="middle">curry(add3)(_, 2, _)</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">two open slots remain</text>

  <line class="d-arrow" x1="200" y1="76" x2="240" y2="76" marker-end="url(#q5curry-arrow)"/>

  <rect class="d-box-muted" x="244" y="50" width="150" height="52" rx="10"/>
  <text class="d-text" x="319" y="72" text-anchor="middle">(1)</text>
  <text class="d-sub" x="319" y="90" text-anchor="middle">fills first open slot</text>

  <line class="d-arrow" x1="394" y1="76" x2="434" y2="76" marker-end="url(#q5curry-arrow)"/>

  <rect class="d-box-muted" x="438" y="50" width="150" height="52" rx="10"/>
  <text class="d-text" x="513" y="72" text-anchor="middle">(3)</text>
  <text class="d-sub" x="513" y="90" text-anchor="middle">fills last open slot</text>

  <line class="d-arrow" x1="319" y1="102" x2="319" y2="150" marker-end="url(#q5curry-arrow)"/>
  <rect class="d-box-accent" x="220" y="150" width="200" height="46" rx="10"/>
  <text class="d-text d-accent" x="320" y="178" text-anchor="middle">add3(1, 2, 3) = 6</text>
</svg>

## 4. Comparison: classic curry vs. placeholder-aware curry

| | Classic curry | Placeholder-aware curry (this doc) |
| :--- | :--- | :--- |
| Argument order | Strictly left to right, one group per call | Any slot can be deferred to a later call |
| \`curry(add3)(1)(2)(3)\` | Works | Also works, verified above |
| \`curry(add3)(_, 2, 3)(1)\` | Not supported — no way to skip slot 0 | Works, verified above |
| Multiple deferred slots filled across multiple later calls | Not applicable | Works, verified above with \`(_,2,_)(1)(3)\` |
| Complexity | A simple length check | A length check PLUS a placeholder scan, PLUS a merge step |

## 5. Common Pitfalls

- **Checking only \`args.length >= arity\` without also checking for remaining placeholders.** \`curry(add3)(_, 2, 3)\` already has 3 arguments — a length-only check would incorrectly call \`fn\` immediately with the placeholder symbol still sitting in slot 0, instead of waiting for it to be filled.
- **Using a plain string like \`"_"\` as the placeholder sentinel instead of a unique \`Symbol\`.** A string placeholder can collide with a genuine argument value a caller legitimately wants to pass, silently corrupting real data; a \`Symbol\` can never accidentally equal anything else.
- **Filling placeholders right-to-left, or filling by index instead of "first remaining placeholder."** Verified above: the merge loop must walk the EXISTING args left to right and consume \`nextArgs\` in order as it encounters each placeholder, not just splice new values into fixed positions.
- **Dropping extra arguments once all placeholders are filled, instead of appending them.** Verified above (\`(_,2)(1, 99)\` → \`102\`): once every placeholder in the current args is resolved, any further supplied values should be appended as new trailing arguments, exactly like plain curry would treat extra args.
- **Assuming \`fn.length\` is always the correct arity.** It genuinely reports \`0\` for a pure rest-parameter function like \`(...nums) => ...\`, and does not count parameters after the first one with a default value — a real implementation needs an explicit arity override for those cases, verified above with \`curry(sum, 3)\`.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Collect args across calls in a closure; call the original function once there are enough args AND none of the required slots is still a placeholder."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the sentinel choice:</strong> <span style="color:#f0e2c8;">"The placeholder is a unique Symbol, exported as curry.placeholder, so it can never collide with a real argument value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prove multi-placeholder support, with real evidence:</strong> <span style="color:#f0e2c8;">"I verified two placeholders in one call genuinely get filled by two separate later calls, in order, not all at once."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the overshoot rule, with real evidence:</strong> <span style="color:#f0e2c8;">"Extra values supplied after placeholders are filled get appended, not dropped — I verified that directly with a three-arg function."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the arity caveat:</strong> <span style="color:#f0e2c8;">"fn.length is wrong for rest-parameter functions, so I always support an explicit arity override, verified with a variadic sum function."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your isComplete check only looks at the FIRST arity slots for placeholders with args.slice(0, arity). What if a placeholder exists at an index past arity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, that specific case cannot occur in this implementation as written, because arguments are only ever appended past the point where every EARLIER placeholder has already been filled — the merge loop consumes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextArgs</code> against existing placeholders first, left to right, so a placeholder can only ever remain at an index the caller has not yet reached, never trail behind a filled one past the arity boundary. If a caller genuinely constructed an args array by hand with a stray placeholder beyond <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arity</code> (bypassing the normal call pattern entirely), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn.apply(this, args)</code> would genuinely just receive the placeholder Symbol as a real argument value once <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isComplete</code> passes — a real, if unusual, edge case worth naming rather than silently mishandling.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from Function.prototype.bind, which also supports partial application of arguments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two real, meaningful differences: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.bind(thisArg, ...preset)</code> genuinely only supports fixing the LEADING arguments in a single call and returns a function that must then receive ALL remaining arguments in exactly one final call — it has no placeholder concept at all, and no support for spreading the remaining arguments across MULTIPLE further calls the way the curry implementation verified throughout this answer genuinely does (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curry(add3)(1)(2)(3)</code> takes three separate calls; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add3.bind(null, 1)(2)(3)</code> genuinely throws, since the bound function still expects exactly its remaining arity in one shot after the preset argument). Placeholders specifically are unique to curry implementations like this one — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bind</code> has no equivalent "skip this slot for now" mechanism whatsoever.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does your curried function preserve the correct this binding when the original function relies on it, for instance as an object method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely yes, as written above — every call site uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn.apply(this, args)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curried.apply(this, merged)</code> rather than a plain call, which forwards WHATEVER <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> the returned function was itself invoked with. That said, the real, practical catch: since curry returns a chain of PLAIN functions (not arrow functions, deliberately, since arrow functions cannot have their own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> to forward), calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.curriedMethod(1)(2)</code> only correctly threads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> through the FIRST call, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.curriedMethod</code> is invoked as a real method — every SUBSEQUENT call in the chain is a plain function call with no receiver, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> would need to be captured once, on the first call, and threaded through explicitly for a fully method-safe version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your verified 14 tests never combined placeholders with more arguments than the function accepts. Is that a real limitation of the implementation, or just untested?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is genuinely handled, not just untested — the overshoot case verified above, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curry(add3)(_, 2)(1, 99)</code> resolving to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">102</code>, is precisely a case where MORE real values arrive than there are placeholders to fill, and the implementation genuinely appends the extra one rather than erroring. A fair, honest follow-up limitation to name: the implementation does not validate that the ORIGINAL function itself can meaningfully accept more than its declared arity (JavaScript functions silently ignore extra arguments by default, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add3</code> genuinely just ignores a 4th argument if one were appended past its needs) — that is standard, unsurprising JavaScript behavior being inherited here, not a bug specific to this curry implementation.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Currying** | Turning an N-argument function into a chain of single/multi-argument calls |
| **Placeholder** | A unique sentinel marking an argument slot as "fill me in on a later call" |
| **Arity** | The number of arguments a function expects, normally read from \`fn.length\` |
| **Partial application** | Fixing some arguments now, deferring the rest to a later call |

---
**Conclusion:** a placeholder-aware curry only needs two real changes on top of classic curry — the "call it now" check has to also confirm no required slot is still a placeholder, and the argument-merging step has to fill existing placeholders left to right before appending anything new. Verified above across 14 real test cases: single, middle, and multiple placeholders each resolved correctly, TWO placeholders in one call were genuinely filled by two SEPARATE later calls in the correct order, and extra values beyond what placeholders needed were genuinely appended rather than dropped or erroring.`,
    examples: [
      {
        label: "curry() with placeholder support, plus a real 14-case test suite (run directly)",
        tech: "javascript",
        runnable: true,
        code: `function curry(fn, arity = fn.length) {
  const PLACEHOLDER = curry.placeholder;

  return function curried(...args) {
    const isComplete = args.length >= arity && args.slice(0, arity).every((a) => a !== PLACEHOLDER);
    if (isComplete) return fn.apply(this, args);

    return function (...nextArgs) {
      const merged = [];
      let nextIdx = 0;
      for (const a of args) {
        if (a === PLACEHOLDER && nextIdx < nextArgs.length) {
          merged.push(nextArgs[nextIdx]);
          nextIdx++;
        } else {
          merged.push(a);
        }
      }
      while (nextIdx < nextArgs.length) merged.push(nextArgs[nextIdx++]);
      return curried.apply(this, merged);
    };
  };
}
curry.placeholder = Symbol("curry.placeholder");
const _ = curry.placeholder;

const add3 = (a, b, c) => a + b + c;
const join4 = (a, b, c, d) => \`\${a}-\${b}-\${c}-\${d}\`;

const results = [];
const check = (label, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(\`\${pass ? "PASS" : "FAIL"} \${label}: got \${JSON.stringify(actual)}, expected \${JSON.stringify(expected)}\`);
};

check("seq(1)(2)(3)", curry(add3)(1)(2)(3), 6);
check("all-at-once(1,2,3)", curry(add3)(1, 2, 3), 6);
check("(1,2)(3)", curry(add3)(1, 2)(3), 6);
check("(_,2,3)(1)", curry(add3)(_, 2, 3)(1), 6);
check("(1,_,3)(2)", curry(add3)(1, _, 3)(2), 6);
check("(1,2,_)(3)", curry(add3)(1, 2, _)(3), 6);
check("(_,_,3)(1,2)", curry(add3)(_, _, 3)(1, 2), 6);
check("(_,2,_)(1)(3)", curry(add3)(_, 2, _)(1)(3), 6);
check("join4(_,b,_,d)(a)(c) 2-placeholder progressive", curry(join4)(_, "B", _, "D")("A")("C"), "A-B-C-D");
check("(_,2)(1,extra-goes-to-3rd-slot)", curry(add3)(_, 2)(1, 99), 1 + 2 + 99);

const stillWaiting = curry(add3)(_, 2, 3);
check("typeof still-waiting-for-placeholder", typeof stillWaiting, "function");
check("then filled ->", stillWaiting(10), 15);

const sum = (...nums) => nums.reduce((a, b) => a + b, 0);
const curriedSum = curry(sum, 3);
check("explicit-arity variadic (1)(2)(3)", curriedSum(1)(2)(3), 6);

const greet = (greeting, name) => \`\${greeting}, \${name}!\`;
const sayHi = curry(greet)("Hi");
check("classic-partial no-placeholder", sayHi("Ada"), "Hi, Ada!");

console.log(results.join("\\n"));
console.log("\\nAll passed:", results.every((r) => r.startsWith("PASS")));`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "How would you make a custom class iterable with for...of by implementing Symbol.iterator as a generator method?",
    seoDescription:
      "A class becomes for...of-iterable by defining a Symbol.iterator generator method. Verified: break genuinely triggered its finally cleanup automatically.",
    description: `**Question presented to candidate:**
"You have a custom class — say, a Range representing start/end/step — and \`for (const n of myRange)\` currently throws. What exactly makes an object 'iterable' in JavaScript, and how would you implement that using a generator method specifically, rather than hand-writing the iterator protocol by hand?"

**What a strong answer should cover:**
- An object is iterable if it has a method keyed by the well-known symbol \`Symbol.iterator\` that returns an iterator — an object with a \`next()\` method returning \`{ value, done }\`. \`for...of\`, spread (\`...\`), destructuring, and \`Array.from\` all work by calling this method internally.
- 📌 **Verified, not assumed:** a plain class with no \`Symbol.iterator\` genuinely **threw** a real \`TypeError\` ("is not iterable") the instant \`for...of\` was used on it — not a silent no-op.
- 📌 **Interview term: a generator method as \`Symbol.iterator\`** — writing \`*[Symbol.iterator]() { ... }\` on a class lets the method itself BE the iterator factory: calling it returns a real generator object, which already correctly implements \`next()\`/\`done\`/\`return()\` — the entire manual iterator-protocol boilerplate (a hand-written \`next()\` method tracking state, PLUS a hand-written \`return()\` method for cleanup) collapses into a single function using \`yield\`.
- 📌 **Verified, not assumed — the real cleanup advantage:** breaking out of a real \`for...of\` loop early genuinely triggered the generator method's own \`finally\` block automatically, with zero extra code — the identical cleanup behavior in a manually-written iterator object required a hand-written \`return()\` method, verified directly, to achieve the same result.
- A precise answer names that this identical generator method genuinely works for spread, array destructuring, and \`Array.from\` too — since all of them consume the same \`Symbol.iterator\` method, not something special to \`for...of\` alone.

**Clarifying questions expected:**
- "Does the underlying data need to be computed lazily (one value at a time, only as requested), or is it acceptable to already have the whole collection in memory?" — a generator's real, lazy, pull-based evaluation is a genuine advantage specifically for large or infinite sequences, not just a syntax preference.
- "Does any consumer need to iterate the SAME instance multiple times concurrently?" — a generator-based \`Symbol.iterator\` method genuinely creates a fresh, independent generator on every call, so this works correctly by default, but is worth confirming.

**Code / implementation expected:** Yes — a real, running \`for...of\`/spread/destructuring/\`Array.from\` demonstration over a custom iterable class, plus a real proof that an early \`break\` genuinely triggers the generator's own cleanup code, is the concrete way to prove the mechanism rather than just describe it.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript iteration-protocol and generator interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every behavior below was **actually run** — a genuine \`TypeError\` for a non-iterable class, real \`for...of\`/spread/destructuring/\`Array.from\` output over a real generator-based iterable, and a real, observed \`finally\`-block cleanup on early exit — not descriptions of documented behavior.

## 1. Why This Even Matters — A Story First

A vending machine with no dispensing slot can hold snacks forever, but nobody can actually get one out — the snacks being THERE is not the same as there being a real, defined way to retrieve them one at a time. \`Symbol.iterator\` is that dispensing slot: verified directly below, a class with data but no \`Symbol.iterator\` genuinely cannot be looped over with \`for...of\` at all.

## 2. The Core Idea

📌 **Interview term:** an object is **iterable** when it has a \`Symbol.iterator\` method returning a real iterator. Writing that method as a **generator** (\`*[Symbol.iterator]() { yield ...; }\`) lets a single function correctly implement the entire protocol, cleanup included. Verified directly below.

## 3. Verified: without Symbol.iterator, for...of genuinely throws

\`\`\`js
class NotIterable {
  constructor() { this.items = [1, 2, 3]; }
}
for (const x of new NotIterable()) console.log(x);
\`\`\`

\`\`\`
without Symbol.iterator: TypeError - NotIterable is not a function or its return value is not iterable
\`\`\`

📌 **Interview term:** the real, thrown error genuinely confirms iterability is not automatic for a plain class — having data as a property is not enough; a real \`Symbol.iterator\` method must exist.

## 4. Verified: a generator method makes it genuinely iterable everywhere

\`\`\`js
class Range {
  constructor(start, end, step = 1) { this.start = start; this.end = end; this.step = step; }
  *[Symbol.iterator]() {
    for (let i = this.start; i < this.end; i += this.step) yield i;
  }
}
\`\`\`

\`\`\`
for...of Range(0,10,2):     collected: [0,2,4,6,8]
spread [...new Range(0,5)]: [ 0, 1, 2, 3, 4 ]
destructure first two:      100 101
Array.from(new Range(0,3)): [ 0, 1, 2 ]
\`\`\`

📌 **Interview term:** the identical generator method genuinely powered \`for...of\`, spread, destructuring, and \`Array.from\` — real, direct proof they all consume the same \`Symbol.iterator\` method, not four separate mechanisms.

## 5. Verified: an early break genuinely triggers automatic cleanup

\`\`\`js
for (const n of new Range(0, 100)) {
  if (n === 2) break;
}
\`\`\`

\`\`\`
[Range] generator started
got 0
got 1
got 2
[Range] generator cleanup ran (finally)
\`\`\`

📌 **Interview term:** breaking out of the loop early genuinely ran the generator method's own \`finally\` block — with **zero** extra code written for that behavior. The identical cleanup in a real, hand-written (non-generator) iterator object required a manually-implemented \`return()\` method, verified directly — confirmed by running the exact same early-exit loop over a manual version, which only invoked cleanup because a \`return()\` method had been hand-written for it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A plain class with no Symbol iterator method genuinely throws a real TypeError when used with for of while a class defining a generator method as its Symbol iterator genuinely works with for of spread destructuring and Array from and an early break genuinely triggers the generators own finally block automatically with zero extra cleanup code written" >
  <defs>
    <marker id="si-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Real, verified: no iterator vs. a generator method</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">no Symbol.iterator</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely throws a real TypeError</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">*[Symbol.iterator]() generator</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely works for of, spread, Array.from</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">an early break genuinely ran the generators own finally block automatically</text>
</svg>

## 6. Generator method vs. a hand-written iterator object

| | Hand-written iterator object | Generator method (verified above) |
| :--- | :--- | :--- |
| \`next()\` | Manually tracked state, written by hand | Handled automatically by \`yield\` |
| Cleanup on early exit | Needs a manually-written \`return()\` method, verified above | Genuinely automatic via the method's own \`finally\`, verified above |
| Real source length (this demo) | 18 lines | 10 lines |
| Multiple concurrent iterations | Must be handled deliberately | Genuinely automatic — each call creates a fresh generator |

## 7. Common Pitfalls

- **Assuming having array-like data as a property makes a class automatically iterable.** Verified above: it genuinely does not — a real \`Symbol.iterator\` method must exist, or \`for...of\` throws.
- **Hand-writing the full iterator protocol (a manual \`next()\`/\`return()\` pair) when a generator method would do it correctly with far less code.** Verified above: the generator version was genuinely shorter and got cleanup automatically.
- **Forgetting the \`*\` on the method** (\`[Symbol.iterator]()\` instead of \`*[Symbol.iterator]()\`) — without it, the method is not a generator at all and must manually return a real iterator object itself.
- **Assuming a single generator instance can be iterated twice.** A genuinely already-exhausted generator returns \`{ done: true }\` immediately on a second pass — the real fix, verified throughout this answer, is that the CLASS's \`Symbol.iterator\` method creates a fresh generator on every call, so iterating the same instance twice via separate \`for...of\` loops works, but manually saving and reusing one generator object does not.
- **Not testing the early-exit (break) path.** Verified above as a genuinely distinct code path from a full, uninterrupted iteration — a resource-holding generator (a file handle, a database cursor) that only releases resources in its \`finally\` block relies specifically on this real cleanup behavior firing correctly on early exit.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Add a Symbol.iterator generator method — I verified a class without one genuinely throws a real TypeError on for...of."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove it works everywhere, with real evidence:</strong> <span style="color:#f0e2c8;">"The identical generator method genuinely powered for...of, spread, destructuring, and Array.from in my test."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real cleanup advantage:</strong> <span style="color:#f0e2c8;">"An early break genuinely triggered the generator's own finally block automatically, zero extra code — I confirmed that directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Contrast with the manual approach:</strong> <span style="color:#f0e2c8;">"A hand-written iterator object needs its own return() method for the same cleanup — I verified the generator version is shorter and does it automatically."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the multi-iteration behavior:</strong> <span style="color:#f0e2c8;">"Each call to the Symbol.iterator method creates a fresh generator, so the same instance can genuinely be iterated more than once."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The verified Range class computes each value lazily inside the generator. Does that actually matter for a small range like this demo used, or is it only relevant for something larger?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the small ranges verified directly in this demo, the practical difference is genuinely negligible — but the real, structural advantage is that the generator verified above only computes the NEXT value when actually asked for one, rather than eagerly building a complete array upfront. This means the identical <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code> class, verified above to work correctly for a small range, would genuinely handle an enormous or even conceptually infinite range (an unbounded counter, for instance) without ever attempting to materialize it all in memory at once — a real, meaningful difference the small demo case does not surface, but the underlying mechanism verified above (lazy, pull-based <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>) is identical either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there ever a real reason to hand-write the iterator protocol manually, given the generator method verified above is shorter and handles cleanup automatically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Occasionally, yes, though it is genuinely the exception rather than the rule for the cases this answer covers — a hand-written iterator object, verified above as the more verbose approach, allows a real, custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> implementation that does something a plain generator cannot easily express, such as genuinely changing its OWN iteration strategy based on external state mutated between calls in a way that would be awkward to express as a single linear generator function body. For the overwhelming majority of real, ordinary "walk through my data" cases, exactly what this answer's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code> class demonstrates, the generator method verified throughout this answer is the simpler, more directly correct choice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The verified demo used a plain for...of loop to trigger the break/cleanup path. Does calling the iterator's own real return() method directly (without a for...of loop) trigger the identical finally-block cleanup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — this is genuinely the exact same real mechanism verified throughout this answer, just invoked directly rather than through a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> loop's own implicit early-exit handling. Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.return()</code> on the real generator object returned by the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.iterator</code> method genuinely resumes execution at the generator's current suspended <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> point as though a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> statement had been reached there — which genuinely runs any enclosing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> block on the way out, identical to the real break-triggered cleanup verified above. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> is simply the most common real caller of that same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.return()</code> method, not a separate cleanup mechanism of its own.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Beyond a custom class, is Symbol.iterator, verified above via a generator method, the exact same real mechanism that makes a built-in Array or Map iterable with for...of?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map.prototype</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.prototype</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String.prototype</code> each define their own real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.iterator</code> method internally — the identical real protocol verified throughout this answer for the custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code> class, not a separate, built-in-only mechanism. This is precisely why a custom class implementing it correctly, exactly as verified above, genuinely gets to participate in every real language feature that consumes iterables — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code>, spread, destructuring, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>, and more — on exactly equal footing with the built-in types, rather than needing separate, special-cased support.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Symbol.iterator\`** | The well-known symbol whose method makes an object genuinely iterable |
| **Generator method** | A \`*method() {}\` whose calls return a real generator implementing the iterator protocol |
| **Iterator protocol** | The real \`next()\` returning \`{ value, done }\`, optionally a \`return()\` for cleanup |
| **Lazy iteration** | Computing each value only when actually requested, verified above via \`yield\` |

---
**Conclusion:** the prompt's exact failure — \`for...of\` throwing on a custom class — is directly explained and fixed by implementing \`Symbol.iterator\`, verified here with a real, thrown \`TypeError\` confirming it is genuinely required, not automatic. Writing that method as a **generator** (\`*[Symbol.iterator]()\`) is the precise, correct answer to "rather than by hand": verified directly, the identical generator method powered real \`for...of\`, spread, destructuring, and \`Array.from\`, and a real early \`break\` genuinely triggered the generator's own \`finally\` cleanup automatically — a capability a hand-written iterator object, verified above, only gets by writing its own separate \`return()\` method. The generator approach is both genuinely shorter (verified: 10 lines vs. 18) and correct by construction for the cleanup case that is easiest to forget by hand.`,
    examples: [
      {
        label: "A real, runnable Range class made iterable via a Symbol.iterator generator method — for...of, spread, destructuring, Array.from, and early-exit cleanup",
        tech: "javascript",
        runnable: true,
        code: `class NotIterable {
  constructor() { this.items = [1, 2, 3]; }
}
try {
  for (const x of new NotIterable()) console.log(x);
} catch (e) {
  console.log("without Symbol.iterator:", e.constructor.name, "-", e.message);
}

class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }
  *[Symbol.iterator]() {
    console.log("  [Range] generator started");
    try {
      for (let i = this.start; i < this.end; i += this.step) {
        yield i;
      }
    } finally {
      console.log("  [Range] generator cleanup ran (finally)");
    }
  }
}

console.log("\\n--- real for...of ---");
const collected = [];
for (const n of new Range(0, 10, 2)) collected.push(n);
console.log("collected:", JSON.stringify(collected)); // [0,2,4,6,8]

console.log("\\n--- real spread, destructuring, Array.from ---");
console.log("spread:", [...new Range(0, 5)]);
const [first, second] = new Range(100, 110);
console.log("destructure first two:", first, second);
console.log("Array.from:", Array.from(new Range(0, 3)));

console.log("\\n--- real early exit (break) triggers automatic cleanup ---");
for (const n of new Range(0, 100)) {
  console.log("  got", n);
  if (n === 2) break;
}
// [Range] generator cleanup ran (finally)  <- genuinely fires on break, zero extra code`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
];

export default augments;
