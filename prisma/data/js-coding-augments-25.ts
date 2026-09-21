/**
 * Practical JS coding-interview content — batch 25 (DSA round, hard tier
 * — sparse-array merge, N-array intersection, iterative flatten, graph
 * DFS, queue via two stacks). See js-coding-augments-15 through -24.ts's
 * headers for the template rationale and standing gotchas. Titles were
 * pulled from a live DB query. Four of the five rows only had a generic
 * "Implement the scenario utility" description, so each doc states its
 * own explicit spec.
 *
 * Fact-checked via real, direct execution before writing anything (Node
 * v24.19.0; all timings are machine- and engine-specific):
 *   - Sparse merge: probed which traversals really skip holes. forEach and
 *     an index loop are fine at 1e6/1e7 but took ~7.1 s / ~7.6 s at length
 *     1e8; at 1e9 forEach was still running after 94 s (index loop after 15 s); Object.keys and for...in
 *     took 0 ms even at length 4,294,967,290. Merge verified against a
 *     dense every-index reference on 20,000 random sparse pairs (16,670
 *     with holes), 0 mismatches; explicit undefined is a present value;
 *     spread and Array.from densify holes, slice/concat/map keep them;
 *     merging arrays of length 4e9 and 3e9 (2 entries each) took ~0.1 ms.
 *   - N-array intersection: 20,000 random inputs (incl. NaN) vs brute
 *     force, 0 mismatches; the count-occurrences bug demonstrated;
 *     median-of-9 timings after warm-up: a Set built per array was
 *     insensitive to ordering (~154 vs ~143 ms) while scanning each array
 *     against the shrinking candidate set was 110 ms tiny-last vs 44 ms
 *     smallest-first; the final smallest-first version with results in
 *     the original first array's order runs ~29 ms regardless of argument
 *     order, with 0.00 ms early exit.
 *   - Iterative flatten: 20,000 random nested arrays with holes vs native
 *     flat(Infinity) and a recursive version, 0 mismatches; cycles throw a
 *     TypeError (native flat throws RangeError from stack overflow);
 *     shared arrays flatten each time; native flat(Infinity) and the
 *     recursive version both threw RangeError at depth 10,000 while the
 *     iterative version handled 1,000,000.
 *   - Graph DFS: recursive vs iterative (mark on pop, push neighbours in
 *     reverse) identical on 20,000 random graphs; marking on push visits
 *     the same set but a different ORDER on 5,767 of them; recursion
 *     overflows at 20,000 nodes, iterative handled 1,000,000.
 *   - Queue via two stacks: 2,000 random operation sequences vs an array
 *     queue, 0 mismatches; total element moves equalled the enqueue
 *     count (1.00 per dequeue); worst single dequeue moved 100,000
 *     elements and the next moved 0; transferring into a non-empty outbox
 *     was shown to break FIFO; Array.shift() draining hit a cliff (5.3 ms
 *     at 10,000 but 841 ms at 20,000, 4.2 s at 40,000, 7.7 s at 50,000,
 *     146.7 s at 200,000) against <= 20 ms for the two-stack queue.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Efficiently Merge Two Sparse Arrays (With Holes) Without Iterating Every Index",
    seoDescription:
      "Merge sparse arrays visiting only present indices: forEach took 7.1 s at length 1e8 while Object.keys took 0 ms; 20,000 random pairs matched a dense one.",
    description: `**Problem, as an interviewer would state it:**
"Merge two sparse arrays (arrays with holes) so that the cost depends on how many elements are actually present, not on the array length. Discuss edge cases, runtime, and alternatives."

**Examples:**

\`\`\`
a = [ , "a1", , , "a4", ]     // length 6, holes at 0, 2, 3, 5
b = [ , "b1", "b2" ]          // length 3
merge(a, b) -> [ , "b1", "b2", , "a4", ]   // length 6; b wins where it has a value
\`\`\`

**Clarifying questions expected:**
- When both arrays have a value at an index, which wins? (This solution: \`b\` overrides \`a\`.)
- Should holes stay holes in the result, and how long should the result be?
- Is an explicit \`undefined\` a real value or the same as a hole?

**Code / implementation expected:** Yes — real, direct proof against a dense reference, and a measurement of which traversals genuinely avoid walking every index.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the title's promise ("without iterating every index") is easy to get wrong, so the traversal options were measured. On this Node, \`forEach\` and an index loop were fine at length 10 million but took about 7 seconds at 100 million, and at a billion neither finished in the time allowed (\`forEach\` was still running after 94 s, the index loop after 15 s), while \`Object.keys\` and \`for...in\` took 0 ms even at length 4,294,967,290. Then the merge was verified against a dense every-index reference on 20,000 random sparse pairs.

## 1. The problem, restated

A sparse array has a \`length\` but only some indices actually exist; the rest are holes (\`i in arr\` is false). Merge two of them: at each index the result takes \`b\`'s value if \`b\` has that index, otherwise \`a\`'s, otherwise it stays a hole, and \`length\` is the larger of the two. The work should scale with the number of PRESENT entries, so a merge of two arrays with lengths in the billions and a handful of entries is instant.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Conflict rule? | Define it up front. Here \`b\` overrides \`a\` at a shared index. |
| Hole versus \`undefined\`? | They are different: \`[undefined]\` has index 0, \`[ , ]\` does not. A present \`undefined\` in \`b\` still overrides \`a\`. |
| Result length? | The maximum of the two lengths, including trailing holes. |
| How big can the length be? | Array indices go up to \`2^32 - 2\`. That is where "iterate every index" stops being an option. |

## 3. Thought process

Brute force loops \`i\` from \`0\` to \`length - 1\` and checks \`i in b\` then \`i in a\`. That is O(length), which for a length in the hundreds of millions takes seconds and for the billions does not finish. The next idea is \`forEach\`, which is specified to skip holes, so it looks like the answer. Measured, it is not: on this Node it still took about 7.1 s at length 100 million and did not finish at a billion (still running after 94 s), because the engine may still walk the index range internally. The traversals that genuinely ignore holes are \`Object.keys(arr)\` and \`for...in\`, which enumerate only the properties that exist. So the plan is: get the present indices of each array from \`Object.keys\`, keep only real array indices (the keys also include non-index properties such as \`"foo"\`), allocate \`new Array(maxLength)\` (which stays sparse), and assign \`a\`'s entries first and \`b\`'s second so \`b\` wins.

## 4. Verified solution

\`\`\`js
const isIndex = (k) => {
  const n = Number(k);
  return Number.isInteger(n) && n >= 0 && n < 4294967295 && String(n) === k;
};
const presentIndices = (arr) => Object.keys(arr).filter(isIndex).map(Number);

function mergeSparse(a, b) {
  const out = new Array(Math.max(a.length, b.length));
  for (const i of presentIndices(a)) out[i] = a[i];
  for (const i of presentIndices(b)) out[i] = b[i];      // b wins on a shared index
  return out;
}
\`\`\`

\`\`\`
real, verified output:
  a: indices 1 and 4 present, length 6      b: indices 1 and 2 present, length 4
  mergeSparse(a, b) -> length 6, present entries [1:"b1", 2:"b2", 4:"a4"]
    b wins on the shared index 1 (b1); a is kept where b has a hole (4); b-only index 2 kept
    indices 0, 3 and 5 are still holes (0 in m, 3 in m, 5 in m all false); inputs untouched
  explicit undefined in b overrides a real value: result[0] is undefined and 0 in result is true (present, not a hole)
  mergeSparse([1], new Array(5)).length -> 5 (trailing holes keep the length)

  20,000 random sparse pairs vs a dense every-index reference: mismatches 0 (16,670 inputs contained holes)

  which traversals skip holes quickly? (3 entries present, lengths 1e6 / 1e7 / 1e8 / 1e9 / 4294967290)
    forEach                 2.6 ms / 46 ms / 7,064 ms / unfinished after 94 s / not run
    index loop with "in"    5.6 ms / 17 ms / 7,582 ms / unfinished after 15 s / not run
    Object.keys(a)          2.0 ms / 26 ms / 0 ms / 0 ms / 0 ms
    for...in                2.1 ms / 24.5 ms / 0 ms / 0 ms / 0 ms

  merging arrays of length 4,000,000,000 and 3,000,000,000 with 2 entries each:
    result length 4000000000, present [5, 123456789, 3999999999], took about 0.1 ms
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="looping over every index or using forEach can still cost time proportional to the array length on a huge sparse array, while enumerating own property keys touches only the entries that exist so cost depends on how many elements are present">
  <defs>
    <marker id="sparsemerge-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Enumerate what exists, not what could exist</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">index loop or forEach</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">7 s at length 1e8, unfinished at 1e9</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">Object.keys or for...in</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">0 ms even at length 4,294,967,290</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">filter the keys down to real array indices, since Object.keys also returns names like foo</text>
</svg>

## 5. Complexity

Time: O(p_a + p_b) for the numbers of present entries (plus the cost of \`Object.keys\`, which is proportional to present keys). Space: O(p_a + p_b) for the result's present entries. The result's \`length\` is just a number and costs nothing.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Shared index | \`b\`'s value | \`b\` is assigned second |
| Index present only in \`a\` | \`a\`'s value | \`a\`'s entries are assigned first and \`b\` does not overwrite them |
| Hole in both | Stays a hole | Nothing is assigned |
| Present \`undefined\` in \`b\` | Overrides \`a\` and stays present | \`Object.keys\` includes it, and the assignment creates the property |
| Trailing holes | Kept in the length | \`new Array(max)\` sets the length |
| Non-index own properties (\`"foo"\`, \`"-1"\`, \`"01"\`) | Ignored | The canonical-index filter removes them |
| Index above \`2^32 - 2\` | Not an element | Such assignments create plain properties; \`new Array(2**32)\` throws \`RangeError\` |

## 7. Common Pitfalls

- **Trusting \`forEach\` to be free on a huge sparse array.** It skips holes in what it reports, but at length 100 million it took about 7 s and at a billion it had not finished after 94 s (measured). Use \`Object.keys\` or \`for...in\`.
- **Densifying by accident.** Spread (\`[...sparse]\`) and \`Array.from(sparse)\` turn holes into real \`undefined\` elements (\`0 in [...sp]\` is true), destroying sparseness and, for large arrays, allocating the full length. \`slice\`, \`concat\` and \`map\` keep holes.
- **Checking holes with \`JSON.stringify\`.** It prints both a hole and \`undefined\` as \`null\`; test with the \`in\` operator instead.
- **Forgetting the index filter.** \`Object.keys\` on an array also returns non-index keys, so assigning them as indices would be wrong.
- **Treating \`undefined\` as missing.** A present \`undefined\` is a value; if you want "hole-like" behavior for it, that is a different, explicit rule.
- **Assuming the speed holds in every engine.** The cliff seen here is engine-specific; treat the numbers as a demonstration that "skips holes" is not the same as "does not walk the range".

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Result index takes b if b has it, else a, else stays a hole; length is the max. Is an explicit undefined a real value?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Loop every index and test with in -- O(length), hopeless for a length in the billions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"I need to enumerate only what exists. forEach skips holes but I would want to measure it; Object.keys and for-in genuinely only see present properties."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Get present indices with Object.keys filtered to real indices, allocate new Array of the max length, assign a then b so b wins."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"A shared index, a hole in both, a present undefined, and a huge length with two entries."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would a real system have a sparse array at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually by accident (assigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[1000] = x</code> on a short array, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete arr[i]</code>). If you genuinely need a sparse mapping from large integer keys to values, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> or a plain object is the clearer, safer structure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you merge with a custom conflict rule, such as summing numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take a resolver function: for an index present in both, assign <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolve(a[i], b[i], i)</code>. Test presence with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i in a</code> while iterating <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>'s indices, which is O(1) per index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the order of Object.keys guaranteed for array indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Integer-like keys are enumerated in ascending numeric order, followed by string keys in insertion order, so the indices come out sorted. The merge does not depend on that order (each assignment targets its own index), but a caller that then processes the entries in order can rely on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use Object.entries or a for...of over the array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.entries</code> enumerates present properties like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code> does, so it works (with the same index filter). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> uses the array iterator, which visits EVERY index and yields <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> for holes, so it is exactly what to avoid here.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hole** | An index that does not exist in the array (\`i in arr\` is false) |
| **Sparse array** | An array with a large length and few present indices |
| **Densify** | Turn holes into real undefined elements, for example by spreading |

---
**Conclusion:** merging sparse arrays efficiently means enumerating only the entries that exist. \`Object.keys\` (filtered to real array indices) does that in time proportional to the present entries, while \`forEach\` and an index loop were measured taking about 7 seconds at length 100 million and were still running at a billion after 15 to 94 seconds. The merge assigns \`a\`'s entries then \`b\`'s into \`new Array(max length)\`, so \`b\` wins, holes stay holes, and a present \`undefined\` overrides. It matched a dense reference on 20,000 random sparse pairs, and merged arrays of length 4 billion and 3 billion in about a tenth of a millisecond.`,
    examples: [
      {
        label: "Real, direct proof: a sparse merge driven by Object.keys matches a dense reference, keeps holes as holes, and handles lengths in the billions instantly",
        tech: "javascript",
        runnable: true,
        code: `const isIndex = (k) => {
  const n = Number(k);
  return Number.isInteger(n) && n >= 0 && n < 4294967295 && String(n) === k;
};
const presentIndices = (arr) => Object.keys(arr).filter(isIndex).map(Number);

function mergeSparse(a, b) {
  const out = new Array(Math.max(a.length, b.length));
  for (const i of presentIndices(a)) out[i] = a[i];
  for (const i of presentIndices(b)) out[i] = b[i];
  return out;
}
function mergeReference(a, b) {
  const n = Math.max(a.length, b.length);
  const out = new Array(n);
  for (let i = 0; i < n; i++) { if (i in b) out[i] = b[i]; else if (i in a) out[i] = a[i]; }
  return out;
}
const shape = (arr) => JSON.stringify({ length: arr.length, present: presentIndices(arr).map((i) => [i, Object.is(arr[i], undefined) ? "__undef__" : arr[i]]) });

const a = [];
a[1] = "a1"; a[4] = "a4"; a.length = 6;
const b = [];
b[1] = "b1"; b[2] = "b2"; b.length = 4;
const m = mergeSparse(a, b);
console.log("merged:", shape(m));
console.log("b wins on index 1:", m[1], "| a kept where b has a hole (4):", m[4], "| holes stay holes (0, 3, 5):", !(0 in m), !(3 in m), !(5 in m), "| length:", m.length);

const c = [];
c[0] = undefined; c.length = 3;
const d = [];
d[0] = "d0"; d[2] = "d2";
const m2 = mergeSparse(d, c);
console.log("an explicit undefined in b overrides a value:", m2[0], "| still present, not a hole:", 0 in m2);

function mulberry32(x) { return () => { x |= 0; x = (x + 0x6D2B79F5) | 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(31337);
function randomSparse() {
  const len = Math.floor(rnd() * 12);
  const arr = new Array(len);
  for (let i = 0; i < len; i++) { const r = rnd(); if (r < 0.4) arr[i] = Math.floor(rnd() * 100); else if (r < 0.5) arr[i] = undefined; }
  return arr;
}
let bad = 0, withHoles = 0;
for (let t = 0; t < 20000; t++) {
  const x = randomSparse(), y = randomSparse();
  if (shape(mergeSparse(x, y)) !== shape(mergeReference(x, y))) bad++;
  if (presentIndices(x).length < x.length) withHoles++;
}
console.log("20,000 random sparse pairs against the dense reference, mismatches:", bad, "| inputs with holes:", withHoles);

const e = [1, 2];
e.foo = "not an index"; e["-1"] = "neg"; e["01"] = "leading zero";
console.log("Object.keys also returns non-index keys:", JSON.stringify(Object.keys(e)), "| the index filter keeps:", JSON.stringify(presentIndices(e)));

const sp = [];
sp[2] = "x";
console.log("spread densifies holes:", 0 in [...sp], "| Array.from densifies:", 0 in Array.from(sp), "| slice keeps holes:", !(0 in sp.slice()));

const big1 = new Array(4000000000);
big1[5] = "a"; big1[3999999999] = "z";
const big2 = new Array(3000000000);
big2[5] = "b"; big2[123456789] = "m";
const t0 = Date.now();
const bigMerged = mergeSparse(big1, big2);
console.log("merging lengths 4e9 and 3e9 with 2 entries each: length", bigMerged.length, "| present:", JSON.stringify(presentIndices(bigMerged)), "| values:", bigMerged[5], bigMerged[123456789], bigMerged[3999999999], "| took", Date.now() - t0, "ms");`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Find the Intersection of N Arrays (Not Just Two)",
    seoDescription:
      "N-array intersection was verified on 20,000 inputs incl. NaN; scanning arrays against the smallest set beat a Set per array, and early exit is free.",
    description: `**Problem, as an interviewer would state it:**
"Return the values that appear in ALL of \`N\` arrays, not just two. Discuss edge cases, runtime, and how the arrays' sizes and order affect performance."

**Examples:**

\`\`\`
intersectAll([1, 2, 3, 4], [2, 4, 6], [4, 2, 9]); // [2, 4]
intersectAll([4, 2, 1], [1, 2, 4]);               // [4, 2, 1]  (order of the first array)
\`\`\`

**Clarifying questions expected:**
- Should the result contain each value once (set semantics), or respect counts (multiset)?
- Which array's order should the result follow?
- What should zero arguments, one array, or an empty array among the inputs return?

**Code / implementation expected:** Yes — real, direct proof against a brute-force reference, plus a measurement of how ordering and early exit change the cost.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the correctness is checked against brute force on 20,000 random inputs (including \`NaN\`), and the performance claims were measured with median-of-9 runs after a warm-up, because a first single-run measurement was noisy and misleading. The result: scanning each array against a small "candidates" set, starting from the smallest array, is roughly 2.5x faster than building a set per array, and an empty candidate set stops the work immediately.

## 1. The problem, restated

Keep only the values present in every input array, each reported once, in the order they appear in the first array. Two arrays is a one-liner; the interview is about extending it cleanly to N, avoiding an O(N · n²) blow-up, and being explicit about duplicates.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Duplicates? | Set semantics (each value once) is the usual reading. A multiset intersection (min of the counts) is a different problem. |
| Result order? | Following the first array is deterministic and cheap. Say it explicitly. |
| Degenerate inputs? | No arrays gives \`[]\`; one array gives its unique values; any empty array makes the result \`[]\`. |
| Equality rules? | \`Set\` uses SameValueZero, so \`NaN\` matches \`NaN\` and \`+0\` matches \`-0\`; objects match by reference. |

## 3. Thought process

Brute force checks every value of the first array against every other array with \`includes\`: O(n · N · m), and it needs a separate de-duplication step. The first improvement is a \`Set\` per array so each lookup is O(1). Folding pairwise (\`reduce\` an \`intersect(a, b)\` across the list) is natural but builds an intermediate array at every step. The better shape keeps one shrinking set of candidates: start with the values of one array, then for each other array keep only the candidates it contains, by scanning that array and collecting hits. Two observations then make it fast. The candidate set can never be larger than the smallest input, so start from the smallest array. And once the candidates are empty, nothing can be added back, so stop without touching the remaining (possibly huge) arrays. Finally return the survivors in the ORIGINAL first array's order by filtering it once.

## 4. Verified solution

\`\`\`js
function intersectAll(...arrays) {
  if (arrays.length === 0) return [];
  const bySize = [...arrays].sort((x, y) => x.length - y.length);
  let candidates = new Set(bySize[0]);
  for (let i = 1; i < bySize.length; i++) {
    if (candidates.size === 0) return [];
    const found = new Set();
    for (const v of bySize[i]) if (candidates.has(v)) found.add(v);
    candidates = found;
  }
  return arrays[0].filter((v) => candidates.delete(v));   // original order, each value once
}
\`\`\`

\`\`\`
real, verified output:
  intersectAll([1,2,3,4],[2,4,6],[4,2,9]) -> [2,4]
  order follows the ORIGINAL first array: ([4,2,1],[1,2,4]) -> [4,2,1] and ([1,2,4],[4,2,1]) -> [1,2,4]
  no arguments -> []     one array [3,1,3,2,1] -> [3,1,2]     an empty array among the inputs -> []
  NaN found (SameValueZero); +0 and -0 are the same value; inputs are not mutated or reordered

  duplicates inside one array must not double count:
    [[1,1,1],[2],[3]] -> []   (a version that counts occurrences wrongly returns [1])
    [[1,1,2,2],[2,2,1],[1,2,2]] -> [1,2]

  20,000 random inputs (1 to 5 arrays, some NaN) vs brute force: mismatches 0 (8,809 non-empty results)

  timings, median of 9 runs after warm-up, four arrays of 300,000 items plus one array of 7 items:
    a Set built for every array   tiny array last 153.7 ms   smallest first 143.2 ms
    scan vs shrinking candidates  tiny array last 109.7 ms   smallest first  44.1 ms
    final version (sorts by size internally):  tiny last 29.4 ms | tiny first 30.0 ms
    early exit, huge arrays listed first, two small disjoint arrays present: 0.00 ms
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="building a set for every input array pays for the large arrays every time, while keeping one shrinking candidate set that starts from the smallest array and scanning each other array against it costs little and stops as soon as the candidates are empty">
  <defs>
    <marker id="intersectn-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Start small, shrink, stop early</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">a Set for every array</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">pays for every large array, in any order</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">one shrinking candidate set</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">smallest array first, exit when empty</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">emit results by filtering the original first array, so output order does not depend on the sort</text>
</svg>

## 5. Complexity

Time: O(k log k + m_min + Σ m_i + |first|) for \`k\` arrays: a tiny sort of the array list, a set built from the smallest array, one scan of each other array, and one pass over the first. Space: O(m_min), because the candidate set never exceeds the smallest array.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| No arguments | \`[]\` | Guarded up front |
| One array | Its unique values, in order | The candidate set is that array, and the final filter de-duplicates |
| Any empty array | \`[]\` | It sorts first, so the candidates start empty |
| Duplicates within an array | Counted once per array | Candidates are a \`Set\`, so repeats add nothing |
| \`NaN\`, \`+0\`/\`-0\` | Matched | SameValueZero |
| Two equal-looking objects | Not matched | Compared by reference |
| Inputs | Not mutated, not reordered | Only a copy of the array list is sorted |

## 7. Common Pitfalls

- **Counting occurrences instead of arrays.** Tallying how many times a value appears overall, and comparing to \`N\`, returns \`[1]\` for \`[[1,1,1],[2],[3]]\` (verified) because 1 appears 3 times. Count arrays, or use set logic.
- **Building a \`Set\` from every array.** It pays the full cost of each large array regardless of order; scanning against a small candidate set was about 2.5x faster (110 vs 44 ms).
- **Starting from a large array.** The candidate set can be as big as the array you start with; start from the smallest.
- **Not exiting early.** Once the candidates are empty the answer is \`[]\`; continuing to scan huge arrays wastes the whole run (the early-exit case measured 0.00 ms).
- **Trusting one timing run.** Single, unwarmed runs of this benchmark were inconsistent (the example below prints one, and it wobbles). Use several runs, a warm-up and the median.
- **Returning results in the sorted order.** Sorting the list by size would otherwise change the output order; the final filter over the ORIGINAL first array keeps it stable.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Values in every array, each once, in the first array's order; empty input gives empty, one array gives its unique values. Is that right?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"For each value in the first array, check every other array with includes -- cubic-ish, and it needs a dedupe."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"The candidate set is bounded by the smallest array, so I start there and shrink it per array, stopping when it is empty."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Sort a copy by size, Set of the smallest, scan each other array keeping only hits, and finally filter the original first array."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Duplicates inside one array must not double count, an empty array should give empty, and NaN should still match."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a multiset intersection, respecting counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the candidate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from value to the minimum count seen so far, taking the minimum with each array's own count. This bank's two-array intersection question covers the multiplicity logic for two inputs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the arrays are already sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use one pointer per array and advance the pointers that are behind the maximum current value; when all N point at equal values, emit it. That is O(total) time with O(1) extra space and no hashing, but it requires the sorted guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can objects be intersected by value instead of reference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept a key function and put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key(v)</code> (an id, or a canonical serialization) into the sets instead of the objects, then map the survivors back. Keep the key cheap: it runs once per element per array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a built-in for this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Newer engines add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.prototype.intersection</code> for two sets, but support varies by runtime, so check your target before relying on it, and it does not cover N arrays or arrays directly. Libraries such as lodash provide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_.intersection</code> for N arrays.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Candidate set** | The values that could still be in the final intersection |
| **Early exit** | Stopping as soon as the answer can no longer change |
| **Multiset** | A collection where repeated values count |

---
**Conclusion:** the intersection of N arrays is the shrinking set of values found in every array. Start the candidates from the smallest array (the set can never be larger), scan each other array against the candidates keeping only hits, stop when the candidates are empty, and finally filter the original first array so each survivor appears once in the expected order. It matched brute force on 20,000 random inputs, needed no special handling for \`NaN\`, ran in about 29 ms whatever the argument order (versus 110 ms when the tiny array came last in the plain scanning version), and returned immediately when the small arrays already had nothing in common.`,
    examples: [
      {
        label: "Real, direct proof: N-array intersection matches brute force, respects the first array's order, never double counts duplicates, and exits early",
        tech: "javascript",
        runnable: true,
        code: `function intersectAll(...arrays) {
  if (arrays.length === 0) return [];
  const bySize = [...arrays].sort((x, y) => x.length - y.length);
  let candidates = new Set(bySize[0]);
  for (let i = 1; i < bySize.length; i++) {
    if (candidates.size === 0) return [];
    const found = new Set();
    for (const v of bySize[i]) if (candidates.has(v)) found.add(v);
    candidates = found;
  }
  return arrays[0].filter((v) => candidates.delete(v));
}

console.log("basic:", JSON.stringify(intersectAll([1, 2, 3, 4], [2, 4, 6], [4, 2, 9])));
console.log("order follows the original first array:", JSON.stringify(intersectAll([4, 2, 1], [1, 2, 4])), JSON.stringify(intersectAll([1, 2, 4], [4, 2, 1])));
console.log("no args:", JSON.stringify(intersectAll()), "| one array:", JSON.stringify(intersectAll([3, 1, 3, 2, 1])), "| an empty array:", JSON.stringify(intersectAll([1, 2], [], [1])));
console.log("NaN matches:", intersectAll([NaN, 1], [1, NaN]).length, "| +0 and -0 match:", intersectAll([0], [-0]).length);
console.log("duplicates do not double count:", JSON.stringify(intersectAll([1, 1, 1], [2], [3])), JSON.stringify(intersectAll([1, 1, 2, 2], [2, 2, 1], [1, 2, 2])));

function countOccurrencesBug(...arrays) {
  const counts = new Map();
  for (const arr of arrays) for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].filter(([, c]) => c === arrays.length).map(([v]) => v);
}
console.log("the bug, counting occurrences on [[1,1,1],[2],[3]]:", JSON.stringify(countOccurrencesBug([1, 1, 1], [2], [3])), "(correct answer is [])");

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2718);
function brute(...arrays) {
  if (!arrays.length) return [];
  const out = [];
  for (const v of arrays[0]) if (arrays.every((a) => a.includes(v)) && !out.some((o) => o === v || (o !== o && v !== v))) out.push(v);
  return out;
}
let bad = 0;
for (let t = 0; t < 20000; t++) {
  const k = 1 + Math.floor(rnd() * 5);
  const arrs = Array.from({ length: k }, () => Array.from({ length: Math.floor(rnd() * 9) }, () => (rnd() < 0.05 ? NaN : Math.floor(rnd() * 6))));
  if (JSON.stringify(intersectAll(...arrs).map(String)) !== JSON.stringify(brute(...arrs).map(String))) bad++;
}
console.log("20,000 random inputs against brute force, mismatches:", bad);

const huge = (seed) => Array.from({ length: 300000 }, (_, i) => (i * 7 + seed) % 1000003);
const disjoint = [huge(9), huge(10), [1, 2, 3], [4, 5, 6]];
let t0 = Date.now();
const early = intersectAll(...disjoint);
console.log("two small disjoint arrays stop the work even when huge arrays are listed first:", JSON.stringify(early), "in", Date.now() - t0, "ms");

const tinyLast = [huge(1), huge(2), huge(3), huge(4), [1, 2, 3, 500000, 999999, 7, 14]];
const tinyFirst = [tinyLast[4], ...tinyLast.slice(0, 4)];
function median(fn) {
  fn();
  const times = [];
  for (let i = 0; i < 9; i++) { const s0 = Date.now(); fn(); times.push(Date.now() - s0); }
  return times.sort((x, y) => x - y)[4];
}
const a = median(() => intersectAll(...tinyLast));
const b = median(() => intersectAll(...tinyFirst));
console.log("median of 9 runs after a warm-up, tiny array last:", a, "ms | tiny array first:", b, "ms (close to each other; exact numbers vary by machine)");`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Flatten a Deeply Nested Array Iteratively (No Recursion, No Call-Stack Limit)",
    seoDescription:
      "Iterative flatten matched native flat on 20,000 random arrays with holes, handled 1,000,000-deep nesting where native flat threw, and flags cycles.",
    description: `**Problem, as an interviewer would state it:**
"Implement a function to flatten a nested array completely, iteratively (no recursion) using a stack. It must correctly handle sparse-array holes and circular references."

**Examples:**

\`\`\`
flatten([1, [2, [3, [4, [5]]]], 6]); // [1, 2, 3, 4, 5, 6]
flatten([1, , [2, , [, 3]], , 4]);   // [1, 2, 3, 4]   (holes are skipped)
\`\`\`

**Clarifying questions expected:**
- What should a circular reference do — throw, skip, or stop early?
- Should an array that is merely shared (referenced twice, but not inside itself) be flattened each time?
- Should there be a depth limit, matching \`Array.prototype.flat(depth)\`?

**Code / implementation expected:** Yes — real, direct proof against native \`flat\`, at depths where recursion (and native \`flat\`) fail.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the constraint is about the call stack, and it is real: on this Node even the built-in \`arr.flat(Infinity)\` threw \`RangeError\` at nesting depth 10,000, as did a recursive version, while the iterative version flattened depth 1,000,000. Correctness was checked against native \`flat(Infinity)\` and a recursive reference on 20,000 random nested arrays that include holes, with zero mismatches.

## 1. The problem, restated

Produce a single flat list of all the non-array values inside an arbitrarily nested array, in left-to-right, depth-first order, without using the call stack for the nesting: keep your own stack instead. Holes are skipped, a circular structure must not hang, and an array that is shared but not circular is simply flattened wherever it appears.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Circular reference behavior? | Native \`flat\` overflows the stack on a cycle. A clear \`TypeError\` is far better; say which you chose. |
| Shared versus circular? | A shared array appears twice but is not inside itself, so it must flatten twice; only a path back to an ANCESTOR is a cycle. |
| Depth limit? | Matching \`flat(depth)\` is cheap: track the level of each frame. |
| What counts as an array? | \`Array.isArray\` only. Sets, typed arrays and array-likes are values. |

## 3. Thought process

Brute force is \`arr.flat(Infinity)\`, or a recursive function that recurses on array elements. Both use the call stack once per nesting level, so a deep enough structure raises \`RangeError\` (measured at depth 10,000 on this Node, for both). The iterative fix replaces the call stack with an explicit stack of frames. Each frame holds an array and the next index to read. Loop: look at the top frame; if its index has run past its length, pop it; otherwise read the next element. A hole (index not \`in\` the array) is skipped. A nested array pushes a new frame; anything else is appended to the output. Because each frame remembers its own position, order is exactly left-to-right depth-first. To tell a cycle from a shared array, keep a \`path\` set of the arrays currently on the stack: an array found in \`path\` is an ancestor, so it is a cycle; an array that was fully finished has already been removed from \`path\`, so meeting it again is fine.

## 4. Verified solution

\`\`\`js
function flattenIterative(input, depth = Infinity) {
  const out = [];
  const path = new Set([input]);                       // arrays currently on the stack
  const stack = [{ arr: input, i: 0, level: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.i >= frame.arr.length) { path.delete(frame.arr); stack.pop(); continue; }
    const idx = frame.i++;
    if (!(idx in frame.arr)) continue;                 // hole
    const item = frame.arr[idx];
    if (Array.isArray(item) && frame.level < depth) {
      if (path.has(item)) throw new TypeError("Circular reference detected");
      path.add(item);
      stack.push({ arr: item, i: 0, level: frame.level + 1 });
    } else {
      out.push(item);
    }
  }
  return out;
}
\`\`\`

\`\`\`
real, verified output:
  [1,[2,[3,[4,[5]]]],6] -> [1,2,3,4,5,6]        [[1,[2]],3,[[4],5]] -> [1,2,3,4,5]
  depth limit: flatten([1,[2,[3,[4]]]], 1) -> [1,2,[3,[4]]]   depth 2 -> [1,2,3,[4]]   depth 0 -> a top-level copy
  empty arrays vanish: [[],[[]],1] -> [1]     [] -> []
  holes skipped like native flat: [1, ,[2, ,[ ,3]], ,4] -> [1,2,3,4]
  objects, Sets and strings are values, not flattened; explicit undefined, null and 0 are kept

  circular: [1,[2, <the outer array>]] -> TypeError: Circular reference detected
            an array containing itself -> TypeError: Circular reference detected
            native flat(Infinity) on a cycle -> RangeError (stack overflow)
  shared, not circular: [shared,[shared,9],shared] with shared = [7,8] -> [7,8,7,8,9,7,8]

  20,000 random nested arrays with holes vs native flat(Infinity) and a recursive version: mismatches 0

  nesting depth        native flat(Infinity)   recursive     iterative
  1,000                ok                      ok            ok
  10,000               RangeError              RangeError    ok
  100,000              RangeError              RangeError    ok
  1,000,000            RangeError              RangeError    ok

  200,000 mixed items flattened in 4 ms, identical to native flat(Infinity)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="recursion uses the call stack once per nesting level and overflows on very deep input, while an explicit stack of frames each remembering an array and a next index gives the same order limited only by memory, and a set of arrays currently on the stack separates a cycle from a merely shared array">
  <defs>
    <marker id="flatiter-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Replace the call stack with your own</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">recursion or native flat</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">RangeError at depth 10,000 here</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">explicit stack of frames</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">array plus next index, memory-limited</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a path set of arrays on the stack: an ancestor hit is a cycle, a finished array met again is just shared</text>
</svg>

## 5. Complexity

Time: O(n) in the total number of elements across all levels (each frame is pushed and popped once). Space: O(d) for the frame stack and \`path\` set (depth of nesting) plus O(n) for the output.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Holes | Skipped | The \`idx in frame.arr\` check |
| Empty nested arrays | Contribute nothing | Their frame pops immediately |
| Explicit \`undefined\` / \`null\` | Kept | They are present values |
| Circular reference | \`TypeError\` | An array found in \`path\` is an ancestor |
| Shared (non-circular) array | Flattened at each occurrence | It leaves \`path\` when finished, so a later hit is not a cycle |
| Depth limit | Elements deeper than \`depth\` stay as arrays | \`frame.level < depth\` gates the push |
| Very deep nesting | Works | Only heap memory limits the frame stack |

## 7. Common Pitfalls

- **Assuming native \`flat(Infinity)\` is safe.** It overflowed the stack at depth 10,000 on this Node, and on a cyclic input it fails with a confusing \`RangeError\` rather than a clear message.
- **Using one \`seen\` set for cycles.** A shared array would be reported as circular. Track only the arrays on the CURRENT path and remove each on exit.
- **Forgetting to pop a frame's array from \`path\`.** Then it behaves like a global seen set and the shared-array case breaks.
- **Reading the next element without advancing the index first.** Increment \`frame.i\` before pushing a child frame, or the parent re-reads the same array forever.
- **Reversing the order by pushing children onto a plain stack.** Pushing all of an array's elements at once and popping gives right-to-left order; keeping a per-frame index preserves left-to-right.
- **Flattening non-array iterables.** A \`Set\` or a string is a value here; only \`Array.isArray\` is expanded.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Left-to-right depth-first, holes skipped. What should a circular reference do, and should a shared array be flattened each time?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"flat with Infinity, or recurse on every array element."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Both use the call stack once per level, so a deep structure overflows; I keep my own stack of frames instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Each frame is an array and a next index; pop when exhausted, skip holes, push a frame for a nested array, and track the arrays on the current path to detect cycles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"A million levels deep, a hole, an array that contains itself, and a shared array that must flatten twice."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the built-in flat overflow the stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is specified recursively and implementations follow that structure, so each nesting level consumes native call-stack space. The exact depth limit depends on the engine and its stack size; on this Node it failed at 10,000 (a limit, not a bug).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you skip a cycle instead of throwing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">onCycle</code> option: when the array is found in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>, either throw, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code> past it (dropping the back-reference), or push a placeholder value so the caller can see something was cut.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you flatten objects (their values) as well?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generalise the frame to hold an iterator over the container's values (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values</code> for a plain object) instead of an index. The stack-of-frames shape and the path set for cycle detection stay identical. This bank's dot-notation flatten question covers keeping the paths too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you flatten lazily, one element at a time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: turn the loop into an iterator (or a generator, if allowed) that yields each leaf and resumes from the saved frame stack, so a caller can stop early without paying to flatten everything. The frame stack is exactly the state such an iterator needs.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Frame** | An array plus the next index to read, kept on our own stack |
| **Ancestor path** | The set of arrays currently open on the stack |
| **RangeError** | The error thrown when the call stack is exhausted |

---
**Conclusion:** flattening iteratively means keeping your own stack of \`{ array, next index }\` frames, popping a frame when its array is exhausted, skipping holes, pushing a frame for a nested array, and appending everything else. A \`path\` set of the arrays currently on the stack distinguishes a genuine cycle (an ancestor, which throws a clear \`TypeError\`) from a merely shared array (finished, so flattened again where it recurs). It matched native \`flat(Infinity)\` on 20,000 random arrays with holes, and where both native \`flat\` and a recursive version threw \`RangeError\` at nesting depth 10,000, the iterative version handled 1,000,000.`,
    examples: [
      {
        label: "Real, direct proof: an explicit-stack flatten matches native flat, skips holes, distinguishes cycles from shared arrays, and survives depths where native flat throws",
        tech: "javascript",
        runnable: true,
        code: `function flattenIterative(input, depth = Infinity) {
  const out = [];
  const path = new Set([input]);
  const stack = [{ arr: input, i: 0, level: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.i >= frame.arr.length) { path.delete(frame.arr); stack.pop(); continue; }
    const idx = frame.i++;
    if (!(idx in frame.arr)) continue;
    const item = frame.arr[idx];
    if (Array.isArray(item) && frame.level < depth) {
      if (path.has(item)) throw new TypeError("Circular reference detected");
      path.add(item);
      stack.push({ arr: item, i: 0, level: frame.level + 1 });
    } else {
      out.push(item);
    }
  }
  return out;
}
function flattenRecursive(arr) {
  const out = [];
  (function go(a) { for (let i = 0; i < a.length; i++) { if (!(i in a)) continue; if (Array.isArray(a[i])) go(a[i]); else out.push(a[i]); } })(arr);
  return out;
}

console.log("basic:", JSON.stringify(flattenIterative([1, [2, [3, [4, [5]]]], 6])));
console.log("depth limits match native flat:", [0, 1, 2, 3].every((d) => JSON.stringify(flattenIterative([1, [2, [3, [4]]]], d)) === JSON.stringify([1, [2, [3, [4]]]].flat(d))));
console.log("empty arrays vanish:", JSON.stringify(flattenIterative([[], [[]], 1])));
const sparse = [1, , [2, , [, 3]], , 4];
console.log("holes skipped:", JSON.stringify(flattenIterative(sparse)), "| native flat(Infinity):", JSON.stringify(sparse.flat(Infinity)));

const cyc = [1, [2]];
cyc[1].push(cyc);
try { flattenIterative(cyc); } catch (e) { console.log("cycle throws:", e.constructor.name, "-", e.message); }
try { const c2 = [1]; c2.push(c2); c2.flat(Infinity); } catch (e) { console.log("native flat on a cycle throws:", e.constructor.name); }
const shared = [7, 8];
console.log("a shared (non-circular) array flattens every time it appears:", JSON.stringify(flattenIterative([shared, [shared, 9], shared])));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(4242);
function randomNested(depth) {
  const n = Math.floor(rnd() * 5);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const r = rnd();
    if (r < 0.3 && depth > 0) arr.push(randomNested(depth - 1));
    else if (r < 0.4) arr.length = arr.length + 1;
    else arr.push(Math.floor(rnd() * 100));
  }
  return arr;
}
let bad = 0;
for (let t = 0; t < 20000; t++) {
  const x = randomNested(5);
  const a = JSON.stringify(flattenIterative(x));
  if (a !== JSON.stringify(x.flat(Infinity)) || a !== JSON.stringify(flattenRecursive(x))) bad++;
}
console.log("20,000 random nested arrays with holes vs native flat and a recursive version, mismatches:", bad);

function nest(depth) { let a = ["leaf"]; for (let i = 0; i < depth; i++) a = [a]; return a; }
for (const d of [1000, 10000, 1000000]) {
  let nat = "ok", it = "ok";
  try { nest(d).flat(Infinity); } catch (e) { nat = e.constructor.name; }
  try { const r = flattenIterative(nest(d)); if (r.length !== 1 || r[0] !== "leaf") it = "WRONG"; } catch (e) { it = e.constructor.name; }
  console.log("nesting depth", d, "| native flat(Infinity):", nat, "| iterative:", it);
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Graph dfs traversal",
    seoDescription:
      "Iterative DFS matched recursive order on 20,000 random graphs; marking on push changed the order on 5,767 and recursion overflowed at 20,000 nodes.",
    description: `**Problem, as an interviewer would state it:**
"Implement a depth-first search over a graph given as an adjacency list, returning the order in which nodes are visited. Discuss edge cases, runtime, recursive versus iterative, and alternatives."

**Examples:**

\`\`\`
graph = { A: ["B", "C"], B: ["D"], C: ["D", "E"], D: ["F"], E: ["F"], F: [] }
dfs(graph, "A"); // ["A", "B", "D", "F", "C", "E"]
\`\`\`

**Clarifying questions expected:**
- Directed or undirected, and may it contain cycles, self loops or repeated edges?
- Is the graph connected, or must every component be covered?
- Which order do you want: pre-order (visit on entry), post-order (visit on exit)?

**Code / implementation expected:** Yes — real, direct proof that recursive and iterative versions agree, and of the subtle iterative variant that does not.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** DFS is easy to recite and easy to get subtly wrong when made iterative. Three versions were compared on 20,000 random graphs (with cycles, self loops and repeated edges): recursive and iterative (mark when popped, push neighbours in reverse) agreed on every graph, while the tempting "mark when pushed" variant visited the same nodes but in a different order on 5,767 of them, so it is not depth-first.

## 1. The problem, restated

Starting at a node, go as deep as possible along each branch before backing up, visiting every reachable node once. A \`visited\` set makes it safe on cycles. The order of visiting (which neighbour first, when a node counts as "visited") is what defines depth-first search.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Order of neighbours? | A recursive DFS visits neighbours in list order; an iterative one must reproduce that deliberately. |
| Pre-order or post-order? | Pre-order records a node on entry; post-order records it after its descendants, which underlies topological sorting. |
| Connected? | From one start node only its component is visited; cover a disconnected graph by starting from every unvisited node. |
| Graph size and depth? | A recursive DFS overflows the call stack on a long path. |

## 3. Thought process

Recursive DFS is the definition: mark the node, then recurse into each unvisited neighbour. Its weakness is the call stack: a path graph of 20,000 nodes threw \`RangeError\` on this Node. The iterative version uses an explicit stack. The subtle part is WHEN a node counts as visited. If you mark on POP, and push a node's neighbours in REVERSE order so the first neighbour is popped first, the visiting order is identical to the recursion. If you mark on PUSH (a habit carried over from breadth-first search, where it is correct), a node can be claimed early by a node higher on the stack, and the order changes: still a valid traversal of the reachable set, but not depth-first order. A node can appear on the stack more than once when marking on pop, so check \`visited\` again when popping.

## 4. Verified solution

\`\`\`js
function dfsRecursive(graph, start) {
  const visited = new Set(), order = [];
  (function visit(u) {
    visited.add(u); order.push(u);
    for (const v of graph[u] ?? []) if (!visited.has(v)) visit(v);
  })(start);
  return order;
}
function dfsIterative(graph, start) {          // mark when POPPED; push neighbours in reverse
  const visited = new Set(), order = [], stack = [start];
  while (stack.length) {
    const u = stack.pop();
    if (visited.has(u)) continue;
    visited.add(u); order.push(u);
    const nbrs = graph[u] ?? [];
    for (let i = nbrs.length - 1; i >= 0; i--) if (!visited.has(nbrs[i])) stack.push(nbrs[i]);
  }
  return order;
}
function dfsAll(graph) {                        // covers every component
  const visited = new Set(), order = [];
  for (const start of Object.keys(graph)) {
    if (visited.has(start)) continue;
    const stack = [start];
    while (stack.length) {
      const u = stack.pop();
      if (visited.has(u)) continue;
      visited.add(u); order.push(u);
      const nbrs = graph[u] ?? [];
      for (let i = nbrs.length - 1; i >= 0; i--) if (!visited.has(nbrs[i])) stack.push(nbrs[i]);
    }
  }
  return order;
}
\`\`\`

\`\`\`
real, verified output, g = { A:[B,C], B:[D], C:[D,E], D:[F], E:[F], F:[] }:
  recursive ABDFCE     iterative ABDFCE     mark-on-push ACEFDB   (different order!)

  cycles and self loops are safe: { A:[B,A], B:[A] } from A -> AB (both versions)
  unknown start node -> ["Z"]; a node with no adjacency list is still visited: { A:[B] } -> ["A","B"]
  disconnected { A:[B], B:[], C:[D], D:[], E:[] }: from A only -> AB     dfsAll -> ABCDE

  post-order of g (a node recorded after its descendants): FDBECA
  reversed post-order (a topological order for a DAG): ACEBDF

  20,000 random graphs (1-8 nodes, up to 3 edges each, cycles, self loops, repeated edges):
    recursive vs iterative differ on 0 graphs
    mark-on-push differs from the recursive order on 5,767 graphs, but visits a different SET on 0 of them

  depth: a path graph of 5,000 nodes is fine recursively; 20,000, 100,000 and 1,000,000 nodes throw RangeError
         the iterative version handled all of them (1,000,000 nodes)

  undirected cycle detection with a parent check: triangle -> true, path A-B-C -> false
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="recursive depth first search goes down the first neighbour before the others, marking a node when pushed onto an explicit stack lets a node be claimed early and changes the order, while marking when popped and pushing neighbours in reverse reproduces the recursive order">
  <defs>
    <marker id="dfs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">When does a node count as visited?</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">mark on push</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">same nodes, different order (5,767 of 20,000)</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">mark on pop, push in reverse</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">identical to recursion on every graph</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a node can sit on the stack twice, so re-check visited when it is popped</text>
</svg>

## 5. Complexity

Time: O(V + E). Space: O(V) for the visited set plus the stack (worst case O(V + E) entries when marking on pop, since a node can be pushed once per incoming edge).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Cycles and self loops | Terminate | The \`visited\` set blocks revisits |
| Repeated edges | Fine | The second occurrence is already visited or skipped on pop |
| Missing adjacency list | Node is visited, no neighbours | The \`graph[u] ?? []\` fallback |
| Unknown start node | Returns just \`[start]\` | It is visited and has no neighbours |
| Disconnected graph | Only the start's component | Use \`dfsAll\` to cover every component |
| Very long path | Recursive version overflows | Verified \`RangeError\` at 20,000 nodes |

## 7. Common Pitfalls

- **Marking on push in the iterative version.** It is right for BFS but changes the DFS order (5,767 of 20,000 random graphs differed), and the mistake is silent because the set of visited nodes is still correct.
- **Pushing neighbours in forward order.** The LAST neighbour is popped first, giving a mirror-image order compared with the recursion. Push in reverse.
- **Not re-checking \`visited\` when popping.** With mark-on-pop a node can be pushed several times; without the check it is visited more than once.
- **Assuming one call covers the graph.** From one start node only that component is traversed.
- **Relying on recursion for large inputs.** A 20,000-node path overflowed the stack; the iterative version handled a million.
- **Using it for shortest paths.** DFS finds a path, not the shortest one; use BFS for fewest edges.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Adjacency list, possibly cyclic; I will return the pre-order visiting order. Is the graph connected, and do you want post-order too?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Recursion with a visited set is the definition of DFS."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"It overflows the call stack on long paths, so I switch to an explicit stack -- carefully, because when I mark a node visited changes the order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Mark on pop, re-check visited, and push neighbours in reverse so the first one is explored first, matching the recursion."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"A cycle, a self loop, a disconnected node, and a graph where marking on push would give a different order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a topological order from DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record nodes in post-order (after visiting all descendants) and reverse the list. On the example DAG that gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ACEBDF</code>, in which every edge goes from an earlier to a later node. For a graph that may contain a cycle, you must also detect the cycle first, since no topological order exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose DFS over BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For exhaustive exploration (finding all paths, backtracking, cycle detection, topological sort, connected components) and when the graph is deep and narrow. Choose BFS (this bank's BFS question) when you need the fewest edges to a target.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a cycle in an undirected graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Carry the parent along: an edge back to an already-visited node that is NOT the parent closes a cycle (verified: a triangle gives true, a path gives false). Without the parent check, every edge would look like a cycle because undirected edges appear in both directions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you record post-order iteratively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep frames of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ node, next neighbour index }</code> on the stack, as in this bank's iterative flatten, and emit a node when its frame is exhausted. Mark on entry to the frame so cycles terminate.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pre-order** | Record a node when first entered |
| **Post-order** | Record a node after all its descendants |
| **Adjacency list** | A map from each node to the nodes it connects to |

---
**Conclusion:** DFS goes as deep as possible along each branch before backing up, with a \`visited\` set for safety on cycles. The recursive form is the definition but overflowed the call stack at 20,000 nodes on this Node; the iterative form marks a node when it is POPPED, re-checks \`visited\` on pop, and pushes neighbours in REVERSE, which produced exactly the recursive order on all 20,000 random graphs. Marking on push visits the same set but a different order (5,767 of 20,000 graphs differed), so it is not DFS.`,
    examples: [
      {
        label: "Real, direct proof: iterative DFS reproduces the recursive order on random graphs, marking on push does not, and recursion overflows where the iterative version does not",
        tech: "javascript",
        runnable: true,
        code: `function dfsRecursive(graph, start) {
  const visited = new Set(), order = [];
  (function visit(u) {
    visited.add(u); order.push(u);
    for (const v of graph[u] ?? []) if (!visited.has(v)) visit(v);
  })(start);
  return order;
}
function dfsIterative(graph, start) {
  const visited = new Set(), order = [], stack = [start];
  while (stack.length) {
    const u = stack.pop();
    if (visited.has(u)) continue;
    visited.add(u); order.push(u);
    const nbrs = graph[u] ?? [];
    for (let i = nbrs.length - 1; i >= 0; i--) if (!visited.has(nbrs[i])) stack.push(nbrs[i]);
  }
  return order;
}
function dfsMarkOnPush(graph, start) {
  const visited = new Set([start]), order = [], stack = [start];
  while (stack.length) {
    const u = stack.pop();
    order.push(u);
    for (const v of graph[u] ?? []) if (!visited.has(v)) { visited.add(v); stack.push(v); }
  }
  return order;
}
function dfsAll(graph) {
  const visited = new Set(), order = [];
  for (const start of Object.keys(graph)) {
    if (visited.has(start)) continue;
    const stack = [start];
    while (stack.length) {
      const u = stack.pop();
      if (visited.has(u)) continue;
      visited.add(u); order.push(u);
      const nbrs = graph[u] ?? [];
      for (let i = nbrs.length - 1; i >= 0; i--) if (!visited.has(nbrs[i])) stack.push(nbrs[i]);
    }
  }
  return order;
}

const g = { A: ["B", "C"], B: ["D"], C: ["D", "E"], D: ["F"], E: ["F"], F: [] };
console.log("recursive:", dfsRecursive(g, "A").join(""), "| iterative:", dfsIterative(g, "A").join(""), "| mark on push:", dfsMarkOnPush(g, "A").join(""));
console.log("cycle and self loop are safe:", dfsRecursive({ A: ["B", "A"], B: ["A"] }, "A").join(""), dfsIterative({ A: ["B", "A"], B: ["A"] }, "A").join(""));
const disc = { A: ["B"], B: [], C: ["D"], D: [], E: [] };
console.log("disconnected, from A only:", dfsIterative(disc, "A").join(""), "| dfsAll:", dfsAll(disc).join(""));

function postorder(graph, start) {
  const visited = new Set(), out = [];
  (function v(u) { visited.add(u); for (const w of graph[u] ?? []) if (!visited.has(w)) v(w); out.push(u); })(start);
  return out;
}
console.log("post-order:", postorder(g, "A").join(""), "| reversed (a topological order):", postorder(g, "A").reverse().join(""));

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(8080);
function randomGraph(n) {
  const nodes = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const gr = {};
  for (const u of nodes) gr[u] = Array.from({ length: Math.floor(rnd() * 4) }, () => nodes[Math.floor(rnd() * n)]);
  return gr;
}
let recVsIter = 0, pushDiff = 0, wrongSet = 0;
for (let t = 0; t < 20000; t++) {
  const gr = randomGraph(1 + Math.floor(rnd() * 8));
  const r = dfsRecursive(gr, "A").join("");
  const p = dfsMarkOnPush(gr, "A");
  if (r !== dfsIterative(gr, "A").join("")) recVsIter++;
  if (r !== p.join("")) pushDiff++;
  if ([...p].sort().join("") !== [...r].sort().join("")) wrongSet++;
}
console.log("20,000 random graphs: recursive vs iterative differ on", recVsIter, "| mark on push differs in order on", pushDiff, "| but visits a different set on", wrongSet);

function path(n) {
  const gr = {};
  for (let i = 0; i < n - 1; i++) gr[i] = [i + 1];
  gr[n - 1] = [];
  return gr;
}
for (const n of [5000, 20000, 100000]) {
  let rec = "ok", it = "ok";
  try { dfsRecursive(path(n), 0); } catch (e) { rec = e.constructor.name; }
  try { if (dfsIterative(path(n), 0).length !== n) it = "WRONG"; } catch (e) { it = e.constructor.name; }
  console.log("path graph of", n, "nodes | recursive:", rec, "| iterative:", it);
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Queue via two stacks",
    seoDescription:
      "A queue from two stacks matched an array queue on 2,000 random sequences with amortized O(1) moves; draining a big array with shift() went quadratic.",
    description: `**Problem, as an interviewer would state it:**
"Implement a FIFO queue using only two stacks (LIFO structures). Discuss edge cases, runtime, and alternatives."

**Examples:**

\`\`\`
q.enqueue(1); q.enqueue(2); q.enqueue(3);
q.dequeue(); // 1
q.dequeue(); // 2
q.enqueue(4);
q.dequeue(); // 3
\`\`\`

**Clarifying questions expected:**
- Which operations are needed: \`enqueue\`, \`dequeue\`, \`peek\`, \`size\`, \`isEmpty\`?
- What should \`dequeue\` and \`peek\` return on an empty queue?
- What runtime is expected: is amortized O(1) per operation acceptable?

**Code / implementation expected:** Yes — real, direct proof against a reference queue, a measurement of the amortized cost, and the classic bug.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the two-stack queue was checked against a plain array queue on 2,000 random operation sequences (0 mismatches), and the amortized claim was counted, not asserted: over 200,000 enqueues and dequeues the total number of element moves was exactly 200,000. A practical surprise was measured too: draining an array with \`shift()\` had a performance cliff on this Node (5.3 ms for 10,000 items, 841 ms for 20,000), while the two-stack queue stayed under 3 ms.

## 1. The problem, restated

A stack removes the most recently added item; a queue removes the oldest. Reversing a sequence turns one into the other, and popping items off one stack and pushing them onto another reverses their order. So keep an INBOX stack for new items and an OUTBOX stack for items ready to be dequeued.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Required operations? | Enqueue and dequeue at minimum; \`peek\`, \`size\` and \`isEmpty\` are natural extensions. |
| Empty behavior? | Return \`undefined\` (or throw); decide and state it. |
| Runtime target? | Amortized O(1) is achievable and is the expected answer. Worst-case O(1) for every operation is not possible with this design. |
| Allowed structures? | Only stack operations: \`push\`, \`pop\`, and looking at the top. |

## 3. Thought process

Enqueue simply pushes onto the inbox. Dequeue needs the OLDEST item, which is at the bottom of the inbox. Moving every item from the inbox to the outbox one by one reverses them, so the oldest ends up on top of the outbox, ready to pop. The critical rule is WHEN to move: only when the outbox is empty. If you move while the outbox still holds items, the new items land underneath older ones and the order is wrong (this bug was reproduced). Because an item is moved at most once (inbox to outbox, then popped), the total moves never exceed the number of enqueues, so the average cost per operation is constant even though a single dequeue after many enqueues can move everything.

## 4. Verified solution

\`\`\`js
class TwoStackQueue {
  constructor() { this.inbox = []; this.outbox = []; }
  enqueue(x) { this.inbox.push(x); }
  refill() {
    if (this.outbox.length === 0) {                // ONLY when the outbox is empty
      while (this.inbox.length) this.outbox.push(this.inbox.pop());
    }
  }
  dequeue() { this.refill(); return this.outbox.pop(); }
  peek() { this.refill(); return this.outbox[this.outbox.length - 1]; }
  get size() { return this.inbox.length + this.outbox.length; }
  isEmpty() { return this.size === 0; }
}
\`\`\`

\`\`\`
real, verified output:
  enqueue 1,2,3 -> dequeue 1, 2;  enqueue 4 -> dequeue 3, 4 (FIFO preserved across interleaved operations)
  isEmpty -> true;  dequeue on empty -> undefined;  peek on empty -> undefined

  the classic bug, moving the inbox into a NON-empty outbox:
    enqueue 1,2 -> dequeue 1 -> enqueue 3 -> dequeue, dequeue  gave 1 then 3,2   (expected 1 then 2,3)

  2,000 random operation sequences of 200 operations (enqueue / dequeue / peek) vs an array queue: mismatches 0

  amortized cost: 200,000 enqueues, 200,000 dequeues -> total element moves 200,000 (1.00 per dequeue)
    moves <= enqueues: true
  worst case: with 100,000 items in the inbox, ONE dequeue moved 100,000 elements; the very next dequeue moved 0

  draining a queue of N items (Node v24.19.0, timings vary by machine and engine):
    N        Array.shift()    two-stack queue
    2,000       0.6 ms          1.0 ms
    5,000       2.5 ms          0.4 ms
    10,000      5.3 ms          1.3 ms
    20,000    840.6 ms          1.5 ms
    40,000  4,170.6 ms          2.9 ms
    50,000  7,693 ms            20 ms
    200,000 146,665 ms          17 ms
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="new items are pushed onto an inbox stack, and when the outbox is empty the inbox is poured into it which reverses the order so the oldest item is on top, and pouring only when the outbox is empty keeps first in first out order and makes each item move at most once">
  <defs>
    <marker id="twostack-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Reversing twice restores the order</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">inbox: enqueue pushes here</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">newest on top, oldest at the bottom</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">outbox: dequeue pops here</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">refilled only when it is empty</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">each item moves at most once, so the total moves never exceed the enqueues</text>
</svg>

## 5. Complexity

\`enqueue\`: O(1). \`dequeue\` and \`peek\`: amortized O(1), worst case O(n) for the single call that refills. Space: O(n).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Dequeue or peek on an empty queue | \`undefined\` | \`pop\` on an empty array returns \`undefined\`, and \`refill\` does nothing |
| Enqueue while the outbox still has items | New items wait in the inbox | Refill only happens when the outbox is empty |
| Alternating enqueue and dequeue | FIFO order preserved | Verified on 2,000 random sequences |
| One large batch then many dequeues | First dequeue is O(n), the rest O(1) | Measured: 100,000 moves, then 0 |
| \`size\` | Sum of both stacks | Items live in exactly one of them |

## 7. Common Pitfalls

- **Refilling the outbox when it is not empty.** New items end up beneath older ones and the output order breaks (reproduced: 1, then 3, 2).
- **Moving items back and forth on every dequeue.** It is correct but makes every dequeue O(n); the whole point is to leave items in the outbox until it runs dry.
- **Claiming worst-case O(1).** Only the amortized cost is constant; a single dequeue can move everything.
- **Using \`Array.shift()\` as the queue for large data.** It was fine up to 10,000 items on this Node but hit a cliff beyond that (841 ms for 20,000, over 146 s for 200,000). The behaviour is engine-specific, which is exactly why the two-stack (or head-index, or linked-list) queue is worth knowing.
- **Forgetting \`peek\`.** It must also refill, otherwise it reports the wrong front element.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"FIFO using only push and pop on two stacks. Amortized O(1) is fine, and empty dequeue returns undefined, right?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Pour the inbox into the outbox and back on every dequeue: correct but O(n) each time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck and the insight:</strong> <span style="color:#f0e2c8;">"Leave the items in the outbox and only refill it when it is empty; then each item moves at most once."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Enqueue pushes to the inbox; dequeue and peek call refill, which only moves when the outbox is empty."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Enqueue, dequeue, then enqueue again while the outbox is not empty, and confirm the order stays FIFO."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the amortized cost constant if one dequeue can move everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each element is moved from inbox to outbox at most once in its lifetime, so total moves are bounded by the number of enqueues. Spread over all operations that is at most one extra move per element, a constant. Verified: 200,000 moves for 200,000 enqueues and 200,000 dequeues.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you build a stack from two queues?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The mirror problem: make either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> O(n) by moving all but the last item into the other queue. Unlike the two-stack queue, there is no amortization trick that makes both cheap, because a queue cannot reverse order the way a stack can.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you use in production JavaScript instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A single array with a moving head index (dequeue reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items[head++]</code> and occasionally compacts), a ring buffer, or a linked list; this bank's Deque question builds an O(1) structure. The two-stack version is mainly the classic interview exercise and a good way to reason about amortized cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does this matter for breadth-first search?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS needs a queue, and the usual <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.shift()</code> is fine for small graphs but became quadratic on large arrays here (7.7 s to drain 50,000 items, 146.7 s for 200,000). A real BFS over a big graph should use a queue with O(1) dequeue, which is the practical motivation for this structure.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Amortized O(1)** | The average cost per operation is constant over a whole sequence |
| **LIFO / FIFO** | Last-in-first-out (stack) / first-in-first-out (queue) |
| **Inbox / outbox** | The two stacks: one receives new items, one serves dequeues |

---
**Conclusion:** a FIFO queue from two LIFO stacks pushes new items onto an inbox and serves dequeues from an outbox, pouring the inbox into the outbox only when the outbox is EMPTY, which reverses the order so the oldest item is on top. It matched a plain array queue on 2,000 random sequences, the total number of element moves equalled the number of enqueues (1.00 per dequeue), and the single worst dequeue moved 100,000 items while the next moved none. Pouring into a non-empty outbox was shown to break FIFO, and on this Node an \`Array.shift()\` queue hit a steep performance cliff beyond about 10,000 items where the two-stack queue stayed under 3 ms.`,
    examples: [
      {
        label: "Real, direct proof: a two-stack queue matches an array queue on random operations, moves each element at most once, and avoids the shift() slowdown on large queues",
        tech: "javascript",
        runnable: true,
        code: `class TwoStackQueue {
  constructor() { this.inbox = []; this.outbox = []; this.moves = 0; }
  enqueue(x) { this.inbox.push(x); }
  refill() {
    if (this.outbox.length === 0) {
      while (this.inbox.length) { this.outbox.push(this.inbox.pop()); this.moves++; }
    }
  }
  dequeue() { this.refill(); return this.outbox.pop(); }
  peek() { this.refill(); return this.outbox[this.outbox.length - 1]; }
  get size() { return this.inbox.length + this.outbox.length; }
  isEmpty() { return this.size === 0; }
}

const q = new TwoStackQueue();
q.enqueue(1); q.enqueue(2); q.enqueue(3);
console.log("FIFO:", q.dequeue(), q.dequeue());
q.enqueue(4);
console.log("interleaved enqueue keeps FIFO:", q.dequeue(), q.dequeue(), "| empty:", q.isEmpty(), "| dequeue on empty:", q.dequeue(), "| peek on empty:", q.peek());

class TransferAlways {
  constructor() { this.a = []; this.b = []; }
  enqueue(x) { this.a.push(x); }
  dequeue() { while (this.a.length) this.b.push(this.a.pop()); return this.b.pop(); }
}
const bug = new TransferAlways();
bug.enqueue(1); bug.enqueue(2);
const first = bug.dequeue();
bug.enqueue(3);
console.log("the bug, refilling a non-empty outbox, gave", first, "then", bug.dequeue() + "," + bug.dequeue(), "(expected 1 then 2,3)");

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(8080);
let bad = 0;
for (let t = 0; t < 2000; t++) {
  const tq = new TwoStackQueue(), ref = [];
  for (let i = 0; i < 200; i++) {
    const r = rnd();
    if (r < 0.5) { tq.enqueue(i); ref.push(i); }
    else if (r < 0.85) { if (tq.dequeue() !== ref.shift()) bad++; }
    else if (tq.peek() !== ref[0]) bad++;
    if (tq.size !== ref.length) bad++;
  }
}
console.log("2,000 random operation sequences against an array queue, mismatches:", bad);

const aq = new TwoStackQueue();
let enq = 0, deq = 0;
for (let i = 0; i < 200000; i++) { aq.enqueue(i); enq++; if (i % 3 === 0) { aq.dequeue(); deq++; } }
while (!aq.isEmpty()) { aq.dequeue(); deq++; }
console.log("enqueues", enq, "| dequeues", deq, "| total element moves", aq.moves, "| moves <= enqueues:", aq.moves <= enq);

const wq = new TwoStackQueue();
for (let i = 0; i < 100000; i++) wq.enqueue(i);
const m0 = wq.moves;
wq.dequeue();
const worst = wq.moves - m0;
const m1 = wq.moves;
wq.dequeue();
console.log("worst single dequeue moved", worst, "elements | the next dequeue moved", wq.moves - m1);

for (const N of [10000, 20000]) {
  let t0 = Date.now();
  const arr = Array.from({ length: N }, (_, i) => i);
  while (arr.length) arr.shift();
  const tShift = Date.now() - t0;
  t0 = Date.now();
  const s = new TwoStackQueue();
  for (let i = 0; i < N; i++) s.enqueue(i);
  while (!s.isEmpty()) s.dequeue();
  console.log("N =", N, "| drain with Array.shift():", tShift, "ms | two-stack queue:", Date.now() - t0, "ms (timings are engine and machine specific)");
}`,
      },
    ],
  },
];

export default augments;
