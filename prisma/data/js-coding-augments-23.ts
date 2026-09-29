/**
 * Practical JS coding-interview content — batch 23 (DSA round, medium
 * tier — binary search, cycle detection, Fisher-Yates, LRU cache,
 * TimeLimitedCache, manual-iterator Range). See js-coding-augments-15
 * through -22.ts's headers for the template rationale and standing
 * gotchas. Titles were pulled from a live DB query; each was authored
 * against the description already stored on its row.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - Binary search: 20,000 seeded random trials against brute force
 *     (membership, lowerBound, upperBound) with zero mismatches; 19 steps
 *     to find a value among 1,000,000 sorted items; duplicates behavior
 *     (plain search returns SOME index, lowerBound/upperBound give the
 *     range); the unsorted-input and default-lexicographic-sort()
 *     pitfalls demonstrated; (2**31) >> 1 wraps because >> is int32.
 *   - Cycle detection: a shared reference (DAG) is NOT a cycle; a naive
 *     single seen-set was verified to report the DAG as cyclic (false
 *     positive); the ancestor-path approach agrees with JSON.stringify's
 *     own circular-structure verdict; the recursive version was verified
 *     to overflow the stack (RangeError) at depth 20000 on this Node
 *     while handling depth 5000.
 *   - Fisher-Yates: seeded PRNG so results are reproducible. Over
 *     600,000 shuffles of [1,2,3] the correct algorithm stays within
 *     ~1.6% of the expected count per permutation, while the off-by-one
 *     variant (j drawn from the whole array) and the
 *     sort(() => rand() - 0.5) shortcut are badly skewed. A chi-square
 *     test over 200 different seeds: Fisher-Yates exceeded the 5%
 *     critical value on 8/200 seeds (about 10 expected by chance) with
 *     mean 4.86 (about 5 expected); the other two failed 200/200.
 *   - LRU cache: the LeetCode 146 trace reproduced, update-refreshes-
 *     recency, capacity 1, and 10x more operations took 10.0x the time
 *     (consistent with O(1) per operation).
 *   - TimeLimitedCache: injectable clock for deterministic tests
 *     (boundary: expired when expiresAt <= now), lazy purge, a stored 0
 *     is not treated as missing, real-clock TTL check; a timer-based
 *     alternative was verified to (a) keep the process alive (~1600ms vs
 *     ~100ms with unref) and (b) delete a NEWER value early if the old
 *     timer is not cleared on overwrite.
 *   - Range: for...of, spread, Array.from, destructuring, negative
 *     step, empty range, re-iterability, infinite range with break,
 *     step 0 rejected, float drift (accumulating += 0.1 yields 11 items
 *     ending 0.9999999999999999, start + i*step yields 10), and iterator
 *     return() call counts measured per scenario in isolation.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Binary search implementation",
    seoDescription:
      "Binary search was verified against brute force over 20,000 random cases, with lowerBound/upperBound for duplicates and the unsorted-input pitfall shown.",
    description: `**Problem, as an interviewer would state it:**
"Implement binary search on a sorted array, returning the index of the target or \`-1\`. Discuss edge cases, runtime, and how you would handle duplicates."

**Examples:**

\`\`\`
binarySearch([1, 3, 5, 7, 9, 11], 7); // 3
binarySearch([1, 3, 5, 7], 4);        // -1
\`\`\`

**Clarifying questions expected:**
- Is the array guaranteed sorted, and in which order and by what comparison?
- If the target appears several times, which index should be returned — any, the first, or the last?
- Should I return \`-1\` on a miss, or the insertion point?

**Code / implementation expected:** Yes — real, direct proof against a brute-force reference, plus the duplicate-handling variants.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** binary search is famous for being easy to describe and easy to get subtly wrong (off-by-one, infinite loops, duplicates). So the code here was checked against a brute-force reference over 20,000 seeded random arrays, for membership, \`lowerBound\` and \`upperBound\`, with zero mismatches.

## 1. The problem, restated

Given a sorted array, find a target in O(log n) by repeatedly discarding half of the remaining range. The interesting parts are the loop invariant, what to return when there are duplicates, and the preconditions the algorithm silently depends on.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Is it actually sorted? | Binary search on unsorted data returns wrong answers without any error. |
| Sorted by what? | It must match the comparison used in the search. A default \`.sort()\` sorts numbers as strings. |
| Duplicates? | The plain version returns an arbitrary matching index. "First" or "count" needs \`lowerBound\`/\`upperBound\`. |
| Miss result? | \`-1\` is conventional; returning the insertion point (the lower bound) is more useful for inserts. |

## 3. Thought process

Brute force is a linear scan, O(n). The insight is that a sorted array lets one comparison eliminate half the candidates. Maintain an inclusive range \`[lo, hi]\` that is guaranteed to contain the target if it exists: compare the middle element, then move \`lo\` past it or \`hi\` before it. Because both moves EXCLUDE \`mid\`, the range strictly shrinks and the loop terminates. For duplicates, switch to a half-open range \`[lo, hi)\` and ask a different question: "what is the first index whose element is not less than the target?" (\`lowerBound\`). \`upperBound\` asks for the first index strictly greater. Their difference is the count.

## 4. Verified solution

\`\`\`js
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}
function lowerBound(arr, target) {   // first index with arr[i] >= target
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] < target) lo = mid + 1; else hi = mid;
  }
  return lo;
}
function upperBound(arr, target) {   // first index with arr[i] > target
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] <= target) lo = mid + 1; else hi = mid;
  }
  return lo;
}
\`\`\`

\`\`\`
real, verified output:
  binarySearch([1,3,5,7,9,11], 7) -> 3      binarySearch([1,3,5,7], 4) -> -1      binarySearch([], 1) -> -1
  first and last elements found: 0 and 2 for [2,4,6]

  20,000 seeded random arrays (0-11 items, negatives, duplicates) checked against Array methods:
    membership mismatches 0 | lowerBound wrong 0 | upperBound wrong 0

  duplicates [1,2,2,2,2,3], target 2:
    binarySearch -> 2 (an arbitrary matching index) | lowerBound 1 | upperBound 5 | count = 5 - 1 = 4

  1,000,000 sorted items: 19 comparisons to find a value (log2(1e6) is about 19.9)

  preconditions:
    unsorted [5,1,4,2,3] searching for 1 -> -1 (present, but not found)
    [10,9,1,100].sort() -> [1,10,100,9] (lexicographic), so searching for 9 -> -1
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a linear scan checks every element while binary search keeps a range that must contain the target and halves it each step, and lower bound and upper bound turn the same idea into first index and count for duplicates">
  <defs>
    <marker id="binsearch-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">One comparison halves the candidates</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">linear scan</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">up to n comparisons</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">binary search</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">19 comparisons for a million items</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">lowerBound and upperBound answer first index and count when values repeat</text>
</svg>

## 5. Complexity

Time: O(log n). Space: O(1) for the iterative version (a recursive version uses O(log n) stack).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty array | \`-1\` | \`hi = -1\`, so \`lo <= hi\` is false immediately |
| Target smaller than everything or larger than everything | \`-1\` (\`lowerBound\` gives 0 or \`length\`) | The range collapses without a match |
| Single element | Found or \`-1\` | One iteration covers it |
| Duplicates | Any index (plain), first or count (bounds) | The plain version stops at the first match it lands on |
| Unsorted input | Wrong answer, no error | The halving logic assumes order |
| Array of strings or objects | Needs a matching comparator | \`<\` on mixed types is not a total order |

## 7. Common Pitfalls

- **Off-by-one in the bounds.** Mixing the inclusive form (\`hi = length - 1\`, \`lo <= hi\`, \`hi = mid - 1\`) with the half-open form (\`hi = length\`, \`lo < hi\`, \`hi = mid\`) produces infinite loops or missed elements. Pick one form per function and stay consistent.
- **Forgetting that \`.sort()\` is lexicographic by default.** Sorting \`[10, 9, 1, 100]\` gives \`[1, 10, 100, 9]\`, and the search then fails (verified). Always pass \`(a, b) => a - b\`.
- **Assuming the midpoint formula matters in JavaScript.** \`lo + ((hi - lo) >> 1)\` comes from languages with fixed-width integers where \`lo + hi\` can overflow. In JS the numbers are doubles, so \`Math.floor((lo + hi) / 2)\` is equally valid; note that \`>>\` is a 32-bit signed operation (\`(2**31) >> 1\` is \`-1073741824\`), so it is not safe for enormous ranges.
- **Using it on unsorted or frequently changing data.** Sorting first costs O(n log n); for a one-off lookup a linear scan is faster. Binary search pays off when you search many times.
- **Returning any match when the caller needs the first.** Use \`lowerBound\` for "first occurrence" and for insertion points.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Sorted ascending? What should I return on a miss, and which index if the target repeats?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"A linear scan is O(n) and ignores that the array is sorted."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck and the insight:</strong> <span style="color:#f0e2c8;">"One comparison against the middle can discard half the range, giving O(log n)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"An inclusive range, move lo or hi past mid so it always shrinks; for duplicates I switch to a half-open lower bound."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Empty array, single element, first and last positions, a missing value, and repeated values."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the first and last position of a value that repeats?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first position is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lowerBound</code> (if that index holds the target) and the last is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upperBound - 1</code>. Verified on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1,2,2,2,2,3]</code>: 1 and 4, so 4 occurrences.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does binary search apply beyond arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Anywhere a yes/no predicate is monotonic: finding the first failing commit (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">git bisect</code>), the minimum capacity that satisfies a constraint, or the square root of a number, by searching the answer space instead of an array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recursive or iterative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterative: same O(log n) time with O(1) space and no call stack. The recursive form is fine for clarity, but the depth is only about log n, so the choice is style rather than necessity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use Array.prototype.indexOf or includes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are linear and work on unsorted data. If the data is already sorted and you search repeatedly, binary search is asymptotically better; that is the trade being tested. JavaScript has no built-in binary search, so you write it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Loop invariant** | A fact that stays true each iteration: the target, if present, is inside the range |
| **lowerBound** | First index whose element is not less than the target |
| **upperBound** | First index whose element is greater than the target |

---
**Conclusion:** binary search keeps a range that must contain the target and halves it each step, giving O(log n). Verified against a brute-force reference over 20,000 random arrays with no mismatches, 19 comparisons across a million items, and the duplicate case handled cleanly by \`lowerBound\` and \`upperBound\` (first index and count). The two silent failure modes, unsorted input and JavaScript's lexicographic default \`sort()\`, were both demonstrated returning \`-1\` for a value that is present.`,
    examples: [
      {
        label: "Real, direct proof: binary search matches a brute-force reference on random arrays, handles duplicates via lowerBound/upperBound, and fails on unsorted input",
        tech: "javascript",
        runnable: true,
        code: `function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}
function lowerBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] < target) lo = mid + 1; else hi = mid;
  }
  return lo;
}
function upperBound(arr, target) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] <= target) lo = mid + 1; else hi = mid;
  }
  return lo;
}

console.log("hit:", binarySearch([1, 3, 5, 7, 9, 11], 7), "| miss:", binarySearch([1, 3, 5, 7], 4), "| empty:", binarySearch([], 1));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(12345);
let bad = 0;
for (let t = 0; t < 20000; t++) {
  const n = Math.floor(rnd() * 12);
  const arr = Array.from({ length: n }, () => Math.floor(rnd() * 20) - 5).sort((a, b) => a - b);
  const target = Math.floor(rnd() * 24) - 7;
  const got = binarySearch(arr, target);
  if (arr.includes(target) ? arr[got] !== target : got !== -1) bad++;
  const lb = arr.findIndex((x) => x >= target);
  if (lowerBound(arr, target) !== (lb === -1 ? arr.length : lb)) bad++;
  const ub = arr.findIndex((x) => x > target);
  if (upperBound(arr, target) !== (ub === -1 ? arr.length : ub)) bad++;
}
console.log("20,000 random arrays checked against brute force, mismatches:", bad);

const dups = [1, 2, 2, 2, 2, 3];
console.log("duplicates: any index", binarySearch(dups, 2), "| lowerBound", lowerBound(dups, 2), "| upperBound", upperBound(dups, 2), "| count", upperBound(dups, 2) - lowerBound(dups, 2));
console.log("unsorted input, value present but not found:", binarySearch([5, 1, 4, 2, 3], 1));
console.log("default sort() is lexicographic:", JSON.stringify([10, 9, 1, 100].sort()), "-> search for 9:", binarySearch([10, 9, 1, 100].sort(), 9));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Detect a Circular Reference in Any Object or Array Graph",
    seoDescription:
      "A cycle detector was verified to treat a shared reference as not a cycle, where a naive seen-set gives a false positive, and to agree with JSON.stringify.",
    description: `**Problem, as an interviewer would state it:**
"Write a function \`isCyclic(obj)\` that detects circular references anywhere in an object or array graph."

**Examples:**

\`\`\`
const a = { name: "a" }; a.self = a;
isCyclic(a); // true
isCyclic({ x: { y: [1, 2] } }); // false
\`\`\`

**Clarifying questions expected:**
- Is the same object appearing twice (but not inside itself) a cycle?
- Which structures must be traversed — plain objects and arrays only, or also \`Map\`/\`Set\`?
- How deep can the structure be, and does recursion depth matter?

**Code / implementation expected:** Yes — real, direct proof of a self-reference, an indirect cycle, an array cycle, and the shared-reference case that must NOT be reported.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the whole question hinges on one distinction, verified directly: an object that is merely referenced twice is NOT a cycle. A naive single \`seen\` set reports it as one (a false positive, verified). The correct approach tracks only the objects on the CURRENT path from the root.

## 1. The problem, restated

Decide whether following references from the root can lead back to an object that is already being visited on the current path. A cycle needs a way back to an ancestor; an object shared by two siblings has no way back and is perfectly acyclic.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Shared reference vs cycle? | \`{ a: shared, b: shared }\` is a DAG, and \`JSON.stringify\` serializes it fine. Reporting it as circular is wrong. |
| Which containers? | Plain objects and arrays via \`Object.keys\`. \`Map\`/\`Set\` contents are not visited by this version; say so or extend it. |
| Depth? | A recursive walk can overflow the call stack on very deep structures; an iterative walk avoids it. |
| What counts as a reference? | Only non-null objects; primitives cannot form a cycle. |

## 3. Thought process

Brute force is \`try { JSON.stringify(x) } catch { return true }\`. It is a real, useful shortcut (and is the ground truth used to check this solution), but it only works for JSON-safe data, throws on other errors too, and gives no path. The direct approach is a depth-first walk. The obvious first attempt keeps one \`seen\` set and returns true on a repeat; that wrongly flags a shared node the second time it is reached via a different branch. The fix separates two sets: \`path\` holds the ancestors of the node currently being explored, and is cleaned up on the way out; a hit in \`path\` is a genuine cycle. A second set \`done\` records fully explored nodes so a shared subtree is not re-walked, keeping the total work linear.

## 4. Verified solution

\`\`\`js
function isCyclic(root) {
  const path = new WeakSet();   // ancestors of the node being visited
  const done = new WeakSet();   // fully explored nodes (no cycle below them)
  function visit(node) {
    if (node === null || typeof node !== "object") return false;
    if (path.has(node)) return true;
    if (done.has(node)) return false;
    path.add(node);
    for (const key of Object.keys(node)) if (visit(node[key])) return true;
    path.delete(node);
    done.add(node);
    return false;
  }
  return visit(root);
}
\`\`\`

\`\`\`
real, verified output:
  shared = {v:1};  dag = { a: shared, b: shared, c: [shared, shared] }
    isCyclic(dag)                       -> false   (a shared reference is not a cycle)
    naive single seen-set on the DAG    -> true    (false positive)
  self = {name:"x"}; self.me = self     -> true
  a -> b -> c -> a (indirect, 3 nodes)  -> true
  arr = [1,2]; arr.push(arr)            -> true
  plain nested object, 5, null          -> false, false, false

  agreement with JSON.stringify (throws "circular" for a cycle):
    self, a->b->c->a, arr -> throws    dag -> does not throw

  recursion limit on this Node: a chain nested 5000 deep is fine; at 20000 the recursive version throws RangeError
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a single seen set flags an object reached twice through different branches as a cycle, while tracking only the ancestors on the current path flags it only when a node reaches back to one of its own ancestors">
  <defs>
    <marker id="cyclic-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Seen before, or an ancestor right now?</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">one seen set</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a shared node is wrongly flagged</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">current-path set</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">only a path to an ancestor is a cycle</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">remove a node from the path on the way out; a second done set keeps the walk linear</text>
</svg>

## 5. Complexity

Time: O(V + E) — each node is fully explored once thanks to the \`done\` set. Space: O(V) for the sets plus O(d) recursion depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Self reference | \`true\` | The node is in \`path\` when its own property is visited |
| Indirect cycle (a to b to c to a) | \`true\` | \`a\` is still on the path when reached again |
| Cycle through an array | \`true\` | Arrays are walked with \`Object.keys\` like any object |
| Shared reference (DAG) | \`false\` | The first branch finishes and leaves \`path\` before the second reaches the node |
| Primitive, \`null\`, \`undefined\` | \`false\` | Only non-null objects are followed |
| \`Map\`/\`Set\` holding a cycle | Not detected by this version | Their entries are not own enumerable keys |
| Extremely deep, acyclic chain | May throw \`RangeError\` | Recursion depth (verified at 20000 on this Node) |

## 7. Common Pitfalls

- **Using a single \`seen\` set.** It flags every shared reference as circular, which is a false positive that breaks legitimate graphs (verified).
- **Never removing a node from \`path\`.** Then \`path\` behaves like \`seen\` and the same false positive returns. The delete on the way out is the whole trick.
- **Recursing without a guard.** A cycle otherwise recurses until the stack overflows.
- **Ignoring depth.** A very deep acyclic structure can overflow the stack even without a cycle; convert to an explicit stack if that matters (this bank's iterative-flatten question covers the technique).
- **Assuming \`JSON.stringify\` is a general detector.** It also throws for \`BigInt\` and custom \`toJSON\` failures, and it cannot tell you where the cycle is.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A shared reference is not a cycle, right? And plain objects and arrays only, or Map and Set too?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Try JSON.stringify and catch the circular error -- it works for JSON-safe data but gives no path and can throw for other reasons."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"A single seen set gives false positives on shared references, so I track the ancestors on the current path instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Add to the path on entry, remove on exit, and keep a done set so shared subtrees are not re-walked."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"A self reference, a three-node cycle, an array containing itself, and an object referenced twice that must come back false."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the path to the cycle instead of a boolean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Carry an array of keys down the recursion and, when a node is found already on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>, return the keys collected so far. That is exactly the error message quality you want in a serializer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why WeakSet instead of Set?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work for one call. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code> holds its members weakly, so nothing is kept alive after the function returns even if a set were accidentally retained; with a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> you would rely on it going out of scope.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it iterative to avoid stack overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an explicit stack of frames that hold the node and an iterator over its keys, pushing a child frame to descend and popping (and removing the node from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>) when its keys are exhausted. The recursion is replaced by the frame stack, so depth is limited by memory, not the call stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does cycle detection matter in real code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before serializing state (JSON, structured logging), before a deep clone or deep equal, and when walking user-supplied object graphs, where an unguarded recursion is a denial-of-service risk. This bank's deepClone and deepEqual questions both rely on the same idea.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle** | A reference chain that leads back to an object already on the current path |
| **DAG** | A graph with shared nodes but no cycles |
| **Ancestor path** | The chain of objects from the root down to the node being visited |

---
**Conclusion:** \`isCyclic\` walks the graph depth-first, keeping a \`path\` set of the current node's ancestors (added on entry, removed on exit) and a \`done\` set of fully explored nodes; only a hit in \`path\` is a real cycle. Verified directly: self references, an indirect three-node cycle and an array containing itself are detected, a shared reference is correctly NOT a cycle (where a naive single \`seen\` set was verified to say it is), the verdicts agree with \`JSON.stringify\`, and the recursive version's depth limit was observed (fine at 5000, \`RangeError\` at 20000 on this Node).`,
    examples: [
      {
        label: "Real, direct proof: cycles are detected, a shared reference is correctly not a cycle, and a naive single seen-set gives a false positive",
        tech: "javascript",
        runnable: true,
        code: `function isCyclic(root) {
  const path = new WeakSet();
  const done = new WeakSet();
  function visit(node) {
    if (node === null || typeof node !== "object") return false;
    if (path.has(node)) return true;
    if (done.has(node)) return false;
    path.add(node);
    for (const key of Object.keys(node)) if (visit(node[key])) return true;
    path.delete(node);
    done.add(node);
    return false;
  }
  return visit(root);
}

const shared = { v: 1 };
const dag = { a: shared, b: shared, c: [shared, shared] };
console.log("shared reference (a DAG) is not a cycle:", isCyclic(dag));

const self = { name: "x" };
self.me = self;
console.log("self reference:", isCyclic(self));

const a = { n: "a" }, b = { n: "b" }, c = { n: "c" };
a.next = b; b.next = c; c.next = a;
console.log("indirect 3-node cycle:", isCyclic(a));

const arr = [1, 2];
arr.push(arr);
console.log("array containing itself:", isCyclic(arr));
console.log("plain nested data, a primitive, null:", isCyclic({ x: { y: [1, { z: null }] } }), isCyclic(5), isCyclic(null));

function naiveIsCyclic(root) {
  const seen = new WeakSet();
  function v(n) {
    if (n === null || typeof n !== "object") return false;
    if (seen.has(n)) return true;
    seen.add(n);
    return Object.keys(n).some((k) => v(n[k]));
  }
  return v(root);
}
console.log("naive single seen-set on the DAG (false positive):", naiveIsCyclic(dag));

function jsonThrows(x) {
  try { JSON.stringify(x); return false; } catch (e) { return /circular/i.test(e.message); }
}
console.log("JSON.stringify agrees (self, cycle, array, DAG):", jsonThrows(self), jsonThrows(a), jsonThrows(arr), jsonThrows(dag));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement Fisher-Yates Shuffle (in-place, unbiased)",
    seoDescription:
      "Fisher-Yates was verified uniform over 200 seeds, while the sort(() => rand() - 0.5) shortcut and an off-by-one swap loop were measurably biased.",
    description: `**Problem, as an interviewer would state it:**
"Create \`shuffle(array)\` that returns a uniformly random permutation in O(n) without bias. Do not use \`sort\` with \`Math.random\`."

**Examples:**

\`\`\`
shuffle([1, 2, 3, 4, 5]); // e.g. [3, 1, 5, 2, 4], every ordering equally likely
\`\`\`

**Clarifying questions expected:**
- Must it shuffle in place, or return a new array?
- What does "unbiased" mean precisely — every one of the n! permutations equally likely?
- Does it need a seedable or injectable random source for testing?

**Code / implementation expected:** Yes — real, direct measurement of the output distribution for the correct algorithm AND for the two tempting wrong ones.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** "unbiased" is a claim about a distribution, so it was measured, not asserted. With a seeded PRNG (so the numbers are reproducible), 600,000 shuffles of \`[1,2,3]\` were counted per permutation for the correct algorithm and two plausible-looking wrong ones; a chi-square test was then repeated over 200 different seeds.

## 1. The problem, restated

Produce a permutation of the array where each of the n! orderings has probability exactly 1/n!, in O(n) time, mutating the input. Two shortcuts look right and are not: sorting with a random comparator, and swapping each element with a random index chosen from the whole array.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| In place? | Fisher-Yates is naturally in place; copy first (\`[...arr]\`) if the caller must not be mutated. |
| What is "unbiased"? | Each permutation is equally likely. This is testable by counting, which is exactly how to defend your answer. |
| Random source? | Injecting the random function makes the algorithm deterministic under test and lets you plug in a better generator. |
| Very large arrays? | The bound on quality is the generator: \`Math.random\` has a finite state, so it cannot reach every permutation of a very long array. |

## 3. Thought process

Brute force is \`arr.sort(() => Math.random() - 0.5)\`. It is short and wrong: a comparator must be consistent (the same pair must always compare the same way), and a random one violates that, so the result depends on the engine's sorting algorithm and is not uniform. The second tempting version loops \`i\` from the end and swaps with a random index over the WHOLE array; that produces \`n^n\` equally likely execution paths, which cannot divide evenly into \`n!\` permutations, so some orderings must be more likely than others. The correct algorithm picks \`j\` uniformly from \`0..i\` (the not-yet-fixed prefix) and swaps: there are exactly \`n * (n-1) * ... * 1 = n!\` equally likely paths, one per permutation. Once position \`i\` is filled it is never touched again.

## 4. Verified solution

\`\`\`js
function fisherYates(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));   // 0..i inclusive
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
\`\`\`

\`\`\`
real, verified output (seeded mulberry32, 600,000 shuffles of [1,2,3]; 100,000 per permutation expected):

  Fisher-Yates                     123:99950 132:99594 213:99994 231:99275 312:100829 321:100358   spread 1.6%
  off-by-one (j over whole array)  123:89179 132:110703 213:111060 231:89388 312:111073 321:88597  spread 22.5%
  sort(() => rand() - 0.5)         123:224933 132:37574 213:75185 231:37567 312:37310 321:187431   spread 187.6%
  (this Node/V8: "123" comes up 37.5% of the time and "321" 31.2%, versus 16.7% each if uniform)

chi-square over 200 different seeds (5 degrees of freedom; 5% critical value 11.07; a uniform shuffle exceeds it on
about 5% of seeds and averages about 5):
  Fisher-Yates   exceeded on 8/200 seeds, mean 4.86
  off-by-one     exceeded on 200/200 seeds, mean 748
  sort shuffle   exceeded on 200/200 seeds, mean 35,605

also verified: in place and the same array is returned; empty and one-element arrays unchanged;
all 24 permutations of 4 items are reachable

note: the runnable example below uses 60,000 shuffles (not 600,000) so it finishes quickly in the browser,
so its counts are about a tenth of the figures above and its spread percentages are a little noisier
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="swapping each position with a random index from the whole array yields n to the n equally likely paths that cannot divide evenly into n factorial permutations while choosing from the unfixed prefix yields exactly n factorial paths one per permutation">
  <defs>
    <marker id="fisheryates-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Count the equally likely paths</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">j from the whole array</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">n^n paths cannot split evenly into n!</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">j from 0..i only</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">exactly n! paths, one per permutation</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a fixed position is never touched again; a random comparator in sort breaks its own contract</text>
</svg>

## 5. Complexity

Time: O(n) — n - 1 swaps. Space: O(1) extra. (The sort shortcut is O(n log n) and biased.)

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty or single element | Returned unchanged | The loop body never runs |
| Two elements | Swapped with probability 1/2 | \`i = 1\`, \`j\` is 0 or 1 |
| Duplicate values | Fine | Permutes positions, not values |
| Caller must keep the original | Copy first | The function mutates in place |
| Very long arrays | Limited by the generator | A generator with a finite state cannot reach every permutation |
| Deterministic tests | Inject a seeded \`rand\` | The default \`Math.random\` is not seedable |

## 7. Common Pitfalls

- **\`sort(() => Math.random() - 0.5)\`.** The comparator is inconsistent, so the result depends on the sort algorithm. Verified on this Node: heavily skewed (one ordering came up 37.5% of the time), and it also does O(n log n) work.
- **Drawing \`j\` from the whole array each time.** It looks harmless and is measurably biased (22.5% spread here). The upper bound must be \`i + 1\`, not \`arr.length\`.
- **\`Math.floor(rand() * i)\` (excluding \`i\`).** That variant (Sattolo's algorithm) never leaves an element in place and only produces cyclic permutations. It is a valid but different algorithm.
- **Judging fairness from one run or one seed.** A correct shuffle exceeds the 5% chi-square threshold on about 5% of seeds (8/200 here); a single unlucky seed proves nothing. Judge by the distribution over many seeds.
- **Using it for security.** \`Math.random\` is not a cryptographic source; a card game or lottery needs \`crypto.getRandomValues\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Unbiased means all n factorial orderings equally likely, in place, in O(n) -- and I should be able to test that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"sort with a random comparator is the tempting one-liner."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"The comparator is inconsistent, so the result is engine-dependent and skewed, and it is O(n log n) anyway."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"From the end, pick j in zero to i inclusive and swap; the suffix is finished and never touched again."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Shuffle three items many times with a seeded generator and count each of the six permutations."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is an off-by-one in the random range enough to bias it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Counting: each swap step has a fixed number of equally likely outcomes, so the total number of paths is their product. That product is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n!</code> only when step <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> has exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code> outcomes. Any other product cannot be split evenly across n! permutations, so some must come up more often.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test a shuffle in a unit test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inject a seeded generator so the run is reproducible, shuffle a small array many times, count each permutation and compare against the expected frequency with a chi-square bound. For a plain regression test, assert that the output is a permutation of the input (same multiset), which is cheap and never flaky.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the sort shortcut produce the same bias in every browser?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and that is the point: the outcome depends on each engine's sorting algorithm. The numbers in this doc are from this Node (V8) only. It is unreliable everywhere and uniform nowhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pick a random sample of k items without shuffling everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run only the first k steps of Fisher-Yates from the front (partial shuffle), then take the first k items: O(k) time. For a stream of unknown length, use reservoir sampling.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unbiased shuffle** | Every one of the n! orderings has probability exactly 1/n! |
| **Chi-square test** | A statistic measuring how far observed counts are from expected counts |
| **Sattolo's algorithm** | The variant that excludes i, producing only single-cycle permutations |

---
**Conclusion:** Fisher-Yates walks from the end, swapping position \`i\` with a uniformly chosen index from \`0..i\`, giving exactly n! equally likely paths in O(n) with O(1) extra space. Measured with a seeded generator: over 600,000 shuffles of three items the correct version stayed within about 1.6% of the expected count per permutation, and across 200 seeds it exceeded the 5% chi-square threshold on 8 (about 10 expected by chance), while the whole-array swap loop and the \`sort(() => rand() - 0.5)\` shortcut failed on all 200.`,
    examples: [
      {
        label: "Real, direct proof: measured permutation counts for Fisher-Yates, the whole-array swap loop and the sort shortcut, using a seeded generator so the numbers reproduce",
        tech: "javascript",
        runnable: true,
        code: `function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function fisherYates(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function wholeArraySwap(arr, rand) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const j = Math.floor(rand() * arr.length);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function sortShuffle(arr, rand) { return arr.sort(() => rand() - 0.5); }

const RUNS = 60000;
function distribution(shuffleFn, seed) {
  const rand = mulberry32(seed);
  const counts = {};
  for (let i = 0; i < RUNS; i++) {
    const key = shuffleFn([1, 2, 3], rand).join("");
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
}
function spread(dist) {
  const v = Object.values(dist);
  return ((Math.max(...v) - Math.min(...v)) / (RUNS / 6) * 100).toFixed(1) + "%";
}

console.log("expected per permutation if uniform:", RUNS / 6);
for (const [name, fn] of [["Fisher-Yates", fisherYates], ["whole-array swap", wholeArraySwap], ["sort(() => rand() - 0.5)", sortShuffle]]) {
  const d = distribution(fn, 1);
  console.log(name + ":", JSON.stringify(d), "| spread", spread(d));
}

const a = [1, 2, 3, 4, 5];
console.log("in place, same array returned:", fisherYates(a, mulberry32(9)) === a);
const seen4 = new Set();
const r = mulberry32(3);
for (let i = 0; i < 20000; i++) seen4.add(fisherYates([1, 2, 3, 4], r).join(""));
console.log("distinct permutations reached for 4 items (4! = 24):", seen4.size);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement LRU Cache (get/put with O(1))",
    seoDescription:
      "An LRU cache built on Map insertion order was verified against the LeetCode trace and scaled linearly, showing O(1) get and put without a linked list.",
    description: `**Problem, as an interviewer would state it:**
"Design an LRU cache with \`get(key)\` and \`put(key, value)\` in O(1). Evict the least recently used entry when capacity is exceeded. Use a \`Map\` or a doubly linked list."

**Examples:**

\`\`\`
const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
c.get(1);    // 1
c.put(3, 3); // evicts key 2
c.get(2);    // not found
\`\`\`

**Clarifying questions expected:**
- Does a \`get\` count as a "use" that refreshes recency, and does \`put\` on an existing key too?
- What should \`get\` return for a missing key?
- What if \`capacity\` is zero or invalid?

**Code / implementation expected:** Yes — real, direct proof of the eviction order, recency refresh on both operations, and the O(1) scaling.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the classic answer is a hash map plus a doubly linked list. In JavaScript a plain \`Map\` already remembers insertion order, so the whole structure collapses to one \`Map\`: "delete then set" moves a key to the newest position, and the first key in iteration order is the least recently used. The LeetCode trace was reproduced, and 10x more operations were verified to take 10.0x the time.

## 1. The problem, restated

A bounded cache that, when full, discards the entry that was used longest ago. Every \`get\` and every \`put\` must both find an entry and reorder the recency list, which is why O(1) requires combining a hash lookup with an order structure that supports cheap "move to front" and "remove oldest".

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| What counts as a use? | Both reads and writes refresh recency. A \`put\` on an existing key must also refresh it. |
| Missing key result? | LeetCode uses \`-1\`; \`undefined\` is more natural in JS but cannot be told apart from a stored \`undefined\` without \`has()\`. |
| Invalid capacity? | Reject zero or negative up front. |
| Concurrency or TTL? | Out of scope here; TTL is the next question in this bank. |

## 3. Thought process

Brute force is an array of entries ordered by recency: lookup is O(n) and moving an item is O(n). Using a hash map for lookup fixes the search but not the reordering; keeping the order in an array still costs O(n) per move. The textbook fix is a doubly linked list, which can splice a node out and reinsert it at the head in O(1) given a pointer to it, with the map storing that pointer. JavaScript offers a shortcut: a \`Map\` iterates in insertion order and \`delete\` plus \`set\` re-inserts at the end, so the newest entry is always last and \`map.keys().next().value\` is the oldest. That gives the same complexity with about a dozen lines and no node bookkeeping.

## 4. Verified solution

\`\`\`js
class LRUCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer");
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);          // move to the newest position
    return value;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);   // evict the oldest
  }
}
\`\`\`

\`\`\`
real, verified output:
  LeetCode 146 trace, capacity 2:
    put(1,1) put(2,2) get(1) -> 1
    put(3,3)  -> evicts 2, so get(2) -> undefined
    put(4,4)  -> evicts 1, so get(1) -> undefined, get(3) -> 3, get(4) -> 4
    order oldest to newest: [3,4]

  put("a",1) put("b",2) put("a",10) put("c",3), capacity 2:
    order ["a","c"]  (updating "a" refreshed it, so "b" was evicted) and get("a") -> 10
  capacity 1: put x, put y -> get("x") undefined, get("y") 2
  capacity 0 -> RangeError
  delete then set moves a key to the newest position: [a,b,c] -> [b,c,a]

  scaling (capacity 1000): 200,000 operations 76.2 ms, 2,000,000 operations 761.7 ms -> ratio 10.0
  (10x the work took 10x the time, consistent with O(1) per operation)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="an array ordered by recency costs linear time to find and move an entry, a hash map plus doubly linked list gives constant time but needs node bookkeeping, and a JavaScript Map already keeps insertion order so delete then set moves a key to the newest position and the first key is the oldest">
  <defs>
    <marker id="lru-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Lookup and reorder must both be O(1)</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">map + doubly linked list</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">O(1), but manual node splicing</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">a single JavaScript Map</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">delete + set = move to newest</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the first key in iteration order is always the least recently used entry</text>
</svg>

## 5. Complexity

Time: O(1) average for \`get\` and \`put\` (hash operations plus constant reordering). Space: O(capacity).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`put\` on an existing key | Value updated and the key becomes newest | The old entry is deleted before re-insertion |
| \`get\` on a missing key | \`undefined\` | Nothing to refresh |
| Capacity 1 | Every new key evicts the previous one | \`size > capacity\` triggers each time |
| A stored value of \`undefined\` | \`get\` returns \`undefined\`; only \`has()\` distinguishes it | The return value cannot separate "absent" from "stored undefined" |
| Capacity 0 or non-integer | \`RangeError\` | Validated in the constructor |
| Non-string keys | Supported | \`Map\` keys keep their type |

## 7. Common Pitfalls

- **Forgetting to refresh recency on \`get\`.** Then it is a FIFO cache, not LRU.
- **Setting an existing key without deleting first.** \`map.set\` on an existing key updates the value but keeps its OLD position, so a hot key stays "old" and is evicted early. The delete-then-set is the entire mechanism.
- **Evicting before inserting.** Insert first, then evict the oldest if over capacity; otherwise a \`put\` on an existing key can evict an unrelated entry.
- **Using a plain object as the store.** Object key order is not insertion order for integer-like keys, and inherited names collide. Use a \`Map\`.
- **Assuming the Map trick is O(1) in every runtime.** It relies on the engine's ordered hash table; the measured linear scaling here holds for this Node. State the assumption if asked.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Both get and put count as a use and refresh recency, correct? And what should get return for a missing key?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"An array ordered by recency: O(n) to find and O(n) to move."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"I need O(1) lookup and O(1) reorder: the textbook answer is a map plus a doubly linked list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"In JavaScript a Map keeps insertion order, so delete-then-set moves a key to newest and the first key is the oldest; that replaces the linked list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Updating an existing key must refresh it, and capacity one must evict on every new key."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the interviewer bans the Map ordering trick, what do you write?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from key to a node in a hand-built doubly linked list, with sentinel head and tail nodes so insertion and removal never need null checks. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> unlinks the node and relinks it after the head; eviction removes the node before the tail and deletes its key from the map.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from an LFU cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">LRU evicts by how recently something was used; LFU evicts by how often. LFU needs frequency buckets and a tie-break, which is why this bank treats it as a separate, harder question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a TTL to entries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ value, expiresAt }</code> and treat an expired entry as missing in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, deleting it there. The next question in this bank builds exactly that expiry logic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where is an LRU cache used in front-end code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Memoizing expensive computations with bounded memory (this bank's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memoize</code> question has a max-size option), caching fetched pages or images, and holding a bounded list of recently rendered items.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LRU** | Least Recently Used: evict the entry unused for the longest time |
| **Insertion order** | A Map iterates keys in the order they were added |
| **Sentinel node** | A dummy head/tail node in a linked list that removes edge cases |

---
**Conclusion:** an LRU cache needs O(1) lookup and O(1) reordering. In JavaScript a single \`Map\` provides both: \`get\` deletes and re-sets the key to make it newest, \`put\` does the same after removing any old copy, and when the size exceeds the capacity the first key in iteration order (the oldest) is deleted. The LeetCode trace matched exactly, an update refreshed recency (so the other key was evicted), capacity 1 evicted on every new key, and ten times the operations took 10.0 times as long, consistent with O(1) per operation.`,
    examples: [
      {
        label: "Real, direct proof: an LRU cache on Map insertion order reproduces the LeetCode trace, refreshes recency on update, and evicts the oldest entry",
        tech: "javascript",
        runnable: true,
        code: `class LRUCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer");
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);
  }
  keys() { return [...this.map.keys()]; }
}

const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2);
console.log("get(1):", c.get(1));
c.put(3, 3);
console.log("after put(3) evicts key 2, get(2):", c.get(2));
c.put(4, 4);
console.log("after put(4) evicts key 1, get(1):", c.get(1), "| get(3):", c.get(3), "| get(4):", c.get(4));
console.log("order oldest to newest:", JSON.stringify(c.keys()));

const d = new LRUCache(2);
d.put("a", 1); d.put("b", 2); d.put("a", 10); d.put("c", 3);
console.log("updating a refreshed it, so b was evicted:", JSON.stringify(d.keys()), "| a =", d.get("a"));

const one = new LRUCache(1);
one.put("x", 1); one.put("y", 2);
console.log("capacity 1:", one.get("x"), one.get("y"));

try { new LRUCache(0); } catch (e) { console.log("capacity 0 rejected:", e.constructor.name); }

const m = new Map([["a", 1], ["b", 2], ["c", 3]]);
m.delete("a"); m.set("a", 1);
console.log("delete then set moves a key to newest:", JSON.stringify([...m.keys()]));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement TimeLimitedCache (LeetCode 2622) with expiry",
    seoDescription:
      "A TimeLimitedCache with an injectable clock verified at the expiry boundary; a timer-per-entry design was shown to leak process lifetime and clobber data.",
    description: `**Problem, as an interviewer would state it:**
"Design a cache where \`set(key, value, duration)\` stores a value that expires after \`duration\` milliseconds. \`set\` returns \`true\` if an un-expired entry for that key already existed, otherwise \`false\`."

**Examples:**

\`\`\`
cache.set(1, 42, 100); // false (new key)
cache.set(1, 50, 50);  // true  (an unexpired entry existed; value and TTL overwritten)
cache.get(1);          // 50
\`\`\`

**Clarifying questions expected:**
- What should \`get\` return for a missing or expired key?
- Does overwriting reset the expiry, and is it the NEW duration that applies?
- Should there be a way to count the currently valid keys?

**Code / implementation expected:** Yes — real, direct proof of the expiry boundary, the overwrite return value, and cleanup, ideally testable without real waiting.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the version here stores an \`expiresAt\` timestamp and checks it lazily, with an injectable clock so every edge case is tested deterministically. The obvious alternative, one \`setTimeout\` per entry, was also tested and shown to have two real defects: it keeps the Node process alive, and if the old timer is not cleared on overwrite it deletes the NEWER value early.

## 1. The problem, restated

A key-value store where every entry carries its own lifetime. Reads must never return an expired value, \`set\` must report whether it replaced a live entry, and the store should not grow without bound.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Miss and expired result? | LeetCode 2622 specifies \`-1\`; state the convention so a stored \`-1\` is not confused with a miss. |
| Exact expiry boundary? | Decide whether an entry is valid AT \`expiresAt\`. This solution treats \`expiresAt <= now\` as expired, matching "expires after duration". |
| Overwrite semantics? | The new value AND the new duration replace the old ones; the return value reflects whether the OLD entry was still alive. |
| Count of live keys? | \`count()\` must ignore expired entries, so it needs to purge or filter. |

## 3. Thought process

There are two ways to make an entry disappear. Eager expiry schedules a \`setTimeout\` per entry that deletes it. It is intuitive and has hidden costs: every pending timer keeps the event loop (and in Node, the process) alive until it fires, and an overwrite must cancel the previous timer or the stale timer will delete the new value. Lazy expiry stores \`expiresAt = now + duration\` and simply compares against the clock whenever the entry is read; no timers, nothing to cancel. Expired entries that are never read would linger, so \`get\` deletes what it finds expired and \`count()\` sweeps. Injecting the clock (\`now = Date.now\`) turns time into a plain function, which makes boundaries testable without sleeping.

## 4. Verified solution

\`\`\`js
class TimeLimitedCache {
  constructor(now = Date.now) { this.now = now; this.store = new Map(); }
  set(key, value, duration) {
    const existing = this.store.get(key);
    const alive = existing !== undefined && existing.expiresAt > this.now();
    this.store.set(key, { value, expiresAt: this.now() + duration });
    return alive;
  }
  get(key) {
    const e = this.store.get(key);
    if (e === undefined) return -1;
    if (e.expiresAt <= this.now()) { this.store.delete(key); return -1; }
    return e.value;
  }
  count() {
    const t = this.now();
    let n = 0;
    for (const [k, e] of this.store) { if (e.expiresAt <= t) this.store.delete(k); else n++; }
    return n;
  }
}
\`\`\`

\`\`\`
real, verified output (fake clock: clock = 0 unless stated):
  set(1, 42, 100)       -> false      (new key)
  set(1, 50, 50)        -> true       (unexpired entry existed; expiresAt is now 50)
  get(1) -> 50, count() -> 1
  clock = 40   get(1) -> 50           (still alive)
  clock = 50   get(1) -> -1, count() -> 0     (exactly at expiresAt is expired)
  set(1, 9, 10)         -> false      (the old entry had expired)
  clock = 1000: count() -> 0 and the internal store size is 0 (expired entries purged)
  a stored value of 0 is returned (0), not treated as missing
  real clock: set with a 60 ms TTL -> get "v" immediately, -1 after waiting 90 ms

timer-based alternative:
  a Node child process with one pending 1500 ms timer ran about 1600 ms; with unref() it exited in about 100 ms
  overwrite bug: set("k","first",50) then set("k","second",300), read at 120 ms:
    no clearTimeout on overwrite -> get("k") is -1 (the FIRST timer deleted the NEW value)
    clearTimeout on overwrite    -> get("k") is "second"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="scheduling one timer per entry keeps the process alive and needs cancelling on overwrite, while storing an expiry timestamp and checking it on read needs no timers and can be tested with an injected clock">
  <defs>
    <marker id="ttlcache-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Eager timers vs lazy expiry</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">a setTimeout per entry</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">keeps the process alive, must be cancelled</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">store expiresAt, check on read</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">no timers, testable with a fake clock</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">get deletes what it finds expired and count sweeps, so unread entries are still reclaimed</text>
</svg>

## 5. Complexity

Time: O(1) for \`set\` and \`get\`; O(n) for \`count()\` (it sweeps the store). Space: O(n) entries, with expired ones reclaimed on read or count.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Read exactly at \`expiresAt\` | Expired (\`-1\`) | The check is \`expiresAt <= now\` |
| Overwrite an unexpired key | \`true\`, value AND duration replaced | \`alive\` is computed before the write |
| Overwrite an expired key | \`false\` | The old entry is not alive |
| Stored value \`0\`, \`false\` or \`""\` | Returned normally | Only \`undefined\` from the map means missing |
| Duration of \`0\` | Immediately expired | \`expiresAt\` equals the current time |
| Entries never read again | Removed by the next \`count()\` sweep | Otherwise they would linger until then |

## 7. Common Pitfalls

- **Using \`setTimeout\` per entry without clearing it on overwrite.** The stale timer deletes the newer value early (verified: the value was gone at 120 ms though its TTL was 300 ms).
- **Forgetting the process stays alive.** A pending timer holds a Node process open (about 1600 ms versus 100 ms with \`unref()\`). Call \`timer.unref()\` in a server or a test, or use lazy expiry.
- **Testing with real sleeps.** Slow and flaky. Inject the clock so a test just changes a number.
- **Treating a falsy value as a miss.** Checking \`if (!entry.value)\` returns \`-1\` for a legitimately stored \`0\`. Test the entry object, not its value.
- **Never sweeping.** Lazy expiry alone leaves unread expired entries in memory forever; sweep in \`count()\` or on a periodic cleanup.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"What does get return for a miss, what happens exactly at the expiry moment, and does an overwrite reset the duration?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"A setTimeout per entry that deletes it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Timers keep the process alive and must be cancelled on overwrite, otherwise an old timer deletes the new value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Store expiresAt, compare on read, delete what I find expired, and inject the clock so it is testable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Advance the fake clock to just before, exactly at, and after expiry, and overwrite a live and an expired key."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Date.now a safe clock for this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date.now</code> follows the system wall clock, which can jump (NTP correction, manual change), making entries expire early or late. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> is monotonic and safer for durations. Because the clock is injectable here, swapping it is one argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid the O(n) count()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a min-heap ordered by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expiresAt</code> and pop expired entries lazily, so each entry is removed once and the live count is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">store.size</code> after the pop loop. Because overwrites make heap entries stale, verify each popped entry still matches the store before deleting it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would the timer-based design actually be right?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need a callback at the moment of expiry (releasing a resource, notifying a listener), not just correct reads. Then use it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clearTimeout</code> on overwrite and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unref()</code> where the process must be able to exit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you combine this with a size limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Layer it on the LRU cache from this bank: store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ value, expiresAt }</code> as the LRU value and treat an expired entry as a miss on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>. Capacity handles memory; expiry handles staleness.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lazy expiry** | Check an entry's deadline when it is read instead of scheduling removal |
| **Injectable clock** | Passing the time source in so tests can control it |
| **unref()** | Lets a Node process exit even though the timer is still pending |

---
**Conclusion:** store each entry with an \`expiresAt\` and compare it with the clock on read, deleting what is found expired and sweeping in \`count()\`; inject the clock so every boundary is testable without sleeping. Verified with a fake clock: a new key returns \`false\`, overwriting a live key returns \`true\` and replaces the value and the duration, an entry is expired exactly at its \`expiresAt\`, and a stored \`0\` is returned rather than treated as missing. The timer-per-entry alternative was verified to keep a process alive (about 1600 ms versus 100 ms with \`unref()\`) and, without \`clearTimeout\` on overwrite, to delete the newer value early.`,
    examples: [
      {
        label: "Real, direct proof: a TimeLimitedCache with an injectable clock behaves correctly at the expiry boundary, on overwrite, and when purging expired entries",
        tech: "javascript",
        runnable: true,
        code: `class TimeLimitedCache {
  constructor(now = Date.now) { this.now = now; this.store = new Map(); }
  set(key, value, duration) {
    const existing = this.store.get(key);
    const alive = existing !== undefined && existing.expiresAt > this.now();
    this.store.set(key, { value, expiresAt: this.now() + duration });
    return alive;
  }
  get(key) {
    const e = this.store.get(key);
    if (e === undefined) return -1;
    if (e.expiresAt <= this.now()) { this.store.delete(key); return -1; }
    return e.value;
  }
  count() {
    const t = this.now();
    let n = 0;
    for (const [k, e] of this.store) { if (e.expiresAt <= t) this.store.delete(k); else n++; }
    return n;
  }
}

let clock = 0;
const cache = new TimeLimitedCache(() => clock);
console.log("set a new key returns false:", cache.set(1, 42, 100));
console.log("set the same key while alive returns true:", cache.set(1, 50, 50));
console.log("get returns the latest value:", cache.get(1), "| count:", cache.count());
clock = 40;
console.log("t=40, still alive:", cache.get(1));
clock = 50;
console.log("t=50, exactly at expiry is expired:", cache.get(1), "| count:", cache.count());
console.log("after expiry set returns false again:", cache.set(1, 9, 10));
clock = 1000;
console.log("expired entries are purged by count():", cache.count(), "| store size:", cache.store.size);

const zero = new TimeLimitedCache(() => clock);
zero.set("z", 0, 10);
console.log("a stored 0 is returned, not treated as missing:", zero.get("z"));

const real = new TimeLimitedCache();
real.set("r", "v", 60);
const before = real.get("r");
setTimeout(() => console.log("real clock, 60 ms TTL: before", before, "| after 90 ms:", real.get("r")), 90);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Range Class Using the Iterator Protocol Manually (No Generator Functions Allowed)",
    seoDescription:
      "A generator-free Range verified with for...of, spread, destructuring, an infinite range, and measured iterator return() calls per scenario.",
    description: `**Problem, as an interviewer would state it:**
"Implement a \`Range\` class that can be used in \`for...of\`, spread and destructuring, by implementing the iterator protocol by hand. No generator functions."

**Examples:**

\`\`\`
[...new Range(0, 10, 3)];               // [0, 3, 6, 9]
for (const x of new Range(5, 0, -2)) {} // 5, 3, 1
\`\`\`

**Clarifying questions expected:**
- Is the end exclusive, and are negative steps supported?
- Should a range be iterable more than once, and should it support an infinite end?
- What should happen for a step of zero, and what about fractional steps?

**Code / implementation expected:** Yes — real, direct proof the object works with every consumer of the iterable protocol, including early exit.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the iterator protocol is small, and the details are where the questions come from. Beyond the basics, this doc measures when the engine calls an iterator's optional \`return()\` method, one call per scenario in isolation, and shows why computing values as \`start + i * step\` matters: accumulating \`+= 0.1\` yields an extra bogus element.

## 1. The problem, restated

Make an object iterable by giving it a \`[Symbol.iterator]()\` method that returns an iterator: an object with a \`next()\` method returning \`{ value, done }\`. Everything that consumes iterables (\`for...of\`, spread, \`Array.from\`, destructuring, \`new Set\`, \`Math.max(...x)\`) then works with it.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| End inclusive? | Exclusive matches \`Array.prototype.slice\` and most range conventions, and makes empty ranges natural. |
| Iterable many times? | The class should return a NEW iterator each time, so two loops do not share position. |
| Infinite end? | \`Infinity\` as the end is a lazy infinite sequence; it must be consumed with an early exit. |
| Zero or fractional step? | Step 0 never terminates; fractional steps accumulate floating point error unless computed by multiplication. |

## 3. Thought process

A generator would be one line, which is exactly why the constraint exists: the point is to show the protocol. The class stores \`start\`, \`end\` and \`step\`. Its \`[Symbol.iterator]()\` creates a fresh counter \`i\` and returns an iterator whose \`next()\` computes \`start + i * step\`, reports \`done\` when that value has passed the end (direction depends on the sign of the step), and otherwise increments \`i\`. Multiplying instead of repeatedly adding avoids accumulated rounding error. Two optional refinements make it a well-behaved iterator: the iterator is itself iterable (\`[Symbol.iterator]() { return this }\`, as built-in iterators are), and it defines \`return()\`, which the engine calls when a consumer stops early, giving the iterator a chance to clean up.

## 4. Verified solution

\`\`\`js
class Range {
  constructor(start, end, step = 1) {
    if (step === 0 || !Number.isFinite(step)) throw new RangeError("step must be a non-zero finite number");
    this.start = start; this.end = end; this.step = step;
  }
  [Symbol.iterator]() {
    const { start, end, step } = this;
    let i = 0;
    return {
      next: () => {
        const value = start + i * step;
        if (step > 0 ? value >= end : value <= end) return { value: undefined, done: true };
        i++;
        return { value, done: false };
      },
      return: () => ({ value: undefined, done: true }),   // called on early exit
      [Symbol.iterator]() { return this; },
    };
  }
}
\`\`\`

\`\`\`
real, verified output:
  for...of new Range(0,5)             -> [0,1,2,3,4]
  spread new Range(0,10,3)            -> [0,3,6,9]
  Array.from(new Range(1,4), x => x*x)-> [1,4,9]
  const [first, second] = new Range(10,20) -> 10, 11
  negative step new Range(5,0,-2)     -> [5,3,1]
  empty ranges Range(3,3) and Range(5,1) -> [] and []
  iterating the same Range twice      -> [0,1,2] and [0,1,2]   (a fresh iterator each time)
  infinite new Range(0, Infinity) with a break at 5 -> [0,1,2,3,4]
  Math.max(...new Range(1,6)) -> 5     new Set(new Range(0,4)).size -> 4
  matches a generator-based reference implementation for Range(2,20,4)
  step 0 -> RangeError

  float drift, Range(0, 1, 0.1):
    accumulating  v += 0.1 while (v < 1)  -> 11 items, the last is 0.9999999999999999
    start + i * step (this class)          -> 10 items, the last is 0.9

  iterator return() calls, each scenario measured on its own (counter reset first):
    for...of with an early break                       1
    destructuring only the first value                 1
    destructuring two values                           1
    destructuring exactly as many values as exist      1
    for...of that throws inside the loop body          1
    running to completion (spread)                     0
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="an iterable returns a fresh iterator each time whose next method yields value and done pairs, and when a consumer stops early the engine calls the optional return method, while running to completion never calls it">
  <defs>
    <marker id="rangeiter-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Iterable, iterator, and the early-exit hook</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">Symbol.iterator returns a fresh iterator</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">next() gives value and done</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">consumer stops early</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">engine calls return(), never on completion</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">compute start + i * step so fractional steps do not accumulate rounding error</text>
</svg>

## 5. Complexity

Time: O(1) per \`next()\`, so O(k) to consume \`k\` items. Space: O(1) — no array is built, which is what lets an infinite range exist.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`start >= end\` with a positive step | Empty | The first value already fails the bound |
| Negative step | Counts down and stops before \`end\` | The comparison direction follows the step's sign |
| Step of \`0\` or non-finite | \`RangeError\` | It would never terminate |
| \`end = Infinity\` | Infinite lazy sequence | No array is materialised |
| Fractional step | No extra element from rounding | Values are computed by multiplication |
| Iterated twice | Same output both times | Each \`[Symbol.iterator]()\` call creates a new counter |
| Consumer stops early | \`return()\` called once | Break, throw in the loop body, or partial destructuring |

## 7. Common Pitfalls

- **Keeping the counter on the class instead of in the iterator.** Then a second loop, or a nested loop over the same range, continues from where the first stopped. State belongs to the iterator.
- **Returning \`{ done: true }\` but forgetting \`value: undefined\`.** Works, but be consistent: the protocol is a \`{ value, done }\` result.
- **Accumulating fractional steps.** \`v += 0.1\` produced an extra element ending in \`0.9999999999999999\` (verified); \`start + i * step\` did not.
- **Spreading or \`Array.from\` on an infinite range.** It never finishes and exhausts memory. Consume it lazily with \`for...of\` and a \`break\`.
- **Assuming \`return()\` is called on normal completion.** It is not (0 calls when the loop ran to the end); it is for early exit only. Also note that destructuring calls it even when you take exactly as many values as exist, because the engine cannot tell the iterator is finished without another \`next()\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"End exclusive, negative steps allowed, iterable more than once, and what should a step of zero do?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Build an array of all the numbers -- fine for small ranges, wasteful for big ones and impossible for infinite."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Materialising wastes memory, so implement the iterator protocol and produce values lazily."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Symbol.iterator returns a fresh counter closure; next computes start plus i times step and reports done past the end; I also add return and make the iterator iterable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Iterate twice, count down, use an infinite end with a break, and use a fractional step."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between an iterable and an iterator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An iterable has a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Symbol.iterator]()</code> method that returns an iterator; an iterator has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code> is an iterable that can be looped repeatedly; the objects it returns are one-shot iterators. Making the iterator return itself from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Symbol.iterator]()</code> means it is also iterable, like built-in iterators.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the interviewer ban generators?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A generator is sugar that builds exactly this object for you (verified: the hand-written version matched a generator reference). The ban checks that you know what is underneath: the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ value, done }</code> result shape, fresh state per iteration, and the optional <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return()</code> hook.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add lazy map and filter to it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the source iterator in another iterator whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> pulls from the source and applies the function, so nothing is computed until consumed. This bank's lazy-evaluator question builds exactly that pipeline.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is return() actually for in real code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Releasing resources when a consumer walks away early: closing a file handle or database cursor, or unsubscribing a listener, that an iterator opened. For a pure counter like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Range</code> it is optional, but it demonstrates the protocol.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Iterable** | An object with a Symbol.iterator method |
| **Iterator** | An object with next() returning { value, done } |
| **return()** | Optional hook the engine calls when a consumer stops early |

---
**Conclusion:** a \`Range\` becomes usable everywhere iterables are accepted by implementing \`[Symbol.iterator]()\`, returning a fresh iterator whose \`next()\` computes \`start + i * step\` and reports \`{ done: true }\` past the end. Verified with \`for...of\`, spread, \`Array.from\`, destructuring, \`Set\` and \`Math.max\`, a negative step, empty ranges, repeated iteration, and an infinite range consumed with a \`break\`. It matched a generator-based reference, rejected a zero step, avoided the floating-point extra element that accumulation produces, and \`return()\` was measured as called once on every early exit and never on normal completion.`,
    examples: [
      {
        label: "Real, direct proof: a hand-written iterator Range works with every consumer, supports an infinite end, avoids float drift, and reports exactly when return() is called",
        tech: "javascript",
        runnable: true,
        code: `class Range {
  constructor(start, end, step = 1) {
    if (step === 0 || !Number.isFinite(step)) throw new RangeError("step must be a non-zero finite number");
    this.start = start; this.end = end; this.step = step;
  }
  [Symbol.iterator]() {
    const { start, end, step } = this;
    let i = 0;
    return {
      next: () => {
        const value = start + i * step;
        if (step > 0 ? value >= end : value <= end) return { value: undefined, done: true };
        i++;
        return { value, done: false };
      },
      return: () => { Range.returnCalls++; return { value: undefined, done: true }; },
      [Symbol.iterator]() { return this; },
    };
  }
}
Range.returnCalls = 0;

const collect = (iterable) => { const out = []; for (const x of iterable) out.push(x); return JSON.stringify(out); };
console.log("for...of:", collect(new Range(0, 5)));
console.log("spread:", JSON.stringify([...new Range(0, 10, 3)]));
console.log("Array.from with a map function:", JSON.stringify(Array.from(new Range(1, 4), (x) => x * x)));
console.log("negative step:", JSON.stringify([...new Range(5, 0, -2)]), "| empty:", JSON.stringify([...new Range(3, 3)]));
const r = new Range(0, 3);
console.log("iterated twice:", JSON.stringify([...r]), JSON.stringify([...r]));
console.log("Math.max(...range):", Math.max(...new Range(1, 6)), "| new Set(range).size:", new Set(new Range(0, 4)).size);

const taken = [];
for (const x of new Range(0, Infinity)) { if (x >= 5) break; taken.push(x); }
console.log("infinite range with a break:", JSON.stringify(taken));
try { new Range(0, 5, 0); } catch (e) { console.log("step 0 rejected:", e.constructor.name); }

const acc = [];
let v = 0;
while (v < 1) { acc.push(v); v += 0.1; }
const mul = [...new Range(0, 1, 0.1)];
console.log("accumulating += 0.1:", acc.length, "items, last", acc[acc.length - 1], "| start + i * step:", mul.length, "items, last", mul[mul.length - 1]);

function measure(label, fn) { Range.returnCalls = 0; fn(); console.log(label.padEnd(44), "return() calls:", Range.returnCalls); }
measure("for...of with an early break", () => { for (const x of new Range(0, Infinity)) { if (x >= 5) break; } });
measure("destructuring only the first value", () => { const [a] = new Range(0, 100); });
measure("destructuring exactly as many as exist", () => { const [a, b, c] = new Range(0, 3); });
measure("for...of that throws in the body", () => { try { for (const x of new Range(0, 10)) throw new Error("boom"); } catch (e) {} });
measure("running to completion (spread)", () => { [...new Range(0, 3)]; });`,
      },
    ],
  },
];

export default augments;
