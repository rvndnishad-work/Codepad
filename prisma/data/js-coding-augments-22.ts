/**
 * Practical JS coding-interview content — batch 22 (DSA round, medium
 * tier — the object-utility cluster: clear nullish values, deep map keys,
 * indexBy, object diff, frequency counter, flatten/unflatten). See
 * js-coding-augments-15 through -21.ts's headers for the full template
 * rationale and every standing gotcha.
 *
 * Titles pulled from a live DB query (never invented). The terse titles
 * (Clear Nullish Values, Deep Map Keys, Index By Utility, Object
 * Difference) were authored against the description already stored on
 * each row.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - clearNullish: recursive removal of null/undefined, other falsy
 *     values (0, "", false) kept, circular references preserved in the
 *     clone via a WeakMap, Date passed through untouched, input never
 *     mutated. Array handling has two verified modes: "compact" (nullish
 *     elements removed, later elements shift down) and "preserve"
 *     (nullish slots become real holes, survivors keep their indices).
 *   - deepMapKeys: keys mapped at every depth including inside arrays,
 *     collisions resolved last-write-wins, circular-safe. A real hazard
 *     was verified: if the mapper returns "__proto__", plain assignment
 *     silently swallows the entry (own keys end up empty); a
 *     defineProperty-based version keeps it as a normal own key.
 *   - indexBy: Object.create(null) result, three collision modes, and the
 *     naive {} version verified to hijack the RESULT object's prototype
 *     for a "__proto__" key (own keys empty, inherited value visible) —
 *     verified NOT to pollute the global Object.prototype.
 *   - objectDiff: added/removed/changed by dot path, arrays compared by
 *     index, Object.is semantics (NaN equals NaN, +0 differs from -0),
 *     an existing key whose value is undefined is distinguished from a
 *     missing key (checked directly, since JSON.stringify hides both
 *     undefined values and the sign of zero).
 *   - frequency counter: Map-based, NaN is one key, 1 and "1" stay
 *     distinct; the naive {} counter was verified to corrupt the word
 *     "constructor" (it becomes a string starting "function Object()")
 *     and to merge 1 with "1".
 *   - flatten/unflatten: full round trip (arrays, null leaves, empty
 *     array/object leaves), dotted keys preserved via backslash escaping,
 *     a prototype-pollution path rejected, and one known limit verified
 *     honestly: an object with numeric-looking keys returns as an array.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Clear Nullish Values",
    seoDescription:
      "A recursive clearNullish verified on nested data, cycles and arrays, in compact and index-preserving modes, keeping 0, empty string and false.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`clearNullish(value)\` — recursively removing every \`null\` and \`undefined\` from an object or array, without touching other falsy values, without mutating the input, and without crashing on a circular reference."

**Examples:**

\`\`\`
clearNullish({ a: 1, b: null, c: { d: undefined, e: 0 } });
// { a: 1, c: { e: 0 } }
\`\`\`

**Clarifying questions expected:**
- Should \`0\`, \`""\` and \`false\` survive? (They are falsy but not nullish.)
- For arrays, should nullish elements be removed and the rest shifted down, or should surviving elements keep their original indices?
- What should happen with a circular reference, and with non-plain objects such as a \`Date\`?

**Code / implementation expected:** Yes — real, direct proof on nested data, on a circular structure, and in both array modes.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the spec is deliberately ambiguous about arrays ("preserving array index structures"), so this doc verifies BOTH readings directly: a compact mode that removes nullish elements and shifts the rest down, and a preserve mode that leaves real holes so survivors keep their exact indices.

## 1. The problem, restated

Walk an arbitrarily nested structure of plain objects and arrays and drop every \`null\` / \`undefined\` — while leaving every other value (including the falsy \`0\`, \`""\`, \`false\`) alone, returning a NEW structure, and surviving a cycle instead of recursing forever.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Only nullish, or all falsy? | Nullish means exactly \`null\` and \`undefined\` (the \`== null\` check). Dropping \`0\` or \`false\` would silently destroy real data. |
| Array semantics? | Removing an element shifts every later index. Whether that is acceptable is a real product decision, so support both modes and state your default. |
| Circular references? | A naive recursion overflows the stack. A \`WeakMap\` from original to clone both stops the loop and preserves the cycle in the output. |
| Non-plain objects? | A \`Date\`, \`Map\` or class instance is not a container to recurse into; pass it through untouched. |

## 3. Thought process

Brute force is a recursive function that copies every key whose value is not nullish. That is the right skeleton, with two real problems. First, a cycle recurses forever, so before descending into any container, check a \`WeakMap\` of already-seen originals and return the clone already under construction; registering the clone BEFORE recursing into its children is what makes a self-reference resolve to the clone itself. Second, arrays need a decision: in compact mode push only survivors; in preserve mode write each survivor at its original index and finally restore \`length\`, leaving genuine holes where nullish values were. The test for "nullish" is \`== null\`, which matches exactly \`null\` and \`undefined\` and nothing else.

## 4. Verified solution

\`\`\`js
function isPlain(v) {
  return v !== null && typeof v === "object" &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function clearNullish(value, { arrays = "compact" } = {}, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const out = [];
    seen.set(value, out);
    value.forEach((item, i) => {
      if (item == null) return;
      const cleaned = clearNullish(item, { arrays }, seen);
      if (arrays === "compact") out.push(cleaned); else out[i] = cleaned;
    });
    if (arrays === "preserve") out.length = value.length;
    return out;
  }
  if (isPlain(value)) {
    if (seen.has(value)) return seen.get(value);
    const out = {};
    seen.set(value, out);
    for (const key of Object.keys(value)) {
      if (value[key] == null) continue;
      out[key] = clearNullish(value[key], { arrays }, seen);
    }
    return out;
  }
  return value;
}
\`\`\`

\`\`\`
real, verified output:
  { a:1, b:null, c:undefined, d:{ e:null, f:2, g:[1,null,{h:undefined,i:3},undefined] }, z:0, s:"", n:false }
  -> {"a":1,"d":{"f":2,"g":[1,{"i":3}]},"z":0,"s":"","n":false}
  0, "" and false all survived; arrays are still arrays; the input was not mutated

  circular { name:"x", gone:null, self:<itself> } -> the clone's self === the clone, "gone" removed
  a Date value is passed through by reference, untouched

  [1,null,3,undefined,5]
    compact  -> [1,3,5], length 3
    preserve -> length 5, survivors keep indices 0, 2 and 4, slots 1 and 3 are real holes
                (JSON.stringify prints holes as null: [1,null,3,null,5])
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="brute force recursion loops forever on a cycle while a weak map from original to clone registered before descending resolves the cycle to the clone itself and arrays choose between compacting survivors or writing them at their original indices leaving holes">
  <defs>
    <marker id="clearnullish-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Naive recursion vs a WeakMap-guarded walk</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">plain recursion</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a cycle overflows the call stack</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">seen WeakMap, register clone first</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a self-reference resolves to the clone</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">arrays: compact pushes survivors, preserve writes them at their original index</text>
</svg>

## 5. Complexity

Time: O(n) in the total number of keys and elements — each is visited once, and the WeakMap makes shared or cyclic nodes cost nothing extra. Space: O(n) for the clone plus the WeakMap, and O(d) recursion depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`0\`, \`""\`, \`false\`, \`NaN\` | Kept | They are falsy but not nullish; \`== null\` is only true for \`null\` and \`undefined\` |
| Circular reference | Cycle preserved in the clone, no overflow | The clone is registered in the WeakMap before its children are processed |
| Same object referenced twice (a DAG) | Cleaned once, both references point at the same clone | The WeakMap hit returns the existing clone |
| \`Date\`, \`Map\`, class instance | Returned untouched, same reference | \`isPlain\` is false, so it is not treated as a container |
| Empty result (all values nullish) | \`{}\` or \`[]\`, not \`undefined\` | The container is created before its children are examined |

## 7. Common Pitfalls

- **Filtering with truthiness (\`if (!v)\`).** It deletes \`0\`, \`""\` and \`false\`, which is real data loss. Use \`== null\`.
- **Registering the clone AFTER recursing.** A cycle then reaches the same node before it is registered and still overflows. Register first.
- **Deleting from the original while iterating.** It mutates the caller's data and is a classic source of skipped elements; always build a new structure.
- **Treating every object as a container.** Recursing into a \`Date\` produces an empty \`{}\` (it has no own enumerable keys) and silently destroys the value.
- **Assuming compacting an array is harmless.** Every later element's index changes; anything that stored an index (a selection, a cached position) is now wrong. That is exactly why the preserve mode exists.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Only null and undefined, not every falsy value -- and for arrays, do you want survivors shifted down or kept at their original index?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"A recursive copy that skips keys whose value is == null. That is the skeleton."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"It overflows on a cycle, so I add a WeakMap from original to clone and register the clone before descending."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Plain objects and arrays are containers, everything else passes through; arrays either push survivors or write by index and restore length."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me feed a self-referencing object, a zero, an empty string and a Date, and confirm each is handled."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">== null</code> here when the team style guide bans loose equality?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the one deliberate exception: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x == null</code> is true for exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and for nothing else, which is precisely the nullish definition. Writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x === null || x === undefined</code> is equivalent, just longer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the preserve mode actually return, and why might a caller be surprised?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A sparse array: the removed slots are real holes, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 in result</code> is false, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code> skips them, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code> prints them as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> (verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1,null,3,null,5]</code>). If that JSON round trip matters, compact mode is the safer default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make this remove empty objects and arrays created by the cleanup too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check the cleaned child after recursing and skip it if it is an empty plain object or empty array. Be careful with the cycle case: a node that is still under construction may look empty at the moment it is checked, so this needs a second pass or a post-order design.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you actually use this in a real codebase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sanitizing a form or API payload before sending it, so optional fields the user left blank (stored as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>) are omitted rather than sent, while a deliberate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> is still transmitted.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Nullish** | Exactly \`null\` or \`undefined\`, nothing else |
| **WeakMap guard** | Maps each original node to its clone so cycles and shared nodes resolve safely |
| **Sparse array** | An array with real holes where an index has no value at all |

---
**Conclusion:** \`clearNullish\` is a recursive copy that skips \`== null\` values, made safe by registering each clone in a \`WeakMap\` before descending (so cycles resolve to the clone), limited to plain objects and arrays (so a \`Date\` passes through), and explicit about arrays (compact shifts survivors down, preserve leaves real holes). Verified directly: \`0\`, \`""\` and \`false\` survive, a self-referencing object cleans without overflow, and both array modes behave exactly as described.`,
    examples: [
      {
        label: "Real, direct proof: nullish values are removed recursively, other falsy values survive, a cycle is preserved, and arrays support compact and index-preserving modes",
        tech: "javascript",
        runnable: true,
        code: `function isPlain(v) {
  return v !== null && typeof v === "object" &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function clearNullish(value, { arrays = "compact" } = {}, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const out = [];
    seen.set(value, out);
    value.forEach((item, i) => {
      if (item == null) return;
      const cleaned = clearNullish(item, { arrays }, seen);
      if (arrays === "compact") out.push(cleaned); else out[i] = cleaned;
    });
    if (arrays === "preserve") out.length = value.length;
    return out;
  }
  if (isPlain(value)) {
    if (seen.has(value)) return seen.get(value);
    const out = {};
    seen.set(value, out);
    for (const key of Object.keys(value)) {
      if (value[key] == null) continue;
      out[key] = clearNullish(value[key], { arrays }, seen);
    }
    return out;
  }
  return value;
}

const input = { a: 1, b: null, c: undefined, d: { e: null, f: 2, g: [1, null, { h: undefined, i: 3 }, undefined] }, z: 0, s: "", n: false };
console.log("nullish removed, 0 / empty string / false kept:", JSON.stringify(clearNullish(input)));
console.log("input not mutated:", input.b === null && input.d.g.length === 4);

const circ = { name: "x", gone: null };
circ.self = circ;
const cleaned = clearNullish(circ);
console.log("cycle preserved in the clone:", cleaned.self === cleaned, "| gone removed:", !("gone" in cleaned));

const arr = [1, null, 3, undefined, 5];
const compact = clearNullish(arr);
const preserved = clearNullish(arr, { arrays: "preserve" });
console.log("compact:", JSON.stringify(compact), "length", compact.length);
console.log("preserve: length", preserved.length, "| survivors keep indices:", preserved[0], preserved[2], preserved[4], "| slot 1 is a hole:", !(1 in preserved));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Deep Map Keys",
    seoDescription:
      "A deepMapKeys utility verified at every depth including arrays, plus a real hazard: a mapper returning __proto__ silently drops the entry.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`deepMapKeys(value, fn)\` — recursively transforming every KEY of nested objects (including objects inside arrays) with \`fn\`, leaving values untouched."

**Examples:**

\`\`\`
deepMapKeys({ a: { b: [{ c: 1 }] } }, k => k.toUpperCase());
// { A: { B: [{ C: 1 }] } }
\`\`\`

**Clarifying questions expected:**
- Should keys inside objects that live inside arrays be mapped too?
- If two keys map to the same new key, which one wins?
- Which values count as "objects to descend into" — and what about a \`Date\` or a circular reference?

**Code / implementation expected:** Yes — real, direct proof at every depth, on a collision, and on a circular structure.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** beyond the happy path, this doc verifies a real, easy-to-miss hazard directly: if the mapper function returns the string \`"__proto__"\`, a plain \`out[newKey] = ...\` assignment silently swallows the entry instead of creating a property. A defineProperty-based version was verified to keep it as a normal own key.

## 1. The problem, restated

Return a copy of a nested structure in which every plain-object key has been replaced by \`fn(key)\`, at every depth and inside arrays, with values (and non-plain objects) left exactly as they were.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Arrays of objects? | Real API payloads are full of them. An array itself has no key to rename, but its object elements do, so map over the array and recurse. |
| Key collisions? | \`{ a: 1, A: 2 }\` with a lowercasing mapper produces two writes to one key. Last write wins; say so, or offer a collision callback. |
| What is a container? | Plain objects and arrays only. A \`Date\` or \`Map\` must pass through untouched. |
| Cycles? | Handle with a \`WeakMap\`, exactly like any deep clone. |

## 3. Thought process

Brute force is a recursive function: arrays map their elements through the same function, plain objects build a new object by writing \`out[fn(key)] = recurse(value)\`, and anything else returns as-is. Two refinements make it production-safe. Add a \`WeakMap\` so a self-referencing object does not recurse forever. And notice that \`out[k] = v\` is not a neutral write when \`k\` is \`"__proto__"\`: on a normal object it invokes the prototype setter instead of creating a property, so the entry vanishes. If the mapper is user-controlled or could plausibly produce that string, define the property explicitly.

## 4. Verified solution

\`\`\`js
function isPlain(v) {
  return v !== null && typeof v === "object" &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function deepMapKeys(value, fn, seen = new WeakMap()) {
  if (Array.isArray(value)) return value.map((v) => deepMapKeys(v, fn, seen));
  if (isPlain(value)) {
    if (seen.has(value)) return seen.get(value);
    const out = {};
    seen.set(value, out);
    for (const key of Object.keys(value)) out[fn(key)] = deepMapKeys(value[key], fn, seen);
    return out;
  }
  return value;
}
\`\`\`

\`\`\`
real, verified output:
  deepMapKeys({a:{b:[{c:1},{d:2}]},e:3}, k => k.toUpperCase())
    -> {"A":{"B":[{"C":1},{"D":2}]},"E":3}       (every depth, inside arrays too)
  deepMapKeys({a:"keep",b:[1,2]}, k => "x_" + k) -> {"x_a":"keep","x_b":[1,2]}   (values untouched)
  deepMapKeys({a:1,A:2}, k => k.toLowerCase())    -> {"a":2}                     (last write wins)
  a self-referencing object maps without overflow; the cycle is preserved

the hazard, mapper returns "__proto__":
  plain assignment       -> own keys [] (the entry was silently swallowed)
  defineProperty version -> own keys ["__proto__"], prototype still Object.prototype
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="plain assignment of a key named proto invokes the prototype setter and silently drops the entry while define property creates a normal own property so the entry survives">
  <defs>
    <marker id="deepmapkeys-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Writing a mapped key: assignment vs defineProperty</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">out[newKey] = value</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">__proto__ hits the setter, entry lost</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">Object.defineProperty(out, ...)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">always creates a normal own key</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">only matters when the mapper can produce that name, but it is a silent data loss when it does</text>
</svg>

## 5. Complexity

Time: O(n) in the number of keys and array elements. Space: O(n) for the new structure plus the \`WeakMap\`, and O(d) recursion depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Two keys map to the same name | The later key in iteration order wins | Both assignments target one property |
| Object inside an array | Its keys are mapped | Arrays recurse through \`.map\` |
| \`Date\`, \`Map\`, class instance | Returned unchanged | Only plain objects are containers |
| Circular reference | Preserved, no overflow | \`WeakMap\` returns the clone under construction |
| Mapper returns \`"__proto__"\` | Entry swallowed with plain assignment | The assignment triggers the prototype setter |

## 7. Common Pitfalls

- **Forgetting to recurse into arrays.** The most common bug: top-level keys are renamed but everything inside a list is missed.
- **Mapping keys of a \`Date\` or class instance.** Iterating its own keys produces an empty object and destroys the value.
- **Ignoring collisions.** \`{ a: 1, A: 2 }\` silently loses data. Detect it and throw, or take a merge callback, when the data matters.
- **Assuming \`out[k] = v\` is always a plain write.** For \`"__proto__"\` it is not; use \`Object.defineProperty\` or build the result with a null prototype when the mapper is untrusted.
- **Mutating the input.** Renaming keys in place breaks any other code holding the original object.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Rename keys at every depth, including objects inside arrays, values untouched -- and what should win if two keys collide?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Arrays map through the same function, plain objects rebuild with out[fn(key)] = recurse(value), everything else returns as is."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottlenecks:</strong> <span style="color:#f0e2c8;">"Cycles need a WeakMap, and a mapper that returns __proto__ would make plain assignment drop the entry."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Guard containers with an isPlain check, register the clone before recursing, and use defineProperty if the mapper is untrusted."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me test an array of objects, a collision, and a mapper that returns __proto__."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from the snake_case to camelCase converter elsewhere in this bank?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That converter is this function with one specific mapper. Separating the traversal (this doc) from the naming rule (the mapper) is the better design: the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepMapKeys</code> then serves camelCase, snake_case, prefixing, or redacting keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you also give the mapper the path or the value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Thread a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> array through the recursion and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn(key, value, path)</code>. That lets a caller rename only keys under a particular branch, for example only inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metadata</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the __proto__ hazard actually a global prototype pollution problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in this function: the assignment targets the fresh <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out</code> object, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code> stays clean (verified). The damage is local and quieter: the entry is dropped and, when the value is an object, the result's own prototype is replaced. This bank's prototype-pollution question covers the genuinely global variant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support mapping values as well?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an options object with a value mapper applied to leaves (non-container values) before assignment. Keep the two concerns separate so key renaming never has to know about value transformation.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Plain object** | An object whose prototype is Object.prototype or null |
| **Key collision** | Two source keys mapping to one output key, so one value is lost |
| **defineProperty write** | Creates a normal own property even for the name __proto__ |

---
**Conclusion:** \`deepMapKeys\` maps arrays through itself and rebuilds plain objects with \`fn(key)\`, leaving values and non-plain objects alone, with a \`WeakMap\` for cycles. Verified directly: keys change at every depth and inside arrays, a collision keeps the last write, and a mapper that returns \`"__proto__"\` makes plain assignment silently drop the entry while a \`defineProperty\` version keeps it.`,
    examples: [
      {
        label: "Real, direct proof: keys are mapped at every depth including inside arrays, and a mapper returning __proto__ shows why defineProperty is the safe write",
        tech: "javascript",
        runnable: true,
        code: `function isPlain(v) {
  return v !== null && typeof v === "object" &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function deepMapKeys(value, fn, seen = new WeakMap()) {
  if (Array.isArray(value)) return value.map((v) => deepMapKeys(v, fn, seen));
  if (isPlain(value)) {
    if (seen.has(value)) return seen.get(value);
    const out = {};
    seen.set(value, out);
    for (const key of Object.keys(value)) out[fn(key)] = deepMapKeys(value[key], fn, seen);
    return out;
  }
  return value;
}

console.log("every depth, including inside arrays:", JSON.stringify(deepMapKeys({ a: { b: [{ c: 1 }, { d: 2 }] }, e: 3 }, (k) => k.toUpperCase())));
console.log("collision, last write wins:", JSON.stringify(deepMapKeys({ a: 1, A: 2 }, (k) => k.toLowerCase())));

const circ = { a: 1 };
circ.me = circ;
const mapped = deepMapKeys(circ, (k) => k + "!");
console.log("circular structure mapped, cycle preserved:", mapped["me!"] === mapped);

const swallowed = deepMapKeys({ a: { admin: true } }, () => "__proto__");
console.log("mapper returning __proto__ with plain assignment, own keys:", Object.keys(swallowed));

const safeOut = {};
Object.defineProperty(safeOut, "__proto__", { value: 1, enumerable: true, writable: true, configurable: true });
console.log("defineProperty keeps it as a normal own key:", Object.keys(safeOut), "| prototype untouched:", Object.getPrototypeOf(safeOut) === Object.prototype);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Index By Utility",
    seoDescription:
      "An indexBy utility verified for collision modes and a __proto__ key: a naive {} result gets its prototype hijacked, a null-prototype one is safe.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`indexBy(array, key)\` — converting an array into an object keyed by a property (or by a function's result) for O(1) lookup, with sensible handling for duplicate keys and for hostile keys such as \`__proto__\`."

**Examples:**

\`\`\`
indexBy([{ id: 1, n: "a" }, { id: 2, n: "b" }], "id");
// { 1: { id: 1, n: "a" }, 2: { id: 2, n: "b" } }
\`\`\`

**Clarifying questions expected:**
- When two items produce the same key, should the first or last win — or should it be an error?
- Is the key property guaranteed to be safe, or could it come from untrusted data?
- Should a function be accepted as well as a property name?

**Code / implementation expected:** Yes — real, direct proof of each collision mode and of the prototype-safety behavior.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the safety claim is verified precisely. A naive \`{}\` accumulator given a key of \`"__proto__"\` was shown to swallow the item and hijack the RESULT object's own prototype (own keys empty, the item's fields readable by inheritance) — while the global \`Object.prototype\` stayed clean. A null-prototype result was verified to store that key as an ordinary own property.

## 1. The problem, restated

Turn a list into a lookup table: \`result[keyOf(item)] = item\`. The interesting part is what happens when keys repeat, and when a key is a name that a plain object treats specially.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Duplicate keys? | Last-wins is the default of most libraries, but silently discarding data is a decision. Offer first-wins and throw modes. |
| Untrusted keys? | Data from an API can contain \`"__proto__"\` or \`"constructor"\`. A plain \`{}\` result mishandles them. |
| Function or property name? | Supporting both matches lodash's \`_.keyBy\` and is trivial. |
| Key type? | Object keys are strings, so \`1\` and \`"1"\` collide. Coerce explicitly with \`String(...)\`. |

## 3. Thought process

Brute force is a loop with \`result[item[key]] = item\` into \`{}\`. It works on friendly data and has two flaws. First, the accumulator: a plain object inherits from \`Object.prototype\`, so a key of \`"__proto__"\` invokes the prototype setter instead of creating a property, and the membership check \`key in result\` reports true for inherited names like \`"constructor"\`. Creating the accumulator with \`Object.create(null)\` removes the inheritance entirely. Second, duplicates: check for an existing key before writing, and let the caller choose last-wins, first-wins, or throw.

## 4. Verified solution

\`\`\`js
function indexBy(array, iteratee, { onCollision = "last" } = {}) {
  const fn = typeof iteratee === "function" ? iteratee : (item) => item[iteratee];
  const result = Object.create(null);
  for (const item of array) {
    const key = String(fn(item));
    if (key in result) {
      if (onCollision === "first") continue;
      if (onCollision === "throw") throw new Error("Key collision: " + key);
    }
    result[key] = item;
  }
  return result;
}
\`\`\`

\`\`\`
real, verified output, users = [{id:1,n:"a"},{id:2,n:"b"},{id:1,n:"dup"}]:
  indexBy(users, "id")                          -> {"1":{id:1,n:"dup"},"2":{id:2,n:"b"}}   last wins
  indexBy(users, "id", {onCollision:"first"})   -> {"1":{id:1,n:"a"},"2":{id:2,n:"b"}}     first wins
  indexBy(users, "id", {onCollision:"throw"})   -> Error: Key collision: 1

hostile keys, [{k:"__proto__",v:"pwned"},{k:"constructor",v:"c"}]:
  null-prototype version -> own keys ["__proto__","constructor"], Object.prototype clean
  naive {} version       -> own keys [] for the "__proto__" item: it was swallowed, the RESULT's
                            prototype became that item (result.v === "pwned" by inheritance);
                            global Object.prototype still clean
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a plain object accumulator inherits from Object prototype so a key named proto changes the result prototype and drops the entry while a null prototype accumulator stores every key as an ordinary own property">
  <defs>
    <marker id="indexby-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">The accumulator decides how safe the lookup table is</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">const result = {}</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">__proto__ changes the result prototype</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">Object.create(null)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">every key is an ordinary own property</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the null-prototype result also makes key in result exact, with no inherited names</text>
</svg>

## 5. Complexity

Time: O(n) — one pass with an O(1) average key check and write. Space: O(n) for the result.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Duplicate keys | Depends on \`onCollision\`; default last wins | The existing-key check runs before the write |
| Key is \`"__proto__"\` or \`"constructor"\` | Stored as a normal key | The result has no prototype to collide with |
| Numeric key \`1\` and string key \`"1"\` | Collide into one entry | Object keys are strings; \`String(...)\` makes that explicit |
| Item missing the property | Indexed under the string \`"undefined"\` | \`String(undefined)\`. Filter such items first if that is unwanted |
| Empty array | Empty null-prototype object | The loop never runs |

## 7. Common Pitfalls

- **Using \`{}\` as the accumulator with untrusted keys.** The result's own prototype can be replaced and the item silently dropped. It is a local corruption, not global pollution, but it is still wrong data.
- **Calling \`result.hasOwnProperty(key)\` on a null-prototype result.** The method does not exist there and throws. Use \`key in result\` or \`Object.hasOwn(result, key)\`.
- **Silent last-wins on important data.** Two records sharing an ID usually means a bug upstream; surfacing it with the throw mode is often better than hiding it.
- **Forgetting the result is not a normal object.** \`JSON.stringify\` and \`Object.keys\` work, but \`result.toString()\` does not, and code that assumes prototype methods will break. If callers need a normal object, spread it: \`{ ...result }\`.
- **Using a \`Map\` when you actually need JSON.** A \`Map\` is the robust in-memory choice (any key type, no prototype issues) but does not serialize with \`JSON.stringify\` by default.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Array to lookup table -- what should win on a duplicate key, and could the keys come from untrusted data?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"A loop writing result[item.key] = item into an empty object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"A plain object inherits from Object.prototype, so a __proto__ key misbehaves, and duplicates silently overwrite."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Object.create(null) as the accumulator, String() on the key, check for an existing key, then apply the collision mode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me index an item whose key is __proto__ and confirm it becomes an ordinary own key."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just return a Map?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is the more robust structure: any key type, no prototype hazards, guaranteed insertion order. Return an object when the result must be serialized or passed to code expecting a plain lookup object; return a Map when you control both ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to groupBy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groupBy</code> keeps every item per key (an array), while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexBy</code> keeps exactly one. Collision handling is what makes indexBy a policy question and groupBy a non-issue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would freezing the result help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It prevents later accidental writes to the lookup table, but only at the top level; the items inside are still mutable. This bank's deepFreeze question covers freezing every level.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the __proto__ problem here the same as global prototype pollution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Here the write targets the fresh result object, so only that object's prototype is affected (verified: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code> stayed clean). Global pollution needs a recursive merge that walks into an existing shared prototype, which is the subject of this bank's dedicated question.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Null-prototype object** | An object created with Object.create(null), inheriting nothing |
| **Collision policy** | What to do when two items produce the same key |
| **keyBy** | The lodash name for this operation |

---
**Conclusion:** \`indexBy\` builds a lookup table with a null-prototype accumulator, string-coerced keys, and an explicit collision policy (last wins, first wins, or throw). Verified directly: all three policies behave as described, a \`"__proto__"\` key is stored as an ordinary own property, and the naive \`{}\` version was shown to drop that item and replace the result's own prototype while leaving the global \`Object.prototype\` untouched.`,
    examples: [
      {
        label: "Real, direct proof: indexBy collision modes work, and a __proto__ key is safe on a null-prototype result but hijacks the prototype of a plain object result",
        tech: "javascript",
        runnable: true,
        code: `function indexBy(array, iteratee, { onCollision = "last" } = {}) {
  const fn = typeof iteratee === "function" ? iteratee : (item) => item[iteratee];
  const result = Object.create(null);
  for (const item of array) {
    const key = String(fn(item));
    if (key in result) {
      if (onCollision === "first") continue;
      if (onCollision === "throw") throw new Error("Key collision: " + key);
    }
    result[key] = item;
  }
  return result;
}

const users = [{ id: 1, n: "a" }, { id: 2, n: "b" }, { id: 1, n: "dup" }];
console.log("last wins:", JSON.stringify(indexBy(users, "id")));
console.log("first wins:", JSON.stringify(indexBy(users, "id", { onCollision: "first" })));
try { indexBy(users, "id", { onCollision: "throw" }); } catch (e) { console.log("throw mode:", e.message); }

const evil = JSON.parse('[{"k":"__proto__","v":"pwned"},{"k":"constructor","v":"c"}]');
const safe = indexBy(evil, "k");
console.log("null-prototype result, own keys:", Object.keys(safe), "| Object.prototype clean:", ({}).v === undefined);

function naiveIndexBy(arr, key) {
  const r = {};
  for (const it of arr) r[it[key]] = it;
  return r;
}
const naive = naiveIndexBy(evil, "k");
console.log("naive {} result, own keys:", Object.keys(naive), "| inherited v through the hijacked prototype:", naive.v);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Object Difference",
    seoDescription:
      "A deep object diff was verified for added, removed and changed paths, with Object.is semantics: NaN equals NaN and +0 differs from -0.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`objectDiff(a, b)\` — returning a description of how object \`b\` differs from object \`a\`: which paths were added, which were removed, and which changed (with the old and new value), recursing into nested objects."

**Examples:**

\`\`\`
objectDiff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 }, d: 4 });
// added: { d: 4 }, removed: {}, changed: { "b.c": { from: 2, to: 3 } }
\`\`\`

**Clarifying questions expected:**
- What output shape is wanted — flat dot-paths, or a nested structure mirroring the input?
- How should arrays be compared, and how should \`NaN\`, \`+0\` and \`-0\` be treated?
- Must a key that exists with the value \`undefined\` be distinguished from a missing key?

**Code / implementation expected:** Yes — real, direct proof of each category, of nested paths, and of the equality edge cases.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the spec ("differences/modifications between two objects") leaves the output shape open, so this doc picks a concrete, testable one: three flat maps keyed by dot-path — \`added\`, \`removed\`, \`changed\`. Two subtle claims were verified directly, not through \`JSON.stringify\` (which hides both): an existing key holding \`undefined\` is reported as removed, and \`0\` vs \`-0\` is reported as changed.

## 1. The problem, restated

Compare two objects and report, for every path where they disagree, whether the path was added in \`b\`, removed from \`a\`, or holds a different value in \`b\`, descending into nested objects so the report points at the exact leaf that differs.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Output shape? | A flat map of dot-paths is easy to display, test, and apply; a nested mirror is nicer for patches. Decide and state it. |
| Arrays? | Comparing by index (path \`tags.1\`) is simplest and matches how a UI would highlight it; a real list diff (LCS) is a different, harder problem. |
| Equality semantics? | \`===\` says \`NaN !== NaN\` (a phantom change every time) and \`0 === -0\`. \`Object.is\` treats \`NaN\` as equal and \`0\`/\`-0\` as different. |
| Missing vs undefined? | \`{ x: undefined }\` and \`{}\` are different shapes. \`hasOwnProperty\` tells them apart; \`b[k] === undefined\` does not. |

## 3. Thought process

Brute force is \`JSON.stringify(a) === JSON.stringify(b)\`, which only answers "same or not", reorders nothing useful, drops \`undefined\`, and turns \`NaN\` into \`null\`. The real approach is a recursive walk over the UNION of both objects' keys. For each key: if only \`b\` has it, it is added; if only \`a\` has it, removed; if both hold objects, recurse with the extended path; otherwise compare with \`Object.is\` and record a change. Presence is tested with \`hasOwnProperty\`, not by reading the value, which is what separates "missing" from "present but undefined".

## 4. Verified solution

\`\`\`js
function isObj(v) { return v !== null && typeof v === "object"; }
function objectDiff(a, b, path = "", out = { added: {}, removed: {}, changed: {} }) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const p = path ? path + "." + k : k;
    const inA = a != null && Object.prototype.hasOwnProperty.call(a, k);
    const inB = b != null && Object.prototype.hasOwnProperty.call(b, k);
    if (!inA) out.added[p] = b[k];
    else if (!inB) out.removed[p] = a[k];
    else if (isObj(a[k]) && isObj(b[k])) objectDiff(a[k], b[k], p, out);
    else if (!Object.is(a[k], b[k])) out.changed[p] = { from: a[k], to: b[k] };
  }
  return out;
}
\`\`\`

\`\`\`
real, verified output:
  before = {name:"Ada", age:30, address:{city:"London",zip:"N1"}, tags:["a","b"], gone:1}
  after  = {name:"Ada", age:31, address:{city:"Paris",zip:"N1"}, tags:["a","c"], fresh:true}
  objectDiff(before, after) ->
    added   {"fresh":true}
    removed {"gone":1}
    changed {"age":{from:30,to:31}, "address.city":{from:"London",to:"Paris"}, "tags.1":{from:"b",to:"c"}}

  identical nested objects        -> all three maps empty
  {x:NaN} vs {x:NaN}              -> no change (Object.is treats NaN as equal)
  {x:0} vs {x:-0}                 -> reported changed; verified with Object.is that from is +0 and to is -0
  {x:undefined} vs {}             -> "x" appears under removed (checked with Object.keys, since JSON hides it)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="serializing both objects to JSON only says same or different and loses undefined and NaN while a recursive walk over the union of keys with own property checks and Object is comparison reports added removed and changed paths">
  <defs>
    <marker id="objdiff-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Compare by walking keys, not by serializing</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">JSON.stringify equality</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">same or not; loses undefined, NaN, -0</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">walk the union of keys</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">added, removed, changed per path</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">own-property checks separate missing from undefined; Object.is fixes NaN and signed zero</text>
</svg>

## 5. Complexity

Time: O(n) in the total number of keys across both objects. Space: O(d) recursion plus the size of the report.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Identical objects | Three empty maps | Nothing is added, removed or changed |
| \`NaN\` on both sides | Not a change | \`Object.is(NaN, NaN)\` is true |
| \`+0\` vs \`-0\` | A change | \`Object.is(0, -0)\` is false |
| Key present with \`undefined\` vs key missing | Reported as added/removed, not equal | \`hasOwnProperty\` distinguishes them |
| Object on one side, primitive on the other | A change at that path, not a recursion | The recurse branch needs objects on BOTH sides |
| Array element changed | Path uses the index, for example \`tags.1\` | Arrays are walked as objects with numeric keys |

## 7. Common Pitfalls

- **Comparing with \`JSON.stringify\`.** It cannot say WHERE the difference is, treats key order as significant, drops \`undefined\`, and turns \`NaN\` into \`null\`.
- **Comparing with \`===\`.** \`NaN\` then differs from itself on every run, producing a phantom change you can never clear.
- **Reading \`b[k] === undefined\` to detect a missing key.** That conflates a missing key with a present-but-undefined one; use \`hasOwnProperty\`.
- **Recursing when only one side is an object.** Descending into a primitive yields nonsense; recurse only when both sides are objects, otherwise report a change.
- **Assuming array diff by index is a real list diff.** Inserting one item at the front makes every following index look changed. If moves matter, you need an identity-based or LCS diff.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"I will report added, removed and changed by dot-path. Is that the output shape you want, and how should arrays and NaN behave?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Stringify both and compare -- it tells me same or different, but not where."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"It loses the location, drops undefined and mangles NaN, so I walk the union of keys instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Own-property checks decide added or removed, both-objects recurses, everything else is compared with Object.is."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"NaN versus NaN, zero versus negative zero, and an undefined key versus a missing key."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you turn this report into a patch you can apply?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Apply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">added</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">changed.to</code> with this bank's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> by path and delete the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removed</code> paths. Because the paths are flat and unambiguous, the diff is directly replayable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not build on a deepEqual function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">deepEqual answers a yes/no question; the diff must also locate every difference, so it needs the walk itself. A deepEqual is still useful as a fast pre-check: if the two objects are equal, skip the walk and return empty maps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does this not handle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Circular references (it would recurse forever; add a seen set), non-plain objects such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> (it would treat them as containers with no own keys and report them equal), and keys containing a literal dot, which make the paths ambiguous. This bank's flatten and deepEqual questions cover the fixes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where is this used in real products?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Audit logs ("who changed which field"), form dirty-tracking (send only changed fields), and sync engines that upload a minimal delta instead of the whole document.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Object.is** | Equality where NaN equals NaN and +0 differs from -0 |
| **Own property check** | hasOwnProperty tells a missing key from one holding undefined |
| **Dot-path** | A string like address.city naming a nested leaf |

---
**Conclusion:** \`objectDiff\` walks the union of both objects' keys, using own-property checks to classify each path as added or removed, recursing only when both sides are objects, and comparing leaves with \`Object.is\` to report changes. Verified directly: nested and array-index paths are reported exactly, identical inputs give empty maps, \`NaN\` equals \`NaN\`, \`0\` differs from \`-0\`, and an existing \`undefined\` key is distinguished from a missing one.`,
    examples: [
      {
        label: "Real, direct proof: a deep diff reports added, removed and changed paths, with Object.is semantics for NaN and signed zero",
        tech: "javascript",
        runnable: true,
        code: `function isObj(v) { return v !== null && typeof v === "object"; }
function objectDiff(a, b, path = "", out = { added: {}, removed: {}, changed: {} }) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const p = path ? path + "." + k : k;
    const inA = a != null && Object.prototype.hasOwnProperty.call(a, k);
    const inB = b != null && Object.prototype.hasOwnProperty.call(b, k);
    if (!inA) out.added[p] = b[k];
    else if (!inB) out.removed[p] = a[k];
    else if (isObj(a[k]) && isObj(b[k])) objectDiff(a[k], b[k], p, out);
    else if (!Object.is(a[k], b[k])) out.changed[p] = { from: a[k], to: b[k] };
  }
  return out;
}

const before = { name: "Ada", age: 30, address: { city: "London", zip: "N1" }, tags: ["a", "b"], gone: 1 };
const after = { name: "Ada", age: 31, address: { city: "Paris", zip: "N1" }, tags: ["a", "c"], fresh: true };
console.log("diff:", JSON.stringify(objectDiff(before, after)));
console.log("identical nested objects:", JSON.stringify(objectDiff({ a: { b: 1 } }, { a: { b: 1 } })));
console.log("NaN vs NaN is not a change:", Object.keys(objectDiff({ x: NaN }, { x: NaN }).changed).length === 0);

const zero = objectDiff({ x: 0 }, { x: -0 });
console.log("0 vs -0 is a change:", "x" in zero.changed, "| to is -0:", Object.is(zero.changed.x.to, -0));

const undef = objectDiff({ x: undefined }, {});
console.log("existing undefined key vs missing key is removed:", Object.keys(undef.removed));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Count Occurrences of Each Element in an Array (Frequency Counter)",
    seoDescription:
      "A Map-based frequency counter was verified, and the naive {} counter was shown to corrupt the word constructor and to merge 1 with the string 1.",
    description: `**Problem, as an interviewer would state it:**
"Count how many times each distinct element appears in an array. Discuss edge cases, runtime, and alternative approaches."

**Examples:**

\`\`\`
count(["a", "b", "a", "c", "a", "b"]); // a: 3, b: 2, c: 1
\`\`\`

**Clarifying questions expected:**
- Should \`1\` and \`"1"\` be counted separately? What about \`NaN\`?
- Are the elements guaranteed to be safe strings, or could one be the word \`constructor\`?
- Do you also want the results sorted by frequency, or just the counts?

**Code / implementation expected:** Yes — real, direct proof of the correct counter and of exactly how the naive object counter goes wrong.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** this "easy-looking" question is really about choosing the right accumulator. Two failures of the naive plain-object counter were verified directly: counting the word \`"constructor"\` produces a STRING beginning \`function Object()\`, and \`1\` and \`"1"\` silently merge into one key.

## 1. The problem, restated

For every distinct value in an array, report how many times it occurs. The algorithm is one pass; the substance is the data structure that holds the counts.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Types of elements? | Object keys are always strings, so a plain-object counter conflates \`1\` and \`"1"\`. A \`Map\` keeps them apart. |
| Hostile or arbitrary strings? | Words like \`constructor\`, \`toString\` or \`__proto__\` collide with inherited properties on a plain \`{}\`. |
| \`NaN\`? | \`Map\` treats all \`NaN\` values as one key (SameValueZero), which is usually what you want. |
| Sorted output? | Sorting by count is a second, separate step; ask whether it is needed and how ties should break. |

## 3. Thought process

Brute force is nested loops: for each element, scan the array counting matches. That is O(n^2) and recounts values it has already counted. The linear approach keeps a running tally in one pass: \`counts[x] = (counts[x] || 0) + 1\`. With a plain object this is the classic answer, and it is subtly wrong: the read \`counts["constructor"]\` finds the INHERITED \`Object\` function, so \`(fn || 0) + 1\` becomes string concatenation and the tally is corrupted. Using a \`Map\` (or a null-prototype object) removes the inherited names and, for \`Map\`, also preserves the type distinction between \`1\` and \`"1"\`. Read the current count with \`?? 0\` rather than \`|| 0\`, so a stored count is never mistaken for missing.

## 4. Verified solution

\`\`\`js
function countOccurrences(arr) {
  const counts = new Map();
  for (const item of arr) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}
\`\`\`

\`\`\`
real, verified output:
  countOccurrences(["a","b","a","c","a","b"]) -> [["a",3],["b",2],["c",1]]
  countOccurrences([NaN, NaN, 1]).get(NaN)    -> 2        (NaN is a single key)
  countOccurrences([1, "1", 1])               -> [[1,2],["1",1]]   (kept distinct)
  sorted by frequency, descending             -> [["x",3],["y",2],["z",1]]
  Object.groupBy(["a","b","a"], x => x) lengths -> [["a",2],["b",1]]   (same counts)

the naive plain-object counter:
  count(["constructor","a"])  -> typeof result.constructor is "string"
                                 value begins "function Object() { [native code] }..."   (corrupted)
  count([1,"1"])              -> {"1":2}   (two different values merged)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a plain object counter inherits names like constructor and stringifies keys so it corrupts some counts and merges one and the string one while a Map has no inherited keys and keeps key types distinct">
  <defs>
    <marker id="freqcount-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">The accumulator is the whole question</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">plain object counts</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">constructor corrupts, 1 merges with "1"</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">Map counts</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">no inherited names, key types kept</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">one pass either way; only the Map (or a null-prototype object) is correct for arbitrary data</text>
</svg>

## 5. Complexity

Time: O(n) — one pass with O(1) average \`Map\` operations, versus O(n^2) for the nested-loop brute force. Space: O(k) for \`k\` distinct values. Sorting by frequency afterwards adds O(k log k).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty array | Empty \`Map\` | The loop never runs |
| \`1\` and \`"1"\` | Two separate entries with a \`Map\` | \`Map\` does not stringify keys |
| \`NaN\` repeated | One entry with the full count | SameValueZero treats \`NaN\` as equal to itself |
| The word \`constructor\` | Counted normally with a \`Map\` | \`Map\` has no inherited string keys |
| Objects as elements | Counted by reference identity | Two equal-looking literals are different keys |
| Ties when sorting by count | Insertion order is preserved by a stable sort | \`Map\` iterates in insertion order and \`Array.prototype.sort\` is stable |

## 7. Common Pitfalls

- **Using \`{}\` for arbitrary input.** Inherited names corrupt counts (verified with \`constructor\`) and every key is stringified. If you must use an object, create it with \`Object.create(null)\`.
- **Reading the count with \`|| 0\`.** It is fine for counts (a stored count is never 0), but \`?? 0\` states the intent and stays correct if you ever store zero.
- **Nested-loop counting.** Recounting the array per element is O(n^2) and wastes the fact that one pass suffices.
- **Expecting sorted output for free.** A \`Map\` iterates in insertion order, not by frequency; sort explicitly.
- **Counting objects and expecting value equality.** Keys are compared by identity; if you need "same shape" counting, serialize a canonical key first.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Count each distinct element -- are 1 and the string 1 the same, and could an element be a word like constructor?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"For each element scan the whole array counting matches, which is O(n squared)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck and the trap:</strong> <span style="color:#f0e2c8;">"One pass with a tally is O(n), but a plain object accumulator inherits names like constructor and stringifies keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"A Map, get with nullish-coalescing zero, set plus one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me count the word constructor, a NaN twice, and both 1 and the string 1."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the most frequent element, or the top k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort the entries by count descending and slice: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...counts].sort((a, b) =&gt; b[1] - a[1]).slice(0, k)</code>, O(k' log k') for k' distinct values. For very large inputs with small k, a bounded heap or bucket-by-count approach avoids sorting everything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do this with reduce or Object.groupBy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.groupBy(arr, x =&gt; x)</code> followed by mapping each group to its length gave the same counts (verified), but it builds every group array just to measure it, and it stringifies keys. A single-pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> tally is leaner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the naive counter turn constructor into a string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the first sighting, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counts["constructor"]</code> is not missing: it resolves to the inherited <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object</code> function, which is truthy, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|| 0</code> keeps it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function + 1</code> is string concatenation. That is the verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function Object() {...}1</code> result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count characters in a string, including emoji?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> or spread the string, which walks code points, rather than indexing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str[i]</code>, which splits a surrogate pair into two broken halves. Then use the same Map tally.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Frequency counter** | A map from each distinct value to how often it appears |
| **SameValueZero** | The equality Map uses: NaN equals NaN, and keys keep their type |
| **Inherited key** | A property found via the prototype, such as constructor on a plain object |

---
**Conclusion:** counting is a single pass over the array with a tally, and the correctness lives entirely in the accumulator. A \`Map\` (read with \`?? 0\`) keeps \`1\` and \`"1"\` apart, treats \`NaN\` as one key, and has no inherited names; a plain \`{}\` was verified to turn the word \`constructor\` into a string starting \`function Object()\` and to merge \`1\` with \`"1"\`. Sorting by frequency is a separate, explicit step.`,
    examples: [
      {
        label: "Real, direct proof: a Map-based frequency counter is correct, while a plain-object counter corrupts the word constructor and merges 1 with the string 1",
        tech: "javascript",
        runnable: true,
        code: `function countOccurrences(arr) {
  const counts = new Map();
  for (const item of arr) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

console.log("Map counter:", JSON.stringify([...countOccurrences(["a", "b", "a", "c", "a", "b"])]));
console.log("NaN is a single key, count:", countOccurrences([NaN, NaN, 1]).get(NaN));
console.log("1 and the string 1 stay distinct:", JSON.stringify([...countOccurrences([1, "1", 1])]));

const top = [...countOccurrences(["x", "y", "x", "z", "x", "y"])].sort((a, b) => b[1] - a[1]);
console.log("sorted by frequency, descending:", JSON.stringify(top));

function naiveCount(arr) {
  const c = {};
  for (const x of arr) c[x] = (c[x] || 0) + 1;
  return c;
}
const bad = naiveCount(["constructor", "a"]);
console.log("naive counter, the word constructor:", typeof bad.constructor, "| starts with:", String(bad.constructor).slice(0, 18));
console.log("naive counter merges 1 and the string 1:", JSON.stringify(naiveCount([1, "1"])));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Flatten and Unflatten a Nested Object (dot notation & arrays)",
    seoDescription:
      "Flatten/unflatten verified to round-trip arrays, nulls, empty containers and dotted keys via escaping, reject a __proto__ path, and show one limit.",
    description: `**Problem, as an interviewer would state it:**
"Create \`flattenObject(obj)\` producing \`{ "a.b.0.c": value }\` from a nested object, and \`unflattenObject\` to reverse it. Support arrays and escaping."

**Examples:**

\`\`\`
flattenObject({ a: { b: [{ c: 1 }] } }); // { "a.b.0.c": 1 }
unflattenObject({ "a.b.0.c": 1 });       // { a: { b: [{ c: 1 }] } }
\`\`\`

**Clarifying questions expected:**
- How should a key that itself contains a dot be represented so it survives the round trip?
- Should numeric path segments rebuild real arrays on the way back?
- What about empty objects and arrays, \`null\` leaves, and untrusted input paths like \`__proto__.x\`?

**Code / implementation expected:** Yes — real, direct proof of a full round trip, of dotted keys, and of the safety guard.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the round trip was verified end to end, including the parts that usually break it: a key containing a dot (\`"f.g"\`), empty \`{}\`/\`[]\` leaves, \`null\` leaves, and arrays nested inside arrays. One genuine limitation of the dot-notation format is also verified honestly rather than hidden: an object with numeric-looking keys comes back as an ARRAY.

## 1. The problem, restated

Convert a nested structure into a single-level object whose keys are the dot-joined paths to each leaf, then convert back. The format is lossless only if key names cannot be confused with the separator, and only if empty containers are represented.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Keys that contain dots? | \`{ "f.g": 5 }\` and \`{ f: { g: 5 } }\` would both flatten to \`"f.g"\`. An escape (\`f\\.g\`) removes the ambiguity. |
| Empty objects and arrays? | They have no leaves, so a naive flatten drops them entirely and the round trip loses data. Emit them as leaf values. |
| Arrays back as arrays? | A numeric next segment means the container is an array; otherwise a plain object. |
| Untrusted input? | An input path such as \`__proto__.polluted\` must not walk into a prototype during unflatten. |

## 3. Thought process

Flatten is a straightforward recursion carrying a path prefix: containers recurse, leaves write \`out[prefix] = value\`. The real design work is the format. Escape each key before joining, backslash first and then dots, so a literal dot can never be mistaken for a separator; store an empty object or array as a leaf so it survives. Unflatten must be the exact inverse: split the path with a small scanner that honours backslash escapes (a plain \`split(".")\` would tear \`f\\.g\` apart), then walk down creating containers as needed, choosing an array when the NEXT segment is all digits. Because unflatten writes attacker-controlled path segments into live objects, reject \`__proto__\`, \`constructor\` and \`prototype\` segments.

## 4. Verified solution

\`\`\`js
const esc = (k) => String(k).replace(/\\\\/g, "\\\\\\\\").replace(/\\./g, "\\\\.");

function flattenObject(value, prefix = "", out = {}) {
  const isArr = Array.isArray(value);
  const isObj = value !== null && typeof value === "object" && !isArr &&
    Object.getPrototypeOf(value) === Object.prototype;
  if (isArr || isObj) {
    const keys = isArr ? value.map((_, i) => String(i)) : Object.keys(value);
    if (keys.length === 0) { if (prefix !== "") out[prefix] = isArr ? [] : {}; return out; }
    for (const k of keys) flattenObject(value[k], prefix === "" ? esc(k) : prefix + "." + esc(k), out);
    return out;
  }
  out[prefix] = value;
  return out;
}

function splitPath(path) {
  const parts = [];
  let cur = "";
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === "\\\\" && i + 1 < path.length) { cur += path[++i]; }
    else if (ch === ".") { parts.push(cur); cur = ""; }
    else cur += ch;
  }
  parts.push(cur);
  return parts;
}

const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);
function unflattenObject(flat) {
  const root = {};
  for (const path of Object.keys(flat)) {
    const parts = splitPath(path);
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (UNSAFE.has(k)) throw new Error("Unsafe key: " + k);
      if (cur[k] == null || typeof cur[k] !== "object") cur[k] = /^\\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[k];
    }
    const last = parts[parts.length - 1];
    if (UNSAFE.has(last)) throw new Error("Unsafe key: " + last);
    cur[last] = flat[path];
  }
  return root;
}
\`\`\`

\`\`\`
real, verified output, src = { a:{b:[{c:1},{c:2}],d:"x"}, e:null, "f.g":5, h:[], i:{}, j:[10,[20,30]] }:
  flat = {"a.b.0.c":1, "a.b.1.c":2, "a.d":"x", "e":null, "f\\.g":5, "h":[], "i":{}, "j.0":10, "j.1.0":20, "j.1.1":30}
  unflatten(flat) deep-equals src (checked via JSON): true
    the dotted key "f.g" came back as one key (escape text is f\\.g), not f -> g
    arrays came back as real arrays, including the array inside an array
    the empty [] and {} leaves survived; the null leaf survived

  unflatten({"__proto__.polluted":"yes"}) -> Error: Unsafe key: __proto__   (Object.prototype stayed clean)

known limit, verified:
  flatten then unflatten of { x: { "0":"a", "1":"b" } } -> x comes back as an ARRAY
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="naive joining and splitting on dots cannot tell a key containing a dot from a nested path and drops empty containers while escaping each key and storing empty containers as leaves makes the round trip lossless">
  <defs>
    <marker id="flatunflat-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">The path format decides whether the round trip is lossless</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">join with dot, split on dot</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">f.g is ambiguous, empty containers vanish</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">escape keys, keep empties as leaves</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a scanner splits only on unescaped dots</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">unflatten also rejects proto, constructor and prototype segments from untrusted paths</text>
</svg>

## 5. Complexity

Time: O(n · L) where \`n\` is the number of leaves and \`L\` is the average path length (escaping and splitting are linear in it). Space: O(n · L) for the flat keys, plus O(d) recursion.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Key containing a dot | Preserved through the round trip | The dot is escaped on the way out and the scanner ignores escaped dots on the way in |
| Key containing a backslash | Preserved | Backslash is escaped first, so the escape character itself is unambiguous |
| Empty \`{}\` or \`[]\` | Preserved as a leaf value | Otherwise there is no leaf and the container would vanish |
| \`null\` value | Preserved as a leaf | \`null\` is not treated as a container |
| Array inside an array | Rebuilt as nested real arrays | Each numeric next segment creates an array |
| Path segment \`__proto__\` | Throws | The unsafe-key guard runs before any write |
| Object with keys \`"0"\`, \`"1"\` | Comes back as an array (known limit) | All-digit segments are indistinguishable from array indices |

## 7. Common Pitfalls

- **Using \`path.split(".")\` in unflatten.** It tears an escaped key apart; the split must honour the escape character.
- **Escaping in the wrong order.** Escape backslashes BEFORE dots, otherwise the backslash you just added for a dot gets doubled.
- **Dropping empty containers.** A recursion that only writes at leaves loses \`{}\` and \`[]\` silently.
- **Writing untrusted path segments into live objects.** \`unflatten({ "__proto__.x": 1 })\` on a naive implementation writes into a shared prototype. Reject or block those segments.
- **Believing the format is fully lossless.** It is not: object keys that look like array indices are ambiguous. If that matters, encode array indices differently (for example \`[0]\`) or carry type information.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Nested to dot-path keys and back -- how should a key that contains a dot survive, and do empty containers need to round trip?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"Recurse with a prefix and write leaves, then split on dots to rebuild."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"A dotted key becomes ambiguous and empty containers disappear, so I escape keys and store empties as leaves."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Escape backslash then dot, a scanner for unflatten, arrays when the next segment is numeric, and a guard on unsafe segments."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"A round trip with a dotted key, an empty array, a null, and an input path of __proto__.polluted."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you fix the numeric-keys-become-an-array ambiguity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mark array indices distinctly in the path, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.b[0].c</code>, so an object key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code> and an index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0]</code> are different tokens. The cost is a slightly more complex scanner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you use the flat form?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Form libraries (a field name like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">address.city</code>), environment or config overrides (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DB.HOST</code>), flat key-value stores, and building an object diff by path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does flatten only treat plain objects as containers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Date</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> or class instance has no meaningful own enumerable keys to descend into; treating it as a leaf keeps the value intact instead of flattening it to nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it handle circular references?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — a cycle recurses until the stack overflows, and a flat path map cannot represent a cycle anyway. Detect it first with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code> of ancestors and throw a clear error; this bank's circular-reference question covers detection.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Flatten** | Turn nested structure into one level of dot-path keys |
| **Escape** | A backslash marking a dot or backslash as part of a key, not a separator |
| **Leaf** | A value with nothing further to descend into, including empty containers |

---
**Conclusion:** flattening is a prefix-carrying recursion, and unflattening is its exact inverse; the format is what makes it correct. Escaping each key (backslash first, then dots), storing empty containers as leaves, splitting with an escape-aware scanner, and creating an array when the next segment is numeric gave a verified lossless round trip for arrays, nulls, empties and dotted keys, with unsafe path segments rejected. The one verified limit: an object whose keys look like array indices returns as an array.`,
    examples: [
      {
        label: "Real, direct proof: flatten then unflatten round-trips arrays, nulls, empty containers and a dotted key via escaping, rejects a __proto__ path, and shows the numeric-keys limit",
        tech: "javascript",
        runnable: true,
        code: `const esc = (k) => String(k).replace(/\\\\/g, "\\\\\\\\").replace(/\\./g, "\\\\.");

function flattenObject(value, prefix = "", out = {}) {
  const isArr = Array.isArray(value);
  const isObj = value !== null && typeof value === "object" && !isArr &&
    Object.getPrototypeOf(value) === Object.prototype;
  if (isArr || isObj) {
    const keys = isArr ? value.map((_, i) => String(i)) : Object.keys(value);
    if (keys.length === 0) { if (prefix !== "") out[prefix] = isArr ? [] : {}; return out; }
    for (const k of keys) flattenObject(value[k], prefix === "" ? esc(k) : prefix + "." + esc(k), out);
    return out;
  }
  out[prefix] = value;
  return out;
}

function splitPath(path) {
  const parts = [];
  let cur = "";
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === "\\\\" && i + 1 < path.length) { cur += path[++i]; }
    else if (ch === ".") { parts.push(cur); cur = ""; }
    else cur += ch;
  }
  parts.push(cur);
  return parts;
}

const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);
function unflattenObject(flat) {
  const root = {};
  for (const path of Object.keys(flat)) {
    const parts = splitPath(path);
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (UNSAFE.has(k)) throw new Error("Unsafe key: " + k);
      if (cur[k] == null || typeof cur[k] !== "object") cur[k] = /^\\d+$/.test(parts[i + 1]) ? [] : {};
      cur = cur[k];
    }
    const last = parts[parts.length - 1];
    if (UNSAFE.has(last)) throw new Error("Unsafe key: " + last);
    cur[last] = flat[path];
  }
  return root;
}

const src = { a: { b: [{ c: 1 }, { c: 2 }], d: "x" }, e: null, "f.g": 5, h: [], i: {}, j: [10, [20, 30]] };
const flat = flattenObject(src);
console.log("flat:", JSON.stringify(flat));

const back = unflattenObject(flat);
console.log("round trip equals the original:", JSON.stringify(back) === JSON.stringify(src));
console.log("dotted key f.g preserved as one key:", "f.g" in back, "| arrays are real arrays:", Array.isArray(back.a.b), Array.isArray(back.j[1]));
console.log("empty leaves and null survived:", JSON.stringify(back.h), JSON.stringify(back.i), back.e === null);

try {
  unflattenObject({ "__proto__.polluted": "yes" });
} catch (e) {
  console.log("unsafe path rejected:", e.message, "| Object.prototype clean:", ({}).polluted === undefined);
}

const amb = unflattenObject(flattenObject({ x: { "0": "a", "1": "b" } }));
console.log("known limit, an object with keys 0 and 1 comes back as an array:", Array.isArray(amb.x));`,
      },
    ],
  },
];

export default augments;
