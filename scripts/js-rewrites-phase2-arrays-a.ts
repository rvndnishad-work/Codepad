/**
 * Phase 2 — Batch "Arrays & objects" (A): 8 array-iteration / method stubs to
 * interview depth (TL;DR + SVG + table + tip + runnable example). Patch-in-place.
 *
 *   npx tsx scripts/js-rewrites-phase2-arrays-a.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

type Example = { label: string; code: string; runnable?: boolean };
type Rewrite = { title: string; answer: string; examples: Example[] };

const card = (svg: string) =>
  `<div style="margin:1.25rem auto;max-width:560px;border:1px solid rgba(245,158,11,0.25);border-radius:14px;padding:14px;background:rgba(245,158,11,0.05)">\n${svg}\n</div>`;

const REWRITES: Rewrite[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does Array.filter do?",
    answer: `**Core concept (TL;DR).** <code>filter</code> returns a **new array** containing only the elements for which the callback returns a truthy value. It never mutates the original, and the result is the same length or shorter — the idiomatic way to "keep the items that match a condition."

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Keep elements where the predicate is truthy</text>
  <g font-size="11" text-anchor="middle">
    <rect x="30" y="44" width="34" height="30" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="47" y="64" fill="currentColor">1</text>
    <rect x="70" y="44" width="34" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="87" y="64" fill="currentColor">2</text>
    <rect x="110" y="44" width="34" height="30" rx="5" fill="#3b82f6" fill-opacity="0.18" stroke="#3b82f6"/><text x="127" y="64" fill="currentColor">3</text>
    <rect x="150" y="44" width="34" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="167" y="64" fill="currentColor">4</text>
  </g>
  <text x="250" y="64" fill="currentColor" font-size="11" text-anchor="middle">.filter(n =&gt; n % 2 === 0)</text>
  <path d="M 360 60 L 400 60" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#fi-a)"/>
  <g font-size="11" text-anchor="middle">
    <rect x="412" y="44" width="34" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="429" y="64" fill="currentColor">2</text>
    <rect x="452" y="44" width="34" height="30" rx="5" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e"/><text x="469" y="64" fill="currentColor">4</text>
  </g>
  <text x="260" y="118" fill="currentColor" font-size="10" text-anchor="middle">original untouched · new array returned · chainable with map/reduce</text>
  <defs><marker id="fi-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The callback receives <code>(element, index, array)</code> and should return a boolean-ish value; truthy keeps the element, falsy drops it. Because <code>filter</code> returns a fresh array it chains cleanly — <code>arr.filter(...).map(...)</code> — and stays pure, so it's safe in React/state code. To get a single match instead of a sub-list, use <code>find</code>; to collapse to one value, use <code>reduce</code>.

### filter vs its cousins
| Method | Returns |
| --- | --- |
| <code>filter</code> | new array of all matches |
| <code>find</code> | the first matching element (or <code>undefined</code>) |
| <code>map</code> | new array, same length, transformed |
| <code>some</code> | <code>true</code> if any match |

> **Interview tip:** Stress purity — <code>filter</code> returns a new array and leaves the source intact, unlike <code>splice</code>. A clean follow-up is removing an item immutably: <code>list.filter(x =&gt; x.id !== id)</code>.`,
    examples: [
      {
        label: "Keep matches, immutably",
        runnable: true,
        code: `const nums = [1, 2, 3, 4, 5, 6];
const evens = nums.filter((n) => n % 2 === 0);
console.log(evens);   // [2, 4, 6]
console.log(nums);    // [1,2,3,4,5,6] — unchanged

// immutable "remove by id"
const todos = [{ id: 1 }, { id: 2 }, { id: 3 }];
console.log(todos.filter((t) => t.id !== 2)); // [{id:1},{id:3}]

// chain filter → map
console.log(nums.filter((n) => n > 3).map((n) => n * 10)); // [40, 50, 60]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between map and forEach?",
    answer: `**Core concept (TL;DR).** Both loop over every element, but <code>map</code> **returns a new array** of the callback's return values (a transformation), while <code>forEach</code> returns <code>undefined</code> and exists purely for **side effects**. Use <code>map</code> when you want a result; use <code>forEach</code> when you just want to *do* something each iteration.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">map builds a new array · forEach returns undefined</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">[1,2,3].map(x =&gt; x*2)</text>
  <text x="135" y="88" fill="currentColor" font-size="10" text-anchor="middle">→ [2, 4, 6]</text>
  <text x="135" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">transform + chain</text>
  <text x="135" y="132" fill="#22c55e" font-size="9" text-anchor="middle">pure: no mutation</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="385" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">[1,2,3].forEach(log)</text>
  <text x="385" y="88" fill="currentColor" font-size="10" text-anchor="middle">→ undefined</text>
  <text x="385" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">side effects only</text>
  <text x="385" y="132" fill="#3b82f6" font-size="9" text-anchor="middle">not chainable</text>
</svg>`)}

**How it works.** <code>map</code> allocates a result array and fills it with each callback return — perfect for deriving data and chaining (<code>.map().filter()</code>). <code>forEach</code> ignores return values and yields <code>undefined</code>, so chaining off it is a bug. Neither can be stopped early with <code>break</code> (use a plain <code>for</code>/<code>for…of</code> or <code>some</code> for that), and both skip holes in sparse arrays.

### map vs forEach
| | <code>map</code> | <code>forEach</code> |
| --- | --- | --- |
| Returns | new array | <code>undefined</code> |
| Purpose | transform | side effects |
| Chainable | yes | no |
| <code>break</code> early | no | no |

> **Interview tip:** The smell to call out: using <code>map</code> *only* for side effects (ignoring the returned array) wastes an allocation — use <code>forEach</code> instead. And neither supports <code>break</code>; reach for <code>for…of</code> or <code>some</code>/<code>every</code> when you need to bail early.`,
    examples: [
      {
        label: "Return value is the difference",
        runnable: true,
        code: `const nums = [1, 2, 3];

const doubled = nums.map((n) => n * 2);
console.log(doubled);                 // [2, 4, 6]

const result = nums.forEach((n) => n * 2);
console.log(result);                  // undefined — nothing returned

// forEach for side effects
let sum = 0;
nums.forEach((n) => { sum += n; });
console.log(sum);                     // 6

// map chains; forEach can't
console.log(nums.map((n) => n + 1).filter((n) => n > 2)); // [3, 4]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What do Array.some and Array.every do?",
    answer: `**Core concept (TL;DR).** Both test elements against a predicate and return a **boolean**. <code>some</code> is a logical OR — <code>true</code> if **at least one** element passes (and it short-circuits on the first match). <code>every</code> is a logical AND — <code>true</code> only if **all** elements pass (short-circuits on the first failure).

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">some = ∃ (any) · every = ∀ (all)</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">some(x =&gt; x &gt; 3)</text>
  <text x="135" y="86" fill="currentColor" font-size="10" text-anchor="middle">[1,2,4] → true (4 passes)</text>
  <text x="135" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">stops at first true</text>
  <text x="135" y="132" fill="#22c55e" font-size="9" text-anchor="middle">empty array → false</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="385" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">every(x =&gt; x &gt; 3)</text>
  <text x="385" y="86" fill="currentColor" font-size="10" text-anchor="middle">[4,5,2] → false (2 fails)</text>
  <text x="385" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">stops at first false</text>
  <text x="385" y="132" fill="#3b82f6" font-size="9" text-anchor="middle">empty array → true</text>
</svg>`)}

**How it works.** Both walk the array calling <code>predicate(element, index, array)</code> and exit as soon as the answer is settled — <code>some</code> on the first truthy result, <code>every</code> on the first falsy. This early exit makes them efficient for validation ("is any field invalid?", "are all required filled?"). Watch the **empty-array** edge: <code>[].some(...)</code> is <code>false</code> and <code>[].every(...)</code> is <code>true</code> (vacuous truth).

### some vs every
| | <code>some</code> | <code>every</code> |
| --- | --- | --- |
| Logic | OR (∃) | AND (∀) |
| Returns true when | any passes | all pass |
| Short-circuits on | first <code>true</code> | first <code>false</code> |
| Empty array | <code>false</code> | <code>true</code> |

> **Interview tip:** Mention the empty-array results (<code>every</code> → <code>true</code>) — a common gotcha in validation logic. And note both short-circuit, so they're cheaper than <code>filter(...).length</code> for a yes/no question.`,
    examples: [
      {
        label: "Validation with short-circuiting",
        runnable: true,
        code: `const nums = [2, 4, 6, 7];

console.log(nums.some((n) => n % 2 !== 0));  // true  (7 is odd)
console.log(nums.every((n) => n % 2 === 0)); // false (7 breaks it)

// form validation
const fields = [{ ok: true }, { ok: true }, { ok: false }];
console.log(fields.every((f) => f.ok));      // false — not all valid
console.log(fields.some((f) => !f.ok));      // true  — at least one invalid

// the empty-array edge
console.log([].some(Boolean), [].every(Boolean)); // false true`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What do flat and flatMap do?",
    answer: `**Core concept (TL;DR).** <code>flat(depth)</code> returns a new array with nested sub-arrays flattened up to <code>depth</code> levels (default <code>1</code>; pass <code>Infinity</code> to fully flatten). <code>flatMap(fn)</code> is <code>map</code> followed by a single level of <code>flat</code> — ideal for mapping where each item can expand to zero, one, or many results.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">flat lowers nesting · flatMap = map + flat(1)</text>
  <rect x="30" y="44" width="180" height="40" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/>
  <text x="120" y="68" fill="currentColor" font-size="10" text-anchor="middle">[1, [2, 3], [4]]</text>
  <path d="M 210 64 L 256 64" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ft-a)"/>
  <text x="290" y="58" fill="currentColor" font-size="9" text-anchor="middle">.flat()</text>
  <rect x="320" y="44" width="170" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="405" y="68" fill="currentColor" font-size="10" text-anchor="middle">[1, 2, 3, 4]</text>
  <text x="260" y="124" fill="currentColor" font-size="10" text-anchor="middle">flatMap: words.flatMap(w =&gt; w.split("")) → one flat array</text>
  <defs><marker id="ft-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** <code>flat</code> only descends the number of levels you ask for, so deeply-nested data needs <code>flat(Infinity)</code>. <code>flatMap</code> exists because "map then flatten one level" is so common; it's also slightly more efficient than chaining and lets a callback return <code>[]</code> to **drop** an item or an array to **expand** it — effectively a combined map + filter + expand.

### flat vs flatMap
| Call | Result |
| --- | --- |
| <code>[1,[2,[3]]].flat()</code> | <code>[1, 2, [3]]</code> (1 level) |
| <code>[1,[2,[3]]].flat(Infinity)</code> | <code>[1, 2, 3]</code> |
| <code>[1,2].flatMap(x =&gt; [x, x*10])</code> | <code>[1, 10, 2, 20]</code> |
| <code>[1,2,3].flatMap(x =&gt; x % 2 ? [x] : [])</code> | <code>[1, 3]</code> (map + filter) |

> **Interview tip:** Note <code>flatMap</code> only flattens **one** level — it won't fully flatten deep results. And the "return <code>[]</code> to drop, return many to expand" trick is the elegant answer for combined transform-and-filter in one pass.`,
    examples: [
      {
        label: "Flattening and expanding",
        runnable: true,
        code: `console.log([1, [2, 3], [4, [5]]].flat());          // [1, 2, 3, 4, [5]]
console.log([1, [2, [3, [4]]]].flat(Infinity));     // [1, 2, 3, 4]

// flatMap: split each word into letters → one flat array
console.log(["ab", "cd"].flatMap((w) => w.split(""))); // ["a","b","c","d"]

// flatMap as map + filter (return [] to drop)
console.log([1, 2, 3, 4].flatMap((n) => (n % 2 ? [n] : []))); // [1, 3]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What do Array.from and Array.of do?",
    answer: `**Core concept (TL;DR).** Both are static array constructors. <code>Array.from(x)</code> builds a real array from an **iterable or array-like** (with an optional map function). <code>Array.of(...items)</code> builds an array from its **arguments** — fixing the confusing <code>new Array(n)</code> behaviour.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">from: build from iterable · of: build from args</text>
  <rect x="20" y="42" width="230" height="104" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">Array.from</text>
  <text x="135" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">"hi" → ["h","i"]</text>
  <text x="135" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">Set, NodeList, arguments</text>
  <text x="135" y="128" fill="#3b82f6" font-size="9" text-anchor="middle">+ optional map fn</text>
  <rect x="270" y="42" width="230" height="104" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">Array.of</text>
  <text x="385" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">Array.of(3) → [3]</text>
  <text x="385" y="106" fill="#ef4444" font-size="9.5" text-anchor="middle">new Array(3) → [ , , ] !</text>
  <text x="385" y="128" fill="#22c55e" font-size="9" text-anchor="middle">no single-number trap</text>
</svg>`)}

**How it works.** <code>Array.from</code> turns anything iterable (strings, <code>Set</code>, <code>Map</code>) or array-like (has <code>length</code> + indices, like <code>arguments</code> or a DOM <code>NodeList</code>) into an array; its second argument is a map function, so <code>Array.from({length: 3}, (_, i) =&gt; i)</code> generates <code>[0,1,2]</code>. <code>Array.of</code> sidesteps the <code>new Array(7)</code> quirk where a single number creates an *empty* array of that length instead of <code>[7]</code>.

### Building arrays
| Call | Result |
| --- | --- |
| <code>Array.from("hi")</code> | <code>["h", "i"]</code> |
| <code>Array.from({length:3}, (_,i)=>i)</code> | <code>[0, 1, 2]</code> |
| <code>Array.of(7)</code> | <code>[7]</code> |
| <code>new Array(7)</code> | empty × 7 ⚠️ |

> **Interview tip:** Two useful one-liners: <code>Array.from(new Set(arr))</code> to dedupe, and <code>Array.from({length:n}, (_,i)=&gt;i)</code> to make a range. Mention spread (<code>[...iterable]</code>) as the terser alternative when you don't need the map callback.`,
    examples: [
      {
        label: "Converting and generating",
        runnable: true,
        code: `console.log(Array.from("hi"));                 // ["h", "i"]
console.log(Array.from(new Set([1, 1, 2, 3]))); // [1, 2, 3] (dedupe)
console.log(Array.from({ length: 4 }, (_, i) => i * i)); // [0, 1, 4, 9]

console.log(Array.of(7));     // [7]
console.log(new Array(7).length); // 7 — empty slots, NOT [7]

// spread is the terser conversion when no map fn is needed
console.log([...new Set([2, 2, 5])]); // [2, 5]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between includes and indexOf?",
    answer: `**Core concept (TL;DR).** Both search an array for a value, but <code>indexOf</code> returns the **index** (or <code>-1</code> if absent), while <code>includes</code> returns a **boolean**. The subtle difference: <code>includes</code> can find <code>NaN</code>; <code>indexOf</code> cannot, because it compares with strict <code>===</code> and <code>NaN === NaN</code> is <code>false</code>.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">indexOf → position (===) · includes → bool (finds NaN)</text>
  <rect x="20" y="44" width="230" height="102" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="64" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">indexOf</text>
  <text x="135" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">["a","b"].indexOf("b") → 1</text>
  <text x="135" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">missing → -1</text>
  <text x="135" y="130" fill="#ef4444" font-size="9" text-anchor="middle">[NaN].indexOf(NaN) → -1 ⚠️</text>
  <rect x="270" y="44" width="230" height="102" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">includes</text>
  <text x="385" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">["a","b"].includes("b") → true</text>
  <text x="385" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">missing → false</text>
  <text x="385" y="130" fill="#22c55e" font-size="9" text-anchor="middle">[NaN].includes(NaN) → true ✓</text>
</svg>`)}

**How it works.** <code>indexOf</code> uses strict equality, so it's the right call when you actually need the **position** of an item. <code>includes</code> uses the *SameValueZero* algorithm, which is like <code>===</code> except it treats <code>NaN</code> as equal to <code>NaN</code> — making it the only built-in array search that locates <code>NaN</code>. For readable membership tests, <code>includes</code> beats the old <code>indexOf(x) !== -1</code> idiom.

### includes vs indexOf
| | <code>indexOf</code> | <code>includes</code> |
| --- | --- | --- |
| Returns | index / <code>-1</code> | <code>true</code> / <code>false</code> |
| Comparison | strict <code>===</code> | SameValueZero |
| Finds <code>NaN</code> | no | yes |
| Best for | needing the position | membership check |

> **Interview tip:** The headline is the <code>NaN</code> case — <code>[NaN].indexOf(NaN)</code> is <code>-1</code> but <code>[NaN].includes(NaN)</code> is <code>true</code>. Prefer <code>includes</code> for "does it contain?" readability; keep <code>indexOf</code> when you need where.`,
    examples: [
      {
        label: "Position vs membership (and NaN)",
        runnable: true,
        code: `const arr = ["a", "b", "c"];
console.log(arr.indexOf("b"));   // 1
console.log(arr.indexOf("z"));   // -1
console.log(arr.includes("b"));  // true
console.log(arr.includes("z"));  // false

// the NaN difference
console.log([NaN].indexOf(NaN));  // -1   (=== fails for NaN)
console.log([NaN].includes(NaN)); // true (SameValueZero)

// readable membership check
console.log(arr.includes("a") ? "has a" : "no a"); // "has a"`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between for...of and for...in?",
    answer: `**Core concept (TL;DR).** <code>for…in</code> iterates the **enumerable property keys** of an object (including inherited ones) — use it for plain objects. <code>for…of</code> iterates the **values** of an iterable (arrays, strings, <code>Map</code>, <code>Set</code>). Rule of thumb: <code>in</code> for object **keys**, <code>of</code> for iterable **values** — and don't use <code>for…in</code> on arrays.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">for…in = keys (objects) · for…of = values (iterables)</text>
  <rect x="20" y="44" width="230" height="102" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="135" y="64" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">for (k in obj)</text>
  <text x="135" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">enumerable KEYS</text>
  <text x="135" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">includes inherited</text>
  <text x="135" y="130" fill="#ef4444" font-size="9" text-anchor="middle">don't use on arrays</text>
  <rect x="270" y="44" width="230" height="102" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">for (v of arr)</text>
  <text x="385" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">VALUES of iterables</text>
  <text x="385" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">arrays, strings, Map, Set</text>
  <text x="385" y="130" fill="#22c55e" font-size="9" text-anchor="middle">supports break/continue</text>
</svg>`)}

**How it works.** <code>for…in</code> walks the prototype chain and visits every *enumerable* key, so on arrays it yields index **strings** ("0","1") plus any added properties — rarely what you want and order isn't guaranteed for integer-like keys in all cases. <code>for…of</code> relies on the iterable protocol (<code>Symbol.iterator</code>), giving values in order and supporting <code>break</code>/<code>continue</code>. For objects when you want values/entries, combine <code>for…of</code> with <code>Object.entries(obj)</code>.

### for…in vs for…of
| | <code>for…in</code> | <code>for…of</code> |
| --- | --- | --- |
| Iterates | enumerable keys | iterable values |
| Includes inherited | yes | n/a |
| Works on plain objects | yes | no (not iterable) |
| Works on arrays | discouraged | yes |

> **Interview tip:** Two points: (1) <code>for…in</code> includes **inherited** enumerable keys — guard with <code>hasOwnProperty</code> if needed; (2) <code>for…in</code> on arrays gives string indices and risks extra props — always use <code>for…of</code> (or <code>forEach</code>/<code>map</code>) for arrays.`,
    examples: [
      {
        label: "Keys vs values",
        runnable: true,
        code: `const obj = { a: 1, b: 2 };
for (const key in obj) console.log("in →", key, obj[key]); // a 1, b 2

const arr = ["x", "y", "z"];
for (const val of arr) console.log("of →", val);           // x, y, z

// for...in on an array yields string indices (avoid)
for (const i in arr) console.log("in on array →", i, typeof i); // "0" string …

// iterate object VALUES cleanly
for (const [k, v] of Object.entries(obj)) console.log("entries →", k, v);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the basics of regular expressions in JavaScript?",
    answer: `**Core concept (TL;DR).** A regular expression describes a **text pattern**. In JS you write one as a literal between slashes (<code>/pattern/flags</code>) or with <code>new RegExp()</code>, then use methods like <code>test</code> (boolean), <code>match</code>/<code>matchAll</code> (extract), and <code>replace</code> (substitute). Flags like <code>g</code> (global), <code>i</code> (case-insensitive), and <code>m</code> (multiline) tune the matching.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">A pattern + flags, applied with test / match / replace</text>
  <g font-size="9.5">
    <rect x="20" y="38" width="150" height="24" rx="5" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6"/><text x="30" y="54" fill="currentColor">\\d  digit   \\w  word char</text>
    <rect x="20" y="66" width="150" height="24" rx="5" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6"/><text x="30" y="82" fill="currentColor">\\s  space   .  any char</text>
    <rect x="20" y="94" width="150" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="30" y="110" fill="currentColor">+ * ?  quantifiers</text>
    <rect x="20" y="122" width="150" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="30" y="138" fill="currentColor">^ $  anchors  ( )  group</text>
  </g>
  <g font-size="9.5">
    <rect x="200" y="52" width="150" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="210" y="68" fill="currentColor">re.test(str) → bool</text>
    <rect x="200" y="84" width="150" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="210" y="100" fill="currentColor">str.match(re) → matches</text>
    <rect x="200" y="116" width="150" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="210" y="132" fill="currentColor">str.replace(re, x)</text>
  </g>
  <g font-size="9.5">
    <rect x="380" y="68" width="120" height="24" rx="5" fill="#64748b" fill-opacity="0.12" stroke="#64748b"/><text x="390" y="84" fill="currentColor">g global</text>
    <rect x="380" y="100" width="120" height="24" rx="5" fill="#64748b" fill-opacity="0.12" stroke="#64748b"/><text x="390" y="116" fill="currentColor">i ignore-case</text>
  </g>
</svg>`)}

**How it works.** The pattern combines literal characters with metacharacters: <code>\\d</code> (digit), <code>\\w</code> (word char), <code>\\s</code> (whitespace), <code>.</code> (any), quantifiers <code>+ * ? {n,m}</code>, anchors <code>^ $</code>, character classes <code>[...]</code>, and capture groups <code>( )</code> referenced in <code>replace</code> as <code>$1</code>. Use a literal <code>/.../ </code> for fixed patterns and <code>new RegExp(str)</code> when the pattern is built dynamically (remembering to double-escape backslashes in the string form).

### Common pieces
| Token | Matches |
| --- | --- |
| <code>\\d</code> / <code>\\w</code> / <code>\\s</code> | digit / word char / whitespace |
| <code>+</code> <code>*</code> <code>?</code> | one-or-more / zero-or-more / optional |
| <code>^</code> <code>$</code> | start / end of input (or line with <code>m</code>) |
| <code>(abc)</code> | capture group → <code>$1</code> |

> **Interview tip:** Mention the global-flag gotcha: a regex with <code>g</code> is **stateful** (<code>lastIndex</code> advances), so reusing one across <code>test</code> calls can skip matches. Prefer <code>matchAll</code> for all groups, and validate with anchors (<code>^…$</code>) to match the *whole* string.`,
    examples: [
      {
        label: "test, match, replace, capture groups",
        runnable: true,
        code: `const text = "Order 1234, ref 9876";
console.log(text.match(/\\d+/g));          // ["1234", "9876"]

// case-insensitive test
console.log(/hello/i.test("Hello world")); // true

// capture groups + $1/$2 in replace
const swap = "ada@mail".replace(/(\\w+)@(\\w+)/, "$2 owns $1");
console.log(swap);                          // "mail owns ada"

// anchored full-string validation
console.log(/^\\d{3}-\\d{4}$/.test("123-4567")); // true
console.log(/^\\d{3}-\\d{4}$/.test("12-4567"));  // false`,
      },
    ],
  },
];

// ── patch in place ──────────────────────────────────────────────────────────
const dir = join(process.cwd(), "prisma", "data");
const files = readdirSync(dir).filter((f) => /^js-augments.*\.json$/.test(f));
const loaded = files.map((f) => ({
  f,
  arr: JSON.parse(readFileSync(join(dir, f), "utf8")) as any[],
  dirty: false,
}));

const notFound: string[] = [];
for (const rw of REWRITES) {
  const hit = loaded.find((d) => d.arr.some((x) => x.title === rw.title));
  if (!hit) {
    notFound.push(rw.title);
    continue;
  }
  const item = hit.arr.find((x) => x.title === rw.title);
  item.answer = rw.answer;
  item.examples = rw.examples;
  hit.dirty = true;
}

for (const d of loaded) {
  if (d.dirty) writeFileSync(join(dir, d.f), JSON.stringify(d.arr, null, 2));
}

console.log(
  `Patched ${REWRITES.length - notFound.length}/${REWRITES.length} answers across`,
  loaded.filter((d) => d.dirty).map((d) => d.f).join(", "),
);
if (notFound.length) console.log("NOT FOUND (title mismatch):", notFound);
