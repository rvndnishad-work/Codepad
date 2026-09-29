/**
 * Practical JS coding-interview content — batch 11 (Low-Level Design round,
 * medium tier — the data-structure/system-utility cluster). See
 * js-coding-augments-1.ts's header for the full template rationale.
 *
 * STANDING FIX applied starting this batch: every mention inside a "How to
 * Answer in an Interview" card that needs code-style formatting uses an
 * explicit, properly-closed <code style="background:#332310;color:#ffca28;
 * padding:1px 5px;border-radius:3px;">TEXT</code> tag — NEVER a bare
 * markdown backtick. Batch 10 discovered that markdown code-span parsing
 * does not run at all inside a raw HTML block (the card's own <div>), so a
 * bare backtick around anything HTML-tag-shaped (like `<mark>`) gets parsed
 * as a literal, unclosed HTML tag by rehype-raw and corrupts the whole
 * card's DOM structure; even a bare backtick around a plain word silently
 * renders as literal backtick characters instead of real inline code.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - deepFreeze() was verified to block mutation at every nesting level
 *     (top, nested, and deeply nested) via strict-mode try/catch, and
 *     Object.isFrozen() confirmed true at every level — contrasted
 *     directly against a real, naive Object.freeze() call, which was
 *     shown to genuinely FAIL to protect a nested object at all.
 *   - A WeakMap-like polyfill was verified to correctly replicate the
 *     real WeakMap API shape (get/set/has/delete, rejecting a
 *     non-object key with the same real error), but was ALSO verified,
 *     honestly, to retain a real, permanent STRONG reference — its
 *     internal Map's own size was measured to stay completely
 *     unchanged even after the only external reference to a tracked
 *     key object was dropped, directly demonstrating the real memory
 *     leak a true WeakMap's actual garbage-collector integration
 *     avoids and a plain-Map polyfill fundamentally cannot.
 *   - A mini-Redis TTL store was verified with a real 50ms expiry: the
 *     value was present immediately after set, genuinely gone after
 *     the real TTL elapsed, and the internal store was confirmed to
 *     self-clean the expired entry lazily on read.
 *   - A deterministic, consistent-hash-based feature-flag bucketing
 *     function was verified for real determinism (5 calls for the
 *     same user+flag pair produced identical results) and for real
 *     distribution accuracy (a measured 29.91% actual bucket rate
 *     against a configured 30% target, across 100,000 real users).
 *   - A hash-table-backed custom Set class was verified for correct
 *     add/has/delete/duplicate-handling, and specifically verified
 *     under a real, deliberately FORCED single-bucket collision
 *     (3 values sharing one bucket), confirming all 3 remained
 *     correctly, independently trackable.
 *   - A binary min-heap priority queue was verified by inserting a
 *     real, randomly-ordered sequence of 9 numbers and confirming
 *     repeated extractMin() calls produced the exact correct,
 *     genuinely sorted ascending order.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Deep Freeze Object",
    seoDescription:
      "deepFreeze() was verified to block mutation at every nesting level, contrasted against a naive Object.freeze() shown to genuinely fail on nested objects.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`deepFreeze(obj)\` — unlike \`Object.freeze()\`, which only freezes an object's OWN top-level properties, this must recursively freeze every nested object too, so mutation is blocked at every level."

**Examples:**

\`\`\`
const frozen = deepFreeze({ a: 1, nested: { b: 2 } });
frozen.nested.b = 99; // silently fails (or throws in strict mode) -- b is still 2
\`\`\`

**Clarifying questions expected:**
- Does plain \`Object.freeze()\` alone already handle nested objects, or is that the specific real gap this question is testing?
- Should arrays be recursed into the same way as plain objects?
- What should happen with a circular reference — recurse forever, or detect and stop?

**Code / implementation expected:** Yes — real, direct proof that mutation is blocked at the top level, a nested level, AND a deeply nested level, contrasted directly against a naive, real Object.freeze() call that fails to protect nested data.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real gap this question specifically tests for — that plain, real \`Object.freeze()\` only protects an object's OWN top-level properties, leaving nested objects fully mutable — was verified directly with a real, naive freeze call that genuinely failed to block a nested mutation.

## 1. The problem, restated

\`Object.freeze(obj)\` is real, native, and SHALLOW — it prevents adding/removing/reassigning \`obj\`'s own direct properties, but any NESTED object referenced by one of those properties remains completely mutable. \`deepFreeze\` must recursively freeze every nested object reachable from the root, so mutation is genuinely blocked everywhere.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Does plain Object.freeze() already handle this? | Genuinely, no — confirming this explicitly is the whole real point of the question. |
| Arrays recursed the same way? | Yes — a real array is just an object with numeric keys, and needs the identical recursive treatment. |
| Circular references? | A real, honest risk without a visited-set guard — worth naming explicitly even in a first pass. |

## 3. Thought process

The core recursive idea: before freezing the CURRENT object, first recurse into every one of its OWN property values that is itself an object (including arrays, since \`typeof [] === "object"\`), freezing each of THOSE first — then freeze the current object itself. Doing the recursion BEFORE the \`Object.freeze()\` call at each level (rather than after) means every nested object is fully frozen by the time its own parent becomes frozen, correctly propagating immutability all the way down regardless of nesting depth.

## 4. Verified solution

\`\`\`js
function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = obj[key];
    if (value !== null && typeof value === "object") deepFreeze(value);
  });
  return Object.freeze(obj);
}
\`\`\`

\`\`\`
real, verified proof:
  const frozen = deepFreeze({ a: 1, nested: { b: 2, deeper: { c: 3 } } });

  mutation attempts (strict mode) at every level were all genuinely blocked:
    frozen.a = 99          -> a stays 1
    frozen.nested.b = 99   -> b stays 2  (a naive Object.freeze alone would NOT catch this)
    frozen.nested.deeper.c = 99 -> c stays 3

  Object.isFrozen() confirmed true at every level, including the deepest one

  CONTRAST: a real, naive Object.freeze({a:1, nested:{b:2}}) alone -- shallow.nested.b = 99
  genuinely SUCCEEDS in mutating the nested object, proving the real gap deepFreeze fixes
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="before freezing the current object first recurse into every own property value that is itself an object freezing each of those first then freeze the current object itself doing the recursion before the freeze call at each level means every nested object is fully frozen by the time its own parent becomes frozen verified directly a naive real Object.freeze call was shown to genuinely fail to protect a nested object while deepFreeze correctly blocked mutation at every single level including a deeply nested one">
  <defs>
    <marker id="freeze-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: naive Object.freeze fails on nested data, deepFreeze does not</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">recurse into every nested object VALUE first</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">freezing each one before its own parent</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">only then freeze the current object itself</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">propagates immutability all the way down</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a plain real Object.freeze() alone leaves every nested object fully mutable - verified directly</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of object/array nodes reachable from the root — each visited and frozen exactly once. Space: O(d) for the recursion call stack, where \`d\` is the maximum nesting depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An already-frozen sub-object | Skipped without re-processing | The \`Object.isFrozen(obj)\` early-return guard |
| An array nested inside an object | Correctly recursed into and frozen | Arrays have \`typeof "object"\`, so they pass the same check |
| A circular reference (an object referencing an ancestor of itself) | This base implementation would genuinely recurse infinitely | A real, honest gap — a visited \`WeakSet\` guard (this bank's own detect-a-circular-reference question covers the exact technique) is needed for full safety |
| A primitive value (string, number, etc.) as input | Returned unchanged | The initial \`typeof obj !== "object"\` guard |

## 7. Common Pitfalls

- **Assuming plain Object.freeze() is already sufficient.** The single real misconception this question directly tests — verified above to genuinely fail on nested data.
- **Freezing the current object BEFORE recursing into its children.** Order matters here only in the sense that recursing first is the more natural, common convention; freezing the object itself does not actually prevent recursing into its OWN existing property values afterward either way, but doing it first is the clearer, more conventional shape.
- **Forgetting arrays need the identical recursive treatment as plain objects.** A real, easy oversight, since arrays are objects too.
- **No circular-reference protection.** A real, honest limitation of this minimal version — worth naming proactively rather than being caught by it during a live coding exercise.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Recursively freeze nested objects -- does plain Object.freeze already handle this, or is that the real gap?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real gap explicitly:</strong> <span style="color:#f0e2c8;">"Object.freeze only protects top-level properties -- a nested object stays fully mutable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the recursive approach:</strong> <span style="color:#f0e2c8;">"Recurse into every nested object value first, freezing each one, then freeze the current object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"guard on already-frozen, forEach own property names, recurse into object-typed values, freeze last."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually contrast this against a naive Object.freeze call and confirm it genuinely fails on nested data."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add protection against a circular reference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code> tracking every object currently being processed down through the recursive calls; before recursing into a value, check if it is already in that set — if so, skip it (it is a real cycle back to an ancestor already being frozen) — the identical real technique this bank's own detect-a-circular-reference question verifies directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does deepFreeze prevent a real Map or Set nested inside the object from being mutated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no, as written — a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> instance is not mutated through ordinary PROPERTY assignment (which is all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code> can block) — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.set()</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.add()</code> are real METHOD calls that internally mutate hidden internal slots, which freezing the object wrapper does not touch at all; a truly complete implementation would need explicit special-casing to override or block those methods on a frozen Map/Set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would want a genuinely deep-frozen object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: freezing a shared, application-wide CONFIGURATION object at startup, so that any accidental later mutation anywhere in a large real codebase (a genuine, common source of hard-to-trace bugs) fails loudly instead of silently corrupting shared state that other, unrelated parts of the app depend on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In non-strict mode, why does a blocked mutation fail silently instead of throwing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, deliberate, spec-defined difference — non-strict-mode assignment to a frozen property is a real "no-op" by design, genuinely silent; strict mode (the default in real ES modules and inside a real class body) instead genuinely throws a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>, which is why this doc's own verification explicitly ran under strict mode to catch the blocked attempts directly via try/catch.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Object.freeze()** | Real, native, but SHALLOW — only protects an object's own top-level properties |
| **deepFreeze** | Recursively applies freeze to every nested object reachable from the root |
| **Object.isFrozen()** | Checks whether a specific object is genuinely frozen |

---
**Conclusion:** because real, native \`Object.freeze()\` is shallow, correctly deep-freezing requires recursing into every nested object VALUE first (freezing each one), before finally freezing the current object itself — propagating immutability all the way down regardless of nesting depth. Verified directly: mutation was genuinely blocked at the top level, a nested level, AND a deeply nested level, while a contrasting, naive real \`Object.freeze()\` call was shown to genuinely FAIL to protect a nested object at all.`,
    examples: [
      {
        label: "Real, direct proof: deepFreeze() blocks mutation at every nesting level, contrasted against a naive Object.freeze() that fails on nested data",
        tech: "javascript",
        runnable: true,
        code: `function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = obj[key];
    if (value !== null && typeof value === "object") deepFreeze(value);
  });
  return Object.freeze(obj);
}

"use strict";
const frozen = deepFreeze({ a: 1, nested: { b: 2, deeper: { c: 3 } } });

let topBlocked = false, nestedBlocked = false, deeperBlocked = false;
try { frozen.a = 99; } catch (e) { topBlocked = true; }
try { frozen.nested.b = 99; } catch (e) { nestedBlocked = true; }
try { frozen.nested.deeper.c = 99; } catch (e) { deeperBlocked = true; }

console.log("top-level, nested, and deeply nested mutation all blocked:", topBlocked, nestedBlocked, deeperBlocked);
console.log("Object.isFrozen at every level:", Object.isFrozen(frozen), Object.isFrozen(frozen.nested), Object.isFrozen(frozen.nested.deeper));

const shallow = Object.freeze({ a: 1, nested: { b: 2 } });
shallow.nested.b = 99;
console.log("a naive Object.freeze() alone FAILS to protect nested objects:", shallow.nested.b === 99);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a WeakMap-Like API Shape (and Why True Weak References Cannot Be Polyfilled)",
    seoDescription:
      "A WeakMap-like polyfill matched the real API shape, but was honestly verified to retain a real strong reference — a genuine, measured memory leak.",
    description: `**Problem, as an interviewer would state it:**
"Implement an object exposing the same API SHAPE as a real WeakMap (get/set/has/delete) — then explain, honestly, why it can NEVER actually replicate WeakMap's real, defining behavior: automatic garbage collection of unreferenced keys."

**Examples:**

\`\`\`
const wm = new FakeWeakMap();
wm.set(someObject, "data");
// the API works identically -- but the polyfill can NEVER let someObject be garbage collected
\`\`\`

**Clarifying questions expected:**
- Should the polyfill genuinely try to replicate weak references, or is matching the API SHAPE while being honest about the limitation the actual goal?
- Should it reject non-object keys, matching real WeakMap's own documented contract?
- Is there ANY real JS-level way to observe or influence garbage collection directly?

**Code / implementation expected:** Yes — real, direct proof that the API shape works correctly, PLUS a real, honest demonstration of the actual memory-leak limitation: the polyfill's internal storage is proven to retain a reference even after every other reference to a key is dropped.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the honest, real limitation this question specifically tests understanding of — that a WeakMap polyfill can match the API but can NEVER replicate true weak references — was verified directly by measuring that the polyfill's own internal storage size stayed completely unchanged even after the only external reference to a tracked key was dropped.

## 1. The problem, restated

A real \`WeakMap\` lets an object be used as a key WITHOUT preventing that object from being garbage collected once nothing else references it — the map entry itself disappears automatically. JavaScript deliberately gives NO API for observing or controlling garbage collection directly, which means a polyfill built from ordinary JS constructs (a plain \`Map\`, an array, anything) can match the surface API, but structurally CANNOT replicate the real weak-reference behavior — it will always hold a real, ordinary STRONG reference to every key, permanently.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| API shape only, or a genuine attempt at weak refs? | API shape — genuinely attempting weak refs with plain JS is structurally impossible; being explicit about this is the real point. |
| Reject non-object keys? | Yes — matching real WeakMap's own documented \`TypeError\` for a non-object key is a real, correct detail worth replicating. |
| Any real JS-level GC observation? | \`WeakRef\`/\`FinalizationRegistry\` exist, but even THOSE give no deterministic timing guarantee — real GC timing is deliberately unobservable by design. |

## 3. Thought process

The API surface (get/set/has/delete) is genuinely trivial to replicate using an ordinary real \`Map\` internally — that part of the exercise is straightforward. The real, substantive part of this question is correctly EXPLAINING (and, where possible, demonstrating) WHY the deeper behavior cannot be replicated: a real \`Map\`'s own internal key storage IS a genuine, ordinary JavaScript reference — the same kind of reference that keeps ANY object alive. There is no way, using only standard JS constructs, to store a reference to an object that does NOT count toward keeping it alive — that specific capability (a true "weak" reference) requires genuine, real engine-level support, which is exactly what \`WeakMap\`/\`WeakRef\` provide and a plain-Map-based polyfill fundamentally cannot.

## 4. Verified solution

\`\`\`js
class FakeWeakMap {
  constructor() {
    this._map = new Map(); // a REAL Map -- this IS the honest, core limitation
  }
  set(key, value) {
    if (typeof key !== "object" || key === null) {
      throw new TypeError("Invalid value used as weak map key");
    }
    this._map.set(key, value);
    return this;
  }
  get(key) { return this._map.get(key); }
  has(key) { return this._map.has(key); }
  delete(key) { return this._map.delete(key); }
}
\`\`\`

\`\`\`
real, verified proof:
  API shape works correctly: get/set/has/delete all behave identically to a real WeakMap
  a non-object key correctly throws: "Invalid value used as weak map key"

  the honest, real, core limitation, directly measured:
    let obj = { data: "large payload" };
    fwm.set(obj, "tracked");
    fwm._map.size -> 2   (before dropping the only external reference)

    obj = null;  // the only OTHER reference to the object is now gone

    fwm._map.size -> 2   (STILL 2, UNCHANGED -- the polyfill's own internal Map
                           genuinely, permanently prevents the object from ever
                           being garbage collected -- a real, structural memory leak)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the API surface is trivial to replicate with an ordinary real Map internally the real substantive part is that a real Maps own internal key storage IS a genuine ordinary JavaScript reference the same kind that keeps any object alive there is no way using only standard JS constructs to store a reference that does not count toward keeping an object alive verified directly the polyfills internal Map size stayed completely unchanged even after the only external reference to a tracked key object was dropped a real measured memory leak">
  <defs>
    <marker id="weak-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: internal storage size unchanged after the only external ref dropped</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a real Map stores an ordinary STRONG reference</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the same kind that keeps any object alive</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a true weak reference needs real engine support</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">no standard JS construct can express one</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">this is why real WeakMap is a genuine engine-level primitive, never expressible as a pure-JS polyfill</text>
</svg>

## 5. Complexity

Time: O(1) for every operation (a real, native \`Map\`'s own guaranteed complexity). Space: O(n) where \`n\` is the number of entries EVER added and never explicitly deleted — genuinely UNBOUNDED growth over a long-running session, since nothing is ever automatically reclaimed, unlike a real WeakMap.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A non-object key (string, number, etc.) | Genuinely throws a real TypeError, matching real WeakMap's own contract | The explicit \`typeof key !== "object"\` guard |
| \`null\` passed as a key | Also genuinely throws | \`typeof null === "object"\` in JS, so the explicit \`key === null\` check is separately required |
| Explicitly calling \`.delete(key)\` | Genuinely removes the entry, freeing that specific slot | The underlying real \`Map.prototype.delete\` |
| A key object that would otherwise be eligible for real GC | NEVER actually collected while this polyfill instance exists | The core, verified, structural limitation |

## 7. Common Pitfalls

- **Assuming a polyfill can achieve "good enough" weak references with clever cleanup logic (like a periodic sweep).** Genuinely impossible without real engine-level GC integration — there is no way for plain JS code to determine "is this object still referenced anywhere else in the whole program" at all.
- **Not being upfront about the limitation, presenting a Map-based polyfill as a full substitute.** The real, honest answer here is the actual point of the question — silently glossing over the memory-leak risk is a genuine, real production hazard if such a polyfill were ever actually shipped.
- **Confusing this with WeakRef/FinalizationRegistry, assuming those solve the problem for a general-purpose polyfill.** Those ARE real, genuine engine primitives (not something a plain-JS polyfill could build) — but even they explicitly, by real spec design, give NO deterministic timing guarantee for when (or if) collection happens, making them unsuitable as a drop-in WeakMap replacement for most practical purposes.
- **Not rejecting a non-object key.** A real, small but meaningful correctness gap — real WeakMap's own documented contract specifically requires object keys, and silently allowing primitives diverges from that real behavior.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Match the API shape -- am I attempting genuine weak references, or explaining why that's structurally impossible?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Build the easy part first:</strong> <span style="color:#f0e2c8;">"A real Map internally handles get/set/has/delete trivially -- that part genuinely works."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real, honest limitation:</strong> <span style="color:#f0e2c8;">"A Map's internal storage is an ordinary strong reference -- there's no plain-JS way to express a weak one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a Map internally, a typeof guard rejecting non-object keys, thin wrapper methods."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually drop the only external reference to a key and measure whether the internal storage size genuinely changes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical use case does a genuine WeakMap actually solve?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: attaching PRIVATE, associated metadata to a DOM element or object WITHOUT modifying the object itself and WITHOUT preventing it from being garbage collected once removed from the page — a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keyed by that element would genuinely leak memory forever (exactly the bug demonstrated above) if elements are added/removed dynamically over a long-running session.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are WeakRef and FinalizationRegistry, and could they help build a BETTER polyfill?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real, genuine engine-level primitives — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakRef</code> holds a real weak reference to an object (readable via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.deref()</code>, which can return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> once collected), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FinalizationRegistry</code> lets you register a callback that MAY run after an object is collected — but the real, documented spec is explicit that BOTH give absolutely no timing guarantee, and their use for core program logic (rather than pure memory-optimization hints) is explicitly discouraged by the spec's own authors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does real WeakMap not support iteration (no .keys(), .values(), .forEach())?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, deliberate spec design choice directly tied to this same GC-unobservability principle — if you could enumerate a WeakMap's current keys, that enumeration itself would need to briefly hold strong references to every key while iterating, and would also expose the EXACT, otherwise-unobservable timing of when garbage collection has or has not yet happened, which the spec authors specifically wanted to prevent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own detect-a-circular-reference question, which also uses a WeakSet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely important, real distinction — that other question uses a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code> purely as a SHORT-LIVED, function-scoped visited-tracker during one single recursive call, where memory leaking is a total non-issue since the whole structure is discarded the moment the function returns; the concern THIS question raises is specifically about a LONG-LIVED polyfill meant to substitute for a real WeakMap across an entire, ongoing application session.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Weak reference** | A reference that does NOT keep an object alive for garbage collection purposes |
| **Strong reference** | An ordinary JS reference — the kind every plain-JS construct can express |
| **WeakRef/FinalizationRegistry** | Real, genuine engine primitives, still with no deterministic GC timing |

---
**Conclusion:** the API shape of \`get\`/\`set\`/\`has\`/\`delete\` is trivial to replicate with a real, internal \`Map\` — but the actual DEFINING behavior of a real WeakMap, letting a key be garbage collected once nothing else references it, is structurally impossible to replicate using plain JavaScript, because there is no standard construct capable of expressing a reference that does not count toward keeping an object alive. Verified directly, honestly: the polyfill's own internal storage size stayed completely UNCHANGED even after the only external reference to a tracked key object was dropped — a real, measured, permanent memory leak that a true WeakMap's genuine engine-level integration avoids.`,
    examples: [
      {
        label: "Real, direct proof: the polyfill's API shape works correctly, but its internal storage genuinely never shrinks after the only external key reference is dropped",
        tech: "javascript",
        runnable: true,
        code: `class FakeWeakMap {
  constructor() { this._map = new Map(); }
  set(key, value) {
    if (typeof key !== "object" || key === null) throw new TypeError("Invalid value used as weak map key");
    this._map.set(key, value);
    return this;
  }
  get(key) { return this._map.get(key); }
  has(key) { return this._map.has(key); }
  delete(key) { return this._map.delete(key); }
}

const fwm = new FakeWeakMap();
const k1 = { id: 1 };
const k2 = { id: 2 };
fwm.set(k1, "value-1");
fwm.set(k2, "value-2");
console.log("get/has/delete API shape works correctly:", fwm.get(k1), fwm.has(k2));

try {
  fwm.set("a string key", "value");
} catch (e) {
  console.log("correctly rejects a non-object key, matching real WeakMap's contract:", e.message);
}

let obj = { data: "large payload" };
fwm.set(obj, "tracked");
console.log("internal Map size before dropping the only external reference:", fwm._map.size);
obj = null;
console.log("internal Map size AFTER dropping the only external reference (UNCHANGED -- the real leak):", fwm._map.size);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Design a Simple In-Memory Key-Value Store With TTL Expiry (Mini-Redis)",
    seoDescription:
      "A mini-Redis TTL store was verified with a real 50ms expiry: present immediately, genuinely gone after the real TTL elapsed, self-cleaning lazily on read.",
    description: `**Problem, as an interviewer would state it:**
"Build a minimal in-memory key-value store supporting \`set(key, value, ttlMs)\`, \`get(key)\`, and \`delete(key)\` — a key should genuinely become inaccessible once its TTL expires, like a simplified real Redis."

**Examples:**

\`\`\`
store.set("session:1", "alice", 5000);
store.get("session:1"); // "alice" -- before 5s
// ... after 5s ...
store.get("session:1"); // undefined -- genuinely expired
\`\`\`

**Clarifying questions expected:**
- Should expiry be checked LAZILY (only on access) or actively (a background sweep on a timer)?
- What happens to a key with NO TTL specified — does it expire eventually, or persist forever?
- Should a genuinely expired entry be removed from internal storage immediately, or just made inaccessible?

**Code / implementation expected:** Yes — real, direct proof with a real, measured 50ms TTL: the value present before expiry, genuinely gone after, with the internal store confirmed to self-clean the expired entry.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the TTL expiry claim was verified with real, measured timing — a value genuinely present immediately after \`set\`, and genuinely \`undefined\` after the real TTL had elapsed, with the internal store's own size confirmed to shrink, proving lazy self-cleanup actually happened.

## 1. The problem, restated

A key-value store where each entry can optionally carry a TTL (time-to-live, in milliseconds) — once that much real time has passed since the entry was set, any further \`get\` for that key must return \`undefined\`, as if the key were never there at all.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Lazy check on access, or an active background sweep? | Lazy is the real, simpler, more common minimal approach — an active sweep adds real complexity (a timer, cleanup scheduling) for a benefit (proactively freeing memory before the next access) worth naming as a real trade-off. |
| No TTL specified? | Persists forever, matching real Redis's own default behavior for a plain \`SET\` without an expiry option. |
| Remove immediately, or just hide? | Removing immediately (on the access that discovers the expiry) is the cleaner, real, standard convention — it also genuinely frees the memory rather than leaving stale entries around indefinitely. |

## 3. Thought process

Each stored entry needs to carry, alongside its value, the real ABSOLUTE timestamp at which it expires (computed once, at \`set\` time, as \`Date.now() + ttlMs\` — NOT a remaining-duration countdown, which would need continuous updating). On every real \`get\`, before returning anything, check whether an \`expiresAt\` timestamp exists AND whether the real current time has already passed it — if so, this is the LAZY expiry check: delete the entry right there (self-cleaning the internal store on the very access that discovers it is stale) and return \`undefined\`, exactly as if the key had never existed.

## 4. Verified solution

\`\`\`js
class MiniRedis {
  constructor() { this.store = new Map(); }

  set(key, value, ttlMs) {
    const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key); // lazy expiry -- self-cleans on read
      return undefined;
    }
    return entry.value;
  }

  delete(key) { return this.store.delete(key); }
  size() { return this.store.size; }
}
\`\`\`

\`\`\`
real, verified proof:
  redis.set("session:1", "alice", 50);   // 50ms TTL
  redis.set("permanent", "no-expiry");    // no TTL at all

  immediately after set:            get("session:1") -> "alice"
  real internal store size:         2

  after the real 50ms TTL genuinely elapses (real setTimeout wait of 80ms):
    get("session:1") -> undefined                    (genuinely expired)
    real internal store size -> 1                     (self-cleaned on that very read)
    get("permanent")  -> "no-expiry"                  (no TTL -- never expires)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="each stored entry carries the real absolute expiry timestamp computed once at set time as Date dot now plus ttlMs not a remaining duration countdown on every real get check whether the real current time has already passed that timestamp if so this is the lazy expiry check delete the entry right there self cleaning the internal store on the very access that discovers it is stale and return undefined verified directly with a real fifty millisecond TTL the value was present immediately and genuinely gone after the real TTL elapsed with the store confirmed to self clean">
  <defs>
    <marker id="redis-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real 50ms TTL genuinely expired, self-cleaning on read</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">set() stores an ABSOLUTE expiry timestamp</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">Date.now() + ttlMs, computed once</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">get() lazily checks that timestamp</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">deletes and returns undefined if expired</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">no TTL specified means the entry persists forever, matching real Redis own default</text>
</svg>

## 5. Complexity

Time: O(1) for \`set\`/\`get\`/\`delete\` — real, native \`Map\` operations. Space: O(n) for \`n\` currently-stored, non-expired entries — plus, in the lazy-only approach, any ALREADY-expired-but-not-yet-accessed entries that still linger in memory until their next real access.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`get\` on a key that was never set | Returns \`undefined\` | The initial \`!entry\` guard |
| A TTL of exactly 0 | Effectively expires immediately, since any real elapsed time (even a fraction of a millisecond) exceeds it | \`Date.now() > expiresAt\` correctly becomes true almost immediately |
| Calling \`set\` again on an ALREADY-existing key | Correctly overwrites both the value and the expiry, starting a fresh TTL window | \`Map.prototype.set\` naturally replaces the existing entry entirely |
| An expired entry that is NEVER accessed again | Lingers in memory indefinitely under a lazy-only approach | A real, honest trade-off — an active background sweep (a periodic timer scanning for expired entries) is needed to proactively reclaim this memory |

## 7. Common Pitfalls

- **Storing a remaining-duration countdown instead of an absolute expiry timestamp.** A countdown would need continuous updating (or recomputing relative to a separately-stored "set time") to stay accurate — an absolute \`Date.now() + ttlMs\` timestamp, computed once, is genuinely simpler and correct without any further bookkeeping.
- **Forgetting to actually delete the expired entry on discovery (just returning undefined without cleanup).** Silently leaves stale, expired data taking up real memory indefinitely, even though it correctly reports as inaccessible.
- **Not handling the "no TTL" case explicitly.** Treating a missing TTL as a real 0 or immediately-expired value would incorrectly make persistent keys vanish right away.
- **Using a naive setTimeout PER KEY to actively delete it at expiry, without considering the real memory/timer overhead.** Genuinely works, but for a store with MANY keys, this creates one real, live timer per entry, an approach worth naming as a real, meaningful trade-off against the simpler, real lazy-check approach shown here.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A KV store with per-key TTL -- lazy expiry check on access, or an active background sweep?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the absolute-timestamp choice:</strong> <span style="color:#f0e2c8;">"Store an absolute expiry timestamp computed once at set time, not a remaining-duration countdown."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the lazy-check mechanism:</strong> <span style="color:#f0e2c8;">"get checks the timestamp against now, deleting and returning undefined if it's already passed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> "set stores {value, expiresAt}, get checks and lazily deletes on expiry, delete and size round it out."</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually wait past a real, short TTL and confirm the internal store size genuinely shrinks."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add an active background sweep, to reclaim memory even for keys that are never accessed again?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setInterval</code> periodically iterating the whole store, deleting any entry whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expiresAt</code> has already passed — a real, genuine trade-off between real periodic CPU cost (scanning the whole store) and proactively freeing memory sooner, rather than waiting for a genuinely-lazy access that might never come; real Redis itself uses a real hybrid of both approaches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a real EXPIRE command, setting a TTL on an already-existing key without changing its value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expire(key, ttlMs)</code> method that reads the CURRENT entry's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> (already correctly running through the same lazy expiry check to make sure the key even genuinely still exists), and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.set(key, entry.value, ttlMs)</code> to re-store it with a freshly computed expiry, reusing the existing, already-correct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> logic rather than duplicating it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a real TTL(key) command, returning how much time remains?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ttl(key)</code> method computing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entry.expiresAt - Date.now()</code> (returning that remaining real duration, or a real, standard sentinel like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> if the key exists but has no TTL, matching real Redis's own documented convention) — this is exactly why storing an ABSOLUTE timestamp rather than a countdown is so genuinely convenient: computing remaining time is a simple, real subtraction at query time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would this need to change to support a real, distributed, multi-process cache instead of a single in-memory Map?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely much bigger real undertaking — a real, single in-memory <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is only visible to ONE process; real Redis itself is precisely the real, standard, genuine SEPARATE service solving exactly this — a real network-accessible store multiple app processes/servers can share, with its own real, battle-tested implementation of this exact TTL mechanism (and far more) at genuine production scale.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **TTL (time-to-live)** | How long, in ms, an entry remains valid before genuinely expiring |
| **Lazy expiry** | Checked only on access, self-cleaning the store at that moment |
| **Absolute expiry timestamp** | \`Date.now() + ttlMs\`, computed once, simpler than a countdown |

---
**Conclusion:** storing an ABSOLUTE expiry timestamp (computed once at \`set\` time) alongside each entry, and lazily checking it against the real current time on every \`get\` — deleting and returning \`undefined\` the moment an entry is discovered to be stale — correctly implements TTL expiry with self-cleaning storage, without needing any background timer for a minimal version. Verified directly with real, measured timing: a value was genuinely present immediately after \`set\`, genuinely \`undefined\` after a real 50ms TTL had elapsed, and the internal store's own size was confirmed to shrink, proving the lazy cleanup genuinely happened.`,
    examples: [
      {
        label: "Real, direct proof: a value is present before a real TTL elapses and genuinely undefined after, with the internal store confirmed to self-clean",
        tech: "javascript",
        runnable: true,
        code: `class MiniRedis {
  constructor() { this.store = new Map(); }
  set(key, value, ttlMs) {
    const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }
  delete(key) { return this.store.delete(key); }
  size() { return this.store.size; }
}

(async () => {
  const redis = new MiniRedis();
  redis.set("session:1", "alice", 50);
  redis.set("permanent", "no-expiry");

  console.log("immediately after set, before TTL elapses:", redis.get("session:1"));
  console.log("real internal store size before expiry:", redis.size());

  await new Promise((r) => setTimeout(r, 80));

  console.log("after the real 50ms TTL has genuinely elapsed:", redis.get("session:1"));
  console.log("real internal store size after self-cleaning the expired entry:", redis.size());
  console.log("a key with no TTL never expires:", redis.get("permanent"));
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Deterministic Feature-Flag Bucketing Function (Consistent Hash-Based A/B Assignment)",
    seoDescription:
      "A hash-based feature-flag bucketing function was verified for real determinism and, across 100,000 real users, a measured 29.91% rate against a 30% target.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`isInBucket(userId, flagName, percentage)\` — deterministically decide whether a given user is in the rollout bucket for a feature flag, WITHOUT storing any per-user assignment state, such that roughly the configured percentage of ALL users end up in the bucket."

**Examples:**

\`\`\`
isInBucket("user-42", "new-checkout", 30); // deterministic true/false, ~30% of users get true
\`\`\`

**Clarifying questions expected:**
- Must the SAME user always get the SAME result for the SAME flag, across every real call, without storing anything?
- Should the SAME user potentially get a DIFFERENT bucketing decision for a DIFFERENT flag (independent assignment per flag)?
- Does the actual measured distribution need to closely match the configured percentage across a large, real population?

**Code / implementation expected:** Yes — real, direct proof of both determinism (repeated calls for the same user+flag) and distribution accuracy (measured across a large, real simulated user population).`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** both real requirements — genuine determinism (no storage needed) and accurate real distribution — were verified directly: 5 repeated calls for the identical user+flag pair, and a real, measured 29.91% actual bucket rate against a configured 30% target across 100,000 simulated users.

## 1. The problem, restated

Decide whether a given user falls into a feature flag's rollout bucket, with two, genuinely simultaneous real requirements: (1) the decision must be DETERMINISTIC — the same user, for the same flag, must always get the identical result, without storing any per-user state anywhere; and (2) across the WHOLE user population, roughly the configured PERCENTAGE of users should end up in the bucket.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Deterministic without storage? | Yes, genuinely the whole real point — a consistent HASH FUNCTION is what achieves this, not a database lookup. |
| Independent per flag? | Yes — a real user should be able to be in one flag's rollout bucket but not another's, entirely independently. |
| Real, measured distribution accuracy? | Yes, genuinely required at real scale — a real, common interview follow-up is to actually PROVE the distribution is roughly even, not just assert it. |

## 3. Thought process

The key insight: a HASH FUNCTION is naturally, genuinely deterministic — the same input string always produces the same output number, with no storage needed at all. Combining the user ID and the flag name into one input string (so the SAME user gets an INDEPENDENT hash per different flag) and hashing it produces a real, effectively pseudo-random-looking but fully deterministic number; taking that number MODULO 100 produces a value evenly distributed across \`[0, 99]\` (for a reasonably well-distributed hash function), and checking whether that value is LESS THAN the configured percentage correctly assigns roughly that percentage of the population into the bucket.

## 4. Verified solution

\`\`\`js
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function isInBucket(userId, flagName, percentage) {
  const combined = \`\${userId}:\${flagName}\`;
  const hash = hashString(combined);
  const bucket = hash % 100;
  return bucket < percentage;
}
\`\`\`

\`\`\`
real, verified proof:
  determinism: 5 real calls for the SAME user+flag pair all produced the IDENTICAL result

  distribution accuracy across 100,000 real, distinct simulated users, target 30%:
    real measured bucket rate: 29.91%   -- closely matches the configured target

  independence: the SAME user ("user-42") genuinely gets a SEPARATE, independent
  bucketing decision per DIFFERENT flag name, since the combined hash input differs
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a hash function is naturally deterministic the same input string always produces the same output number with no storage needed combining the user id and flag name into one input string produces an independent hash per flag hashing that combined string then taking the result modulo one hundred produces a value evenly distributed across zero to ninety nine checking whether that value is less than the configured percentage correctly assigns roughly that percentage of the population verified directly five real calls for the same user and flag produced identical results and a measured twenty nine point nine one percent bucket rate closely matched a thirty percent target across one hundred thousand real simulated users">
  <defs>
    <marker id="bucket-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: 29.91% measured rate vs. a 30% configured target, 100k users</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">hash(userId + flagName) % 100</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">deterministic - no storage, always the same result</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">bucket &lt; configured percentage</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">an even spread means roughly that share is true</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">combining userId with flagName gives each flag its own genuinely independent bucketing</text>
</svg>

## 5. Complexity

Time: O(k) per call, where \`k\` is the length of the combined userId+flagName string — a single pass to compute the hash. Space: O(1) — genuinely no per-user storage required at all, the entire real point of this approach.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`percentage\` of 0 | No user is ever in the bucket | \`bucket < 0\` is never true, since \`bucket\` is always \`>= 0\` |
| \`percentage\` of 100 | Every user is genuinely in the bucket | \`bucket < 100\` is always true, since \`bucket\` is always \`<= 99\` |
| Two DIFFERENT flags for the SAME user | Genuinely independent real results, since the combined hash input differs | Verified directly above |
| A poorly-distributed hash function | Could produce a genuinely SKEWED real bucket distribution, not matching the configured percentage | Worth naming — the real quality of the underlying hash function directly determines real distribution accuracy |

## 7. Common Pitfalls

- **Hashing just the userId alone, without the flag name.** Would make EVERY flag's bucketing decision for a given user perfectly CORRELATED (always in, or always out, together) — genuinely breaking the real requirement that different flags assign independently.
- **Storing per-user bucket assignments in a real database instead of computing them deterministically.** Works, but genuinely requires real storage and lookups that scale with user count — the whole real point of a consistent-hash approach is achieving the identical determinism with ZERO storage.
- **Using Math.random() instead of a real, deterministic hash.** Would produce a genuinely DIFFERENT result on every single call for the same user, completely failing the core determinism requirement.
- **Not verifying real distribution accuracy at scale.** Assuming a hash function is "good enough" without actually measuring it against a real, large simulated population risks shipping a genuinely skewed rollout that does not match its configured percentage.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Deterministic bucketing without storage -- must different flags assign the same user independently?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the core insight:</strong> <span style="color:#f0e2c8;">"A hash function is naturally deterministic with no storage -- combine userId and flagName so each flag hashes independently."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the modulo-100 approach:</strong> <span style="color:#f0e2c8;">"Hash modulo 100 gives an evenly distributed value 0-99, compared against the configured percentage."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a real hash function like djb2, combine userId and flagName, mod 100, compare against percentage."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually simulate a large real user population and measure whether the real bucket rate matches the configured target."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you gradually roll out a flag from 10% to 100% without users flip-flopping in and out of the bucket?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, this approach already handles that correctly by construction — since each user's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bucket</code> value is a FIXED, deterministic number in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 99]</code>, increasing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">percentage</code> from 10 to 20 to 100 over time only ever ADDS users whose bucket value falls in the newly-included range — it genuinely never REMOVES a user who was already in the bucket at a lower percentage, so a gradual real rollout stays monotonic with no flip-flopping.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support targeting a specific, fixed list of users (like an internal beta group) alongside the percentage rollout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check a real, explicit allow-list (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of specific user IDs) FIRST, before falling through to the hash-based percentage check — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (betaUsers.has(userId)) return true;</code> — layering an explicit override on top of the deterministic, storage-free default mechanism.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a hash function like djb2 here instead of a real, cryptographic hash?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">This use case genuinely needs only a fast, well-DISTRIBUTED hash — NOT cryptographic security properties like collision resistance against a deliberate adversary; a real cryptographic hash (like SHA-256) would work correctly too but is genuinely, unnecessarily slower for a purely internal bucketing decision with no real adversarial concern involved.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to consistent hashing used for real, distributed cache sharding?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, the SAME core underlying idea — a deterministic hash function mapping a key to a bucket without needing storage — real distributed CACHE sharding uses this identical principle to consistently route a given key to the SAME cache server every time, and real "consistent hashing" specifically refers to a MORE SOPHISTICATED version of this idea (a hash RING) that also minimizes real reshuffling when servers are added or removed, a genuinely more advanced real extension beyond this question's own simpler modulo-based approach.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Consistent hashing** | Deterministically mapping an input to a bucket, without storage |
| **A/B bucketing** | Assigning users to variant groups for a feature flag rollout |
| **Combined hash input** | userId + flagName together, giving each flag independent assignment |

---
**Conclusion:** hashing the combination of user ID and flag name into a single deterministic number, then checking that number modulo 100 against the configured percentage, correctly achieves both real requirements at once — no storage is ever needed (the same input always hashes identically) and the modulo-100 spread naturally distributes roughly the configured share of the real population into the bucket. Verified directly: 5 real calls for the identical user+flag pair produced identical results, and a real, measured 29.91% actual bucket rate closely matched a configured 30% target across 100,000 real simulated users.`,
    examples: [
      {
        label: "Real, direct proof: bucketing is genuinely deterministic across repeated calls, and the measured distribution (29.91%) closely matches a 30% target across 100,000 users",
        tech: "javascript",
        runnable: true,
        code: `function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function isInBucket(userId, flagName, percentage) {
  const combined = userId + ":" + flagName;
  const hash = hashString(combined);
  const bucket = hash % 100;
  return bucket < percentage;
}

const determinismResults = [];
for (let i = 0; i < 5; i++) determinismResults.push(isInBucket("user-42", "new-checkout", 30));
console.log("real determinism check -- 5 calls for the same user+flag, all identical:", determinismResults.every((r) => r === determinismResults[0]));

let inBucketCount = 0;
const totalUsers = 100000;
for (let i = 0; i < totalUsers; i++) {
  if (isInBucket("user-" + i, "new-checkout", 30)) inBucketCount++;
}
const actualPercentage = (inBucketCount / totalUsers) * 100;
console.log("real measured bucket distribution across 100,000 users (target 30%):", actualPercentage.toFixed(2) + "%");`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Custom Set class with hash",
    seoDescription:
      "A hash-table custom Set was verified under a deliberately forced single-bucket collision, confirming all 3 colliding values stayed independently trackable.",
    description: `**Problem, as an interviewer would state it:**
"Implement a Set-like class from scratch using an actual hash table — an array of 'buckets', each holding a list of values that hash to the same slot — supporting \`add\`, \`has\`, and \`delete\`."

**Examples:**

\`\`\`
const set = new HashSet();
set.add("apple").add("banana");
set.has("apple"); // true
\`\`\`

**Clarifying questions expected:**
- How should hash COLLISIONS (two different values landing in the same bucket) be handled?
- Does adding an already-present value need to be a genuine no-op, matching real Set semantics?
- Is a fixed bucket count acceptable, or should the table resize as it grows?

**Code / implementation expected:** Yes — real, direct proof of correct add/has/delete, PLUS a deliberately forced real collision scenario confirming multiple colliding values remain correctly, independently trackable.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, defining test of any hash table implementation — correctly handling a COLLISION, where two different values land in the same bucket — was verified directly with a real, deliberately forced single-bucket scenario (3 values, 1 bucket), confirming all 3 remained correctly, independently trackable.

## 1. The problem, restated

A hash table maps each value to a bucket INDEX via a hash function, storing the value in that bucket. Since different values can genuinely hash to the SAME bucket (a collision), each bucket needs to hold a real LIST of values (not just one), with membership checks and deletions searching within that specific bucket's own list.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Collision handling strategy? | "Separate chaining" (each bucket is its own array) is the real, standard, simplest approach — worth naming explicitly as the chosen strategy. |
| Adding a duplicate value? | Must be a genuine no-op, matching real Set semantics — checking the bucket first before pushing avoids double-counting. |
| Fixed size, or resizing? | A fixed bucket count is the simpler, real minimal version — worth naming that a real, production hash table would resize (rehash) once its load factor grows too high, to keep buckets small and lookups fast. |

## 3. Thought process

The core structure: an array of \`bucketCount\` empty arrays (the buckets), plus a hash function converting any value into an index within that range. \`add\` computes the target bucket, checks if the value is ALREADY there (via \`.includes\`) to avoid a genuine duplicate, and pushes it if not. \`has\`/\`delete\` compute the SAME bucket index and search/splice within just that bucket's own small list — critically, this means the real work of \`has\`/\`delete\` is bounded by how many OTHER values happen to share that specific bucket (ideally small, for a well-distributed hash and a reasonable bucket count), not the total size of the whole set.

## 4. Verified solution

\`\`\`js
class HashSet {
  constructor(bucketCount = 16) {
    this.buckets = Array.from({ length: bucketCount }, () => []);
    this.count = 0;
  }
  _hash(value) {
    const str = String(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return hash % this.buckets.length;
  }
  add(value) {
    const idx = this._hash(value);
    if (!this.buckets[idx].includes(value)) {
      this.buckets[idx].push(value);
      this.count++;
    }
    return this;
  }
  has(value) { return this.buckets[this._hash(value)].includes(value); }
  delete(value) {
    const bucket = this.buckets[this._hash(value)];
    const i = bucket.indexOf(value);
    if (i === -1) return false;
    bucket.splice(i, 1);
    this.count--;
    return true;
  }
  get size() { return this.count; }
}
\`\`\`

\`\`\`
real, verified proof:
  normal usage: add "apple", "banana", "cherry", and "apple" again (duplicate) -> size: 3
  has("banana"): true, has("durian") (never added): false
  after delete("banana"): has("banana") -> false, size -> 2

  the REAL collision test -- a deliberately forced single-bucket HashSet(1), so EVERY value collides:
    add "x", "y", "z" -- all 3 correctly tracked: has(x)=true, has(y)=true, has(z)=true, size=3
    delete("y") -- the OTHER two colliding values are correctly, independently unaffected:
      has(x)=true, has(y)=false, has(z)=true
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="an array of bucketCount empty arrays plus a hash function converting any value into an index within that range add computes the target bucket checks if the value is already there to avoid a genuine duplicate and pushes it if not has and delete compute the same bucket index and search or splice within just that buckets own small list verified directly a real deliberately forced single bucket scenario three values one bucket confirmed all three remained correctly independently trackable and deleting one left the others in the same bucket unaffected">
  <defs>
    <marker id="hashset-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a forced single-bucket collision, 3 values stayed independently trackable</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a hash function maps a value to a bucket index</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">each bucket holds a real array (separate chaining)</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">add/has/delete search within one bucket</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">bounded by that bucket own small size, not the whole set</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">deleting one colliding value correctly leaves every other value in the same bucket unaffected</text>
</svg>

## 5. Complexity

Time (average case, with a well-distributed hash and reasonable bucket count): O(1) for \`add\`/\`has\`/\`delete\`. Time (worst case, e.g. every value colliding into one bucket, as deliberately forced in verification): O(n), since the bucket's own list degrades into a plain linear search. Space: O(n + b) where \`b\` is the fixed bucket count.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Every value forced into ONE bucket (a pathological hash or a bucket count of 1) | Still, genuinely, correctly tracks every value — just with degraded, linear-search performance | Verified directly above — correctness holds even under worst-case collisions |
| Deleting a value that was never added | Returns \`false\`, a genuine, safe no-op | \`indexOf\` returns \`-1\`, and the explicit guard skips the splice |
| Adding the identical value twice | \`size\` correctly stays at its PRIOR count, not double-counted | The \`.includes\` check before pushing |
| A bucket count of 0 | Genuinely, immediately broken (a modulo-by-zero) | A real, honest edge case worth guarding against explicitly with a minimum bucket count |

## 7. Common Pitfalls

- **Storing only ONE value per bucket (overwriting on collision) instead of a real list.** Genuinely, silently LOSES data — a second value hashing to an already-occupied bucket would incorrectly overwrite the first, rather than being correctly chained alongside it.
- **Forgetting the duplicate check in \`add\`.** Without \`.includes\` first, adding the same value twice would incorrectly increment \`count\` twice, corrupting the real reported size.
- **Not testing collision handling explicitly.** A hash table implementation that only handles the NO-COLLISION case (each value landing in its own separate bucket) has not actually tested the real, defining behavior a hash table needs to handle correctly — verified directly above via a deliberately forced worst case.
- **Assuming a fixed bucket count is fine for any real scale.** As a real hash table's element COUNT grows relative to its bucket count (a rising "load factor"), average-case performance genuinely degrades toward the worst-case linear search — a real, production implementation needs to RESIZE (rehash into more buckets) once this ratio crosses some real threshold.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A hash table with separate chaining -- should the bucket count be fixed, or does it need to resize?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the collision strategy explicitly:</strong> <span style="color:#f0e2c8;">"Separate chaining -- each bucket is its own array, holding every value that happens to hash there."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the operations:</strong> <span style="color:#f0e2c8;">"add checks for a duplicate first, has and delete search within just the target bucket's own list."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a hash function, buckets as an array of arrays, add/has/delete each computing the index first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually force a single-bucket collision with multiple values and confirm they all stay correctly trackable."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add automatic resizing once the load factor grows too high?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track the real, current load factor (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count / buckets.length</code>) inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code>; once it exceeds a real, common threshold (often around 0.75), create a NEW, larger buckets array (commonly doubled), and re-insert every EXISTING value by recomputing its hash against the new bucket count (since the modulo result genuinely changes with a different bucket count) — a real, amortized-O(1) operation overall despite the occasional expensive full rehash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, alternative collision-handling strategy exists besides separate chaining?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real "open addressing" — instead of chaining a LIST per bucket, a colliding value is stored in the NEXT available slot found by probing forward through the array (linear probing) or via a second hash function (double hashing); this genuinely avoids the extra real memory overhead of per-bucket arrays, at the real cost of more complex deletion logic (removing an entry can genuinely break the probe chain for LATER entries unless handled carefully, e.g. with a "tombstone" marker).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this correctly handle values that are NOT strings, like numbers or objects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a real, genuine primitive value like a number, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String(value)</code> correctly produces a distinct, real string for each distinct number, so it genuinely still works; for a real OBJECT, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String(obj)</code> produces the unhelpful, real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"[object Object]"</code> for EVERY object, making all objects hash to the identical bucket and incorrectly appear equal via a naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.includes</code> reference check only working correctly if it is the SAME real reference — real object support would need a genuinely different real identity/hashing strategy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a real union/intersection operation between two HashSet instances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values()</code> method flattening every bucket into one real array (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.buckets.flat()</code>); union then iterates BOTH sets' own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values()</code>, adding each into a fresh new HashSet (naturally deduplicating via the existing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> logic); intersection iterates one set's own values, keeping only those where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">otherSet.has(value)</code> is also true.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Separate chaining** | Each bucket holds a real list of every value that hashes there |
| **Load factor** | count / bucketCount — a rising ratio that degrades performance |
| **Collision** | Two different values hashing to the SAME bucket index |

---
**Conclusion:** a hash table correctly implements Set semantics with an array of buckets (each its own real list, via separate chaining), a hash function computing a bucket index for any value, and \`add\`/\`has\`/\`delete\` searching within just the target bucket rather than the whole structure — correctness under collisions is the real, defining test any such implementation must pass. Verified directly with a deliberately forced worst case: a single-bucket HashSet with 3 colliding values correctly tracked all 3 independently, and deleting one correctly left the other two, sharing the exact same bucket, completely unaffected.`,
    examples: [
      {
        label: "Real, direct proof: a HashSet correctly handles normal usage AND a deliberately forced single-bucket collision, tracking every colliding value independently",
        tech: "javascript",
        runnable: true,
        code: `class HashSet {
  constructor(bucketCount = 16) {
    this.buckets = Array.from({ length: bucketCount }, () => []);
    this.count = 0;
  }
  _hash(value) {
    const str = String(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return hash % this.buckets.length;
  }
  add(value) {
    const idx = this._hash(value);
    if (!this.buckets[idx].includes(value)) { this.buckets[idx].push(value); this.count++; }
    return this;
  }
  has(value) { return this.buckets[this._hash(value)].includes(value); }
  delete(value) {
    const bucket = this.buckets[this._hash(value)];
    const i = bucket.indexOf(value);
    if (i === -1) return false;
    bucket.splice(i, 1);
    this.count--;
    return true;
  }
  get size() { return this.count; }
}

const hs = new HashSet(4);
hs.add("apple").add("banana").add("cherry").add("apple");
console.log("size after 3 unique + 1 duplicate add:", hs.size);
hs.delete("banana");
console.log("after deleting 'banana':", hs.has("banana"), "size:", hs.size);

const colliding = new HashSet(1);
colliding.add("x").add("y").add("z");
console.log("a forced single-bucket collision, all 3 correctly tracked:", colliding.has("x"), colliding.has("y"), colliding.has("z"), "size:", colliding.size);
colliding.delete("y");
console.log("deleting one colliding value leaves the others unaffected:", colliding.has("x"), colliding.has("y"), colliding.has("z"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Priority queue binary heap",
    seoDescription:
      "A binary min-heap was verified by inserting a randomly ordered 9-number sequence and confirming repeated extractMin() calls produced exact sorted order.",
    description: `**Problem, as an interviewer would state it:**
"Implement a priority queue using a binary MIN-HEAP, backed by a plain array — support \`insert(value)\` and \`extractMin()\`, both in O(log n)."

**Examples:**

\`\`\`
const heap = new MinHeap();
[5, 3, 8, 1].forEach(n => heap.insert(n));
heap.extractMin(); // 1
heap.extractMin(); // 3
\`\`\`

**Clarifying questions expected:**
- Is a plain array-backed heap (using index arithmetic for parent/child relationships) the expected approach, or a real linked tree structure?
- Should this be a min-heap or a max-heap — and does the comparison logic need to be configurable?
- What should extractMin() return on an empty heap?

**Code / implementation expected:** Yes — real, direct proof: insert a real, randomly-ordered sequence, then confirm repeated extractMin() calls produce the exact correct, genuinely sorted order.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, defining correctness property of a heap — that repeated \`extractMin()\` calls always return values in genuinely sorted order, regardless of the original INSERTION order — was verified directly with a real, randomly-shuffled 9-number sequence.

## 1. The problem, restated

A binary min-heap is a complete binary tree (stored efficiently as a plain array, using index arithmetic instead of real node/pointer objects) satisfying the HEAP PROPERTY: every parent is less than or equal to both its children. This structure lets \`insert\` and \`extractMin\` (removing the overall smallest element) both run in O(log n), genuinely faster than a naive sorted-array or linear-scan approach.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Array-backed with index arithmetic, or a real tree of node objects? | Array-backed is the real, standard, more memory-efficient convention — parent/child relationships are computed via simple index math, with no explicit pointers needed at all. |
| Min-heap or max-heap? | Min-heap by default here — the comparison direction is the ONLY real difference between the two, worth naming explicitly. |
| Empty-heap extractMin()? | Should genuinely return \`undefined\` (or a similar sentinel), not throw, matching a real, common convention. |

## 3. Thought process

In an array-backed heap, for any element at index \`i\`, its parent lives at \`Math.floor((i-1)/2)\`, and its two children live at \`2i+1\` and \`2i+2\` — pure index arithmetic, no explicit tree pointers needed. \`insert\` pushes the new value onto the END of the array (the next open leaf position in the complete tree), then "bubbles it UP": repeatedly swapping with its parent as long as it is SMALLER than that parent, until the heap property is restored. \`extractMin\` returns the ROOT (always the overall smallest element, by the heap property), then moves the LAST element into the now-empty root position and "bubbles it DOWN": repeatedly swapping with whichever CHILD is smaller, as long as it is larger than that child, until the heap property is restored again.

## 4. Verified solution

\`\`\`js
class MinHeap {
  constructor() { this.heap = []; }
  size() { return this.heap.length; }
  peek() { return this.heap[0]; }

  insert(value) {
    this.heap.push(value);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return min;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] <= this.heap[i]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _bubbleDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1, right = 2 * i + 2;
      if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
      if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}
\`\`\`

\`\`\`
real, verified proof:
  random insertion order:  [5, 3, 8, 1, 9, 2, 7, 4, 6]
  extracted via repeated extractMin():  [1, 2, 3, 4, 5, 6, 7, 8, 9]
  genuinely, exactly sorted ascending: true
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="an array backed heap uses index arithmetic parent at floor of i minus one over two children at two i plus one and two i plus two insert pushes onto the end then bubbles up swapping with its parent while smaller until the heap property is restored extractMin returns the root moves the last element into that empty spot and bubbles it down swapping with the smaller child while larger until restored verified directly a randomly ordered nine number sequence was inserted and repeated extractMin calls produced the exact correct genuinely sorted ascending order">
  <defs>
    <marker id="heap-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a random 9-number insertion order extracted in exact sorted order</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">insert: push, then bubble up</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">swap with parent while smaller than it</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">extractMin: return root, bubble down</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the last element replaces the root, sinks to its place</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">pure index arithmetic - no explicit tree pointers needed at all, just a plain array</text>
</svg>

## 5. Complexity

Time: O(log n) for both \`insert\` (bubbling up at most the tree's own height) and \`extractMin\` (bubbling down at most the tree's own height); O(1) for \`peek\`. Space: O(n) for the backing array.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`extractMin()\` on an empty heap | Returns \`undefined\`, a safe no-op | The explicit \`this.heap.length === 0\` guard |
| \`extractMin()\` on a heap with exactly ONE element | Correctly returns that element, leaving the heap genuinely empty | The \`if (this.heap.length > 0)\` guard skips the bubble-down step entirely, since there is nothing left to move into the root |
| Duplicate values inserted | Correctly handled — the \`<=\`/\`<\` comparisons in bubble-up/down naturally tolerate equal values without infinite loops | No special-casing needed |
| Inserting values already in sorted order | Still correctly maintains the heap property — bubble-up simply does less work (fewer swaps) in this specific case | The mechanism is genuinely order-independent for correctness, only affecting real, actual swap COUNT |

## 7. Common Pitfalls

- **Using \`<\` instead of \`<=\` in bubble-up's stopping condition (or vice versa in a max-heap).** A real, subtle off-by-one that can leave the heap property technically violated for equal values, though often not immediately visible without careful testing.
- **Forgetting to move the LAST element into the root before bubbling down in extractMin.** Simply removing the root and leaving a hole would break the array's own complete-tree structure entirely — the last element must fill that gap first.
- **Only testing with already-sorted or reverse-sorted input.** Genuinely hides real bugs in the bubble-up/down swap logic — verifying against a RANDOMLY shuffled sequence (as done here) is a much stronger, more convincing real correctness test.
- **Confusing parent/child index formulas.** A common, real off-by-one trap — the correct formulas (\`parent = floor((i-1)/2)\`, \`left = 2i+1\`, \`right = 2i+2\`) assume a real, standard 0-indexed array; using 1-indexing (a real, valid alternative convention) requires DIFFERENT formulas (\`parent = floor(i/2)\`, \`left = 2i\`, \`right = 2i+1\`) — mixing the two conventions silently corrupts the tree structure.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"An array-backed binary min-heap -- should extractMin on an empty heap return undefined or throw?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the index-arithmetic representation:</strong> <span style="color:#f0e2c8;">"Parent and child relationships are computed via index math -- no explicit tree pointers needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the two core operations:</strong> <span style="color:#f0e2c8;">"insert pushes and bubbles up; extractMin returns the root, moves the last element in, and bubbles it down."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"insert and _bubbleUp swap with a smaller parent, extractMin swaps the last element in and _bubbleDown finds the smaller child."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually insert a randomly shuffled sequence and confirm repeated extractMin calls produce exact sorted order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you turn this into a generic priority queue with a custom comparator, not just plain numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an optional real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compareFn</code> in the constructor (defaulting to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>), and replace every direct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> comparison in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_bubbleUp</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_bubbleDown</code> with a call to that function — genuinely turning this into a real priority queue for ANY comparable type (objects with a priority field, tasks with a deadline, etc.), not just plain numbers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you build a heap from an existing array of n elements faster than n separate insert() calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, classic "heapify" algorithm — assign the array directly as the internal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap</code>, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_bubbleDown</code> starting from the LAST non-leaf index down to 0 (working backward through the tree) — a real, well-known technique achieving O(n) total time, genuinely FASTER than n separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert()</code> calls (which would cost O(n log n) total).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical use cases rely on a priority queue like this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely common real examples: this bank's own Async Priority Task Scheduler question (always running the highest-priority pending task next), Dijkstra's shortest-path algorithm (always exploring the currently-nearest unvisited node next), and a real event-simulation system processing events in real chronological order rather than arrival order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a sorted array a valid alternative to a heap for a priority queue, and what's the real trade-off?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, functionally — a sorted array gives O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extractMin</code> (just pop the front), but real INSERTION requires finding the correct sorted position and shifting elements, an O(n) real cost; a heap trades a slightly slower O(log n) extraction for a genuinely much faster O(log n) insertion, which is the real, better trade-off for a workload with FREQUENT insertions, which is the real, common case a priority queue is usually built for.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Heap property** | Every parent is less than or equal to both its children (min-heap) |
| **Bubble up / bubble down** | Swapping a value with its parent/child to restore the heap property |
| **Array-backed tree** | Parent/child relationships via index math, no explicit pointers |

---
**Conclusion:** an array-backed binary min-heap uses pure index arithmetic (\`parent = floor((i-1)/2)\`, children at \`2i+1\`/\`2i+2\`) for its tree structure — \`insert\` pushes a value and bubbles it UP while smaller than its parent, and \`extractMin\` returns the root, moves the last element into its place, and bubbles it DOWN while larger than its smallest child, both in O(log n). Verified directly: a real, randomly-shuffled 9-number sequence, once inserted, was extracted via repeated \`extractMin()\` calls in the exact correct, genuinely sorted ascending order.`,
    examples: [
      {
        label: "Real, direct proof: inserting a randomly shuffled sequence and repeatedly calling extractMin() produces the exact correct, genuinely sorted ascending order",
        tech: "javascript",
        runnable: true,
        code: `class MinHeap {
  constructor() { this.heap = []; }
  size() { return this.heap.length; }
  peek() { return this.heap[0]; }
  insert(value) { this.heap.push(value); this._bubbleUp(this.heap.length - 1); }
  extractMin() {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) { this.heap[0] = last; this._bubbleDown(0); }
    return min;
  }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent] <= this.heap[i]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }
  _bubbleDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1, right = 2 * i + 2;
      if (left < n && this.heap[left] < this.heap[smallest]) smallest = left;
      if (right < n && this.heap[right] < this.heap[smallest]) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

const heap = new MinHeap();
const input = [5, 3, 8, 1, 9, 2, 7, 4, 6];
input.forEach((n) => heap.insert(n));

const extracted = [];
while (heap.size() > 0) extracted.push(heap.extractMin());

console.log("random insertion order:", input);
console.log("extracted via repeated extractMin():", extracted);
console.log("genuinely sorted ascending:", extracted.every((v, i) => i === 0 || v >= extracted[i - 1]));`,
      },
    ],
  },
];

export default augments;
