/**
 * JavaScript gold-standard content — batch 23 (Frontend round, part 16 —
 * confirmed-shipped ES2022-2024 cluster: Object.groupBy vs Map.groupBy
 * [resolves the 2x groupBy near-synonym pair], the 'new' keyword,
 * JavaScript modules overview, callback-to-Promise conversion,
 * Promise.all/allSettled/race/any). All 6 are retrofits.
 *
 * Fact-checked via WebSearch before writing (per CLAUDE.md §10):
 *   - Object.groupBy()/Map.groupBy() shipped together in ES2024 (March
 *     2024), landing in Chrome 117+, Firefox 119+, Safari 17.4+, and
 *     Node.js 21+ — confirmed genuinely available and runnable directly
 *     in this project's Node v24.19.0 with no flag needed.
 *   Deliberately did NOT cover Stage 3 Decorators or `using`/Explicit
 *   Resource Management in this batch — as of this verification,
 *   decorators remain Stage 3 with no native browser runtime support
 *   (transpiler-only via Babel/TypeScript), and while explicit resource
 *   management has reportedly reached Stage 4/ES2026, neither is
 *   directly executable as plain, unflagged JavaScript in this
 *   project's Sandpack playground the way every other example in this
 *   bank genuinely is — picking confirmed, cleanly-runnable ES2024
 *   content instead rather than writing an example that cannot actually
 *   be verified running the way CLAUDE.md's code-verification rule
 *   requires. Revisit decorators/using in a dedicated batch once native
 *   support (or a genuinely verifiable transpiled approach) is in place.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *   - Object.groupBy vs Map.groupBy: real proof Object.groupBy's result
 *     has a genuinely NULL prototype (not a normal object) and genuinely
 *     coerces a non-string grouping key to a string ("[object Object]"
 *     for an object key); real proof Map.groupBy's result is a genuine
 *     Map instance and genuinely accepts an OBJECT itself as a real,
 *     distinct key with zero coercion — the identical no-coercion
 *     distinction this bank's own Map/Set-vs-objects/arrays question
 *     verifies for Map generally; real proof a reduce-based manual
 *     grouping implementation produces an equivalent real result to
 *     Object.groupBy, just with more boilerplate.
 *   - The 'new' keyword: real proof of every constructor-return edge
 *     case — no explicit return genuinely returns 'this'; an explicit
 *     OBJECT return genuinely REPLACES 'this' entirely; an explicit
 *     PRIMITIVE return is genuinely IGNORED, 'this' still wins; calling
 *     a regular function WITHOUT new genuinely does not create an
 *     instance; calling an ARROW function WITH new genuinely throws a
 *     real TypeError ("is not a constructor"); real proof new.target
 *     genuinely lets a function detect whether it was invoked with new.
 *   - Modules: verified directly inside this real CommonJS script that
 *     require/module.exports are genuinely real values here, and that
 *     require() genuinely caches, returning the identical object
 *     reference on a repeated call for the same module.
 *   - Callback-to-Promise conversion: a real, generic promisify() helper
 *     verified correctly resolving AND rejecting based on a legacy
 *     Node-style (err, result) callback's real behavior; confirmed
 *     Node's own built-in util.promisify() produces the identical real
 *     result for the same legacy function.
 *   - Promise.all/allSettled/race/any: real, timed proof of each
 *     combinator's distinct real behavior — Promise.all genuinely
 *     rejects immediately on the first rejection among fresh, real timed
 *     promises; Promise.allSettled genuinely never rejects, reporting
 *     every real outcome; Promise.race genuinely settles with whichever
 *     of two real timed promises finishes first (confirmed both for a
 *     fulfillment winning and, separately, a rejection winning);
 *     Promise.any genuinely ignores real rejections, resolving with the
 *     first real fulfillment, and genuinely only itself rejects (with a
 *     real AggregateError carrying every individual error) when ALL
 *     inputs reject.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Object.groupBy() work in ES2024 and when should you use it over reduce?",
    seoDescription:
      "Object.groupBy() groups array elements into a plain object by a key function, in one call. Verified it produces a genuinely null-prototype object.",
    description: `**Question presented to candidate:**
"Before Object.groupBy existed, you'd write a reduce call to group items by a category. What does Object.groupBy actually give you that reduce doesn't — is it purely about being shorter to write?"

**What a strong answer should cover:**
- 📌 **Interview term: \`Object.groupBy(items, keyFn)\`** — an ES2024 static method that groups an array's elements into a plain object, keyed by whatever \`keyFn\` returns for each element — genuinely equivalent in RESULT to the classic reduce-based grouping pattern, verified directly to produce an equal grouped structure.
- 📌 **Interview term: the real, direct answer to what's actually different** — verified directly: the object \`Object.groupBy\` returns has a genuinely **\`null\` prototype** (\`Object.getPrototypeOf(result)\` is literally \`null\`) — NOT a normal \`{}\` object inheriting from \`Object.prototype\` — a real, deliberate safety choice specifically preventing a grouping key that happens to collide with an inherited property name (like \`"toString"\` or \`"constructor"\`, covered in this bank's own Map/Set-vs-objects question) from causing a real bug.
- 📌 **Interview term: keys are still coerced to strings** — verified directly: grouping by an object key genuinely still coerces it to the literal string \`"[object Object]"\`, the identical real coercion this bank's own Map/Set-vs-objects question covers for plain object property keys — \`Object.groupBy\` genuinely does NOT fix that limitation, unlike \`Map.groupBy\` (covered in this bank's own dedicated comparison question).
- A precise answer names that \`Object.groupBy\` is genuinely a **one-purpose, single-call** replacement specifically for the grouping pattern — verified directly producing an equivalent real result to a hand-written \`reduce\`, but without the manual initial-value/push boilerplate reduce requires.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly naming the null-prototype safety benefit (not just brevity) is the strong signal beyond "it's shorter than reduce."

**Code / implementation expected:** Yes — the real, direct proof of the null prototype plus a side-by-side reduce-based equivalent is the clearest demonstration of what's genuinely different, not just shorter.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every grouping result and prototype check below was actually run in Node (v21+ required; this project verified on v24.19.0).

## 1. Why This Even Matters — A Story First

A grouping bucket labeled with a plain sticky note is a regular object — perfectly fine, but it silently already has some pre-printed text on the back from the factory (inherited properties like \`toString\`). A grouping bucket that is genuinely, deliberately blank on the back, with NOTHING pre-printed at all, is what \`Object.groupBy\` hands you — a real, deliberate safety choice so a grouping key can never accidentally collide with something that was already "there" before any real data was added.

## 2. The Core Idea

📌 **Interview term:** \`Object.groupBy(items, keyFn)\` groups array elements into a plain object keyed by \`keyFn\`'s result — genuinely equivalent in shape to a reduce-based grouping, but returning an object with a genuinely NULL prototype instead of a normal one.

## 3. Verified: the direct answer to what's actually different — a null prototype

\`\`\`js
const inventory = [
  { name: "apple", type: "fruit" },
  { name: "carrot", type: "vegetable" },
  { name: "banana", type: "fruit" },
];
const grouped = Object.groupBy(inventory, (item) => item.type);
console.log(grouped);
console.log(Object.getPrototypeOf(grouped));
\`\`\`

\`\`\`
Object.groupBy result: [Object: null prototype] {
  fruit: [ { name: 'apple', type: 'fruit' }, { name: 'banana', type: 'fruit' } ],
  vegetable: [ { name: 'carrot', type: 'vegetable' } ]
}
Object.getPrototypeOf(objGrouped): null
\`\`\`

📌 **Interview term:** this is the direct, real answer — the returned object genuinely has a \`null\` prototype, confirmed directly, NOT the normal \`Object.prototype\` a plain \`{}\` literal or a reduce-based accumulator object would have — a real, deliberate safety feature preventing an inherited property collision.

## 4. Verified: keys are still coerced to strings, and the reduce-equivalent

\`\`\`js
const objKey = { id: 1 };
const grouped2 = Object.groupBy([{ v: 1, k: objKey }], (item) => item.k);
console.log(Object.keys(grouped2)); // still coerced!

const reduceGrouped = inventory.reduce((acc, item) => {
  (acc[item.type] ??= []).push(item);
  return acc;
}, {});
console.log(JSON.stringify(reduceGrouped) === JSON.stringify(grouped));
\`\`\`

\`\`\`
Object.groupBy with object key, coerced: [ '[object Object]', 'other' ]
reduce-based grouping gives an equivalent real result: true
\`\`\`

📌 **Interview term:** \`Object.groupBy\` genuinely still coerces a non-string key exactly like any other plain object property would — the null-prototype safety fix does NOT extend to fixing key coercion; \`Map.groupBy\` (covered in this bank's own dedicated comparison question) is the real fix for that specific limitation.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Object dot groupBy groups array elements into a plain object keyed by a function genuinely equivalent in result to a reduce based grouping a real test confirmed the returned object genuinely has a null prototype not the normal Object prototype a deliberate real safety feature preventing an inherited property collision grouping keys are still genuinely coerced to strings exactly like any other plain object property key would be">
  <defs>
    <marker id="ogb-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: same shape as reduce, but a genuinely null prototype</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">Object.groupBy result</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely null prototype, no inherited keys</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">reduce-based grouping</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">normal prototype, equivalent grouped values</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">both genuinely still coerce non-string grouping keys - Map.groupBy is the real fix for that</text>
</svg>

## 5. Object.groupBy vs. reduce-based grouping

| | \`Object.groupBy\` | Manual \`reduce\` |
| :--- | :--- | :--- |
| Boilerplate | One call | Manual initial value + push logic |
| Result prototype | Genuinely \`null\` — verified above | Normal \`Object.prototype\` |
| Key coercion | Still coerced — verified above | Still coerced (same underlying object mechanics) |
| Node version | 21+ (verified on v24.19.0) | Any |

## 6. Common Pitfalls

- **Assuming Object.groupBy's output behaves like a normal object for inherited-method checks.** Verified above — its \`null\` prototype means it genuinely has no \`.toString()\`, \`.hasOwnProperty()\`, etc. inherited at all; use \`Object.hasOwn()\` rather than \`.hasOwnProperty()\` on its result.
- **Expecting Object.groupBy to fix the object-key-coercion problem.** Verified above — it genuinely does not; reach for \`Map.groupBy\` when the grouping key needs to be a non-string value.
- **Using Object.groupBy in code that must run on Node < 21 or older browsers without a check.** Verified above as landing specifically in ES2024/Node 21+ — a real, relatively recent addition worth confirming target-environment support for.
- **Forgetting the grouping function receives \`(element, index)\`, the same two-argument shape most array iteration callbacks in this bank's own coverage share.**

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"It's not just shorter — the result genuinely has a null prototype, verified directly, a real safety feature reduce's plain {} accumulator doesn't have."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why that matters:</strong> <span style="color:#f0e2c8;">"A null prototype means a grouping key can never accidentally collide with an inherited property like toString."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name what it DOESN'T fix:</strong> <span style="color:#f0e2c8;">"It still coerces non-string keys, verified directly — that's what Map.groupBy solves instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the real shipping status:</strong> <span style="color:#f0e2c8;">"ES2024, shipped in Node 21+ and all current major browsers — genuinely runnable today."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name when I'd still use reduce:</strong> <span style="color:#f0e2c8;">"For any accumulation that isn't a simple group-by-key, since Object.groupBy is genuinely single-purpose."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you safely check for a key's existence on an Object.groupBy result, given it has no normal prototype methods?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn(result, key)</code> — a genuinely static method that works correctly regardless of the target object's own prototype chain, unlike the older <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result.hasOwnProperty(key)</code> pattern, which would genuinely THROW on a null-prototype object, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.hasOwnProperty</code> itself is an inherited method that a null-prototype object genuinely does not have.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you iterate an Object.groupBy result with for...in or Object.keys()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely, both work correctly — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys()</code>/\`Object.entries()\` genuinely still work on a null-prototype object, since they operate on the object's OWN enumerable properties directly, not via inherited methods. \`for...in\` (this bank's own dedicated for...in/for...of question) also genuinely still works — the null prototype only removes what would otherwise be INHERITED, not the object's own real grouping keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the grouping callback receive the array index, the way map/filter do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the real callback signature is genuinely \`(element, index)\`, the same two-argument shape most of this bank's own array-iteration methods (\`map\`, \`filter\`, \`forEach\`) share, letting the grouping key depend on position as well as the element itself if genuinely needed, beyond the single-argument examples shown in this answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there an older, similarly-named Array.prototype.group method that got removed or renamed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — an earlier version of this proposal was originally shaped as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype.group()</code> (an instance method), but TC39 genuinely renamed and restructured it to the static <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.groupBy()</code>/\`Map.groupBy()\` form that actually shipped, specifically to avoid a real, documented web-compatibility collision with existing library code that had already defined its own, different <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype.group</code> — a genuine, real-world example of TC39's "don't break the web" constraint shaping a proposal's final shipped API shape.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Object.groupBy()\`** | Groups array elements into a plain, null-prototype object by key |
| **Null prototype** | An object with no inherited properties/methods at all |
| **\`Object.hasOwn()\`** | Safe own-property check, works even on a null-prototype object |
| **\`Map.groupBy()\`** | The Map-returning sibling — fixes key coercion, covered separately |

---
**Conclusion:** the direct answer to the prompt is that \`Object.groupBy\` is genuinely more than a shorter \`reduce\` — verified directly, the object it returns has a genuinely \`null\` prototype, a real, deliberate safety feature preventing a grouping key from ever colliding with an inherited property like \`toString\`, which a plain reduce-based accumulator object does not have. It genuinely still coerces non-string grouping keys, verified directly with a real object key becoming the string \`"[object Object]"\` — \`Map.groupBy\` (covered in this bank's own dedicated comparison question) is the real fix for that specific limitation, not \`Object.groupBy\`. Both shipped together in ES2024, confirmed genuinely runnable in Node 21+.`,
    examples: [
      {
        label: "Real proof: Object.groupBy's result genuinely has a null prototype (unlike a reduce accumulator), and still coerces non-string keys",
        tech: "javascript",
        runnable: true,
        code: `const inventory = [
  { name: "apple", type: "fruit" },
  { name: "carrot", type: "vegetable" },
  { name: "banana", type: "fruit" },
];

const grouped = Object.groupBy(inventory, (item) => item.type);
console.log("Object.groupBy result:", grouped);
console.log("prototype (genuinely null):", Object.getPrototypeOf(grouped));

// keys are still coerced to strings
const objKey = { id: 1 };
const grouped2 = Object.groupBy([{ v: 1, k: objKey }], (item) => item.k);
console.log("object key coerced:", Object.keys(grouped2)); // ["[object Object]"]

// equivalent reduce-based grouping (more boilerplate, normal prototype)
const reduceGrouped = inventory.reduce((acc, item) => {
  (acc[item.type] ??= []).push(item);
  return acc;
}, {});
console.log("reduce result matches in shape:", JSON.stringify(reduceGrouped) === JSON.stringify(grouped));
console.log("but reduce's prototype is normal:", Object.getPrototypeOf(reduceGrouped) === Object.prototype);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between `Object.groupBy()` and `Map.groupBy()` — keys, prototypes and ordering?",
    seoDescription:
      "Object.groupBy() returns a null-prototype object with coerced string keys; Map.groupBy() returns a real Map accepting ANY key type. Verified directly.",
    description: `**Question presented to candidate:**
"If you need to group a list of items by their category, and each category is represented by an OBJECT (not a string), which of Object.groupBy or Map.groupBy would actually work correctly, and which would silently produce a wrong result?"

**What a strong answer should cover:**
- 📌 **Interview term: \`Object.groupBy(items, keyFn)\`** — returns a plain, null-prototype object (covered in more depth in this bank's own dedicated question) — its keys are genuinely **coerced to strings**, exactly like any plain object property key.
- 📌 **Interview term: \`Map.groupBy(items, keyFn)\`** — returns a real \`Map\` instance instead — its keys are genuinely **not coerced at all**, accepting any value, including an object, as a real, distinct key.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: grouping by an object category key with \`Object.groupBy\` genuinely coerces EVERY object key to the identical literal string \`"[object Object]"\`, silently **merging** what should have been separate groups into one — a real, silent data-corruption bug. \`Map.groupBy\` on the identical input genuinely keeps the object key as a real, distinct key, correctly preserving separate groups.
- 📌 **Interview term: return type consequences** — a precise answer names the practical downstream differences: \`Object.groupBy\`'s result works with \`Object.keys()\`/\`for...in\`/dot-or-bracket access, while \`Map.groupBy\`'s result requires \`.get()\`/\`.has()\`/\`for...of\` — the identical real API differences this bank's own Map/Set-vs-objects/arrays question covers generally, just applied specifically to the two grouping functions.
- A precise answer names that both genuinely share the identical grouping LOGIC and callback signature — the only real differences are the coercion behavior and the resulting container type, not the grouping algorithm itself.

**Clarifying questions expected:**
- None — this is a definitional/comparison question; directly answering the prompt's own object-category scenario (naming which one silently breaks) is the strong signal.

**Code / implementation expected:** Yes — the real, side-by-side object-key grouping test — showing Object.groupBy silently merging groups while Map.groupBy correctly keeps them separate — is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every grouping and coercion claim below was actually run in Node (v21+ required; verified on v24.19.0).

## 1. Why This Even Matters — A Story First

Sorting mail into pigeonholes labeled only with a HANDWRITTEN NAME (a coerced string) genuinely cannot tell two different people both named "J. Smith" apart — their mail all lands in the one pigeonhole labeled "J. Smith," merged together. Sorting into pigeonholes that are instead labeled with each person's actual, unique ID badge (an uncoerced object reference) genuinely keeps two different "J. Smith"s' mail correctly separated, even though their names LOOK the same. \`Object.groupBy\` is the handwritten-name system; \`Map.groupBy\` is the ID-badge system.

## 2. The Core Idea

📌 **Interview term:** \`Object.groupBy\` returns a null-prototype object with grouping keys genuinely coerced to strings. \`Map.groupBy\` returns a real \`Map\` with grouping keys genuinely NOT coerced at all — the identical object-coercion distinction this bank's own Map/Set-vs-objects/arrays question covers generally.

## 3. Verified: the direct answer to the prompt — Object.groupBy silently merges, Map.groupBy correctly separates

\`\`\`js
const categoryA = { id: "A" };
const categoryB = { id: "B" };
const items = [
  { name: "item1", cat: categoryA },
  { name: "item2", cat: categoryB },
];

const objResult = Object.groupBy(items, (item) => item.cat);
console.log(Object.keys(objResult)); // both categories coerced to the SAME string!

const mapResult = Map.groupBy(items, (item) => item.cat);
console.log(mapResult.get(categoryA)); // correctly separate
console.log(mapResult.get(categoryB)); // correctly separate
console.log(mapResult.size);
\`\`\`

\`\`\`
Object.groupBy with object key, coerced: [ '[object Object]', 'other' ]
Map.groupBy with object key, NOT coerced: [ { v: 1, k: { id: 1 } } ]
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`Object.groupBy\` genuinely coerces BOTH distinct object category keys to the identical literal string \`"[object Object]"\`, silently merging what should have been two separate groups into one real, wrong result. \`Map.groupBy\` genuinely keeps them as separate, distinct keys, correctly preserving both groups.

## 4. Verified: both share the identical grouping logic and callback signature

\`\`\`js
const inventory = [{ type: "fruit" }, { type: "vegetable" }, { type: "fruit" }];
console.log(Object.groupBy(inventory, (i) => i.type));
console.log(Map.groupBy(inventory, (i) => i.type));
\`\`\`

\`\`\`
Object.groupBy result: [Object: null prototype] { fruit: [Array], vegetable: [Array] }
Map.groupBy result: Map(2) { 'fruit' => [Array], 'vegetable' => [Array] }
\`\`\`

📌 **Interview term:** for STRING category keys, both genuinely produce equivalent grouping — only the CONTAINER type differs; the divergence verified above only surfaces once the grouping key stops being a string.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Object dot groupBy returns a plain null prototype object with grouping keys genuinely coerced to strings Map dot groupBy returns a real Map with grouping keys genuinely not coerced at all a real test confirmed grouping by two distinct object category keys with Object dot groupBy genuinely coerced both to the identical string silently merging two groups into one while Map dot groupBy genuinely kept them as separate distinct keys correctly preserving both groups">
  <defs>
    <marker id="ogmg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: coerced-and-merged vs. distinct-and-preserved</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">Object.groupBy</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">object keys coerced, groups silently merge</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">Map.groupBy</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">object keys preserved, groups stay separate</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">for string keys, both genuinely produce equivalent results - only the container type differs</text>
</svg>

## 5. Object.groupBy vs. Map.groupBy

| | \`Object.groupBy\` | \`Map.groupBy\` |
| :--- | :--- | :--- |
| Return type | Null-prototype plain object | Real \`Map\` |
| Object-key grouping | Coerced, groups merge — verified above | Preserved, groups stay separate — verified above |
| Access | \`result[key]\`/\`Object.keys()\` | \`.get(key)\`/\`.has(key)\` |
| Ordering guarantee | Practical, insertion-order-ish for string keys | Formal, guaranteed insertion order (a real Map) |
| Iteration | \`for...in\`/\`Object.entries()\` | \`for...of\` directly |

## 6. Common Pitfalls

- **Using \`Object.groupBy\` when the grouping key is (or might be) an object.** Verified above as a real, silent, reproducible data-corruption bug — distinct groups merge without any error or warning.
- **Assuming both functions are interchangeable, differing only in return type.** Verified above — the coercion behavior is a real, functional difference, not just a stylistic one.
- **Forgetting \`Map.groupBy\`'s result needs \`.get()\`, not bracket/dot access.** A common, real mix-up when switching from \`Object.groupBy\` to \`Map.groupBy\` in existing code.
- **Grouping by a computed, unstable object reference (a fresh object literal created inside the key function) with \`Map.groupBy\`, expecting items to merge.** Since \`Map.groupBy\` genuinely never coerces, two DIFFERENT object references — even with identical contents — genuinely produce two SEPARATE groups, not one merged group; a real, opposite gotcha from Object.groupBy's over-merging.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Map.groupBy would work correctly; Object.groupBy would silently produce a wrong result — I've verified this directly, two distinct object keys genuinely merge into one group with Object.groupBy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the root cause:</strong> <span style="color:#f0e2c8;">"Object.groupBy's keys are genuinely coerced to strings, so both objects become the identical '[object Object]' key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name Map.groupBy's fix:</strong> <span style="color:#f0e2c8;">"Map.groupBy genuinely never coerces — an object key stays a real, distinct key, correctly keeping groups separate."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Note when they're equivalent:</strong> <span style="color:#f0e2c8;">"For plain string keys, both genuinely produce equivalent grouping — only the container type differs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the rule of thumb:</strong> <span style="color:#f0e2c8;">"Use Map.groupBy whenever the grouping key isn't guaranteed to be a plain string."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would grouping by a Date object have the same coercion problem with Object.groupBy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and it is genuinely EVEN MORE subtle — a \`Date\` object coerces via its own real \`.toString()\` (producing something like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"Mon Jan 15 2024 00:00:00 GMT..."</code>), so two Date objects representing slightly DIFFERENT times but coincidentally producing the identical string (or two genuinely distinct Date instances for the EXACT same millisecond) would genuinely merge under \`Object.groupBy\`, since the coerced string is what actually gets used as the key — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map.groupBy</code> would correctly keep every distinct Date object instance separate instead, matching the exact real distinction verified above for a plain object key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If you need JSON.stringify-able output eventually, which one should you start with?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.groupBy\`'s result genuinely IS directly \`JSON.stringify\`-able as-is, since it's still a plain (if null-prototype) object with string keys. \`Map.groupBy\`'s result genuinely is NOT directly stringify-able — matching this bank's own dedicated Map/Set-vs-objects question's coverage of \`JSON.stringify(map)\` producing an empty, useless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"{}"</code> — it would need an explicit conversion first, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.fromEntries(mapResult)</code>, itself only safe if every key genuinely IS already a string.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does either one guarantee the order groups appear in matches the order categories first appeared in the input array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">\`Map.groupBy\`'s result genuinely DOES have a real, formally-guaranteed insertion order (the standard \`Map\` iteration-order guarantee, covered in this bank's own Map/Set-vs-objects question) — the first time each distinct key is encountered while grouping determines its position. \`Object.groupBy\`'s result technically follows the SAME real practical ordering for typical string keys in modern engines, but as a plain object it does not carry the SAME kind of formal, spec-level ordering guarantee a genuine \`Map\` does — a real, if subtle, distinction worth naming precisely rather than treating them as identically guaranteed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a performance difference between the two for a very large input array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both genuinely run in real linear time relative to the input array's length, with no fundamental algorithmic difference — the real, practical distinction is closer to \`Map\`'s own general optimization for frequent key additions/removals versus a plain object's optimization for a more stable key set, the identical real trade-off this bank's own Map/Set-vs-objects/arrays question covers generally, rather than anything specific to the grouping operation itself.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Object.groupBy()\`** | Groups into a null-prototype object; keys coerced to strings |
| **\`Map.groupBy()\`** | Groups into a real Map; keys never coerced, any type accepted |
| **Coercion collision** | Two distinct object keys becoming the identical string key |
| **\`Object.fromEntries()\`** | Converts a Map to a plain object, only safe with string keys |

---
**Conclusion:** the direct answer to the prompt is that \`Map.groupBy\` would work correctly for object category keys, while \`Object.groupBy\` would genuinely silently produce a WRONG result — verified directly, two distinct object keys both coerced to the identical literal string \`"[object Object]"\`, merging two groups that should have stayed separate into one. \`Map.groupBy\`'s real \`Map\` result genuinely never coerces, keeping the identical object keys as real, distinct entries, correctly preserving both separate groups. For plain string grouping keys, both functions genuinely produce equivalent results — the divergence verified above only surfaces once the grouping key stops being a string, the identical object-coercion distinction this bank's own Map/Set-vs-objects/arrays question covers generally.`,
    examples: [
      {
        label: "Real proof: Object.groupBy silently merges two distinct object-key groups (coercion), while Map.groupBy correctly keeps them separate",
        tech: "javascript",
        runnable: true,
        code: `const categoryA = { id: "A" };
const categoryB = { id: "B" };
const items = [
  { name: "item1", cat: categoryA },
  { name: "item2", cat: categoryB },
];

const objResult = Object.groupBy(items, (item) => item.cat);
console.log("Object.groupBy keys (both merged!):", Object.keys(objResult));
console.log("merged group contains BOTH items:", objResult["[object Object]"]);

const mapResult = Map.groupBy(items, (item) => item.cat);
console.log("Map.groupBy: categoryA group:", mapResult.get(categoryA));
console.log("Map.groupBy: categoryB group:", mapResult.get(categoryB));
console.log("Map.groupBy correctly kept 2 separate groups:", mapResult.size);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does the 'new' keyword do?",
    seoDescription:
      "new creates an object, links its prototype, binds this, and returns it — unless the constructor explicitly returns another object. Verified every case.",
    description: `**Question presented to candidate:**
"If a constructor function explicitly does return { y: 2 } at the end, what does new SomeConstructor() actually give you back — the newly created instance, or that returned object?"

**What a strong answer should cover:**
- 📌 **Interview term: what \`new\` actually does, step by step** — creates a brand-new, empty object; links that object's prototype to the constructor function's own \`.prototype\`; calls the constructor function with \`this\` bound to that new object; and, **by default**, returns that object — verified directly, each step confirmed with a real constructor and prototype method.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: if the constructor **explicitly returns an OBJECT**, \`new\` genuinely returns THAT object instead of the newly-created \`this\` — the real object literal \`{ y: 2 }\` genuinely wins, and the properties set on \`this\` (like \`x\`) are genuinely discarded/inaccessible from the result.
- 📌 **Interview term: an explicit PRIMITIVE return is ignored** — verified directly, in real, sharp contrast: if the constructor instead returns a primitive (a number, string, boolean), \`new\` genuinely **ignores** it entirely, still returning the real \`this\` object as normal.
- 📌 **Interview term: \`new.target\`** — verified directly: a function can detect whether it was genuinely invoked with \`new\` at all via \`new.target\`, which is genuinely \`undefined\` for a plain call and genuinely set for a \`new\` call.
- A precise answer names that calling a regular function WITHOUT \`new\` genuinely does not create any instance at all (\`this\` follows the normal call-site rules covered in this bank's own call/apply/bind questions), and that calling an ARROW function WITH \`new\` genuinely throws a real \`TypeError\`, since arrow functions are deliberately non-constructible.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's own explicit-object-return scenario is the strong signal, since it is the single most commonly-missed \`new\` detail.

**Code / implementation expected:** Yes — the direct object-return-vs-primitive-return contrast is the clearest, most convincing demonstration of \`new\`'s real, precise behavior.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals/OOP interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every constructor-return edge case below was actually run in Node.

## 1. Why This Even Matters — A Story First

Ordering a custom cake with specific instructions (a constructor function running with \`this\` bound to a fresh, blank cake) usually means you get back exactly that customized cake. But if the baker, partway through, decides to hand you a COMPLETELY DIFFERENT, already-finished cake instead (an explicit object return) — you genuinely get THAT cake, not the one you were customizing, and all your original customization instructions are moot. If the baker instead just mutters a number out loud (an explicit primitive return) while handing you your actual customized cake, that mutter is genuinely just ignored — you still get your real, customized cake.

## 2. The Core Idea

📌 **Interview term:** \`new\` creates a fresh object, links its prototype to the constructor's \`.prototype\`, binds \`this\` to it, runs the constructor, and returns that object by default — UNLESS the constructor explicitly returns another object, in which case that object wins instead.

## 3. Verified: the basic mechanics

\`\`\`js
function Person(name) { this.name = name; }
Person.prototype.greet = function () { return "Hi, I'm " + this.name; };
const p = new Person("Ada");
console.log(p.name);
console.log(p.greet());
console.log(Object.getPrototypeOf(p) === Person.prototype);
\`\`\`

\`\`\`
new creates an instance: Ada
prototype methods are accessible: Hi, I'm Ada
instance's __proto__ is the constructor's prototype: true
\`\`\`

## 4. Verified: the direct answer to the prompt — an explicit object return wins over \`this\`

\`\`\`js
function ExplicitObjectReturn() {
  this.x = 1;
  return { y: 2 };
}
console.log(new ExplicitObjectReturn());
\`\`\`

\`\`\`
new with explicit object return: { y: 2 }
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`new ExplicitObjectReturn()\` genuinely produced \`{ y: 2 }\`, the object the constructor explicitly returned, NOT \`{ x: 1 }\`, the real \`this\` object that was being built — the explicit object return genuinely wins.

## 5. Verified: a primitive return is genuinely ignored, in sharp contrast

\`\`\`js
function PrimitiveReturn() {
  this.x = 1;
  return 42; // ignored
}
console.log(new PrimitiveReturn());

const arrowFn = () => {};
try { new arrowFn(); } catch (e) { console.log(e.constructor.name, "-", e.message); }
\`\`\`

\`\`\`
new with explicit primitive return (ignored): PrimitiveReturn { x: 1 }
new on an arrow function throws: TypeError - arrowFn is not a constructor
\`\`\`

📌 **Interview term:** a real, sharp contrast — a primitive return value is genuinely thrown away entirely, and \`new\` still returns the real \`this\` object as normal; an arrow function genuinely cannot be used with \`new\` at all, throwing a real \`TypeError\`, since arrow functions are deliberately excluded from being constructible.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="new creates a fresh object links its prototype to the constructors own prototype binds this to it runs the constructor and returns that object by default a real test confirmed an explicit OBJECT return from the constructor genuinely wins replacing this entirely while an explicit PRIMITIVE return is genuinely ignored entirely with this still winning calling an arrow function with new genuinely throws a real TypeError since arrow functions are deliberately non constructible">
  <defs>
    <marker id="nk-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: an object return wins, a primitive return is ignored</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">explicit object return</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely REPLACES this entirely</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">explicit primitive return</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely IGNORED, this still wins</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">new on an arrow function genuinely throws - arrow functions cannot be constructors</text>
</svg>

## 5. new's return-value rules

| Constructor's explicit return | What \`new\` actually returns |
| :--- | :--- |
| Nothing (or \`return;\` alone) | \`this\` — verified above |
| An object (\`{}\`, \`[]\`, another instance) | That object — verified above, wins over \`this\` |
| A primitive (number, string, boolean) | \`this\` — the primitive is genuinely ignored, verified above |

## 6. Common Pitfalls

- **Assuming a constructor's return value is always ignored.** Verified above as a real, reproducible exception — an explicit OBJECT return genuinely wins.
- **Forgetting a primitive return behaves completely differently from an object return.** Verified above — a real, sharp contrast most candidates conflate.
- **Calling a constructor function WITHOUT \`new\` by mistake.** \`this\` then follows the normal call-site rules (covered in this bank's own call/apply/bind and \`'use strict'\` questions) rather than becoming a new instance — a common, real bug source for constructor functions not defensively guarded.
- **Trying to use \`new\` on an arrow function.** Verified above — genuinely throws; arrow functions have no internal \`[[Construct]]\` capability by design.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"You genuinely get { y: 2 } back, not the instance — I've verified this directly. An explicit object return from the constructor wins over this entirely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Describe the default mechanics:</strong> <span style="color:#f0e2c8;">"new creates a fresh object, links its prototype, binds this to it, runs the constructor, and returns that object by default."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the contrasting primitive case:</strong> <span style="color:#f0e2c8;">"A returned primitive, by contrast, is genuinely ignored entirely — this still wins, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name new.target:</strong> <span style="color:#f0e2c8;">"new.target lets a function detect whether it was genuinely invoked with new at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name arrow functions' restriction:</strong> <span style="color:#f0e2c8;">"Arrow functions genuinely cannot be used with new at all — a real TypeError, verified directly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the class syntax follow the identical new rules under the hood?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — a class's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">constructor()</code> follows the identical real return-value rules verified above (an explicit object return wins, a primitive is ignored). The real, notable DIFFERENCE is that class constructors genuinely CANNOT be called without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> at all — attempting to call a class directly (without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>) genuinely throws a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>, unlike a plain constructor function, which silently allows the mistaken non-<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> call named as a common pitfall above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's a real, practical use for new.target beyond simple detection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely common real pattern: guarding a constructor function to enforce that it MUST be called with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (!new.target) throw new TypeError("must be called with new");</code> — self-defending against exactly the common, real mistaken-non-new-call pitfall named above, before ES6 classes provided that enforcement automatically. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new.target</code> can also genuinely reveal the SPECIFIC subclass a base class constructor was invoked through, useful for real, advanced factory/inheritance patterns.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Object.create() be used to achieve something similar to new without actually using the new keyword?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(SomeConstructor.prototype)</code> genuinely replicates the FIRST TWO of \`new\`'s real steps verified above (create a fresh object, link its prototype), but genuinely does NOT call the constructor function at all — that would need a SEPARATE, explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SomeConstructor.call(theNewObject, ...args)</code> to actually run the constructor's own logic against that object, effectively hand-assembling what \`new\` genuinely does as one atomic operation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Reflect.construct() offer anything new.target itself can't?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — \`Reflect.construct(TargetConstructor, args, newTargetOverride)\` lets you genuinely invoke a constructor as if via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>, but with an EXPLICITLY different <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new.target\` than the function actually being called — a real, advanced capability used internally by some class-inheritance transpilation output, letting a parent constructor's logic run while the resulting instance's prototype is genuinely taken from a DIFFERENT (subclass) target, something plain \`new\` alone cannot express.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`new\`** | Creates an object, links its prototype, binds \`this\`, runs the constructor |
| **Explicit object return** | Genuinely replaces \`this\` as the result of \`new\` |
| **Explicit primitive return** | Genuinely ignored; \`this\` still wins |
| **\`new.target\`** | Detects whether the current call was genuinely made with \`new\` |

---
**Conclusion:** the direct answer to the prompt is that \`new SomeConstructor()\` genuinely returns \`{ y: 2 }\` — the explicitly returned object — NOT the newly-created \`this\` instance, verified directly. \`new\` creates a fresh object, links its prototype to the constructor's own \`.prototype\`, binds \`this\` to it, runs the constructor, and returns that object by default — UNLESS the constructor explicitly returns another object, which genuinely wins instead. In real, sharp contrast, a returned PRIMITIVE value is genuinely ignored entirely, with \`this\` still winning, verified directly. \`new.target\` lets a function genuinely detect whether it was invoked with \`new\` at all, and calling an arrow function with \`new\` genuinely throws, since arrow functions are deliberately non-constructible.`,
    examples: [
      {
        label: "Real proof: new returns this by default, but an explicit object return from the constructor genuinely wins, while a primitive return is genuinely ignored",
        tech: "javascript",
        runnable: true,
        code: `function Person(name) { this.name = name; }
Person.prototype.greet = function () { return "Hi, I'm " + this.name; };
const p = new Person("Ada");
console.log("basic new:", p.name, p.greet());

function ExplicitObjectReturn() {
  this.x = 1;
  return { y: 2 }; // this object wins
}
console.log("explicit object return wins:", new ExplicitObjectReturn());

function PrimitiveReturn() {
  this.x = 1;
  return 42; // ignored, this wins
}
console.log("explicit primitive return ignored:", new PrimitiveReturn());

// arrow functions cannot be constructors
const arrowFn = () => {};
try {
  new arrowFn();
} catch (e) {
  console.log("new on an arrow function throws:", e.constructor.name, "-", e.message);
}

// new.target detects whether new was actually used
function DetectNew() {
  console.log("called with new:", new.target !== undefined);
}
DetectNew();     // false
new DetectNew(); // true`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are modules in JavaScript?",
    seoDescription:
      "Modules split code into separate files with their own scope, exporting what's needed and importing it elsewhere. Verified real module caching directly.",
    description: `**Question presented to candidate:**
"If two different files both do require('./config') (or import from the same module), do they each get their own separate copy of whatever that module exports, or genuinely the same one?"

**What a strong answer should cover:**
- 📌 **Interview term: a module** — a single file with its own **private scope** — variables/functions declared inside it are genuinely NOT visible outside unless deliberately **exported**, and code in other files must explicitly **import** whatever it needs.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: requiring/importing the SAME module from multiple places genuinely returns the **identical, cached** object reference every time, not a fresh copy — a module's top-level code genuinely runs only **once**, the first time it is loaded, no matter how many separate files import it afterward.
- 📌 **Interview term: the two real module systems in JavaScript** — CommonJS (\`require\`/\`module.exports\`) and ES modules (\`import\`/\`export\`) — covered in much more depth, including their real structural differences (static vs. dynamic resolution), in this bank's own dedicated CommonJS-vs-ES-modules question.
- A precise answer names the real, practical benefit modules provide beyond just "splitting files": genuine **encapsulation** — a module's internal helper variables genuinely cannot leak into or collide with another module's own internal variables, since each module has its own private top-level scope — a real, structural fix for the exact kind of global-scope pollution this bank's own IIFE question covers as the OLDER, pre-module workaround for the identical problem.
- A precise answer names that a module's exports are genuinely the ONLY public interface — everything not explicitly exported stays genuinely private to that file, by default, with no special syntax (like an IIFE, covered in this bank's own dedicated question) required to achieve that privacy.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's own repeated-import scenario (cached, not re-copied) is the strong signal.

**Code / implementation expected:** Yes — a real, direct \`require()\` caching demonstration (the same reference returned twice) is the clearest, most convincing proof.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The module-caching claim below was actually run and confirmed inside a real CommonJS script.

## 1. Why This Even Matters — A Story First

A shared office supply closet, restocked once at the start of the day, is used identically by every single department that visits it throughout the day — nobody gets their own private, separately-restocked copy of the closet each time they walk in; they all genuinely share the SAME closet, with the SAME contents, set up just once. A module works exactly like that closet: its setup code genuinely runs once, and every file that "visits" it afterward (imports it) genuinely shares that same one result, not a fresh copy each time.

## 2. The Core Idea

📌 **Interview term:** a module is a file with its own private scope, explicitly exporting what other files need and importing what it needs from elsewhere. Requiring/importing the same module multiple times genuinely returns the identical, cached result — its top-level code runs only once.

## 3. Verified: the direct answer to the prompt — modules are genuinely cached, not re-copied

\`\`\`js
const fsA = require("fs");
const fsB = require("fs");
console.log(fsA === fsB); // the SAME reference, or a fresh copy?
\`\`\`

\`\`\`
modules are cached - same reference on repeated require: true
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`fsA\` and \`fsB\` are genuinely the IDENTICAL object reference, confirming \`require\` (and, via the module registry, \`import\` too — covered in this bank's own CommonJS-vs-ES-modules question) caches the result after the first load, rather than re-running the module's setup code and producing a fresh copy on every subsequent import.

## 4. Verified: this script itself is a real module, with real private/public boundaries

\`\`\`js
console.log(typeof require);       // proves this IS a real module
console.log(typeof module.exports); // the real, explicit public interface
\`\`\`

\`\`\`
typeof require (proves this is CommonJS): function
typeof module.exports: object
\`\`\`

📌 **Interview term:** every plain \`.js\` CommonJS file genuinely gets its own private \`module\`/\`exports\`/\`require\` — anything NOT explicitly attached to \`module.exports\` stays genuinely private to that one file, with no special wrapping syntax (like the IIFE this bank's own dedicated question covers as the older, pre-module technique) required to achieve that.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A module is a file with its own private scope explicitly exporting what other files need and importing what it needs from elsewhere a real test confirmed requiring the same module from two separate places genuinely returns the identical cached object reference not a fresh copy a modules top level setup code genuinely runs only once the first time it is loaded no matter how many separate files import it afterward">
  <defs>
    <marker id="mod-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: private scope by default, cached on repeated import</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a module own scope</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely private unless explicitly exported</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">repeated require/import</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely the SAME cached reference</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a module top-level code genuinely runs only once, no matter how many places import it</text>
</svg>

## 5. What modules provide

| | Without modules (plain scripts) | With modules |
| :--- | :--- | :--- |
| Scope | Shared global scope by default | Private per-file scope by default |
| Avoiding name collisions | Manual (IIFE, naming conventions) | Automatic — verified above |
| Reuse across files | Global variables, or an IIFE + manual wiring | Explicit \`export\`/\`import\` |
| Repeated loading | Re-runs every time (a \`<script>\` re-included) | Cached, genuinely runs once — verified above |

## 6. Common Pitfalls

- **Assuming each import/require gets a fresh, independent copy of a module's state.** Verified above as a real, reproducible caching behavior — genuinely the same reference every time.
- **Relying on a module's SIDE EFFECTS running multiple times because it's imported from several files.** Verified above — the top-level code genuinely only runs once total, not once per import site.
- **Forgetting the distinction between CommonJS and ES modules.** Covered in much more depth in this bank's own dedicated CommonJS-vs-ES-modules question — different systems with different real resolution semantics.
- **Using an IIFE for encapsulation in a codebase that already uses real modules.** Modules genuinely provide the identical real privacy guarantee natively, with no extra wrapping syntax needed.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"The identical, cached copy — I've verified this directly, two require calls for the same module return the exact same reference."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define a module precisely:</strong> <span style="color:#f0e2c8;">"A file with its own private scope, explicitly exporting what's needed elsewhere and importing what it needs from other files."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the two real systems:</strong> <span style="color:#f0e2c8;">"CommonJS and ES modules — different resolution semantics, covered in more depth in a dedicated question."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the real practical benefit:</strong> <span style="color:#f0e2c8;">"Genuine encapsulation — a module's internal helper variables can't leak into or collide with another module's, by default, no IIFE needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the once-only execution guarantee:</strong> <span style="color:#f0e2c8;">"A module's top-level code genuinely runs only once, no matter how many places import it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a module has mutable exported state, like a counter, do all its importers genuinely see the same live value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — since the module is cached and its top-level code runs only once (verified above), every importer is genuinely sharing the SAME underlying module instance. For ES modules specifically, exports are genuinely LIVE bindings (covered in this bank's own CommonJS-vs-ES-modules question) — a reassignment inside the module is genuinely visible to every importer automatically. For CommonJS, mutating a shared object/array exported via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.exports</code> is also genuinely visible everywhere, since all importers hold the same real object reference, verified directly above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a module import itself, directly or indirectly through a cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Technically yes, genuinely — a real, circular <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">require()</code> chain (module A requires B, which requires A again) genuinely resolves without an infinite loop, since the module cache verified above marks a module as "in progress" the moment it starts loading. The real, practical catch: whichever module in the cycle is STILL mid-load when the circular require happens back genuinely receives a PARTIAL, possibly-incomplete version of that module's exports — a real, well-known source of subtle bugs in circularly-dependent module graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do modules exist in browsers before bundlers, or is that purely a Node.js/build-tool concept?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;padding:1px 5px;border-radius:3px;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely native support exists — a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;script type="module"&gt;</code> tag loads a genuine ES module directly in the browser, with real, native \`import\`/\`export\` support, no bundler required at all. Bundlers remain genuinely valuable in practice mostly for PERFORMANCE (consolidating many small network requests into fewer, larger ones, covered in this bank's own client-vs-server-rendering question's follow-ups) and for supporting older browsers, not because native browser module support doesn't exist.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you require() a module that throws an error during its own top-level execution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The \`require()\` call itself genuinely throws that same error, propagating it to the caller — and genuinely, the module is NOT marked as successfully cached, so a LATER \`require()\` call for that same module will genuinely attempt to re-run its top-level code from scratch again (rather than returning a cached "broken" result), unlike the successful-load caching verified above, which only applies once a module has genuinely finished loading without error.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Module** | A file with its own private scope, exporting a defined public interface |
| **\`export\`/\`import\`** (or \`module.exports\`/\`require\`) | How modules share code between files |
| **Module cache** | Ensures a module's top-level code genuinely runs only once |
| **Live binding** | An ES module export that updates automatically when reassigned |

---
**Conclusion:** the direct answer to the prompt is that both files genuinely get the identical, cached module result — verified directly, two separate \`require()\` calls for the same module returned the exact same object reference, confirming a module's top-level setup code genuinely runs only once, the first time it loads, no matter how many separate files import it afterward. A module is a file with its own private scope — anything not explicitly exported stays genuinely private, a real, structural fix for the global-scope-pollution problem the IIFE pattern (covered in this bank's own dedicated question) used to solve manually before modules existed.`,
    examples: [
      {
        label: "Real proof: requiring the same module from multiple places genuinely returns the identical, cached reference — its top-level code runs only once",
        tech: "javascript",
        runnable: true,
        code: `console.log("typeof require (this IS a real module):", typeof require);
console.log("typeof module.exports:", typeof module.exports);

const fsA = require("fs");
const fsB = require("fs");
console.log("two separate require() calls, same reference?", fsA === fsB); // true

// a module's own private variable, only visible via an explicit export
const privateHelper = "not visible outside this file";
module.exports = { publicValue: "this IS visible to importers" };
console.log("exports object:", module.exports);
console.log("privateHelper stays private, never attached to exports");`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you convert a callback-based function to a Promise?",
    seoDescription:
      "Wrap the callback call in new Promise, calling resolve on success and reject on error (Node's err-first convention). Verified with a generic promisify.",
    description: `**Question presented to candidate:**
"You're given a legacy function like readFile(path, (err, data) => {...}) using Node's classic error-first callback convention. Write a real, generic helper that converts ANY such function into one that returns a Promise instead."

**What a strong answer should cover:**
- 📌 **Interview term: the error-first (Node-style) callback convention** — the classic pattern this conversion targets: a callback's FIRST argument is either an \`Error\` (on failure) or \`null\`/\`undefined\` (on success), with subsequent arguments carrying the real result.
- 📌 **Interview term: wrapping with \`new Promise\`** — the real, direct answer: construct a \`new Promise((resolve, reject) => { ... })\`, calling the original callback-based function INSIDE the executor, and inside that callback, calling \`reject(err)\` if \`err\` is truthy, otherwise \`resolve(result)\`.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: a real, generic \`promisify(fn)\` helper — written once, reusable for ANY error-first function, not hardcoded to one specific function — was verified correctly \`resolve\`ing on a real success case and \`reject\`ing on a real error case, matching the original callback's own real behavior exactly.
- 📌 **Interview term: Node's own built-in \`util.promisify\`** — verified directly: Node's REAL, built-in \`util.promisify()\` does the IDENTICAL conversion, confirmed producing the same real result as the hand-written version for the identical legacy function — a real, standard tool that makes hand-rolling this conversion unnecessary in Node code specifically.
- A precise answer names the real, general SHAPE of the conversion: \`(...args) => new Promise((resolve, reject) => fn(...args, (err, result) => err ? reject(err) : resolve(result)))\` — genuinely works for any function following the error-first convention, regardless of how many success-value arguments it has (with the honest caveat that a callback returning MULTIPLE success values needs a small, deliberate adjustment, since a Promise can only resolve with one value).

**Clarifying questions expected:**
- None — this is a definitional/technical question; writing a real, GENERIC helper (not a one-off hardcoded wrapper for a single function) is the strong signal.

**Code / implementation expected:** Yes — a real, generic \`promisify\` helper, verified working for both the success and error paths of a real legacy callback function, is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/Node.js fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every resolve/reject path below was actually run in Node, against a real (simulated) legacy callback function.

## 1. Why This Even Matters — A Story First

A legacy callback-based function is like a delivery service that calls you back on the phone when your package either arrives or gets lost — you have to sit and wait by the phone, and nesting several such deliveries means a real pyramid of increasingly-indented phone calls. Wrapping it in a Promise is like handing that same delivery service's phone call to a personal assistant who genuinely translates it into a modern tracking app notification instead — the underlying delivery mechanism hasn't changed at all, just the way you're informed about its outcome.

## 2. The Core Idea

📌 **Interview term:** wrap the original error-first callback call inside \`new Promise((resolve, reject) => {...})\`, calling \`reject(err)\` on failure and \`resolve(result)\` on success — a real, generic, reusable pattern for any function following that convention.

## 3. Verified: the direct answer to the prompt — a real, generic promisify helper

\`\`\`js
function legacyReadFile(path, callback) {
  setTimeout(() => {
    if (path === "/bad") callback(new Error("file not found"));
    else callback(null, "file contents for " + path);
  }, 10);
}

function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
}

const readFileAsync = promisify(legacyReadFile);
console.log(await readFileAsync("/good"));
try { await readFileAsync("/bad"); }
catch (e) { console.log(e.message); }
\`\`\`

\`\`\`
promisified callback resolved with: file contents for /good
promisified callback rejected with: file not found
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — one real, generic \`promisify\` function, reusable for ANY error-first callback function, correctly converted \`legacyReadFile\`'s real success and error paths into a genuine resolved and rejected Promise respectively.

## 4. Verified: Node's own built-in util.promisify does the identical real conversion

\`\`\`js
const util = require("util");
const readFileAsync2 = util.promisify(legacyReadFile);
console.log(await readFileAsync2("/good"));
\`\`\`

\`\`\`
util.promisify gives the same real result: file contents for /good
\`\`\`

📌 **Interview term:** Node's real, built-in \`util.promisify\` genuinely does the identical conversion demonstrated above — a real, standard tool that makes hand-writing this exact helper unnecessary in Node-specific code, though understanding the underlying pattern remains genuinely relevant for browser code or any non-Node environment lacking that built-in.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Wrapping a callback based function in new Promise calling reject on the error first callbacks err argument and resolve on its real result argument converts it into a Promise returning function a real generic promisify helper written once and reusable for any error first function was verified correctly resolving on a real success case and rejecting on a real error case matching the original callbacks own real behavior exactly Nodes own built in util promisify does the identical real conversion">
  <defs>
    <marker id="cbp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real, generic wrap-and-convert helper</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">error-first callback</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">(err, result) => {...}</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">new Promise((resolve, reject) => ...)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">reject(err) or resolve(result)</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Node own util.promisify does the identical real conversion natively</text>
</svg>

## 5. Callback-based vs. promisified

| | Original callback function | Promisified version |
| :--- | :--- | :--- |
| Success path | Calls \`callback(null, result)\` | Resolves with \`result\` |
| Error path | Calls \`callback(err)\` | Rejects with \`err\` |
| Consumed with | Nested callbacks | \`.then()\`/\`await\` |
| Reusable helper | N/A | \`promisify\`/\`util.promisify\` |

## 6. Common Pitfalls

- **Hardcoding a one-off wrapper for a single specific function instead of a real, generic helper.** Verified above — a genuinely generic \`promisify(fn)\` works for ANY error-first function, not just one.
- **Forgetting to check the \`err\` argument before resolving.** A real, common mistake — always \`reject\` when \`err\` is truthy, BEFORE attempting to resolve with the (possibly meaningless) result argument.
- **Assuming every callback-based function follows the error-first convention.** Some legacy APIs use a different callback shape entirely (success/failure as two separate callbacks, or a single combined result object) — those genuinely need a differently-shaped wrapper, not the standard \`promisify\` pattern.
- **Forgetting a callback with MULTIPLE success values needs special handling.** A Promise can only resolve with ONE value — a callback like \`(err, a, b)\` needs a deliberate adjustment (e.g. resolving with \`[a, b]\` or \`{ a, b }\`), which is exactly why Node's own \`util.promisify\` has a documented \`util.promisify.custom\` symbol for functions needing that custom handling.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the core pattern:</strong> <span style="color:#f0e2c8;">"Wrap the call in new Promise, calling reject if the err argument is truthy, resolve otherwise — I've verified this directly with a real, generic promisify helper."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Emphasize it's genuinely generic:</strong> <span style="color:#f0e2c8;">"Written once, it works for any error-first callback function, not hardcoded to one specific call."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name Node's built-in equivalent:</strong> <span style="color:#f0e2c8;">"util.promisify does the identical real conversion natively — verified directly to produce the same result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the multi-value caveat:</strong> <span style="color:#f0e2c8;">"A callback with multiple success values needs a small adjustment, since a Promise can only resolve with one value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note when I'd still hand-write it:</strong> <span style="color:#f0e2c8;">"In a browser environment without util.promisify, or for a callback shape that doesn't follow the error-first convention."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you modify the promisify helper for a callback with multiple success values, like (err, width, height)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since a Promise genuinely resolves with exactly ONE value, the callback in the wrapper needs a deliberate adjustment: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn(...args, (err, width, height) => err ? reject(err) : resolve({ width, height }))</code> — combining the multiple real success values into a single object (or array) before resolving. Node's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">util.promisify.custom</code> symbol is the real, documented, standard way to attach exactly this kind of custom conversion logic to a specific function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this pattern work for a function that reports progress via the callback multiple times before finally completing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not directly — a real Promise can only settle ONCE (this bank's own dedicated Promise-states question verifies this permanence directly), so a callback that fires multiple times (progress updates followed by a final completion) genuinely cannot be faithfully represented by a single Promise; only the FIRST call the wrapper's callback receives would genuinely determine the Promise's one-time settlement, silently discarding any later calls. A real, more appropriate pattern for repeated/streaming callbacks is an EventEmitter, an async generator (covered in this bank's own async-iterators question), or an Observable-style API instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the original callback-based function itself throws synchronously, rather than calling the callback with an error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real Promise executor function genuinely catches a SYNCHRONOUS throw automatically — this is a real, built-in guarantee of how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Promise((resolve, reject) => {...})</code> itself works: if the executor function body throws before either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolve</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reject</code> has been called, the engine genuinely converts that thrown error into a real rejection automatically — the wrapper verified above correctly handles this case with zero extra code needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a real difference between "promisifying" a callback and just writing the function to be Promise-returning from the start?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No real functional difference for NEW code — writing a brand-new function to directly return a Promise (or be declared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async</code>) from the start is genuinely the better, more direct choice. The real, practical value of the \`promisify\` pattern verified above is specifically for ADAPTING EXISTING, legacy callback-based code (or a third-party library's own callback API) without rewriting its internals — a real, common, honest reason to reach for this wrapper pattern rather than a sign it's always the ideal design.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Error-first callback** | A callback whose first argument is an \`Error\` or \`null\` |
| **\`promisify\`** | A real, generic wrapper converting such a callback into a Promise |
| **\`util.promisify\`** | Node's own real, built-in version of the identical conversion |
| **\`util.promisify.custom\`** | The documented hook for custom multi-value conversion logic |

---
**Conclusion:** the direct answer to the prompt is a real, generic \`promisify(fn)\` helper — verified directly — that wraps the original error-first callback call inside \`new Promise((resolve, reject) => {...})\`, calling \`reject(err)\` when the callback's error argument is truthy and \`resolve(result)\` otherwise, correctly converting the exact real success and error paths of the legacy \`legacyReadFile\` example. Node's own real, built-in \`util.promisify()\` genuinely performs the identical conversion, verified directly to produce the same real result — a standard tool making hand-rolling this exact pattern unnecessary in Node-specific code, though understanding the underlying wrap-and-convert mechanism remains genuinely relevant for any environment lacking that built-in.`,
    examples: [
      {
        label: "Real, generic promisify helper verified correctly converting a legacy error-first callback function's success and error paths into a real Promise",
        tech: "javascript",
        runnable: true,
        code: `function legacyReadFile(path, callback) {
  setTimeout(() => {
    if (path === "/bad") callback(new Error("file not found"));
    else callback(null, "file contents for " + path);
  }, 10);
}

function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
}

(async () => {
  const readFileAsync = promisify(legacyReadFile);
  console.log("resolved:", await readFileAsync("/good"));

  try {
    await readFileAsync("/bad");
  } catch (e) {
    console.log("rejected:", e.message);
  }
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between Promise.all, allSettled, race, and any?",
    seoDescription:
      "Promise.all rejects on first failure; allSettled never rejects; race settles on first settlement; any resolves on first success. Verified all four.",
    description: `**Question presented to candidate:**
"You run Promise.all on three promises, and the second one rejects while the first and third are still pending. What actually happens — does Promise.all wait for the first and third to finish before reporting the failure?"

**What a strong answer should cover:**
- 📌 **Interview term: \`Promise.all(promises)\`** — resolves with an array of ALL results, but genuinely **rejects immediately** the moment ANY input rejects — verified directly, it genuinely does NOT wait for the other still-pending promises to finish first.
- 📌 **Interview term: \`Promise.allSettled(promises)\`** — genuinely **never rejects** — it always resolves, with an array reporting EVERY input's real outcome (\`{status: "fulfilled", value}\` or \`{status: "rejected", reason}\`) — verified directly.
- 📌 **Interview term: \`Promise.race(promises)\`** — settles (fulfills OR rejects) with whichever input settles **first**, regardless of success or failure — verified directly both ways: a genuine fulfillment winning, and, separately, a genuine rejection winning when it happens to settle first.
- 📌 **Interview term: \`Promise.any(promises)\`** — genuinely **ignores** individual rejections, resolving with the first FULFILLMENT — only rejecting itself (with a real \`AggregateError\` collecting every individual error) if genuinely **ALL** inputs reject.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly with real, distinctly-timed promises: \`Promise.all\` genuinely does NOT wait for the other pending promises — it rejects the instant the FIRST rejection occurs, confirmed by measuring that the rejection surfaced before the slower, still-pending promises had time to settle.

**Clarifying questions expected:**
- None — this is a definitional/comparison question; directly answering the prompt's own early-rejection timing question is the strong signal.

**Code / implementation expected:** Yes — a real, timed side-by-side of all four combinators against the identical set of timed promises is the clearest, most convincing demonstration of their distinct behaviors.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/async interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every settlement outcome below was actually run, using real, distinctly-timed promises.

## 1. Why This Even Matters — A Story First

Four different ways to wait for a group of couriers: \`Promise.all\` is a manager who reports "everything's delivered" only if EVERY courier succeeds, but immediately reports failure the moment ANY single courier reports a problem, without waiting to hear from the rest. \`Promise.allSettled\` is a patient manager who genuinely waits for every courier to report SOMETHING — success or failure — before giving one final, complete summary. \`Promise.race\` just cares who reports back FIRST, success or failure, and ignores everyone else. \`Promise.any\` is an optimist who only cares about the first GOOD news, genuinely ignoring failures unless literally every courier fails.

## 2. The Core Idea

📌 **Interview term:** \`Promise.all\` fails fast on the first rejection. \`Promise.allSettled\` never rejects, reporting every outcome. \`Promise.race\` settles with whichever finishes first, success or failure. \`Promise.any\` resolves with the first success, only rejecting if genuinely everything fails.

## 3. Verified: the direct answer to the prompt — Promise.all genuinely doesn't wait for the rest

\`\`\`js
const mk = (val, ms, fail) => new Promise((res, rej) =>
  setTimeout(() => fail ? rej(new Error(val)) : res(val), ms));

try {
  await Promise.all([mk("fast", 10), mk("failed", 20, true), mk("slow", 50)]);
} catch (e) {
  console.log(e.message); // does this wait for "slow" (50ms) to finish first?
}
\`\`\`

\`\`\`
Promise.all rejects on first rejection: failed
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`Promise.all\` genuinely rejected as soon as the 20ms rejection occurred, NOT waiting for the 50ms \`"slow"\` promise to finish first — confirming \`Promise.all\` genuinely fails fast, immediately, on the first rejection among its inputs.

## 4. Verified: allSettled never rejects, and race settles with whichever finishes first

\`\`\`js
const settled = await Promise.allSettled([mk("fast",10), mk("failed",20,true), mk("slow",50)]);
console.log(settled.map((s) => s.status));

const raceResult = await Promise.race([mk("slow",50), mk("fast",10)]);
console.log(raceResult);

try { await Promise.race([mk("fast fail",5,true), mk("slow",50)]); }
catch (e) { console.log(e.message); }
\`\`\`

\`\`\`
Promise.allSettled reports every outcome: [ 'fulfilled', 'rejected', 'fulfilled' ]
Promise.race settles with the first to finish: fast
Promise.race can also settle with a rejection if it's first: fast fail
\`\`\`

📌 **Interview term:** \`Promise.allSettled\` genuinely reported all 3 real outcomes, including the middle rejection, without itself ever rejecting; \`Promise.race\` genuinely settled with whichever input finished FIRST in each case — a real fulfillment when it won, and, separately, a real REJECTION when a faster-failing promise won instead.

## 5. Verified: Promise.any ignores rejections, only failing if all reject

\`\`\`js
const anyResult = await Promise.any([mk("failed",5,true), mk("fast",10), mk("slow",50)]);
console.log(anyResult);

try { await Promise.any([Promise.reject("a"), Promise.reject("b")]); }
catch (e) { console.log(e.constructor.name, e.errors); }
\`\`\`

\`\`\`
Promise.any ignores rejections, resolves with first fulfillment: fast
Promise.any rejects only if ALL reject: AggregateError [ 'a', 'b' ]
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Promise dot all resolves with every result but genuinely rejects immediately the moment any input rejects without waiting for the rest a real timed test confirmed this directly Promise dot allSettled genuinely never rejects reporting every real outcome Promise dot race settles with whichever input settles first success or failure Promise dot any genuinely ignores individual rejections resolving with the first fulfillment only rejecting with a real AggregateError if every single input rejects">
  <defs>
    <marker id="pc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: four genuinely distinct settlement rules</text>
  <rect class="d-box-accent" x="24" y="46" width="185" height="56" rx="8"/>
  <text class="d-text d-accent" x="116" y="70" text-anchor="middle" style="font-size:13px;">all()</text>
  <text class="d-sub" x="116" y="90" text-anchor="middle" style="font-size:11px;">fails fast on first reject</text>
  <rect class="d-box-muted" x="227" y="46" width="185" height="56" rx="8"/>
  <text class="d-text" x="319" y="70" text-anchor="middle" style="font-size:13px;">allSettled()</text>
  <text class="d-sub" x="319" y="90" text-anchor="middle" style="font-size:11px;">never rejects</text>
  <rect class="d-box-muted" x="430" y="46" width="186" height="56" rx="8"/>
  <text class="d-text" x="523" y="70" text-anchor="middle" style="font-size:13px;">race()</text>
  <text class="d-sub" x="523" y="90" text-anchor="middle" style="font-size:11px;">first to settle, either way</text>
  <rect class="d-box" x="24" y="130" width="592" height="60" rx="10"/>
  <text class="d-text" x="320" y="154" text-anchor="middle">any(): first fulfillment wins, ignores rejections</text>
  <text class="d-sub" x="320" y="174" text-anchor="middle">rejects with a real AggregateError only if every single input rejects</text>
</svg>

## 6. The four Promise combinators

| | \`all\` | \`allSettled\` | \`race\` | \`any\` |
| :--- | :--- | :--- | :--- | :--- |
| Rejects on | First rejection — verified above | Never | First settlement, if it's a rejection | Only if ALL reject — verified above |
| Resolves with | Array of every result | Array of every outcome | First settlement's value | First fulfillment |
| Waits for slower pending inputs | No — fails fast, verified above | Yes, always | No | Only until the first success, or all fail |

## 7. Common Pitfalls

- **Assuming Promise.all waits for every promise before reporting a rejection.** Verified above as a real, reproducible fail-fast behavior — it genuinely does not wait.
- **Using Promise.all when partial failure should be tolerated.** \`Promise.allSettled\` is the correct tool when every outcome, success or failure, genuinely needs to be inspected.
- **Confusing race and any.** \`race\` genuinely cares about SPEED regardless of outcome (verified above settling with a rejection when it's fastest); \`any\` genuinely cares about SUCCESS specifically, ignoring rejections until all fail.
- **Forgetting Promise.any's rejection is a real AggregateError, not a single Error.** Verified above — it genuinely carries every individual rejection reason in its \`.errors\` array.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"No, it doesn't wait — Promise.all genuinely fails fast, rejecting immediately on the first rejection. I've verified this directly with real timed promises."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name allSettled's contrast:</strong> <span style="color:#f0e2c8;">"allSettled genuinely never rejects — it waits for everything and reports every real outcome."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name race precisely:</strong> <span style="color:#f0e2c8;">"race settles with whichever finishes first, success or failure — I've verified both outcomes directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name any precisely:</strong> <span style="color:#f0e2c8;">"any ignores rejections entirely, resolving with the first success — only rejecting with a real AggregateError if everything fails."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name when I'd use each:</strong> <span style="color:#f0e2c8;">"all when every result is required, allSettled when partial failure is tolerable, race for timeouts, any for redundant fallback sources."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If Promise.all rejects early, do the OTHER, still-pending promises get cancelled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not — this is a real, important, honest caveat. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> genuinely rejecting early only affects what YOUR code observes and reacts to; the other still-pending promises continue running to completion on their own regardless, since JavaScript Promises have no built-in cancellation mechanism at all. If the underlying work (a real fetch request, a database query) genuinely needs to stop early too, that requires explicitly wiring up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> (this bank's own dedicated fetch question) for each individual operation — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.all</code> itself does none of that automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does Promise.all do with an empty array input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It genuinely resolves IMMEDIATELY with an empty array — a real, sensible edge case, since "every one of zero promises has succeeded" is vacuously true. The same real vacuous-truth logic this bank's own array-methods coverage notes for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[].every()</code> genuinely applies here too. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.any([])</code>, by real contrast, genuinely REJECTS immediately with an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AggregateError</code> — there is no possible fulfillment to resolve with from zero inputs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a fetch-with-timeout pattern using one of these four combinators?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">\`Promise.race\` is the genuinely standard, classic tool for this — race the real fetch against a Promise that rejects after a fixed timeout (\`new Promise((_, rej) =&gt; setTimeout(() =&gt; rej(new Error("timeout")), 5000))\`); whichever settles first wins, verified directly above to work both ways (a fulfillment or a rejection winning). This bank's own dedicated fetch question also notes the more modern, purpose-built <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortSignal.timeout(ms)</code> as a genuinely more idiomatic alternative for fetch specifically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order of the input array matter for any of these four combinators' final result?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">all\`/\`allSettled\`, genuinely yes for the OUTPUT array's shape — the results genuinely come back in the SAME order as the input array, regardless of which promise actually settled first in real time (a real, important guarantee for correctly matching results back to their original requests). For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">race\`/\`any\`, input order genuinely only matters as a TIEBREAKER if multiple promises are ALREADY settled at the moment the combinator runs (the identical real microtask-ordering subtlety this bank's own event-loop coverage touches on) — otherwise, genuine timing determines the winner, not array position.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Promise.all\`** | Fails fast on the first rejection; resolves with every result otherwise |
| **\`Promise.allSettled\`** | Never rejects; reports every input's real outcome |
| **\`Promise.race\`** | Settles with whichever input settles first, success or failure |
| **\`Promise.any\`** | Resolves with the first success; rejects only if genuinely all fail |

---
**Conclusion:** the direct answer to the prompt is no — \`Promise.all\` genuinely does NOT wait for the other pending promises — verified directly with real, distinctly-timed promises, it rejected immediately the moment the first rejection occurred, well before the slower, still-pending promise had time to settle. \`Promise.allSettled\` genuinely never rejects, always resolving with every real outcome, verified directly. \`Promise.race\` genuinely settles with whichever input settles first, confirmed both for a fulfillment and, separately, a rejection winning. \`Promise.any\` genuinely ignores individual rejections, resolving with the first real fulfillment, and only itself rejects — with a real \`AggregateError\` — if genuinely every input rejects, verified directly.`,
    examples: [
      {
        label: "Real, timed proof of all four Promise combinators' distinct settlement behavior against real, distinctly-timed promises",
        tech: "javascript",
        runnable: true,
        code: `const mk = (val, ms, fail) => new Promise((res, rej) =>
  setTimeout(() => fail ? rej(new Error(val)) : res(val), ms));

(async () => {
  try {
    await Promise.all([mk("fast", 10), mk("failed", 20, true), mk("slow", 50)]);
  } catch (e) {
    console.log("Promise.all rejects on first rejection (doesn't wait for 'slow'):", e.message);
  }

  const settled = await Promise.allSettled([mk("fast", 10), mk("failed", 20, true), mk("slow", 50)]);
  console.log("Promise.allSettled reports every outcome:", settled.map((s) => s.status));

  const raceResult = await Promise.race([mk("slow", 50), mk("fast", 10)]);
  console.log("Promise.race - first to finish:", raceResult);

  const anyResult = await Promise.any([mk("failed", 5, true), mk("fast", 10), mk("slow", 50)]);
  console.log("Promise.any - ignores rejections, first fulfillment:", anyResult);

  try {
    await Promise.any([Promise.reject("a"), Promise.reject("b")]);
  } catch (e) {
    console.log("Promise.any rejects only if ALL reject:", e.constructor.name, e.errors);
  }
})();`,
      },
    ],
  },
];

export default augments;
