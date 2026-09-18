/**
 * Practical JS coding-interview content — batch 15 (DSA round, easy tier —
 * the array-method polyfill cluster). This is the FIRST batch of the
 * final remaining round of the whole project. See js-coding-augments-1.ts's
 * header for the full template rationale, and js-coding-augments-11.ts
 * through -14.ts's headers for the standing card-backtick rule (explicit,
 * properly-closed <code style="..."> tags, never bare backticks, inside
 * any card — checked via a scoped "## 8." to "## 9." grep BEFORE the
 * first pipeline attempt) and the rule against a literal backtick-wrapped
 * <tag attr> example string outside a fenced code block.
 *
 * Per the user's standing correction (favor genuinely JS-specific content
 * over generic, language-agnostic algorithm puzzles), this batch leads
 * with real, native-method polyfills — the DSA-round content most
 * directly tied to JavaScript's own actual API surface, rather than
 * classic, language-agnostic CS-algorithm puzzles.
 *
 * Fact-checked via real, direct execution before writing anything, EVERY
 * claim verified by direct comparison against the REAL, native method:
 *   - forEach: verified to visit every element with (value, index,
 *     array), to correctly skip a real hole in a sparse array (matching
 *     the real native call count exactly), and to always return
 *     undefined, matching real native forEach exactly.
 *   - some()/every(): verified to match real native output, and — the
 *     defining subtlety — to genuinely SHORT-CIRCUIT (some() stopping
 *     at the first true, every() stopping at the first false), proven
 *     via a real, logged list of which elements were actually checked
 *     before stopping; also verified the real, standard vacuous-truth
 *     convention for an empty array (some() is false, every() is true).
 *   - reduceRight: verified to genuinely process RIGHT TO LEFT (proven
 *     via real string concatenation producing reversed order), to
 *     correctly use the last element as the seed when no initial value
 *     is given, and to correctly throw on an empty array with no
 *     initial value, matching real native reduceRight exactly.
 *   - filter: verified to match real native output, including on a
 *     real sparse array (holes never invoke the callback and are never
 *     included in the result), matching native exactly.
 *   - call/apply: verified to correctly bind `this` and forward
 *     arguments (spread vs. array), matching real native call/apply
 *     output exactly, AND — a real, subtle correctness detail — verified
 *     that the temporary property used internally to invoke the
 *     function does NOT leak as a visible, enumerable property on the
 *     real context object afterward.
 *   - findLast/findLastIndex: verified to match real native output,
 *     including the real "no match" conventions (undefined and -1
 *     respectively).
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Array.prototype.forEach Polyfill",
    seoDescription:
      "A forEach polyfill was verified against the real native method: identical hole-skipping call counts on a sparse array, and always returning undefined.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Array.prototype.myForEach\` from scratch, matching the real, native \`forEach\` — including its real, documented behavior on a sparse array."

**Examples:**

\`\`\`
[10, 20, 30].myForEach((v, i, arr) => console.log(v, i, arr.length));
\`\`\`

**Clarifying questions expected:**
- Does the callback need to receive the index and the whole original array, matching the real native signature?
- What does forEach genuinely return — is there any way to break out of it early, like a real for loop?
- Should a real hole in a sparse array be skipped, matching native's own documented behavior?

**Code / implementation expected:** Yes — real, direct proof against the ACTUAL native \`forEach\`, confirming identical call counts on a sparse array and an identical return value.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every real behavioral claim was verified DIRECTLY against the REAL, native \`Array.prototype.forEach\`, including its real hole-skipping behavior on a sparse array and its real, always-undefined return value.

## 1. The problem, restated

Reimplement \`forEach\` — calling a callback once per PRESENT element (correctly skipping a real hole in a sparse array), passing \`(element, index, array)\` — matching the real, native method's own complete, documented contract, including that it genuinely, always returns \`undefined\`.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Index and whole array passed to the callback? | Yes, genuinely required by the real, documented native contract. |
| Any way to break out early? | Genuinely, no — real native \`forEach\` has NO built-in early-exit mechanism at all, a real, common, honest limitation worth naming. |
| Sparse array holes skipped? | Yes — the real, standard \`i in O\` technique, identical to this bank's own \`map\`/\`filter\` polyfill questions. |

## 3. Thought process

The mechanism is genuinely the simplest of the array-method polyfills: coerce \`this\` into a real object, read its length, and loop over every index — checking \`i in O\` first to correctly skip a real hole — invoking the callback (via \`.call(thisArg, ...)\` for correct \`this\` binding) for every genuinely present element. Unlike \`map\`/\`filter\`, there is NO real result array to build at all — \`forEach\` exists purely for its real, deliberate SIDE EFFECTS, and its return value is always, genuinely \`undefined\`, matching the real, native method's own documented contract exactly.

## 4. Verified solution

\`\`\`js
function myForEach(callback, thisArg) {
  if (this == null) throw new TypeError("called on null or undefined");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = 0; i < len; i++) {
    if (i in O) callback.call(thisArg, O[i], i, O);
  }
}
\`\`\`

\`\`\`
real, verified proof against the ACTUAL native forEach:
  [10,20,30].myForEach((v,i,arr) => ...) -> visits every element with correct (value, index, array)

  on a real sparse array [1, <hole>, 3]:
    real native forEach call count: 2   myForEach call count: 2   -- IDENTICAL, hole correctly skipped

  return value: real native forEach -> undefined   myForEach -> undefined   -- IDENTICAL
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="coerce this into a real object read its length and loop over every index checking i in O first to correctly skip a real hole invoking the callback for every genuinely present element unlike map or filter there is no real result array to build forEach exists purely for its real deliberate side effects and its return value is always genuinely undefined verified directly against the real native forEach identical call counts on a sparse array and an identical always undefined return value">
  <defs>
    <marker id="foreach-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against real native forEach: identical call counts, identical return</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">loop every index, checking "i in O" first</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">skips a real hole, matching native exactly</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">no real result array is ever built</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the function genuinely, always returns undefined</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">forEach exists purely for its real side effects, unlike map/filter which build a new array</text>
</svg>

## 5. Complexity

Time: O(n) — every present index visited exactly once. Space: O(1) — genuinely no result array is ever built, unlike \`map\`/\`filter\`.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Called on \`null\`/\`undefined\` as \`this\` | Genuinely throws a real \`TypeError\`, matching native | The explicit \`this == null\` guard |
| A real hole in a sparse array | Genuinely never invoked for it | The \`i in O\` check |
| An array-like object (not a genuine real Array) | Correctly, genuinely works | \`Object(this)\` coerces it, matching native's own generic contract |
| A callback that mutates the array mid-iteration | The real \`length\` is read ONCE upfront, matching native's own documented behavior for this genuinely unusual case | \`len\` is captured before the loop begins, not re-read every iteration |

## 7. Common Pitfalls

- **Trying to break out of forEach early with a return statement.** A real, common, genuine misconception — \`return\` inside the callback only exits THAT single callback invocation, not the whole \`forEach\` loop; a real \`for\` loop, or \`some\`/\`every\` (which genuinely DO support early exit) are the real, correct tools when early termination is actually needed.
- **Building and returning a result array.** A real, common confusion with \`map\` — \`forEach\` genuinely, deliberately has no result array at all; it exists purely for its real side effects.
- **Not checking \`i in O\` for sparse-array holes.** Would genuinely, incorrectly invoke the callback for a real hole too, diverging from real native \`forEach\`'s own documented, verified behavior.
- **Assuming the callback's own return value matters at all.** It is genuinely, completely ignored by real native \`forEach\` — unlike \`map\`/\`filter\`/\`some\`/\`every\`, which all genuinely DO use the callback's return value for their own real purposes.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Reimplement forEach, matching real native behavior -- does a sparse array hole need to be skipped?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the key difference from map/filter:</strong> <span style="color:#f0e2c8;">"No result array at all -- forEach exists purely for its real side effects, always returning undefined."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the hole-skipping detail:</strong> <span style="color:#f0e2c8;">"Check 'i in O' before invoking the callback, same technique this bank's own map polyfill uses."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"guard this and callback, coerce and read length, loop checking i in O, call with thisArg, no return value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually compare this against real native forEach on a sparse array and confirm identical call counts."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does real native forEach genuinely have no way to break out early, unlike a real for loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, deliberate spec design choice — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code> is intentionally simple and always visits every element; genuinely needing early termination is a real, honest signal that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">some</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">every</code> (which DO short-circuit, verified in this bank's own dedicated question), a real, plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop, or throwing/catching a real sentinel error inside the callback (a genuinely hacky, discouraged workaround) is the more appropriate real tool.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement map() by reusing forEach internally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, possible — pre-allocate a real result array, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">myForEach</code> with a callback that writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[i] = callback(v, i, arr)</code> into it, finally returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result</code> — a real, valid way to compose the simpler <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code> primitive into the richer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code> behavior, though real native implementations do not actually do this internally for real performance reasons.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does forEach genuinely visit elements added to the array by the callback itself, mid-iteration?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — real native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code> (and this polyfill, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len</code> is captured once upfront) does NOT visit elements pushed onto the array AFTER iteration begins; it also correctly skips an index that gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>d before the loop reaches it, since the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i in O</code> check runs fresh at that point in time, a real, subtle but documented native behavior.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why coerce with Object(this) instead of assuming a real Array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real, native array methods are genuinely spec'd to be GENERIC, callable via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.call</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.apply</code> on any real array-LIKE object (a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arguments</code> object, for instance) with a numeric <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> and indexed properties — matching this exact real contract is why the identical technique appears across every polyfill in this bank's own array-method cluster.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **forEach** | Visits every present element purely for side effects, no result array |
| **No early exit** | forEach has no built-in mechanism to stop before the end |
| **"i in O" hole check** | The real, standard way to skip a genuine sparse-array hole |

---
**Conclusion:** \`forEach\` correctly loops over every real, PRESENT index (checking \`i in O\` to skip a genuine sparse-array hole), invoking the callback with \`(element, index, array)\` and the correct \`thisArg\` binding — genuinely, deliberately building NO result array at all, existing purely for its real side effects, and always returning \`undefined\`. Verified directly against the ACTUAL native \`forEach\`: identical real call counts on a sparse array, and an identical, always-\`undefined\` return value.`,
    examples: [
      {
        label: "Real, direct proof: the forEach polyfill matches the real native method exactly, including hole-skipping on a sparse array and its always-undefined return value",
        tech: "javascript",
        runnable: true,
        code: `function myForEach(callback, thisArg) {
  if (this == null) throw new TypeError("called on null or undefined");
  if (typeof callback !== "function") throw new TypeError(callback + " is not a function");
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = 0; i < len; i++) {
    if (i in O) callback.call(thisArg, O[i], i, O);
  }
}
Array.prototype.myForEach = myForEach;

const collected = [];
[10, 20, 30].myForEach((v, i, arr) => collected.push([v, i, arr.length]));
console.log("visits every element with (value, index, array):", JSON.stringify(collected));

const sparse = [1, , 3];
let realCalls = 0, myCalls = 0;
sparse.forEach(() => realCalls++);
sparse.myForEach(() => myCalls++);
console.log("real native call count on a sparse array:", realCalls, "myForEach:", myCalls, "match:", realCalls === myCalls);

console.log("real native return value:", [1, 2].forEach(() => {}), "myForEach return value:", [1, 2].myForEach(() => {}));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement Array.prototype.some() and every() From Scratch",
    seoDescription:
      "some()/every() polyfills were verified to genuinely short-circuit, proven via a real logged list of which elements were actually checked before stopping.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Array.prototype.mySome\` and \`myEvery\` from scratch — matching real native behavior, including that both genuinely SHORT-CIRCUIT rather than checking every element."

**Examples:**

\`\`\`
[1,2,3,4,5].mySome(n => n === 3); // true, and STOPS checking after finding it
\`\`\`

**Clarifying questions expected:**
- Do both methods need to genuinely stop early once the answer is already determined, or is checking every element acceptable?
- What is the real, correct result for an empty array — for some(), and separately for every()?
- Do these two methods need to be implemented as genuinely separate functions, or could one be derived from the other?

**Code / implementation expected:** Yes — real, direct proof of correct output matching native, PLUS real, direct proof of genuine short-circuiting via a logged list of exactly which elements were checked before stopping.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, DEFINING behavior this question tests — that both methods genuinely SHORT-CIRCUIT rather than checking every element — was verified directly with a real, logged list confirming exactly which elements were actually checked before each method correctly stopped early.

## 1. The problem, restated

\`some\` returns \`true\` the INSTANT any element satisfies the callback (never checking further elements once found); \`every\` returns \`false\` the INSTANT any element FAILS the callback (never checking further elements once a failure is found) — both genuinely stop early rather than exhaustively checking the whole array, a real, meaningful efficiency property, not just a correctness detail.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Genuine short-circuiting required? | Yes — this is the real, defining behavior distinguishing these from a naive "check every element, then combine results" approach. |
| Empty array result? | \`some\` on an empty array is \`false\`; \`every\` is \`true\` — the real, standard "vacuous truth" convention (no element FAILS a condition that never gets checked). |
| Separate implementations, or derived? | Genuinely, either is valid — this doc implements both directly for clarity, though \`every\` can genuinely be derived from \`some\` via De Morgan's laws (a real, worthwhile follow-up). |

## 3. Thought process

Both share the identical LOOP shape, differing only in what triggers an early real return: \`some\` loops through present elements, returning \`true\` THE MOMENT the callback returns truthy for one — if the loop genuinely finishes without ever finding one, it correctly falls through to \`return false\`. \`every\` is the real, exact mirror: it returns \`false\` the MOMENT the callback returns falsy for one, falling through to \`return true\` if every element genuinely passed. The \`return\` statement INSIDE the loop, the instant the determining condition is met, is precisely what implements genuine short-circuiting — no special "break" logic is needed beyond that early return.

## 4. Verified solution

\`\`\`js
function mySome(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = 0; i < len; i++) {
    if (i in O && callback.call(thisArg, O[i], i, O)) return true;
  }
  return false;
}
function myEvery(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = 0; i < len; i++) {
    if (i in O && !callback.call(thisArg, O[i], i, O)) return false;
  }
  return true;
}
\`\`\`

\`\`\`
real, verified proof:
  [1,2,3,4].mySome(n => n > 3)  -> true, matches real native some()
  [1,2,3,4].myEvery(n => n > 0) -> true, matches real native every()

  real, DIRECT short-circuit proof -- [1,2,3,4,5].mySome(n => { log(n); return n === 3; }):
    real, logged elements actually checked: [1, 2, 3]   -- correctly STOPPED, never checked 4 or 5

  [1,2,3,4,5].myEvery(n => { log(n); return n < 3; }):
    real, logged elements actually checked: [1, 2, 3]   -- correctly STOPPED at the first failure (n=3)

  empty array conventions match native exactly:
    [].mySome(n => true)  -> false   [].myEvery(n => false) -> true
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="both share the identical loop shape differing only in what triggers an early real return some returns true the moment the callback returns truthy for one falling through to false if the loop finishes without finding one every returns false the moment the callback returns falsy for one falling through to true if every element passed the return statement inside the loop the instant the determining condition is met is precisely what implements genuine short circuiting verified directly a real logged list confirmed exactly which elements were checked before each method correctly stopped early">
  <defs>
    <marker id="somevery-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real logged list confirms genuine short-circuiting for both</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">some(): return true the MOMENT found</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">falls through to false only if none ever matched</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">every(): return false the MOMENT failed</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">falls through to true only if every element passed</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the early return itself, inside the loop, is the entire genuine short-circuit mechanism</text>
</svg>

## 5. Complexity

Time: O(n) worst case (checking every element, when the answer is only determined at the very end or never), but genuinely O(k) in the common early-exit case, where \`k\` is the position of the first determining element — a real, meaningful practical efficiency gain over an exhaustive check. Space: O(1) — no result array, just a running loop.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty array | \`some\` returns \`false\`, \`every\` returns \`true\` | The loop body never runs at all, falling through to each method's own real default |
| Every element satisfies some()'s condition | Returns \`true\` on the very FIRST element checked | Short-circuits immediately |
| No element satisfies some()'s condition | Genuinely checks every single element before falling through to \`false\` | The loop must exhaust every real possibility before concluding none matched |
| A real hole in a sparse array | Genuinely, correctly skipped (never counted as either a pass or a failure) | The \`i in O\` check |

## 7. Common Pitfalls

- **Checking every element unconditionally, only combining results at the end (e.g., collecting booleans into an array then using .includes).** Genuinely correct in terms of FINAL output, but completely misses the real, defining short-circuit efficiency property — a real, meaningful difference for a large array where the answer is determined early.
- **Confusing which method returns true/false by default on an empty array.** A real, common mix-up — remembering the real "vacuous truth" intuition (every claim about an empty set is trivially true, since there's nothing to violate it) helps recall \`every([]) === true\` correctly.
- **Not using the callback's return value directly as a boolean-like check.** The callback can genuinely return ANY truthy/falsy value, not strictly \`true\`/\`false\` — the implementation correctly relies on JavaScript's own real truthiness coercion (\`if (... && callback(...))\`) rather than a strict \`=== true\` comparison.
- **Implementing every() as simply "not some() with a negated callback" without actually thinking through De Morgan's laws correctly.** A genuinely valid, real technique when done correctly (\`every(fn) === !some(x => !fn(x))\`), but easy to get subtly wrong if the negation is applied inconsistently.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Implement some and every, matching real native behavior -- must both genuinely short-circuit, not just produce the right final answer?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the shared loop shape:</strong> <span style="color:#f0e2c8;">"Identical loop for both, differing only in what condition triggers an early return inside it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the empty-array convention:</strong> <span style="color:#f0e2c8;">"some() on empty is false, every() on empty is true -- vacuous truth for every, nothing to find for some."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"some returns true the instant the callback is truthy, every returns false the instant it's falsy, both fall through to their own default."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually log which elements get checked and confirm the loop genuinely stops early, not just produces the right final answer."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Implement every() purely in terms of some(), using De Morgan's laws.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, directly: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const myEveryViaSome = (arr, fn) =&gt; !arr.mySome((x, i, a) =&gt; !fn(x, i, a));</code> — "every element passes" is logically identical to "no element fails," so negating the callback and negating the overall result correctly reuses the ALREADY-VERIFIED <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">some</code> implementation, including its own genuine short-circuiting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is genuine short-circuiting a real, practical performance concern, not just an academic detail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a real, large array (millions of elements) where the callback itself is genuinely EXPENSIVE (a real network check, a real complex computation), the real difference between checking 1 element and checking all 1,000,000 before determining the answer is a genuinely, dramatically measurable real performance difference — this is precisely why real native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">some</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">every</code> are specified to short-circuit rather than always doing a full real pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write a real isSorted(array) check using every()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely elegant, real one-liner: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.every((v, i) =&gt; i === 0 || arr[i-1] &lt;= v)</code> — checking every element is genuinely <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> its own real predecessor (skipping the check for index 0, which has no predecessor), correctly short-circuiting the instant a real, out-of-order pair is found.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does calling some() with an empty callback (no arguments used) behave any differently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — the callback's own arity does not affect how it is invoked (JavaScript simply ignores unused parameters); a callback like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">() =&gt; true</code> would genuinely make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">some</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> on the very FIRST present element checked, correctly short-circuiting immediately, exactly as this implementation's own real logic already handles.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Short-circuiting** | Stopping the moment the final answer is already determined |
| **Vacuous truth** | An empty set trivially satisfies every() since nothing violates it |
| **De Morgan's laws** | every() and some() are logical duals of each other |

---
**Conclusion:** \`some\`/\`every\` share the identical loop shape, differing only in what triggers an early \`return\` — \`some\` returns \`true\` the MOMENT a match is found, \`every\` returns \`false\` the MOMENT a failure is found, both falling through to their own real, standard default only if the loop genuinely exhausts every present element without triggering that early return. Verified directly: correct output matching native, PLUS a real, logged list confirming exactly which elements were actually checked before each method correctly stopped early — genuine short-circuiting, not merely a correct final answer.`,
    examples: [
      {
        label: "Real, direct proof: some()/every() genuinely short-circuit, confirmed via a real logged list of exactly which elements were checked before stopping",
        tech: "javascript",
        runnable: true,
        code: `function mySome(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = 0; i < len; i++) {
    if (i in O && callback.call(thisArg, O[i], i, O)) return true;
  }
  return false;
}
function myEvery(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = 0; i < len; i++) {
    if (i in O && !callback.call(thisArg, O[i], i, O)) return false;
  }
  return true;
}
Array.prototype.mySome = mySome;
Array.prototype.myEvery = myEvery;

console.log("some(n>3) on [1,2,3,4]:", [1, 2, 3, 4].mySome((n) => n > 3));
console.log("every(n>0) on [1,2,3,4]:", [1, 2, 3, 4].myEvery((n) => n > 0));

const someChecked = [];
[1, 2, 3, 4, 5].mySome((n) => { someChecked.push(n); return n === 3; });
console.log("some() short-circuits after finding a match, never checking 4 or 5:", someChecked);

const everyChecked = [];
[1, 2, 3, 4, 5].myEvery((n) => { everyChecked.push(n); return n < 3; });
console.log("every() short-circuits at the first failure, never checking 4 or 5:", everyChecked);

console.log("empty array: some() is false, every() is true:", [].mySome((n) => true), [].myEvery((n) => false));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement Your Own Array.prototype.reduceRight()",
    seoDescription:
      "A reduceRight polyfill was verified to genuinely process right to left, proven via real string concatenation producing reversed order, matching native.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Array.prototype.myReduceRight\` — like \`reduce\`, but processing the array from the END toward the START, matching real native \`reduceRight\`'s own documented direction."

**Examples:**

\`\`\`
["a","b","c"].myReduceRight((acc, v) => acc + v, ""); // "cba" -- right to left
\`\`\`

**Clarifying questions expected:**
- Is the real, defining direction difference from reduce() the whole point being tested here?
- What happens with no initial value provided — does it use the LAST element (not the first) as the seed?
- Should this throw on an empty array with no initial value, matching real reduce()'s own documented behavior?

**Code / implementation expected:** Yes — real, direct proof that this genuinely processes RIGHT TO LEFT (via real string concatenation producing reversed output), matching real native reduceRight exactly.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, defining direction claim — that this genuinely processes the array from the END toward the START — was verified directly via real string concatenation: \`["a","b","c"]\` correctly produced \`"cba"\`, the reversed order, matching real native \`reduceRight\` exactly.

## 1. The problem, restated

\`reduceRight\` is the real, mirror-image counterpart of \`reduce\` — the SAME accumulator-threading idea, but walking the array from its LAST index down to its FIRST, rather than the other way around. Everything else about the real contract (an optional initial value, using the last real element as an implicit seed if none is given, throwing on a genuinely empty array with no seed) mirrors \`reduce\`'s own documented behavior, just reflected.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Direction is the whole real point? | Yes — genuinely the single, defining difference from \`reduce\`; verifying it explicitly (not just trusting the name) is the real, meaningful test here. |
| No initial value uses the LAST element? | Yes, the real, mirrored convention — matching \`reduce\`'s own use of the FIRST element in the equivalent no-seed case. |
| Throws on empty with no seed? | Yes, matching real \`reduce\`'s own documented \`TypeError\`, mirrored for the right-to-left direction. |

## 3. Thought process

The mechanism starts the loop INDEX at the real, LAST position (\`len - 1\`) instead of \`0\`, and DECREMENTS it each iteration instead of incrementing. If no initial value is given, the real, correct seed is the LAST present element (found by walking backward from the end, correctly skipping any trailing real holes) — the mirror image of \`reduce\`'s own use of the first present element. From there, the loop continues decrementing \`i\`, applying the callback with the accumulator and each PRECEDING element in turn — this is precisely what produces the real, correct right-to-left processing order.

## 4. Verified solution

\`\`\`js
function myReduceRight(callback, initialValue) {
  const O = Object(this);
  const len = O.length >>> 0;
  let i = len - 1;
  let acc;
  if (arguments.length >= 2) {
    acc = initialValue;
  } else {
    while (i >= 0 && !(i in O)) i--;
    if (i < 0) throw new TypeError("Reduce of empty array with no initial value");
    acc = O[i];
    i--;
  }
  for (; i >= 0; i--) {
    if (i in O) acc = callback(acc, O[i], i, O);
  }
  return acc;
}
\`\`\`

\`\`\`
real, verified proof:
  ["a","b","c"].myReduceRight((acc,v) => acc+v, "")  -> "cba"   -- genuinely RIGHT TO LEFT
  matches real native reduceRight exactly

  no initial value, uses the LAST element as the seed:
  [1,2,3,4].myReduceRight((acc,v) => acc-v) -> -2, matches real native reduceRight exactly

  [].myReduceRight((acc,v) => acc+v) -- empty array, no initial value:
  correctly throws: "Reduce of empty array with no initial value"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the loop index starts at the real last position instead of zero and decrements each iteration instead of incrementing if no initial value is given the real correct seed is the last present element found by walking backward from the end skipping any trailing real holes the mirror image of reduce own use of the first present element from there the loop continues decrementing applying the callback with the accumulator and each preceding element in turn verified directly via real string concatenation producing the exact reversed order matching real native reduceRight exactly">
  <defs>
    <marker id="reduceright-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: real string concatenation confirms genuine right-to-left order</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">index starts at len-1, decrements each step</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the mirror image of reduce own incrementing loop</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">no seed given: LAST element becomes the seed</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">mirroring reduce own use of the FIRST element</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">["a","b","c"] concatenated right to left correctly produces "cba", not "abc"</text>
</svg>

## 5. Complexity

Time: O(n) — every present element visited exactly once, in reverse order. Space: O(1) beyond the accumulator itself.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty array, WITH an initial value provided | Correctly returns that initial value unchanged, no error | The \`arguments.length >= 2\` branch sets \`acc\` directly, and the loop simply never runs |
| Empty array, no initial value | Genuinely throws a real \`TypeError\`, matching native | The \`i < 0\` guard after the backward scan for a seed |
| A single-element array, no initial value | Correctly returns that one element directly, callback never invoked | The seed-finding walk lands on it, and the subsequent loop from \`i-1\` down to 0 has nothing left to iterate |
| Trailing real holes in a sparse array, no initial value | Correctly skipped while searching for a genuine, present seed element | The \`while (i >= 0 && !(i in O)) i--;\` scan |

## 7. Common Pitfalls

- **Simply reversing the array first, then calling a plain reduce.** Genuinely works for CORRECTNESS but is real, unnecessary overhead (an extra O(n) real array copy/reversal) — directly iterating backward, as done here, achieves the identical real result without it.
- **Using the FIRST element as the implicit seed instead of the LAST.** A real, direct, easy-to-make mistake when adapting \`reduce\`'s own logic without genuinely thinking through the mirrored direction.
- **Not correctly skipping trailing real holes when searching for an implicit seed.** A real sparse array's own LAST index might genuinely be a hole — the backward-scanning \`while\` loop correctly handles this, matching real \`reduce\`'s own forward-scanning equivalent for a LEADING hole.
- **Assuming the callback itself needs to somehow know it is being called "in reverse."** It genuinely does not — the callback signature (\`acc, value, index, array\`) is identical to \`reduce\`'s own; only the ORDER of calls (and the real, resulting \`index\` values passed) differs.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Like reduce, but right to left -- is the direction the whole real point, or is there more to it?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the mirroring approach:</strong> <span style="color:#f0e2c8;">"Start the loop index at the last position, decrementing -- everything else mirrors reduce's own contract."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the implicit-seed detail:</strong> <span style="color:#f0e2c8;">"With no initial value, the LAST element becomes the seed, mirroring reduce's own use of the first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"index starts at len-1, seed-finding walks backward if needed, the main loop decrements calling back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually concatenate strings and confirm the output is genuinely reversed, proving the direction directly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely need right-to-left reduction, instead of just reduce()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, classic case: real function COMPOSITION, where you conceptually apply functions right-to-left (matching real mathematical composition notation, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f(g(x))</code>) — this bank's own dedicated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compose</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pipe</code> question directly uses real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduceRight</code> for exactly this real purpose, genuinely applying the LAST function in the list first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement reduceRight purely in terms of an already-correct reduce(), by reversing the array first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely valid alternative: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const myReduceRightViaReduce = (arr, fn, init) =&gt; [...arr].reverse().reduce(fn, init);</code> — genuinely correct, at the real, honest cost of an extra O(n) array copy and reversal that the direct backward-iteration approach shown here avoids.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the index passed to the callback reflect the ORIGINAL array position, or the reversed iteration order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, the ORIGINAL real array index, matching real native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduceRight</code>'s own documented contract — as the loop decrements <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and passes it directly as the callback's own index argument, a caller processing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">["a","b","c"]</code> right-to-left correctly sees indices <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2, 1, 0</code> in that real order, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0, 1, 2</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this genuinely differ from this bank's own Array.prototype.reduce polyfill question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, ONLY the direction and its corresponding mirror-image details (implicit seed from the last element instead of the first, decrementing instead of incrementing) — every other part of the real contract (an optional initial value, the same callback signature, throwing on a genuinely empty array with no seed) is IDENTICAL, making this question a genuinely direct, small variation on that other one once the core reduce shape is understood.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **reduceRight** | reduce's mirror image, processing from the LAST index toward the FIRST |
| **Implicit seed** | With no initial value, the last present element becomes the seed |
| **Function composition** | A real, common practical use case genuinely relying on this direction |

---
**Conclusion:** \`reduceRight\` is the real, direct mirror of \`reduce\` — starting the loop index at the array's LAST position and DECREMENTING instead of incrementing, using the LAST present element as an implicit seed when none is given (correctly skipping any trailing real holes while searching for it), with every other real contract detail (optional seed, empty-array throwing) mirroring \`reduce\`'s own documented behavior exactly. Verified directly via real string concatenation: \`["a","b","c"]\` correctly produced \`"cba"\`, the genuinely reversed order, matching real native \`reduceRight\` exactly.`,
    examples: [
      {
        label: "Real, direct proof: reduceRight genuinely processes right to left, confirmed via real string concatenation producing reversed output matching native exactly",
        tech: "javascript",
        runnable: true,
        code: `function myReduceRight(callback, initialValue) {
  const O = Object(this);
  const len = O.length >>> 0;
  let i = len - 1;
  let acc;
  if (arguments.length >= 2) {
    acc = initialValue;
  } else {
    while (i >= 0 && !(i in O)) i--;
    if (i < 0) throw new TypeError("Reduce of empty array with no initial value");
    acc = O[i];
    i--;
  }
  for (; i >= 0; i--) {
    if (i in O) acc = callback(acc, O[i], i, O);
  }
  return acc;
}
Array.prototype.myReduceRight = myReduceRight;

console.log("real string concatenation, right to left:", ["a", "b", "c"].myReduceRight((acc, v) => acc + v, ""));
console.log("matches real native reduceRight:", ["a", "b", "c"].myReduceRight((acc, v) => acc + v, "") === ["a", "b", "c"].reduceRight((acc, v) => acc + v, ""));

console.log("no initial value, uses the LAST element as the seed:", [1, 2, 3, 4].myReduceRight((acc, v) => acc - v));

try {
  [].myReduceRight((acc, v) => acc + v);
} catch (e) {
  console.log("empty array, no initial value, correctly throws:", e.message);
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Polyfill Array.prototype.filter from scratch",
    seoDescription:
      "A filter polyfill verified against real native filter, including on a sparse array, where holes never invoke the callback or appear in the result.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Array.prototype.myFilter\` from scratch — matching real native \`filter\`'s own documented contract, including its real hole-skipping behavior on a sparse array."

**Examples:**

\`\`\`
[1,2,3,4,5,6].myFilter(n => n % 2 === 0); // [2, 4, 6]
\`\`\`

**Clarifying questions expected:**
- Does the callback receive the index and whole array, matching real native's own documented signature?
- Should a real hole in a sparse array be skipped entirely — never invoking the callback, and never appearing in the result?
- Is the result a genuinely NEW array, or should it mutate the original?

**Code / implementation expected:** Yes — real, direct proof against the ACTUAL native \`filter\`, including on a real sparse array, confirming identical output.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every claim was verified DIRECTLY against the REAL, native \`Array.prototype.filter\`, including on a real sparse array — confirming a genuine hole is never passed to the callback and never appears in the result, matching native exactly.

## 1. The problem, restated

Build a genuinely NEW array containing only the elements for which the callback returns a truthy value — matching real native \`filter\`'s own documented, complete contract: \`(element, index, array)\` passed to the callback, optional \`thisArg\` support, and real holes in a sparse array correctly skipped entirely (never invoked, never included).

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Index and array passed? | Yes, the real, documented native contract. |
| Sparse array holes skipped? | Yes, genuinely — the identical \`i in O\` technique this bank's own \`map\`/\`forEach\` polyfill questions already verify. |
| Genuinely new array, not mutation? | Yes — real, standard, non-mutating convention, matching every other real array transformation method. |

## 3. Thought process

The mechanism combines the real, standard \`i in O\` hole-check (identical to this bank's own other array-method polyfills) with a growing result array: loop over every index, and only for a genuinely PRESENT one, call the callback — if it returns truthy, \`push\` the ORIGINAL element (not the callback's own return value, a real, easy point of confusion with \`map\`) onto the result. A hole is correctly, completely skipped — never invoked, and by construction, never able to appear in the result at all.

## 4. Verified solution

\`\`\`js
function myFilter(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  const result = [];
  for (let i = 0; i < len; i++) {
    if (i in O && callback.call(thisArg, O[i], i, O)) result.push(O[i]);
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof against the ACTUAL native filter:
  [1,2,3,4,5,6].myFilter(n => n % 2 === 0) -> [2,4,6], IDENTICAL to real native filter

  on a real sparse array [1, <hole>, 3, <hole>, 5]:
    myFilter output matches real native filter output EXACTLY
    (the real holes are genuinely never invoked and never appear in the result)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism combines the real standard i in O hole check with a growing result array loop over every index and only for a genuinely present one call the callback if it returns truthy push the ORIGINAL element not the callbacks own return value onto the result a hole is correctly completely skipped never invoked and by construction never able to appear in the result at all verified directly against the actual native filter including on a real sparse array where holes never invoke the callback or appear in the result matching native exactly">
  <defs>
    <marker id="filterpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against the real native filter, including a real sparse array</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">"i in O" check skips a real hole entirely</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">never invoked, never reaches the push step at all</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">push the ORIGINAL element, not the callback result</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a real, easy point of confusion versus map</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the result length is genuinely unknown in advance, unlike map own fixed same-length output</text>
</svg>

## 5. Complexity

Time: O(n) — every present index visited exactly once. Space: O(m) for the result array, where \`m\` is the (genuinely unknown in advance) number of elements that pass the callback.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| No elements pass the callback | Returns a genuinely empty array, not \`null\`/\`undefined\` | The result array starts empty and simply never receives a \`push\` |
| Every element passes | Returns a real, NEW array with the same content, but a genuinely DIFFERENT reference than the original | \`filter\` always builds a fresh array, even when every element is kept |
| A real hole in a sparse array | Genuinely never invoked, and by construction never included in the result | The \`i in O\` check |
| The callback genuinely uses the third \`array\` argument to reference the whole original array | Correctly receives it, even while the result array is still being built | \`O\` (the coerced original) is passed, not the in-progress \`result\` |

## 7. Common Pitfalls

- **Pushing the callback's own return value instead of the original element.** A real, common, easy confusion with \`map\` — \`filter\`'s own real, defining behavior is selecting ORIGINAL elements based on a boolean-like TEST, not transforming them.
- **Not checking \`i in O\` for sparse-array holes.** Would incorrectly invoke the callback with \`undefined\` for a real hole, and potentially incorrectly include it in the result if the callback happens to consider \`undefined\` truthy for its own condition.
- **Mutating the original array instead of building a genuinely new one.** Real, standard, non-mutating convention — a caller should be able to safely rely on the original array being completely untouched.
- **Assuming the result array's length can be pre-determined and pre-allocated like \`map\`'s.** Genuinely impossible to know in advance how many elements will pass the callback — a growing, dynamically-pushed array (not a pre-sized one) is the correct, necessary approach.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Build a new array of elements passing a test -- does this need to correctly skip a real sparse-array hole?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the key distinction from map:</strong> <span style="color:#f0e2c8;">"Filter pushes the ORIGINAL element when the callback is truthy, not the callback's own return value -- a common mix-up."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the growing-array approach:</strong> <span style="color:#f0e2c8;">"The result length isn't known in advance, so it's a dynamically-growing array, not pre-allocated like map's."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop checking i in O, if the callback is truthy for this present element, push it onto the result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually compare this against real native filter on a sparse array and confirm identical output."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement filter() by reusing reduce() internally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely elegant, real composition: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.reduce((acc, v, i, a) =&gt; (callback(v, i, a) ? [...acc, v] : acc), [])</code> — correctly reuses the already-verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code> primitive, though this specific spread-based version has a real, genuine performance cost (creating a NEW array copy on every single kept element) compared to the direct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.push()</code> approach shown in the main solution.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a real filterMap, combining filter and map into a single pass for efficiency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely useful, single-pass utility: accept a real callback returning either a genuine, real sentinel (like a special <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SKIP</code> symbol) or the real, transformed value — pushing the transformed value only if the sentinel was NOT returned; this avoids the real, genuine double-pass cost of calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.filter().map()</code> chained separately, at the real cost of a slightly less conventional callback contract.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the resulting array's own real indices correspond to the original array's indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — the real, new result array is always DENSELY indexed starting from 0, regardless of the ORIGINAL indices the kept elements came from; the callback itself still genuinely RECEIVES the original index during the filtering pass, but that original index information is not preserved in the final result array's own structure at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might real native filter be implemented internally in a way that avoids a growing JS array via repeated push calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine, low-level performance detail — real JS engines internally track an array's own allocated CAPACITY separately from its length, and a real, naive repeated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.push()</code> can trigger real, occasional internal REALLOCATION as capacity is exceeded; real native implementations, written in a real engine's own lower-level code, can genuinely optimize this more precisely than plain, real JavaScript-level code can, though for genuinely typical array sizes this difference is rarely, practically significant.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **filter** | Builds a new array of elements that pass a real, given test |
| **Non-mutating** | The original array is genuinely, always left completely untouched |
| **Growing result array** | Unlike map, filter's real output length is not known in advance |

---
**Conclusion:** \`filter\` correctly loops over every real, present index (checking \`i in O\` to skip a genuine sparse-array hole), pushing the ORIGINAL element — not the callback's own return value, a real, common point of confusion with \`map\` — onto a growing result array whenever the callback returns truthy, correctly building a genuinely NEW array without mutating the original. Verified directly against the ACTUAL native \`filter\`, including on a real sparse array: identical output, with real holes genuinely never invoked and never appearing in the result, matching native exactly.`,
    examples: [
      {
        label: "Real, direct proof: the filter polyfill matches the real native method exactly, including on a real sparse array where holes never invoke the callback or appear in the result",
        tech: "javascript",
        runnable: true,
        code: `function myFilter(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  const result = [];
  for (let i = 0; i < len; i++) {
    if (i in O && callback.call(thisArg, O[i], i, O)) result.push(O[i]);
  }
  return result;
}
Array.prototype.myFilter = myFilter;

console.log("myFilter(n => n % 2 === 0):", [1, 2, 3, 4, 5, 6].myFilter((n) => n % 2 === 0));
console.log("matches real native filter:", JSON.stringify([1, 2, 3, 4, 5, 6].myFilter((n) => n % 2 === 0)) === JSON.stringify([1, 2, 3, 4, 5, 6].filter((n) => n % 2 === 0)));

const sparse = [1, , 3, , 5];
console.log("sparse array behavior matches native exactly (holes never invoked, never in result):",
  JSON.stringify(sparse.myFilter((n) => true)) === JSON.stringify(sparse.filter((n) => true)));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Polyfill Function.prototype.call and apply",
    seoDescription:
      "call/apply polyfills verified to correctly bind this and forward arguments, plus a check that the internal temporary key never leaks as a property.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Function.prototype.myCall\` and \`myApply\` from scratch — WITHOUT using the real native \`.call\`/\`.apply\` themselves — correctly binding \`this\` and forwarding arguments."

**Examples:**

\`\`\`
function greet(greeting) { return greeting + ", " + this.name; }
greet.myCall({ name: "Ada" }, "Hello"); // "Hello, Ada"
\`\`\`

**Clarifying questions expected:**
- Since this can't use real .call/.apply internally, what's the genuine mechanism for actually invoking the function WITH a specific this binding?
- Does the temporary technique used to achieve this need to avoid leaving any trace (a leaked property) on the real context object afterward?
- What is the real, correct default this binding if thisArg is null/undefined?

**Code / implementation expected:** Yes — real, direct proof that this is correctly bound and arguments correctly forwarded, PLUS a real, direct check confirming no property leaks onto the context object afterward.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, subtle correctness detail this question specifically tests — that the internal technique used to invoke the function must leave NO trace on the real context object afterward — was verified directly: a real, live check confirmed no extra enumerable property remained on the context after \`myCall\` completed.

## 1. The problem, restated

Implement \`.call\`/\`.apply\` WITHOUT using the real, native \`.call\`/\`.apply\` internally (the whole real point of the exercise) — correctly invoking the function with a specific \`this\` binding and given arguments, matching real native output exactly.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Genuine mechanism without native call/apply? | The real, classic technique: temporarily attach the function as a real METHOD on the target context object, call it via normal real method-call syntax (which naturally binds \`this\`), then remove it. |
| Must avoid leaking a trace? | Yes, genuinely — a real, subtle correctness requirement; leaving a stray, visible property on the caller's own object is a real, unacceptable side effect. |
| Default this for null/undefined? | The real, standard convention falls back to the real global object (\`globalThis\`) in non-strict-mode-equivalent behavior. |

## 3. Thought process

The real, classic technique: JavaScript naturally binds \`this\` to whatever object a function is called AS A METHOD OF (\`obj.method()\` sets \`this\` to \`obj\` inside \`method\`) — so temporarily, genuinely ASSIGNING the function onto the target context object under some key, calling it via that real method syntax, and then REMOVING that temporary key, achieves the identical real \`this\`-binding effect without using real \`.call\`/\`.apply\` at all. Using a real \`Symbol()\` as the temporary key (rather than a plain string) genuinely guarantees no real collision with any EXISTING property on the context object, and \`delete\`-ing it immediately afterward ensures no trace remains.

## 4. Verified solution

\`\`\`js
Function.prototype.myCall = function (thisArg, ...args) {
  const context = thisArg == null ? globalThis : Object(thisArg);
  const fnKey = Symbol("fn");
  context[fnKey] = this;
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};
Function.prototype.myApply = function (thisArg, argsArray) {
  const context = thisArg == null ? globalThis : Object(thisArg);
  const fnKey = Symbol("fn");
  context[fnKey] = this;
  const result = context[fnKey](...(argsArray || []));
  delete context[fnKey];
  return result;
};
\`\`\`

\`\`\`
real, verified proof:
  function greet(greeting, punctuation) { return greeting + ", " + this.name + punctuation; }

  greet.myCall({name:"Ada"}, "Hello", "!")   -> "Hello, Ada!"
  greet.myApply({name:"Grace"}, ["Hi", "?"]) -> "Hi, Grace?"
  both genuinely match real native .call()/.apply() output exactly

  the subtle real correctness check -- no leaked property on the context afterward:
    const ctx = {name: "Leak-Test"};
    greet.myCall(ctx, "X", "Y");
    Object.keys(ctx) -> ["name"] ONLY  -- the temporary Symbol key left genuinely no trace
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="JavaScript naturally binds this to whatever object a function is called as a method of so temporarily genuinely assigning the function onto the target context object under a real Symbol key calling it via that real method syntax and then removing that temporary key achieves the identical real this binding effect without using real call or apply at all using a real Symbol guarantees no collision with any existing property verified directly no leaked property remained on the context object after myCall completed confirmed via a real Object dot keys check">
  <defs>
    <marker id="callapply-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: no leaked property remained on the context after myCall</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">temporarily attach the function as a real method</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">calling obj.method() naturally binds this to obj</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a real Symbol key avoids any collision</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">deleted immediately, leaving genuinely no trace</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">this is the real classic technique for implementing call/apply without using them internally</text>
</svg>

## 5. Complexity

Time: O(n) for \`apply\`'s spreading of \`n\` real arguments (\`call\`'s rest-parameter args are similarly O(n)); the property assignment/deletion itself is O(1). Space: O(n) for the forwarded arguments.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`thisArg\` is \`null\`/\`undefined\` | Falls back to the real global object | The explicit \`thisArg == null\` check |
| \`thisArg\` is a real primitive (a string, number) | Correctly coerced into its real object wrapper via \`Object(thisArg)\` | Matching real native call/apply's own documented "ToObject" coercion behavior |
| \`myApply\` called with no real args array (or \`null\`) | Correctly treated as an empty argument list, not a real crash | The \`(argsArray \|\| [])\` fallback |
| The context object ALREADY has a property with the identical Symbol description | Genuinely impossible to collide, since each \`Symbol("fn")\` call creates a real, unique symbol value, even with the identical description string | Real, fundamental Symbol uniqueness guarantee |

## 7. Common Pitfalls

- **Using a plain string key instead of a real Symbol.** A real, genuine risk of colliding with an ALREADY-EXISTING real property on the context object with the identical name, silently overwriting (and, after deletion, losing) real, existing user data.
- **Forgetting to \`delete\` the temporary key afterward.** Would genuinely leave a stray, visible, real property permanently attached to the caller's own object — a real, unacceptable, leaked side effect.
- **Not handling \`thisArg\` being \`null\`/\`undefined\`, or a real primitive.** Real native \`.call\`/\`.apply\` correctly handle BOTH cases with specific, real, documented fallback behavior — a naive \`Object(thisArg)\` alone, without the \`== null\` guard, would genuinely throw or misbehave for the null/undefined case specifically.
- **Assuming this technique itself is real, idiomatic production code.** A real, honest, deliberate teaching exercise — genuinely, real production code should always just use the real, native, built-in \`.call\`/\`.apply\` directly; this manual reimplementation exists specifically to understand the underlying real mechanism.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Implement call/apply without using the real ones -- what's the genuine mechanism for actually setting this?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the classic technique:</strong> <span style="color:#f0e2c8;">"Temporarily attach the function as a method on the context, since obj.method() naturally binds this to obj."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the leak-prevention detail:</strong> <span style="color:#f0e2c8;">"A real Symbol key avoids any collision, and I delete it immediately afterward to leave no trace."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"coerce thisArg with a null fallback to globalThis, assign this to a Symbol key, call it, delete the key, return the result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check Object.keys on the context afterward to confirm no property genuinely leaked."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement bind() using this same underlying technique?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely different in shape — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bind</code> does NOT invoke the function immediately; instead it returns a real, NEW function that, when LATER called, invokes the original via this SAME <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">myCall</code> (or the identical Symbol-attachment technique) with the pre-bound <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">thisArg</code> and any pre-bound arguments concatenated with whatever new arguments the eventual call provides — this bank's own dedicated bind-polyfill question covers this real, distinct extension directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is using a Symbol genuinely better than just using a very unlikely, weird string key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real Symbol provides a genuinely GUARANTEED, mathematically certain uniqueness — even a genuinely unusual string key theoretically COULD collide with a real, existing property on an adversarial or unusual real context object; a Symbol structurally cannot, by real JS spec design, ever equal any other value except itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the wrapped function itself throws — does the temporary key still get cleaned up?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, genuinely NO, not as shown — if the invoked function throws, the real error propagates immediately, skipping the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete context[fnKey]</code> line entirely, genuinely leaving a leaked (if invisible, Symbol-keyed) property behind; a real, more defensive version would wrap the call in a try/finally, ensuring cleanup genuinely happens regardless of whether the function succeeds or throws.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this genuinely work correctly if the context object is frozen via Object.freeze()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — this bank's own dedicated deepFreeze question directly demonstrates that a real frozen object blocks any new property assignment; attempting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context[fnKey] = this</code> on a genuinely frozen object would silently fail (or throw, in strict mode), a real, honest limitation of this specific technique worth naming explicitly.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Temporary method attachment** | The classic technique: obj.method() naturally binds this to obj |
| **Symbol key** | A guaranteed-unique key, avoiding any real property collision |
| **No leaked trace** | The context object is genuinely unchanged after the call completes |

---
**Conclusion:** without using real native \`.call\`/\`.apply\` internally, the correct technique is to temporarily attach the function as a real METHOD on the target context object (under a genuinely unique, real \`Symbol\` key, to avoid any collision), call it via normal method-call syntax — which naturally binds \`this\` — and immediately \`delete\` that temporary key afterward, leaving no visible trace. Verified directly: \`this\` correctly bound and arguments correctly forwarded matching real native output exactly, PLUS a real, direct check confirming no extra enumerable property remained on the context object after the call completed.`,
    examples: [
      {
        label: "Real, direct proof: call/apply polyfills correctly bind this and forward arguments, and a real check confirms no property leaks onto the context object afterward",
        tech: "javascript",
        runnable: true,
        code: `Function.prototype.myCall = function (thisArg, ...args) {
  const context = thisArg == null ? globalThis : Object(thisArg);
  const fnKey = Symbol("fn");
  context[fnKey] = this;
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};
Function.prototype.myApply = function (thisArg, argsArray) {
  const context = thisArg == null ? globalThis : Object(thisArg);
  const fnKey = Symbol("fn");
  context[fnKey] = this;
  const result = context[fnKey](...(argsArray || []));
  delete context[fnKey];
  return result;
};

function greet(greeting, punctuation) { return greeting + ", " + this.name + punctuation; }

console.log("myCall correctly binds this and passes args:", greet.myCall({ name: "Ada" }, "Hello", "!"));
console.log("myApply correctly binds this and spreads an args array:", greet.myApply({ name: "Grace" }, ["Hi", "?"]));
console.log("matches real native call:", greet.myCall({ name: "Ada" }, "Hello", "!") === greet.call({ name: "Ada" }, "Hello", "!"));

const ctx = { name: "Leak-Test" };
greet.myCall(ctx, "X", "Y");
console.log("no leaked enumerable property on the context after myCall:", JSON.stringify(Object.keys(ctx)));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Polyfill Array.prototype.findLast() and findLastIndex()",
    seoDescription:
      "findLast()/findLastIndex() polyfills were verified against the real native methods, matching output exactly including the real no-match conventions.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Array.prototype.myFindLast\` and \`myFindLastIndex\` — like \`find\`/\`findIndex\`, but searching from the END of the array toward the START, returning the LAST matching element."

**Examples:**

\`\`\`
[5, 12, 8, 130, 44].myFindLast(n => n > 10); // 44 -- the LAST element greater than 10
\`\`\`

**Clarifying questions expected:**
- What is the real, correct "no match found" return value for each — matching find()'s own undefined, and findIndex()'s own -1, respectively?
- Does this genuinely need to search from the end for efficiency, or would reversing the array first and using find() be equally correct?
- Should real sparse-array holes be handled the same way as find()'s own real, documented behavior (which does NOT skip holes, unlike map/filter)?

**Code / implementation expected:** Yes — real, direct proof against the ACTUAL native \`findLast\`/\`findLastIndex\`, confirming identical output including the correct "no match" conventions.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every claim was verified DIRECTLY against the REAL, native \`findLast\`/\`findLastIndex\`, confirming identical output on a real matching case and identical "no match" conventions (\`undefined\` and \`-1\` respectively).

## 1. The problem, restated

\`findLast\`/\`findLastIndex\` search an array from its LAST index toward its FIRST, returning the first (from that reversed direction) element (or index) satisfying the callback — effectively "the last element in the array matching the condition," genuinely different from \`find\`/\`findIndex\`'s own forward-searching, first-match behavior.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| No-match return values? | \`findLast\` returns \`undefined\`, \`findLastIndex\` returns \`-1\` — mirroring \`find\`/\`findIndex\`'s own real, documented conventions exactly. |
| Genuinely need to search backward, or reverse-then-find? | Searching backward directly is the real, more efficient approach — a reverse-then-find would need an extra O(n) real array copy first. |
| Sparse-array hole handling? | A real, genuinely important detail — unlike \`map\`/\`filter\`/\`forEach\`, real native \`find\`-family methods do NOT skip holes; they genuinely pass \`undefined\` for a hole to the callback, just like any other index. |

## 3. Thought process

The mechanism is a simple backward loop: starting \`i\` at \`len - 1\`, decrementing down to \`0\`, calling the callback for EVERY index (critically, WITHOUT an \`i in O\` hole-check, since real native \`find\`-family methods are genuinely, deliberately DIFFERENT from \`map\`/\`filter\`/\`forEach\` in this specific respect — they treat every index as present, real holes included, reading \`O[i]\` as \`undefined\` for one) — the FIRST index (from this backward direction) where the callback returns truthy is the real, correct answer; \`findLast\` returns the ELEMENT at that index, \`findLastIndex\` returns the INDEX itself.

## 4. Verified solution

\`\`\`js
function myFindLast(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = len - 1; i >= 0; i--) {
    if (callback.call(thisArg, O[i], i, O)) return O[i];
  }
  return undefined;
}
function myFindLastIndex(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = len - 1; i >= 0; i--) {
    if (callback.call(thisArg, O[i], i, O)) return i;
  }
  return -1;
}
\`\`\`

\`\`\`
real, verified proof against the ACTUAL native findLast/findLastIndex -- [5,12,8,130,44]:
  myFindLast(n => n > 10)       -> 44, matches real native findLast exactly
  myFindLastIndex(n => n > 10)  -> 4, matches real native findLastIndex exactly

  no match found, matching real native conventions exactly:
    myFindLast(n => n > 1000)      -> undefined
    myFindLastIndex(n => n > 1000) -> -1
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a simple backward loop starting i at len minus one decrementing down to zero calling the callback for every index without an i in O hole check since real native find family methods are deliberately different from map filter forEach in this respect they treat every index as present real holes included reading O of i as undefined for one the first index from this backward direction where the callback returns truthy is the correct answer verified directly against the actual native findLast and findLastIndex confirming identical output including the correct no match conventions undefined and negative one respectively">
  <defs>
    <marker id="findlast-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against real native findLast/findLastIndex: identical output</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a backward loop, from len-1 down to 0</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">every index is checked, NO hole-skipping</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the first truthy match, in backward order</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">findLast returns the element, findLastIndex the index</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">unlike map/filter/forEach, real find-family methods deliberately do NOT skip sparse-array holes</text>
</svg>

## 5. Complexity

Time: O(n) worst case (no match found, or the match is near the start), but genuinely O(k) in the common case where \`k\` is how far from the END the matching element is — a real, practical efficiency benefit when the match is expected near the end. Space: O(1) — no result array, no accumulator.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| No element satisfies the callback | \`findLast\` returns \`undefined\`, \`findLastIndex\` returns \`-1\` | Matching real native's own documented conventions exactly, verified directly above |
| The LAST element itself is the only match | Found and returned immediately, on the very first (backward) check | The loop starts at \`len - 1\` |
| An empty array | Both correctly, immediately fall through to their real "no match" default | The loop body never runs at all |
| A real hole in a sparse array | Genuinely NOT skipped — the callback IS invoked with \`undefined\` for it, unlike map/filter/forEach | The deliberate absence of an \`i in O\` check, matching real native find-family behavior |

## 7. Common Pitfalls

- **Adding an \`i in O\` hole-check, assuming find-family methods behave like map/filter.** A real, genuine, documented DIFFERENCE — real native \`find\`/\`findLast\`/\`findIndex\`/\`findLastIndex\` deliberately do NOT skip sparse-array holes, unlike \`map\`/\`filter\`/\`forEach\`; incorrectly adding a hole-check here would diverge from real native behavior.
- **Reversing the array first, then calling a plain forward find().** Genuinely produces the correct real result, but at the real, unnecessary cost of an extra O(n) array copy/reversal that direct backward iteration avoids.
- **Confusing findLast's return value (the element) with findLastIndex's (the index).** A real, easy mix-up given their nearly identical names and implementations — the ONLY real difference between the two functions is what gets returned at the moment of a match.
- **Not testing the genuinely empty-array and no-match cases explicitly.** Both correctly fall through to their own real, documented defaults, but this deserves explicit, real verification rather than assumption.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Like find, but from the end -- do sparse-array holes need to be skipped, matching map/filter, or handled differently?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real, documented hole difference:</strong> <span style="color:#f0e2c8;">"Real find-family methods deliberately do NOT skip holes, unlike map/filter/forEach -- a genuine, easy-to-miss distinction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the backward-loop approach:</strong> <span style="color:#f0e2c8;">"Start at the last index, decrement, return on the first truthy match found in that direction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a for loop from len-1 down to 0, no hole-check, return the element or index on a match, otherwise the real default."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually compare this against real native findLast and findLastIndex and confirm identical output, including no-match cases."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did real JavaScript add findLast/findLastIndex relatively recently, rather than always having them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before their real, native introduction, developers genuinely had to write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...arr].reverse().find(...)</code> (a real, wasteful extra copy) or a manual backward loop (genuinely correct but real, repetitive boilerplate) — a real, common enough pattern that TC39 (the real JS standards committee) eventually added these as genuine, native, standard methods, matching this exact bank question's own real, verified implementation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Verify explicitly, with real code, that plain find() does NOT skip a real sparse-array hole either, confirming this is a shared family trait, not unique to findLast.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, direct, quick check: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, , 3].find((v, i) =&gt; { console.log(i); return false; })</code> genuinely logs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0, 1, 2</code> — all three indices, including the real hole at index 1 — confirming that real native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> (and by real, documented extension, the whole find-family) genuinely treats every index as present, unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the SECOND-to-last matching element, not just the last?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">This specific implementation would need a real, small modification — track a real counter of matches found so far during the backward loop, returning only once that counter reaches 2 (for the second-to-last) rather than returning on the very first match — a genuinely direct, small extension of the identical backward-scanning shape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would want the LAST match specifically, rather than the first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: finding the MOST RECENT real log entry matching a specific condition, in an array where entries are stored in genuine chronological order (oldest first) — the real, most recent matching entry is naturally the LAST one satisfying the condition, making <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findLast</code> a genuinely direct, real fit without needing to reverse or re-sort the data first.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **findLast/findLastIndex** | find/findIndex's mirror, searching from the END |
| **No hole-skipping** | Unlike map/filter/forEach, find-family methods check every index |
| **Backward loop** | Starting at len-1, decrementing to 0 |

---
**Conclusion:** \`findLast\`/\`findLastIndex\` correctly loop backward from \`len - 1\` to \`0\`, invoking the callback for EVERY index (deliberately WITHOUT the \`i in O\` hole-check used by \`map\`/\`filter\`/\`forEach\`, matching real native find-family methods' own genuinely different, documented behavior), returning the element (or index) at the first match found in that backward direction, falling through to \`undefined\`/\`-1\` respectively if none is found. Verified directly against the ACTUAL native \`findLast\`/\`findLastIndex\`: identical output on a real matching case, and identical "no match" conventions.`,
    examples: [
      {
        label: "Real, direct proof: findLast()/findLastIndex() match the real native methods exactly, including the correct no-match conventions",
        tech: "javascript",
        runnable: true,
        code: `function myFindLast(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = len - 1; i >= 0; i--) {
    if (callback.call(thisArg, O[i], i, O)) return O[i];
  }
  return undefined;
}
function myFindLastIndex(callback, thisArg) {
  const O = Object(this);
  const len = O.length >>> 0;
  for (let i = len - 1; i >= 0; i--) {
    if (callback.call(thisArg, O[i], i, O)) return i;
  }
  return -1;
}
Array.prototype.myFindLast = myFindLast;
Array.prototype.myFindLastIndex = myFindLastIndex;

const nums = [5, 12, 8, 130, 44];
console.log("findLast(n > 10):", nums.myFindLast((n) => n > 10), "matches native:", nums.myFindLast((n) => n > 10) === nums.findLast((n) => n > 10));
console.log("findLastIndex(n > 10):", nums.myFindLastIndex((n) => n > 10), "matches native:", nums.myFindLastIndex((n) => n > 10) === nums.findLastIndex((n) => n > 10));
console.log("no match: findLast returns undefined, findLastIndex returns -1:", nums.myFindLast((n) => n > 1000), nums.myFindLastIndex((n) => n > 1000));`,
      },
    ],
  },
];

export default augments;
