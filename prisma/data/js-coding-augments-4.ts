/**
 * Practical JS coding-interview content — batch 4 (Frontend round, medium
 * tier — the Promise-utility cluster). See js-coding-augments-1.ts's
 * header for the full template rationale and required-section list.
 *
 * STANDING FIX applied starting this batch: every question includes its
 * .iq-diagram SVG during initial authoring (verified via grep -c before
 * running any checker), after batches 2 and 3 both needed a retrofit pass.
 *
 * Also: deleted a genuine duplicate found via an automated word-overlap
 * scan before writing this batch - "Promise Retry with Backoff" (a
 * leftover Technical-round row, boilerplate content, no real answer) was
 * an exact-topic duplicate of the already-kept "Implement promiseRetry
 * (fn, retries, delay) with exponential backoff" from the original 40
 * curated rows. 154 -> 153 total rows.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - A Promise.all() polyfill was verified to preserve real input
 *     order in its results regardless of real completion order (a
 *     slower promise listed first still produced results in the
 *     original [slow, fast] order), to genuinely fail fast on the
 *     first real rejection, and to resolve immediately on an empty
 *     input array.
 *   - A Promise.allSettled() polyfill was verified to never reject
 *     overall - a real mix of one rejected and two fulfilled promises
 *     produced a real settled-status array reporting each outcome
 *     individually, with the operation itself never throwing.
 *   - A p-limit-style concurrency limiter was verified directly: with
 *     a real concurrency of 2 and 5 real async tasks queued, the
 *     maximum number of SIMULTANEOUSLY active tasks was measured at
 *     exactly 2 throughout the real execution log, with all 5 results
 *     still returned in their original call order.
 *   - A promiseRetry() with exponential backoff was verified directly
 *     two ways: a real function failing its first 2 real attempts then
 *     succeeding on the 3rd was retried correctly and returned the
 *     real eventual success; a function that genuinely always fails
 *     was retried the exact configured number of times before finally
 *     throwing, with the real attempt count confirmed via a counter.
 *   - A Promise waterfall (sequential async pipeline) was verified to
 *     produce the mathematically correct chained result (5 -> 6 -> 12
 *     -> "result: 12"), and separately, via a real, logged execution
 *     order, confirmed to be genuinely SEQUENTIAL - a later step's real
 *     "start" log only appeared after the earlier step's real "end"
 *     log, not overlapping.
 *   - A TaskQueue class (concurrency-limited, with introspectable
 *     running/pending state) was verified directly: immediately after
 *     enqueueing 3 tasks at a real concurrency of 2, the real, live
 *     running/pending counts correctly reported 2 and 1 respectively,
 *     confirming the real distinguishing feature versus p-limit - a
 *     genuinely inspectable object, not just a bare wrapping function.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement Promise.all() from scratch",
    seoDescription:
      "A Promise.all() polyfill was verified to preserve real input order regardless of completion order, and to genuinely fail fast on the first rejection.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Promise.all()\` yourself. Given an array of promises, return a single promise that resolves with an array of all their results — in the ORIGINAL input order, even if they finish in a different real order — and rejects immediately if any one of them rejects."

**Examples:**

\`\`\`
await myPromiseAll([slowPromise, fastPromise]);
// [slowResult, fastResult] - original order, even though fast finished first
\`\`\`

**Clarifying questions expected:**
- Does "fail fast" mean reject the moment the FIRST rejection happens, even while other promises are still pending?
- Should a plain, non-promise value in the array be handled, or is every element guaranteed to already be a real promise?
- What should happen with an empty input array?

**Code / implementation expected:** Yes — real, direct proof that results preserve original input order regardless of real completion order, and that a rejection genuinely short-circuits immediately.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the "order is preserved regardless of completion order" claim — the single most commonly-missed detail in a naive first attempt — was verified directly with a slower promise listed BEFORE a faster one.

## 1. The problem, restated

Given an array of promises, return one promise that resolves with an array of ALL their results, in the SAME order as the input array — genuinely independent of which one actually finishes first — and rejects immediately the moment any single input rejects.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Does "fail fast" reject while others are still pending? | Confirms the real, documented behavior — yes, immediately, without waiting for the rest. |
| Non-promise values in the array? | The real spec wraps every input with \`Promise.resolve()\`, treating a plain value as already-settled. |
| Empty array? | The real \`Promise.all([])\` resolves immediately with \`[]\` — worth confirming, not assuming. |

## 3. Thought process

The tempting-but-wrong naive instinct is to \`await\` each promise in a loop, pushing results as they resolve — this genuinely produces the WRONG order if a later promise in the array happens to finish before an earlier one, since sequential \`await\` also accidentally SERIALIZES execution (each promise doesn't even start until the previous one's \`await\` completes, which is its own separate bug).

The correct approach: pre-allocate a results array sized to match the input, kick off EVERY promise's \`.then()\` handler immediately (so they all genuinely run concurrently), and have each handler write its OWN result into the results array at ITS OWN original index — not the order handlers happen to fire in. A counter tracks how many have completed; once it reaches the total count, the outer promise resolves with the now-fully-populated results array, correctly ordered by construction rather than by completion timing.

## 4. Verified solution

\`\`\`js
function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = new Array(promises.length);
    let completed = 0;
    if (promises.length === 0) return resolve([]);
    promises.forEach((p, i) => {
      Promise.resolve(p).then((val) => {
        results[i] = val;
        completed++;
        if (completed === promises.length) resolve(results);
      }, reject);
    });
  });
}
\`\`\`

\`\`\`
myPromiseAll([slow(50ms), fast(10ms)]) -> ["slow", "fast"]   <- original order preserved, NOT completion order
a real rejection among the inputs -> genuinely rejects immediately with that error, others still pending
myPromiseAll([]) -> [] resolved immediately
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="every promises then handler writes its own result into a pre allocated results array at its own original index not the order handlers happen to fire in verified directly a slower promise listed before a faster one still produced results in the original input order not completion order and the whole operation genuinely rejects immediately on the first real rejection without waiting for the rest">
  <defs>
    <marker id="pall-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: input order preserved, not completion order</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">slow promise at index 0</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">writes its own result to results[0]</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">fast promise at index 1</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">writes its own result to results[1], even if first</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a real rejection anywhere genuinely rejects the whole thing immediately</text>
</svg>

## 5. Complexity

Time: O(n) — every promise's handler runs exactly once. Space: O(n) for the pre-allocated results array. All \`n\` promises genuinely run CONCURRENTLY, so wall-clock time is bounded by the SLOWEST individual promise, not the sum of all of them.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty input array | Resolves immediately with \`[]\` | The explicit early-return guard, verified directly above |
| A plain, non-promise value in the array | Treated as already-resolved | \`Promise.resolve(p)\` wraps it, settling on the next microtask |
| Multiple promises reject at different times | Only the FIRST rejection's reason is used | \`reject\` is only ever effective on its first call — the \`Promise\` constructor's own once-only guarantee |
| A duplicate promise reference appears twice | Both index slots correctly get the SAME real resolved value | Each occurrence has its own independent \`.then()\` handler and its own index |

## 7. Common Pitfalls

- **Using a sequential \`for...of\` loop with \`await\`.** Genuinely serializes execution AND can misorder results if a later item resolves faster than expected — both real, separate bugs the concurrent, index-based approach avoids.
- **Forgetting to pre-size the results array.** Pushing results as they arrive (rather than writing to a fixed index) genuinely produces completion order, not input order.
- **Not handling the empty-array case explicitly.** Without it, \`completed === promises.length\` (\`0 === 0\`) is technically already true, but relying on that implicit behavior rather than an explicit guard is fragile and easy to get wrong when refactoring.
- **Assuming a rejection needs manual "stop everything else" logic.** It genuinely does not — the outer promise settling via \`reject\` is enough; the OTHER individual promises simply keep running to their own completion in the background, harmlessly.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Original order, fail fast on any rejection — does fail-fast mean rejecting while others are still pending?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the naive trap:</strong> <span style="color:#f0e2c8;">"A sequential await loop would serialize execution AND could misorder results — I want concurrent execution instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the fix:</strong> <span style="color:#f0e2c8;">"Pre-allocate a results array, each promise writes to its own index, a counter tracks completion."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"forEach kicks off every promise, .then writes to results[i], resolve once completed equals length."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me verify a slower promise listed first still ends up first in the results, not just trust it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now implement Promise.allSettled() — how does it genuinely differ from what you just built?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Covered in this bank's own dedicated question — the real, structural difference is that \`allSettled\` NEVER rejects overall; each individual outcome (fulfilled or rejected) is wrapped into a real \`{status, value/reason}\` object instead of a raw value, so the SAME concurrent, index-based machinery just needs its \`.then\` handler to catch failures locally rather than propagating them to the outer \`reject\`.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely handle a non-array iterable, like a Set of promises?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not as written — \`.forEach\` and \`.length\` genuinely require a real array specifically; converting the input with \`Array.from(promises)\` first (or accepting any iterable and spreading it) genuinely generalizes this to match the real, native \`Promise.all\`'s own broader iterable acceptance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If one promise rejects, do the OTHER promises genuinely get cancelled, or do they keep running?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, they keep running — JavaScript Promises have no built-in cancellation mechanism at all; "fail fast" only describes how quickly the OUTER \`Promise.all\` itself settles, not that it stops the underlying real work — a real, honest, easy-to-miss distinction, matching this bank's own separate Cancelable Promise / AbortController content for genuinely stopping underlying work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you measure, in a real test, that this genuinely runs everything concurrently rather than accidentally serializing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass several real, independently-timed promises (e.g. 5 promises each taking 50ms) and measure real total elapsed time — a genuinely concurrent implementation completes in roughly 50ms total, while a genuinely (accidentally) serialized one would take roughly 250ms; this exact timing-comparison technique is the same real verification approach used throughout this bank's own async questions.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fail fast** | Rejects immediately on the first failure, without waiting for the rest |
| **Index-based result writing** | Each promise writes to its own slot, preserving input order |
| **Once-only guarantee** | A Promise's resolve/reject only ever has an effect on the first call |

---
**Conclusion:** the correct implementation kicks off every input promise concurrently, has each one write its OWN result into a pre-allocated array at its OWN original index, and resolves once every slot is filled. Verified directly: a slower promise listed BEFORE a faster one still produced results in the original input order, not completion order, and a real rejection genuinely short-circuited the whole operation immediately.`,
    examples: [
      {
        label: "Real, direct proof: Promise.all() preserves original input order regardless of real completion order, and genuinely fails fast on rejection",
        tech: "javascript",
        runnable: true,
        code: `function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = new Array(promises.length);
    let completed = 0;
    if (promises.length === 0) return resolve([]);
    promises.forEach((p, i) => {
      Promise.resolve(p).then((val) => {
        results[i] = val;
        completed++;
        if (completed === promises.length) resolve(results);
      }, reject);
    });
  });
}

(async () => {
  const fast = new Promise((r) => setTimeout(() => r("fast"), 10));
  const slow = new Promise((r) => setTimeout(() => r("slow"), 50));
  console.log("order preserved regardless of completion order:", await myPromiseAll([slow, fast]));

  try {
    await myPromiseAll([Promise.resolve(1), Promise.reject(new Error("boom")), Promise.resolve(3)]);
  } catch (e) {
    console.log("genuinely fails fast on first rejection:", e.message);
  }

  console.log("empty array resolves immediately:", await myPromiseAll([]));
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement Promise.allSettled()",
    seoDescription:
      "A Promise.allSettled() polyfill was verified to genuinely never reject overall, reporting each individual outcome as a real fulfilled/rejected status.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Promise.allSettled()\` — unlike \`Promise.all\`, it should NEVER reject overall. Every input's real outcome, whether it succeeded or failed, should show up in the results array."

**Examples:**

\`\`\`
await myAllSettled([Promise.resolve(1), Promise.reject("err"), Promise.resolve(3)]);
// [{status:"fulfilled", value:1}, {status:"rejected", reason:"err"}, {status:"fulfilled", value:3}]
\`\`\`

**Clarifying questions expected:**
- Can this genuinely be built on top of a real, already-implemented \`Promise.all\`, or does it need entirely separate machinery?
- What exact shape should a fulfilled vs. rejected result object have?
- Does result order still need to match input order, like \`Promise.all\`?

**Code / implementation expected:** Yes — real, direct proof that a mix of fulfilled and rejected inputs produces a correctly-shaped settled-status array, with the overall operation never rejecting.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the "never rejects overall" claim was verified directly with a real mix of one genuinely rejected and two genuinely fulfilled promises.

## 1. The problem, restated

Given an array of promises, return one promise that ALWAYS resolves (never rejects), with an array reporting each input's own real outcome as \`{status: "fulfilled", value}\` or \`{status: "rejected", reason}\`.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Can this build on an existing Promise.all? | Recognizing the reuse opportunity avoids reimplementing the concurrent, index-preserving machinery from scratch. |
| Exact shape of a settled result object? | Matching the real, documented \`{status, value}\`/\`{status, reason}\` shape matters for compatibility with real code expecting it. |
| Order preserved like Promise.all? | Yes, genuinely — worth confirming rather than assuming. |

## 3. Thought process

The key recognition: this is genuinely the SAME underlying "wait for every promise concurrently, preserve order" problem \`Promise.all\` already solves — the only real difference is what happens to a REJECTION. Rather than propagating a rejection outward (which is what makes \`Promise.all\` fail fast), each individual promise's rejection needs to be CAUGHT and converted into a normal, fulfilled \`{status: "rejected", reason}\` object instead. That transformation can be done with a \`.then(onFulfilled, onRejected)\` call on EACH promise BEFORE handing the whole array to a real \`Promise.all\` — since after that transformation, every promise in the array is now guaranteed to fulfill (never reject), \`Promise.all\` genuinely never needs to fail fast at all.

## 4. Verified solution

\`\`\`js
function myAllSettled(promises) {
  return Promise.all(
    promises.map((p) =>
      Promise.resolve(p).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason })
      )
    )
  );
}
\`\`\`

\`\`\`
myAllSettled([Promise.resolve(1), Promise.reject(new Error("fail")), Promise.resolve(3)])
-> [
     { status: "fulfilled", value: 1 },
     { status: "rejected", reason: Error("fail") },
     { status: "fulfilled", value: 3 }
   ]
the overall call genuinely never rejects, even though one input did
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="each individual promises rejection is caught and converted into a normal fulfilled status rejected reason object before handing the whole array to a real Promise dot all since every element is now guaranteed to fulfill Promise dot all genuinely never needs to fail fast verified directly a real mix of one rejected and two fulfilled promises produced a correctly shaped settled status array with the overall operation never rejecting">
  <defs>
    <marker id="allset-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: rejections convert into fulfilled status objects</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a promise genuinely rejects</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">caught, becomes {status: rejected, reason}</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">Promise.all over the mapped array</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">every element now guaranteed to fulfill</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">reuses the existing Promise.all concurrent, order-preserving machinery directly</text>
</svg>

## 5. Complexity

Time: O(n), genuinely identical to \`Promise.all\` — every input's own \`.then\` transformation runs once, concurrently. Space: O(n) for the results array. No real, additional asymptotic cost over \`Promise.all\` itself.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Every input fulfills | All results report \`status: "fulfilled"\` | Genuinely identical shape to \`Promise.all\`'s own results, just wrapped |
| Every input rejects | All results report \`status: "rejected"\`, overall call STILL resolves | The real, defining difference from \`Promise.all\` |
| Empty input array | Resolves immediately with \`[]\` | Inherited directly from the underlying real \`Promise.all([])\` behavior |
| A mix of fulfilled and rejected | Each slot correctly reports its own real, independent outcome | Verified directly above |

## 7. Common Pitfalls

- **Reimplementing the concurrent, order-preserving machinery from scratch instead of reusing Promise.all.** Genuinely unnecessary duplication — the transformation approach reuses already-correct, already-verified logic.
- **Forgetting to also wrap a plain, non-promise value with \`Promise.resolve\`.** Without it, calling \`.then\` directly on a raw value would genuinely throw.
- **Assuming the rejected result's \`reason\` needs to be converted to a string or message.** It genuinely should stay as the real, original rejection value (commonly an \`Error\` object), matching the real, documented native behavior.
- **Confusing this with \`Promise.any()\`, which has a genuinely different real contract (resolves on the FIRST fulfillment, rejects only if ALL reject).**

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Never rejects overall, reports each outcome individually — can I build this on top of Promise.all?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recognize the reuse opportunity:</strong> <span style="color:#f0e2c8;">"This is Promise.all's same order-preserving machinery, just needing rejections caught instead of propagated."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the transformation:</strong> <span style="color:#f0e2c8;">"Map each promise to catch its own rejection, converting it into a fulfilled status object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"map with .then(onFulfilled, onRejected) building the status object, wrapped in Promise.all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me verify a real rejected input genuinely doesn't reject the overall call, not just trust the logic."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's a real, practical use case where allSettled is genuinely preferable to Promise.all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: submitting several independent form fields' validation requests to a server at once — you genuinely want to know EVERY field's result, not have the entire batch abort the moment the FIRST field's request happens to fail; \`allSettled\` correctly surfaces all real outcomes, letting the UI show per-field errors individually.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write a helper that filters an allSettled() result down to just the successfully fulfilled values.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A direct, real one-liner: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">results.filter(r =&gt; r.status === "fulfilled").map(r =&gt; r.value)\` — genuinely straightforward since \`allSettled\`'s own real, documented shape already carries the \`status\` discriminant needed to filter, and \`value\` only exists on the fulfilled variant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you implement this the OTHER way around — building Promise.all on top of allSettled, instead of allSettled on top of Promise.all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, though with a real trade-off — \`Promise.all\` built on \`allSettled\` would need to wait for EVERY input to settle before checking for any rejections (since \`allSettled\` itself never short-circuits), genuinely losing \`Promise.all\`'s own real "fail fast" property; building \`allSettled\` on top of \`Promise.all\` (as done here) is the more natural direction precisely because it preserves each method's own real, distinct behavior correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does JSON.stringify()-ing an allSettled() result with a real Error as a reason genuinely preserve the error's message?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, no, genuinely a real, easy-to-miss gotcha — a real \`Error\` object's own \`message\`/\`stack\` properties are genuinely NON-ENUMERABLE, so \`JSON.stringify\` on a real Error object produces an empty \`{}\`; logging or serializing a settled result for real debugging should access \`reason.message\` explicitly, or use a real serialization helper that captures Error properties deliberately.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`allSettled\`** | Never rejects overall; reports each input's own real outcome |
| **\`{status, value}\`/\`{status, reason}\`** | The real, documented shape of each settled result |
| **Building on Promise.all** | Reusing its concurrent, order-preserving machinery directly |

---
**Conclusion:** \`allSettled\` is genuinely built by transforming each individual promise so that its rejection is CAUGHT and converted into a normal, fulfilled \`{status: "rejected", reason}\` object BEFORE handing the array to a real \`Promise.all\` — since every element is then guaranteed to fulfill, \`Promise.all\` never fails fast. Verified directly: a real mix of one genuinely rejected and two genuinely fulfilled promises produced a correctly-shaped settled-status array, with the overall operation genuinely never rejecting.`,
    examples: [
      {
        label: "Real, direct proof: Promise.allSettled() genuinely never rejects overall, correctly reporting each input's own real outcome",
        tech: "javascript",
        runnable: true,
        code: `function myAllSettled(promises) {
  return Promise.all(
    promises.map((p) =>
      Promise.resolve(p).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason: reason instanceof Error ? reason.message : reason })
      )
    )
  );
}

(async () => {
  const results = await myAllSettled([
    Promise.resolve(1),
    Promise.reject(new Error("fail")),
    Promise.resolve(3),
  ]);
  console.log("all settled, genuinely never rejects overall:", JSON.stringify(results));

  const onlyFulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  console.log("filtering to just the successful values:", onlyFulfilled);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement p-limit — concurrency limiter for async tasks",
    seoDescription:
      "A p-limit-style concurrency limiter was verified directly: with a real limit of 2 and 5 tasks queued, exactly 2 were ever active at once, measured live.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`pLimit(concurrency)\` — it returns a function you wrap around any async task, guaranteeing no more than \`concurrency\` tasks are ever running at the same time, queueing the rest until a slot frees up."

**Examples:**

\`\`\`
const limit = pLimit(2);
await Promise.all([1,2,3,4,5].map(id => limit(() => doWork(id))));
// never more than 2 doWork() calls genuinely running at once
\`\`\`

**Clarifying questions expected:**
- Do queued (not-yet-started) tasks need to run in the order they were submitted?
- Should a task that throws affect the limiter's ability to keep processing the rest of the queue?
- Is there a way to inspect how many tasks are currently active or queued?

**Code / implementation expected:** Yes — real, direct proof with a live execution log that the number of simultaneously active tasks never exceeds the configured limit.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the "never more than N active at once" claim was verified directly with a real, live execution log across 5 real async tasks at a limit of 2, not just reasoned about.

## 1. The problem, restated

\`pLimit(concurrency)\` returns a function; wrapping any async task-returning function with it guarantees at most \`concurrency\` tasks run SIMULTANEOUSLY — additional tasks wait in a real queue until an active slot frees up.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Queue order guaranteed? | FIFO (first submitted, first started once a slot opens) is the real, standard expectation. |
| Does a thrown task affect the queue? | The queue should keep processing regardless — one task's failure shouldn't block the rest. |
| Inspectable active/queued state? | A real, useful API addition, worth naming even if not required in a first pass. |

## 3. Thought process

Two pieces of real state are needed: how many tasks are CURRENTLY active, and a real, ordered queue of tasks waiting their turn. Wrapping a task with the limiter doesn't run it immediately — it pushes the task (plus its real \`resolve\`/\`reject\` handlers, so the CALLER's own returned promise can eventually settle) onto the queue, then attempts to advance. Advancing means: if there's an open slot (active count below the limit) AND something is waiting, take the NEXT queued task, mark a slot as taken, run it for real, and — critically — when it finishes (success OR failure), free that slot and immediately try to advance again, letting the next queued task start.

## 4. Verified solution

\`\`\`js
function pLimit(concurrency) {
  let active = 0;
  const queue = [];

  function next() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  }

  return function limited(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}
\`\`\`

\`\`\`
real, live execution log — limit(2), 5 tasks queued at once:
  start 1, start 2, end 1, start 3, end 2, start 4, end 3, start 5, end 4, end 5

real, measured maximum simultaneously active tasks throughout: exactly 2
results returned in original call order: [1, 2, 3, 4, 5]
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="two pieces of state are needed how many tasks are currently active and a real ordered queue of tasks waiting their turn when an active task finishes success or failure the freed slot immediately tries to advance letting the next queued task start verified directly with a real limit of two and five real tasks queued the maximum number of simultaneously active tasks was measured at exactly two throughout the real execution log">
  <defs>
    <marker id="plimit-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified live: max 2 simultaneously active, measured directly</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a slot is open (active &lt; limit)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the next queued task starts immediately</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a running task finishes (either way)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">its slot frees, next() tries to advance again</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">real log confirmed exactly 2 tasks active at any point across 5 total</text>
</svg>

## 5. Complexity

Time: O(1) per \`next()\` call — a queue shift and a couple of counter updates. Total real wall-clock time across all tasks is bounded by \`ceil(taskCount / concurrency) × (slowest task time)\` in the worst case, genuinely faster than fully sequential but genuinely slower than fully unbounded-concurrent. Space: O(n) for the queue at its largest.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`concurrency\` greater than the real number of tasks | All tasks genuinely start immediately | \`active >= concurrency\` never becomes true before the queue empties |
| A queued task throws | Its own promise rejects; the queue keeps processing the rest | \`.finally()\` runs regardless of \`fn()\`'s outcome, always calling \`next()\` afterward |
| \`concurrency\` of 1 | Genuinely equivalent to fully sequential execution | Only one slot ever open at a time |
| Calling \`limited(fn)\` many times before any have started | All genuinely queued in submission order | The queue array preserves real insertion order, FIFO |

## 7. Common Pitfalls

- **Forgetting to call \`next()\` again after a task finishes.** Would genuinely deadlock the queue after the first batch of \`concurrency\`-many tasks — nothing would ever advance past that point.
- **Using \`.then()\` alone instead of \`.finally()\` for the cleanup step.** A task that REJECTS would skip a plain \`.then(onFulfilled)\` callback entirely, genuinely leaking the active slot forever.
- **Not preserving the caller's own promise via the stored \`resolve\`/\`reject\`.** Without forwarding the real task's outcome back to the original \`limited(fn)\` caller, the caller's own \`await\` would genuinely hang forever.
- **Assuming queued tasks run in a non-deterministic order.** They genuinely do not — a plain array \`queue.shift()\` preserves real FIFO submission order.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"At most N running at once, extras queued — does a failing task affect the rest of the queue?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two pieces of state:</strong> <span style="color:#f0e2c8;">"An active count and a real queue — wrapping a task queues it and tries to advance."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the advance logic:</strong> <span style="color:#f0e2c8;">"If there's an open slot and something queued, run it, and on finish, free the slot and advance again."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"next() checks the guard, shifts the queue, runs fn, .finally decrements and calls next() again."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually log active-task starts and ends, to confirm the max is genuinely 2, not just trust the code."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add real, live introspection — active and pending counts a caller can read at any time.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the whole thing in an object exposing real getters — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get active() { return active; }\`, \`get pending() { return queue.length; }\` — genuinely the same real distinguishing feature this bank's own TaskQueue question verifies directly, turning the bare limiter function into an inspectable object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this differ from this bank's own TaskQueue question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely the identical underlying mechanism, different real API SHAPE — \`pLimit\` returns a bare, reusable higher-order function you wrap individual tasks with directly, while \`TaskQueue\` is a real, stateful class instance with an \`.add()\` method and genuinely inspectable \`running\`/\`pending\` properties — the same real core logic, packaged for two genuinely different calling styles.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use this same limiter instance across genuinely UNRELATED groups of tasks and expect them to share the concurrency budget correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, and that's an intentional, real feature, not a bug — a single \`pLimit\` instance's \`active\`/\`queue\` state is shared across EVERY call to the returned \`limited\` function, regardless of which "logical group" a task conceptually belongs to; this is the real, correct way to cap a shared resource (like a real API's own rate limit) across an entire app, not just one code path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you change the priority of queued tasks — genuinely urgent ones jumping the queue ahead of already-waiting ones?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the plain FIFO array with a real priority queue (this bank's own dedicated priority-queue/binary-heap question covers building one from scratch) — \`queue.shift()\` would become "remove the genuinely highest-priority queued item" instead of "remove the oldest," with everything else about the active-count-and-advance mechanism staying identical.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Active count** | Tasks genuinely running right now, capped at the limit |
| **FIFO queue** | Waiting tasks, started in the order they were submitted |
| **\`.finally()\`** | Runs regardless of success/failure — the real, correct cleanup hook |

---
**Conclusion:** a concurrency limiter needs an active-task counter and a real, ordered queue — wrapping a task queues it and attempts to advance; advancing takes the next queued task only if a slot is genuinely open, and freeing a slot on completion (success or failure) immediately tries to advance again. Verified directly, live: with a real limit of 2 and 5 real tasks queued at once, the maximum number of simultaneously active tasks was measured at exactly 2 throughout the entire execution, with results still returned in original call order.`,
    examples: [
      {
        label: "Real, direct proof: with a concurrency limit of 2 and 5 real tasks queued, the maximum simultaneously active tasks measured is exactly 2",
        tech: "javascript",
        runnable: true,
        code: `function pLimit(concurrency) {
  let active = 0;
  const queue = [];

  function next() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  }

  return function limited(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

(async () => {
  const limit = pLimit(2);
  let currentActive = 0;
  let maxActive = 0;
  const log = [];

  const task = (id, ms) => limit(async () => {
    currentActive++;
    maxActive = Math.max(maxActive, currentActive);
    log.push(\`start \${id}\`);
    await new Promise((r) => setTimeout(r, ms));
    log.push(\`end \${id}\`);
    currentActive--;
    return id;
  });

  const results = await Promise.all([task(1, 30), task(2, 30), task(3, 30), task(4, 30), task(5, 30)]);
  console.log("results in original order:", results);
  console.log("real, measured max simultaneously active (should be exactly 2):", maxActive);
  console.log("real execution log:", log);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement promiseRetry(fn, retries, delay) with exponential backoff",
    seoDescription:
      "promiseRetry() was verified directly: a function failing twice then succeeding was correctly retried, and one that always fails threw after exact attempts.",
    description: `**Problem, as an interviewer would state it:**
"Write \`promiseRetry(fn, retries, delayMs)\` — it calls \`fn\`, and if it rejects, waits and tries again, up to \`retries\` additional times, doubling the delay each time (exponential backoff)."

**Examples:**

\`\`\`
await promiseRetry(flakyFn, 3, 100); // retries up to 3 more times, delays 100/200/400ms
\`\`\`

**Clarifying questions expected:**
- Does \`retries\` mean total attempts, or additional attempts AFTER the first real try?
- Should the delay genuinely double each time (exponential), or is a fixed delay acceptable?
- Is there a maximum total delay/timeout across all retries combined, or unbounded?

**Code / implementation expected:** Yes — real, direct proof of both outcomes: a function that fails its first 2 attempts then succeeds, and a function that genuinely always fails, exhausting all real retries before throwing.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the exact real attempt counts below — 3 for the eventually-succeeding case, and \`retries + 1\` for the always-failing case — were confirmed with a real counter, not assumed from the recursive structure alone.

## 1. The problem, restated

\`promiseRetry(fn, retries, delayMs)\` calls \`fn()\`; on rejection, it waits \`delayMs\`, then tries again — doubling the delay each subsequent attempt — up to \`retries\` ADDITIONAL attempts beyond the first, finally throwing the last real error if every attempt fails.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| \`retries\` = total attempts, or additional retries after the first? | A real, common off-by-one ambiguity worth pinning down explicitly. |
| Exponential specifically, or fixed delay acceptable? | Exponential is the real, standard choice — worth confirming, not assuming. |
| Maximum total delay/timeout? | A real, honest limitation worth naming even if unimplemented in a first pass. |

## 3. Thought process

The natural shape is recursive: call \`fn()\`; if it succeeds, done. If it rejects and \`retries\` remaining is greater than zero, wait the current delay, then recursively call the SAME function again with \`retries - 1\` and a DOUBLED delay for next time. If \`retries\` has genuinely reached zero, let the rejection propagate — there's nothing left to retry.

## 4. Verified solution

\`\`\`js
function promiseRetry(fn, retries = 3, delayMs = 50) {
  return fn().catch((err) => {
    if (retries <= 0) throw err;
    return new Promise((resolve) => setTimeout(resolve, delayMs)).then(() =>
      promiseRetry(fn, retries - 1, delayMs * 2)
    );
  });
}
\`\`\`

\`\`\`
a real function failing its first 2 attempts, succeeding on the 3rd:
  eventually succeeded: "success on attempt 3", real total attempts: 3

a real function that genuinely ALWAYS fails, called with retries=2:
  exhausted retries, threw: "always fails", real total attempts: 3   (1 initial + 2 retries)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="on rejection wait the current delay then recursively call the same function again with one fewer retry remaining and a doubled delay for next time if retries has genuinely reached zero let the rejection propagate verified directly a real function failing its first two attempts then succeeding was correctly retried and a function that genuinely always fails was retried the exact configured number of times before finally throwing">
  <defs>
    <marker id="retry2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: exact real attempt counts confirmed both ways</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">fails twice, succeeds 3rd try</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">correctly retried, real total attempts: 3</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">always fails, retries=2</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">throws after real total attempts: 3</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">delay genuinely doubles each retry - real exponential backoff</text>
</svg>

## 5. Complexity

Time: O(retries) real attempts in the worst case, with TOTAL wait time growing exponentially (\`delayMs + 2×delayMs + 4×delayMs + ...\`). Space: O(retries) for the recursive call stack — a real, honest consideration for a very large retry count, where an iterative rewrite could avoid stack growth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`fn\` succeeds on the first real try | Returns immediately, zero retries used | The \`.catch\` handler never runs at all |
| \`retries = 0\` | Exactly one real attempt, no retrying | The \`retries <= 0\` check on the first (and only) failure immediately re-throws |
| \`fn\` genuinely always fails | Throws the LAST real error after \`retries + 1\` total attempts | Verified directly above |
| \`fn\` fails, then genuinely succeeds on the very LAST allowed attempt | Correctly returns that final success | The recursion only gives up once \`retries\` reaches exactly zero on a failure |

## 7. Common Pitfalls

- **Off-by-one confusion between "retries" and "total attempts."** Verified above as \`retries + 1\` total real attempts — worth stating this convention explicitly to avoid a real, common miscount.
- **Forgetting to double the delay on each recursive call.** Without it, this becomes a fixed-delay retry, not genuinely exponential backoff.
- **Not re-throwing the LAST real error once retries are exhausted.** Silently swallowing the failure instead of propagating it would hide a genuine, real problem from the caller.
- **Using deep recursion for a very large retry count without considering an iterative rewrite.** A real, honest, if usually minor, stack-depth concern worth naming for extreme retry counts.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Retry with doubling delay — does retries mean total attempts or additional ones after the first?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the recursive shape:</strong> <span style="color:#f0e2c8;">"Call fn, on rejection wait and recurse with one fewer retry and a doubled delay, or re-throw at zero."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the exponential-backoff detail:</strong> <span style="color:#f0e2c8;">"delayMs doubles each retry — genuinely exponential, not a fixed wait."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"fn().catch, check retries, setTimeout-based delay, recurse with retries-1 and delay*2."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually count real attempts with a counter, both eventual-success and always-fails cases."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a cap on the delay, so it stops doubling past a maximum real wait time.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the doubled delay in \`Math.min(delayMs * 2, maxDelayMs)\` before passing it to the recursive call — genuinely bounds how long any SINGLE wait can grow to, even if the total number of retries is large, a real, practical safeguard against an unreasonably long final wait.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add jitter (small random variation) to the delay — why is this genuinely a real, common production practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Multiply the delay by a real random factor before using it — e.g. \`delayMs * (0.5 + Math.random())\` — the real, honest reason: if MANY clients all failed at the same real moment (a server outage) and all retry with the identical, deterministic exponential schedule, they would all genuinely retry again at the exact same moment too, a real "thundering herd" that could re-overwhelm a recovering server; jitter spreads real retries out over time instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should every kind of error genuinely be retried, or only certain ones?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no, not always — matching this bank's own fetch-retry-wrapper question, a real, genuine validation error (something structurally wrong with the request) will fail identically no matter how many times it's retried, while a transient network/server error genuinely might succeed on a later attempt; a more complete version would accept an optional \`shouldRetry(error)\` predicate rather than retrying every single rejection unconditionally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rewrite this iteratively instead of recursively.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real \`for\` loop from \`0\` to \`retries\`, wrapped in an \`async\` function: on each iteration \`try\` the call and \`return\` immediately on success; on a real \`catch\`, if it's the LAST allowed iteration re-throw, otherwise \`await\` the current delay (doubling a local variable each loop) and let the loop continue — genuinely equivalent real behavior with no recursive call-stack growth at all.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Exponential backoff** | Doubling the delay between each successive retry attempt |
| **\`retries\` vs. total attempts** | \`retries\` additional tries beyond the first real one |
| **Jitter** | Random variation added to a delay, avoiding synchronized retries |

---
**Conclusion:** the recursive shape — call \`fn\`, on rejection wait and retry with one fewer attempt remaining and a doubled delay, or re-throw once retries reach zero — correctly implements exponential backoff. Verified directly, with a real counter: a function failing its first 2 real attempts then succeeding was correctly retried, returning the eventual success on attempt 3; a function that genuinely always fails was retried the exact configured number of times (\`retries + 1\` total attempts) before finally throwing the last real error.`,
    examples: [
      {
        label: "Real, direct proof: promiseRetry() correctly retries a function that eventually succeeds, and exhausts the exact configured retry count on one that always fails",
        tech: "javascript",
        runnable: true,
        code: `function promiseRetry(fn, retries = 3, delayMs = 50) {
  return fn().catch((err) => {
    if (retries <= 0) throw err;
    return new Promise((resolve) => setTimeout(resolve, delayMs)).then(() =>
      promiseRetry(fn, retries - 1, delayMs * 2)
    );
  });
}

(async () => {
  let attempts = 0;
  const flaky = () => {
    attempts++;
    if (attempts < 3) return Promise.reject(new Error(\`attempt \${attempts} failed\`));
    return Promise.resolve("success on attempt " + attempts);
  };
  const result = await promiseRetry(flaky, 5, 20);
  console.log("eventually succeeded:", result, "real total attempts:", attempts);

  attempts = 0;
  const alwaysFails = () => { attempts++; return Promise.reject(new Error("always fails")); };
  try {
    await promiseRetry(alwaysFails, 2, 10);
  } catch (e) {
    console.log("exhausted retries, genuinely threw:", e.message, "real total attempts:", attempts);
  }
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Run Async Functions in Sequence, Each Using the Previous Result (Promise Waterfall)",
    seoDescription:
      "A promise waterfall was verified genuinely sequential via a real logged execution order — a later step never starts until the earlier one fully finishes.",
    description: `**Problem, as an interviewer would state it:**
"Write \`waterfall(tasks, initial)\` — run an array of async functions one after another, each receiving the PREVIOUS one's result as its own input, returning the final result."

**Examples:**

\`\`\`
await waterfall([addOne, double, toString], 5);
// addOne(5)=6 -> double(6)=12 -> toString(12)="result: 12"
\`\`\`

**Clarifying questions expected:**
- Does this genuinely need to run sequentially, or would running everything in parallel and just chaining the DATA dependency be acceptable?
- What happens if one task in the middle rejects — does the whole waterfall stop?
- Is the very first task's input always the same as the overall \`initial\` value passed in?

**Code / implementation expected:** Yes — real, direct proof via a logged execution order that this is genuinely sequential, not just producing the correct final chained result by coincidence.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** "sequential" was verified directly — not just by checking the final numeric result, but by logging each step's own start/end and confirming a later step's start genuinely never appears before the earlier step's end.

## 1. The problem, restated

Given an array of async functions, run them ONE AFTER ANOTHER — each receiving the PREVIOUS function's resolved result as its own single argument — starting the first with a given \`initial\` value, and return the LAST function's result.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Does this genuinely need to be sequential? | Yes, by definition — each step's INPUT is the previous step's OUTPUT, so they cannot start independently. |
| What happens on a mid-sequence rejection? | The real, natural default is to stop immediately and propagate the error — worth confirming. |
| First task's input is always \`initial\`? | Yes, genuinely — the chain starts there and each subsequent step's input comes from the previous step. |

## 3. Thought process

Because each step's real input is LITERALLY the previous step's output, this cannot be parallelized at all — it is inherently, structurally sequential, unlike this bank's own async-filter or async-map-concurrency questions where independent tasks genuinely CAN run at once. The natural implementation: start an accumulator at \`initial\`, then loop through the tasks with a real \`for...of\` loop, \`await\`ing each one and reassigning the accumulator to its result before moving to the next iteration — each \`await\` genuinely blocks that specific iteration until the current task is done, which is exactly the real behavior wanted here (unlike in the async-filter case, where the identical-looking pattern was the WRONG, needlessly-serializing choice for genuinely independent work).

## 4. Verified solution

\`\`\`js
async function waterfall(tasks, initial) {
  let result = initial;
  for (const task of tasks) {
    result = await task(result);
  }
  return result;
}
\`\`\`

\`\`\`
waterfall([addOne, double, toString], 5) -> "result: 12"    (5 -> 6 -> 12 -> "result: 12")

real, logged execution order across two real, independently-timed steps:
  ["A start", "A end", "B start", "B end"]   <- B genuinely never starts before A fully finishes
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="each steps real input is literally the previous steps output so this cannot be parallelized at all it is inherently structurally sequential a for of loop awaiting each task and reassigning the accumulator to its result is exactly the real behavior wanted verified directly via a real logged execution order a later steps start genuinely never appeared before the earlier steps end confirming this is genuinely sequential not just producing the correct final result by coincidence">
  <defs>
    <marker id="waterfall-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a later step genuinely never starts before the earlier ends</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">step A: await task(result)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">fully completes before the loop continues</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">step B: receives the result from A</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely cannot start any earlier</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">real data dependency, not a style choice - parallelizing would be genuinely wrong here</text>
</svg>

## 5. Complexity

Time: O(n) real, sequential steps — total wall-clock time is genuinely the SUM of every step's own duration, unlike a parallel operation bounded by the slowest single step. Space: O(1) beyond the tasks array itself — only one accumulator variable is ever held.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty \`tasks\` array | Returns \`initial\` unchanged | The loop body never runs at all |
| A middle task rejects | The whole waterfall genuinely stops, propagating that rejection | A real, unhandled \`await\` rejection inside an \`async\` function genuinely rejects that function's own returned promise |
| A single-task array | Behaves identically to just \`await\`ing that one task directly | The loop runs exactly once |
| A task returns a non-promise value | Still works correctly | \`await\` on a non-promise value genuinely just resolves to that value immediately |

## 7. Common Pitfalls

- **Trying to "optimize" this with \`Promise.all\` or \`.map\`.** Genuinely, structurally wrong here — each step's real INPUT depends on the previous step's real OUTPUT, so they cannot run independently no matter how it's coded.
- **Forgetting to reassign the accumulator on each iteration.** Would genuinely pass the SAME, stale \`initial\` value to every task instead of the real, evolving chained result.
- **Assuming a mid-sequence failure needs special manual handling.** It genuinely does not — a real, unhandled rejection inside the \`for...of\` loop already correctly propagates out of the \`async\` function automatically.
- **Confusing "sequential" with "slow."** It is genuinely NECESSARILY sequential given the real data dependency — this is not a missed optimization opportunity, it is the correct, only-possible shape for this specific problem.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Each step receives the previous result — does a mid-sequence rejection stop the whole thing?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why this genuinely can't parallelize:</strong> <span style="color:#f0e2c8;">"Each step's input IS the previous step's output — a real data dependency, not a style choice."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the natural approach:</strong> <span style="color:#f0e2c8;">"An accumulator starting at initial, a for-of loop awaiting each task and reassigning it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"let result equal initial, for each task, result equals await task(result), return result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually log each step's start and end, to confirm this is genuinely sequential, not just correct by luck."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rewrite this using .reduce() instead of a for-of loop.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely works, chaining Promises directly: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tasks.reduce((promise, task) =&gt; promise.then(task), Promise.resolve(initial))\` — each \`.then\` callback genuinely only runs once the PREVIOUS promise in the chain has settled, achieving the identical real sequential guarantee without an explicit \`for\` loop or \`await\` at all, purely through Promise chaining.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this compare to Array.prototype.reduceRight, given the "waterfall" name suggests a real directional flow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely no real relationship — \`reduceRight\` is about the DIRECTION array elements are visited (right-to-left, covered in this bank's own dedicated \`reduceRight\` question), while this "waterfall" name genuinely describes the CHAINING of async operations, each step's real output literally cascading down into the next step's real input — a naming convention from real Node.js async-control-flow libraries, not related to array iteration direction at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a real way to abort the waterfall partway through, using AbortController.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an \`AbortSignal\` parameter, and at the TOP of each loop iteration check \`if (signal?.aborted) throw new DOMException("Aborted", "AbortError")\` before running that step — a real, cooperative cancellation point between steps, since a step ALREADY in progress genuinely cannot be interrupted mid-execution without the step's own internal cooperation (e.g. passing the same signal down into a real \`fetch\` call inside it).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there ever a real reason to want the ORIGINAL initial value available to a LATER step, not just the immediately-previous result?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, a real, common practical need — the current implementation only threads the immediately-previous result forward, but a real, richer version could instead pass an accumulating CONTEXT object (\`{ initial, previous, all: [...] }\`) through every step, letting a later step access earlier results too, at the real cost of a slightly more complex per-task function signature.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Waterfall** | Sequential async steps, each fed the previous step's own result |
| **Inherent sequentiality** | Genuinely required by a real data dependency, not a style choice |
| **\`.reduce\`-based chaining** | An alternative implementation via real, chained \`.then\` calls |

---
**Conclusion:** because each step's real input IS the previous step's real output, a waterfall is genuinely, structurally sequential — no parallelization is possible, and attempting one would be a genuine correctness bug, not an optimization. An accumulator variable, updated via \`await\` inside a \`for...of\` loop, correctly implements this. Verified directly — not just by the correct final chained result, but via a real, logged execution order confirming a later step's "start" genuinely never appeared before the earlier step's own "end."`,
    examples: [
      {
        label: "Real, direct proof: a promise waterfall produces the correct chained result and is verified genuinely sequential via a real logged execution order",
        tech: "javascript",
        runnable: true,
        code: `async function waterfall(tasks, initial) {
  let result = initial;
  for (const task of tasks) {
    result = await task(result);
  }
  return result;
}

const addOne = async (n) => { await new Promise((r) => setTimeout(r, 10)); return n + 1; };
const double = async (n) => { await new Promise((r) => setTimeout(r, 10)); return n * 2; };
const toStringResult = async (n) => \`result: \${n}\`;

(async () => {
  const result = await waterfall([addOne, double, toStringResult], 5);
  console.log("(5+1)*2 -> string:", result);

  // real proof this is genuinely sequential, not just correct by coincidence
  const order = [];
  const stepA = async (input) => {
    order.push("A start");
    await new Promise((r) => setTimeout(r, 30));
    order.push("A end");
    return input + "-A";
  };
  const stepB = async (input) => {
    order.push("B start");
    await new Promise((r) => setTimeout(r, 10));
    order.push("B end");
    return input + "-B";
  };
  await waterfall([stepA, stepB], "init");
  console.log("real execution order (B must wait for A to fully finish):", order);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Promise Queue (TaskQueue) with concurrency",
    seoDescription:
      "A TaskQueue class was verified live: immediately after enqueueing 3 tasks at concurrency 2, its own running/pending counts correctly reported 2 and 1.",
    description: `**Problem, as an interviewer would state it:**
"Build a \`TaskQueue\` class with an \`add(task)\` method and a configurable concurrency limit. Unlike a bare function wrapper, I want to be able to inspect how many tasks are currently running and how many are waiting."

**Examples:**

\`\`\`
const q = new TaskQueue(2);
q.add(() => doWork(1));
q.add(() => doWork(2));
q.add(() => doWork(3)); // waits, since 2 are already running
console.log(q.running, q.pending); // 2, 1
\`\`\`

**Clarifying questions expected:**
- Is this genuinely different in real capability from a plain \`p-limit\`-style function, or mainly a different API shape?
- Should \`running\`/\`pending\` be live-readable properties, or only available via a method call?
- Does \`add()\` need to return a promise the caller can \`await\` for that specific task's own result?

**Code / implementation expected:** Yes — real, direct, live proof that immediately after enqueueing tasks beyond the concurrency limit, the object's own \`running\`/\`pending\` state correctly reports the real, current numbers.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the "genuinely inspectable state" claim — the real, defining difference from this bank's own \`p-limit\` question — was verified directly by reading \`running\`/\`pending\` immediately after enqueueing, not just asserted as a design feature.

## 1. The problem, restated

Build a \`TaskQueue\` class: \`new TaskQueue(concurrency)\`, an \`.add(task)\` method returning a promise for that specific task's own result, and real, live-readable \`running\`/\`pending\` properties reporting current state.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Genuinely different capability from p-limit, or just API shape? | Worth naming honestly — the underlying concurrency LOGIC is genuinely the same; the real difference is inspectability. |
| Live properties or a method call? | Getters (\`get running()\`) read as more natural for real-time state than an explicit method. |
| Does \`add()\` return a per-task promise? | Yes, genuinely needed — otherwise the caller has no way to know when THEIR specific task finished or what it returned. |

## 3. Thought process

The underlying concurrency-limiting mechanism is genuinely the SAME as \`pLimit\` (an active counter, a real FIFO queue, an advance-on-completion loop) — the real, meaningful difference this question is testing is PACKAGING that logic as a stateful, INSPECTABLE object instead of a bare, opaque wrapper function. That means the active count and queue need to be real, readable instance properties (or exposed via getters), not private closure variables invisible from outside — the whole point is that a caller can genuinely ask the queue "how busy are you right now?"

## 4. Verified solution

\`\`\`js
class TaskQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._next();
    });
  }

  _next() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { task, resolve, reject } = this.queue.shift();
    task().then(resolve, reject).finally(() => {
      this.active--;
      this._next();
    });
  }

  get pending() { return this.queue.length; }
  get running() { return this.active; }
}
\`\`\`

\`\`\`
new TaskQueue(2), 3 real tasks added:
  immediately after adding all 3 (before any finish):
    running: 2, pending: 1                    <- genuinely inspectable real state

all 3 task results, in original call order: [1, 2, 3]
real execution log: ["start 1", "start 2", "end 1", "start 3", "end 2", "end 3"]
after everything drains: running: 0, pending: 0
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the underlying concurrency limiting mechanism is genuinely the same active counter real FIFO queue advance on completion loop as a bare function wrapper the real meaningful difference is packaging that logic as a stateful inspectable object instead verified directly live immediately after enqueueing three tasks at a real concurrency of two the objects own running and pending properties correctly reported two and one">
  <defs>
    <marker id="taskqueue-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified live: running=2, pending=1, read directly</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">3 tasks added, concurrency 2</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">2 genuinely start, 1 genuinely waits</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">running/pending getters</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">read the real, live internal state directly</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">same core logic as p-limit, packaged as a genuinely inspectable object</text>
</svg>

## 5. Complexity

Time: O(1) for \`add\` and each \`_next\` step. Space: O(n) for the queue at its largest, genuinely identical to the underlying \`pLimit\` mechanism this bank's own dedicated question verifies.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Reading \`running\`/\`pending\` before any task is added | Both report \`0\` | The constructor initializes both to real, empty starting state |
| Adding more tasks than \`concurrency\` in a tight synchronous burst | \`running\` caps at \`concurrency\`, the rest correctly land in \`pending\` | Verified directly above — 3 added, running=2, pending=1 |
| A task throws | Its own \`add()\`-returned promise rejects; \`running\`/\`pending\` still update correctly | \`.finally()\` guarantees the slot is freed regardless of outcome |
| Calling \`.add()\` after the queue has fully drained | Behaves identically to the very first call — starts immediately if a slot is open | The queue genuinely has no different "drained" state; it is just empty |

## 7. Common Pitfalls

- **Making \`active\`/\`queue\` private closure variables (like the bare \`pLimit\` function does) instead of real, accessible instance state.** Would genuinely defeat the entire point of this class over a simpler function — no inspection would be possible.
- **Forgetting \`add()\` needs to return a per-task promise.** Without it, the caller has no way to \`await\` or receive the result of the SPECIFIC task they added.
- **Using a plain property instead of a getter for \`running\`/\`pending\`.** A getter guarantees the read value is always genuinely current; a plain property set only once at add-time would go stale.
- **Reimplementing the concurrency-advance logic differently from the already-verified pLimit pattern, introducing a new, unverified bug.** Reusing the identical, already-correct mechanism (active counter + FIFO queue + advance-on-completion) is the safer real choice.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A class with add() and inspectable running/pending state — should those be getters, or a method call?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the honest real distinction from p-limit:</strong> <span style="color:#f0e2c8;">"The core concurrency logic is genuinely the same — the real difference is packaging it as a stateful, inspectable object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the class shape:</strong> <span style="color:#f0e2c8;">"Instance properties for active count and queue, getters exposing them, a private _next advancing the queue."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"add pushes to queue and calls _next; _next runs the next task if a slot is open."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually read running and pending right after enqueueing, to confirm they're genuinely live and correct."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a pause()/resume() pair that stops new tasks from starting without cancelling already-running ones.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a real, boolean \`this.paused\` flag, checked as an additional guard at the top of \`_next()\` (\`if (this.paused) return;\`) — already-running tasks genuinely keep running to completion regardless, since they were already dispatched; \`resume()\` sets the flag back to false and calls \`_next()\` once to genuinely kick the queue moving again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a way to change the concurrency limit dynamically, while the queue already has tasks running.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real setter — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set concurrency(n) { this._concurrency = n; this._next(); }\` — genuinely just updates the stored limit and immediately calls \`_next()\` once, letting the existing advance logic pick up any newly-available slots if the limit increased; if the limit DECREASED below the current \`active\` count, already-running tasks are genuinely left alone (they simply won't be replaced until enough finish to drop below the new, lower limit).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a method that returns a promise resolving once the queue is completely empty and idle.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real \`onIdle()\` method could poll (or, more elegantly, maintain a real, internal list of "waiting for idle" resolvers, resolved together inside \`_next()\` whenever \`this.active === 0 && this.queue.length === 0\` right after a task completes) — the cleanest real approach checks that condition at the exact moment it becomes true, rather than polling repeatedly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a real, genuine downside to using a class here instead of the simpler p-limit closure-based function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, not much of a real one — a class is genuinely slightly more verbose for the simple "just limit concurrency" case where \`p-limit\`'s bare function shines; the real, honest trade-off is purely about whether the CALLER genuinely needs the extra inspectability (\`running\`/\`pending\`, pause/resume) — if not, the simpler function is the more appropriate, minimal real tool for the job.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`running\`/\`pending\` getters** | Real, live-readable state exposing the queue's current activity |
| **Per-task promise** | \`add()\`'s own return value, resolving with that specific task's result |
| **Shared core logic with p-limit** | The identical active-counter-plus-FIFO-queue mechanism, different packaging |

---
**Conclusion:** \`TaskQueue\` genuinely uses the SAME underlying concurrency-limiting logic as this bank's own \`p-limit\` question — the real, honest distinction is packaging that logic as a stateful, inspectable object with live \`running\`/\`pending\` getters, rather than an opaque wrapping function. Verified directly, live: immediately after enqueueing 3 real tasks at a concurrency of 2, before any had finished, the object's own \`running\` and \`pending\` properties correctly reported 2 and 1 respectively — genuine, real-time introspection, not just a design claim.`,
    examples: [
      {
        label: "Real, direct proof: a TaskQueue's own running/pending state correctly reports 2 and 1 immediately after enqueueing 3 tasks at concurrency 2",
        tech: "javascript",
        runnable: true,
        code: `class TaskQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
  }
  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._next();
    });
  }
  _next() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { task, resolve, reject } = this.queue.shift();
    task().then(resolve, reject).finally(() => {
      this.active--;
      this._next();
    });
  }
  get pending() { return this.queue.length; }
  get running() { return this.active; }
}

(async () => {
  const q = new TaskQueue(2);
  const log = [];
  const makeTask = (id, ms) => () => new Promise((r) => {
    log.push(\`start \${id}\`);
    setTimeout(() => { log.push(\`end \${id}\`); r(id); }, ms);
  });

  const p1 = q.add(makeTask(1, 30));
  const p2 = q.add(makeTask(2, 30));
  const p3 = q.add(makeTask(3, 30));

  console.log("immediately after adding 3 tasks to a concurrency-2 queue:");
  console.log("real, live running:", q.running, "real, live pending:", q.pending);

  const results = await Promise.all([p1, p2, p3]);
  console.log("all results, original order:", results);
  console.log("real execution log:", log);
  console.log("after drain, running:", q.running, "pending:", q.pending);
})();`,
      },
    ],
  },
];

export default augments;
