/**
 * Practical JS coding-interview content — batch 24 (DSA round: the last
 * five medium questions plus one hard — array subset check, find missing
 * number, merge sorted arrays, partition (sync + async), validate a BST,
 * rotate an array N times). See js-coding-augments-15 through -23.ts's
 * headers for the template rationale and standing gotchas. Titles were
 * pulled from a live DB query. Most of these rows only had a generic
 * "Implement the scenario utility" description, so each doc states its
 * own explicit spec.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - Array subset check: set and multiset semantics cross-checked
 *     against brute force over 20,000 seeded random pairs (0 mismatches);
 *     NaN found by Set/includes but NOT by indexOf; objects compare by
 *     reference; nested includes vs a Set at n=20,000 (318 ms vs 3.5 ms).
 *   - Find missing number: sum, XOR and Set approaches exhaustively
 *     checked for n = 1..60 with every possible missing value (shuffled),
 *     plus n = 1,000,000; sum exact only while n(n+1)/2 < 2^53 (fine at
 *     1e8, not at 2e8); XOR is int32 ((2**31)^0 wraps negative);
 *     duplicate input makes the sum trick return nonsense (4).
 *   - Merge sorted arrays: 20,000 random pairs vs concat+sort (0
 *     mismatches); default sort() is lexicographic ([1,10,2,3,5]); ties
 *     stay stable only with <= (a before b); the in-place LeetCode-88
 *     form fills from the back; 2 x 500k: merge 25 ms vs concat+sort
 *     47 ms (about 2x, not orders of magnitude).
 *   - Partition: order preserved inside each group; two filters call the
 *     predicate 2n times vs n for partition; async version verified to
 *     preserve order when predicates resolve out of order, parallel
 *     ~100 ms vs sequential ~240 ms for delays summing to 195 ms;
 *     arr.filter(async fn) keeps EVERY element (promises are truthy).
 *   - Validate BST: bounds-based and iterative in-order versions agree
 *     with an O(n^2) oracle on 20,000 random trees (0 mismatches); the
 *     naive parent-child check is wrong on [10,5,15,null,null,6,20]
 *     (it accepts an invalid tree); duplicates invalid under strict
 *     ordering; recursive version overflows at depth 20000 on this Node
 *     while the iterative one handles a 100,000-deep chain.
 *   - Rotate: slice and three-reversal versions exhaustively checked for
 *     n = 0..9, k = -25..25 against an index-mapping reference (0
 *     mismatches); -1 % 5 is -1 and 5 % 0 is NaN in JS; one-step
 *     pop/unshift grows linearly with k (24 ms at k=1000, 108 ms at
 *     5000, 405 ms at 20000 on 100,000 items) while three reversals stay
 *     flat (about 0.5 ms).
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Array subset check",
    seoDescription:
      "An array subset check was verified against brute force over 20,000 pairs, in set and multiset forms, including NaN and the O(n*m) includes trap.",
    description: `**Problem, as an interviewer would state it:**
"Write \`isSubset(sub, sup)\` that returns whether every element of \`sub\` appears in \`sup\`. Discuss edge cases, runtime, and what \`subset\` should mean when there are duplicates."

**Examples:**

\`\`\`
isSubset([1, 2], [3, 2, 1]); // true
isSubset([1, 4], [1, 2, 3]); // false
\`\`\`

**Clarifying questions expected:**
- Set semantics (only presence matters) or multiset semantics (counts matter, so \`[1,1]\` is not a subset of \`[1]\`)?
- Is the empty array a subset of everything?
- How are \`NaN\`, objects, and \`1\` versus \`"1"\` compared?

**Code / implementation expected:** Yes — real, direct proof against a brute-force reference, in both semantics.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the title gives no spec, so this doc defines two and checks both against brute force over 20,000 seeded random array pairs (0 mismatches). It also measures why the tempting one-liner is quadratic: at n = 20,000, nested \`includes\` took 318 ms versus 3.5 ms with a \`Set\`.

## 1. The problem, restated

Decide whether the first array is contained in the second. Two reasonable definitions exist, and the interview is largely about noticing that: set containment asks only "is each value present?", while multiset containment asks "does the second array have enough copies of each value?".

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Do duplicates count? | Set semantics say \`[1,1,1]\` is a subset of \`[1]\`; multiset semantics say it is not. They need different code. |
| Empty subset? | The empty array is a subset of every array, including another empty one (vacuous truth). |
| Equality rules? | \`Set\` and \`includes\` use SameValueZero (so \`NaN\` matches \`NaN\`); \`indexOf\` uses strict equality (it never finds \`NaN\`). Objects compare by reference. |
| Sizes and repeats? | If \`sub\` is checked many times against the same \`sup\`, build the lookup once. |

## 3. Thought process

Brute force checks every element of \`sub\` with \`sup.includes(x)\`. That is O(n · m) because each \`includes\` scans \`sup\`. The fix is the standard trade of memory for time: put \`sup\` into a \`Set\` once (O(m)), then each membership test is O(1) on average, so the whole check is O(n + m). For multiset semantics a \`Set\` is not enough because it forgets counts; use a \`Map\` from value to remaining count, and consume one count per element of \`sub\`, failing as soon as a count is exhausted.

## 4. Verified solution

\`\`\`js
function isSubset(sub, sup) {                    // set semantics
  const s = new Set(sup);
  return sub.every((x) => s.has(x));
}
function isSubMultiset(sub, sup) {               // multiset semantics
  const counts = new Map();
  for (const x of sup) counts.set(x, (counts.get(x) ?? 0) + 1);
  for (const x of sub) {
    const c = counts.get(x) ?? 0;
    if (c === 0) return false;
    counts.set(x, c - 1);
  }
  return true;
}
\`\`\`

\`\`\`
real, verified output:
  isSubset([1,2],[3,2,1]) -> true      isSubset([1,4],[1,2,3]) -> false
  isSubset([],[1]) -> true             isSubset([],[]) -> true

  duplicates: isSubset([1,1,1],[1]) -> true (set semantics)
              isSubMultiset([1,1,1],[1]) -> false    isSubMultiset([1,1],[1,1,2]) -> true

  NaN: isSubset([NaN],[1,NaN]) -> true, includes-based true, indexOf-based FALSE
  objects: isSubset([o],[o]) -> true, isSubset([{a:1}],[{a:1}]) -> false (by reference)
  isSubset([1],["1"]) -> false

  20,000 random pairs against brute force (set and multiset): mismatches 0
  n = 20,000: nested includes 318.1 ms vs Set version 3.5 ms
  (timings vary by machine and by how the code is run, for example the runnable example below measured 620 ms vs 5 ms;
   the ratio and the growth, not the absolute milliseconds, are the point)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="checking each element with includes rescans the whole second array every time, while building a Set once makes each lookup constant time, and a Map of counts extends the idea to multisets where duplicates matter">
  <defs>
    <marker id="subset-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Trade memory for time, then decide what duplicates mean</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">sub.every(x =&gt; sup.includes(x))</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">rescans sup each time, O(n * m)</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">Set of sup, then lookups</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">O(n + m); a Map of counts for multisets</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a Set forgets counts, so [1,1,1] passes as a subset of [1] under set semantics</text>
</svg>

## 5. Complexity

Time: O(n + m). Space: O(m) for the \`Set\` (or the count \`Map\`). The brute force is O(n · m) time with O(1) space.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty \`sub\` | \`true\` | \`every\` on an empty array is true |
| Empty \`sup\`, non-empty \`sub\` | \`false\` | Nothing can be found |
| Duplicates in \`sub\` | Depends on the chosen semantics | A \`Set\` ignores counts; a count \`Map\` respects them |
| \`NaN\` | Found by \`Set\`/\`includes\`, missed by \`indexOf\` | SameValueZero vs strict equality |
| Objects | Equal only if the same reference | Two equal-looking literals are different values |
| \`1\` versus \`"1"\` | Different | No type coercion |

## 7. Common Pitfalls

- **\`every\` plus \`includes\` on large inputs.** It reads as one line and is quadratic; 318 ms versus 3.5 ms at n = 20,000 (verified).
- **Using \`indexOf\` to test membership.** It silently fails for \`NaN\` because \`NaN === NaN\` is false.
- **Assuming set semantics when the interviewer meant multiset.** \`[1,1,1]\` vs \`[1]\` is the classic trap; ask.
- **Expecting deep equality.** Objects are compared by reference; if you need structural matching, serialize a canonical key or use this bank's deepEqual.
- **Rebuilding the \`Set\` on every call.** When \`sup\` is fixed, build it once and reuse it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Does subset mean presence only, or do counts matter -- is [1,1] a subset of [1]? And the empty array is a subset of anything, right?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"For each element of sub, call includes on sup: simple, O(n times m)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Each includes rescans sup. Building a Set once makes lookups constant time, for O(n plus m) overall."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Set of sup, every-has for set semantics; for multisets a Map of counts that I decrement, failing when one hits zero."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Empty sub, repeated values, a NaN, and two objects that look equal but are different references."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you check for a subarray (contiguous) instead of a subset?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A different problem: order and adjacency matter. Slide a window of length <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub.length</code> across <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sup</code> comparing element by element (O(n·m)), or use a string-search algorithm such as KMP over the elements for O(n + m).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if both arrays are sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use two pointers with O(1) extra space: advance through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sup</code>, and move the pointer in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub</code> only on a match; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sup</code> passes the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub</code> value, the answer is false. Ask whether the sorted guarantee is real before relying on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you return the missing elements instead of a boolean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: that is this bank's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">difference(a, b)</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isSubset</code> is exactly "the difference of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub</code> minus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sup</code> is empty".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a built-in for this now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Newer engines add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.prototype.isSubsetOf</code>, but support varies by runtime, so verify your target environment before relying on it. The array version here works everywhere.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Set semantics** | Only whether each value is present matters |
| **Multiset** | A collection where repeats count |
| **SameValueZero** | The equality Set and includes use: NaN equals NaN |

---
**Conclusion:** checking every element with \`includes\` is O(n · m); building a \`Set\` of the larger array once makes it O(n + m), and a \`Map\` of counts gives the multiset version where \`[1,1,1]\` is not a subset of \`[1]\`. Both were checked against brute force over 20,000 random pairs with zero mismatches, \`NaN\` was found by the \`Set\` version and missed by an \`indexOf\` version, and at n = 20,000 the \`Set\` approach took 3.5 ms against 318 ms for nested \`includes\`.`,
    examples: [
      {
        label: "Real, direct proof: set and multiset subset checks match brute force on 20,000 random pairs, NaN is handled, and a Set beats nested includes",
        tech: "javascript",
        runnable: true,
        code: `function isSubset(sub, sup) {
  const s = new Set(sup);
  return sub.every((x) => s.has(x));
}
function isSubMultiset(sub, sup) {
  const counts = new Map();
  for (const x of sup) counts.set(x, (counts.get(x) ?? 0) + 1);
  for (const x of sub) {
    const c = counts.get(x) ?? 0;
    if (c === 0) return false;
    counts.set(x, c - 1);
  }
  return true;
}

console.log("[1,2] in [3,2,1]:", isSubset([1, 2], [3, 2, 1]), "| [1,4] in [1,2,3]:", isSubset([1, 4], [1, 2, 3]));
console.log("empty is a subset of anything:", isSubset([], [1]), isSubset([], []));
console.log("[1,1,1] in [1]: set semantics", isSubset([1, 1, 1], [1]), "| multiset semantics", isSubMultiset([1, 1, 1], [1]));
console.log("NaN: Set version", isSubset([NaN], [1, NaN]), "| indexOf version", [NaN].every((x) => [1, NaN].indexOf(x) !== -1));
const o = { a: 1 };
console.log("objects compare by reference:", isSubset([o], [o]), isSubset([{ a: 1 }], [{ a: 1 }]));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2024);
let bad = 0;
for (let t = 0; t < 20000; t++) {
  const a = Array.from({ length: Math.floor(rnd() * 5) }, () => Math.floor(rnd() * 6));
  const b = Array.from({ length: Math.floor(rnd() * 8) }, () => Math.floor(rnd() * 6));
  if (isSubset(a, b) !== a.every((x) => b.includes(x))) bad++;
  const bc = {};
  for (const x of b) bc[x] = (bc[x] || 0) + 1;
  let ok = true;
  for (const x of a) { if (!bc[x]) { ok = false; break; } bc[x]--; }
  if (isSubMultiset(a, b) !== ok) bad++;
}
console.log("20,000 random pairs against brute force, mismatches:", bad);

const N = 20000;
const big = Array.from({ length: N }, (_, i) => i);
const sub = Array.from({ length: N }, (_, i) => N - 1 - i);
let t0 = Date.now();
sub.every((x) => big.includes(x));
const tIncludes = Date.now() - t0;
t0 = Date.now();
isSubset(sub, big);
const tSet = Date.now() - t0;
console.log("n = 20,000, nested includes:", tIncludes, "ms | Set version:", tSet, "ms | Set is faster:", tSet < tIncludes);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Find missing number",
    seoDescription:
      "Find missing number was verified three ways (sum, XOR, Set) exhaustively for n up to 60 and at n=1,000,000, with the sum and XOR limits shown.",
    description: `**Problem, as an interviewer would state it:**
"Given an array of \`n\` distinct numbers taken from \`0..n\`, exactly one number is missing. Find it. Discuss edge cases, runtime, and alternative approaches."

**Examples:**

\`\`\`
findMissing([3, 0, 1]); // 2
findMissing([0, 1]);    // 2
findMissing([1]);       // 0
\`\`\`

**Clarifying questions expected:**
- Is the input guaranteed to be distinct, in range, and missing exactly one value?
- Can I modify the array, and what space budget do I have?
- How large can \`n\` be (does the arithmetic stay exact)?

**Code / implementation expected:** Yes — real, direct proof of each approach, and of the input assumptions each one silently depends on.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** three O(n) approaches are compared, each verified exhaustively for every array size from 1 to 60 with every possible missing value (shuffled), plus n = 1,000,000. The interesting part is what each one silently assumes: the sum trick is exact only below a size limit and returns nonsense on duplicates; the XOR trick is a 32-bit operation.

## 1. The problem, restated

The array should contain every integer from \`0\` to \`n\` except one. Find the gap without sorting. The contract matters: distinct values, all in \`0..n\`, exactly one absent.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Guaranteed distinct and in range? | Both the sum and XOR tricks rely on it. Violate it and they return a wrong number with no error. |
| Extra space allowed? | A \`Set\` is O(n) space; sum and XOR are O(1). |
| Size of \`n\`? | The sum \`n(n+1)/2\` must stay below \`2^53\` to be exact; XOR works on 32-bit integers. |
| Mutable input? | Cyclic placement (swapping each value to its own index) finds it in place but destroys the order. |

## 3. Thought process

Brute force sorts the array and scans for the first index where \`arr[i] !== i\`: O(n log n). A \`Set\` of the values with a scan of \`0..n\` is O(n) time and O(n) space. To reach O(1) space, use an arithmetic identity. If nothing were missing, the total would be \`0 + 1 + ... + n = n(n+1)/2\`; the actual total is smaller by exactly the missing number, so the difference is the answer. XOR has the same shape without any magnitude: XOR every index \`0..n\` with every array value; equal pairs cancel (\`a ^ a = 0\`) and only the missing number survives.

## 4. Verified solution

\`\`\`js
const missingSum = (nums) => {
  const n = nums.length;
  return (n * (n + 1)) / 2 - nums.reduce((a, b) => a + b, 0);
};
const missingXor = (nums) => {
  let x = nums.length;
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
  return x;
};
const missingSet = (nums) => {
  const s = new Set(nums);
  for (let i = 0; i <= nums.length; i++) if (!s.has(i)) return i;
};
\`\`\`

\`\`\`
real, verified output:
  [3,0,1] -> 2, 2, 2 (sum, xor, set)      [0,1] -> 2      [1] -> 0      [0] -> 1

  exhaustive: every n from 1 to 60 and every possible missing value, shuffled: mismatches 0
  n = 1,000,000 with 777777 removed: sum 777777, xor 777777, set 777777

limits:
  sum: n(n+1)/2 is exact while it stays below 2^53 (9,007,199,254,740,992):
       n = 1e8 gives 5,000,000,050,000,000 (fine); n = 2e8 exceeds 2^53
  xor: operates on 32-bit integers: (2**31) ^ 0 is -2147483648
  duplicate input: missingSum([0,0,2]) returns 4 (not even a valid answer), with no error
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="sorting or a set finds the gap in linear or n log n time with extra work, while the sum identity and the xor cancellation find it in constant space because everything except the missing number cancels out">
  <defs>
    <marker id="missing-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Everything cancels except the gap</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">sort or Set, then scan</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">O(n log n) time or O(n) space</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">expected sum minus actual sum, or XOR</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">O(n) time, O(1) space</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">both tricks trust the input contract: distinct values, all in range, exactly one missing</text>
</svg>

## 5. Complexity

Sum and XOR: O(n) time, O(1) space. \`Set\`: O(n) time, O(n) space. Sorting: O(n log n) time.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Missing \`0\` (for example \`[1]\`) | \`0\` | The expected total still includes 0 |
| Missing \`n\` (for example \`[0,1]\`) | \`n\` (here 2) | The scan and the identities both cover \`0..n\` |
| Single element | \`0\` or \`1\` | Handled by the same formulas |
| Duplicates or out-of-range values | Wrong answer, no error | The identities assume the contract |
| \`n\` beyond about 1.3e8 | Sum loses exactness | \`n(n+1)/2\` passes \`2^53\` |
| \`n\` at or above \`2^31\` | XOR breaks | \`^\` is a 32-bit operation |

## 7. Common Pitfalls

- **Trusting the sum trick on untrusted input.** With duplicates it happily returns a number (4 for \`[0,0,2]\`) that is not even a valid answer.
- **Forgetting to include \`n\` itself.** The array has \`n\` items but the range has \`n + 1\` values; initialise XOR with \`nums.length\` and sum to \`n(n+1)/2\`.
- **Ignoring numeric limits.** The sum formula leaves the exactly representable integer range beyond about 1.3e8, and \`^\` truncates to 32 bits; both are silent.
- **Sorting when you do not have to.** It works but costs O(n log n), and the sorted-array version (binary search on \`arr[i] === i\`) only helps if the input is already sorted.
- **Assuming this is the "first missing positive" problem.** That is a harder variant (values unbounded, missing value unknown range) solved with in-place cyclic placement.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Distinct numbers from zero to n with exactly one missing, right? Any chance of duplicates, and how large can n get?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Sort and find the first index where the value differs from the index -- O(n log n)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"A Set gets O(n) time but O(n) space; the sum identity or XOR gets O(n) time and constant space."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Expected total is n times n plus one over two; subtract the actual total. Or XOR every index and value together and the pairs cancel."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Missing zero, missing n, a single element, and I will say what breaks if the input has duplicates."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does XOR find the missing number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two facts: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a = 0</code> and XOR is commutative and associative. XORing all of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n</code> with all array values pairs up every present number (cancelling to zero) and leaves the missing one unpaired.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers are missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One equation is no longer enough. Use the sum and the sum of squares to solve for both, or XOR to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, split the numbers by a set bit of that result, and XOR each group separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array is already sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search for the first index where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[i] !== i</code>: everything before the gap satisfies it and everything after does not, so the predicate is monotonic. That gives O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which of the three would you ship?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For trusted, modest-sized input, the sum: it is one readable line. For untrusted input, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> version, because it can be extended to detect duplicates and out-of-range values instead of returning nonsense.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **XOR cancellation** | Equal values XOR to zero, so paired numbers vanish |
| **Input contract** | The assumptions (distinct, in range, one missing) the tricks rely on |
| **Safe integer** | Integers up to 2^53 that a JavaScript number represents exactly |

---
**Conclusion:** the missing number is the difference between the expected total and the actual total, or, equivalently, whatever survives XORing all indices with all values. Both run in O(n) time and O(1) space and were verified against a \`Set\` reference for every size from 1 to 60 with every possible gap, plus n = 1,000,000. The limits were verified too: the sum is exact only below \`2^53\` (fine at 1e8, not at 2e8), XOR is a 32-bit operation, and duplicate input makes the sum trick return a meaningless number (4 for \`[0,0,2]\`) without any error.`,
    examples: [
      {
        label: "Real, direct proof: sum, XOR and Set agree exhaustively for every size and gap up to n = 60 and at one million, with the numeric limits shown",
        tech: "javascript",
        runnable: true,
        code: `const missingSum = (nums) => {
  const n = nums.length;
  return (n * (n + 1)) / 2 - nums.reduce((a, b) => a + b, 0);
};
const missingXor = (nums) => {
  let x = nums.length;
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
  return x;
};
const missingSet = (nums) => {
  const s = new Set(nums);
  for (let i = 0; i <= nums.length; i++) if (!s.has(i)) return i;
};

console.log("[3,0,1]:", missingSum([3, 0, 1]), missingXor([3, 0, 1]), missingSet([3, 0, 1]), "| [0,1]:", missingSum([0, 1]), "| [1]:", missingXor([1]), "| [0]:", missingSet([0]));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2024);
let bad = 0;
for (let n = 1; n <= 60; n++) {
  for (let missing = 0; missing <= n; missing++) {
    const arr = Array.from({ length: n + 1 }, (_, i) => i).filter((v) => v !== missing);
    arr.sort(() => rnd() - 0.5);
    if (missingSum(arr) !== missing || missingXor(arr) !== missing || missingSet(arr) !== missing) bad++;
  }
}
console.log("every n from 1 to 60 and every possible gap, mismatches:", bad);

const big = Array.from({ length: 1000001 }, (_, i) => i).filter((v) => v !== 777777);
console.log("n = 1,000,000 with 777777 removed:", missingSum(big), missingXor(big), missingSet(big));

console.log("sum limit, 2^53 =", 2 ** 53, "| n = 1e8 sum:", (1e8 * (1e8 + 1)) / 2, "| n = 2e8 exceeds 2^53:", (2e8 * (2e8 + 1)) / 2 > 2 ** 53);
console.log("xor is 32-bit, (2**31) ^ 0 =", 2 ** 31 ^ 0);
console.log("duplicates break the sum trick, missingSum([0,0,2]) =", missingSum([0, 0, 2]));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Merge sorted arrays",
    seoDescription:
      "Merging sorted arrays was verified against concat plus sort on 20,000 random pairs, plus tie stability, the in-place LeetCode 88 form and the sort() trap.",
    description: `**Problem, as an interviewer would state it:**
"Merge two sorted arrays into one sorted array. Discuss edge cases, runtime, and how you would do it in place."

**Examples:**

\`\`\`
merge([1, 3, 5], [2, 4, 6]); // [1, 2, 3, 4, 5, 6]
\`\`\`

**Clarifying questions expected:**
- Sorted ascending? Numbers, or objects sorted by a key?
- On ties, which element should come first (does stability matter)?
- May I allocate a new array, or must it happen in place (LeetCode 88, where the first array has spare room at the end)?

**Code / implementation expected:** Yes — real, direct proof against a reference, plus stability and the in-place variant.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the merge was checked against \`concat().sort()\` on 20,000 random pairs (0 mismatches). It also measures honestly: on two 500,000-item arrays the merge took 25 ms versus 47 ms for concat-and-sort, a real but modest gain, since the engine's sort is adaptive. The bigger wins are correctness details: JavaScript's default \`sort()\` is lexicographic, and using \`<\` instead of \`<=\` breaks tie order.

## 1. The problem, restated

Combine two already-sorted sequences into one sorted sequence. Because both inputs are sorted, the smallest remaining element is always at the front of one of them, so a single pass with two pointers suffices; no general sorting is needed.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Element type? | Numbers compare with \`<=\`; objects need a key function or comparator. |
| Ties and stability? | A stable merge takes from the first array on ties, so equal elements keep their original relative order. |
| New array or in place? | LeetCode 88 gives the first array trailing spare space and asks for an in-place merge. |
| Sizes? | If one array is far smaller, binary-search insertion or a k-way generalisation may be better. |

## 3. Thought process

Brute force concatenates and sorts: \`[...a, ...b].sort((x, y) => x - y)\`. It is correct and short, but it ignores that the inputs are already sorted and costs O(n log n) in general. The two-pointer merge keeps an index into each array, repeatedly appends the smaller front element and advances that pointer, then appends whatever remains of the other array: O(n + m) time. For the in-place version, merging from the front would overwrite elements not yet consumed, so merge from the BACK instead: the largest elements go into the spare space at the end, and the write pointer can never overtake the read pointer.

## 4. Verified solution

\`\`\`js
function merge(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}
function mergeInPlace(nums1, m, nums2, n) {   // nums1 has m values then n spare slots
  let i = m - 1, j = n - 1, k = m + n - 1;
  while (j >= 0) nums1[k--] = i >= 0 && nums1[i] > nums2[j] ? nums1[i--] : nums2[j--];
  return nums1;
}
\`\`\`

\`\`\`
real, verified output:
  merge([1,3,5],[2,4,6]) -> [1,2,3,4,5,6]     merge([1,2,3,4],[0]) -> [0,1,2,3,4]
  merge([],[1,2]) -> [1,2]     merge([],[]) -> []
  20,000 random sorted pairs (negatives, duplicates) vs concat+sort: mismatches 0

  default sort() is lexicographic: [1,3,5,2,10].sort() -> [1,10,2,3,5]  (correct merge gives [1,2,3,5,10])

  stability: A = [{1,a1},{2,a2}], B = [{1,b1},{2,b2}]
    <=  gives a1,b1,a2,b2 (a before b on ties)     <  gives b1,a1,b2,... (ties flip)

  in place: mergeInPlace([1,2,3,0,0,0],3,[2,5,6],3) -> [1,2,2,3,5,6]
            mergeInPlace([0],0,[1],1) -> [1]     mergeInPlace([1],1,[],0) -> [1]
            returns the same (mutated) array: true

  2 x 500,000 items: merge 25 ms vs concat+sort 47 ms
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="concatenating and sorting ignores that both inputs are already sorted, while a two pointer merge repeatedly takes the smaller front element in one pass, and merging from the back lets an in place merge write into spare space without overwriting unread values">
  <defs>
    <marker id="merge-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Use the fact that both inputs are already sorted</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">concat, then sort</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">ignores the existing order</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">two pointers, one pass</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">take the smaller front element</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">in place: fill from the back so the write pointer never overtakes the unread values</text>
</svg>

## 5. Complexity

Time: O(n + m). Space: O(n + m) for the new array, or O(1) extra for the in-place variant.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| One array empty | The other, copied | The tail loops append what is left |
| Both empty | \`[]\` | No loop runs |
| All of \`a\` before all of \`b\` | \`a\` then \`b\` | \`a\` drains first, \`b\` is the tail |
| Ties | Elements from \`a\` first with \`<=\` | Preserves stability |
| Strings or mixed types | Needs a consistent comparator | \`<=\` on mixed types is not a total order |
| Numbers sorted with default \`sort()\` | Wrong order | The default comparator is lexicographic |

## 7. Common Pitfalls

- **Calling \`.sort()\` with no comparator.** \`[1,3,5,2,10].sort()\` gives \`[1,10,2,3,5]\` (verified). Numbers need \`(a, b) => a - b\`.
- **Using \`<\` instead of \`<=\` for the take-from-\`a\` test.** Ties then take from \`b\` first, so a merge sort built on it is no longer stable (verified: \`b1,a1,b2\`).
- **Forgetting the leftover tails.** After one array runs out the other may still have elements; both tail loops are needed.
- **Merging in place from the front.** The write pointer overwrites values you have not read yet. Go from the back.
- **Expecting a dramatic speedup over \`concat().sort()\`.** Measured only about 2x (25 ms vs 47 ms), likely because V8's sort is adaptive and exploits existing sorted runs. Prefer the merge for clarity of intent and for the in-place case, not for a promised order-of-magnitude win.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Both sorted ascending; do ties need to stay stable, and may I allocate a new array or must it be in place?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Concatenate and sort with a numeric comparator -- correct, but it ignores that the inputs are sorted."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"The smallest remaining element is always at the front of one array, so two pointers give O(n plus m)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Take from a when a is less than or equal to b for stability, then drain whichever tail remains; in place, I fill from the back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"An empty side, one array entirely before the other, duplicates across both, and ties between objects."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you merge k sorted arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a min-heap of the current front element of each array (this bank's priority-queue question) and repeatedly pop the smallest, pushing that array's next element: O(N log k) for N total items. Alternatively merge pairwise in a tournament.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where is this the core of a real algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merge sort's combine step, external sorting of files too large for memory, and combining paginated, individually sorted API results into one ordered feed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does filling from the back make the in-place merge safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The write index starts at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 1</code>, past every existing value, and each step writes the largest remaining element. The write pointer only moves down as elements are consumed, so it can never land on a value that has not been read yet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you merge arrays of objects by a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept a key function and compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key(a[i]) &lt;= key(b[j])</code>; the algorithm is otherwise identical, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> keeps ties stable (verified with tagged objects).</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pointer merge** | Advance an index in each sorted array, always taking the smaller front |
| **Stable** | Equal elements keep their original relative order |
| **Adaptive sort** | A sort that runs faster when the input is already partly sorted |

---
**Conclusion:** because both inputs are sorted, a two-pointer merge builds the result in one O(n + m) pass, taking from the first array on ties to stay stable, and draining whichever tail remains. It matched \`concat().sort()\` on 20,000 random pairs, the in-place LeetCode 88 form works by filling from the back, and the measured gain over concat-and-sort was a modest 25 ms versus 47 ms at 2 x 500,000 items. The details that actually bite are the lexicographic default \`sort()\` and using \`<\` instead of \`<=\`.`,
    examples: [
      {
        label: "Real, direct proof: a two-pointer merge matches concat plus sort on random input, is stable on ties, and has an in-place form that fills from the back",
        tech: "javascript",
        runnable: true,
        code: `function merge(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}
function mergeInPlace(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;
  while (j >= 0) nums1[k--] = i >= 0 && nums1[i] > nums2[j] ? nums1[i--] : nums2[j--];
  return nums1;
}

console.log("basic:", JSON.stringify(merge([1, 3, 5], [2, 4, 6])), "| uneven:", JSON.stringify(merge([1, 2, 3, 4], [0])), "| empty side:", JSON.stringify(merge([], [1, 2])), JSON.stringify(merge([], [])));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2024);
let bad = 0;
for (let t = 0; t < 20000; t++) {
  const a = Array.from({ length: Math.floor(rnd() * 8) }, () => Math.floor(rnd() * 20) - 5).sort((x, y) => x - y);
  const b = Array.from({ length: Math.floor(rnd() * 8) }, () => Math.floor(rnd() * 20) - 5).sort((x, y) => x - y);
  if (JSON.stringify(merge(a, b)) !== JSON.stringify([...a, ...b].sort((x, y) => x - y))) bad++;
}
console.log("20,000 random pairs against concat + sort, mismatches:", bad);
console.log("default sort() is lexicographic:", JSON.stringify([1, 3, 5, 2, 10].sort()), "| correct merge:", JSON.stringify(merge([1, 3, 5], [2, 10])));

const A = [{ k: 1, s: "a1" }, { k: 2, s: "a2" }];
const B = [{ k: 1, s: "b1" }, { k: 2, s: "b2" }];
function mergeBy(a, b, key, orEqual) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const takeA = orEqual ? key(a[i]) <= key(b[j]) : key(a[i]) < key(b[j]);
    out.push(takeA ? a[i++] : b[j++]);
  }
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out.map((o) => o.s).join(",");
}
console.log("ties with <= (stable):", mergeBy(A, B, (o) => o.k, true), "| with < (ties flip):", mergeBy(A, B, (o) => o.k, false));

console.log("in place:", JSON.stringify(mergeInPlace([1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3)), "| nums1 empty:", JSON.stringify(mergeInPlace([0], 0, [1], 1)), "| nums2 empty:", JSON.stringify(mergeInPlace([1], 1, [], 0)));
const ref = [1, 2, 3, 0, 0, 0];
console.log("returns the same mutated array:", mergeInPlace(ref, 3, [2, 5, 6], 3) === ref);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Partition Array",
    seoDescription:
      "Partition was verified sync and async: order survives out-of-order predicates, and arr.filter(async fn) was shown to keep every element.",
    description: `**Problem, as an interviewer would state it:**
"Split an array into two lists: one with the elements that satisfy a predicate and one with those that do not. Support asynchronous predicates."

**Examples:**

\`\`\`
partition([1, 2, 3, 4, 5, 6], n => n % 2 === 0); // [[2, 4, 6], [1, 3, 5]]
await partitionAsync(users, u => isActive(u.id)); // [[active...], [inactive...]]
\`\`\`

**Clarifying questions expected:**
- Must the original order be preserved inside each group?
- For an async predicate, should the checks run in parallel or one at a time, and what happens if one rejects?
- Is it acceptable to call the predicate twice per element (for example by filtering twice)?

**Code / implementation expected:** Yes — real, direct proof for both versions, including the out-of-order-completion and rejection cases.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** two facts were measured rather than assumed. First, calling \`filter\` twice invokes the predicate 2n times against n for a real partition, which matters for costly or side-effecting predicates. Second, the async trap: \`[1,2,3].filter(async n => n > 5)\` keeps every element, because each callback returns a truthy promise.

## 1. The problem, restated

Walk the array once, sending each element to a "pass" list or a "fail" list based on a predicate, preserving order within each list. The async version must wait for the predicate results before deciding, without losing the order of the original array.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Order preserved? | Yes, within each group; both versions must keep the original relative order. |
| Predicate call count? | Two \`filter\` calls run it 2n times, doubling cost and duplicating side effects. |
| Parallel or sequential (async)? | Parallel is faster; sequential is gentler on a rate-limited service and keeps side effects ordered. |
| Failure behavior? | With \`Promise.all\`, the first rejection rejects the whole partition; decide whether that is right or whether to settle all and report. |

## 3. Thought process

Brute force is two filters: \`[arr.filter(p), arr.filter(x => !p(x))]\`. It reads well and calls \`p\` twice per element. A single loop that pushes each item to the right bucket calls it once. For async, the tempting move is \`arr.filter(async ...)\`, which is wrong: \`filter\` does not await, and an \`async\` callback returns a promise, which is always truthy, so nothing is removed. The correct shape separates the phases: first compute the array of verdicts (\`Promise.all(arr.map(predicate))\` in parallel, or a \`for\` loop with \`await\` for sequential), then run the same synchronous bucketing loop over the verdicts by index. Because \`Promise.all\` returns results in input order regardless of completion order, the original order is preserved automatically.

## 4. Verified solution

\`\`\`js
function partition(arr, predicate) {
  const pass = [], fail = [];
  arr.forEach((item, i) => (predicate(item, i, arr) ? pass : fail).push(item));
  return [pass, fail];
}
async function partitionAsync(arr, predicate, { sequential = false } = {}) {
  let results;
  if (sequential) {
    results = [];
    for (let i = 0; i < arr.length; i++) results.push(await predicate(arr[i], i, arr));
  } else {
    results = await Promise.all(arr.map((item, i) => predicate(item, i, arr)));
  }
  const pass = [], fail = [];
  arr.forEach((item, i) => (results[i] ? pass : fail).push(item));
  return [pass, fail];
}
\`\`\`

\`\`\`
real, verified output:
  sync:  partition([1,2,3,4,5,6], n => n % 2 === 0) -> [[2,4,6],[1,3,5]]
  order kept inside each group: partition([5,1,4,2,3], n => n > 2) -> [[5,4,3],[1,2]]
  empty input -> [[],[]]     all pass -> [[1,2],[]]
  truthy/falsy verdicts: partition([0,1,"","a",null], x => x) -> [[1,"a"],[0,"",null]]

  predicate calls for 3 items: partition 3, two filters 6

  async, predicates that resolve out of order (delays 90, 10, 60, 30, 5 ms):
    partitionAsync([1,2,3,4,5], n => n even) -> [[2,4],[1,3,5]]   order preserved
    sequential mode gives the same answer
    timing: parallel ~100 ms (about the slowest delay, 90) vs sequential ~240 ms (about the sum, 195)
  a rejecting predicate rejects the whole partition: "bad item 2"

  the trap: await [1,2,3].filter(async n => n > 5) -> [1,2,3]   (every promise is truthy)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="filtering twice calls the predicate twice per element, and filtering with an async callback keeps everything because promises are truthy, while computing all verdicts first and then bucketing by index calls it once and preserves order">
  <defs>
    <marker id="partition-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Get the verdicts first, then bucket by index</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">filter twice / filter(async)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">2n calls, or a truthy promise keeps all</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">verdicts array, then one loop</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">n calls, order kept by index</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Promise.all returns results in input order however the promises finish</text>
</svg>

## 5. Complexity

Time: O(n) plus the predicate cost; async parallel wall time is about the slowest single predicate, sequential about their sum. Space: O(n) for the two lists (and the verdicts array in async mode).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty array | \`[[], []]\` | Both lists start empty |
| All or none satisfy | One list holds everything | Bucketing is per element |
| Non-boolean verdicts | Treated as truthy or falsy | The ternary uses truthiness |
| Predicates finish out of order | Output order unchanged | \`Promise.all\` preserves input order and bucketing is by index |
| One async predicate rejects | The whole call rejects | \`Promise.all\` rejects on the first failure |
| \`async\` callback passed to \`filter\` | Nothing removed | Promises are truthy |

## 7. Common Pitfalls

- **\`arr.filter(async fn)\`.** It keeps every element (verified). \`filter\` never awaits; compute the verdicts first.
- **Filtering twice.** It doubles the predicate work and any side effects (6 calls versus 3 for three items).
- **Bucketing inside the async callbacks.** Pushing into the result lists as each promise resolves makes the order depend on completion time. Wait for all verdicts, then bucket by index.
- **Unbounded parallelism.** \`Promise.all(arr.map(...))\` fires every request at once; for a large array or a rate-limited API use a concurrency limit (this bank's \`mapLimit\` question) or the sequential mode.
- **Ignoring rejections.** Decide deliberately: fail fast with \`Promise.all\`, or use \`Promise.allSettled\` to partition the successes and report the failures.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Two lists, order preserved within each. For async, parallel or sequential, and what should happen if one check rejects?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Filter with the predicate and filter with its negation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"That calls the predicate twice per element, and filter with an async callback keeps everything because promises are truthy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"One loop for sync. For async I get all verdicts first with Promise.all, then run the same loop by index so order survives."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Make an earlier item resolve later than a later one and confirm the groups still keep input order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you limit the concurrency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all(arr.map(...))</code> step with this bank's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mapLimit</code> (which preserves input order and caps in-flight calls); the bucketing loop stays exactly the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you keep going when some predicates fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.allSettled</code> for the verdicts and return a third list of failures alongside the pass and fail lists, or treat a rejection as a fail with a logged error, depending on what the caller can tolerate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from groupBy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partition</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groupBy</code> with exactly two keys (true and false) returned as a fixed pair, which is why it is convenient for destructuring: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const [ok, bad] = partition(...)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you partition in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with a two-pointer swap (the partition step of quicksort) in O(1) extra space, but it does NOT preserve the original order inside each group. Choose based on whether order matters.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Partition** | Split into elements that satisfy a predicate and those that do not |
| **Verdict array** | The predicate results, computed first, then used to bucket by index |
| **Promise.all** | Waits for every promise and returns results in input order |

---
**Conclusion:** \`partition\` is one loop that sends each element to a pass or fail list, calling the predicate once per element (versus twice for two filters). The async version first computes every verdict (\`Promise.all\` in parallel or an awaiting loop in sequence) and then buckets by index, so the original order survives even when predicates finish out of order. Verified: order preserved with delays of 90, 10, 60, 30 and 5 ms, parallel about 100 ms versus sequential about 240 ms, a rejection rejects the whole call, and \`filter(async fn)\` keeps every element.`,
    examples: [
      {
        label: "Real, direct proof: sync and async partition preserve order, call the predicate once, and avoid the filter(async) trap that keeps every element",
        tech: "javascript",
        runnable: true,
        code: `function partition(arr, predicate) {
  const pass = [], fail = [];
  arr.forEach((item, i) => (predicate(item, i, arr) ? pass : fail).push(item));
  return [pass, fail];
}
async function partitionAsync(arr, predicate, { sequential = false } = {}) {
  let results;
  if (sequential) {
    results = [];
    for (let i = 0; i < arr.length; i++) results.push(await predicate(arr[i], i, arr));
  } else {
    results = await Promise.all(arr.map((item, i) => predicate(item, i, arr)));
  }
  const pass = [], fail = [];
  arr.forEach((item, i) => (results[i] ? pass : fail).push(item));
  return [pass, fail];
}
const sleep = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

(async () => {
  console.log("sync:", JSON.stringify(partition([1, 2, 3, 4, 5, 6], (n) => n % 2 === 0)));
  console.log("order kept inside each group:", JSON.stringify(partition([5, 1, 4, 2, 3], (n) => n > 2)));
  console.log("empty and all-pass:", JSON.stringify(partition([], () => true)), JSON.stringify(partition([1, 2], () => true)));

  let calls = 0;
  const counting = (n) => { calls++; return n > 1; };
  partition([1, 2, 3], counting);
  const once = calls;
  calls = 0;
  const arr3 = [1, 2, 3];
  arr3.filter(counting);
  arr3.filter((n) => !counting(n));
  console.log("predicate calls for 3 items: partition", once, "| two filters", calls);

  const delays = [90, 10, 60, 30, 5];
  const pred = (n, i) => sleep(delays[i], n % 2 === 0);
  let t0 = Date.now();
  const par = await partitionAsync([1, 2, 3, 4, 5], pred);
  const parMs = Date.now() - t0;
  console.log("parallel, order preserved although predicates resolve out of order:", JSON.stringify(par));
  t0 = Date.now();
  const seq = await partitionAsync([1, 2, 3, 4, 5], pred, { sequential: true });
  const seqMs = Date.now() - t0;
  console.log("sequential gives the same answer:", JSON.stringify(seq) === JSON.stringify(par), "| parallel ms:", parMs, "| sequential ms:", seqMs);

  try {
    await partitionAsync([1, 2, 3], async (n) => { if (n === 2) throw new Error("bad item " + n); return true; });
  } catch (e) {
    console.log("a rejecting predicate rejects the whole partition:", e.message);
  }
  console.log("the trap, filter with an async callback keeps everything:", JSON.stringify([1, 2, 3].filter(async (n) => n > 5)));
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Validate a Binary Search Tree",
    seoDescription:
      "BST validation with min/max bounds was verified against an O(n^2) oracle on 20,000 trees; a local parent-child check was shown to accept an invalid tree.",
    description: `**Problem, as an interviewer would state it:**
"Given the root of a binary tree, determine whether it is a valid binary search tree. Discuss edge cases, runtime, and alternative approaches."

**Examples:**

\`\`\`
    2            5
   / \\          / \\
  1   3        1   4      <- 4 is smaller than 5: invalid
                  / \\
                 3   6
\`\`\`

**Clarifying questions expected:**
- Are duplicate values allowed, and if so on which side?
- Does the tree need to satisfy the ordering for the WHOLE left and right subtrees, not just the immediate children?
- How deep can the tree be (recursion limits)?

**Code / implementation expected:** Yes — real, direct proof against an independent oracle, plus the tree that a naive check gets wrong.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the classic mistake is checking only parent against child. This doc verified the failing tree directly (\`[10,5,15,null,null,6,20]\`: the naive check says valid, wrongly), then checked two correct approaches against an independent O(n²) oracle on 20,000 random trees with zero mismatches. The recursion limit was measured too.

## 1. The problem, restated

A binary search tree requires that for EVERY node, all values in its left subtree are smaller and all values in its right subtree are larger (under a strict ordering here, so duplicates are invalid). It is a property of whole subtrees, not just of a node and its two children.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Duplicates? | Definitions differ. This solution uses strict ordering, so equal values are invalid; state whichever you choose. |
| Subtree or child check? | The requirement applies to the entire subtree; checking only children misses violations one level down. |
| Value range? | Do not use \`Number.MIN_VALUE\`-style sentinels; use \`null\` for "no bound" so any number, including \`-Infinity\`, works. |
| Depth? | A degenerate (linked-list-shaped) tree can overflow a recursive solution. |

## 3. Thought process

The first attempt compares each node with its direct children (\`left.val < node.val < right.val\`). It passes many trees and fails others: in \`[10,5,15,null,null,6,20]\`, the node \`15\` has a left child \`6\` that is smaller than \`15\`, so the local check is satisfied, yet \`6\` sits in the RIGHT subtree of \`10\` and is smaller than \`10\`, so the tree is invalid. The fix is to carry the constraint down: each node must lie strictly between a lower and an upper bound inherited from its ancestors. Going left tightens the upper bound to the current value; going right tightens the lower bound. An equivalent view: an in-order traversal of a valid BST visits values in strictly increasing order, so track the previous value and fail if the next one is not greater.

## 4. Verified solution

\`\`\`js
function isValidBST(root, lo = null, hi = null) {
  if (root === null) return true;
  if ((lo !== null && root.val <= lo) || (hi !== null && root.val >= hi)) return false;
  return isValidBST(root.left, lo, root.val) && isValidBST(root.right, root.val, hi);
}
function isValidBSTIterative(root) {          // in-order, explicit stack
  const stack = [];
  let cur = root, prev = null;
  while (cur !== null || stack.length) {
    while (cur !== null) { stack.push(cur); cur = cur.left; }
    cur = stack.pop();
    if (prev !== null && cur.val <= prev) return false;
    prev = cur.val;
    cur = cur.right;
  }
  return true;
}
\`\`\`

\`\`\`
real, verified output (node(val, left, right)):
  valid  2 with children 1 and 3           -> recursive true, iterative true
  null root -> true     single node -> true
  [5,1,4,null,null,3,6]  (4 is under 5 on the right but 4 < 5)   -> false, false; the naive local check also says false
  [10,5,15,null,null,6,20] (6 is right of 10 but 6 < 10)         -> false, false; the naive local check says TRUE (wrong)
  duplicates: node 2 with a left child 2, or a right child 2     -> false, false (strict ordering)
  extremes: 0 with -1 and 1, MIN_SAFE_INTEGER and MAX_SAFE_INTEGER, -Infinity and Infinity -> all true

  20,000 random trees (half built as real BSTs, half random shapes) vs an O(n^2) oracle
  ("every left-subtree value < node < every right-subtree value"):
    recursive mismatches 0, iterative mismatches 0 (13,139 of the 20,000 trees were valid)

  depth: a right-leaning chain 5000 deep is fine for the recursive version; at 20,000 it throws RangeError
         the iterative version validated a 100,000-deep chain
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="comparing a node only with its children misses violations deeper in the tree, while passing a lower and upper bound down from the ancestors checks every node against its whole ancestry, and an in-order walk must be strictly increasing">
  <defs>
    <marker id="bst-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">The rule applies to whole subtrees, not just children</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">check node against its children</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">accepts an invalid tree</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">carry (lo, hi) bounds down</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">left tightens hi, right tightens lo</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">equivalent: an in-order walk of a valid BST is strictly increasing</text>
</svg>

## 5. Complexity

Time: O(n) — each node is visited once. Space: O(h) for the recursion (or the explicit stack), where \`h\` is the tree height: O(log n) if balanced, O(n) if it degenerates into a chain.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty tree | \`true\` | There is nothing to violate |
| Single node | \`true\` | No constraints |
| Duplicate values | \`false\` under strict ordering | The comparison is \`<=\` / \`>=\` against the bound |
| Violation two levels below a node | \`false\` | The bound inherited from the ancestor catches it |
| \`-Infinity\` / \`Infinity\` or huge numbers | Handled | \`null\` means no bound, so no sentinel value is needed |
| Very deep chain | Recursive version may overflow | Verified \`RangeError\` at depth 20000 on this Node |

## 7. Common Pitfalls

- **Comparing only parent and child.** It accepts \`[10,5,15,null,null,6,20]\` (verified). The bound must come from ALL ancestors.
- **Using sentinel bounds like \`Number.MIN_VALUE\`.** \`Number.MIN_VALUE\` is the smallest POSITIVE number, not the most negative; and any finite sentinel breaks for legal extreme values. Use \`null\` (or \`-Infinity\`/\`Infinity\` carefully).
- **Using \`<\`/\`>\` where strictness is required.** Whether equal values are allowed is a definition; with \`>=\` bounds a duplicate slips through.
- **Collecting the in-order values and forgetting to check strictness.** The values must be strictly increasing, not just non-decreasing, when duplicates are invalid.
- **Trusting recursion on untrusted trees.** A 20,000-deep chain overflowed the stack here; use the iterative in-order version for adversarial or unbalanced input.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Every node must be greater than everything in its left subtree and smaller than everything in its right -- are duplicates invalid?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Compare each node to its children -- but that misses a violation deeper down, like a 6 in the right subtree of 10."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"The constraint comes from all ancestors, so I pass a lower and an upper bound down, or check the in-order walk is strictly increasing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Null for no bound, going left sets hi to the node value, going right sets lo; I also have an iterative in-order version for deep trees."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Empty tree, a duplicate, and the tree with 6 under 15 on the right of 10 that a child-only check accepts."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is an in-order traversal strictly increasing for a valid BST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In-order visits the left subtree, then the node, then the right subtree. In a BST everything on the left is smaller and everything on the right is larger, so the output is sorted by construction; conversely, any out-of-order pair proves a violation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you allow duplicates on one side?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pick a side by convention (say duplicates go right) and make exactly one of the two bound comparisons non-strict: for the "duplicates on the right" rule, accept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root.val === lo</code> but still reject <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root.val === hi</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you verify this beyond a few hand-drawn trees?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against an independent oracle that follows the definition literally (for every node, every left value smaller and every right value larger, O(n²)) over 20,000 seeded random trees, half built as genuine BSTs so many were valid. Both solutions agreed on every tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you repair an invalid BST instead of just detecting it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the well-known case of exactly two swapped nodes, run the in-order traversal, note the first and last positions where the sequence decreases, and swap those two values back. That is the "recover a binary search tree" problem.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **BST** | A binary tree where left subtree values are smaller and right subtree values are larger |
| **Bounds check** | Passing an allowed (lo, hi) range down to each node |
| **In-order traversal** | Left subtree, node, right subtree; sorted for a BST |

---
**Conclusion:** a node must satisfy the ordering against its entire ancestry, so a correct validator either carries \`(lo, hi)\` bounds down (with \`null\` meaning unbounded) or walks the tree in order requiring strictly increasing values. Both agreed with an independent O(n²) oracle on 20,000 random trees, the child-only check was shown to accept the invalid tree \`[10,5,15,null,null,6,20]\`, and the recursion limit was observed (5000 deep is fine, 20,000 throws \`RangeError\`) while the iterative version handled a 100,000-deep chain.`,
    examples: [
      {
        label: "Real, direct proof: bounds-based and in-order validators agree with an O(n^2) oracle on random trees, and a parent-child check is shown to accept an invalid tree",
        tech: "javascript",
        runnable: true,
        code: `const node = (val, left = null, right = null) => ({ val, left, right });

function isValidBST(root, lo = null, hi = null) {
  if (root === null) return true;
  if ((lo !== null && root.val <= lo) || (hi !== null && root.val >= hi)) return false;
  return isValidBST(root.left, lo, root.val) && isValidBST(root.right, root.val, hi);
}
function isValidBSTIterative(root) {
  const stack = [];
  let cur = root, prev = null;
  while (cur !== null || stack.length) {
    while (cur !== null) { stack.push(cur); cur = cur.left; }
    cur = stack.pop();
    if (prev !== null && cur.val <= prev) return false;
    prev = cur.val;
    cur = cur.right;
  }
  return true;
}
function naiveLocal(root) {
  if (root === null) return true;
  if (root.left && root.left.val >= root.val) return false;
  if (root.right && root.right.val <= root.val) return false;
  return naiveLocal(root.left) && naiveLocal(root.right);
}

const valid = node(2, node(1), node(3));
const invalidSimple = node(5, node(1), node(4, node(3), node(6)));
const invalidDeep = node(10, node(5), node(15, node(6), node(20)));
console.log("valid tree:", isValidBST(valid), isValidBSTIterative(valid), "| null:", isValidBST(null), "| single node:", isValidBST(node(7)));
console.log("[5,1,4,null,null,3,6]:", isValidBST(invalidSimple), isValidBSTIterative(invalidSimple), "| naive local check:", naiveLocal(invalidSimple));
console.log("[10,5,15,null,null,6,20]:", isValidBST(invalidDeep), isValidBSTIterative(invalidDeep), "| naive local check (WRONG):", naiveLocal(invalidDeep));
console.log("duplicates are invalid:", isValidBST(node(2, node(2), null)), isValidBST(node(2, null, node(2))));
console.log("extremes:", isValidBST(node(0, node(-1), node(1))), isValidBST(node(-Infinity, null, node(Infinity))));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(777);
function collect(n, out = []) { if (n) { collect(n.left, out); out.push(n.val); collect(n.right, out); } return out; }
function oracle(n) {
  if (!n) return true;
  return collect(n.left).every((x) => x < n.val) && collect(n.right).every((x) => x > n.val) && oracle(n.left) && oracle(n.right);
}
function randomTree(depth) { if (depth === 0 || rnd() < 0.25) return null; return node(Math.floor(rnd() * 12), randomTree(depth - 1), randomTree(depth - 1)); }
function bstInsert(root, v) {
  if (!root) return node(v);
  if (v < root.val) root.left = bstInsert(root.left, v); else if (v > root.val) root.right = bstInsert(root.right, v);
  return root;
}
let mismatches = 0, validCount = 0;
for (let t = 0; t < 20000; t++) {
  let tree = null;
  if (rnd() < 0.5) { const n = Math.floor(rnd() * 8); for (let i = 0; i < n; i++) tree = bstInsert(tree, Math.floor(rnd() * 12)); }
  else tree = randomTree(4);
  const expected = oracle(tree);
  if (expected) validCount++;
  if (isValidBST(tree) !== expected || isValidBSTIterative(tree) !== expected) mismatches++;
}
console.log("20,000 random trees against an O(n^2) oracle, mismatches:", mismatches, "| valid trees:", validCount);

function chain(n) { const root = node(0); let cur = root; for (let i = 1; i < n; i++) { cur.right = node(i); cur = cur.right; } return root; }
console.log("iterative version on a 100,000-deep chain:", isValidBSTIterative(chain(100000)));
try { isValidBST(chain(100000)); console.log("recursive version handled 100,000 deep"); } catch (e) { console.log("recursive version at 100,000 deep throws:", e.constructor.name); }`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Rotate array N times",
    seoDescription:
      "Array rotation was verified exhaustively for negative and oversized k; three in-place reversals stayed flat while one-step rotation grew linearly with k.",
    description: `**Problem, as an interviewer would state it:**
"Rotate an array to the right by \`k\` positions. Discuss edge cases (negative \`k\`, \`k\` larger than the length), runtime, and how to do it in place."

**Examples:**

\`\`\`
rotate([1, 2, 3, 4, 5, 6, 7], 3); // [5, 6, 7, 1, 2, 3, 4]
rotate([1, 2, 3, 4, 5], -2);      // [3, 4, 5, 1, 2]  (a negative k rotates left)
\`\`\`

**Clarifying questions expected:**
- Rotate right or left, and how should a negative \`k\` or a \`k\` larger than the length behave?
- May I return a new array, or must the rotation happen in place with O(1) extra space?
- What about an empty array?

**Code / implementation expected:** Yes — real, direct proof against an independent reference, and a measurement of why "rotate one step, k times" is the wrong approach.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** this question looks like a one-liner and hides two traps: JavaScript's remainder operator returns negative values and \`NaN\`, and the in-place solution is a non-obvious three-reversal trick. Both implementations were checked exhaustively (n = 0..9, k = −25..25, 0 mismatches), and the cost of the naive one-step approach was measured growing linearly with k while the reversal approach stayed flat.

## 1. The problem, restated

Shift every element \`k\` positions to the right, wrapping the last \`k\` elements around to the front. Rotating by the length (or a multiple of it) returns the original array, so only \`k mod n\` matters, and a negative \`k\` means rotating left.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Direction and negative \`k\`? | Define right as positive. A negative \`k\` then rotates left, which needs a normalised modulo. |
| \`k\` larger than \`n\`? | Reduce with modulo first; rotating by \`n + 2\` is rotating by \`2\`. |
| In place or a copy? | The slice version allocates O(n); the reversal version uses O(1) extra space and mutates. |
| Empty array? | \`k mod 0\` is \`NaN\` in JavaScript; return early. |

## 3. Thought process

Brute force rotates one step at a time, \`k\` times: \`arr.unshift(arr.pop())\`. Each step touches every element, so the total is O(n · k), and with a large \`k\` that is far worse than needed. First reduce \`k\` to \`r = ((k % n) + n) % n\`; the double modulo is needed because JavaScript's \`%\` keeps the sign of the dividend (\`-1 % 5\` is \`-1\`), so a plain \`k % n\` would leave a negative number. Then there are two O(n) options. The simple one slices: the last \`r\` elements followed by the first \`n - r\`. The in-place one is three reversals: reverse the whole array, then reverse the first \`r\` elements, then reverse the remaining \`n - r\`. Reversing everything puts the last \`r\` elements at the front but backwards, and the two partial reversals fix each block's order.

## 4. Verified solution

\`\`\`js
const norm = (k, n) => ((k % n) + n) % n;

function rotateSlice(arr, k) {                      // returns a new array
  const n = arr.length;
  if (n === 0) return [];
  const r = norm(k, n);
  return arr.slice(n - r).concat(arr.slice(0, n - r));
}
function reverse(a, i, j) { while (i < j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; } }
function rotateInPlace(arr, k) {                    // mutates, O(1) extra space
  const n = arr.length;
  if (n === 0) return arr;
  const r = norm(k, n);
  reverse(arr, 0, n - 1);
  reverse(arr, 0, r - 1);
  reverse(arr, r, n - 1);
  return arr;
}
\`\`\`

\`\`\`
real, verified output:
  rotate right by 3: [1,2,3,4,5,6,7] -> [5,6,7,1,2,3,4] (slice and in place agree)
  left by 2 (k = -2): [1,2,3,4,5] -> [3,4,5,1,2]
  k larger than the length (k = 12, n = 5, so 2): [4,5,1,2,3]
  k = n -> unchanged      k = 0 -> unchanged      empty -> []      one element with k = 100 -> [9]

  JS remainder pitfalls: -1 % 5 = -1     5 % 0 = NaN     norm(-1, 5) = 4

  exhaustive: n = 0..9 and k = -25..25 against an index-mapping reference (result[i] = a[(i - k) mod n]):
    slice mismatches 0, in-place mismatches 0

  in-place variant mutates and returns the same array; the slice variant leaves its input alone

  cost of "rotate one step, k times" (pop/unshift) vs three reversals, n = 100,000:
    k = 1,000    24.0 ms  vs  0.48 ms
    k = 5,000   107.7 ms  vs  0.65 ms
    k = 20,000  404.8 ms  vs  0.51 ms      (one-step grows with k; reversals do not)
  1,000,000 items, k = 333,333: slice/concat 5.1 ms, in-place reversals 2.7 ms
  (timings vary by machine and by how the code is run; the runnable example below measured 39, 194 and 754 ms for the
   one-step version at those k values. The growth with k versus the flat reversal cost is the point, not the exact numbers)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="rotating one step k times costs n times k, while reducing k modulo n and either slicing or reversing the whole array then each block costs a single linear pass, and reversing everything puts the last block in front but backwards so two more reversals fix it">
  <defs>
    <marker id="rotate-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Reduce k first, then do one linear pass</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">pop/unshift, k times</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">O(n * k), cost grows with k</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">reverse all, reverse r, reverse rest</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">O(n) time, O(1) extra space</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">r = ((k % n) + n) % n handles negative k, k above n, and avoids NaN only when n is not 0</text>
</svg>

## 5. Complexity

Slice version: O(n) time, O(n) extra space. Three reversals: O(n) time, O(1) extra space. Naive one-step rotation: O(n · k) time.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`k = 0\` or \`k\` a multiple of \`n\` | Unchanged | \`r\` is 0 |
| \`k > n\` | Same as \`k mod n\` | Normalised first |
| Negative \`k\` | Rotates left | The double modulo turns it into the equivalent right rotation |
| Empty array | Returned as is | \`k % 0\` is \`NaN\`, so return before computing it |
| One element | Unchanged | Any rotation of one element is itself |
| Need to keep the original | Use the slice version | The reversal version mutates |

## 7. Common Pitfalls

- **Using \`k % n\` on a negative \`k\`.** \`-1 % 5\` is \`-1\` in JavaScript, not \`4\`. Normalise with \`((k % n) + n) % n\` (verified).
- **Dividing by zero for an empty array.** \`5 % 0\` is \`NaN\`, and slicing or reversing with \`NaN\` indices silently misbehaves. Return early on \`n === 0\`.
- **Rotating one step at a time.** \`arr.unshift(arr.pop())\` in a loop costs O(n · k): 405 ms versus about 0.5 ms at k = 20,000 on 100,000 items (verified).
- **Skipping the modulo.** A \`k\` of 1,000,000 on a 5-element array should behave like \`k = 0\`, not perform a million steps.
- **Confusing left and right.** Slicing the last \`r\` elements to the front is a RIGHT rotation; for a left rotation swap the roles or negate \`k\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Rotate right by k; a negative k rotates left, k can exceed the length, and I should say up front whether I mutate."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Move the last element to the front, k times: O(n times k)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Only k mod n matters, and I can move every element straight to its final place in one pass."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Normalise k with a double modulo for negatives; slice the last r to the front, or in place reverse everything, then the first r, then the rest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Empty array, k equal to the length, a negative k, and k far larger than the length."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do three reversals produce a rotation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write the array as blocks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A B</code> where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B</code> is the last <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> items. Reversing everything gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B' A'</code> (each block reversed, order swapped). Reversing the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> and the rest separately restores each block to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B A</code>, which is the rotation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there another O(1)-space method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The cyclic-replacement (juggling) method moves each element straight to its destination index, following cycles of length <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n / gcd(n, r)</code>. It touches each element once but the cycle bookkeeping is easier to get wrong than the reversals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not rotate at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If you only need to READ the rotated view, keep an offset and index with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[(i + offset) % n]</code>; a ring buffer works the same way and makes each "rotation" O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the slice version copy the elements deeply?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: it builds a new array but the elements are the same values or object references, so a rotated array of objects still shares those objects with the original.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Rotation** | Shifting elements with wrap-around from one end to the other |
| **Normalised modulo** | ((k % n) + n) % n, always in 0..n-1 even for negative k |
| **In place** | Modifying the original array using only O(1) extra memory |

---
**Conclusion:** rotating \`k\` steps means moving each element straight to its final position in one pass, after reducing \`k\` with \`((k % n) + n) % n\` (needed because JavaScript's \`%\` returns negatives, and \`% 0\` is \`NaN\`). Slicing does it with O(n) extra space; reversing the whole array and then each of the two blocks does it in place. Both matched an index-mapping reference for every array length 0 to 9 and every \`k\` from −25 to 25, while a one-step-at-a-time rotation grew linearly with \`k\` (405 ms at k = 20,000 on 100,000 items) and the reversals stayed at about 0.5 ms.`,
    examples: [
      {
        label: "Real, direct proof: slice and in-place three-reversal rotations agree with an index-mapping reference for negative and oversized k, and one-step rotation grows with k",
        tech: "javascript",
        runnable: true,
        code: `const norm = (k, n) => ((k % n) + n) % n;

function rotateSlice(arr, k) {
  const n = arr.length;
  if (n === 0) return [];
  const r = norm(k, n);
  return arr.slice(n - r).concat(arr.slice(0, n - r));
}
function reverse(a, i, j) { while (i < j) { [a[i], a[j]] = [a[j], a[i]]; i++; j--; } }
function rotateInPlace(arr, k) {
  const n = arr.length;
  if (n === 0) return arr;
  const r = norm(k, n);
  reverse(arr, 0, n - 1);
  reverse(arr, 0, r - 1);
  reverse(arr, r, n - 1);
  return arr;
}

console.log("right by 3:", JSON.stringify(rotateSlice([1, 2, 3, 4, 5, 6, 7], 3)), JSON.stringify(rotateInPlace([1, 2, 3, 4, 5, 6, 7], 3)));
console.log("left by 2 (k = -2):", JSON.stringify(rotateInPlace([1, 2, 3, 4, 5], -2)));
console.log("k larger than the length (k = 12, n = 5):", JSON.stringify(rotateInPlace([1, 2, 3, 4, 5], 12)), "| k = n:", JSON.stringify(rotateInPlace([1, 2, 3], 3)));
console.log("empty and single element:", JSON.stringify(rotateInPlace([], 5)), JSON.stringify(rotateInPlace([9], 100)));
console.log("JS remainder pitfalls: -1 % 5 =", -1 % 5, "| 5 % 0 =", 5 % 0, "| norm(-1, 5) =", norm(-1, 5));

let bad = 0;
for (let n = 0; n <= 9; n++) {
  for (let k = -25; k <= 25; k++) {
    const a = Array.from({ length: n }, (_, i) => i);
    const expected = n === 0 ? [] : a.map((_, i) => a[(((i - k) % n) + n) % n]);
    if (JSON.stringify(rotateSlice(a, k)) !== JSON.stringify(expected) || JSON.stringify(rotateInPlace([...a], k)) !== JSON.stringify(expected)) bad++;
  }
}
console.log("n = 0..9, k = -25..25 against an index-mapping reference, mismatches:", bad);

const same = [1, 2, 3, 4];
console.log("in place returns the same array:", rotateInPlace(same, 1) === same, JSON.stringify(same));

const naiveShift = (arr, k) => { for (let i = 0; i < k; i++) arr.unshift(arr.pop()); return arr; };
const base = Array.from({ length: 100000 }, (_, i) => i);
for (const k of [1000, 5000, 20000]) {
  let t0 = Date.now();
  naiveShift(base.slice(), k);
  const slow = Date.now() - t0;
  t0 = Date.now();
  rotateInPlace(base.slice(), k);
  const fast = Date.now() - t0;
  console.log("n = 100,000, k = " + k + ": one-step pop/unshift", slow, "ms | three reversals", fast, "ms");
}`,
      },
    ],
  },
];

export default augments;
