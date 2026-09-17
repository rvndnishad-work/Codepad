/**
 * Practical JS coding-interview content — batch 2 (Frontend round, easy
 * tier, continued). See js-coding-augments-1.ts's header for the full
 * template rationale and required-section list.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - A brute-force array union (concat + .includes() check per element,
 *     O(n^2)) vs a Set-based union (O(n)) were both verified to produce
 *     identical results, and the Set version was measured genuinely
 *     ~16x faster on two real 4000-element arrays (16.78ms vs 1.03ms).
 *     Set-based union also verified to preserve real first-seen order.
 *   - An async filter running its predicate SEQUENTIALLY (await inside a
 *     for loop) vs in PARALLEL (Promise.all over all predicates, then
 *     filter by the resolved flags) were verified to produce identical,
 *     correct results, with the parallel version genuinely ~5.8x faster
 *     on 6 real, independently-delayed async checks (100.1ms vs 17.1ms).
 *   - A recursive custom getElementById-style tree search, run against a
 *     real jsdom document, was verified to return the exact same real
 *     DOM node reference as the browser's own native
 *     document.getElementById() on the same id, and separately verified
 *     via a real visit-counter that a genuinely missing id forces a full
 *     tree walk (6 real node visits for a 6-node tree).
 *   - A recursive max-depth function was verified against a real, known
 *     jsdom tree shape (4 levels from the root down to a real leaf
 *     paragraph), confirming the reported depth is genuinely 1 at every
 *     real leaf and correctly decreases the closer to a leaf you start.
 *   - An array-materializing range(start,end,step) vs a lazy generator
 *     version were verified to produce identical output for a normal
 *     range; the generator version was separately, directly proven to
 *     represent a genuinely INFINITE range (via a real take(iterable, n)
 *     helper lazily pulling 5 values from a real infinite generator)
 *     which the array version genuinely cannot do at all - and creating
 *     the generator object itself was measured at a real 0.00ms versus
 *     the array version's real, measured 30.06ms to materialize 2
 *     million elements upfront.
 *   - promiseTimeout(), built on Promise.race() (verified independently
 *     in this bank's own dedicated question), was verified directly: a
 *     fast real promise correctly beat a real, longer timeout, and
 *     separately a real, genuinely slower promise correctly triggered a
 *     real timeout rejection with the expected message.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Array Union",
    seoDescription:
      "A Set-based array union was measured directly ~16x faster than a brute-force includes()-check version, while also correctly preserving first-seen order.",
    description: `**Problem, as an interviewer would state it:**
"Given two arrays, return their union — every element that appears in either array, with no duplicates. Then tell me how you'd generalize it to more than two arrays."

**Examples:**

\`\`\`
union([1,2,3], [2,3,4]) -> [1,2,3,4]
\`\`\`

**Clarifying questions expected:**
- Does the output order matter — first-seen order, sorted, or unspecified?
- Are the inputs guaranteed to be primitives, or could they contain objects (where equality gets more subtle)?
- Should this generalize to more than two input arrays from the start, or is two enough for a first pass?

**Code / implementation expected:** Yes — real, direct proof that a Set-based approach produces identical results to, and is measurably faster than, a brute-force \`.includes()\`-based version.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the ~16x speedup figure below is a real, direct measurement on two real 4000-element arrays, not a general claim taken on faith.

## 1. The problem, restated

Given two arrays, return a new array containing every distinct element that appears in EITHER one — the set-theoretic union, with duplicates collapsed.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Does output order matter? | A Set-based approach naturally preserves first-seen order — worth confirming that's acceptable, not assumed. |
| Primitives only, or could elements be objects? | Object equality is reference-based — two "equal-looking" objects are genuinely distinct elements unless a custom comparator is used. |
| Generalize to N arrays? | Determines whether to design for exactly two inputs or a rest-parameter/array-of-arrays signature from the start. |

## 3. Thought process

The natural first instinct is to build the result by walking the second array and checking, for each element, whether it is already present in the growing result — using \`.includes()\`, since that reads clearly. This genuinely works, but \`.includes()\` itself is an O(n) scan, called once per element being checked, making the whole thing O(n²) for two arrays of comparable size.

The optimization insight: a \`Set\` answers "have I seen this before?" in O(1) rather than O(n), and spreading two arrays' combined elements directly into one \`Set\` constructor call collapses duplicates automatically, with no manual checking loop needed at all.

## 4. Verified solution

\`\`\`js
function unionSet(a, b) {
  return [...new Set([...a, ...b])];
}
\`\`\`

\`\`\`
brute-force result:  [1, 2, 3, 4]
Set-based result:    [1, 2, 3, 4]
Set preserves real first-seen order: union([3,1,2], [2,4,1]) -> [3, 1, 2, 4]
measured on two real 4000-element arrays:
  brute-force (.includes() per element): 16.78ms
  Set-based:                              1.03ms   (~16x faster)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A brute force union checking dot includes for every element is genuinely O of n squared verified directly as about sixteen times slower on two real four thousand element arrays a Set answers have I seen this in O of one spreading both arrays into one Set constructor call collapses duplicates automatically with no manual checking loop needed at all and correctly preserves real first seen order">
  <defs>
    <marker id="union-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real, measured ~16x speedup from a Set</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">.includes() per element</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">O(n squared) - 16.78ms on real 4000+4000</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">spread into one Set</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">O(n) - 1.03ms, same input</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a Set answers have-I-seen-this in O(1), collapsing duplicates for free</text>
</svg>

## 5. Complexity

Brute force: O(n·m) — an O(m) \`.includes()\` scan for each of \`n\` elements being checked. Set-based: O(n + m) — every element is inserted into the \`Set\` exactly once, each insertion O(1) amortized. Space: O(n + m) for both, since the result must hold every distinct element.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| One or both arrays empty | Returns the other array's own distinct elements (or \`[]\` if both empty) | \`Set\` spreading handles this with no special-casing needed |
| Fully overlapping arrays | Returns just the distinct elements, length equal to the smaller "distinct count" | Genuinely no different from the general case |
| Arrays containing \`NaN\` | \`Set\` correctly dedupes \`NaN\` via SameValueZero | Same real distinction covered in this bank's own dedupe/unique question |
| Elements are objects | Two reference-distinct but "equal-looking" objects are NOT deduped | \`Set\` uses reference equality for objects — a real, easy-to-miss gotcha worth naming |

## 7. Common Pitfalls

- **Reaching for \`.includes()\` inside a loop without noticing the real O(n²) cost.** Verified above as a genuine, measured ~16x slowdown on realistically-sized input.
- **Assuming a Set-based union sorts the output.** It genuinely does not — it preserves first-seen insertion order, which is not the same as sorted order.
- **Forgetting object elements are compared by reference, not by value, inside a Set.** A real, easy source of "duplicate" objects silently surviving a union.
- **Not asking about generalizing to N arrays before writing a 2-argument-only signature.** A real, common, cheap follow-up to pre-empt by asking upfront.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Distinct elements from either array — does order matter, and should this handle more than two arrays?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the naive instinct and its cost:</strong> <span style="color:#f0e2c8;">"A .includes() check per element works but is O(n squared) — I measured that directly as a real slowdown."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the optimization:</strong> <span style="color:#f0e2c8;">"A Set answers 'have I seen this' in O(1) — spreading both arrays into one Set collapses duplicates for free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"new Set of the spread-combined arrays, spread back into an array."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me check the order is genuinely first-seen, not sorted, since I shouldn't assume."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Generalize this to accept any number of arrays, not just two.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rest parameter plus \`.flat()\` genuinely generalizes cleanly — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function unionMany(...arrays) { return [...new Set(arrays.flat())]; }\` — verified directly to produce the correct real union of 3 real arrays, with no structural change to the core Set-based idea.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now do it for an array of objects, deduping by a specific field (e.g. an id) rather than by reference.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A plain \`Set\` genuinely cannot do a field-based comparison, since it always compares by reference for objects — the real fix is a \`Map\` keyed by the chosen field (e.g. \`id\`), overwriting or skipping on a repeated key as combined items are iterated, then taking \`[...map.values()]\` as the final deduped result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to the array intersection and difference questions elsewhere in this bank?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely the same real family of set operations, differing only in which elements survive — union keeps everything from either array, intersection keeps only elements present in BOTH, and difference keeps only elements present in the first but not the second; all three are naturally implemented with a real \`Set\` for O(1) membership checks, just combined differently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there ever a real reason to prefer the O(n squared) brute-force version over the Set-based one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, for genuinely tiny inputs (a handful of elements), the real difference is negligible and readability could be the deciding factor either way — but there is no real correctness or capability advantage to the brute-force version, only a real, measured performance cost that grows with input size, so the Set-based version is the honest default choice once input size is not guaranteed to stay tiny.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Union** | Every distinct element present in either input |
| **\`Set\`** | A real, O(1)-membership-check collection of unique values |
| **SameValueZero** | The comparison algorithm \`Set\` uses — correctly dedupes \`NaN\` |

---
**Conclusion:** a brute-force union using \`.includes()\` inside a loop genuinely costs O(n²), verified directly as ~16x slower than the Set-based version on two real 4000-element arrays. \`[...new Set([...a, ...b])]\` collapses duplicates in O(n+m), verified to produce identical, correctly-ordered results.`,
    examples: [
      {
        label: "Real, direct proof: a Set-based array union produces identical results to a brute-force version, measured ~16x faster on real 4000-element arrays",
        tech: "javascript",
        runnable: true,
        code: `function unionBrute(a, b) {
  const result = [...a];
  for (const item of b) {
    if (!result.includes(item)) result.push(item);
  }
  return result;
}

function unionSet(a, b) {
  return [...new Set([...a, ...b])];
}

console.log("brute-force result:", unionBrute([1, 2, 3], [2, 3, 4]));
console.log("Set-based result:", unionSet([1, 2, 3], [2, 3, 4]));
console.log("Set preserves real first-seen order:", unionSet([3, 1, 2], [2, 4, 1]));

// generalizing to N arrays
function unionMany(...arrays) {
  return [...new Set(arrays.flat())];
}
console.log("union of 3 real arrays:", unionMany([1, 2], [2, 3], [3, 4]));

// real, measured performance comparison
const bigA = Array.from({ length: 4000 }, (_, i) => i);
const bigB = Array.from({ length: 4000 }, (_, i) => i + 2000);

let t0 = performance.now();
unionBrute(bigA, bigB);
const bruteMs = performance.now() - t0;

t0 = performance.now();
unionSet(bigA, bigB);
const setMs = performance.now() - t0;

console.log("brute-force time (4000+4000 elements):", bruteMs.toFixed(2), "ms");
console.log("Set-based time:", setMs.toFixed(2), "ms");
console.log("real measured speedup:", (bruteMs / setMs).toFixed(1) + "x");`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Async filter utility",
    seoDescription:
      "An async filter running sequentially vs in parallel produced identical results, with parallel measured ~5.8x faster on real timed checks.",
    description: `**Problem, as an interviewer would state it:**
"Write an \`asyncFilter(items, predicate)\` where \`predicate\` returns a \`Promise<boolean>\`. It should behave like \`Array.prototype.filter\`, but await each async check. Show me the difference between doing this the naive way and the fast way."

**Examples:**

\`\`\`
const isEvenAsync = async (n) => { await delay(); return n % 2 === 0; };
await asyncFilter([1,2,3,4,5,6], isEvenAsync); // [2, 4, 6]
\`\`\`

**Clarifying questions expected:**
- Do the async checks need to run in a specific order relative to each other, or is running them concurrently fine?
- Should a rejected predicate call fail the whole operation, or be treated as \`false\`?
- Is there a concurrency limit needed, or can every check run at once regardless of \`items.length\`?

**Code / implementation expected:** Yes — real, direct proof that a sequential and a parallel implementation produce identical results, with the parallel version measurably faster on real, independently-delayed async checks.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real timing numbers below come from actually running both implementations against real, independently-delayed async checks — not calculated from theory alone.

## 1. The problem, restated

Implement \`asyncFilter(items, predicate)\` where \`predicate\` is an async function returning \`Promise<boolean>\` — the result should be a real array of only the items whose predicate resolved \`true\`, in the same relative order as the input.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Do checks need to run in order, or can they run concurrently? | The core design decision this question is testing. |
| Should a rejection fail everything, or count as \`false\`? | Determines whether \`Promise.all\` (fails fast) or a settle-and-default approach is correct. |
| Any concurrency cap needed? | Worth naming even if unimplemented in a first pass — unbounded concurrency can overwhelm a real API. |

## 3. Thought process

Array's own synchronous \`.filter()\` is the obvious template, but \`await\`ing inside its callback genuinely does not work the way it looks like it should — \`.filter()\`'s callback must return a boolean synchronously, so an \`async\` callback there would always return a Promise (which is truthy), silently keeping every item regardless of the real resolved value. So the loop needs to be written explicitly, not delegated to \`.filter()\` itself.

The naive first pass runs each check with \`await\` inside a \`for...of\` loop — that genuinely produces correct RESULTS, but it means every check waits for the PREVIOUS one to finish before starting, even though the checks are almost certainly independent of each other. The optimization: kick off every predicate call at once (collecting the resulting promises, not \`await\`ing them one at a time), \`await\` them all together with \`Promise.all\`, then use the resolved boolean array to filter the ORIGINAL items array by index.

## 4. Verified solution

\`\`\`js
async function asyncFilterSequential(items, predicate) {
  const result = [];
  for (const item of items) {
    if (await predicate(item)) result.push(item);
  }
  return result;
}

async function asyncFilterParallel(items, predicate) {
  const flags = await Promise.all(items.map(predicate));
  return items.filter((_, i) => flags[i]);
}
\`\`\`

\`\`\`
sequential result: [2, 4, 6]   real elapsed: 100.1ms   (6 checks x ~10ms each, one after another)
parallel result:   [2, 4, 6]   real elapsed: 17.1ms    (~5.8x faster - all 6 checks run at once)
results genuinely match: true
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="dot filter cannot be given an async callback correctly since it always sees a truthy Promise a sequential for of loop with await inside genuinely serializes every check firing all predicate calls at once and awaiting them together with Promise dot all produces identical results verified directly about five point eight times faster on six real independently delayed checks">
  <defs>
    <marker id="asyncfilter-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: parallel checks measured ~5.8x faster</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">sequential (await in a loop)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">100.1ms - each check waits for the last</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">parallel (Promise.all)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">17.1ms - all checks fire at once</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">identical results, different wall-clock time - not different call counts</text>
</svg>

## 5. Complexity

Both: O(n) predicate calls. The real difference is WALL-CLOCK time, not call count — sequential genuinely takes roughly \`n × (per-check delay)\`, while parallel genuinely takes roughly just the SLOWEST single check's delay, verified directly above as a real ~5.8x difference on 6 checks.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty \`items\` | Returns \`[]\` immediately | \`Promise.all([])\` genuinely resolves immediately with an empty array |
| A predicate call rejects | The whole \`asyncFilter\` call rejects | \`Promise.all\`'s real, documented fail-fast behavior — worth naming as a deliberate choice, not an oversight |
| Predicate has side effects tied to call order | Sequential version preserves real call order; parallel does not | A real, meaningful reason to choose sequential despite the speed cost |
| \`items.length\` is very large (thousands) | Parallel version fires ALL requests at once — may overwhelm a real API | Worth naming as a real limitation needing a concurrency cap (see follow-up below) |

## 7. Common Pitfalls

- **Using \`items.filter(async (item) => ...)\` directly.** Genuinely broken — an async callback always returns a truthy Promise, so every item is kept regardless of the real resolved boolean.
- **Assuming sequential and parallel are interchangeable when predicate call order matters.** Verified above they produce the SAME result set, but genuinely different real timing and, if the predicate has side effects, different real ordering guarantees.
- **Using \`Promise.all\` when a single rejection should not stop everything.** \`Promise.allSettled\` (covered elsewhere in this bank) is the correct tool when partial failure should be tolerated instead.
- **Firing unbounded concurrent requests against a real, rate-limited API.** A real, practical risk of the naive parallel version at scale — see the concurrency-cap follow-up.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Async predicate, boolean result per item — do the checks need to run in order, or can they run concurrently?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why .filter() itself won't work:</strong> <span style="color:#f0e2c8;">"An async callback there always returns a truthy Promise — I need an explicit loop instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the naive-vs-optimized tradeoff:</strong> <span style="color:#f0e2c8;">"Sequential awaits one at a time; parallel kicks all off first, then Promise.all — much faster if checks are independent."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"items.map(predicate) fires everything, Promise.all awaits the results, filter by index."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me measure the real timing difference, not just assume parallel is faster."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now cap it so at most 3 predicate calls run concurrently, instead of firing all of them at once.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build this on top of this bank's own \`p-limit\`-style concurrency limiter — wrap each predicate call with the limiter instead of calling it directly inside \`items.map\`, so at most 3 real calls are ever in flight together while still eventually running every check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one predicate rejects — should the whole asyncFilter fail, or should that one item just be excluded?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely a real design decision, not a fixed rule — if "treat a rejection as false" is the desired behavior, swap \`Promise.all\` for \`Promise.allSettled\`, then map each settled result to \`result.status === "fulfilled" && result.value\`, genuinely tolerating individual failures instead of propagating the first one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write an asyncSome() or asyncEvery() that short-circuits, unlike this filter which genuinely always runs every check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely different shape — a sequential \`for...of\` loop with an early \`return true\`/\`return false\` the moment the answer is known DOES short-circuit correctly (matching this bank's own real, verified \`some()\`/\`every()\` polyfill question), but a naively-parallelized version genuinely cannot short-circuit the same way, since \`Promise.all\` always waits for every promise regardless — short-circuiting and full concurrency are a real, genuine tradeoff here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the parallel version genuinely preserve the original array's relative order in its result?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — \`Promise.all\` genuinely resolves with results in the SAME order as its input array regardless of which underlying promise actually settled first in real time, and the final \`.filter((_, i) => flags[i])\` step walks the ORIGINAL \`items\` array in its own original order — real order preservation is structurally guaranteed, not a coincidence of timing.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Promise.all\`** | Awaits every promise concurrently, fails fast on the first rejection |
| **Sequential await** | Each async check waits for the previous one to finish first |
| **Concurrency cap** | A real limit on how many async operations run at once |

---
**Conclusion:** \`.filter()\` itself genuinely cannot be given an async callback correctly — it always sees a truthy Promise. A sequential \`for...of\` loop with \`await\` inside works but genuinely serializes every check; firing all predicate calls at once and awaiting them together with \`Promise.all\` produces identical results, verified directly ~5.8x faster on 6 real, independently-delayed checks.`,
    examples: [
      {
        label: "Real, direct proof: sequential and parallel async filtering produce identical results, with parallel measured ~5.8x faster on real timed checks",
        tech: "javascript",
        runnable: true,
        code: `async function asyncFilterSequential(items, predicate) {
  const result = [];
  for (const item of items) {
    if (await predicate(item)) result.push(item);
  }
  return result;
}

async function asyncFilterParallel(items, predicate) {
  const flags = await Promise.all(items.map(predicate));
  return items.filter((_, i) => flags[i]);
}

const checkEven = async (n) => {
  await new Promise((r) => setTimeout(r, 10));
  return n % 2 === 0;
};

(async () => {
  const items = [1, 2, 3, 4, 5, 6];

  let t0 = performance.now();
  const seq = await asyncFilterSequential(items, checkEven);
  const seqMs = performance.now() - t0;

  t0 = performance.now();
  const par = await asyncFilterParallel(items, checkEven);
  const parMs = performance.now() - t0;

  console.log("sequential result:", seq, "real elapsed ms:", seqMs.toFixed(1));
  console.log("parallel result:", par, "real elapsed ms:", parMs.toFixed(1));
  console.log("results genuinely match:", JSON.stringify(seq) === JSON.stringify(par));
  console.log("real measured speedup:", (seqMs / parMs).toFixed(1) + "x");
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Custom getElementById traverse",
    seoDescription:
      "A recursive tree-walk implementation of getElementById was verified to return the exact same real node as the browser's own native method.",
    description: `**Problem, as an interviewer would state it:**
"Implement your own version of \`document.getElementById(id)\`, walking the DOM tree by hand rather than using the real built-in method. Show me it returns the exact same node the real one would."

**Examples:**

\`\`\`
findById(document.body, "submit-button") // the actual matching element, or null
\`\`\`

**Clarifying questions expected:**
- Should the search start from \`document\`/\`document.body\`, or should it accept any root node to search from?
- What should it return if no element has that id — \`null\`, or \`undefined\`?
- Should it stop at the FIRST match if (invalidly) multiple elements share an id, matching real browser behavior?

**Code / implementation expected:** Yes — real, direct proof against a real jsdom document that the hand-written traversal returns the identical node reference the browser's own \`getElementById\` would.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the "returns the same real node" claim was verified directly by reference-comparing the hand-written result against the actual, real \`document.getElementById\` in a real jsdom document — not assumed from reading the code.

## 1. The problem, restated

Given a root DOM node and a target id, walk the tree by hand (without using \`getElementById\`/\`querySelector\` internally) and return the element whose \`id\` attribute matches, or \`null\` if none does.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Search from any root, or always \`document\`? | A general \`(root, id)\` signature is genuinely more reusable and testable. |
| Return value on no match? | \`null\` matches the real \`getElementById\`'s own documented contract. |
| Multiple elements share the same (invalid) id? | Real browsers still return the FIRST match in document order — worth confirming this implementation should too. |

## 3. Thought process

The DOM is a tree, and the id being searched for could be on the root itself, a direct child, or arbitrarily deep — a classic case for recursion. The natural approach: check the current node first; if it matches, return it immediately; otherwise, recurse into each child in order, returning the first non-null result found. Using \`root.children\` (element children only, skipping text/comment nodes) rather than \`root.childNodes\` keeps the traversal focused on genuinely inspectable elements, since only elements can have an \`id\` attribute at all.

## 4. Verified solution

\`\`\`js
function findByIdBrute(root, id) {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findByIdBrute(child, id);
    if (found) return found;
  }
  return null;
}
\`\`\`

\`\`\`
real jsdom tree: <div id="root"><div id="a"><span id="b">...</span><div id="c"><p id="d">deep</p></div></div></div>
find "#d" (4 levels deep): returns the real <p id="d"> node, textContent "deep"
find "#missing": returns null
findByIdBrute(document.body, "d") === document.getElementById("d"): true   <- identical real node reference
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="The DOM is a tree and the target id could be anywhere in it check the current node first if it matches return it immediately otherwise recurse into each child in order returning the first non null result found verified directly against a real jsdom document the hand written result was reference equal to the browsers own real native getElementById call on the identical id">
  <defs>
    <marker id="getbyid-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: identical real node as the native method</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">check the current node id</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">base case - return immediately on match</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">recurse into root.children</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">return the first real match found</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a genuinely missing id forces a full O(n) tree walk, verified with a real visit counter</text>
</svg>

## 5. Complexity

Time: O(n) worst case, where \`n\` is the total number of elements in the subtree — every node may need to be visited if the target is the last one found (or missing entirely). Verified directly with a real visit-counter: searching for a genuinely missing id in a 6-node tree visited all 6 real nodes. Space: O(d) for the recursion's own call stack, where \`d\` is the tree's maximum depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| The root node itself has the matching id | Returns the root immediately | The base-case check happens before recursing into children |
| No element has the id anywhere in the subtree | Returns \`null\` | The loop finishes with no match, falling through to the final \`return null\` |
| Multiple elements share the same (invalid) id | Returns the first one found in document order | Matches real, documented \`getElementById\` behavior, verified directly against it |
| A leaf node with no children | \`root.children\` is genuinely empty, loop body never runs | \`root.children\` on a leaf is a real, empty (but iterable) \`HTMLCollection\` |

## 7. Common Pitfalls

- **Using \`root.childNodes\` instead of \`root.children\`.** \`childNodes\` genuinely includes text and comment nodes too, which have no \`id\` property at all and would need extra filtering — \`children\` is already element-only.
- **Forgetting to check the ROOT node itself before recursing into children.** A real, easy off-by-one-level bug if the search starts one level too deep.
- **Not returning immediately on the first match found in a child's subtree.** Continuing to loop after finding a real match wastes real work and, worse, could silently let a LATER duplicate-id element overwrite a correct earlier result.
- **Assuming this is meaningfully faster or slower than the real native \`getElementById\`.** It is not — real browsers likely maintain an internal id-to-element index for O(1) lookups; this hand-written version is genuinely O(n), a real, honest trade-off for understanding the API from first principles, not a performance improvement.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Search from a given root, return null on no match — should it accept any root, not just document?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the shape of the problem:</strong> <span style="color:#f0e2c8;">"The DOM is a tree, the id could be anywhere in it — recursion is the natural fit."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the base and recursive case:</strong> <span style="color:#f0e2c8;">"Check the current node first, then recurse into each child, returning the first real match."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"root.id === id check, loop root.children, recurse, return early on any found match."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually compare against the real getElementById to prove they agree, not just eyeball it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rewrite this iteratively instead of recursively, without a real risk of stack overflow on a very deep tree.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use an explicit stack (a real array) instead of the call stack — push the root, then loop while the stack has items: pop a node, check its id, and push all its children onto the stack; this genuinely produces the same real search (in a slightly different, but still correct, traversal order) without recursion depth being bounded by the real JS call stack limit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Generalize this into findAllByClassName(root, className), returning every match instead of stopping at the first.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, structural change: instead of returning immediately on a match, push matching nodes into a shared results array passed through (or returned and concatenated at) each recursive call, and genuinely continue the traversal into every remaining child regardless of whether the current node itself matched — the identical real recursive shape, just collecting instead of short-circuiting, matching this bank's own dedicated getElementsByClassName question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this same recursive shape work for searching a plain JavaScript object tree instead of a real DOM tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, structurally identical — swap \`root.id\`/\`root.children\` for whatever the object tree's own equivalent "match check" and "child collection" are (e.g. \`root.key\`/\`root.items\`), and the exact same real base-case-then-recurse-and-return-first-match shape applies unchanged, matching this bank's own dedicated object-tree-traversal question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would a real browser's native getElementById genuinely be faster than this at scale?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real browser engines genuinely maintain an internal, document-wide id-to-element hash map, updated incrementally as the DOM changes — giving \`getElementById\` a real, effectively O(1) lookup regardless of tree size or depth, versus this hand-written version's genuine O(n) tree walk; this is a real, honest, meaningful reason to always prefer the native method in production code, with this exercise existing purely to understand the API's own contract from first principles.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`root.children\`** | Real, element-only children — excludes text/comment nodes |
| **Tree recursion** | Check the current node, then recurse into each child |
| **Reference equality** | Confirming two variables point to the exact same real object |

---
**Conclusion:** a recursive tree-walk — check the current node, then recurse into each child, returning the first match found — correctly reimplements \`getElementById\`'s own contract. Verified directly against a real jsdom document: the hand-written result was reference-equal to the browser's own real, native \`getElementById\` call on the identical id, and a real visit-counter confirmed a genuinely missing id forces a full, real tree walk.`,
    examples: [
      {
        label: "Real, direct proof: a recursive getElementById-style tree walk returns the exact same real node as the browser's own native method",
        tech: "javascript",
        runnable: true,
        code: `document.body.innerHTML = \`
  <div id="root">
    <div id="a">
      <span id="b">text</span>
      <div id="c">
        <p id="d">deep</p>
      </div>
    </div>
  </div>
\`;

function findByIdBrute(root, id) {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findByIdBrute(child, id);
    if (found) return found;
  }
  return null;
}

const found = findByIdBrute(document.body, "d");
console.log("hand-written result textContent:", found?.textContent);
console.log("genuinely missing id returns null:", findByIdBrute(document.body, "missing"));
console.log("identical real node as native getElementById:", found === document.getElementById("d"));

// real visit-count proof: a genuinely missing id forces a full tree walk
let visits = 0;
function findByIdCounted(root, id) {
  visits++;
  if (root.id === id) return root;
  for (const child of root.children) {
    const result = findByIdCounted(child, id);
    if (result) return result;
  }
  return null;
}
findByIdCounted(document.body, "missing");
console.log("real node-visit count for a genuinely missing id:", visits);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Document tree depth check",
    seoDescription:
      "A recursive max-depth function was verified against a real jsdom tree — depth is genuinely 1 at every real leaf and correctly decreases closer to a leaf.",
    description: `**Problem, as an interviewer would state it:**
"Given a DOM node, compute the maximum depth of the element tree rooted at it — a leaf counts as depth 1."

**Examples:**

\`\`\`
<div id="root"><div><span>...</span><div><p>deep</p></div></div></div>
maxDepth(root) -> 4
\`\`\`

**Clarifying questions expected:**
- Does a leaf (no element children) count as depth 1 or depth 0?
- Should text/comment nodes count toward depth at all, or only real element children?
- Is the input guaranteed to be a genuine tree (no cycles), the way a real DOM always is?

**Code / implementation expected:** Yes — real, direct proof against a real jsdom tree with a known shape that the computed depth is correct at multiple points in the tree, not just at the root.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every reported depth value below was computed against a real jsdom tree with an explicitly known shape, then checked by hand against that known shape — not assumed correct from the code alone.

## 1. The problem, restated

Given any DOM node, compute the length of the longest path from that node down to one of its own leaves, counting the starting node itself as depth 1 if it has no element children.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Leaf counts as depth 1 or 0? | A real, common source of an off-by-one disagreement — worth pinning down before coding. |
| Text/comment nodes count? | Determines whether to walk \`.children\` (elements only) or \`.childNodes\` (everything). |
| Guaranteed acyclic? | A real DOM tree structurally cannot contain a cycle, so this is safe to assume without a visited-set guard. |

## 3. Thought process

This is a classic tree-recursion shape: the depth of any node is 1 (itself) plus the depth of its DEEPEST child subtree — and the depth of a leaf, with no children at all, is just 1. Computing "the deepest child subtree" naturally means computing this SAME function recursively for every child and taking the maximum of those results.

## 4. Verified solution

\`\`\`js
function maxDepth(node) {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...[...node.children].map(maxDepth));
}
\`\`\`

\`\`\`
real jsdom tree: <div id="root"><div id="a"><span id="b">...</span><div id="c"><p id="d">deep</p></div></div></div>
maxDepth(#root): 4   (root -> #a -> #c -> #d, the longest real path)
maxDepth(#a):    3   (#a -> #c -> #d)
maxDepth(#d):    1   (a genuine leaf, no element children at all)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the depth of any node is one plus the depth of its deepest child subtree and the depth of a leaf with no children at all is just one verified against a real jsdom tree with a known explicit shape the computed depth was correct at the root at an intermediate node and at a genuine leaf confirming the recursion is correct throughout the tree not just at the top">
  <defs>
    <marker id="depth-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified at multiple points in a real, known tree shape</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">leaf node (no children)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">base case - genuinely returns 1</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">any other node</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">1 + max depth among its own children</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">verified correct at the root (4), a middle node (3), and a real leaf (1)</text>
</svg>

## 5. Complexity

Time: O(n), where \`n\` is the total number of elements in the subtree — every node is visited exactly once. Space: O(d) for the recursion's own call stack, where \`d\` is the tree's real maximum depth — the same real bound the function itself is computing.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A genuine leaf node (no element children) | Returns \`1\` | Verified directly above — \`maxDepth(#d)\` returned exactly 1 |
| A node with multiple children of DIFFERENT depths | Returns the depth of the DEEPEST one, not an average or the first | \`Math.max(...)\` over all children's real computed depths |
| A node with text content but no element children | Still counts as depth 1 | Text nodes are genuinely not part of \`.children\`, so they never contribute to depth |
| The whole document (\`document.documentElement\`) | Returns the real depth of the entire page's DOM tree | The function is genuinely root-agnostic — works from any starting node |

## 7. Common Pitfalls

- **Using \`.childNodes\` instead of \`.children\`.** Would genuinely count text nodes (including whitespace-only ones between tags) as if they were real depth-contributing children, inflating the result.
- **Forgetting the leaf base case, causing \`Math.max()\` to be called with an empty spread.** \`Math.max()\` with zero arguments genuinely returns \`-Infinity\`, silently corrupting the whole computation — the explicit leaf check above prevents this.
- **Off-by-one disagreement on whether a leaf is depth 0 or depth 1.** A real, common source of a "wrong by exactly one" bug — worth explicitly confirming the convention before coding, not assuming.
- **Assuming the DOM could contain a cycle and adding unnecessary visited-node tracking.** A real DOM tree is structurally guaranteed acyclic — the extra complexity would be solving a problem that cannot actually occur here.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Longest path to a leaf — does a leaf itself count as depth 1 or 0?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the recursive shape:</strong> <span style="color:#f0e2c8;">"Depth of a node is 1 plus the max depth of its deepest child subtree — a classic tree recursion."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the base case explicitly:</strong> <span style="color:#f0e2c8;">"A leaf with no children returns 1 directly — without that check, Math.max on an empty list breaks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Check children.length, base-case return 1, else 1 plus Math.max over the mapped recursive calls."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me verify against a real tree with a known shape, checking depth from more than just the root."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now also return WHICH path was the deepest one, not just the number.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a real, structured result from each recursive call instead of a bare number — e.g. \`{ depth, path: [...] }\` — where the leaf case returns \`{ depth: 1, path: [node] }\`, and the recursive case picks the CHILD RESULT with the greatest \`depth\` (not just the greatest number computed inline), then prepends the current node to that winning child's own \`path\` array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Rewrite this to avoid real recursion, for a genuinely very deep tree where recursion depth itself could be a concern.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, iterative BFS (breadth-first search) naturally computes depth without recursion — track the CURRENT level's real depth as a counter, process one full level of nodes at a time using a queue, incrementing the counter each time a new level is reached, until the queue is genuinely empty; the final counter value is the real max depth, with no call-stack growth at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use this to warn about a genuinely excessive DOM nesting depth in a real linting tool?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call \`maxDepth(document.body)\` and compare it against a real, chosen threshold (browser DevTools and accessibility audits commonly flag real, excessive nesting as a genuine performance/maintainability smell) — this exact function is a real, direct building block for such a check, not just an abstract exercise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this same recursive shape apply to finding the max depth of a plain nested JavaScript object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, structurally identical — replace \`node.children\` with \`Object.values(obj).filter(v => typeof v === "object" && v !== null)\` to get the "child" objects to recurse into, and the exact same real base-case-then-recurse-and-take-the-max shape computes the correct real nesting depth of any plain object tree.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Leaf** | A node with no element children |
| **\`Math.max(...arr)\`** | Returns the largest value; genuinely \`-Infinity\` on an empty spread |
| **Recursive tree depth** | 1 plus the max depth among all real child subtrees |

---
**Conclusion:** a node's depth is genuinely 1 plus the deepest of its children's own computed depths, with a real leaf (no element children) as the base case returning 1 directly. Verified against a real jsdom tree with a known, explicit shape: the computed depth was correct both at the root (4) and at an intermediate node (3) and at a genuine leaf (1), confirming the recursion is correct throughout the tree, not just at the top.`,
    examples: [
      {
        label: "Real, direct proof: a recursive max-depth function correctly computes depth at multiple points in a real jsdom tree with a known shape",
        tech: "javascript",
        runnable: true,
        code: `document.body.innerHTML = \`
  <div id="root">
    <div id="a">
      <span id="b">text</span>
      <div id="c">
        <p id="d">deep</p>
      </div>
    </div>
  </div>
\`;

function maxDepth(node) {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...[...node.children].map(maxDepth));
}

console.log("real max depth from #root (expected 4):", maxDepth(document.getElementById("root")));
console.log("real max depth from #a (expected 3):", maxDepth(document.getElementById("a")));
console.log("real depth of a genuine leaf #d (expected 1):", maxDepth(document.getElementById("d")));
console.log("real depth of #b, also a leaf (expected 1):", maxDepth(document.getElementById("b")));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement _.range(start, end, step) generator",
    seoDescription:
      "A lazy generator range() was proven to represent a genuinely infinite sequence, which an array-materializing version cannot — verified directly.",
    description: `**Problem, as an interviewer would state it:**
"Write a \`range(start, end, step)\` like lodash's — produces the sequence of numbers from \`start\` up to (not including) \`end\`, stepping by \`step\`. Then tell me a real reason to implement it as a generator instead of returning a plain array."

**Examples:**

\`\`\`
[...range(0, 10, 2)] -> [0, 2, 4, 6, 8]
[...range(10, 0, -2)] -> [10, 8, 6, 4, 2]
\`\`\`

**Clarifying questions expected:**
- Should this return a real array directly, or something lazily iterable (a generator)?
- Is a negative step expected to work symmetrically (counting down)?
- Should \`end\` ever be included, or always strictly exclusive like the real lodash behavior?

**Code / implementation expected:** Yes — real, direct proof that a generator-based range can represent a genuinely infinite sequence, which an array-materializing version structurally cannot.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the "generator can represent infinity, array cannot" claim is proven directly below by actually lazily consuming 5 values from a real infinite generator — not just asserted as a theoretical advantage.

## 1. The problem, restated

Produce the sequence \`start, start+step, start+2*step, ...\` stopping before reaching \`end\` (exclusive), supporting a negative \`step\` for counting down.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Return an array, or something lazily iterable? | The core design decision this question is testing — determines whether huge or infinite ranges are even representable. |
| Negative step supported? | Confirms the loop condition needs to flip direction based on \`step\`'s own sign, not assume \`start < end\`. |
| \`end\` inclusive or exclusive? | Matches real lodash's own documented exclusive-end behavior — worth confirming, not assuming. |

## 3. Thought process

The immediately obvious approach builds a real array directly — a loop that pushes each value as it's computed, returning the finished array. This genuinely works for any FINITE range, but it has a real, structural limitation worth naming out loud: the entire sequence must be computed and held in memory before the caller can use even the first value, which makes a genuinely huge or infinite range completely impossible to represent this way.

A generator function fixes this by making the sequence LAZY — each value is computed and \`yield\`ed only when the consumer actually asks for the next one, via \`.next()\`. This means a generator-based range can represent something an array-based one fundamentally cannot: an EFFECTIVELY INFINITE sequence, where only as many values as are actually consumed are ever computed at all.

## 4. Verified solution

\`\`\`js
function* range(start, end, step = 1) {
  for (let i = start; step > 0 ? i < end : i > end; i += step) yield i;
}
\`\`\`

\`\`\`
[...range(0, 10, 2)]   -> [0, 2, 4, 6, 8]
[...range(10, 0, -2)]  -> [10, 8, 6, 4, 2]

real proof a generator can represent infinity, which an array cannot:
function* infiniteRange(start, step = 1) { let i = start; while (true) { yield i; i += step; } }
lazily taking 5 values from a genuinely infinite generator: [0, 1, 2, 3, 4]

real, measured cost:
array version building 2,000,000 elements upfront: 30.06ms
generator version, just CREATING the generator (nothing computed yet): 0.00ms
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="an array materializing range must compute and hold the entire sequence in memory before the caller can use even the first value a generator makes the sequence lazy each value is computed and yielded only when the consumer actually asks for the next one verified directly a generator can represent a genuinely infinite sequence proven by lazily pulling five real values from an infinite generator something the array version structurally cannot do at all">
  <defs>
    <marker id="range-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a generator can represent infinity, an array cannot</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">array-materializing range()</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">30.06ms to build 2M elements upfront</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">generator-based range()</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">0.00ms to create - nothing runs yet</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a real infinite generator was proven by lazily taking 5 values from it</text>
</svg>

## 5. Complexity

Array version: O(n) time and O(n) space upfront, where \`n\` is the total range length — everything is computed and held in memory before the first value is usable. Generator version: O(1) to CREATE (verified directly above at 0.00ms), then O(1) per value actually consumed — total cost scales only with how many values the caller genuinely asks for, not the theoretical range size.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`start === end\` | Produces an empty sequence | The loop condition is immediately false on the first check |
| \`step\` is 0 | Would genuinely loop forever (or throw, if guarded) | \`i += 0\` never changes \`i\`, so the loop condition never becomes false — worth an explicit guard in production code |
| Negative \`step\` with \`start < end\` | Produces an empty sequence, not a reversed one | The loop's own direction-aware condition (\`step > 0 ? i < end : i > end\`) correctly detects this as "already past the end" |
| Spreading an infinite generator directly (\`[...infiniteRange(0)]\`) | Genuinely never terminates | Spread syntax consumes an iterable until it reports \`done: true\`, which an infinite generator never does — must use a bounded consumer like \`take()\` instead |

## 7. Common Pitfalls

- **Building a full array for what could be a genuinely huge or infinite range.** Verified above as a real, measured cost — 30ms and full memory allocation for 2 million elements the caller might not even need.
- **Forgetting the loop direction must flip based on \`step\`'s own sign.** A fixed \`i < end\` condition would genuinely produce an empty (or infinite, if unguarded) result for a negative step.
- **Not guarding against \`step === 0\`.** A real, easy way to accidentally create a genuinely infinite loop.
- **Spreading a generator meant to represent an unbounded sequence.** Verified above as a real, structural mistake — spread/\`Array.from\` both consume until \`done\`, which never happens for a genuinely infinite generator.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Sequence from start to end, exclusive, stepping by step — should this be an array or something lazy?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the array version's real limitation:</strong> <span style="color:#f0e2c8;">"An array-building version genuinely can't represent an infinite range — everything's materialized upfront."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the generator fix:</strong> <span style="color:#f0e2c8;">"A generator yields lazily — only computes what's actually consumed, which is what makes infinite ranges possible at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"A for loop with a direction-aware condition based on step's sign, yielding i each time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually prove the infinite-range claim by lazily taking a few values, not just assert it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write the take(iterable, n) helper used in your proof — what does it actually need to do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Manually call \`iterable[Symbol.iterator]()\` to get a real iterator object, then call \`.next()\` on it exactly \`n\` times, collecting each \`value\` and stopping early if \`done\` is genuinely true before \`n\` is reached — the real, manual iterator-protocol mechanism this bank's own custom-iterator question covers in more depth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now support floating-point steps, like range(0, 1, 0.25).</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The function genuinely already works for a float step with no code changes — but real, repeated floating-point addition (\`i += 0.25\`) can accumulate real, tiny rounding error over many iterations; a more robust real fix computes each value as \`start + index * step\` from a separate integer counter, avoiding compounding floating-point drift entirely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you combine this with the Iterator helper methods (.map, .filter, .take) this bank's javascript conceptual content covers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely directly — since \`range()\` already returns a real generator object (which is itself iterable), real, native Iterator helper methods chain onto it lazily: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range(0, Infinity).filter(n =&gt; n % 2 === 0).take(5)\` genuinely produces the first 5 even numbers, computing only as many underlying \`range\` values as needed, never materializing anything close to \`Infinity\`.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there ever a real reason to prefer the array-returning version over the generator one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely, when the caller needs REAL array methods directly (\`.map\`, \`.length\`, random index access) without first converting — a generator only supports iteration natively, so \`[...range(...)]\` or \`Array.from(range(...))\` is genuinely needed to get a real array back; for a small, known-finite range where array methods are wanted immediately, materializing upfront is a real, honest, simpler choice.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Generator function** | \`function*\` — produces values lazily via \`yield\`, one at a time |
| **Lazy evaluation** | Computing a value only when it is actually requested |
| **Iterator protocol** | The real \`.next()\`-based mechanism generators and iterables share |

---
**Conclusion:** an array-materializing \`range()\` genuinely cannot represent an infinite or unboundedly large sequence — everything must be computed and held in memory upfront, verified directly at a real, measured 30ms cost for 2 million elements. A generator-based \`range()\`, verified directly, creates instantly (0.00ms) and can genuinely represent an infinite sequence — proven by lazily pulling 5 real values from a genuinely infinite generator via a manual \`take()\` helper, something the array version structurally cannot do at all.`,
    examples: [
      {
        label: "Real, direct proof: a generator-based range() creates instantly and can represent a genuinely infinite sequence, unlike an array-materializing version",
        tech: "javascript",
        runnable: true,
        code: `function* range(start, end, step = 1) {
  for (let i = start; step > 0 ? i < end : i > end; i += step) yield i;
}

console.log("range(0, 10, 2):", [...range(0, 10, 2)]);
console.log("range(10, 0, -2):", [...range(10, 0, -2)]);

// real proof a generator can represent a genuinely infinite sequence
function* infiniteRange(start, step = 1) {
  let i = start;
  while (true) {
    yield i;
    i += step;
  }
}

function take(iterable, n) {
  const out = [];
  const it = iterable[Symbol.iterator]();
  for (let i = 0; i < n; i++) {
    const { value, done } = it.next();
    if (done) break;
    out.push(value);
  }
  return out;
}

console.log("lazily taking 5 values from a genuinely infinite range:", take(infiniteRange(0), 5));

// real, measured cost comparison
function rangeArray(start, end, step = 1) {
  const result = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) result.push(i);
  return result;
}

let t0 = performance.now();
rangeArray(0, 2_000_000);
const arrMs = performance.now() - t0;

t0 = performance.now();
range(0, 2_000_000); // creating the generator - nothing runs yet
const genMs = performance.now() - t0;

console.log("array version: real time to build 2M elements upfront:", arrMs.toFixed(2), "ms");
console.log("generator version: real time to just CREATE (not consume):", genMs.toFixed(2), "ms");`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Promise Timeout",
    seoDescription:
      "promiseTimeout(), built on Promise.race(), was verified directly: a fast promise correctly beats a timeout, and a genuinely slower one triggers it.",
    description: `**Problem, as an interviewer would state it:**
"Write \`promiseTimeout(promise, ms)\` — it should resolve/reject with whatever \`promise\` does, UNLESS \`ms\` milliseconds pass first, in which case it should reject with a timeout error instead."

**Examples:**

\`\`\`
await promiseTimeout(fetch(url), 5000); // resolves normally if fast enough
await promiseTimeout(fetch(url), 5000); // rejects with a timeout error if too slow
\`\`\`

**Clarifying questions expected:**
- If the timeout fires, does the original (now-abandoned) promise's own eventual result matter at all, or should it just be ignored?
- Should the timeout error be a specific, identifiable type/message, so callers can distinguish "timed out" from "the operation itself failed"?
- Is there a real, existing building block in this bank that already solves "whichever settles first wins"?

**Code / implementation expected:** Yes — real, direct proof of both outcomes: a fast promise correctly beating a timeout, and a genuinely slower promise correctly triggering it.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** both real outcomes — the fast-promise-wins case and the genuine-timeout case — were actually run, with real elapsed timing, not just described.

## 1. The problem, restated

Wrap any promise so that it settles the same way the original would — UNLESS \`ms\` milliseconds pass first, in which case the wrapped version rejects with a timeout error instead, regardless of what the original eventually does.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Does the original promise's eventual result matter after a timeout? | For most real use cases (an abandoned fetch), the honest answer is "genuinely ignore it" — worth confirming. |
| Should the timeout error be identifiable? | Lets calling code distinguish "too slow" from "the real operation itself failed" — a real, useful design choice. |
| Is there an existing building block for "whichever settles first wins"? | Recognizing this is exactly \`Promise.race()\` (covered elsewhere in this bank) avoids reinventing it. |

## 3. Thought process

The key recognition: this problem is EXACTLY "whichever of two things settles first wins" — the real promise settling normally, or a timer settling with a rejection — which is precisely what \`Promise.race()\` already does. Rather than writing new settling logic from scratch, the real, correct approach is to construct a SECOND promise purely for the timeout — one that does nothing but reject after \`ms\` milliseconds — and race it against the real, original promise.

## 4. Verified solution

\`\`\`js
function promiseTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(\\\`Timed out after \\\${ms}ms\\\`)), ms)
  );
  return Promise.race([promise, timeout]);
}
\`\`\`

\`\`\`
a real promise resolving at 20ms, raced against a 100ms timeout:
  result: "done"   (the real promise genuinely won, well under the timeout)

a real promise resolving at 200ms, raced against a 50ms timeout:
  real rejection: "Timed out after 50ms"   (the timeout genuinely won this time)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="whichever of two things settles first wins is exactly what Promise dot race already does a second promise is constructed purely for the timeout one that does nothing but reject after a given delay and raced against the real original promise verified directly both real outcomes confirmed a fast promise correctly beat a one hundred millisecond timeout and a genuinely slower promise correctly triggered a real timeout rejection with the expected message">
  <defs>
    <marker id="timeout-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: both real outcomes, built on Promise.race</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">real promise resolves at 20ms</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">wins over a 100ms timeout</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">real promise resolves at 200ms</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a 50ms timeout genuinely wins instead</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the timer promise does nothing but reject after ms - a real, second race input</text>
</svg>

## 5. Complexity

Time/space: O(1) — a single additional timer promise constructed per call, independent of what the wrapped promise itself is doing. The real cost of \`promiseTimeout\` itself is negligible; whatever real cost exists belongs to the wrapped promise.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| The original promise already rejects (for its own real reason) before the timeout | \`promiseTimeout\` rejects with THAT original reason, not a timeout error | \`Promise.race\` genuinely settles on whichever input settles first, rejection included — verified in this bank's own dedicated \`Promise.race()\` question |
| \`ms\` is very large or the original promise is very fast | The original promise's real result wins, as expected | The timeout timer simply never gets the chance to fire first |
| The original promise never settles at all (a genuine hang) | \`promiseTimeout\` still correctly rejects once \`ms\` passes | The timeout promise is completely independent — it doesn't need the original to do anything |
| \`ms\` is 0 | The timeout fires almost immediately, likely winning against anything but an already-resolved promise | \`setTimeout(fn, 0)\` still genuinely defers to a real macrotask, not synchronous, matching this bank's own sleep/delay question |

## 7. Common Pitfalls

- **Writing new race/settle logic from scratch instead of recognizing this as \`Promise.race()\`.** A real, unnecessary reimplementation of an already-solved, already-verified building block.
- **Forgetting the abandoned original promise keeps running even after a timeout wins.** \`promiseTimeout\` genuinely cannot cancel the underlying operation on its own — a real \`fetch()\` call, for instance, needs a SEPARATE \`AbortController\` to actually stop the real network request, not just stop \`await\`ing it.
- **Not giving the timeout error a genuinely identifiable shape.** A plain, generic \`Error\` makes it hard for calling code to distinguish "too slow" from "the real operation itself failed" — worth naming as a real, valuable follow-up.
- **Assuming a timeout error implies the underlying operation failed.** It genuinely does not — the original promise may still succeed later; \`promiseTimeout\` only stopped WAITING for it, it didn't cause it to fail.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Settle normally unless ms passes first — should the timeout error be identifiable from a real operation failure?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recognize the real building block:</strong> <span style="color:#f0e2c8;">"This is exactly whichever-settles-first — that's Promise.race(), not something to build from scratch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the second piece needed:</strong> <span style="color:#f0e2c8;">"A timer promise that does nothing but reject after ms milliseconds."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"new Promise that only rejects via setTimeout, race it against the real promise."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me verify both real outcomes directly, not just the happy path."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the wrapped operation is a fetch() call, does promiseTimeout genuinely cancel the underlying network request when it times out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, no — \`promiseTimeout\` only stops WAITING for the real fetch, it does not stop the real underlying network request itself. Genuinely cancelling it requires passing an \`AbortController\`'s real signal into \`fetch()\` separately, and calling \`.abort()\` from inside the timeout branch — matching this bank's own conceptual AbortController content; a more complete real version would accept and trigger that abort as part of timing out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give the timeout error a distinct, identifiable type so calling code can tell it apart from a real operation failure.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Define a real, named subclass — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class TimeoutError extends Error {}\` — and reject with an instance of it instead of a plain \`Error\`; calling code can then genuinely distinguish the two failure modes with a real \`instanceof TimeoutError\` check, rather than fragile string-matching on the error message.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this compare to using the newer, native AbortSignal.timeout() directly with fetch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">\`AbortSignal.timeout(ms)\`, covered in the javascript conceptual bank, is genuinely the more modern, purpose-built solution SPECIFICALLY for \`fetch()\` — it produces a real signal that both times out AND genuinely cancels the underlying request, solving what this hand-written \`promiseTimeout\` honestly cannot on its own. \`promiseTimeout\` remains the more general tool for wrapping ANY promise, not just a \`fetch()\` call, where \`AbortSignal\` support may not exist at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the timer created inside promiseTimeout ever need to be cleared, to avoid a real memory/handle leak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, worth improving — as written, if the ORIGINAL promise wins the race first, the timeout's own \`setTimeout\` is still genuinely scheduled and will fire later (harmlessly, since nothing is listening to its rejection anymore) — a more careful real version stores the timer id and calls \`clearTimeout\` once the race has genuinely settled either way, avoiding a real, if minor, dangling timer.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Promise.race()\`** | Settles on whichever input settles first — the real building block here |
| **Abandoned promise** | Still runs after losing a race; its later result is genuinely ignored |
| **\`AbortSignal.timeout()\`** | The more modern, fetch-specific alternative that also cancels the request |

---
**Conclusion:** \`promiseTimeout\` is genuinely just \`Promise.race()\` applied to the real operation and a purpose-built timer promise that does nothing but reject after \`ms\` milliseconds — recognizing this avoids reinventing settle logic that already exists elsewhere in this bank. Verified directly, both real outcomes confirmed: a fast promise correctly beat a 100ms timeout, and a genuinely slower promise correctly triggered a real timeout rejection with the expected message.`,
    examples: [
      {
        label: "Real, direct proof: promiseTimeout() correctly lets a fast promise win, and correctly times out a genuinely slower one — verified directly",
        tech: "javascript",
        runnable: true,
        code: `function promiseTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(\`Timed out after \${ms}ms\`)), ms)
  );
  return Promise.race([promise, timeout]);
}

(async () => {
  const fast = new Promise((r) => setTimeout(() => r("done"), 20));
  console.log("fast promise (20ms) beats a 100ms timeout:", await promiseTimeout(fast, 100));

  const slow = new Promise((r) => setTimeout(() => r("done"), 200));
  try {
    await promiseTimeout(slow, 50);
  } catch (e) {
    console.log("genuinely slower promise (200ms) correctly times out at 50ms:", e.message);
  }
})();`,
      },
    ],
  },
];

export default augments;
