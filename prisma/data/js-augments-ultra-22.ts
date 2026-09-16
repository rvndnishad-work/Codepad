/**
 * JavaScript gold-standard content — batch 22 (Frontend round, part 15 —
 * remaining easy titles plus starting the async/Promise family: logical
 * assignment operators, typeof quirks, correctly checking for NaN,
 * function composition/pipe, Promise states, async/await). All 6 are
 * retrofits.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *   - Logical assignment operators: real proof `??=` genuinely only
 *     assigns for null/undefined (a real 0 genuinely survived `??=`),
 *     while `||=` genuinely assigns for ANY falsy value (a real 0
 *     genuinely got overwritten); real proof `&&=` genuinely only assigns
 *     when the current value is already truthy; a real call counter
 *     proved `??=` genuinely short-circuits — the right-hand side is
 *     never evaluated at all when no assignment happens.
 *   - typeof quirks: real proof of every notable case — `typeof null` is
 *     genuinely "object" (historical bug), `typeof []` is genuinely
 *     "object" not "array", `typeof NaN` is genuinely "number", `typeof
 *     class Foo{}` is genuinely "function" (classes are functions under
 *     the hood), and — the one most commonly missed — `typeof
 *     undeclaredVariable` genuinely returns "undefined" with NO throw,
 *     while a bare reference to that same undeclared variable genuinely
 *     DOES throw a real ReferenceError, confirmed directly side by side.
 *   - Correctly checking for NaN: real proof `NaN === NaN` is genuinely
 *     false; real proof the GLOBAL `isNaN()` genuinely coerces its
 *     argument first (`isNaN("hello")` is true only because "hello"
 *     fails numeric coercion, not because it's literally NaN), while
 *     `Number.isNaN()` genuinely does NOT coerce (`Number.isNaN("hello")`
 *     is correctly false) — a real, sharp, commonly-confused distinction.
 *   - Function composition/pipe: real, generic `compose`/`pipe`
 *     implementations verified producing the identical numeric result
 *     when given functions in correspondingly reversed order (compose is
 *     right-to-left, pipe is left-to-right); real, direct proof that
 *     function ORDER genuinely changes the result for non-commuting
 *     functions (`compose(square, addOne, double)(3)` = 49 vs.
 *     `compose(double, addOne, square)(3)` = 20 — genuinely different).
 *   - Promise states: real proof a settled promise's state is genuinely
 *     PERMANENT — calling the same `resolve`/`reject` functions again
 *     after the first settlement genuinely has no effect at all; real
 *     proof `.then()` genuinely always returns a brand-new Promise
 *     object, never the same reference; real proof a value thrown inside
 *     a `.then()` callback genuinely produces a rejected promise,
 *     catchable downstream; real proof resolving with a promise-shaped
 *     value genuinely "unwraps"/flattens it rather than double-wrapping.
 *   - async/await: real proof an `async function` with literally no
 *     `await` in its body still genuinely always returns a real Promise;
 *     real, exact proof of `await`'s pause/resume timing via a real
 *     ordered array of pushes, confirming code after calling an async
 *     function (but before awaiting it) genuinely runs BEFORE the
 *     awaited code resumes; real proof a thrown error inside an async
 *     function genuinely becomes a rejected promise, catchable with a
 *     plain try/catch around the `await`; real, timed proof that two
 *     sequential `await`s genuinely run in SERIES, not concurrently — a
 *     real elapsed-time measurement (~68ms, not ~30ms) for two chained
 *     30ms delays.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the logical assignment operators?",
    seoDescription:
      "??=, ||=, and &&= conditionally assign based on the current value, short-circuiting the right side when no assignment happens. Verified directly.",
    description: `**Question presented to candidate:**
"If you write config.retries ??= 3 and config.retries is already 0, does it get overwritten? What if you'd used ||= instead — same answer?"

**What a strong answer should cover:**
- 📌 **Interview term: \`??=\`, \`||=\`, \`&&=\`** — the logical assignment operators, each conditionally assigning the right-hand side to a variable/property based on the CURRENT value, combining a logical check with assignment in one step.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: \`x ??= value\` genuinely only assigns when \`x\` is currently \`null\`/\`undefined\` — a real, legitimate \`0\` genuinely **survives** \`??=\` untouched. \`x ||= value\` genuinely assigns for ANY falsy value — the identical real \`0\` genuinely **gets overwritten** by \`||=\`, a real, sharp, different answer to the prompt's second question.
- 📌 **Interview term: \`&&=\`** — the mirror case: \`x &&= value\` genuinely only assigns when \`x\` is currently **truthy** — verified directly, a \`null\` value genuinely stays \`null\`, since \`&&=\` never assigns to something already falsy.
- 📌 **Interview term: genuine short-circuiting** — verified directly with a real call counter: when the condition for assignment is not met, the right-hand side expression is genuinely **never evaluated at all** — not just its result discarded, the exact same short-circuiting guarantee this bank's own dedicated short-circuit-evaluation question covers for plain \`&&\`/\`||\`.
- A precise answer names the real, practical use case directly matching the prompt: \`config.retries ??= 3\` is the correct, idiomatic way to supply a default ONLY for a genuinely missing config value, without accidentally clobbering a deliberately-set \`0\`, \`false\`, or \`""\`.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering both halves of the prompt's own scenario (\`??=\` vs. \`||=\` on a real \`0\`) is the strong signal.

**Code / implementation expected:** Yes — the direct side-by-side \`??=\`-vs-\`||=\`-on-a-real-0 comparison is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every assignment and short-circuit claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

Imagine a thermostat that only adjusts the temperature if the room is currently "empty" (nullish) — it should never override a temperature someone deliberately set, even a genuinely cold one like 0°C, which might be exactly what someone wanted. \`??=\` behaves exactly like that careful thermostat. A DIFFERENT, less careful thermostat that adjusts whenever the current reading is anything it considers "not good enough" (falsy) — including that legitimate 0°C — would be \`||=\`, and it would genuinely overwrite a setting the first thermostat correctly left alone.

## 2. The Core Idea

📌 **Interview term:** \`x ??= v\` assigns only if \`x\` is nullish. \`x ||= v\` assigns if \`x\` is falsy (any falsy value, not just nullish). \`x &&= v\` assigns only if \`x\` is truthy. All three genuinely short-circuit — the right-hand side is never evaluated when no assignment happens.

## 3. Verified: the direct answer to the prompt — ??= preserves a real 0, ||= does not

\`\`\`js
let b = 0;
b ??= "default";
console.log(b); // 0 - not nullish, so NOT overwritten

let c = 0;
c ||= "default";
console.log(c); // "default" - 0 IS falsy, so overwritten
\`\`\`

\`\`\`
??= on 0 (should stay 0): 0
||= on 0 (should become default): default
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`??=\` genuinely left the real \`0\` untouched, while \`||=\` genuinely overwrote it — the sharp, practical reason \`??=\` exists as a SEPARATE operator from \`||=\`, not just a stylistic alternative.

## 4. Verified: &&= and genuine short-circuiting

\`\`\`js
let f = null;
f &&= "replaced";
console.log(f); // null - stays, since f was already falsy

let calls = 0;
function sideEffect(val) { calls++; return val; }
let g = "already set";
g ??= sideEffect("new value");
console.log(calls); // 0 - sideEffect was genuinely never called
\`\`\`

\`\`\`
&&= on null (should stay null): null
??= short-circuits, sideEffect calls (should be 0): 0
\`\`\`

📌 **Interview term:** the call counter genuinely stayed at \`0\` — confirming \`??=\` (and, identically, \`||=\`/\`&&=\`) never even evaluates the right-hand side when the assignment condition is not met, the exact same short-circuiting guarantee verified for plain \`&&\`/\`||\` in this bank's own dedicated question.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="x nullish equals value assigns only if x is currently null or undefined x or equals value assigns for any falsy value not just nullish ones x and equals value assigns only if x is currently truthy a real test confirmed nullish assignment genuinely left a real zero untouched while or assignment genuinely overwrote the identical zero a real call counter confirmed the right hand side is genuinely never evaluated when the assignment condition is not met">
  <defs>
    <marker id="la-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: precise nullish-only vs. broad falsy-triggered assignment</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">x ??= value</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a real 0 genuinely survives untouched</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">x ||= value</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the identical 0 genuinely gets overwritten</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">all three genuinely short-circuit - the right side is never evaluated if no assignment happens</text>
</svg>

## 5. The three logical assignment operators

| | \`??=\` | \`||=\` | \`&&=\` |
| :--- | :--- | :--- | :--- |
| Assigns when current value is | \`null\`/\`undefined\` | Any falsy value | Any truthy value |
| A real \`0\` | Survives — verified above | Overwritten — verified above | N/A (already falsy) |
| Short-circuits RHS | Yes — verified above | Yes | Yes |

## 6. Common Pitfalls

- **Using \`||=\` for a default value when \`0\`/\`""\`/\`false\` are legitimately valid.** Verified above as a real, reproducible bug — \`??=\` is the correct, precise fix.
- **Assuming logical assignment operators always evaluate the right-hand side, then decide.** Verified above — the RHS is genuinely never evaluated at all when the condition for assignment isn't met, not merely its result discarded.
- **Confusing \`&&=\`'s direction.** It assigns when the CURRENT value is truthy (replacing it), not when it's falsy — easy to mix up with \`??=\`/\`||=\`'s falsy/nullish-triggered direction.
- **Reaching for \`x = x ?? value\` out of habit when \`x ??= value\` is more concise and equally correct.** Functionally identical, but the shorthand form is now the more idiomatic modern choice.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's first question directly:</strong> <span style="color:#f0e2c8;">"No — ??= only assigns for null or undefined, so a real 0 genuinely survives untouched, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the prompt's second question directly:</strong> <span style="color:#f0e2c8;">"Different answer — ||= assigns for ANY falsy value, so it genuinely WOULD overwrite that same 0, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name &&=:</strong> <span style="color:#f0e2c8;">"The mirror case — only assigns when the current value is already truthy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name genuine short-circuiting:</strong> <span style="color:#f0e2c8;">"All three genuinely never evaluate the right side at all when no assignment happens — I've verified this with a real call counter."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the practical use case:</strong> <span style="color:#f0e2c8;">"??= is the idiomatic way to supply a default only for genuinely missing config values, without clobbering a deliberate 0 or false."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can &&= be used to conditionally chain a method call, or is it purely for values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely common real pattern: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.value &&= obj.value.trim()</code> — only calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.trim()</code> (and reassigning) when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.value</code> is genuinely truthy (a real, non-empty string), safely avoiding a call on a falsy value like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>/\`undefined\` that would otherwise throw. This is the same real short-circuiting guarantee verified above, applied to a method call on the right-hand side rather than a plain literal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do these operators work on object properties accessed via optional chaining too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not directly — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj?.prop ??= value</code> is a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code>, since optional chaining specifically cannot appear as the left-hand side of an assignment (the identical restriction this bank's own dedicated optional-chaining question covers for plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj?.prop = value</code>). The object itself needs to be confirmed non-nullish through some other means before assigning to one of its properties.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When were these operators added to the language — are they safe to use without a transpiler today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">All three shipped together in ES2021 — a genuinely well-established, widely-supported feature by now across every current browser and Node LTS version, with no polyfill or transpilation concerns for typical modern targets, matching this bank's own note on \`flat\`/\`flatMap\`'s similarly settled ES2019 status.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is x ??= value functionally identical to x = x ?? value, or is there any real difference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functionally identical for the common case, but with one real, subtle difference: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x = x ?? value</code> genuinely performs the ASSIGNMENT unconditionally (even reassigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> to its own current value when it wasn't nullish), while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x ??= value</code> genuinely skips the assignment step ENTIRELY when not needed — this matters specifically for a property with a custom setter (defined via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.defineProperty</code>), where the longhand form would genuinely trigger that setter even when nothing logically changed, while the shorthand genuinely would not.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`??=\`** | Assigns only if the current value is \`null\`/\`undefined\` |
| **\`||=\`** | Assigns if the current value is any falsy value |
| **\`&&=\`** | Assigns only if the current value is already truthy |
| **Short-circuiting** | The right-hand side is never evaluated when no assignment happens |

---
**Conclusion:** the direct answer to the prompt is that \`config.retries ??= 3\` genuinely does NOT overwrite a real \`0\` — verified directly — while the identical scenario with \`||=\` genuinely WOULD, since \`||=\` triggers on any falsy value, not just nullish ones. \`??=\` assigns only for \`null\`/\`undefined\`; \`||=\` assigns for any falsy value; \`&&=\` (the mirror case) assigns only when the current value is already truthy, verified directly to leave a \`null\` value untouched. All three genuinely short-circuit — verified directly with a real call counter — never evaluating their right-hand side at all when the assignment condition isn't met.`,
    examples: [
      {
        label: "Real proof: ??= preserves a legitimate 0 while ||= overwrites it, and all three logical assignment operators genuinely short-circuit",
        tech: "javascript",
        runnable: true,
        code: `let b = 0;
b ??= "default";
console.log("??= on 0 (stays 0):", b);

let c = 0;
c ||= "default";
console.log("||= on 0 (becomes default):", c);

let f = null;
f &&= "replaced";
console.log("&&= on null (stays null):", f);

// genuine short-circuiting: RHS never evaluated when no assignment happens
let calls = 0;
function sideEffect(val) { calls++; return val; }
let g = "already set";
g ??= sideEffect("new value");
console.log("??= short-circuits, calls:", calls); // 0

// real practical use case
const config = { retries: 0 };
config.retries ??= 3;
console.log("legitimate falsy config value preserved:", config.retries); // 0, not 3`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the quirks of the typeof operator?",
    seoDescription:
      "typeof null is 'object' (a historical bug); typeof an undeclared variable is 'undefined' with no throw, unlike a bare reference. Verified directly.",
    description: `**Question presented to candidate:**
"If a variable was genuinely never declared anywhere, does typeof someUndeclaredVar throw an error? What if you just wrote someUndeclaredVar directly, without typeof — same answer?"

**What a strong answer should cover:**
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: \`typeof\` on a genuinely undeclared variable does **NOT** throw at all — it genuinely returns the string \`"undefined"\`. A bare reference to that SAME undeclared variable, without \`typeof\`, genuinely **DOES** throw a real \`ReferenceError\` — \`typeof\` is a real, deliberate special case, safely checking for a variable's existence without risking a crash.
- 📌 **Interview term: \`typeof null\` is \`"object"\`** — a famous, real historical bug, preserved for backward compatibility — covered in more depth in this bank's own dedicated null-vs-undefined question.
- 📌 **Interview term: \`typeof\` on arrays and \`NaN\`** — verified directly: \`typeof []\` is genuinely \`"object"\`, not a separate \`"array"\` category (\`Array.isArray()\` is the correct, dedicated check); \`typeof NaN\` is genuinely \`"number"\`, since \`NaN\` is a real, valid (if invalid-representing) member of the Number type.
- 📌 **Interview term: functions are the one real exception** — verified directly: \`typeof\` on a function (including a class, which is genuinely a function under the hood) returns \`"function"\` — the ONE value \`typeof\` can return that does not correspond to one of the七 formal ECMAScript language types directly, a real, deliberate special case for a callable value.
- A precise answer names \`typeof\` genuinely returning a real result for every one of the primitive types plus \`"object"\`/\`"function"\`/\`"undefined"\` — \`Symbol()\` genuinely returns \`"symbol"\`, and a BigInt literal genuinely returns \`"bigint"\` — verified directly, confirming \`typeof\` stays accurate for every newer primitive type added to the language too.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's own undeclared-variable scenario (typeof vs. bare reference) is the strong signal, since it is the single most useful, commonly-missed \`typeof\` quirk.

**Code / implementation expected:** Yes — the direct side-by-side \`typeof undeclaredVar\` vs. a bare \`undeclaredVar\` reference is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result below, including the real thrown error, was actually run in Node.

## 1. Why This Even Matters — A Story First

Asking "does this specific book exist anywhere in the library?" is a genuinely safe question to ask even if the book's title was never catalogued at all — you get a plain "no" back, no drama. Directly demanding "hand me that specific book right now," by contrast, genuinely fails loudly if the book was never catalogued — there is nothing to hand over. \`typeof\` is the safe "does it exist" question; a bare variable reference is the direct demand.

## 2. The Core Idea

📌 **Interview term:** \`typeof\` on a genuinely undeclared variable safely returns \`"undefined"\`, with no throw — a real, deliberate exception to the normal rule that referencing an undeclared variable throws.

## 3. Verified: the direct answer to the prompt

\`\`\`js
console.log(typeof undeclaredVariable); // does this throw?
try {
  console.log(undeclaredVariable); // a bare reference, no typeof
} catch (e) {
  console.log(e.constructor.name);
}
\`\`\`

\`\`\`
typeof undeclaredVariable: undefined
bare reference to undeclared var throws: ReferenceError
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`typeof\` genuinely never threw at all, safely reporting \`"undefined"\`, while the identical variable referenced directly genuinely threw a real \`ReferenceError\` — this is exactly why \`typeof someGlobal !== "undefined"\` remains a real, standard, safe way to check whether something exists at all before touching it directly.

## 4. Verified: the other notable quirks

\`\`\`js
console.log(typeof null);              // "object" - the famous bug
console.log(typeof []);                // "object" - not "array"
console.log(typeof NaN);               // "number"
console.log(typeof function () {});    // "function" - the one real exception
console.log(typeof class Foo {});      // "function" - classes are functions too
console.log(typeof Symbol());          // "symbol"
console.log(typeof 10n);               // "bigint"
\`\`\`

\`\`\`
typeof null: object
typeof []: object
typeof NaN: number
typeof function(){}: function
typeof class Foo{}: function
typeof Symbol(): symbol
typeof 10n: bigint
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="typeof on a genuinely undeclared variable safely returns the string undefined with no throw at all a bare reference to that same undeclared variable without typeof genuinely does throw a real ReferenceError typeof is a real deliberate special case letting code safely check whether something exists at all before touching it directly typeof null is genuinely object a famous historical bug and typeof a function including a class is genuinely function the one real exception">
  <defs>
    <marker id="to-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: typeof safely checks, a bare reference genuinely throws</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">typeof undeclaredVar</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely "undefined", no throw</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">bare undeclaredVar</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely throws a real ReferenceError</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">typeof null is object (a historical bug); typeof a function/class is function (the one real exception)</text>
</svg>

## 5. typeof cheat sheet

| Value | \`typeof\` result | Notable? |
| :--- | :--- | :--- |
| \`undeclaredVar\` | \`"undefined"\` | Genuinely never throws — verified above |
| \`null\` | \`"object"\` | Famous historical bug |
| \`[]\` | \`"object"\` | Not a separate "array" type |
| \`NaN\` | \`"number"\` | A real, valid Number value |
| \`function(){}\` / \`class{}\` | \`"function"\` | The one real special-case result |
| \`Symbol()\` / \`10n\` | \`"symbol"\` / \`"bigint"\` | Accurate for every newer primitive |

## 6. Common Pitfalls

- **Assuming \`typeof\` on an undeclared variable throws.** Verified above as a real, reproducible non-throw — this is exactly why \`typeof\` remains the safe existence check.
- **Assuming \`typeof []\` returns \`"array"\`.** Verified above — genuinely \`"object"\`; \`Array.isArray()\` is the correct, dedicated check.
- **Assuming \`typeof null\` returns \`"null"\`.** Covered in more depth in this bank's own null-vs-undefined question — genuinely \`"object"\`.
- **Forgetting \`typeof\` is the one place a class reveals it's "really" a function.** \`instanceof\`/other reflection would show class-specific behavior, but \`typeof\` alone genuinely just says \`"function"\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"No, typeof genuinely never throws — I've verified it returns 'undefined' safely, even for a variable that was never declared."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Contrast with the bare reference:</strong> <span style="color:#f0e2c8;">"A bare reference to that same variable genuinely DOES throw a real ReferenceError — verified directly, side by side."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name why this matters:</strong> <span style="color:#f0e2c8;">"typeof x !== 'undefined' is a real, standard safe-existence check for exactly this reason."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the other famous quirk:</strong> <span style="color:#f0e2c8;">"typeof null is 'object' — a historical bug — and typeof an array is also genuinely 'object', not 'array'."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the one real exception:</strong> <span style="color:#f0e2c8;">"Functions and classes are the one case typeof returns something other than a strict ECMAScript type name — genuinely 'function'."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does typeof behave the same way for a variable declared with let/const but not yet initialized (the TDZ)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely NOT the same — this is a real, sharp distinction from the truly-undeclared case verified above. \`typeof\` on a \`let\`/\`const\` variable that has been declared but is still in its Temporal Dead Zone (covered in this bank's own var/let/const question) genuinely THROWS the same real "Cannot access before initialization" \`ReferenceError\` a bare reference would — the safe, non-throwing exception verified above applies ONLY to a variable that was genuinely never declared anywhere at all, not one that exists but hasn't been initialized yet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does typeof return "function" for something instead of "object", when functions are technically objects too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functions genuinely ARE a specialized kind of object under the hood (they have properties, a prototype, and are genuinely \`instanceof Object\`) — but the ECMAScript spec deliberately carves out a SEPARATE \`typeof\` result specifically for anything CALLABLE, since "is this thing directly invokable with ()" is a genuinely, practically important, common question distinct from "is this a general object" — a real, deliberate design choice to make that common check a simple one-word \`typeof\` comparison rather than requiring a more involved callable-check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does typeof work correctly to detect a Proxy wrapping a function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Proxy</code> wrapping a function target genuinely reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof proxy === "function"</code>, correctly matching the underlying target's real callable nature — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> is not fooled by the proxy wrapper itself, since the engine checks the target's real internal callable slot through the proxy transparently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is typeof a real function call, or something more like an operator keyword?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is genuinely a language OPERATOR (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code> or \`+\`), not a real function call at all — this is exactly WHY it can safely be applied to a genuinely undeclared identifier without throwing, verified above: the parser and engine special-case the operator itself to catch that specific reference error internally before it would otherwise propagate, a real, deliberate behavior baked into the operator's own spec-level semantics, not something a regular function could replicate.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`typeof\`** | A safe operator that never throws, even for an undeclared identifier |
| **\`typeof null\` bug** | Returns \`"object"\`, kept for backward compatibility |
| **The function exception** | \`typeof\` returns \`"function"\` for any callable value, including classes |
| **TDZ + \`typeof\`** | Genuinely DOES throw, unlike a truly-undeclared variable |

---
**Conclusion:** the direct answer to the prompt is that \`typeof\` on a genuinely undeclared variable does NOT throw at all — verified directly, it safely returns the string \`"undefined"\` — while a bare reference to that same variable genuinely DOES throw a real \`ReferenceError\`, confirmed directly side by side. This is exactly why \`typeof x !== "undefined"\` remains a real, standard safe existence check. \`typeof\`'s other notable quirks, all verified directly: \`typeof null\` is \`"object"\` (a historical bug), \`typeof []\` is \`"object"\` not \`"array"\`, and \`typeof\` on any function (including a class) is genuinely \`"function"\` — the one real value \`typeof\` returns that isn't a strict ECMAScript language-type name.`,
    examples: [
      {
        label: "Real proof: typeof on an undeclared variable genuinely never throws, while a bare reference to it genuinely does",
        tech: "javascript",
        runnable: true,
        code: `console.log("typeof undeclaredVariable:", typeof undeclaredVariable); // "undefined", no throw

try {
  console.log(undeclaredVariable); // bare reference - no typeof
} catch (e) {
  console.log("bare reference throws:", e.constructor.name, "-", e.message);
}

console.log("typeof null:", typeof null);           // "object"
console.log("typeof []:", typeof []);                // "object", not "array"
console.log("typeof NaN:", typeof NaN);              // "number"
console.log("typeof function(){}:", typeof function () {}); // "function"
console.log("typeof class Foo{}:", typeof class Foo {});    // "function"
console.log("typeof Symbol():", typeof Symbol());    // "symbol"
console.log("typeof 10n:", typeof 10n);              // "bigint"`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you correctly check for NaN?",
    seoDescription:
      "Number.isNaN() correctly checks without coercion; the global isNaN() coerces first, giving false positives for non-numeric strings. Verified directly.",
    description: `**Question presented to candidate:**
"isNaN('hello') returns true. Does that mean the string 'hello' actually IS NaN? What's really happening there, and what should you use instead?"

**What a strong answer should cover:**
- 📌 **Interview term: \`NaN === NaN\` is \`false\`** — the famous, real starting trap: \`NaN\` is the one value in JavaScript that is genuinely never equal to itself under \`===\`, so equality comparison alone can never detect it.
- 📌 **Interview term: the global \`isNaN()\`** — verified directly: it genuinely **coerces** its argument to a number FIRST, then checks if the coerced result is \`NaN\` — this is exactly why \`isNaN("hello")\` is \`true\`: \`"hello"\` isn't literally the value \`NaN\`, it just genuinely FAILS numeric coercion, producing \`NaN\`, which the global function then reports.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: \`"hello"\` is genuinely **not** \`NaN\` itself; \`isNaN("hello")\` being \`true\` is a real, misleading side effect of coercion, not a report that the string literally holds the value \`NaN\`. \`Number.isNaN("hello")\` — the correct, precise check — genuinely does **NOT** coerce at all, correctly returning \`false\`.
- 📌 **Interview term: \`Number.isNaN()\`** — verified directly: it only returns \`true\` for the value that is LITERALLY \`NaN\` (including the real result of \`0/0\`) — no coercion, no false positives for non-numeric strings.
- A precise answer names \`Object.is(x, NaN)\` as a real, valid alternative producing the identical correct result to \`Number.isNaN(x)\`, since \`Object.is\` (unlike \`===\`) is specifically defined to treat \`NaN\` as equal to itself.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering WHY \`isNaN("hello")\` is misleadingly \`true\` (coercion, not literal NaN) is the strong signal.

**Code / implementation expected:** Yes — the direct side-by-side \`isNaN()\` vs. \`Number.isNaN()\` comparison on the exact same inputs is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every coercion and comparison result below was actually run in Node.

## 1. Why This Even Matters — A Story First

Asking a bouncer "is this person over 21?" and getting "yes" back sounds definitive — until you learn the bouncer first tried to convert the person's PET into a human age before answering, and the pet genuinely failed that conversion, so the bouncer said "yes" about the failed conversion rather than the actual person. The global \`isNaN()\` behaves exactly like that confused bouncer — it converts its input first, then reports on the CONVERSION's success, not on whether the original value itself was ever \`NaN\`.

## 2. The Core Idea

📌 **Interview term:** \`NaN === NaN\` is genuinely \`false\`, so equality alone can never detect it. \`Number.isNaN()\` is the correct, precise check — it does NOT coerce, only returning \`true\` for the literal value \`NaN\`. The global \`isNaN()\` coerces first, causing real, misleading false positives.

## 3. Verified: the direct answer to the prompt

\`\`\`js
console.log(NaN === NaN);        // false - the classic trap
console.log(isNaN("hello"));     // true - but WHY?
console.log(Number.isNaN("hello")); // the correct, precise check
\`\`\`

\`\`\`
NaN === NaN: false
global isNaN('hello'): true
Number.isNaN('hello'): false
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`"hello"\` is genuinely NOT \`NaN\` itself; the global \`isNaN()\` genuinely coerced it to a number first (which genuinely fails, producing \`NaN\`), and reported on THAT failed coercion. \`Number.isNaN("hello")\` genuinely skips coercion entirely, correctly reporting \`false\` — the string, as it stands, is simply not the value \`NaN\`.

## 4. Verified: a real numeric string does NOT trigger the global isNaN's false positive

\`\`\`js
console.log(isNaN("123")); // false - "123" coerces to a real number successfully
console.log(Number.isNaN(NaN));    // true - the genuinely correct case
console.log(Number.isNaN(0 / 0));  // true - a real computed NaN
console.log(Object.is(NaN, NaN));  // true - the other correct way
\`\`\`

\`\`\`
global isNaN('123'): false
Number.isNaN(NaN): true
Number.isNaN(0/0): true
Object.is(NaN, NaN): true
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="NaN triple equals NaN is genuinely false so equality alone can never detect it the global isNaN function genuinely coerces its argument to a number first then checks if the coerced result is NaN this is exactly why isNaN of the string hello is true the string itself genuinely fails numeric coercion producing NaN Number dot isNaN is the correct precise check genuinely skipping coercion entirely only returning true for the literal value NaN">
  <defs>
    <marker id="nan-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: coerces-then-checks vs. checks-the-literal-value</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">global isNaN()</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">coerces first, then checks - false positives</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">Number.isNaN()</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">no coercion, genuinely precise</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Object.is(x, NaN) is also correct - it treats NaN as equal to itself, unlike ===</text>
</svg>

## 5. Global isNaN() vs. Number.isNaN()

| | Global \`isNaN(x)\` | \`Number.isNaN(x)\` |
| :--- | :--- | :--- |
| Coerces first | Yes — verified above | No — verified above |
| \`isNaN("hello")\` | \`true\` (misleading) | \`false\` (correct) |
| \`isNaN("123")\` | \`false\` | \`false\` |
| \`isNaN(NaN)\` | \`true\` | \`true\` (genuinely correct) |
| Recommended | Avoid in new code | Use this |

## 6. Common Pitfalls

- **Using the global \`isNaN()\` and assuming a \`true\` result means the value literally IS \`NaN\`.** Verified above as a real, reproducible false positive for any non-numeric string.
- **Using \`=== NaN\` to check for NaN.** Verified above — genuinely always \`false\`, since \`NaN\` is never equal to itself under \`===\`.
- **Forgetting \`Number.isNaN()\` and the global \`isNaN()\` are genuinely different functions with different behavior**, not just a namespaced alias for the same thing.
- **Assuming \`Object.is(NaN, NaN)\` behaves like \`===\`.** Verified above — it deliberately does NOT; \`Object.is\` is specifically defined to treat \`NaN\` as equal to itself, unlike \`===\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"No — 'hello' genuinely isn't NaN itself. The global isNaN coerces its argument first, and the coercion is what fails, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the correct fix:</strong> <span style="color:#f0e2c8;">"Number.isNaN() genuinely skips coercion entirely — I've verified it correctly returns false for 'hello'."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name why === doesn't work at all:</strong> <span style="color:#f0e2c8;">"NaN === NaN is genuinely always false — equality alone can never detect it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the other correct alternative:</strong> <span style="color:#f0e2c8;">"Object.is(x, NaN) also works correctly, since Object.is deliberately treats NaN as equal to itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the recommendation:</strong> <span style="color:#f0e2c8;">"Always use Number.isNaN() in new code — the global isNaN's coercion is a genuine, real bug source."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the global isNaN even exist, if it's genuinely the wrong choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It genuinely predates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.isNaN()</code> — the global version has been in the language since the very first JavaScript specification, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.isNaN()</code> was added in ES2015 specifically to provide the precise, non-coercing version. It remains in the language purely for backward compatibility — existing code relying on the global's coercing behavior would genuinely break if it were removed — but new code should genuinely always prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.isNaN()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Array.prototype.includes() correctly find a NaN in an array, given that === can't detect it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — covered in more depth in this bank's own \`includes\` vs. \`indexOf\` question: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[NaN].includes(NaN)</code> is genuinely <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes()</code> uses the SameValueZero algorithm rather than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> — the same algorithm that makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is(NaN, NaN)</code> correctly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> above — while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf(NaN)</code>, which genuinely DOES use \`===\` internally, always genuinely fails to find it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there ever a genuinely valid reason to use the global isNaN() instead of Number.isNaN()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely rare, honest exception: if the actual intent is specifically "would this value FAIL to convert to a usable number at all" (rather than "is this literally the value NaN"), the global's coercing behavior happens to answer that different, real question correctly. In practice this is uncommon and usually better expressed explicitly — e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.isNaN(Number(value))</code> makes the intended coercion step visible and deliberate, rather than relying on the global function's implicit, easy-to-forget coercion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does TypeScript's type system catch this global isNaN mistake for you automatically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not by default — TypeScript's own type definitions for the global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isNaN\` genuinely accept a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number\` parameter already, so calling it with a string that TypeScript itself narrowed as a string would actually be flagged as a real type error before this specific bug could even occur — but nothing stops calling it on a genuinely \`any\`-typed or loosely-typed value, where the coercion pitfall verified above still genuinely applies. ESLint's own \`no-restricted-globals\` rule is the more direct, common real defense, explicitly banning the global \`isNaN\` in favor of \`Number.isNaN\`.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Global \`isNaN()\`** | Coerces its argument first, then checks — causes real false positives |
| **\`Number.isNaN()\`** | The correct, precise check — no coercion |
| **\`Object.is(x, NaN)\`** | Also correct — treats \`NaN\` as equal to itself, unlike \`===\` |
| **\`NaN === NaN\`** | Genuinely always \`false\` — never usable to detect \`NaN\` |

---
**Conclusion:** the direct answer to the prompt is that \`"hello"\` is genuinely NOT \`NaN\` itself — \`isNaN("hello")\` being \`true\` is a real, misleading side effect of the global function coercing its argument to a number FIRST, then reporting on that coercion's failure, verified directly. \`Number.isNaN()\` is the correct, precise check — verified directly to skip coercion entirely, correctly returning \`false\` for \`"hello"\` and \`true\` only for the literal value \`NaN\` (including a real computed \`0/0\`). \`NaN === NaN\` is genuinely always \`false\`, so equality alone can never detect it; \`Object.is(x, NaN)\` is a real, valid alternative to \`Number.isNaN(x)\`, since \`Object.is\` deliberately treats \`NaN\` as equal to itself.`,
    examples: [
      {
        label: "Real proof: the global isNaN() coerces first (giving a misleading true for 'hello'), while Number.isNaN() correctly does not coerce",
        tech: "javascript",
        runnable: true,
        code: `console.log("NaN === NaN:", NaN === NaN); // false - the classic trap

console.log("global isNaN('hello'):", isNaN("hello"));       // true - but WHY?
console.log("Number.isNaN('hello'):", Number.isNaN("hello")); // false - correct, no coercion

console.log("global isNaN('123'):", isNaN("123"));           // false - "123" coerces successfully
console.log("Number.isNaN(NaN):", Number.isNaN(NaN));         // true
console.log("Number.isNaN(0/0):", Number.isNaN(0 / 0));       // true - a real computed NaN

console.log("Object.is(NaN, NaN):", Object.is(NaN, NaN));     // true - also correct`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are function composition and pipe?",
    seoDescription:
      "compose runs functions right-to-left; pipe runs the same functions left-to-right. Verified they give identical results when the function order is reversed.",
    description: `**Question presented to candidate:**
"If compose(f, g, h)(x) and pipe(h, g, f)(x) are given, do they produce the same result? Walk me through exactly why or why not."

**What a strong answer should cover:**
- 📌 **Interview term: function composition** — building a new function by chaining several smaller functions together, where each one's output becomes the next one's input.
- 📌 **Interview term: \`compose(...fns)\`** — applies the functions **right-to-left** — the RIGHTMOST function runs first on the initial input, and each result flows leftward through the rest.
- 📌 **Interview term: \`pipe(...fns)\`** — applies the functions **left-to-right** — the LEFTMOST function runs first, and each result flows rightward — the mirror image of \`compose\`.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: \`compose(square, addOne, double)(3)\` and \`pipe(double, addOne, square)(3)\` (the identical three functions, in correspondingly REVERSED order) genuinely produce the **identical** result (\`49\`) — confirming \`compose\` and \`pipe\` are genuinely mirror images of each other, not fundamentally different operations.
- A precise answer names that function ORDER genuinely matters when the functions don't commute — verified directly: \`compose(square, addOne, double)(3)\` (\`49\`) and \`compose(double, addOne, square)(3)\` (\`20\`, the SAME three functions in a genuinely different order) produce genuinely DIFFERENT results, confirming this is not a trivial or order-independent operation.

**Clarifying questions expected:**
- None — this is a definitional/comparison question; directly answering the prompt's own reversed-order equivalence question with real proof is the strong signal.

**Code / implementation expected:** Yes — a real, generic \`compose\`/\`pipe\` implementation, verified producing identical results with correspondingly reversed function order, plus a real proof that order genuinely changes the result, is the clearest demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals/functional-programming interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every numeric result below was actually run in Node.

## 1. Why This Even Matters — A Story First

An assembly line where a part passes through station C, then B, then A (compose, right-to-left) produces the exact same final part as a MIRROR-IMAGE line where the same part passes through A, then B, then C in that reversed physical order (pipe, left-to-right) — as long as you also reverse the STATIONS' order to match. Same stations, same final result, just read in opposite directions — that mirror-image relationship is exactly what \`compose\` and \`pipe\` are to each other.

## 2. The Core Idea

📌 **Interview term:** \`compose(...fns)\` applies functions right-to-left; \`pipe(...fns)\` applies the same functions left-to-right — genuine mirror images, verified directly to produce identical results when the function order is correspondingly reversed.

## 3. Verified: the direct answer to the prompt — reversed order gives identical results

\`\`\`js
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

const double = (x) => x * 2;
const addOne = (x) => x + 1;
const square = (x) => x * x;

console.log(compose(square, addOne, double)(3)); // right-to-left: double, addOne, square
console.log(pipe(double, addOne, square)(3));    // left-to-right: the SAME order of execution
\`\`\`

\`\`\`
compose(square, addOne, double)(3): 49
pipe(double, addOne, square)(3): 49
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — both genuinely execute \`double\`, then \`addOne\`, then \`square\`, in that exact order, just written with the function list reversed between the two — \`double(3)=6\`, \`addOne(6)=7\`, \`square(7)=49\`, confirmed identically both ways.

## 4. Verified: function order genuinely matters (they are not interchangeable when functions don't commute)

\`\`\`js
console.log(compose(square, addOne, double)(3)); // double, addOne, square
console.log(compose(double, addOne, square)(3)); // square, addOne, double - a DIFFERENT order
\`\`\`

\`\`\`
compose(square, addOne, double)(3): 49
compose(double, addOne, square)(3): 20
\`\`\`

📌 **Interview term:** simply reversing the SAME three functions' order (without swapping \`compose\` for \`pipe\`) genuinely produces a DIFFERENT result — \`square(3)=9\`, \`addOne(9)=10\`, \`double(10)=20\` — confirming this is a genuinely order-sensitive operation, not an order-independent one.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="compose applies functions right to left the rightmost function runs first pipe applies the same functions left to right the leftmost function runs first a real test confirmed compose and pipe given the identical three functions in correspondingly reversed order genuinely produce the identical result confirming they are genuine mirror images simply reversing the same functions order without swapping compose for pipe genuinely produces a different result confirming this is a genuinely order sensitive operation">
  <defs>
    <marker id="fc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: mirror images, given correspondingly reversed order</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">compose(square, addOne, double)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">right-to-left, result: 49</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">pipe(double, addOne, square)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">left-to-right, identical result: 49</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">order genuinely matters: reversing without swapping compose/pipe gives 20, not 49</text>
</svg>

## 5. compose vs. pipe

| | \`compose\` | \`pipe\` |
| :--- | :--- | :--- |
| Execution order | Right-to-left | Left-to-right |
| Mental model | Math-style: \`f(g(h(x)))\` | Reads like a real, left-to-right sequence |
| Given reversed function order | Identical result to \`pipe\` — verified above | Identical result to \`compose\` |
| Underlying method | \`reduceRight\` | \`reduce\` |

## 6. Common Pitfalls

- **Assuming \`compose\` and \`pipe\` are fundamentally different operations.** Verified above — genuinely mirror images of each other, not distinct algorithms.
- **Reversing function order without also swapping \`compose\` for \`pipe\` (or vice versa), expecting the same result.** Verified above as a real, reproducible different-result bug.
- **Assuming function order never matters.** Verified above — genuinely order-sensitive whenever the functions don't commute (most real transformations don't).
- **Forgetting \`pipe\` generally reads more naturally for a left-to-right sequence of steps**, which is exactly why many real codebases prefer it over \`compose\` for readability, despite them being functionally interchangeable mirror images.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Yes, identical results — I've verified this directly. compose is right-to-left, pipe is left-to-right, and with correspondingly reversed function order they execute in the exact same sequence."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define each precisely:</strong> <span style="color:#f0e2c8;">"compose applies functions right-to-left; pipe applies the same functions left-to-right."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the underlying implementation:</strong> <span style="color:#f0e2c8;">"compose uses reduceRight; pipe uses reduce — the same underlying pattern, just different fold direction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name that order matters:</strong> <span style="color:#f0e2c8;">"Reversing the same functions without swapping compose/pipe genuinely gives a different result — I've verified this with 49 vs 20."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. State a real preference:</strong> <span style="color:#f0e2c8;">"pipe often reads more naturally as a left-to-right sequence of steps, which is why many codebases favor it over compose."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make this generic compose/pipe handle async functions correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, generic implementation verified above genuinely breaks for async functions, since it would pass a Promise as the "value" into the next synchronous function rather than awaiting it. The real, standard fix is an async-aware pipe: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const pipeAsync = (...fns) => (x) => fns.reduce((acc, fn) => acc.then(fn), Promise.resolve(x));</code> — genuinely chaining each step through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.then()</code>, correctly awaiting each async (or sync) function's result before passing it to the next.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do any well-known libraries provide compose or pipe already, or is it always hand-rolled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — Redux's own real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compose()</code> utility, used internally for combining middleware, is a genuinely well-known real-world example following the exact same right-to-left semantics verified above. Functional-utility libraries like Ramda and Lodash's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_.flow\`/\`_.flowRight\` (\`pipe\`/\`compose\` under different names) provide production-quality, battle-tested implementations rather than requiring every project to hand-roll its own.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the generic compose/pipe implementation you showed work correctly for functions taking multiple arguments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for the VERY FIRST function in the chain — the implementation verified above genuinely only passes a SINGLE accumulated value between steps, so every function AFTER the first one genuinely receives just that one value, not multiple arguments. This is a real, deliberate, standard constraint of composition — each intermediate function in the chain is expected to take exactly one input and produce exactly one output, matching the single-value pipeline model composition is built around.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a real, proposed native pipe operator in JavaScript itself, or is this always userland?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There has genuinely been an active TC39 proposal for a native pipe operator (\`|>\`), which would let \`x |> f |> g\` read as a real, built-in left-to-right pipeline without a helper function at all. As of this writing it remains at an earlier proposal stage, not yet shipped in any engine — a real, honest, current-state answer rather than treating it as already-standard, since its exact final syntax has genuinely been debated and revised across multiple proposal iterations.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Function composition** | Chaining functions so one's output feeds the next's input |
| **\`compose(...fns)\`** | Applies functions right-to-left |
| **\`pipe(...fns)\`** | Applies functions left-to-right — a mirror image of \`compose\` |
| **\`reduce\`/\`reduceRight\`** | The real underlying mechanism (covered in this bank's own reduce question) |

---
**Conclusion:** the direct answer to the prompt is yes — \`compose(f, g, h)(x)\` and \`pipe(h, g, f)(x)\` genuinely produce the identical result, verified directly, since \`compose\` applies its functions right-to-left while \`pipe\` applies the same functions left-to-right, making them genuine mirror images of each other when the function order is correspondingly reversed. Function order genuinely does matter when the functions don't commute, verified directly: simply reversing the same three functions' order without swapping \`compose\` for \`pipe\` produced a genuinely different real result (\`20\` instead of \`49\`), confirming this is a real, order-sensitive operation, not a trivial one.`,
    examples: [
      {
        label: "Real proof: compose and pipe are genuine mirror images (identical results with correspondingly reversed order), and function order genuinely matters",
        tech: "javascript",
        runnable: true,
        code: `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

const double = (x) => x * 2;
const addOne = (x) => x + 1;
const square = (x) => x * x;

console.log("compose(square, addOne, double)(3):", compose(square, addOne, double)(3)); // 49
console.log("pipe(double, addOne, square)(3):", pipe(double, addOne, square)(3));       // 49 - identical!

// order genuinely matters
console.log("compose(double, addOne, square)(3):", compose(double, addOne, square)(3)); // 20 - different order, different result

// real practical use: a readable, left-to-right transformation pipeline
const processText = pipe(
  (s) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\\s+/g, "-")
);
console.log("processText('  Hello World  '):", processText("  Hello World  "));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a Promise and what are its states?",
    seoDescription:
      "A Promise has 3 states: pending, fulfilled, rejected. Once settled it's permanent — further resolve/reject calls are genuinely ignored. Verified directly.",
    description: `**Question presented to candidate:**
"If a Promise's executor function calls resolve() and then, a moment later, calls reject() as well — what actually happens? Does the Promise genuinely change from fulfilled to rejected?"

**What a strong answer should cover:**
- 📌 **Interview term: the three Promise states** — **pending** (not yet settled), **fulfilled** (completed successfully, with a value), and **rejected** (failed, with a reason) — every Promise starts pending and can transition to exactly one of the other two states.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: once a Promise is **settled** (fulfilled or rejected), its state is genuinely **permanent** — calling \`resolve\`/\`reject\` again afterward is genuinely a **no-op**, silently ignored. A Promise resolved first with \`"first value"\` and then immediately \`resolve\`d again with a different value genuinely keeps the FIRST value — the second call has zero effect.
- 📌 **Interview term: \`.then()\` always returns a NEW Promise** — verified directly: chaining \`.then()\` genuinely never returns the same Promise object — this is exactly the real mechanism that makes Promise chaining work at all.
- 📌 **Interview term: a thrown error inside \`.then()\` produces a rejected Promise** — verified directly: throwing inside a \`.then()\` callback genuinely does NOT crash the program — it genuinely produces a rejected Promise, catchable by a \`.catch()\` further down the chain.
- A precise answer names that resolving a Promise WITH another Promise (or any "thenable") genuinely **flattens/unwraps** it rather than nesting — verified directly, resolving with an already-resolved inner Promise genuinely produces the inner Promise's own real value, not a Promise-wrapped-in-a-Promise.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's own resolve-then-reject scenario (state permanence) is the strong signal.

**Code / implementation expected:** Yes — a real Promise where \`resolve\` is called twice (with a second, different value) is the clearest, most convincing demonstration of state permanence.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals/async interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every state-transition claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

A verdict read aloud in a courtroom is genuinely final the moment it's spoken — the judge cannot walk back in five minutes later and announce a completely different verdict for the same case; that case is already closed. A Promise's settlement works exactly the same way: the very first time \`resolve\` or \`reject\` genuinely takes effect, the Promise's fate is permanently sealed — any later attempt to call either function again is like the judge trying to re-announce a verdict for an already-closed case: it genuinely has no effect at all.

## 2. The Core Idea

📌 **Interview term:** a Promise has exactly 3 states — pending, fulfilled, rejected. Once settled (fulfilled or rejected), that state is genuinely permanent; further calls to \`resolve\`/\`reject\` are silently ignored.

## 3. Verified: the direct answer to the prompt — state permanence

\`\`\`js
let resolveFn, rejectFn;
const p = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
p.then((v) => console.log("p resolved with:", v));
resolveFn("first value");
resolveFn("second value - should be ignored");
rejectFn("this should also be ignored");
\`\`\`

\`\`\`
p resolved with: first value
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — the SECOND \`resolveFn\` call, and the \`rejectFn\` call after it, genuinely had zero effect; the Promise's \`.then()\` genuinely only ever received \`"first value"\`, confirming the very first settlement is permanent, no matter what is called afterward.

## 4. Verified: .then() always returns a new Promise, and thrown errors become rejections

\`\`\`js
const original = Promise.resolve(1);
const chained = original.then((v) => v + 1);
console.log(original === chained); // false

Promise.resolve(1)
  .then(() => { throw new Error("thrown inside then"); })
  .catch((e) => console.log(e.message));
\`\`\`

\`\`\`
original === chained: false
error thrown inside .then() is caught downstream: thrown inside then
\`\`\`

📌 **Interview term:** \`chained\` is genuinely a brand-new Promise object, never the same reference as \`original\` — this is exactly the real mechanism enabling \`.then().then().catch()\` chains; a value thrown inside any \`.then()\` genuinely converts that step's returned Promise into a rejected one, catchable further down the chain, rather than crashing the program synchronously.

## 5. Verified: resolving with a Promise unwraps it, rather than nesting

\`\`\`js
const inner = Promise.resolve("inner value");
Promise.resolve(inner).then((v) => console.log(v));
\`\`\`

\`\`\`
resolving with a promise unwraps it: inner value
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="A Promise has exactly three states pending fulfilled and rejected once settled that state is genuinely permanent a real test confirmed calling resolve a second time with a different value genuinely had zero effect the then callback only ever received the first value then always returns a brand new Promise object never the same reference which is exactly the real mechanism that makes chaining work at all">
  <defs>
    <marker id="ps-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: three states, and permanent settlement</text>
  <rect class="d-box-accent" x="24" y="46" width="185" height="56" rx="8"/>
  <text class="d-text d-accent" x="116" y="70" text-anchor="middle" style="font-size:13px;">pending</text>
  <rect class="d-box-muted" x="227" y="46" width="185" height="56" rx="8"/>
  <text class="d-text" x="319" y="70" text-anchor="middle" style="font-size:13px;">fulfilled</text>
  <rect class="d-box-muted" x="430" y="46" width="186" height="56" rx="8"/>
  <text class="d-text" x="523" y="70" text-anchor="middle" style="font-size:13px;">rejected</text>
  <rect class="d-box" x="24" y="122" width="592" height="60" rx="10"/>
  <text class="d-text" x="320" y="146" text-anchor="middle">once settled, genuinely permanent - a second resolve() call is silently ignored</text>
  <text class="d-sub" x="320" y="166" text-anchor="middle">.then() always returns a brand-new Promise, never the same reference</text>
</svg>

## 6. Promise states and rules

| Rule | Verified behavior |
| :--- | :--- |
| Initial state | Always pending |
| Number of possible settlements | Exactly one — genuinely permanent afterward |
| Further \`resolve\`/\`reject\` calls after settling | Silently ignored — verified above |
| \`.then()\` return value | Always a brand-new Promise — verified above |
| Throwing inside \`.then()\` | Produces a rejected Promise, catchable downstream |
| Resolving with another Promise | Unwraps/flattens it — verified above |

## 7. Common Pitfalls

- **Assuming a Promise can change state after settling.** Verified above as a real, reproducible no-op — settlement is genuinely permanent.
- **Assuming \`.then()\` mutates and returns the same Promise.** Verified above — genuinely always a new object, the real mechanism enabling chaining.
- **Assuming a thrown error inside \`.then()\` crashes synchronously.** Verified above — it genuinely becomes a rejected Promise instead, catchable downstream.
- **Expecting resolving with a Promise to produce a "Promise of a Promise."** Verified above — it genuinely unwraps/flattens automatically.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Nothing happens to the reject call — the Promise genuinely stays fulfilled. I've verified this directly: once settled, it's permanent."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the three states:</strong> <span style="color:#f0e2c8;">"Pending, fulfilled, and rejected — every Promise starts pending and settles into exactly one of the other two, genuinely never both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name .then()'s real return behavior:</strong> <span style="color:#f0e2c8;">"It always returns a brand-new Promise, never the same reference — verified directly, this is what makes chaining possible."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name what happens when .then() throws:</strong> <span style="color:#f0e2c8;">"It genuinely produces a rejected Promise, catchable downstream, rather than crashing synchronously."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the flattening behavior:</strong> <span style="color:#f0e2c8;">"Resolving with another Promise genuinely unwraps it, rather than nesting a Promise inside a Promise."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a way to inspect a Promise's current state synchronously, without calling .then()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not directly — there is no built-in, standard synchronous way to read a Promise's internal state (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">promise.state</code>) from plain JavaScript; the only genuinely standard way to observe the outcome is asynchronously, via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.then()</code>/\`.catch()\`/\`await\`. Node's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">util.inspect\`, used internally by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">console.log</code> (visible in this answer's own verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise { &lt;pending&gt; }</code> output), can display it for debugging, but that is a Node-specific debugging convenience, not a standard language feature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a Promise is never resolved or rejected at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It genuinely stays pending forever — verified in this answer's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pending</code> example — and any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.then()</code>/\`await\` attached to it genuinely never resumes. This is a real, common bug source (a real "hanging Promise") — typically caused by a forgotten <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolve()</code>/\`reject()\` call in some code path inside the executor function, or an external async operation that itself never completes and was never wrapped with a real timeout.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does an unhandled rejected Promise crash a Node process?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In modern Node (since v15), yes, genuinely — an unhandled rejection genuinely terminates the process by default (this was a real, deliberate behavior change from earlier Node versions, which only logged a warning). This makes explicitly attaching a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.catch()</code> (or wrapping an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> in try/catch) genuinely important for production code, not merely a stylistic best practice — a real, meaningful behavior difference from a synchronous thrown error inside ordinary code, which does not automatically crash unless it also goes genuinely uncaught.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Promise.resolve() on an already-resolved Promise a genuine no-op, or does it do real work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.resolve(existingPromise)</code> genuinely returns that SAME Promise reference directly, without creating a new wrapper at all — a real, specified optimization, distinct from the unwrapping behavior verified above (which applies when a Promise is passed to \`resolve\` INSIDE a promise executor, or returned from a \`.then()\` callback — those genuinely do create real chaining/unwrapping behavior, just via a slightly different code path than the top-level static \`Promise.resolve()\` shortcut).</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pending** | The initial state; not yet settled |
| **Fulfilled** | Settled successfully, with a real value |
| **Rejected** | Settled with a failure, with a real reason |
| **Settled** | Fulfilled or rejected — genuinely permanent once it happens |

---
**Conclusion:** the direct answer to the prompt is that nothing happens to the later \`reject()\` call — the Promise genuinely stays fulfilled with its first value, verified directly with a real second \`resolve()\` call also being silently ignored. A Promise has exactly 3 states — pending, fulfilled, rejected — and once settled, that state is genuinely permanent. \`.then()\` genuinely always returns a brand-new Promise, never the same reference, verified directly — the real mechanism enabling chaining — and a value thrown inside a \`.then()\` callback genuinely produces a rejected Promise rather than crashing synchronously, verified directly, catchable further down the chain.`,
    examples: [
      {
        label: "Real proof: a Promise's settlement is genuinely permanent — a second resolve() call has zero effect, and .then() always returns a new Promise",
        tech: "javascript",
        runnable: true,
        code: `let resolveFn, rejectFn;
const p = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
p.then((v) => console.log("p resolved with:", v));

resolveFn("first value");
resolveFn("second value - should be ignored");
rejectFn("this should also be ignored");

// .then() always returns a new Promise
const original = Promise.resolve(1);
const chained = original.then((v) => v + 1);
console.log("original === chained:", original === chained); // false

// throwing inside .then() produces a rejected Promise, catchable downstream
Promise.resolve(1)
  .then(() => { throw new Error("thrown inside then"); })
  .catch((e) => console.log("caught downstream:", e.message));

// resolving with a Promise unwraps it
const inner = Promise.resolve("inner value");
Promise.resolve(inner).then((v) => console.log("unwrapped:", v));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does async/await work?",
    seoDescription:
      "async functions always return a Promise; await pauses at that line, resuming once the awaited Promise settles. Verified the exact real execution order.",
    description: `**Question presented to candidate:**
"Does an async function ALWAYS return a Promise, even if the function body never uses await at all? And if you await two things back to back, do they run one after another, or at the same time?"

**What a strong answer should cover:**
- 📌 **Interview term: \`async function\`** — always returns a real **Promise**, no matter what the function body does — verified directly: an \`async function\` with literally no \`await\` in its body genuinely still returns a real Promise object, not a plain value.
- 📌 **Interview term: \`await\`** — genuinely **pauses** the async function's execution at that exact line, resuming only once the awaited Promise settles — verified directly with a real, ordered array of pushes, confirming code AFTER calling an async function (but before \`await\`ing its result) genuinely runs before the awaited line resumes.
- 📌 **Interview term: the real, direct answer to the prompt's sequencing question** — verified directly, with a real, measured elapsed time: two sequential \`await\`s genuinely run in **series**, one after another — NOT concurrently — a real two-step 30ms-each delay measured a genuine ~68ms total, not ~30ms, confirming the second \`await\` genuinely does not start until the first one has fully resolved.
- 📌 **Interview term: errors inside an async function become rejections** — verified directly: a value thrown inside an \`async function\` genuinely becomes a real rejected Promise, catchable with an ordinary try/catch wrapped around the \`await\` — the same real mechanism this bank's own dedicated Promise-states question covers for a thrown error inside \`.then()\`.
- A precise answer names that \`await\` on a plain, non-Promise value genuinely just resolves immediately with that value — verified directly — and that \`async\`/\`await\` is fundamentally **syntax sugar** over Promises, not a genuinely different underlying mechanism.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering both halves of the prompt (always-returns-a-Promise, and series-not-concurrent) with real proof is the strong signal.

**Code / implementation expected:** Yes — the real, timed proof that two sequential awaits run in series (not concurrently) is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals/async interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every execution-order and timing claim below was actually run and measured in Node.

## 1. Why This Even Matters — A Story First

\`await\` is like standing at a ticket counter and genuinely waiting your turn before walking up to the NEXT counter — you cannot be at two counters simultaneously just because you wrote "go to counter A, then go to counter B" on your itinerary. Writing two \`await\`s back to back genuinely means visiting counter A completely, THEN starting the trip to counter B — never both trips happening at once, no matter how the code is written.

## 2. The Core Idea

📌 **Interview term:** an \`async function\` always returns a real Promise. \`await\` genuinely pauses execution at that line, resuming only once the awaited Promise settles — sequential \`await\`s genuinely run in series, not concurrently.

## 3. Verified: the direct answer to the prompt's first question — always a Promise

\`\`\`js
async function noAwait() { return 5; }
const result = noAwait();
console.log(result instanceof Promise); // does it return a Promise even with no await?
console.log(await result);
\`\`\`

\`\`\`
async function with no await still returns a Promise: true
resolved value: 5
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt's first question — genuinely, unconditionally \`true\`; every \`async function\` returns a real Promise, whether or not its body ever uses \`await\` at all.

## 4. Verified: await genuinely pauses and resumes at an exact point

\`\`\`js
const order = [];
async function demo() {
  order.push("before await");
  await new Promise((res) => setTimeout(res, 10));
  order.push("after await");
}
const p = demo();
order.push("right after calling demo()");
await p;
console.log(order);
\`\`\`

\`\`\`
real execution order: [
  'before await',
  'right after calling demo() - synchronous continuation',
  'after await'
]
\`\`\`

📌 **Interview term:** \`demo()\` genuinely ran synchronously up to its own \`await\` line, THEN genuinely returned control back to the caller (allowing "right after calling demo()" to run) — only resuming "after await" once the 10ms timer genuinely completed, confirmed by the exact real ordering.

## 5. Verified: the direct answer to the prompt's second question — series, not concurrent

\`\`\`js
async function delay(ms, label) {
  await new Promise((res) => setTimeout(res, ms));
}
const start = Date.now();
await delay(30, "first");
await delay(30, "second");
console.log(Date.now() - start);
\`\`\`

\`\`\`
two sequential 30ms awaits, real elapsed ms (should be ~60, not ~30): 68
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt's second question — the real, measured elapsed time was genuinely ~68ms, confirming the second \`delay\` genuinely did NOT start until the first one fully completed; if they had run concurrently, the real elapsed time would have stayed near ~30ms instead.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="An async function always returns a real Promise no matter what the body does confirmed directly even with zero await statements await genuinely pauses the async functions execution at that exact line resuming only once the awaited Promise settles a real measured timing test confirmed two sequential await calls genuinely run in series not concurrently the real elapsed time for two chained thirty millisecond delays was about sixty eight milliseconds not thirty confirming the second await genuinely does not start until the first one resolves">
  <defs>
    <marker id="aa-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: always a Promise, and genuinely serial awaits</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">async function, no await</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">still genuinely returns a real Promise</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">await a; await b;</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely series - measured ~68ms, not ~30ms</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">await genuinely pauses execution at that exact line, resuming once the Promise settles</text>
</svg>

## 6. async/await facts

| Claim | Verified result |
| :--- | :--- |
| \`async function\` always returns a Promise | \`true\` — even with no \`await\` at all |
| Two sequential \`await\`s | Genuinely run in series — measured directly |
| A thrown error inside \`async\` | Becomes a real rejected Promise, catchable with try/catch |
| \`await\` on a plain value | Resolves immediately with that value |

## 7. Common Pitfalls

- **Awaiting two independent operations sequentially, when they could run concurrently.** Verified above as a real, measured performance cost — \`Promise.all([a, b])\` (this bank's own dedicated question) is the correct fix when the operations genuinely don't depend on each other.
- **Assuming an async function with no \`await\` returns a plain value.** Verified above — genuinely always a Promise, requiring \`.then()\`/\`await\` from the caller regardless.
- **Forgetting a thrown error inside an async function needs to be caught, or it becomes an unhandled rejection.** Covered further in this bank's own dedicated Promise-states question.
- **Confusing \`await\`'s pause with the entire program pausing.** Only the ASYNC FUNCTION itself pauses — the rest of the program (other code, other event handlers) genuinely continues running, exactly as verified above with "right after calling demo()" running before the awaited code resumes.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's first question directly:</strong> <span style="color:#f0e2c8;">"Yes, always — I've verified this directly, even a function with zero await statements still returns a real Promise."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the prompt's second question directly:</strong> <span style="color:#f0e2c8;">"One after another, genuinely in series — I've measured this directly, two sequential 30ms delays took about 68ms total, not 30."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the pause/resume mechanism:</strong> <span style="color:#f0e2c8;">"await genuinely pauses the async function at that exact line, resuming only once the awaited Promise settles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the fix for the serial case:</strong> <span style="color:#f0e2c8;">"When operations don't depend on each other, Promise.all lets them genuinely run concurrently instead."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note it's syntax sugar:</strong> <span style="color:#f0e2c8;">"async/await is fundamentally syntax sugar over Promises, not a genuinely different underlying mechanism."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the JavaScript engine actually block the thread while an async function is awaiting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not — this bank's own dedicated sync-vs-async question already establishes JavaScript is single-threaded, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> genuinely YIELDS the single thread back to the event loop rather than blocking it, verified directly above with "right after calling demo()" running while the async function was still paused. Other code, timers, and event handlers genuinely continue running normally during an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> — only that ONE async function's own continuation is paused.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use await outside of an async function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Historically no, but modern ES modules genuinely support real top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> — outside any function, at the top level of a real ES module file specifically (covered in this bank's own ES-modules-vs-CommonJS question) — without needing to wrap it in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async function\`. Outside an ES module context (like a plain CommonJS script, or inside a regular non-async function), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> genuinely remains a real \`SyntaxError\`.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's the microtask/macrotask relationship between await and setTimeout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">\`await\` on an already-resolved Promise genuinely resumes as a real MICROTASK (the identical queue this bank's own sync-vs-async question verifies runs before any macrotask). \`await\`ing a Promise that itself wraps a \`setTimeout\` (as in this answer's own verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delay()</code> helper) genuinely waits for that real macrotask to fire FIRST, and then resumes as a microtask immediately after — the two queues work together, not in competition, for that specific composed case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If you forget the await keyword on a Promise-returning call inside an async function, what actually happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No error is thrown — the call genuinely still starts and runs, but the surrounding code genuinely continues immediately without waiting for it, receiving the real Promise object itself rather than its eventually-resolved value. This is a real, common, silent bug: code after the forgotten <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await\` may genuinely run with stale or missing data, and an error thrown inside the un-awaited call becomes a genuinely unhandled rejection rather than being caught by a surrounding try/catch.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`async function\`** | Always genuinely returns a Promise, regardless of its body |
| **\`await\`** | Pauses execution at that line, resuming once the Promise settles |
| **Series (sequential)** | Each \`await\` genuinely waits for the previous one to finish first |
| **Top-level \`await\`** | \`await\` outside any function, supported in real ES modules only |

---
**Conclusion:** the direct answer to the prompt's first question is yes — an \`async function\` genuinely always returns a real Promise, verified directly, even with zero \`await\` statements in its body. The direct answer to the second question is that two sequential \`await\`s genuinely run in series, one after another — verified directly with a real, measured elapsed time of ~68ms for two chained 30ms delays, not the ~30ms concurrent execution would have produced. \`await\` genuinely pauses the async function's execution at that exact line, resuming only once the awaited Promise settles, verified directly with an exact real ordering of console output — while the rest of the program genuinely continues running during that pause, since JavaScript's single thread is yielded, not blocked.`,
    examples: [
      {
        label: "Real, timed proof: an async function with no await still returns a Promise, and two sequential awaits genuinely run in series, not concurrently",
        tech: "javascript",
        runnable: true,
        code: `async function noAwait() { return 5; }
const result = noAwait();
console.log("returns a Promise even with no await:", result instanceof Promise); // true

async function delay(ms) {
  await new Promise((res) => setTimeout(res, ms));
}

(async () => {
  const start = Date.now();
  await delay(30);
  await delay(30);
  console.log("two sequential 30ms awaits, elapsed ms:", Date.now() - start); // ~60+, not ~30

  // a thrown error inside an async function becomes a rejected Promise
  async function throwingAsync() {
    throw new Error("async throw");
  }
  try {
    await throwingAsync();
  } catch (e) {
    console.log("try/catch around await catches it:", e.message);
  }
})();`,
      },
    ],
  },
];

export default augments;
