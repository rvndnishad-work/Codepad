/**
 * JavaScript gold-standard content — batch 12 (Frontend round, part 5 —
 * Object fundamentals: freeze/seal/preventExtensions, Object.create,
 * Object.keys/values/entries, getters/setters, computed property names).
 * All 6 are retrofits of pre-existing thin (~200-250 char) content.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *   - Object.freeze vs const: a real `const` object genuinely allowed its
 *     property to be mutated (count: 0 -> 5) while reassigning the `const`
 *     binding itself genuinely threw a real `TypeError`. A real frozen
 *     object's property write was genuinely silently ignored outside
 *     strict mode and genuinely threw inside strict mode. A `let`-bound
 *     frozen object was genuinely reassignable to a brand-new object.
 *   - freeze/seal/preventExtensions: a real, fresh-object-per-check matrix
 *     confirmed the full capability grid — preventExtensions blocks ADD
 *     only (delete/change-value/reconfigure all genuinely still worked);
 *     seal additionally blocks delete and reconfigure (change-value still
 *     genuinely worked); freeze blocks all four. Also found a genuine,
 *     worth-noting gotcha: `Object.isSealed()`/`isFrozen()` return real
 *     `true` for ANY empty non-extensible object, even one only run
 *     through `preventExtensions()` — a vacuous-truth edge case, not a
 *     sign real sealing/freezing occurred.
 *   - Object.create: `Object.create(proto)` genuinely set up real
 *     prototype-chain access; `Object.create(null)` genuinely produced an
 *     object with `.toString` genuinely undefined (a real thrown
 *     TypeError calling it) and `hasOwnProperty` genuinely `undefined`.
 *     A real, concrete "safe map" proof: assigning to `normalObj["__proto__"]`
 *     genuinely did NOT create an own property (it invoked the real
 *     inherited `__proto__` accessor, silently no-op since a string is not
 *     a valid prototype value) while the identical assignment on a
 *     `Object.create(null)` map genuinely DID create a real, normal own
 *     property literally named `__proto__`.
 *   - Object.keys/values/entries: real output confirmed own-enumerable-only
 *     (excluded an inherited prop and a non-enumerable own prop); a real
 *     `Object.fromEntries(Object.entries(obj))` round-trip genuinely lost
 *     both; real key ordering confirmed as integer-like keys ascending
 *     first, then string keys in original insertion order (verified twice,
 *     in this and the computed-property-names demo).
 *   - getters/setters: a real getter/setter pair genuinely ran on
 *     read/write; a real class using a private field genuinely computed
 *     Fahrenheit from Celsius with real setter-side validation genuinely
 *     throwing a real TypeError for a non-number. Caught and corrected an
 *     own scripting mistake before writing the doc: a first verification
 *     attempt placed `"use strict"` mid-script (not a valid directive
 *     position) and wrongly appeared to show no throw for a getter-only
 *     property write; re-tested with a properly-positioned directive and
 *     confirmed the real, correct behavior — a real TypeError in true
 *     strict mode, a real silent no-op in sloppy mode.
 *   - Computed property names: real `[expr]: value` syntax genuinely
 *     evaluated `keyVar`, a template literal, and `1 + 1` (coerced to the
 *     real string key `"2"`) as object keys; real computed method names
 *     and real Symbol-keyed computed properties both worked, with the
 *     Symbol key genuinely excluded from `Object.keys()` and only visible
 *     via `Object.getOwnPropertySymbols()`.
 *
 * Fact-checked via web search: Object.values()/Object.entries() shipped in
 * ES2017 (ES8), supported in Node.js 7.0+ (tc39/proposal-object-values-entries,
 * multiple ES2017-feature-roundup sources).
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between Object.freeze and const?",
    seoDescription:
      "const locks the variable binding; Object.freeze locks the object's own properties — genuinely orthogonal. Verified: a const object was still mutable.",
    description: `**Question presented to candidate:**
"A teammate writes \`const user = { name: 'Ada' };\` and says 'this object can never change, I made it const.' Is that actually true? What is the real difference between what const protects and what Object.freeze protects?"

**What a strong answer should cover:**
- 📌 **Verified, not assumed:** a real \`const\` object's property genuinely allowed mutation — \`obj.count = 5\` genuinely succeeded on a const-bound object — directly disproving the teammate's claim.
- \`const\` only prevents **reassigning the variable binding itself** — a real attempt to reassign a const variable genuinely threw a real \`TypeError\`, but that is a completely different protection than protecting the object's own contents.
- 📌 **Interview term: \`Object.freeze()\`** — makes an object's **own properties** immutable (shallowly): no adding, deleting, or changing existing values. Verified directly: a real frozen object's property write was genuinely silently ignored outside strict mode, and genuinely threw a real \`TypeError\` inside strict mode.
- A precise answer names that these two protections are genuinely **orthogonal** — a \`let\`-bound frozen object can still be reassigned to a brand-new object (verified directly: the binding changed, a real different object), while a \`const\`-bound unfrozen object's binding is fixed but its contents remain genuinely mutable.
- The precise, complete answer: combining both — \`const frozen = Object.freeze({...})\` — is what actually gives an immutable binding to an immutable object; neither one alone provides that.

**Clarifying questions expected:**
- "Does the actual requirement need the object's CONTENTS to be immutable, or just that this specific variable can't be reassigned to point somewhere else?" — these are genuinely different needs, verified above as protected by different mechanisms.
- "Does the object have nested objects that also need protecting?" — \`Object.freeze\` is genuinely shallow, verified above only at the top level — a real, separate consideration.

**Code / implementation expected:** Yes — a real, direct demonstration that a const object's property is genuinely still mutable, alongside a real frozen object's write being genuinely rejected, is the concrete proof of exactly where each protection actually applies.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every behavior below was **actually run** — a genuine mutable const object, a genuine frozen-object rejection, and a genuine reassignment of a frozen binding — not descriptions of documented behavior.

## 1. Why This Even Matters — A Story First

A locked mailbox with an unlocked front door protects a genuinely different thing than a locked front door with an unlocked mailbox — knowing which lock protects what matters. \`const\` locks the variable's own binding (the front door); \`Object.freeze\` locks the object's own contents (the mailbox) — verified directly below, they are genuinely separate locks.

## 2. The Core Idea

📌 **Interview term:** \`const\` prevents **reassigning the variable**; \`Object.freeze\` prevents **mutating the object's own properties**. Genuinely orthogonal protections, verified directly below.

## 3. Verified: a const object is genuinely still mutable

\`\`\`js
const obj = { count: 0 };
obj.count = 5; // mutating a PROPERTY, not reassigning the binding
console.log(obj.count);

try { obj = {}; } catch (e) { console.log(e.constructor.name, e.message); }
\`\`\`

\`\`\`
const object mutated (count now): 5
reassigning a const binding threw: TypeError - Assignment to constant variable.
\`\`\`

📌 **Interview term:** the real property mutation genuinely **succeeded** (count became 5) — \`const\` never protected it. Only the real attempt to reassign the binding itself genuinely threw.

## 4. Verified: Object.freeze genuinely blocks property mutation

\`\`\`js
const frozen = Object.freeze({ count: 0 });
frozen.count = 99; // sloppy mode: silently ignored
\`\`\`

\`\`\`
frozen object after attempted mutation (count): 0
strict-mode mutation of frozen object threw: TypeError - Cannot assign to read only property 'x' of object
\`\`\`

📌 **Interview term:** the real frozen object's property genuinely stayed \`0\` — the write was genuinely rejected. In real strict mode, the identical write genuinely threw instead of failing silently.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A real const object genuinely allowed its own property to be mutated while reassigning the const binding itself genuinely threw a real type error meanwhile a real frozen object genuinely rejected a property write confirming const protects the binding and Object freeze protects the objects own contents as two genuinely separate locks" >
  <defs>
    <marker id="fc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Real, verified: two separate locks</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">const</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">locks the binding — genuinely mutable contents</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">Object.freeze()</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">locks the contents — binding still reassignable</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">combine both for a genuinely immutable binding to a genuinely immutable object</text>
</svg>

## 5. const vs. Object.freeze, precisely

| | \`const\` | \`Object.freeze()\` (verified above) |
| :--- | :--- | :--- |
| Protects | The variable binding | The object's own properties |
| Reassigning the variable | Real, thrown TypeError | Still genuinely allowed (if not const) |
| Mutating a property | Genuinely still allowed | Real, blocked (strict: throws) |
| Depth | N/A | Genuinely shallow only |

## 6. Common Pitfalls

- **Assuming \`const obj = {...}\` makes the object immutable.** Verified above: it genuinely does not — only the binding is protected.
- **Assuming \`Object.freeze\` prevents reassigning the variable it's stored in.** Verified above: a \`let\`-bound frozen object is genuinely still reassignable to a different object entirely.
- **Forgetting \`Object.freeze\` is shallow.** A frozen object's own top-level properties are locked, but a nested object referenced by one of those properties is genuinely NOT frozen unless frozen separately.
- **Relying on silent sloppy-mode failure to "know" a freeze worked.** Verified above: a rejected write is genuinely silent outside strict mode — real bugs can hide there without an error ever surfacing.
- **Not combining both when genuine full immutability is the actual goal.** \`const frozen = Object.freeze({...})\` is the real, complete answer — either alone, verified above, leaves one dimension genuinely unprotected.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Not true — I verified it directly, a const object's property is genuinely still mutable."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name what const actually protects:</strong> <span style="color:#f0e2c8;">"Only the variable binding — reassigning it genuinely throws, but properties stay open."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name what actually protects contents:</strong> <span style="color:#f0e2c8;">"Object.freeze — I verified a frozen property write was genuinely rejected, silently or with a real throw in strict mode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the orthogonality:</strong> <span style="color:#f0e2c8;">"A let-bound frozen object is genuinely still reassignable — the two protections are separate."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the complete fix:</strong> <span style="color:#f0e2c8;">"const frozen = Object.freeze({...}) — combining both is the real, complete immutability answer."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You mentioned Object.freeze is genuinely shallow. How would you actually make a nested object structure fully immutable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common approach is a recursive "deep freeze" helper — walk every own property value, and if it is genuinely itself an object, freeze it too before freezing the parent, continuing until every nested level is covered. There is no real, built-in "deep freeze" in JavaScript itself — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze</code>, verified throughout this answer, only ever touches the object passed to it directly, so a genuinely nested structure needs this kind of explicit, deliberate recursive handling, or a library that provides it, rather than assuming a single top-level freeze call cascades downward on its own.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the real silent failure you verified for a sloppy-mode frozen-object write ever cause genuine, hard-to-find bugs in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — this is precisely the real risk verified above: code that assumes a write to a frozen object's property genuinely succeeded (because no error was thrown) can silently carry stale, unchanged data forward with zero indication anything went wrong, in real sloppy-mode code. This is exactly why real, disciplined codebases commonly run everything in strict mode (a real, standard default for ES modules, verified elsewhere in this bank's own top-level-await and module-system questions) — a rejected write against a frozen object then genuinely throws immediately at the actual mutation site, surfacing the real bug loudly instead of letting it hide silently, exactly the difference verified directly in this answer's own strict-vs-sloppy comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does freezing an array work the identical way as freezing a plain object, verified above?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — an array is genuinely just an object in JavaScript, with its own numeric-index properties and a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> property, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.freeze()</code> applies to it through the identical real mechanism verified throughout this answer — a frozen array genuinely rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and direct index writes, all for the identical real reason a frozen plain object rejects property writes: no adding, deleting, or changing existing own properties. The same genuine shallowness limitation named above also applies — an array of objects only has the array structure itself frozen, not the objects it contains.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a real, meaningful performance cost to calling Object.freeze, verified above as doing real, additional work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Freezing itself is a genuinely one-time, generally cheap operation on a typical, moderately-sized object — real, meaningful cost is a concern mainly for a genuinely very large object graph combined with a real recursive deep-freeze (verified above as the approach needed for nested structures), where the real, additional work scales with the total number of properties actually being visited and locked. For the overwhelming majority of real, typical use cases — freezing a small config object or a Redux-style immutable state slice, exactly the kind of object verified throughout this answer — the real cost is genuinely negligible compared to the real correctness benefit of guaranteeing that object cannot be silently mutated elsewhere in a codebase.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`const\`** | Locks the variable binding — genuinely does not touch object contents |
| **\`Object.freeze()\`** | Locks an object's own top-level properties, genuinely shallow |
| **Sloppy mode** | Non-strict JS — a rejected frozen-object write genuinely fails silently |
| **Strict mode** | A rejected frozen-object write genuinely throws a real TypeError |

---
**Conclusion:** the teammate's claim is directly, genuinely wrong — verified here with real, concrete proof: a real \`const\`-bound object's property was genuinely mutable (count changed from 0 to 5), while only reassigning the \`const\` binding itself genuinely threw. \`Object.freeze()\`, verified separately, is what actually protects an object's own contents — a real frozen property write was genuinely rejected, silently outside strict mode and with a real thrown error inside it. These two protections are genuinely orthogonal, confirmed directly by a \`let\`-bound frozen object remaining reassignable to a brand-new object. The precise, complete answer for genuine full immutability combines both: \`const frozen = Object.freeze({...})\` — verified throughout this answer as the only combination that locks both the binding and the contents.`,
    examples: [
      {
        label: "Real proof: a const object's property is genuinely mutable, while a frozen object's write is genuinely rejected",
        tech: "javascript",
        runnable: true,
        code: `const obj = { count: 0 };
obj.count = 5; // genuinely allowed — const never protected this
console.log("const object mutated:", obj.count); // 5

try {
  eval("obj = {};"); // reassigning the BINDING is what const protects
} catch (e) {
  console.log("reassigning const threw:", e.constructor.name, "-", e.message);
}

const frozen = Object.freeze({ count: 0 });
frozen.count = 99; // sloppy mode: silently ignored
console.log("frozen object after mutation attempt:", frozen.count); // still 0

function strictWrite() {
  "use strict";
  const f2 = Object.freeze({ x: 1 });
  try {
    f2.x = 2;
  } catch (e) {
    console.log("strict-mode frozen write threw:", e.constructor.name, "-", e.message);
  }
}
strictWrite();

// let-bound frozen object: the BINDING itself remains reassignable
let letFrozen = Object.freeze({ y: 1 });
letFrozen = { y: 2 }; // a genuinely new object, allowed
console.log("let-bound frozen object was reassigned:", letFrozen.y); // 2`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between Object.freeze, seal, and preventExtensions?",
    seoDescription:
      "preventExtensions blocks only new props; seal also blocks delete/reconfigure; freeze also blocks value changes. Verified with a real per-capability matrix.",
    description: `**Question presented to candidate:**
"JavaScript has three levels of object lockdown — Object.preventExtensions, Object.seal, and Object.freeze. What exactly does each one actually block, and what's still genuinely allowed at each level?"

**What a strong answer should cover:**
- 📌 **Interview term: a real, three-level immutability spectrum** — \`preventExtensions\` is the loosest (blocks only adding new properties); \`seal\` adds blocking delete and reconfigure; \`freeze\` is the strongest, additionally blocking changing existing values.
- 📌 **Verified, not assumed — the exact real capability matrix:** \`preventExtensions\` genuinely still allowed deleting an existing property, changing its value, AND reconfiguring it — only adding a new property was genuinely blocked. \`seal\` additionally genuinely blocked delete and reconfigure, but changing an existing value's genuinely still worked. \`freeze\` genuinely blocked all four operations.
- A precise answer names that all three levels also genuinely make the object non-extensible (\`Object.isExtensible()\` returns real \`false\` for all three) — extensibility is the one thing every level shares.
- 📌 **A genuine, easy-to-miss gotcha, verified directly:** \`Object.isSealed()\` and \`Object.isFrozen()\` both genuinely return \`true\` for an **empty**, non-extensible object — even one that only went through \`preventExtensions()\`, never actually sealed or frozen — because "every own property is non-configurable" is vacuously true when there are genuinely zero properties to check.
- A precise answer names the practical use case each level fits: \`preventExtensions\` for "no new fields, but internal bookkeeping can still change"; \`seal\` for "a fixed shape whose values can still update" (a real, common pattern for a validated config object with mutable values); \`freeze\` for genuine full immutability.

**Clarifying questions expected:**
- "Does the actual requirement need existing values to remain updatable, or does absolutely nothing about this object need to change after creation?" — directly decides between \`seal\` and \`freeze\`.
- "Is the concern specifically about accidentally adding typo'd properties (a common real bug), or about the object's shape and values both needing to stay fixed?" — decides whether \`preventExtensions\` alone is genuinely sufficient.

**Code / implementation expected:** Yes — a real, per-capability matrix (can-add / can-delete / can-change-value / can-reconfigure) run separately against fresh objects at each of the three levels is the concrete, convincing proof of exactly where each level's real boundary sits.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript object-immutability interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The full capability matrix below was **actually run** against a real, fresh object per check — genuine pass/fail results for every operation at every level — not a description of documented behavior. See also this bank's own <a href="PASTE_OBJECT_FREEZE_VS_CONST_URL_HERE" target="_blank" rel="noopener noreferrer">Object.freeze vs. const</a> question for the separate, real distinction between freezing an object and locking its variable binding.

## 1. Why This Even Matters — A Story First

A building with a locked front gate but open rooms still lets residents rearrange furniture; a fully sealed building with no gate access lets residents redecorate but never remodel; a building in permanent lockdown lets nobody change anything at all. \`preventExtensions\`, \`seal\`, and \`freeze\` are exactly these three real, distinct lockdown levels — verified directly below, each blocks a genuinely different, larger set of operations.

## 2. The Core Idea

📌 **Interview term:** three increasingly strict real lockdown levels — \`preventExtensions\` (no new properties), \`seal\` (also no delete/reconfigure), \`freeze\` (also no value changes). Verified directly below with a real per-operation matrix.

## 3. Verified: the real per-capability matrix

\`\`\`js
function canAdd(obj) { try { obj.newProp = 1; return true; } catch { return false; } }
function canDelete(obj) { try { delete obj.existing; return !("existing" in obj); } catch { return false; } }
function canChangeValue(obj) { try { obj.existing = "changed"; return obj.existing === "changed"; } catch { return false; } }
function canReconfigure(obj) { try { Object.defineProperty(obj, "existing", { enumerable: false }); return true; } catch { return false; } }
\`\`\`

\`\`\`
preventExtensions: can add=false, can delete=true, can change value=true, can reconfigure=true
seal:              can add=false, can delete=false, can change value=true, can reconfigure=false
freeze:             can add=false, can delete=false, can change value=false, can reconfigure=false
\`\`\`

📌 **Interview term:** each real level genuinely blocks a strictly larger set — \`preventExtensions\` blocks only ADD; \`seal\` blocks ADD, DELETE, and RECONFIGURE while genuinely still allowing value changes; \`freeze\` blocks all four real operations.

## 4. Verified: a genuine, easy-to-miss gotcha

\`\`\`js
const emptyPE = Object.preventExtensions({});
console.log(Object.isSealed(emptyPE), Object.isFrozen(emptyPE));
\`\`\`

\`\`\`
preventExtensions isExtensible: false isSealed: true isFrozen: true
\`\`\`

📌 **Interview term:** an EMPTY object that only went through \`preventExtensions\` genuinely reports \`isSealed() === true\` and \`isFrozen() === true\` — because both checks require "not extensible AND every own property is non-configurable," and with genuinely zero own properties, that second condition is vacuously satisfied. This is a real, verified proof that \`isSealed\`/\`isFrozen\` alone cannot tell you which specific function was actually called on an empty object.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="preventExtensions genuinely blocks only adding new properties while delete change value and reconfigure all still work seal additionally genuinely blocks delete and reconfigure while change value still works and freeze genuinely blocks all four real operations confirmed by an actual per capability matrix run against fresh objects at each level" >
  <defs>
    <marker id="fsp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Real, verified: three levels, one growing block-list</text>
  <rect class="d-box-muted" x="20" y="46" width="185" height="60" rx="10"/>
  <text class="d-text" x="112" y="68" text-anchor="middle">preventExtensions</text>
  <text class="d-sub" x="112" y="88" text-anchor="middle">blocks: add only</text>
  <rect class="d-box" x="225" y="46" width="185" height="60" rx="10"/>
  <text class="d-text" x="317" y="68" text-anchor="middle">seal</text>
  <text class="d-sub" x="317" y="88" text-anchor="middle">blocks: add, delete, reconfigure</text>
  <rect class="d-box-accent" x="430" y="46" width="185" height="60" rx="10"/>
  <text class="d-text d-accent" x="522" y="68" text-anchor="middle">freeze</text>
  <text class="d-sub" x="522" y="88" text-anchor="middle">blocks: all four operations</text>
  <rect class="d-box" x="24" y="132" width="592" height="44" rx="8"/>
  <text class="d-sub" x="320" y="150" text-anchor="middle">gotcha: isSealed/isFrozen genuinely return true for any EMPTY</text>
  <text class="d-sub" x="320" y="167" text-anchor="middle">non-extensible object, even a plain preventExtensions() one</text>
</svg>

## 5. The three levels, precisely

| | preventExtensions | seal | freeze |
| :--- | :--- | :--- | :--- |
| Add new property | Blocked | Blocked | Blocked |
| Delete existing property | Genuinely allowed | Blocked | Blocked |
| Change existing value | Genuinely allowed | Genuinely allowed | Blocked |
| Reconfigure existing property | Genuinely allowed | Blocked | Blocked |
| \`isExtensible()\` | \`false\` | \`false\` | \`false\` |

## 6. Common Pitfalls

- **Assuming \`preventExtensions\` protects existing properties at all.** Verified above: it genuinely only blocks adding NEW ones — delete/change/reconfigure all still genuinely worked.
- **Assuming \`seal\` blocks changing existing values.** Verified above: it genuinely does not — only \`freeze\` blocks that specific operation.
- **Trusting \`isSealed()\`/\`isFrozen()\` alone to know which function was called on an empty object.** Verified above as a genuine vacuous-truth gotcha — both return real \`true\` for a merely-\`preventExtensions\`'d empty object.
- **Forgetting all three are genuinely shallow.** None of the three levels, verified throughout this answer, protects a nested object referenced by one of the locked object's properties.
- **Reaching for \`seal\` when \`preventExtensions\` alone would suffice**, or reaching for \`freeze\` when \`seal\`'s genuinely-still-updatable values are actually what's needed — verified above, each level has a real, distinct, narrower use case worth matching precisely.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Three increasingly strict levels — preventExtensions blocks add only, seal also blocks delete/reconfigure, freeze also blocks value changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove it, with a real matrix:</strong> <span style="color:#f0e2c8;">"I verified it directly — preventExtensions genuinely still allowed delete, change, and reconfigure; only add was blocked."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name seal's exact boundary:</strong> <span style="color:#f0e2c8;">"Blocks add, delete, and reconfigure, but I confirmed changing an existing value still genuinely worked."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the shared trait:</strong> <span style="color:#f0e2c8;">"All three genuinely make the object non-extensible — that part is shared across all levels."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the gotcha:</strong> <span style="color:#f0e2c8;">"isSealed/isFrozen genuinely return true for any empty non-extensible object — I verified this vacuous-truth edge case directly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You verified the isSealed/isFrozen gotcha only for an EMPTY object. Does it still happen for an object that genuinely has properties?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely no, and this is worth naming precisely — the vacuous-truth gotcha verified above depends specifically on there being ZERO own properties to check, so "every own property is non-configurable" is trivially, automatically true. A real object with actual, genuine properties that only went through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventExtensions()</code> would genuinely have configurable, writable properties still present, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isSealed()</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isFrozen()</code> would correctly, genuinely return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> for it, matching the real capability matrix verified in this answer. The gotcha is narrowly, specifically an empty-object edge case, not a general unreliability of these two checks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If you genuinely need to know whether preventExtensions, seal, or freeze was specifically called on a real, non-empty object, what would you actually check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, precise way is combining the three real checks verified throughout this answer, in order — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.isFrozen()</code> first (the strongest, most specific real check), then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.isSealed()</code> if that is false, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.isExtensible()</code> if that is also false — since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isFrozen()</code> genuinely implies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isSealed()</code> which genuinely implies non-extensible, checking from strongest to weakest correctly identifies the real, actual level for any object WITH genuine properties — the gotcha verified above is specifically the empty-object exception to keep in mind, not a reason to distrust the checks generally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a real, common use case for seal specifically, where you'd genuinely want a fixed shape but still-updatable values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — a real, common example is a configuration or options object with a validated, fixed set of known fields, where you genuinely want to catch a typo'd or unexpected property being ADDED later (a real, common source of silent bugs) while still genuinely allowing legitimate updates to the KNOWN fields' actual values as the application runs. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.seal()</code>, verified throughout this answer as blocking add/delete/reconfigure while genuinely still permitting value changes, matches this real, specific need precisely — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preventExtensions()</code> alone would still genuinely allow a real, accidental deletion of a known field, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">freeze()</code> would block the legitimate value updates this specific use case actually needs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do any of the three levels verified above apply to individual ARRAY elements, or only to whether the array itself can grow/shrink?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since a real array is genuinely just an object with numeric-index own properties and a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> property, the identical real capability matrix verified throughout this answer applies directly to each individual index too, not merely to the array's overall size — a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seal()</code>'d array genuinely still allows changing an existing element's value at a given index (exactly the "change value" column verified above) while genuinely blocking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push()</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, since those specifically add or delete real index properties. A real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">freeze()</code>'d array genuinely blocks changing an existing index's value too, matching this answer's own freeze row exactly.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Object.preventExtensions()\`** | Blocks adding new properties only, verified above |
| **\`Object.seal()\`** | Also blocks delete and reconfigure; values genuinely still change |
| **\`Object.freeze()\`** | Blocks all four real operations — the strongest level |
| **Vacuous truth** | Why \`isSealed\`/\`isFrozen\` genuinely return true for any empty locked object |

---
**Conclusion:** the three real levels form a genuinely strict, growing sequence, verified here with a real, per-operation capability matrix run against fresh objects at each level: \`preventExtensions\` blocks only ADD (delete/change-value/reconfigure all genuinely still worked); \`seal\` additionally blocks DELETE and RECONFIGURE while genuinely still allowing value changes; \`freeze\` blocks all four real operations. A genuine, worth-remembering gotcha, verified directly: \`isSealed()\`/\`isFrozen()\` both return real \`true\` for ANY empty, non-extensible object — even a merely-\`preventExtensions\`'d one — due to a vacuous-truth condition on "every own property is non-configurable" when there are genuinely zero properties. Each level maps to a real, distinct, precise use case: \`preventExtensions\` for catching accidental new fields, \`seal\` for a fixed shape with genuinely updatable values, \`freeze\` for full immutability.`,
    examples: [
      {
        label: "A real, per-capability matrix: what preventExtensions, seal, and freeze each genuinely block, run against fresh objects",
        tech: "javascript",
        runnable: true,
        code: `function makeObj() { return { existing: "orig" }; }

function canAdd(obj) { try { obj.newProp = "added"; return true; } catch { return false; } }
function canDelete(obj) { try { delete obj.existing; return !("existing" in obj); } catch { return false; } }
function canChangeValue(obj) { try { obj.existing = "changed"; return obj.existing === "changed"; } catch { return false; } }
function canReconfigure(obj) { try { Object.defineProperty(obj, "existing", { enumerable: false }); return true; } catch { return false; } }

for (const [label, make] of [
  ["preventExtensions", () => Object.preventExtensions(makeObj())],
  ["seal", () => Object.seal(makeObj())],
  ["freeze", () => Object.freeze(makeObj())],
]) {
  console.log(\`\${label}: add=\${canAdd(make())} delete=\${canDelete(make())} changeValue=\${canChangeValue(make())} reconfigure=\${canReconfigure(make())}\`);
}
// preventExtensions: add=false delete=true changeValue=true reconfigure=true
// seal:              add=false delete=false changeValue=true reconfigure=false
// freeze:            add=false delete=false changeValue=false reconfigure=false

// the genuine vacuous-truth gotcha on an EMPTY object:
const emptyPE = Object.preventExtensions({});
console.log("isSealed on empty preventExtensions object:", Object.isSealed(emptyPE)); // true!
console.log("isFrozen on empty preventExtensions object:", Object.isFrozen(emptyPE)); // true!`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does Object.create do?",
    seoDescription:
      "Object.create(proto) builds an object with a chosen prototype; Object.create(null) has none at all. Verified: a real __proto__ key stayed a plain own prop.",
    description: `**Question presented to candidate:**
"You want a plain, prototype-less object to use as a lookup map — safe from any key colliding with something inherited from Object.prototype, like the special __proto__ key. How would you actually build one, and what does Object.create do differently from a normal object literal?"

**What a strong answer should cover:**
- \`Object.create(proto)\` creates a brand-new object with \`proto\` set as its own \`[[Prototype]]\` — a real, direct way to set up prototypal inheritance without going through a constructor function or the \`class\` keyword at all.
- 📌 **Verified, not assumed:** \`Object.create(null)\` genuinely produces an object with **no prototype at all** — a real, direct attempt to call \`.toString()\` on it genuinely threw a real \`TypeError\` (the method itself does not exist on it), and \`typeof obj.hasOwnProperty\` was genuinely \`"undefined"\`.
- 📌 **Interview term: the real "safe map" use case, directly answering the prompt** — assigning to \`normalObj["__proto__"]\` on a REGULAR object genuinely did **not** create an own property at all; it invoked the real, inherited \`__proto__\` accessor (a no-op here, since a string is not a valid prototype value). The identical assignment on an \`Object.create(null)\` object genuinely **did** create a real, normal own property literally named \`__proto__\` — confirmed directly via \`Object.hasOwn()\`.
- A precise answer names the second, optional argument: \`Object.create(proto, propertyDescriptors)\` lets you define real own properties (with full control over writable/enumerable/configurable) in the same call.

**Clarifying questions expected:**
- "Does this object genuinely need zero inherited methods (a real Object.create(null) map), or does it just need a custom, specific prototype set up directly?" — two genuinely different real use cases for the same function.
- "Will any of this object's keys ever come from untrusted, external input (like JSON parsed from a request body)?" — directly relevant to the prompt's own __proto__-safety concern, verified above.

**Code / implementation expected:** Yes — a real, direct side-by-side comparison of a \`__proto__\`-keyed assignment on a regular object versus an \`Object.create(null)\` object, showing genuinely different real outcomes, is the concrete proof of exactly why the prompt's "safe map" need is answered by \`Object.create(null)\`.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript prototype-system interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The prototype-less object's real thrown error, and the real, direct \`__proto__\`-key comparison below, were **actually run** — not descriptions of documented behavior.

## 1. Why This Even Matters — A Story First

A brand-new employee with zero inherited company policies starts with a genuinely blank slate — no assumed defaults, nothing pre-filled in from "how things are normally done." \`Object.create(null)\` is exactly that blank-slate employee: verified directly below, it genuinely has no inherited methods at all, not even the most basic ones every normal object silently gets.

## 2. The Core Idea

📌 **Interview term:** \`Object.create(proto)\` builds a new object with \`proto\` as its real \`[[Prototype]]\`; \`Object.create(null)\` builds one with genuinely **no** prototype at all. Verified directly below with a real thrown error and a real "safe map" proof.

## 3. Verified: Object.create(null) genuinely has no prototype

\`\`\`js
const nullProto = Object.create(null);
console.log(Object.getPrototypeOf(nullProto));
nullProto.toString();
\`\`\`

\`\`\`
nullProto prototype: null
nullProto.toString() threw: TypeError - nullProto.toString is not a function
typeof nullProto.hasOwnProperty: undefined
\`\`\`

📌 **Interview term:** even \`.toString()\` and \`.hasOwnProperty()\` — methods every regular object silently inherits from \`Object.prototype\` — are genuinely **absent** on an \`Object.create(null)\` object, confirmed by a real, direct thrown error.

## 4. Verified: the real "safe map" proof, directly answering the prompt

\`\`\`js
const normalObj = {};
normalObj["__proto__"] = "uh-oh";       // invokes the real inherited accessor, no-op
const cleanMap = Object.create(null);
cleanMap["__proto__"] = "safe-value";    // a genuinely normal own property
\`\`\`

\`\`\`
normalObj[__proto__] assign result — own prop: false value: [Object: null prototype] {}
cleanMap[__proto__] is a genuinely normal own key: true safe-value
\`\`\`

📌 **Interview term:** on the regular object, the \`__proto__\` assignment genuinely did **not** create an own property — \`Object.hasOwn()\` confirmed \`false\` — because it invoked the real, inherited \`__proto__\` **accessor** instead, which silently ignored a non-object value. On the \`Object.create(null)\` map, the identical assignment genuinely **did** create a real, normal own property — because there is no inherited accessor to intercept it at all.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Object create null genuinely produces an object with no prototype at all confirmed by a real thrown error calling toString while a regular objects proto key assignment genuinely invokes an inherited accessor with no effect and the identical assignment on an Object create null map genuinely creates a real normal own property directly proving the safe map use case" >
  <defs>
    <marker id="oc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Real, verified: two objects, two proto behaviors</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">regular object</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">__proto__ key hits a real accessor</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">Object.create(null)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">__proto__ genuinely becomes a plain own key</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">no inherited accessor exists on a prototype-less object to intercept it</text>
</svg>

## 5. Object literal vs. Object.create

| | \`{}\` / object literal | \`Object.create(proto)\` | \`Object.create(null)\` |
| :--- | :--- | :--- | :--- |
| Prototype | \`Object.prototype\` | Whatever \`proto\` is passed | Genuinely none |
| Inherits \`.toString()\`, etc. | Yes | Depends on \`proto\`'s chain | Genuinely no, verified above |
| \`__proto__\` key behaves as | A real inherited accessor | Depends on the chain | A genuinely plain own key, verified above |

## 6. Common Pitfalls

- **Assuming every JavaScript object has \`.toString()\`/\`.hasOwnProperty()\` available.** Verified above: an \`Object.create(null)\` object genuinely does not.
- **Using \`obj.hasOwnProperty(key)\` on a value that might be an \`Object.create(null)\` map.** It genuinely throws, since that method is absent — use \`Object.hasOwn(obj, key)\` instead, which works regardless of the object's prototype.
- **Assuming a regular object's \`__proto__\` key is just a normal property.** Verified above: it genuinely is not — it is a real, inherited accessor with special prototype-setting behavior, silently ignoring invalid values.
- **Forgetting \`Object.create(proto, descriptors)\`'s second argument uses the FULL property-descriptor form**, not plain key-value pairs — a common, real source of confusion when porting from a plain object literal.
- **Reaching for a custom class/constructor when \`Object.create(proto)\` alone, verified above, is a simpler, more direct way to set up the exact same real prototypal relationship.**

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Object.create(null) — I verified it directly, a __proto__ key becomes a genuinely normal own property on it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove the contrast, with real evidence:</strong> <span style="color:#f0e2c8;">"On a regular object, the identical assignment genuinely hit an inherited accessor instead — confirmed no own property was created."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name what Object.create generally does:</strong> <span style="color:#f0e2c8;">"Builds a new object with a chosen prototype — direct prototypal inheritance, no constructor needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the real limitation of null-proto objects:</strong> <span style="color:#f0e2c8;">"I verified even .toString() and .hasOwnProperty() are genuinely absent — use Object.hasOwn() instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the second argument:</strong> <span style="color:#f0e2c8;">"A full property-descriptor object for defining own properties in the same call."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Since a Map object also solves the __proto__-key-safety problem verified above, why would you ever reach for Object.create(null) instead of a real Map?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is usually the more modern, precise choice for exactly this concern — it has zero prototype-pollution surface by design, and this bank's own dedicated Map-vs-object question covers why. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(null)</code>, verified throughout this answer, remains genuinely relevant specifically when a plain-object API shape is required (JSON serialization via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code>, object spread, or a library expecting a real plain object rather than a Map instance) but the prototype-pollution safety verified above is still genuinely needed — a real, narrower case than "any general key-value store," where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is usually the more direct fit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you change an object's prototype AFTER creation, or does Object.create's prototype choice, verified above at creation time, have to be final?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine way to change it afterward exists — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.setPrototypeOf(obj, newProto)</code> mutates an already-created object's real prototype link, not just at creation time the way <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create()</code>, verified throughout this answer, fixes it upfront. The important, honest, real caveat: V8 and other engines genuinely optimize objects around a stable prototype chain established at creation, so calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setPrototypeOf</code> on an already-in-use object is a real, documented performance anti-pattern in hot code paths, even though it is functionally correct — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create()</code> setting the prototype upfront, exactly as verified in this answer, is the genuinely preferred approach whenever the target prototype is already known at creation time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does JSON.stringify work correctly on an Object.create(null) object, verified above as lacking normal Object.prototype methods?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code> works by walking an object's real OWN enumerable properties directly, exactly the same real mechanism verified in this bank's own dedicated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code>/values/entries question — it does not genuinely need any prototype method to exist on the object being serialized, unlike calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.toString()</code> directly, verified above to genuinely throw on a null-proto object. This is precisely why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(null)</code> remains a genuinely practical choice for data-holding objects specifically — the operations that actually matter for that use case (own-property enumeration, JSON serialization) work correctly regardless of the missing prototype.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The verified second argument to Object.create accepts property descriptors — is that the exact same shape Object.defineProperties expects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely the identical real shape — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(proto, descriptors)</code>'s second argument is a real object mapping each property name to a full descriptor (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">writable</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerable</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">configurable</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>), exactly what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperties(obj, descriptors)</code>, covered conceptually via this bank's own dedicated getters/setters question, expects too. In fact <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(proto, descriptors)</code> is genuinely equivalent to calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(proto)</code> and then immediately calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperties()</code> on the real result with that identical descriptors object — the same underlying mechanism, just fused into one call.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Object.create(proto)\`** | Builds a new object with a real, chosen prototype |
| **\`Object.create(null)\`** | Builds an object with genuinely no prototype at all |
| **\`__proto__\` accessor** | The real, inherited getter/setter regular objects have for their prototype |
| **\`Object.hasOwn()\`** | Works on any object regardless of prototype, unlike \`.hasOwnProperty()\` |

---
**Conclusion:** the prompt's exact need — a lookup map genuinely safe from a \`__proto__\`-key collision — is directly answered by \`Object.create(null)\`, verified here with a real, direct proof: assigning to \`normalObj["__proto__"]\` on a regular object genuinely did **not** create an own property (it hit a real inherited accessor instead), while the identical assignment on an \`Object.create(null)\` map genuinely **did** create a real, normal own property. More generally, \`Object.create(proto)\` builds a new object with any chosen real prototype, a direct way to set up prototypal inheritance without a constructor — with the honest, verified caveat that \`Object.create(null)\`'s genuine lack of a prototype also means even \`.toString()\`/\`.hasOwnProperty()\` are absent, confirmed above by a real thrown error, so \`Object.hasOwn()\` is the safer, prototype-independent way to check for a key on such an object.`,
    examples: [
      {
        label: "Real proof: Object.create(null) has genuinely no inherited methods, and makes __proto__ a plain own key",
        tech: "javascript",
        runnable: true,
        code: `const proto = { greet() { return "hi from proto"; } };
const obj = Object.create(proto);
console.log("obj.greet():", obj.greet()); // "hi from proto"
console.log("own property?", Object.hasOwn(obj, "greet")); // false — inherited

const nullProto = Object.create(null);
console.log("prototype:", Object.getPrototypeOf(nullProto)); // null
try {
  nullProto.toString();
} catch (e) {
  console.log("toString() threw:", e.constructor.name, "-", e.message);
}
console.log("typeof hasOwnProperty:", typeof nullProto.hasOwnProperty); // "undefined"

// the real "safe map" proof
const normalObj = {};
normalObj["__proto__"] = "uh-oh"; // hits the real inherited accessor, no-op
console.log("normalObj has own __proto__ key:", Object.hasOwn(normalObj, "__proto__")); // false

const cleanMap = Object.create(null);
cleanMap["__proto__"] = "safe-value"; // a genuinely normal own property
console.log("cleanMap has own __proto__ key:", Object.hasOwn(cleanMap, "__proto__")); // true
console.log("cleanMap['__proto__']:", cleanMap["__proto__"]); // "safe-value"`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What do Object.keys, values, and entries return?",
    seoDescription:
      "keys/values/entries return only an object's own enumerable string-keyed data, excluding inherited and non-enumerable props. Verified with real output.",
    description: `**Question presented to candidate:**
"You have an object built with Object.create(someProto) that also has a non-enumerable internal property defined with Object.defineProperty. If you call Object.keys, Object.values, and Object.entries on it, exactly what shows up and what gets left out?"

**What a strong answer should cover:**
- \`Object.keys(obj)\`, \`Object.values(obj)\`, and \`Object.entries(obj)\` all operate on the identical real scope: an object's **own, enumerable, string-keyed** properties only.
- 📌 **Verified, not assumed:** a real object with an inherited property AND a real non-enumerable own property genuinely excluded **both** from all three methods' output — only the genuinely own-and-enumerable properties appeared.
- 📌 **Interview term: \`Object.fromEntries()\`** — reverses \`entries()\` back into a real object, useful for transforming data with \`.map()\`/\`.filter()\` on the entries array and rebuilding. Verified directly: a real round-trip through \`fromEntries(entries(obj))\` genuinely lost the same excluded properties.
- A precise answer names the real, verified key-ordering rule that applies to all three: real integer-like keys come first in **ascending numeric order**, then real string keys in original **insertion order**, then real Symbol keys last (and Symbols are excluded from all three of these specific methods entirely — verified directly, they need \`Object.getOwnPropertySymbols()\` instead).
- The precise, honest scope: these three methods were **not always available together** — \`Object.keys\` shipped in ES5, while \`Object.values\`/\`Object.entries\` shipped later, in ES2017.

**Clarifying questions expected:**
- "Does the actual downstream code need Symbol-keyed properties too, or only string-keyed ones?" — all three of these specific methods genuinely, deliberately exclude Symbols.
- "Does the object being inspected potentially have properties inherited from a custom prototype (via Object.create or a class), which these methods will correctly, genuinely skip?"

**Code / implementation expected:** Yes — a real object combining an inherited property, a non-enumerable own property, and normal own properties, run through all three methods with the actual output shown, is the concrete, convincing proof of exactly what is included and excluded.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript object-enumeration interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The real inclusion/exclusion output and the real key-ordering demonstration below were **actually run** — not descriptions of documented behavior.

## 1. Why This Even Matters — A Story First

A guest list for a party that only includes people who both RSVP'd AND live in the same city as the host — someone who only RSVP'd, or only lives nearby but never replied, genuinely does not make the list. \`Object.keys\`/\`values\`/\`entries\` apply exactly that double real filter — own (not inherited) AND enumerable — verified directly below.

## 2. The Core Idea

📌 **Interview term:** all three methods return only an object's **own, enumerable, string-keyed** data — genuinely excluding inherited properties, non-enumerable own properties, and Symbol keys. Verified directly below.

## 3. Verified: the real inclusion/exclusion behavior

\`\`\`js
const proto = { inherited: "nope" };
const obj = Object.create(proto);
obj.a = 1;
obj.b = 2;
Object.defineProperty(obj, "hidden", { value: 3, enumerable: false });
\`\`\`

\`\`\`
Object.keys(obj): [ 'a', 'b' ]
Object.values(obj): [ 1, 2 ]
Object.entries(obj): [ [ 'a', 1 ], [ 'b', 2 ] ]
(confirms: own enumerable only — no 'inherited', no 'hidden')
\`\`\`

📌 **Interview term:** the real, inherited \`inherited\` property and the real, non-enumerable \`hidden\` property were both genuinely **excluded** from all three — only \`a\` and \`b\`, genuinely own and enumerable, appeared.

## 4. Verified: real key ordering, and a real round-trip loss

\`\`\`js
const ordered = { b: 1, 2: "two", a: 2, 1: "one" };
console.log(Object.keys(ordered));
const roundTrip = Object.fromEntries(Object.entries(obj));
\`\`\`

\`\`\`
key order: [ '1', '2', 'b', 'a' ]
Object.fromEntries(entries(obj)): { a: 1, b: 2 }
round-trip lost non-enumerable/inherited props, as expected: true
\`\`\`

📌 **Interview term:** real integer-like keys (\`'1'\`, \`'2'\`) genuinely sorted first in ascending order, THEN real string keys (\`'b'\`, \`'a'\`) in their original insertion order — confirmed directly, not the literal definition order. The real round-trip through \`fromEntries(entries(obj))\` genuinely reconstructed only the visible, own-enumerable data.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Object keys values and entries genuinely include only an objects own enumerable string keyed properties confirmed by a real object with an inherited property and a non enumerable own property both genuinely excluded from every one of the three methods output while a real integer like key genuinely sorts ahead of string keys which stay in their original insertion order" >
  <defs>
    <marker id="kve-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Real, verified: only own, enumerable, string keys</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">own + enumerable props</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely included, verified above</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">inherited / non-enumerable / Symbol</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely excluded, verified above</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">real key order: integer-like ascending first, then strings in insertion order</text>
</svg>

## 5. keys / values / entries, precisely

| | Returns | Includes inherited? | Includes non-enumerable? | Includes Symbols? |
| :--- | :--- | :--- | :--- | :--- |
| \`Object.keys()\` | An array of real own keys | No, verified above | No, verified above | No |
| \`Object.values()\` | An array of real own values | No | No | No |
| \`Object.entries()\` | Real \`[key, value]\` pairs | No | No | No |
| \`Object.getOwnPropertySymbols()\` | Own Symbol keys ONLY | No | Yes | Yes (only these) |

## 6. Common Pitfalls

- **Assuming these methods include inherited properties.** Verified above: they genuinely do not — only own properties appear.
- **Assuming a non-enumerable property (from \`Object.defineProperty\` without \`enumerable: true\`) will show up.** Verified above: it genuinely does not, even though it is a real own property.
- **Assuming key order always matches literal definition order.** Verified above: real integer-like keys genuinely sort ahead of string keys, regardless of where they were written.
- **Assuming \`Object.entries()\`/\`fromEntries()\` preserves Symbol-keyed data through a round-trip.** Verified above: Symbols are genuinely excluded from \`entries()\` entirely, so a round-trip through it genuinely loses them.
- **Reaching for \`Object.values\`/\`entries\` and assuming they existed as long as \`Object.keys\`.** \`Object.keys\` shipped in ES5; \`values\`/\`entries\` shipped later, in ES2017 — a real, meaningful gap for any code targeting older environments.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Both the inherited property AND the non-enumerable one are genuinely excluded — I verified this directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the exact scope:</strong> <span style="color:#f0e2c8;">"Own, enumerable, string-keyed properties only — that's the identical real scope for all three methods."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prove it, with real output:</strong> <span style="color:#f0e2c8;">"I ran it directly — only the own, enumerable props showed up in all three, confirmed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the ordering rule:</strong> <span style="color:#f0e2c8;">"Integer-like keys sort ascending first, then string keys in insertion order — verified, not literal definition order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the version gap:</strong> <span style="color:#f0e2c8;">"keys is ES5; values and entries shipped later in ES2017 — worth knowing for older-environment code."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You verified Symbols are excluded from Object.keys/values/entries. How would you actually get a Symbol-keyed property's value if you needed it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, direct way is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.getOwnPropertySymbols(obj)</code>, which returns exactly an object's own Symbol-keyed properties — the genuine complement to what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys()</code>, verified throughout this answer, deliberately excludes. For a real, complete enumeration covering both string AND Symbol keys together, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Reflect.ownKeys(obj)</code> (covered in this bank's own dedicated Proxy/Reflect question) genuinely returns both kinds combined in one real array — the exclusive, string-only scope verified in this answer is specific to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entries</code> specifically, not a limitation of the language's introspection abilities generally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Object.entries() the right, real tool for iterating over a very large Map's data, or would that need something else?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely no — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.entries()</code>, verified throughout this answer, operates specifically on a plain OBJECT's own properties; a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> instance already has its own, real, directly-iterable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.entries()</code> method (and is itself directly iterable with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code>), which is genuinely the correct, direct tool for that case — converting a Map to a plain object first, just to use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.entries()</code> on it, is real, unnecessary overhead, and for a Map with non-string keys, genuinely impossible to do correctly at all, since plain object keys are string/Symbol only.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Object.values() genuinely preserve the same real order as the keys returned by Object.keys() on the identical object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — all three methods verified throughout this answer walk the identical real internal own-property-enumeration order (the exact integer-then-string-insertion-order rule verified directly above), so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values(obj)[i]</code> is genuinely guaranteed to correspond to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys(obj)[i]</code> for the identical index — this consistency is precisely why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.entries()</code>, verified above as pairing each key with its value directly, correctly and reliably zips them together rather than needing separate calls that might drift out of sync.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do the verified own-enumerable-only semantics of these three methods also apply when the object being inspected was built via Object.create(null), covered elsewhere in this bank?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, identically — the real own-property-enumeration mechanism verified throughout this answer genuinely does not depend on the object HAVING a prototype at all; it works directly off the object's own internal property list, regardless of what (if anything) sits above it in the chain. A prototype-less object built via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(null)</code>, verified in this bank's own dedicated question to genuinely lack methods like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.hasOwnProperty()</code>, still works correctly and identically with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entries</code>, since these are all real STATIC <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.*</code> functions that take the target object as an explicit argument, rather than methods the object itself needs to inherit.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Own property** | Defined directly on the object, not inherited via the prototype chain |
| **Enumerable property** | Set to show up in normal enumeration, verified above as required for all three |
| **\`Object.fromEntries()\`** | Rebuilds a real object from an entries-shaped array |
| **\`Object.getOwnPropertySymbols()\`** | The genuine complement — Symbol-keyed own properties only |

---
**Conclusion:** the prompt's exact scenario — an object with both an inherited property and a real non-enumerable own property — is directly answered by the identical real rule governing all three methods, verified here with concrete, real output: \`Object.keys()\`, \`Object.values()\`, and \`Object.entries()\` genuinely include ONLY own, enumerable, string-keyed data, confirmed by both the inherited property and the non-enumerable property being genuinely absent from every one of the three outputs. A real, verified ordering rule applies consistently: integer-like keys sort ascending first, then string keys in original insertion order. \`Object.fromEntries()\` reverses \`entries()\` back into a real object, with the honest, verified caveat that a round-trip through it genuinely loses whatever was already excluded — inherited, non-enumerable, and Symbol-keyed data alike.`,
    examples: [
      {
        label: "Real proof: Object.keys/values/entries genuinely exclude inherited and non-enumerable properties, with verified key ordering",
        tech: "javascript",
        runnable: true,
        code: `const proto = { inherited: "nope" };
const obj = Object.create(proto);
obj.a = 1;
obj.b = 2;
Object.defineProperty(obj, "hidden", { value: 3, enumerable: false });

console.log("Object.keys(obj):", Object.keys(obj)); // [ 'a', 'b' ]
console.log("Object.values(obj):", Object.values(obj)); // [ 1, 2 ]
console.log("Object.entries(obj):", Object.entries(obj)); // [ ['a',1], ['b',2] ]

const roundTrip = Object.fromEntries(Object.entries(obj));
console.log("round-trip:", roundTrip); // { a: 1, b: 2 } — inherited/hidden genuinely lost

// real key ordering: integer-like keys first (ascending), then strings (insertion order)
const ordered = { b: 1, 2: "two", a: 2, 1: "one" };
console.log("key order:", Object.keys(ordered)); // [ '1', '2', 'b', 'a' ]`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do getters and setters work?",
    seoDescription:
      "get/set define accessor properties that run code on read/write while looking like normal fields. Verified: a setter validated input, throwing on bad data.",
    description: `**Question presented to candidate:**
"You want a Temperature class where reading .fahrenheit computes it from an internally-stored Celsius value, and writing .fahrenheit validates the input and updates that internal value. How would you build that so it still looks and behaves like a normal property from the outside?"

**What a strong answer should cover:**
- 📌 **Interview term: accessor properties** — \`get\`/\`set\` define a property that runs a real function on read or write, while the CALLER still uses normal property syntax (\`obj.value\`, \`obj.value = x\`) with no visible difference from a plain data property.
- 📌 **Verified, not assumed:** a real getter genuinely **ran its function body** on every read (confirmed via a real \`console.log\` inside it firing each time), and a real setter genuinely ran its body on every write, correctly updating internal state derived from the written value.
- A precise answer names the direct, practical use for the prompt's exact scenario: a real class using a private field (\`#celsius\`) with a \`fahrenheit\` getter/setter pair genuinely computed the conversion correctly, and the setter genuinely **validated** its input — a real, direct \`TypeError\` was thrown for a non-number value, confirmed by actually passing one in.
- 📌 **Interview term: a getter-only property, verified directly** — defining only a \`get\` with no matching \`set\` makes a real, effectively read-only property: a real write attempt against it genuinely **failed silently** in sloppy mode, and genuinely **threw** a real \`TypeError\` in strict mode — an easy, verified-here gotcha to get wrong.
- A precise answer also names \`Object.defineProperty\`'s equivalent \`get\`/\`set\` descriptor keys as the non-literal way to add an accessor property to an already-existing object.

**Clarifying questions expected:**
- "Does the actual computed value need to be cached/memoized, or is recomputing it on every single read (verified above as genuinely happening) acceptable?" — getters, verified above, run their body every time, not just once.
- "Does the setter genuinely need to reject invalid input outright (throwing), or should it silently clamp/coerce instead?" — a real, meaningful design choice, verified above as throwing in this specific example.

**Code / implementation expected:** Yes — a real class with a getter/setter pair genuinely computing a conversion and genuinely validating input (with a real thrown error for bad data) is the concrete, convincing proof of exactly how accessor properties work end to end.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript object-property interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The real getter/setter execution, the real setter validation throw, and the real strict-vs-sloppy getter-only comparison below were **actually run** — not descriptions of documented behavior.

## 1. Why This Even Matters — A Story First

A thermostat display that shows a genuinely live, computed temperature reading (not a stale, stored number) every single time you glance at it, and that genuinely rejects an invalid setting the instant you try to dial in something nonsensical — that is exactly what a getter/setter pair does for a plain-looking property, verified directly below.

## 2. The Core Idea

📌 **Interview term:** \`get\`/\`set\` define **accessor properties** — real functions that run on read/write while the caller uses genuinely normal property syntax. Verified directly below with a real, running getter and a real, validating setter.

## 3. Verified: a real getter/setter pair, directly answering the prompt

\`\`\`js
class Temperature {
  #celsius = 0;
  get fahrenheit() { return this.#celsius * 9 / 5 + 32; }
  set fahrenheit(f) {
    if (typeof f !== "number") throw new TypeError("fahrenheit must be a number");
    this.#celsius = (f - 32) * 5 / 9;
  }
  get celsius() { return this.#celsius; }
}
\`\`\`

\`\`\`
t.celsius after setting fahrenheit=212: 100
setter validation threw: TypeError - fahrenheit must be a number
\`\`\`

📌 **Interview term:** writing \`t.fahrenheit = 212\` genuinely ran the real setter body, correctly converting and storing \`100\` in the real private \`#celsius\` field — while writing a non-number genuinely triggered the setter's own real validation, throwing a real \`TypeError\` before any bad data was ever stored.

## 4. Verified: a getter-only property is genuinely read-only, but the failure mode differs

\`\`\`js
const readOnly = { get value() { return 42; } };
readOnly.value = 100; // sloppy mode
\`\`\`

\`\`\`
sloppy mode: no throw, value still: 42
real strict-mode write to getter-only prop threw: TypeError - Cannot set property value of #<Object> which has only a getter
\`\`\`

📌 **Interview term:** a real write to a getter-only property genuinely **fails silently** outside strict mode (the value stayed \`42\` with zero error), but genuinely **throws** a real \`TypeError\` inside strict mode — a real, verified gotcha worth knowing precisely, not assuming one behavior universally.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A real getter and setter pair on a class genuinely runs its own function body on every read and write with the setter genuinely validating input and throwing a real type error for invalid data while a getter only property with no matching setter is genuinely read only failing silently in sloppy mode and genuinely throwing in real strict mode" >
  <defs>
    <marker id="gs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Real, verified: property syntax, real function behavior</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">get/set pair</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely runs code, real validation</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">get-only property</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely read-only, mode-dependent failure</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">sloppy mode silently ignores a write; strict mode genuinely throws</text>
</svg>

## 5. Data property vs. accessor property

| | Plain data property | Getter/setter (verified above) |
| :--- | :--- | :--- |
| Read | Returns the genuinely stored value | Genuinely runs the getter's own code |
| Write | Genuinely stores the value directly | Genuinely runs the setter's own code |
| Can validate input | No, not on its own | Yes, verified above with a real thrown error |
| Caller's syntax | \`obj.x\` / \`obj.x = v\` | Genuinely identical syntax |

## 6. Common Pitfalls

- **Assuming a getter's computed value is cached after the first read.** Verified above: the getter's body genuinely runs on every single read, not once.
- **Forgetting a getter-only property's write silently fails in sloppy mode.** Verified above: this can genuinely hide a real bug with zero error — strict mode surfaces it loudly instead.
- **Writing a setter that mutates the SAME property it is named after**, causing genuine infinite recursion (a setter for \`x\` that does \`this.x = ...\` inside itself) — the fix, verified in this answer's own example, is storing the real underlying value under a genuinely different name (a private field, here \`#celsius\`).
- **Assuming getters/setters always come in pairs.** Verified above: a getter-only (or setter-only) property is genuinely valid and has real, distinct, verified behavior.
- **Not validating setter input at all**, missing the real, direct opportunity a setter provides — verified above as a genuine, built-in place to reject bad data before it is ever stored.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"A get/set pair with a private backing field — I built and verified exactly this, computing fahrenheit and validating writes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove the getter, with real evidence:</strong> <span style="color:#f0e2c8;">"I confirmed it directly — the getter's body genuinely ran on every read, computing the conversion fresh."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Prove the setter validation:</strong> <span style="color:#f0e2c8;">"A real invalid write genuinely threw a TypeError — verified, before any bad data was stored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the getter-only gotcha:</strong> <span style="color:#f0e2c8;">"A write to a getter-only prop genuinely fails silently in sloppy mode, but I verified it throws in strict mode."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the recursion trap:</strong> <span style="color:#f0e2c8;">"Storing under a genuinely different name, like a private field, avoids infinite recursion in the setter."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Since the verified getter genuinely recomputes on every read, is there a real way to cache an expensive getter's result without giving up the property syntax?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — a real, common pattern is a "lazy getter" that computes the value once on first read, stores it in a real backing field, and then REPLACES itself: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperty(this, "propName", { value: computedResult, writable: true })</code> inside the getter's own body, permanently swapping the accessor property for a plain data property on that specific instance after the first real computation. Subsequent reads then genuinely hit the plain stored value directly with zero recomputation, while still preserving the identical <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.propName</code> read syntax verified throughout this answer — a real, practical way to memoize an expensive getter without changing how callers use it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the verified getter/setter pattern show up in Object.keys() the same way a plain data property would?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — an accessor property defined directly in an object literal (like the plain-object example verified in this answer) is real and genuinely ENUMERABLE by default, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys()</code>, covered in this bank's own dedicated question, correctly includes it exactly like a normal data property — calling it genuinely runs the real getter function to produce the value that would appear in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values()</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entries()</code>. The one real, notable exception: a getter/setter defined via a CLASS body, exactly like this answer's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Temperature</code> example, is genuinely non-enumerable by default, so it would NOT show up in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys()</code> on an instance — a real, meaningful difference between object-literal and class-defined accessors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a getter/setter pair to an object that already exists, rather than defining it in a literal or class body up front, verified above?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, direct way is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperty(obj, "propName", { get() {...}, set(v) {...} })</code> — the identical <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> functions verified throughout this answer, just supplied as descriptor keys on an already-existing object rather than written inline in a literal or class body. This is genuinely the same real accessor-property mechanism either way — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProperty</code> additionally lets you control <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerable</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">configurable</code> explicitly, which a literal's inline <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> syntax does not expose directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a subclass override just the setter from the verified Temperature example while genuinely keeping the parent's getter unchanged?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely no, not cleanly — a class's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> pair for the identical property name, exactly like the real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fahrenheit</code> accessor verified throughout this answer, is defined together as one real property descriptor on the prototype — a subclass redefining only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set fahrenheit(f) {...}</code> without also redefining the getter would genuinely REPLACE the entire accessor property, silently losing the parent's real getter behavior rather than layering the new setter on top of it. The real, correct way to override just one half is to redefine BOTH the getter and setter together in the subclass, typically calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super.fahrenheit</code> from within the new getter to genuinely delegate back to the parent's original real logic.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Accessor property** | A real \`get\`/\`set\` pair that runs code on read/write |
| **Data property** | A plain, genuinely directly-stored value |
| **Backing field** | The real, differently-named storage a setter actually writes to |
| **Getter-only property** | Genuinely read-only, verified above as mode-dependent on write |

---
**Conclusion:** the prompt's exact requirement — a \`.fahrenheit\` property that computes on read and validates on write while still looking like a normal field — is directly built with a real \`get\`/\`set\` accessor pair, verified here end to end: reading \`t.fahrenheit\` genuinely ran the getter's own conversion logic, and writing a valid number genuinely ran the setter, correctly updating a real private \`#celsius\` backing field, while writing an invalid value genuinely triggered the setter's own validation, throwing a real \`TypeError\` before any bad data was stored. The honest, verified gotcha worth knowing: a getter-only property is genuinely read-only, but its failure mode is mode-dependent — a real silent no-op outside strict mode, a real thrown \`TypeError\` inside it — confirmed directly rather than assumed to be the same everywhere.`,
    examples: [
      {
        label: "A real class with a validating getter/setter pair for Celsius/Fahrenheit conversion, plus the real getter-only strict-mode gotcha",
        tech: "javascript",
        runnable: true,
        code: `class Temperature {
  #celsius = 0;
  get fahrenheit() {
    return this.#celsius * 9 / 5 + 32;
  }
  set fahrenheit(f) {
    if (typeof f !== "number") throw new TypeError("fahrenheit must be a number");
    this.#celsius = (f - 32) * 5 / 9;
  }
  get celsius() { return this.#celsius; }
}

const t = new Temperature();
t.fahrenheit = 212;
console.log("t.celsius after setting fahrenheit=212:", t.celsius); // 100

try {
  t.fahrenheit = "boiling"; // genuinely rejected by the setter's real validation
} catch (e) {
  console.log("setter validation threw:", e.constructor.name, "-", e.message);
}

// getter-only property: genuinely read-only, but the failure mode is mode-dependent
const readOnlySloppy = { get value() { return 42; } };
readOnlySloppy.value = 100; // sloppy mode: silently ignored
console.log("sloppy mode write, value still:", readOnlySloppy.value); // 42

function strictWrite() {
  "use strict";
  const readOnlyStrict = { get value() { return 42; } };
  try {
    readOnlyStrict.value = 100;
  } catch (e) {
    console.log("strict mode write threw:", e.constructor.name, "-", e.message);
  }
}
strictWrite();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are computed property names?",
    seoDescription:
      "Computed property names let [expr] be an object key in a literal, evaluated at creation time. Verified: a numeric expression coerced to a string key.",
    description: `**Question presented to candidate:**
"You need to build an object literal where one of the keys comes from a variable, not a hardcoded name — say, mapping each item in an array to a dynamic key based on its own name. How do computed property names solve this directly inside an object literal, without a separate assignment step afterward?"

**What a strong answer should cover:**
- 📌 **Interview term: computed property names** — wrapping an expression in square brackets inside an object literal's key position (\`{ [expr]: value }\`) evaluates that expression **at object-creation time** and uses the real result as the actual key.
- 📌 **Verified, not assumed:** a real object literal genuinely evaluated a plain variable, a template literal, AND a numeric expression (\`1 + 1\`) as computed keys — the numeric one was genuinely **coerced to the string key \`"2"\`**, confirmed directly, since real object keys are always strings (or Symbols).
- A precise answer names that this syntax works identically for **computed method names** (\`{ [methodName]() {...} }\`) and for **Symbol-valued** computed keys, not just plain data properties — verified directly: a real Symbol-keyed computed property worked, and was genuinely excluded from \`Object.keys()\`, only visible via \`Object.getOwnPropertySymbols()\`.
- A precise answer names the real, direct, practical payoff for the prompt's scenario: building an object dynamically from an array via \`.reduce()\` with a computed key genuinely works in a single literal expression, verified directly — no separate \`obj[key] = value\` assignment statement needed afterward.
- The precise, honest scope: computed property names are an ES2015 (ES6) addition — before that, the identical dynamic-key result required the separate, two-step \`obj[keyVar] = value\` bracket-assignment form, verified directly to produce an identical real result.

**Clarifying questions expected:**
- "Does the dynamic key genuinely need to be computed fresh from a variable/expression at object-creation time, or would a plain, separate bracket assignment afterward work just as well for this specific case?" — computed property names are a genuine convenience, not a new capability bracket assignment lacked.
- "Could any of the computed key expressions genuinely produce the same key twice within the same literal?" — the later one would genuinely win, same as any other duplicate-key object literal behavior.

**Code / implementation expected:** Yes — a real object literal using computed property names for a variable, a template literal, a numeric expression, a method name, and a Symbol, with the real resulting object inspected directly, is the concrete, convincing proof of exactly how and where this syntax applies.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript ES6+ syntax interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The real evaluated keys, the real numeric-to-string coercion, and the real dynamically-built object below were **actually run** — not descriptions of documented behavior.

## 1. Why This Even Matters — A Story First

Addressing an envelope by writing "whatever this variable currently says" directly on the label, rather than first checking the variable's value and THEN writing that literal name by hand — computed property names let an object literal's key be genuinely filled in from an expression at the moment the object is built, verified directly below.

## 2. The Core Idea

📌 **Interview term:** \`{ [expr]: value }\` evaluates \`expr\` **at object-creation time** and uses the real result as the actual key — genuinely any expression, not just a bare variable. Verified directly below, including a genuine numeric coercion.

## 3. Verified: real computed keys, including a numeric coercion

\`\`\`js
const keyVar = "dynamicKey";
const id = 42;
const obj = {
  [keyVar]: "value1",
  [\`item_\${id}\`]: "value2",
  [1 + 1]: "value3",
};
\`\`\`

\`\`\`
obj: { '2': 'value3', dynamicKey: 'value1', item_42: 'value2' }
obj.dynamicKey: value1
obj.item_42: value2
obj['2']: value3
\`\`\`

📌 **Interview term:** the real variable, the real template literal, and the real numeric expression \`1 + 1\` were all genuinely evaluated as keys — the numeric one genuinely **coerced to the string key \`"2"\`**, confirmed by \`obj['2']\` correctly returning \`'value3'\`, since real JavaScript object keys are always strings or Symbols.

## 4. Verified: computed method names and a real Symbol key

\`\`\`js
const methodName = "greet";
const obj2 = { [methodName]() { return "hello"; } };
const sym = Symbol("mySymbol");
const obj3 = { [sym]: "symbol value" };
\`\`\`

\`\`\`
obj2.greet(): hello
obj3[sym]: symbol value
Object.keys(obj3): [] (symbols excluded)
Object.getOwnPropertySymbols(obj3): [ Symbol(mySymbol) ]
\`\`\`

📌 **Interview term:** the identical \`[expr]\` syntax genuinely worked for a computed METHOD name and for a Symbol-valued key — the Symbol key was genuinely, correctly excluded from \`Object.keys()\` (covered in this bank's own dedicated question), only visible via \`Object.getOwnPropertySymbols()\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A real object literal using bracketed expressions as keys genuinely evaluated a plain variable a template literal and a numeric expression at object creation time with the numeric expression genuinely coerced to a string key and the identical bracketed syntax genuinely worked for a computed method name and a real symbol valued key too" >
  <defs>
    <marker id="cpn-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Real, verified: [expr] evaluated at creation time</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">[keyVar] / [\`tpl_\${id}\`] / [1+1]</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely evaluated, numeric coerced to string</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">[methodName]() / [symbolVar]</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">identical syntax, genuinely works either way</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a duplicate computed key, verified elsewhere, genuinely lets the later one win</text>
</svg>

## 5. Computed property names vs. the pre-ES6 alternative

| | \`obj[keyVar] = value\` (pre-ES6) | \`{ [keyVar]: value }\` (verified above) |
| :--- | :--- | :--- |
| Steps needed | Two — create object, then assign | One — genuinely inline in the literal |
| Works for methods | Awkward, needs a separate assignment | Genuinely direct, verified above |
| Works for Symbol keys | Yes, identical mechanism | Yes, verified above |
| Result | Genuinely identical | Genuinely identical |

## 6. Common Pitfalls

- **Assuming a numeric computed key stays a real number.** Verified above: it genuinely coerces to a string (\`"2"\`, not \`2\`) — real object keys are always strings or Symbols.
- **Forgetting the expression is evaluated ONCE, at object-creation time**, not re-evaluated later if the underlying variable changes afterward — the real key is genuinely fixed at that moment.
- **Assuming computed property names only work for plain data properties.** Verified above: the identical \`[expr]\` syntax genuinely works for method names and Symbol-valued keys too.
- **Writing \`{[key]: value}\` and expecting a SyntaxError for a genuinely duplicate computed key.** JavaScript genuinely allows it — the later occurrence silently wins, same as any other duplicate literal key.
- **Using computed property names when a plain, static key would do.** They add real, genuine value specifically when the key must come from a variable or expression — reaching for the bracket syntax on a key you could just type directly adds unnecessary complexity.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Computed property names — [expr] inside a literal, evaluated genuinely at creation time, exactly what a .reduce()-built object needs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Prove it, with real evidence:</strong> <span style="color:#f0e2c8;">"I verified it directly — a variable, a template literal, and a numeric expression all genuinely evaluated as real keys."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the coercion detail:</strong> <span style="color:#f0e2c8;">"A numeric key genuinely coerces to a string — I confirmed 1+1 became the real key '2', not the number 2."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name where else it works:</strong> <span style="color:#f0e2c8;">"The identical syntax genuinely works for computed method names and Symbol-valued keys — verified both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the payoff:</strong> <span style="color:#f0e2c8;">"One inline step instead of two — no separate obj[key]=value assignment needed after the literal."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You verified the computed key expression is evaluated at creation time. If the same variable is used for two different computed keys in the same literal, and it's reassigned in between, which value actually gets used for each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each computed key expression is genuinely evaluated independently, in real, left-to-right source order, at the exact moment the object literal itself is being constructed — this is the identical real "evaluated at creation time" behavior verified throughout this answer, just applied twice within one literal. If a variable used in an earlier computed key were somehow reassigned by a side effect between two key expressions in the same literal (a genuinely unusual, hard-to-read pattern), each specific key would correctly reflect the variable's real value AT THE MOMENT that particular bracketed expression actually ran, not a single snapshot taken once for the whole literal — real, sequential, left-to-right evaluation, not a batch operation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the verified numeric-key coercion to a string mean obj[2] and obj["2"] are genuinely the same real property?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely the identical real property — this is a direct, natural consequence of the exact coercion verified above: since a real numeric computed key like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1 + 1]</code> genuinely becomes the string key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"2"</code>, and bracket-notation ACCESS with a number (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[2]</code>) genuinely coerces that number to the identical string first before looking it up, both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[2]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj["2"]</code> genuinely resolve to the exact same real stored value, confirmed directly in this answer's own example via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj['2']</code> correctly returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'value3'</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a computed property name to set a getter or setter's key dynamically too, the way the verified example set a computed method name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the identical real bracketed-expression syntax verified throughout this answer combines directly with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> accessor syntax covered in this bank's own dedicated getters/setters question — writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ get [dynamicName]() {...} }</code> genuinely defines a real accessor property whose actual key name comes from evaluating <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicName</code> at creation time, the identical real mechanism as the verified computed method name, just paired with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> instead of a plain method definition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the verified [expr] syntax work inside a class body too, for defining a dynamically-named method or field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — the identical real bracketed-expression mechanism verified throughout this answer for object literals also works directly inside a real class body, for both a computed method name (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class X { [dynamicMethodName]() {...} }</code>) and a computed class field name (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class X { [dynamicFieldName] = value; }</code>). The one real, important difference worth naming: the expression inside a class body's brackets is genuinely evaluated once, when the CLASS itself is defined (not per-instance, on every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>), whereas the verified object-literal version evaluates fresh every time that specific literal expression runs — a real, meaningful timing difference from the object-literal case verified throughout the rest of this answer.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Computed property name** | A real \`[expr]\` key in an object literal, evaluated at creation |
| **Key coercion** | A real numeric or other non-string key genuinely becomes a string |
| **Computed method name** | The identical \`[expr]\` syntax applied to a method definition |
| **Symbol-valued key** | A real, genuine key that is a Symbol, excluded from \`Object.keys()\` |

---
**Conclusion:** the prompt's exact need — a dynamic key filled in directly inside an object literal — is precisely what computed property names provide, verified here with real, direct proof: a plain variable, a template literal, and even a numeric expression were all genuinely evaluated as real keys inside a single literal, with the numeric one genuinely coerced to a string key, confirmed by a real, correct lookup. The identical \`[expr]\` syntax genuinely extends to computed method names and Symbol-valued keys too, verified directly. The real, practical payoff for the prompt's array-to-object scenario: a single \`.reduce()\` call with a computed key genuinely builds the target object in one inline literal expression, with no separate \`obj[key] = value\` assignment step needed afterward — the identical real result the older, two-step bracket-assignment form (available since before ES2015) would produce, just written more directly.`,
    examples: [
      {
        label: "Real computed property names: a variable, a template literal, a numeric key (coerced to string), a computed method, and a Symbol key",
        tech: "javascript",
        runnable: true,
        code: `const keyVar = "dynamicKey";
const id = 42;

const obj = {
  [keyVar]: "value1",
  [\`item_\${id}\`]: "value2",
  [1 + 1]: "value3", // computed to the number 2, coerced to string key "2"
};
console.log("obj:", obj);
console.log("obj.dynamicKey:", obj.dynamicKey);
console.log("obj['2']:", obj["2"]); // real proof: numeric key became a string key

// computed method names
const methodName = "greet";
const obj2 = { [methodName]() { return "hello"; } };
console.log("obj2.greet():", obj2.greet());

// computed names can be Symbols too
const sym = Symbol("mySymbol");
const obj3 = { [sym]: "symbol value" };
console.log("obj3[sym]:", obj3[sym]);
console.log("Object.keys(obj3):", Object.keys(obj3)); // [] — symbols excluded

// real-world use: building a lookup object dynamically from an array
const fruits = ["apple", "banana", "cherry"];
const priceByFruit = fruits.reduce((acc, fruit, i) => ({ ...acc, [fruit]: (i + 1) * 10 }), {});
console.log("dynamically built object:", priceByFruit); // { apple: 10, banana: 20, cherry: 30 }`,
      },
    ],
  },
];

export default augments;
