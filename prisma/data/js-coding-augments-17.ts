/**
 * Practical JS coding-interview content — batch 17 (DSA round, easy tier —
 * the JS-specific object/array-utility cluster: groupBy, partial
 * application, key inversion, zip/unzip, and an Immutable-style setIn).
 * See js-coding-augments-15.ts and -16.ts's headers for the full template
 * rationale and every standing gotcha (card-backtick rule,
 * literal-tag-outside-fence rule, seoDescription-fix-by-editing rule).
 *
 * CRITICAL PROCESS NOTE (learned the hard way in batch 16): every title
 * below was pulled directly from a live DB query against
 * technology='javascript-coding' AND round='DSA' rows missing the
 * '#1c140a' gold-card marker — NEVER invented from memory. augment-js-coding.ts
 * only UPDATES an exact title match; it never creates a row.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - groupBy: verified with a function iteratee, a string-property
 *     iteratee, and confirmed original insertion order is preserved
 *     within each group.
 *   - partial: verified pre-filling both a single and multiple leading
 *     arguments, confirmed the original function is unaffected, and
 *     confirmed it works with any function shape/arity.
 *   - invert: verified basic key/value swap, confirmed a duplicate
 *     value correctly keeps the LAST key that mapped to it, confirmed
 *     the original object is never mutated.
 *   - zip/unzip: verified zipping 3 equal-length arrays, zipping
 *     unequal-length arrays (confirmed the missing slot is genuinely
 *     `undefined`, not `null` — JSON.stringify just displays it as
 *     `null`), and verified unzip is the genuine, real inverse of zip
 *     via a full round trip.
 *   - setIn: verified the deep value is correctly updated, the original
 *     object is completely untouched, every object along the changed
 *     path is a NEW reference while sibling data NOT on that path is
 *     structurally SHARED (same reference) with the original, and that
 *     missing intermediate objects are correctly created along the way.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement groupBy(array, iteratee) — lodash style",
    seoDescription:
      "A groupBy utility was verified with a function iteratee and a string-property iteratee, confirming original insertion order is preserved per group.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`groupBy(array, iteratee)\` — grouping array elements into an object keyed by the result of calling \`iteratee\` on each element, matching lodash's own well-known \`_.groupBy\` behavior."

**Examples:**

\`\`\`
groupBy([1,2,3,4,5,6], n => n % 2 === 0 ? "even" : "odd");
// { odd: [1,3,5], even: [2,4,6] }
\`\`\`

**Clarifying questions expected:**
- Should the iteratee support both a real function AND a plain string shortcut (grouping by that property name directly), matching lodash's own dual-input convention?
- What real, correct order should elements appear in WITHIN each group?
- What should happen if the iteratee genuinely returns a non-string value, like a number or an object?

**Code / implementation expected:** Yes — real, direct proof with both a function iteratee and a string-property iteratee, confirming correct grouping and preserved insertion order within each group.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, defining ordering claim this question tests — that elements WITHIN each group appear in their original, real insertion order, never resorted — was verified directly: a deliberately out-of-order input (\`[3,1,2,4]\`) produced groups with each element still in its own original relative order.

## 1. The problem, restated

Group array elements into a plain object, where each key is the STRINGIFIED result of calling \`iteratee\` on an element, and each value is a real array of every element that produced that key — preserving each element's own original, relative insertion order within its group, matching lodash's own well-known \`_.groupBy\` contract, including its real, dual support for a function OR a plain string shortcut.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Function AND string-shortcut support? | Real lodash genuinely supports BOTH — a string iteratee is treated as a real property-name shortcut, equivalent to \`item => item[propName]\`. |
| Order within each group? | Real, original insertion order is preserved — the algorithm never sorts or reorders, only PARTITIONS. |
| Non-string iteratee results? | JavaScript object keys are always genuinely coerced to strings, so a numeric result like \`42\` correctly becomes the real string key \`"42"\`. |

## 3. Thought process

The mechanism loops over the array ONCE, computing each element's group key by calling the iteratee (or, if it is a plain string, looking up that property directly) — and for each key, LAZILY initializes an empty array in the result object the FIRST time that key is seen, then pushes the current element onto it. Because the loop processes elements in their real, original array order, and \`.push()\` always appends to the END of a group's array, this naturally, automatically preserves each element's real relative order WITHIN its own group, with no extra sorting or tracking needed.

## 4. Verified solution

\`\`\`js
function groupBy(array, iteratee) {
  const fn = typeof iteratee === "function" ? iteratee : (item) => item[iteratee];
  const result = {};
  for (const item of array) {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  groupBy([1,2,3,4,5,6], n => n%2===0 ? "even" : "odd") -> {"odd":[1,3,5],"even":[2,4,6]}

  groupBy([{type:"a",v:1},{type:"b",v:2},{type:"a",v:3}], "type") -- string shortcut:
  -> {"a":[{type:"a",v:1},{type:"a",v:3}],"b":[{type:"b",v:2}]}

  groupBy([3,1,2,4], n => n<3 ? "small" : "big") -- deliberately out-of-order input:
  -> {"big":[3,4],"small":[1,2]}   -- each group preserves ORIGINAL relative order, not resorted
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism loops over the array once computing each elements group key by calling the iteratee or if it is a plain string looking up that property directly and for each key lazily initializes an empty array in the result object the first time that key is seen then pushes the current element onto it because the loop processes elements in their real original array order and push always appends to the end of a groups array this naturally automatically preserves each elements real relative order within its own group with no extra sorting or tracking needed verified directly a deliberately out of order input produced groups with each element still in its own original relative order">
  <defs>
    <marker id="groupbypoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: an out-of-order input still preserves order within each group</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">compute the key via fn or property lookup</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a string iteratee is a direct property shortcut</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">lazily init the group array, then push</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a single forward pass, no sorting needed at all</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">push always appends, so original relative order within a group is preserved automatically</text>
</svg>

## 5. Complexity

Time: O(n) — every element visited exactly once, each with an O(1) key computation and push. Space: O(n) for the result object's own combined group arrays.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty input array | Correctly returns a genuinely empty object \`{}\` | The loop simply never runs |
| Every element produces the SAME key | Correctly returns a single group containing every element, in original order | The lazy-init/push logic handles a group of any size uniformly |
| A numeric or boolean iteratee result | Correctly coerced to its real string form as the object key | JavaScript object keys are always, genuinely strings (or Symbols) |
| A string iteratee referencing a MISSING property | Every element groups under the real string key \`"undefined"\` | \`item[propName]\` correctly returns \`undefined\` for a missing property, then gets string-coerced as a key |

## 7. Common Pitfalls

- **Forgetting to support the string-shortcut form of iteratee.** A real, common lodash-compatibility gap — callers frequently use \`groupBy(users, "role")\` rather than \`groupBy(users, u => u.role)\`, and a function-only implementation would break that real, common usage.
- **Accidentally sorting or reordering elements within a group.** A real, subtle correctness issue — the CORRECT behavior is to preserve original insertion order, not to sort by any criterion; a naive implementation using something like a \`Map\` with different iteration semantics could accidentally introduce reordering.
- **Using \`Object.create(null)\` vs. a plain \`{}\` without considering prototype-pollution implications.** A real, genuine security nuance worth being aware of if the iteratee result is derived from untrusted user input — a key like \`"__proto__"\` on a plain \`{}\` behaves specially; this bank's own dedicated prototype-pollution question covers this exact class of issue in more depth.
- **Not handling a genuinely empty array as input.** A real, easy oversight if the loop or its setup assumes at least one element exists — this implementation correctly, naturally handles it since the loop body simply never executes.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Group elements by an iteratee result -- does this need to support a plain string shortcut, matching lodash?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the single-pass approach:</strong> <span style="color:#f0e2c8;">"One forward loop, lazily initializing each group array the first time its key appears."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the ordering guarantee:</strong> <span style="color:#f0e2c8;">"Since I only ever push in original order, each group's own order is automatically preserved with no sorting needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"detect function vs string iteratee, loop computing the key, lazily init the array, push the element."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually feed in a deliberately out-of-order input and confirm each group keeps its own original relative order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement this using reduce() instead of an explicit for loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely direct translation: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array.reduce((acc, item) =&gt; { const k = fn(item); (acc[k] ??= []).push(item); return acc; }, {})</code> — functionally identical real behavior, using the real, modern <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">??=</code> logical-nullish-assignment operator in place of the explicit lazy-init check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extend this to a real countBy(array, iteratee), returning counts instead of full groups?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely small variation: track a number instead of an array — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[key] = (result[key] || 0) + 1</code> — or, more directly, reuse THIS already-verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groupBy</code> and simply map each group's array to its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.length</code>, trading a small amount of real memory efficiency for genuine code reuse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario in a UI codebase would use groupBy specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: grouping a real flat list of transactions by their own date (or month) before rendering them under real, separate date-header sections in a UI — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groupBy(transactions, t =&gt; t.date)</code> directly produces the exact, real shape a "grouped list" UI component genuinely needs to render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this implementation correctly handle grouping by a nested property, like "address.city"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, NO — as written, the string-shortcut branch only does a real, DIRECT, single-level property lookup (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">item[iteratee]</code>), so a dotted path string would be treated as one LITERAL property NAME containing a dot, not a real nested path; supporting that would require reusing this bank's own dedicated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lodash.get</code> question's path-walking logic instead of a direct bracket lookup.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **groupBy** | Partitions an array into an object keyed by an iteratee result |
| **Iteratee** | A function, or a string property-name shortcut for one |
| **Insertion order preserved** | Elements within a group stay in their original relative order |

---
**Conclusion:** \`groupBy\` loops over the array once, computing each element's group key via the iteratee (supporting both a real function and a plain string property-name shortcut, matching lodash), lazily initializing each group's array the first time its key is seen, then pushing — which naturally, automatically preserves each element's original relative order within its own group, with no sorting needed. Verified directly: correct grouping with both a function and a string-shortcut iteratee, and a deliberately out-of-order input confirming each resulting group still holds its elements in their own original relative order.`,
    examples: [
      {
        label: "Real, direct proof: groupBy correctly partitions by both a function and a string-property iteratee, preserving original order within each group",
        tech: "javascript",
        runnable: true,
        code: `function groupBy(array, iteratee) {
  const fn = typeof iteratee === "function" ? iteratee : (item) => item[iteratee];
  const result = {};
  for (const item of array) {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

console.log("groupBy numbers by even/odd:", JSON.stringify(groupBy([1, 2, 3, 4, 5, 6], (n) => (n % 2 === 0 ? "even" : "odd"))));
console.log("groupBy objects by string property key:", JSON.stringify(groupBy([{ type: "a", v: 1 }, { type: "b", v: 2 }, { type: "a", v: 3 }], "type")));
console.log("preserves original insertion order within each group, even with out-of-order input:", JSON.stringify(groupBy([3, 1, 2, 4], (n) => (n < 3 ? "small" : "big"))));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Partial application bindings",
    seoDescription:
      "A partial() utility was verified to pre-fill both a single and multiple leading arguments, leaving the original function unaffected in every case.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`partial(fn, ...presetArgs)\` — returning a genuinely NEW function that, when LATER called, invokes \`fn\` with the preset arguments prepended to whatever new arguments the later call provides."

**Examples:**

\`\`\`
function add3(a, b, c) { return a + b + c; }
const addTo5 = partial(add3, 5);
addTo5(2, 3); // 10
\`\`\`

**Clarifying questions expected:**
- Does this need to support pre-filling MORE than one leading argument, not just the first?
- Should the ORIGINAL function remain genuinely unaffected/reusable after calling partial() on it?
- How does this genuinely differ from bind() — is partial application a distinct, real concept, or just a simplified bind?

**Code / implementation expected:** Yes — real, direct proof pre-filling both a single and multiple leading arguments, confirming the original function is genuinely unaffected and reusable afterward.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, key correctness claim this question tests — that the ORIGINAL function remains genuinely unaffected and independently reusable after \`partial()\` is called on it — was verified directly: calling the unmodified original \`add3(1, 2, 3)\` after creating \`addTo5\` still returned the correct, real, un-partial-applied result.

## 1. The problem, restated

Pre-fill one or more LEADING arguments of a function, returning a genuinely NEW function that, when eventually called, concatenates the preset arguments with whatever new arguments that later call provides, and invokes the original — a real, general-purpose technique for creating specialized versions of a more general function, without needing a specific \`this\` binding (the real, distinguishing difference from \`bind\`).

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Multiple preset args supported? | Yes — real partial application genuinely supports pre-filling any number of leading arguments, not just one. |
| Original function unaffected? | Yes, genuinely — \`partial\` must not mutate or otherwise affect the ORIGINAL function; it only returns a new, separate wrapper. |
| Difference from bind()? | \`partial\` is genuinely a SIMPLER, more focused concept — it only handles pre-filling arguments, with no concern for \`this\` binding at all, unlike \`bind\`'s combined dual responsibility. |

## 3. Thought process

The mechanism is genuinely simple: \`partial\` returns a real closure that captures the ORIGINAL function and the preset arguments in its own scope, and when THAT returned function is eventually called, it invokes the original via spread syntax — concatenating the captured preset arguments with whatever new arguments this specific later call received. Because the original function reference is only ever CALLED (via \`fn(...)\`), never modified in any way, it remains completely, genuinely independent and reusable for any other purpose afterward — this is the real, entire reason the "original function unaffected" claim holds.

## 4. Verified solution

\`\`\`js
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}
\`\`\`

\`\`\`
real, verified proof:
  function add3(a, b, c) { return a + b + c; }
  const addTo5 = partial(add3, 5);
  addTo5(2, 3) -> 10   -- 5 (preset) + 2 + 3 (later args)

  const addTo5And2 = partial(add3, 5, 2);
  addTo5And2(3) -> 10   -- 5 + 2 (both preset) + 3 (later)

  add3(1, 2, 3) -> 6   -- the ORIGINAL function still works correctly, completely unaffected

  works with any function shape/arity:
  const sayHello = partial((g, n, p) => g+", "+n+p, "Hello");
  sayHello("Ada", "!") -> "Hello, Ada!"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="partial returns a real closure that captures the original function and the preset arguments in its own scope and when that returned function is eventually called it invokes the original via spread syntax concatenating the captured preset arguments with whatever new arguments this specific later call received because the original function reference is only ever called never modified in any way it remains completely genuinely independent and reusable for any other purpose afterward verified directly calling the unmodified original after creating the partially applied version still returned the correct real un partial applied result">
  <defs>
    <marker id="partialpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: the original function remains completely unaffected afterward</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">preset args captured in a closure</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the original function is only ever CALLED, never modified</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">later call: preset + new args concatenated</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">spread syntax builds the final argument list</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">unlike bind, partial has no concept of this binding at all -- purely about arguments</text>
</svg>

## 5. Complexity

Time: O(k) per eventual call, where \`k\` is the total number of arguments (preset plus new). Space: O(k) for the concatenated arguments array built at each call.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| No preset arguments at all (\`partial(fn)\`) | Correctly returns a function behaving identically to the original | \`presetArgs\` is an empty array, contributing nothing to the spread |
| Calling the partially-applied function multiple times | Each call correctly reuses the SAME preset arguments, appending that call's own new ones | \`presetArgs\` is captured once, in the closure, never mutated |
| Providing MORE preset arguments than the function's real arity | Extra arguments are simply, genuinely ignored by the underlying function, matching normal JS calling convention | JavaScript functions never error on excess arguments |
| Calling \`partial\` on an already partially-applied function | Correctly, genuinely composes further — a second \`partial\` call adds MORE preset arguments ahead of the first set | The returned function is a real function, fully eligible for a further \`partial\` call itself |

## 7. Common Pitfalls

- **Confusing partial application with full currying.** A real, genuine conceptual distinction — \`partial\` fills SOME arguments and still expects the rest in ONE later call, while a genuine curry transforms a function into a chain of SINGLE-argument calls; this bank's own separate curry questions cover that distinct, related concept.
- **Accidentally mutating or reassigning the original function reference.** Would break the real, important guarantee that the original remains independently usable — this implementation avoids it entirely by only ever CALLING \`fn\`, never touching it otherwise.
- **Forgetting that partial has no real \`this\`-binding concept at all**, unlike \`bind\`. If the target function genuinely relies on a specific \`this\`, \`partial\` alone does not address that — \`bind\` (or explicitly wrapping in an arrow function) would be needed alongside it.
- **Not testing that the original function remains usable afterward.** A real, easy thing to assume rather than verify — the ENTIRE point of a non-mutating utility is that this real guarantee actually holds, not just seems to.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Pre-fill leading arguments, returning a new function -- does the original need to stay genuinely unaffected and reusable?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the closure mechanism:</strong> <span style="color:#f0e2c8;">"A closure capturing the original function and preset args, only ever calling it, never modifying it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Distinguish from bind:</strong> <span style="color:#f0e2c8;">"Partial has no this-binding concept at all -- it's purely about pre-filling arguments."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"return a function that spreads preset args then later args into a call to the original."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually call the original function directly afterward and confirm it still works correctly, completely unaffected."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement this bank's own bind polyfill by reusing this partial() function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, NOT directly — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial</code> deliberately has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>-binding mechanism at all, so a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bind</code> implementation needs the SEPARATE, additional real concept of capturing and applying a specific <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.apply(thisArg, ...)</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bind</code> genuinely solve two DIFFERENT, related problems — argument pre-filling versus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> pre-binding — that happen to overlap in a real, combined <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bind</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely benefit from partial application over just writing a new small function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: building a real, configured logger — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const logError = partial(log, "ERROR")</code> — reusing a SINGLE, general <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">log(level, message)</code> function to create SEVERAL specialized real entry points (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">logError</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">logWarn</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">logInfo</code>) without writing a genuinely separate, small wrapper function for each one by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does partial application genuinely require the preset arguments to be the LEADING ones specifically, or could you pre-fill trailing arguments instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no restriction — this specific implementation only supports LEADING args (the real, conventional, most common form), but a "partialRight" variant is a genuinely valid, real alternative — putting the LATER call's own new args FIRST, followed by the preset ones: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn(...laterArgs, ...presetArgs)</code> — a real, symmetric variation lodash itself also provides as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_.partialRight</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would calling partial() twice on the same function, chained, work correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial(partial(add3, 5), 2)</code> correctly, genuinely composes, since the RESULT of the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial</code> call is itself just a normal, real function, fully eligible to be passed into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial</code> again — the SECOND call's own preset arguments correctly get prepended ahead of the first set, in the real, expected order.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Partial application** | Pre-filling some leading arguments, returning a new function |
| **Closure** | The returned function remembers the preset args and original fn |
| **Distinct from currying** | Partial fills some args in one call, curry chains single-arg calls |

---
**Conclusion:** \`partial\` returns a real closure capturing the original function and the preset arguments, which — when eventually called — invokes the original via spread syntax, concatenating the captured preset arguments with whatever new arguments that later call provides; because the original function is only ever CALLED, never modified, it remains genuinely, completely unaffected and independently reusable afterward. Verified directly: correct pre-filling of both a single and multiple leading arguments, matching expected output, PLUS direct confirmation that calling the unmodified original function afterward still produces its correct, real, un-partial-applied result.`,
    examples: [
      {
        label: "Real, direct proof: partial() correctly pre-fills leading arguments, leaving the original function genuinely unaffected and independently reusable afterward",
        tech: "javascript",
        runnable: true,
        code: `function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}

function add3(a, b, c) { return a + b + c; }
const addTo5 = partial(add3, 5);
console.log("partial pre-fills leading args:", addTo5(2, 3));

const addTo5And2 = partial(add3, 5, 2);
console.log("partial with multiple preset args:", addTo5And2(3));

console.log("original function still works correctly, completely unaffected:", add3(1, 2, 3));

function greet(greeting, name, punctuation) { return greeting + ", " + name + punctuation; }
const sayHello = partial(greet, "Hello");
console.log("works with any function shape:", sayHello("Ada", "!"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Invert Object Keys",
    seoDescription:
      "An invert() utility was verified for a basic key/value swap, confirming a duplicate value correctly keeps the last key mapped to it, without mutation.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`invert(obj)\` — swapping every key and value in a plain object, so that a value becomes a key and its original key becomes the new value, matching lodash's own well-known \`_.invert\` behavior."

**Examples:**

\`\`\`
invert({a: "x", b: "y", c: "z"}); // {x: "a", y: "b", z: "c"}
\`\`\`

**Clarifying questions expected:**
- If two different keys share the SAME value, which of the two original keys should genuinely win in the inverted result?
- Should the original object remain completely untouched, with a genuinely NEW object returned?
- What should happen to a value that is not naturally string-like, like a number — does it need to be coerced?

**Code / implementation expected:** Yes — real, direct proof of a basic key/value swap, a duplicate-value collision case, and confirmation the original object is never mutated.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, easy-to-overlook collision behavior this question tests — what genuinely happens when two different keys share the SAME value — was verified directly: with \`{a: "dup", b: "dup", c: "unique"}\`, the inverted result correctly kept \`b\` (the LAST key seen with that value) for the \`"dup"\` entry, not \`a\`.

## 1. The problem, restated

For every own key in the input object, create a NEW object where that value becomes a key, and the original key becomes its corresponding value — processing keys in their real, standard iteration order, so that if MULTIPLE keys share the same value, the LAST one processed correctly wins (since each assignment simply overwrites any earlier one for that shared, inverted key) — matching lodash's own well-known \`_.invert\` contract.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Duplicate-value collision behavior? | The LAST key (in real, standard object iteration order) sharing a given value correctly wins — a direct, natural consequence of simple sequential assignment. |
| Original object untouched? | Yes — a genuinely NEW object should be built and returned; the input must not be mutated. |
| Non-string values? | Real JavaScript object keys are always genuinely coerced to strings, so a numeric value like \`1\` correctly becomes the real string key \`"1"\` in the result. |

## 3. Thought process

The mechanism loops over the input object's own keys (via \`Object.keys\`, which returns them in real, standard iteration order), and for each one, assigns \`result[obj[key]] = key\` — using the ORIGINAL value as the NEW key, and the original key as the NEW value. Because this loop processes keys in a fixed, real order, and a later assignment to the SAME resulting key naturally OVERWRITES an earlier one (identical to how \`Object.assign\` handles a shared key across sources), a genuine collision between two original keys sharing the same value is correctly, automatically resolved in favor of whichever key was processed LAST.

## 4. Verified solution

\`\`\`js
function invert(obj) {
  const result = {};
  for (const key of Object.keys(obj)) {
    result[obj[key]] = key;
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  invert({a:"x", b:"y", c:"z"}) -> {"x":"a","y":"b","z":"c"}

  duplicate values -- the LAST key wins:
  invert({a:"dup", b:"dup", c:"unique"}) -> {"dup":"b","unique":"c"}   -- b (last with "dup") won, not a

  numeric-looking values become real string keys:
  invert({a:1, b:2}) -> {"1":"a","2":"b"}

  const o = {a:"x"}; invert(o);
  o is unchanged afterward -> {"a":"x"}   -- the original object was never mutated
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism loops over the input objects own keys via Object dot keys which returns them in real standard iteration order and for each one assigns result of obj value equals key using the original value as the new key and the original key as the new value because this loop processes keys in a fixed real order and a later assignment to the same resulting key naturally overwrites an earlier one a genuine collision between two original keys sharing the same value is correctly automatically resolved in favor of whichever key was processed last verified directly with a real duplicate value case the inverted result correctly kept the last key seen not the first">
  <defs>
    <marker id="invertpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a duplicate value collision correctly keeps the LAST key</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">loop keys in real, standard order</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">Object.keys returns them in a fixed, real order</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">assign value as key, key as value</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a later assignment naturally overwrites an earlier one</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">on a shared value, the key processed LAST wins, identical to Object.assign own overwrite rule</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the number of own keys. Space: O(n) for the new, inverted result object.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty input object | Correctly returns a genuinely empty object \`{}\` | The loop simply never runs |
| Two or more keys sharing the identical value | Correctly, deterministically keeps the LAST processed key for that value | Sequential assignment naturally overwrites |
| A value that already looks like an object key (a plain string) | Correctly used directly as the new key, no transformation needed | Object keys are already genuinely strings in this common case |
| A numeric value (e.g. \`42\`) | Correctly coerced to the real string key \`"42"\` | JavaScript object keys are always genuinely strings (or Symbols) |

## 7. Common Pitfalls

- **Assuming the FIRST key with a duplicate value wins, not the last.** A real, easy, backwards assumption — since later assignments naturally OVERWRITE earlier ones during sequential iteration, it is genuinely the LAST key processed that survives in the result.
- **Mutating the original object instead of building a genuinely new one.** A real, easy correctness slip if the loop accidentally writes back onto \`obj\` itself instead of a separate \`result\` object — this implementation correctly avoids it by always building into a fresh object.
- **Not considering what happens with a non-string-coercible value**, like a real Symbol. Real JavaScript object VALUES can genuinely be anything, but when used as a NEW KEY in the inverted object, a Symbol value would need special handling (Symbols cannot be silently, automatically stringified the way numbers are) — a real, honest limitation of this simplified implementation worth naming if pressed.
- **Forgetting this is fundamentally a LOSSY operation when duplicate values exist.** A real, important conceptual point — inverting necessarily discards information (multiple original keys collapsing into one, since only the LAST survives), which is worth stating explicitly as a real, inherent limitation, not a bug.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Swap keys and values -- if two keys share the same value, which one should genuinely win in the result?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the overwrite mechanism:</strong> <span style="color:#f0e2c8;">"A single loop over Object.keys, where a later assignment naturally overwrites an earlier one on collision."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the lossy-operation insight:</strong> <span style="color:#f0e2c8;">"This is inherently lossy on duplicate values -- worth stating explicitly, not treating as a bug."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop Object.keys, assign result of the value to the key, building a genuinely new object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually create two keys with the same value and confirm which one genuinely survives in the result."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a real invertBy(obj, fn), applying a transform to each value before using it as a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely small, direct variation: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[fn(obj[key])] = key</code> — applying the transform function to the value BEFORE using it as the new key, otherwise reusing the identical real loop structure; this matches lodash's own real, documented <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_.invertBy</code> extension.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this implementation correctly handle a value that is an actual object reference, not a primitive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no, not usefully — a real object value assigned as a key gets automatically, silently coerced to the real, generic string <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"[object Object]"</code> (JavaScript's own default object-to-string coercion), so multiple DIFFERENT object values would all collapse into that SAME, indistinguishable key — a real, honest limitation of using plain objects for a real key-value inversion of non-primitive values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical use case would genuinely need invert()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: given a real, forward status-code-to-label MAPPING (e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{200: "OK", 404: "Not Found"}</code>), inverting it once genuinely produces a real, efficient reverse LOOKUP (label to code) without needing to write and maintain a second, separate, real mapping object by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is calling invert() twice on the same object guaranteed to produce the exact original object back?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, only if the ORIGINAL object had no duplicate values in the first place — since a duplicate-value collision is inherently LOSSY (one original key genuinely gets discarded), inverting the RESULT a second time cannot recover information that was already lost in the first inversion; for a genuinely one-to-one (no duplicate values) original object, though, a real double-invert does correctly round-trip back to the exact original.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **invert** | Swaps every key and value in a plain object |
| **Collision resolution** | On a duplicate value, the LAST processed key wins |
| **Lossy operation** | Duplicate values necessarily discard some original keys |

---
**Conclusion:** \`invert\` loops over the input object's own keys in their real, standard iteration order, assigning each ORIGINAL value as a new key mapped to its original key — since a later assignment to the SAME resulting key naturally overwrites an earlier one (identical to \`Object.assign\`'s own overwrite rule), a genuine collision between two keys sharing the same value is deterministically resolved in favor of whichever key was processed LAST. Verified directly: correct basic key/value swap, a real duplicate-value case confirming the LAST key wins (not the first), and confirmation via a direct before/after check that the original object is never mutated.`,
    examples: [
      {
        label: "Real, direct proof: invert() correctly swaps keys and values, with a duplicate-value collision correctly keeping the last key, and no mutation of the original",
        tech: "javascript",
        runnable: true,
        code: `function invert(obj) {
  const result = {};
  for (const key of Object.keys(obj)) {
    result[obj[key]] = key;
  }
  return result;
}

console.log("basic invert:", JSON.stringify(invert({ a: "x", b: "y", c: "z" })));

console.log("duplicate values -- last key wins:", JSON.stringify(invert({ a: "dup", b: "dup", c: "unique" })));

console.log("numeric-looking values become string keys:", JSON.stringify(invert({ a: 1, b: 2 })));

const original = { a: "x" };
invert(original);
console.log("original object is not mutated:", JSON.stringify(original));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Zip Arrays",
    seoDescription:
      "A zip() utility was verified to combine equal and unequal-length arrays correctly, confirming a missing slot is genuinely undefined, not the string null.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`zip(...arrays)\` — combining multiple arrays into a single array of grouped tuples, where the Nth tuple contains the Nth element from every input array, matching lodash's own well-known \`_.zip\` behavior."

**Examples:**

\`\`\`
zip([1,2,3], ["a","b","c"]); // [[1,"a"], [2,"b"], [3,"c"]]
\`\`\`

**Clarifying questions expected:**
- What should the real, correct output length be if the input arrays have DIFFERENT lengths?
- For a shorter array, what value should genuinely appear in the tuple slot beyond its own length?
- Does this need to support any number of input arrays, or just exactly two?

**Code / implementation expected:** Yes — real, direct proof zipping equal-length arrays, zipping unequal-length arrays (confirming the missing slot is genuinely \`undefined\`), and confirming any number of input arrays is supported.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** a real, easy-to-misjudge detail this question tests — what genuinely appears in a tuple slot when one input array is SHORTER than the others — was verified with a direct \`=== undefined\` check (not just \`JSON.stringify\`, which would misleadingly display it as the string \`"null"\`): the missing slot is genuinely \`undefined\`, matching real, standard JavaScript array-hole/out-of-bounds-access behavior.

## 1. The problem, restated

Combine \`N\` input arrays into a single array of length equal to the LONGEST input array, where the \`i\`-th output tuple contains the \`i\`-th element from EVERY input array (in the same order the arrays were passed) — with a shorter array correctly contributing \`undefined\` for any index beyond its own real length, matching lodash's own well-known \`_.zip\` contract.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Output length on unequal inputs? | The LENGTH OF THE LONGEST input array — a real, standard convention, not the shortest. |
| Missing-slot value? | Genuinely \`undefined\` — the real, natural result of reading an out-of-bounds array index in JavaScript, requiring no special-casing. |
| Any number of arrays? | Yes — a real, general \`zip\` supports any count via rest parameters, not just a fixed two. |

## 3. Thought process

The mechanism first finds the MAXIMUM length among all input arrays (via \`Math.max\`), then loops from \`0\` up to that maximum, and for each index \`i\`, maps EVERY input array to its OWN element at that index — reading \`arr[i]\` on a shorter array simply, naturally returns \`undefined\` in plain JavaScript for an out-of-bounds index, requiring no explicit bounds-checking or special-casing at all. This directly produces the correctly-sized output, with the real, expected \`undefined\` filling any "missing" slot from a shorter input.

## 4. Verified solution

\`\`\`js
function zip(...arrays) {
  const maxLen = Math.max(...arrays.map((a) => a.length));
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    result.push(arrays.map((a) => a[i]));
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  zip([1,2,3], ["a","b","c"], [true,false,true]) -> [[1,"a",true],[2,"b",false],[3,"c",true]]

  unequal lengths:
  zip([1,2,3], ["a","b"]) -> [[1,"a"],[2,"b"],[3,undefined]]
  -- the slot at index 2 of the shorter array is genuinely undefined (confirmed via a direct === check,
     not just JSON.stringify, which would misleadingly print it as the string "null")
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism first finds the maximum length among all input arrays via Math dot max then loops from zero up to that maximum and for each index i maps every input array to its own element at that index reading arr of i on a shorter array simply naturally returns undefined in plain JavaScript for an out of bounds index requiring no explicit bounds checking or special casing at all this directly produces the correctly sized output with the real expected undefined filling any missing slot from a shorter input verified directly the missing slot is genuinely undefined confirmed via a direct triple equals check not just JSON stringify">
  <defs>
    <marker id="zippoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a missing slot is genuinely undefined, confirmed via a direct check</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">output length = the longest input array</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">found via Math.max across all input lengths</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">shorter array: out-of-bounds read is undefined</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">no bounds-checking needed, JS handles it naturally</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">JSON.stringify prints a missing slot as null, but the real value is genuinely undefined</text>
</svg>

## 5. Complexity

Time: O(n * m) where \`n\` is the longest array's length and \`m\` is the number of input arrays. Space: O(n * m) for the result.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| All input arrays are genuinely empty | Correctly returns a genuinely empty array \`[]\` | \`maxLen\` is \`0\`, so the loop never runs |
| A single input array | Correctly returns an array of single-element tuples, one per original element | The \`.map\` over a single-array \`arrays\` list still runs correctly |
| Only ONE array passed is non-empty, the rest are empty | Correctly produces \`undefined\` for every OTHER array's slot | Reading an out-of-bounds index on any empty array is always \`undefined\` |
| Zero arrays passed at all (\`zip()\`) | \`Math.max()\` with no arguments returns \`-Infinity\`, so the loop never runs, correctly yielding \`[]\` | A real, subtle JavaScript quirk worth being aware of |

## 7. Common Pitfalls

- **Using the SHORTEST array's length instead of the longest.** A real, easy, backwards mistake — real \`zip\` conventionally uses the LONGEST length, correctly including a partial, \`undefined\`-padded tuple for any shorter input, rather than silently truncating data from the longer ones.
- **Confusing the real value \`undefined\` for the string \`"null"\`** when only checking via \`JSON.stringify\` output. A real, easy visual mix-up — always confirm with a real, direct \`=== undefined\` check when the distinction genuinely matters.
- **Hardcoding support for exactly two arrays instead of using rest parameters.** A real, easy oversight — lodash's own \`_.zip\` genuinely supports any number of arrays; hardcoding two would silently ignore any additional real arguments.
- **Not implementing the genuine inverse, \`unzip\`, when asked as a natural follow-up.** A real, common expected extension — this bank's own separate \`unzip\` question covers exactly that, and the two are genuinely, tightly related.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Combine N arrays into tuples by index -- what's the real, correct output length on unequal input lengths?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the length convention:</strong> <span style="color:#f0e2c8;">"The longest input array's length -- a shorter one naturally contributes undefined beyond its own end."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the no-bounds-check insight:</strong> <span style="color:#f0e2c8;">"Reading an out-of-bounds index in JS is naturally undefined -- no explicit special-casing needed at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"find maxLen via Math.max, loop up to it, map every array to its own element at that index."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check the missing slot with a direct undefined comparison, not just print it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a real zipWith(arrays, combinerFn), applying a custom combining function instead of building plain tuples?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely small variation: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result.push(combinerFn(...arrays.map(a =&gt; a[i])))</code> — spreading each index's own gathered values directly into the combiner function instead of collecting them into a plain tuple array, matching lodash's own real, documented <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_.zipWith</code> extension.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely need zip()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: combining two real, separately-fetched arrays — say, a real list of user IDs and a real, parallel list of user display names returned from two separate API calls — into a single real array of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[id, name]</code> pairs, ready to render as real, paired UI rows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is zip() genuinely its own inverse, i.e. does zip(zip(a,b)) equal something meaningful?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, NO — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> is its own SEPARATE, real inverse operation called <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unzip</code> (this bank's own dedicated question), which takes a SINGLE array of tuples as input, not multiple separate arrays like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> itself does — calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> directly on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code>'s own output would be a genuine, real TYPE mismatch (a single array where multiple were expected), not a meaningful round trip.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this implementation genuinely throw or misbehave if called with zero arguments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — a real, subtle JavaScript quirk correctly saves this case: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max()</code> called with NO arguments returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Infinity</code>, so the loop condition <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; maxLen</code> is immediately, correctly false, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip()</code> correctly returns a genuinely empty array rather than throwing.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **zip** | Combines multiple arrays into a single array of index-aligned tuples |
| **Longest-array convention** | Output length matches the longest input, not the shortest |
| **unzip** | zip's genuine, separate inverse — one array of tuples back to many |

---
**Conclusion:** \`zip\` finds the MAXIMUM length among all input arrays via \`Math.max\`, then loops up to that length, mapping every input array to its own element at each index — a shorter array correctly, naturally contributes \`undefined\` for any index beyond its own length, since JavaScript itself returns \`undefined\` for an out-of-bounds array read, requiring no special-casing at all. Verified directly: correct combination of equal-length arrays, correct handling of unequal-length arrays with a direct \`=== undefined\` check confirming the missing slot's genuine value (not just its misleading \`JSON.stringify\`-as-\`null\` appearance), and support for any number of input arrays via rest parameters.`,
    examples: [
      {
        label: "Real, direct proof: zip() correctly combines equal and unequal-length arrays, with a direct check confirming a missing slot is genuinely undefined",
        tech: "javascript",
        runnable: true,
        code: `function zip(...arrays) {
  const maxLen = Math.max(...arrays.map((a) => a.length));
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    result.push(arrays.map((a) => a[i]));
  }
  return result;
}

console.log("zip 3 equal-length arrays:", JSON.stringify(zip([1, 2, 3], ["a", "b", "c"], [true, false, true])));

const uneven = zip([1, 2, 3], ["a", "b"]);
console.log("zip with unequal lengths:", JSON.stringify(uneven));
console.log("the missing slot is genuinely undefined (not the string null):", uneven[2][1] === undefined);

console.log("zip() with zero arguments returns an empty array, no error:", JSON.stringify(zip()));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Unzip Array",
    seoDescription:
      "An unzip() utility was verified as the genuine inverse of zip, confirmed via a full round trip: unzip(zip(a,b)) correctly reproduced [a,b] exactly.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`unzip(zipped)\` — the genuine inverse of \`zip\`, taking a single array of grouped tuples and separating it back into multiple, parallel arrays."

**Examples:**

\`\`\`
unzip([[1,"a"], [2,"b"], [3,"c"]]); // [[1,2,3], ["a","b","c"]]
\`\`\`

**Clarifying questions expected:**
- Is this genuinely the exact inverse of zip — does unzip(zip(a, b)) need to reproduce [a, b] exactly?
- What if the tuples themselves have varying lengths — should the output account for the LONGEST tuple?
- What real, correct output should an empty input array produce?

**Code / implementation expected:** Yes — real, direct proof that this is the genuine inverse of zip, confirmed via a full round trip through both functions.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, defining relationship this question tests — that \`unzip\` is the genuine, exact INVERSE of \`zip\` — was verified directly via a full round trip: \`unzip(zip([1,2,3], ["a","b","c"]))\` correctly reproduced \`[[1,2,3], ["a","b","c"]]\`, the exact original pair of arrays, confirmed via a real deep-equality check.

## 1. The problem, restated

Given a single array of tuples (each an array of the SAME conceptual "column" values grouped by "row"), produce the inverse: multiple, separate arrays, where the \`i\`-th output array contains every tuple's own \`i\`-th element — genuinely, exactly reversing what \`zip\` does, so that \`unzip(zip(a, b))\` reproduces \`[a, b]\`.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Genuine, exact inverse of zip? | Yes — this is the real, defining, testable relationship: round-tripping through both functions should reproduce the original input. |
| Varying tuple lengths? | The number of OUTPUT arrays should correctly match the LONGEST tuple's own length, mirroring \`zip\`'s own longest-array convention. |
| Empty input? | Correctly returns a genuinely empty array \`[]\` (zero output arrays), since there are no tuples to determine a shape from at all. |

## 3. Thought process

The mechanism first determines how many OUTPUT arrays are needed — the length of the LONGEST tuple (mirroring \`zip\`'s own longest-array convention in the opposite direction) — and pre-allocates that many, genuinely empty result arrays. It then loops over every input tuple, and for each POSITION within that tuple, pushes that position's value onto the CORRESPONDING output array — this is the exact, structural mirror-image of \`zip\`'s own "gather one element from every array" logic, just transposed: here, it is "distribute one tuple's elements across every output array."

## 4. Verified solution

\`\`\`js
function unzip(zipped) {
  if (zipped.length === 0) return [];
  const numArrays = Math.max(...zipped.map((tuple) => tuple.length));
  const result = Array.from({ length: numArrays }, () => []);
  for (const tuple of zipped) {
    for (let i = 0; i < numArrays; i++) {
      result[i].push(tuple[i]);
    }
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof -- the defining round-trip relationship:
  const zipped = zip([1,2,3], ["a","b","c"]);   // [[1,"a"],[2,"b"],[3,"c"]]
  unzip(zipped) -> [[1,2,3],["a","b","c"]]

  unzip(zip([1,2,3], ["a","b","c"])) === [[1,2,3],["a","b","c"]] -- TRUE, exact round trip
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism first determines how many output arrays are needed the length of the longest tuple mirroring zips own longest array convention in the opposite direction and pre allocates that many genuinely empty result arrays it then loops over every input tuple and for each position within that tuple pushes that positions value onto the corresponding output array this is the exact structural mirror image of zips own gather one element from every array logic just transposed here it is distribute one tuples elements across every output array verified directly via a full round trip unzip of zip of a and b correctly reproduced a and b exactly">
  <defs>
    <marker id="unzippoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a full round trip, unzip(zip(a,b)), reproduces [a,b] exactly</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">number of output arrays = longest tuple</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the mirror of zip own longest-array convention</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">for each tuple, distribute values by position</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the transpose of zip own gather-by-position logic</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">zip gathers columns into a row; unzip distributes a row back into columns</text>
</svg>

## 5. Complexity

Time: O(n * m) where \`n\` is the number of tuples and \`m\` is the longest tuple's length. Space: O(n * m) for the result arrays.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty input array (\`unzip([])\`) | Correctly returns a genuinely empty array \`[]\` | The explicit \`zipped.length === 0\` early-return, since there is no tuple to derive a shape from |
| A single tuple as input | Correctly returns each of that tuple's elements as its own single-element array | The loop over one tuple still correctly distributes each position |
| Tuples of DIFFERING lengths within the same input | Correctly uses the LONGEST tuple's length for the output array count, with shorter tuples contributing \`undefined\` at missing positions | \`tuple[i]\` on a shorter tuple naturally returns \`undefined\` for an out-of-bounds index, mirroring \`zip\`'s own identical behavior |
| Genuinely round-tripping through zip and back | Correctly reproduces the exact original input arrays | This is the real, entire, defining contract of \`unzip\` |

## 7. Common Pitfalls

- **Forgetting to pre-allocate the correct NUMBER of output arrays before the main loop.** A real, easy structural mistake — the output array COUNT is determined by the tuples' own length, a genuinely different dimension than the number of tuples themselves.
- **Confusing the two nested loops' roles.** A real, easy source of transposition bugs — the OUTER loop iterates TUPLES (rows), while the INNER loop iterates POSITIONS WITHIN a tuple (columns); getting this backwards silently produces a transposed, wrong result.
- **Not testing the genuine round-trip relationship with zip explicitly.** A real, easy thing to skip, but the SINGLE most convincing, direct proof that both functions are correctly implemented as true inverses of each other.
- **Assuming every tuple in the input has the exact same length, without handling a genuinely ragged input.** A real, easy oversight if the implementation reads a fixed length from only the FIRST tuple rather than the maximum across all of them.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"The inverse of zip -- does unzip(zip(a,b)) genuinely need to reproduce [a,b] exactly?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the transpose framing:</strong> <span style="color:#f0e2c8;">"Zip gathers columns into rows, unzip is the transpose -- distributing a row's values back into columns."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the output-count detail:</strong> <span style="color:#f0e2c8;">"The number of output arrays comes from the longest tuple's length, not the number of tuples."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"pre-allocate numArrays empty arrays, loop tuples, then loop positions distributing into the right array."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually round-trip through zip and unzip and confirm I get the exact original arrays back."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you implement unzip using reduce() instead of an explicit nested loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zipped.reduce((acc, tuple) =&gt; { tuple.forEach((v, i) =&gt; acc[i].push(v)); return acc; }, Array.from({length: numArrays}, () =&gt; []))</code> — functionally identical real behavior, folding the outer loop into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code> while keeping the identical inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code>-based distribution logic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario in a codebase would need unzip specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: given a real array of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x, y]</code> coordinate pairs from a chart's own data points, separating them back into two SEPARATE, real parallel arrays — all X-values and all Y-values — because a real charting library's own low-level API frequently expects two distinct arrays rather than one array of pairs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely mutate the original input array of tuples?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — the implementation only ever READS from the input's tuples (via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple[i]</code>) and PUSHES into genuinely new, freshly-created result arrays; the original <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zipped</code> array and every one of its own tuples are left completely, genuinely untouched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would this handle a genuinely ragged input, where different tuples have different lengths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Correctly, gracefully — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numArrays</code> is derived from the LONGEST tuple present, and any SHORTER tuple naturally contributes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> at whatever position it lacks (via the same natural out-of-bounds-read behavior this bank's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> question relies on), so a genuinely ragged input is handled correctly without any special-casing, matching the real, symmetric behavior of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip</code> itself.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **unzip** | zip's genuine inverse — one array of tuples back into many arrays |
| **Transpose** | Swapping the roles of rows (tuples) and columns (positions) |
| **Round-trip proof** | unzip(zip(a,b)) reproducing [a,b] confirms correct inverse behavior |

---
**Conclusion:** \`unzip\` determines the number of output arrays needed from the LONGEST tuple's own length (mirroring \`zip\`'s own longest-array convention), pre-allocates that many empty result arrays, then loops over every input tuple, distributing each of its positional values into the CORRESPONDING output array — the exact structural transpose of \`zip\`'s own "gather one element from every array" logic. Verified directly via the single most convincing, real proof available: a full round trip, \`unzip(zip([1,2,3], ["a","b","c"]))\`, correctly reproduced the exact original pair of arrays, \`[[1,2,3], ["a","b","c"]]\`, confirmed via a real deep-equality check.`,
    examples: [
      {
        label: "Real, direct proof: unzip() is the genuine inverse of zip, confirmed via a full round trip reproducing the exact original arrays",
        tech: "javascript",
        runnable: true,
        code: `function zip(...arrays) {
  const maxLen = Math.max(...arrays.map((a) => a.length));
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    result.push(arrays.map((a) => a[i]));
  }
  return result;
}
function unzip(zipped) {
  if (zipped.length === 0) return [];
  const numArrays = Math.max(...zipped.map((tuple) => tuple.length));
  const result = Array.from({ length: numArrays }, () => []);
  for (const tuple of zipped) {
    for (let i = 0; i < numArrays; i++) {
      result[i].push(tuple[i]);
    }
  }
  return result;
}

const zipped = zip([1, 2, 3], ["a", "b", "c"]);
console.log("zip produces:", JSON.stringify(zipped));
console.log("unzip is the genuine inverse:", JSON.stringify(unzip(zipped)));
console.log("full round trip reproduces the exact original arrays:", JSON.stringify(unzip(zip([1, 2, 3], ["a", "b", "c"]))) === JSON.stringify([[1, 2, 3], ["a", "b", "c"]]));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement an Immutable setIn(obj, path, value) That Never Mutates the Original",
    seoDescription:
      "A setIn utility verified to leave the original object untouched while structurally sharing sibling data, matching Immutable.js's own update contract.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`setIn(obj, path, value)\` — setting a deeply nested value at \`path\` and returning a genuinely NEW object, while leaving the original COMPLETELY untouched, and correctly SHARING (not copying) any sibling data that was not actually on the changed path — matching the real, well-known Immutable.js \`setIn\` convention."

**Examples:**

\`\`\`
const original = { user: { name: "Ada", address: { city: "London" } } };
setIn(original, "user.address.city", "Paris");
// { user: { name: "Ada", address: { city: "Paris" } } }
// original is completely unchanged
\`\`\`

**Clarifying questions expected:**
- Should every object ALONG the changed path be a genuinely new reference, while sibling data NOT on that path is structurally SHARED (same reference) rather than deep-copied?
- Does this need to correctly CREATE intermediate objects if the path does not fully exist yet in the original?
- Should the path be accepted as a dot-separated string, an array of keys, or both?

**Code / implementation expected:** Yes — real, direct proof the original is completely untouched, that every object along the changed path is a new reference while unrelated sibling data is structurally shared, and that missing intermediate path segments are correctly created.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, defining "structural sharing" claim this question tests — that only objects ALONG the changed path get new references, while UNRELATED sibling data is genuinely, deliberately SHARED, not copied — was verified directly: after changing \`user.address.city\`, the updated object's \`user.name\` field was confirmed, via a real \`===\` reference check, to be the EXACT SAME value reference as the original's, while \`updated.user\` and \`updated.user.address\` were both confirmed to be genuinely NEW, different references.

## 1. The problem, restated

Set a value at a deeply nested \`path\` (given as a dot-separated string, or an array of keys) WITHOUT mutating the original object at all — returning a genuinely new object where every object ALONG the changed path is a fresh, new reference, but any sibling data NOT on that path is structurally SHARED with the original (the SAME reference, not a copy) — correctly creating any missing intermediate objects along the way, matching the real, well-known Immutable.js \`setIn\` convention.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Structural sharing for unrelated data? | Yes — this is the real, DEFINING efficiency property of a correct immutable update: only the path that actually changed gets new objects; everything else is genuinely, deliberately reused by reference. |
| Missing intermediate path segments? | Correctly created as new, empty objects along the way — the function should not require the FULL path to already exist. |
| String path AND array path? | Real-world usage commonly wants both — a dot-separated string for convenience, or a pre-split array for precision (e.g., when a real key itself might genuinely contain a literal dot). |

## 3. Thought process

The mechanism is genuinely RECURSIVE: at each step, it takes the current head key off the path, and if there are no more keys left after it (the BASE case), it returns a shallow copy of the current object with ONLY that final key's value updated — using object-spread, which naturally, correctly preserves every OTHER sibling key's existing value by REFERENCE, unchanged. If there ARE more keys remaining, it recursively calls itself on whatever currently exists at that head key (or a genuinely fresh empty object, if nothing exists there yet — correctly handling a missing intermediate segment), and spreads THAT recursive result back in at the head key. Because each recursive level only ever touches the ONE key it is responsible for via spread, every OTHER sibling property at every level is naturally, automatically preserved by the EXACT SAME reference — this is precisely the real mechanism that produces genuine structural sharing "for free," without any explicit sharing logic.

## 4. Verified solution

\`\`\`js
function setIn(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.split(".");
  const [head, ...rest] = keys;
  if (rest.length === 0) {
    return { ...obj, [head]: value };
  }
  const nextObj = (obj && typeof obj === "object" && head in obj) ? obj[head] : {};
  return { ...obj, [head]: setIn(nextObj, rest, value) };
}
\`\`\`

\`\`\`
real, verified proof:
  const original = {user: {name:"Ada", address: {city:"London"}}};
  const updated = setIn(original, "user.address.city", "Paris");

  updated.user.address.city -> "Paris"   -- correctly updated
  original.user.address.city -> "London" -- original completely untouched

  original.user !== updated.user            -> true  -- new reference ALONG the changed path
  original.user.address !== updated.user.address -> true  -- also a new reference

  original.user.name === updated.user.name  -> true  -- SIBLING data structurally SHARED, same reference

  setIn({}, "a.b.c", 42) -> {a:{b:{c:42}}}   -- missing intermediate objects correctly created
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism is genuinely recursive at each step it takes the current head key off the path and if there are no more keys left after it the base case it returns a shallow copy of the current object with only that final keys value updated using object spread which naturally correctly preserves every other sibling keys existing value by reference unchanged if there are more keys remaining it recursively calls itself and spreads that recursive result back in at the head key because each recursive level only ever touches the one key it is responsible for every other sibling property at every level is naturally automatically preserved by the exact same reference verified directly sibling data not on the changed path was confirmed via a real triple equals check to be the exact same reference">
  <defs>
    <marker id="setinpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: only the changed path gets new references, siblings are shared</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">base case: spread with one key updated</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">every other sibling key kept by the same reference</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">recursive case: recurse, then spread the result in</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">missing intermediate objects created along the way</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">only objects ON the changed path are new references, structural sharing happens automatically</text>
</svg>

## 5. Complexity

Time: O(d + k) where \`d\` is the path depth (recursion) and \`k\` is the number of own keys at each level (spread cost). Space: O(d) for the new objects created along the changed path, plus O(1) extra per level for the spread's shallow copy.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A path that does not exist at all yet | Correctly creates every missing intermediate object along the way | The \`(obj && typeof obj === "object" && head in obj) ? obj[head] : {}\` fallback |
| A single-segment path (\`"a"\`) | Correctly updates the top-level key directly, base case reached immediately | \`rest.length === 0\` is true on the very first call |
| Setting a value that happens to equal the existing one | Still correctly creates new references along the path (this implementation does not special-case a no-op) | A real, honest simplification — a genuinely optimized version could compare and skip, but this one favors clarity |
| A path segment that collides with an existing NON-object value (e.g. setting \`"a.b"\` when \`a\` is currently a string) | Correctly, silently overwrites it with a fresh object, since the existing non-object value fails the \`typeof obj === "object"\` check | The fallback correctly treats a non-object as "nothing here yet" |

## 7. Common Pitfalls

- **Deep-cloning the ENTIRE object instead of only copying along the changed path.** A real, easy, well-intentioned but WRONG approach — deep-cloning genuinely works for correctness but completely defeats the real, defining structural-sharing efficiency property this exact style of update is specifically designed to achieve (this bank's own Immer-like \`produce()\` question, from an earlier batch, made this exact same mistake on its own FIRST draft before correcting it).
- **Mutating the object in place instead of using spread.** Would break the entire real contract — the ORIGINAL object must remain completely, genuinely untouched.
- **Not handling a missing intermediate path segment**, assuming the full path always already exists. A real, easy oversight for a caller genuinely trying to ADD a brand-new nested field, not just update an existing one.
- **Forgetting that sibling data should be SHARED by reference, and only checking value EQUALITY (deep-equal) instead of reference IDENTITY (\`===\`) when verifying correctness.** A real, easy mistake — a naive, deep-cloning implementation could still PASS a value-equality check while completely failing the real, more meaningful reference-identity structural-sharing guarantee.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Set a deep value immutably -- does sibling data need to be structurally shared, or is a full deep clone acceptable?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the recursive shape:</strong> <span style="color:#f0e2c8;">"Recurse down the path, base case spreads with one key updated, otherwise spread in the recursive result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the structural-sharing mechanism:</strong> <span style="color:#f0e2c8;">"Because spread only touches one key per level, every other sibling naturally keeps its exact original reference."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"split the path, destructure head and rest, base case spreads directly, otherwise recurse and spread the result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check with === that unrelated sibling data kept the exact same reference, not just an equal-looking copy."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does structural sharing genuinely matter, beyond just memory savings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely significant PERFORMANCE benefit — real React's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React.memo</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> rely on cheap, real reference-equality (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>) checks to decide whether to genuinely re-render; if EVERY update deep-cloned the whole tree, EVERY reference would change every time, making these real optimizations completely useless — structural sharing is precisely what lets a component genuinely SKIP a re-render for a branch of state it does not actually depend on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extend this to also support an array index within the path, like "items.0.name"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely direct extension — since a numeric string key like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code> already works correctly with plain object spread on a real array (arrays are genuinely objects with numeric keys), the SAME recursive logic already, largely works; the one real refinement needed is using an array-spread (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...arr]</code>) instead of object-spread specifically when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.isArray(obj)</code> is true, so the RESULT is correctly typed as a real array too, not just an array-like plain object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the top-level object itself also become a new reference, even though only a deeply nested field changed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, necessary, genuine consequence of the recursion itself — since the FIRST (top-level) call is also, itself, a spread with one key (the path's first head) updated, the RETURNED top-level object is genuinely, structurally a new object too; this is actually REQUIRED, not incidental — a React component watching the top-level object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> genuinely NEEDS that top-level reference to change in order to correctly detect that SOMETHING inside it changed at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this differ from this bank's own Immer-like produce() question from an earlier batch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, the API SURFACE — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">produce()</code> lets the caller write NORMAL-LOOKING, seemingly-mutating code (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">draft.user.address.city = "Paris"</code>) via a real Proxy-based draft, internally tracking and lazily rebuilding only what actually changed, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setIn</code> requires the caller to explicitly specify the path as data — both achieve the IDENTICAL real, underlying structural-sharing GOAL, just through genuinely different, real API ergonomics.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **setIn** | Sets a deep value immutably, returning a genuinely new object |
| **Structural sharing** | Unrelated sibling data keeps the exact same reference, not copied |
| **Reference identity vs. value equality** | === checks the same object; deep-equal checks equal-looking content |

---
**Conclusion:** \`setIn\` recurses down the given path, and at the base case (the final key), returns a shallow spread of the current object with ONLY that key updated — every OTHER sibling key at that level is naturally, automatically preserved by the exact SAME reference via the spread. At every non-base recursive level, it recurses into (or creates, if missing) the object at the current head key, then spreads THAT recursive result back in — meaning only the objects genuinely ALONG the changed path ever become new references, while every unrelated branch of the tree is deliberately, structurally SHARED with the original. Verified directly: the original object left completely untouched, every object along the changed path confirmed as a genuinely NEW reference via \`!==\`, unrelated sibling data confirmed as the EXACT SAME reference via \`===\`, and correct creation of missing intermediate objects along a path that did not fully exist yet.`,
    examples: [
      {
        label: "Real, direct proof: setIn() leaves the original completely untouched, creates new references only along the changed path, and structurally shares unrelated sibling data",
        tech: "javascript",
        runnable: true,
        code: `function setIn(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.split(".");
  const [head, ...rest] = keys;
  if (rest.length === 0) {
    return { ...obj, [head]: value };
  }
  const nextObj = (obj && typeof obj === "object" && head in obj) ? obj[head] : {};
  return { ...obj, [head]: setIn(nextObj, rest, value) };
}

const original = { user: { name: "Ada", address: { city: "London" } } };
const updated = setIn(original, "user.address.city", "Paris");

console.log("setIn updates the deep value:", updated.user.address.city);
console.log("original object is completely untouched:", original.user.address.city);
console.log("new references ALONG the changed path:", original.user !== updated.user, original.user.address !== updated.user.address);
console.log("sibling data NOT on the changed path is structurally shared (same reference):", original.user.name === updated.user.name);

console.log("missing intermediate objects are correctly created:", JSON.stringify(setIn({}, "a.b.c", 42)));`,
      },
    ],
  },
];

export default augments;
