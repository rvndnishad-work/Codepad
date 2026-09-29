/**
 * Practical JS coding-interview content — batch 20 (DSA round, medium
 * tier — the lodash-style path/array-utility cluster: get, set, pick,
 * omit, compact, chunk). See js-coding-augments-15 through -19.ts's
 * headers for the full template rationale and every standing gotcha
 * (card-backtick rule, literal-tag-outside-fence rule,
 * seoDescription-fix-by-editing rule).
 *
 * CRITICAL PROCESS NOTE (from batch 16): every title below was pulled
 * directly from a live DB query against technology='javascript-coding'
 * AND round='DSA' rows missing the '#1c140a' gold-card marker — NEVER
 * invented from memory.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - get: verified dot-path and array-bracket-path access, correct
 *     fallback to a default value on a genuinely missing path, and
 *     confirmed a genuine falsy value like 0 is correctly returned
 *     (NOT confused with "missing," which would incorrectly trigger the
 *     default).
 *   - set: verified creation of missing intermediate objects along a
 *     path, correct update of an already-existing deep path, and
 *     correct creation of a real ARRAY (not a plain object) when a path
 *     segment is numeric.
 *   - pick/omit: verified against both shallow and nested dot-paths,
 *     built directly on top of the already-verified get/set primitives,
 *     confirming the original object is never mutated by either.
 *   - compact: verified against a real mixed array containing every
 *     JS falsy value (0, false, "", null, undefined, NaN), confirming
 *     all are correctly removed while preserving truthy order.
 *   - chunk: verified even splitting, a real remainder producing a
 *     correctly smaller final chunk, a chunk size larger than the whole
 *     array, and a genuinely invalid size of 0.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement lodash.get(obj, path, defaultValue)",
    seoDescription:
      "A get() utility verified for dot/bracket path access, confirming a genuine falsy value like 0 is correctly returned, not confused with a missing path.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`get(obj, path, defaultValue)\` — safely reading a deeply nested value from an object via a dot-notation (or array-bracket) path string, returning \`defaultValue\` if any part of the path is genuinely missing, matching lodash's own well-known \`_.get\` behavior."

**Examples:**

\`\`\`
get({a: {b: {c: 42}}}, "a.b.c"); // 42
get({a: 1}, "x.y.z", "fallback"); // "fallback"
\`\`\`

**Clarifying questions expected:**
- Does the path need to support BOTH dot notation (\`"a.b.c"\`) AND array-bracket notation (\`"a[0].b"\`), or just one format?
- If the actual value at the path is a genuine FALSY value (like \`0\`, \`false\`, or an empty string), should the default still correctly NOT be used?
- Should the path also be acceptable as a pre-split array of keys, not just a string?

**Code / implementation expected:** Yes — real, direct proof of correct dot/bracket path access, correct fallback on a genuinely missing path, and — critically — confirmation a genuine falsy value at the path is correctly returned, not confused with "missing."`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, easy-to-get-wrong detail this question tests — correctly distinguishing "the value IS a real falsy value" from "the value is genuinely MISSING" — was verified directly: \`get({a: 0}, "a", "fallback")\` correctly returned the real \`0\`, not \`"fallback"\`, confirming the missing-vs-falsy distinction is handled correctly via an explicit \`=== undefined\` check, not a naive truthiness check.

## 1. The problem, restated

Safely walk a dot-notation (or array-bracket) path string through a nested object, returning the value found at the end of that path — or \`defaultValue\` if the path genuinely does not fully resolve (some segment along the way is \`null\`/\`undefined\`, or the final value itself is genuinely \`undefined\`) — critically, WITHOUT confusing a real, present FALSY value (like \`0\`) with a genuinely missing one.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Dot AND bracket notation? | A real, common lodash convention supports both \`"a.b.c"\` and \`"a[0].b"\`, normalized into the identical internal key-array representation. |
| Falsy value vs. missing? | Genuinely, critically different — a real \`0\`/\`false\`/\`""\` at the path must be returned AS-IS, never replaced by the default. |
| Array path support? | Yes — a real, common convenience allowing a caller to pass \`["a","b","c"]\` directly, skipping the string-parsing step entirely. |

## 3. Thought process

The mechanism first NORMALIZES the path into a plain array of string keys — if already an array, used directly; if a string, array-bracket notation (\`[0]\`) is converted to an EQUIVALENT dot segment (\`.0\`) via a regex substitution, then the whole thing is split on \`.\`, filtering out any empty segments this produces. The core walk then loops through these keys, at each step checking if the CURRENT intermediate result is \`null\`/\`undefined\` (via \`== null\`, correctly catching BOTH in one check) — if so, it short-circuits and returns \`defaultValue\` immediately, since continuing to index into \`null\`/\`undefined\` would genuinely throw. After the full walk, the FINAL result is compared with a real, EXPLICIT \`=== undefined\` check (never a truthiness check) — this precise, narrow check is exactly what correctly distinguishes "the final value is a real, present falsy value" (returned as-is) from "the final value is genuinely undefined" (the default is used instead).

## 4. Verified solution

\`\`\`js
function get(obj, path, defaultValue) {
  const keys = Array.isArray(path) ? path : path.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let result = obj;
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
}
\`\`\`

\`\`\`
real, verified proof:
  get({a:{b:{c:42}}}, "a.b.c") -> 42

  get({a:[{b:1},{b:2}]}, "a[1].b") -> 2   -- bracket notation correctly normalized

  get({a:1}, "x.y.z", "fallback") -> "fallback"   -- a genuinely missing path
  get({a:1}, "x.y.z") -> undefined   -- no default given

  get({a:{b:5}}, ["a","b"]) -> 5   -- a pre-split array path

  get({a:0}, "a", "fallback") -> 0   -- a REAL falsy value, correctly NOT replaced by the default
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism first normalizes the path into a plain array of string keys if already an array used directly if a string array bracket notation is converted to an equivalent dot segment via a regex substitution then the whole thing is split on dot filtering out any empty segments the core walk then loops through these keys at each step checking if the current intermediate result is null or undefined via double equals null correctly catching both in one check if so it short circuits and returns defaultValue immediately after the full walk the final result is compared with a real explicit strictly equals undefined check never a truthiness check this precise narrow check is exactly what correctly distinguishes a real present falsy value from a genuinely undefined one verified directly a real zero at the path was correctly returned not replaced by the default">
  <defs>
    <marker id="lodashgetpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real falsy value like 0 is correctly returned, not the default</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">normalize bracket notation to dot segments</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">both formats reduce to the same internal key array</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">short-circuit on null/undefined mid-walk</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">final check is strictly === undefined, not truthy</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the narrow === undefined check is what correctly preserves a real falsy value at the path</text>
</svg>

## 5. Complexity

Time: O(d) where \`d\` is the path depth — one property access per segment. Space: O(d) for the parsed key array.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A path that partially resolves then hits \`null\` | Correctly, immediately returns \`defaultValue\` | The \`result == null\` mid-walk check short-circuits |
| The final value is a real, present falsy value (\`0\`, \`false\`, \`""\`) | Correctly returned AS-IS, never replaced | The narrow \`=== undefined\` final check |
| An empty path string | Correctly returns \`obj\` itself (no keys to walk) | \`.filter(Boolean)\` on an empty split produces an empty key array, so the loop never runs |
| A genuinely empty \`obj\` (e.g. \`{}\`) | Correctly returns \`defaultValue\` for any real path | The very first key lookup returns \`undefined\`, triggering the final default check |

## 7. Common Pitfalls

- **Using a truthiness check (\`if (!result)\`) instead of \`=== undefined\`.** A real, easy, WRONG simplification — this would incorrectly treat a genuine \`0\`, \`false\`, or empty string at the path as "missing," incorrectly substituting the default for a real, present value.
- **Forgetting to normalize array-bracket notation.** A real, easy gap — without the regex substitution, a path like \`"a[0].b"\` would incorrectly be treated as containing a literal key named \`"a[0]"\`, rather than correctly resolving to index \`0\` of \`a\`.
- **Not short-circuiting on \`null\`/\`undefined\` mid-walk.** Attempting to continue indexing into a \`null\`/\`undefined\` intermediate value would genuinely THROW a real \`TypeError\`, rather than gracefully falling back to the default.
- **Using \`==\` instead of \`===\` for the FINAL undefined check specifically.** While \`result == null\` is intentionally used mid-walk (to catch both \`null\` and \`undefined\` together, since either genuinely blocks further indexing), the final check specifically needs the NARROWER \`=== undefined\`, since a genuinely present, final \`null\` value (as opposed to \`undefined\`) is arguably a real, valid, present value too — a real, subtle distinction worth being precise about.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Safely read a deep path -- does a real falsy value at the path need to be distinguished from a genuinely missing one?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the normalize-then-walk approach:</strong> <span style="color:#f0e2c8;">"Normalize bracket notation to dot segments first, then walk the resulting key array one property at a time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the missing-vs-falsy distinction:</strong> <span style="color:#f0e2c8;">"The final check needs to be strictly === undefined, not a truthiness check, so a real 0 or false is preserved."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"normalize the path, loop checking null mid-walk, return the default only via the final undefined check."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually test get on a real 0 value and confirm it's returned, not silently replaced by the default."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does real lodash.get() support both dot AND bracket notation, rather than picking just one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine ergonomics decision — bracket notation (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0].b</code>) genuinely, visually mirrors how a caller would write the equivalent REAL JavaScript property access directly (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.a[0].b</code>), making a generated or copy-pasted path string more intuitive and less error-prone to write correctly by hand than pure dot notation alone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own set() and pick()/omit() questions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, this <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> function is a real, DIRECT building block for those other questions — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">omit</code> both internally use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> (paired with a real, mirrored <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>) to safely read and re-write values along arbitrary paths without duplicating the path-walking logic themselves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this implementation correctly handle a path key that itself contains a literal dot, like "a.b" as ONE real property name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no, not as a string path — the string-based path format is fundamentally AMBIGUOUS in that specific case, since a literal dot in a string path always means "descend one more level"; the real, correct workaround is passing the path as a pre-split ARRAY instead, e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">["a.b"]</code>, which this implementation's own array-path support already, directly handles correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario in a codebase would genuinely benefit from get() over plain optional chaining (?.)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely common case: when the PATH itself is only known at RUNTIME, not hardcoded at write time — e.g. reading a real, dynamic configuration key from a user-provided string (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getConfigValue(config, userSelectedPath)</code>) — real optional chaining (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?.</code>) genuinely requires the property names to be known and written explicitly in the code itself, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>'s string-path approach genuinely supports fully dynamic paths.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **lodash.get** | Safely reads a deep path, falling back to a default if missing |
| **Missing vs. falsy** | A real 0/false at the path must not be confused with "absent" |
| **Path normalization** | Bracket notation is converted to the identical dot-segment form |

---
**Conclusion:** \`get\` first normalizes the path (converting array-bracket notation into equivalent dot segments, or using an already-provided array directly) into a plain array of keys, then walks that path one property at a time — short-circuiting to \`defaultValue\` the moment an intermediate value is \`null\`/\`undefined\`, and finally checking the RESULT with a narrow, explicit \`=== undefined\` comparison (never a truthiness check), which is precisely what correctly preserves a real, present falsy value instead of incorrectly substituting the default for it. Verified directly: correct dot-path and bracket-path access, correct fallback on a genuinely missing path, support for a pre-split array path, and — the real, defining correctness check — a genuine \`0\` value at the path correctly returned as-is, not confused with a missing value.`,
    examples: [
      {
        label: "Real, direct proof: get() correctly walks dot and bracket-notation paths, falls back to a default on a genuinely missing path, and correctly preserves a real falsy value like 0",
        tech: "javascript",
        runnable: true,
        code: `function get(obj, path, defaultValue) {
  const keys = Array.isArray(path) ? path : path.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let result = obj;
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
}

console.log("get with dot path:", get({ a: { b: { c: 42 } } }, "a.b.c"));
console.log("get with array-bracket path:", get({ a: [{ b: 1 }, { b: 2 }] }, "a[1].b"));
console.log("get with a missing path returns the default:", get({ a: 1 }, "x.y.z", "fallback"));
console.log("get with an array path:", get({ a: { b: 5 } }, ["a", "b"]));
console.log("get correctly returns a genuine 0 value, not the default:", get({ a: 0 }, "a", "fallback"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement lodash.set(obj, path, value) — create nested path",
    seoDescription:
      "A set() utility verified to create missing intermediate objects along a path, update existing deep values, and correctly create arrays for numeric keys.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`set(obj, path, value)\` — writing a value at a deeply nested path, automatically CREATING any missing intermediate objects (or arrays, for numeric path segments) along the way, matching lodash's own well-known \`_.set\` behavior."

**Examples:**

\`\`\`
set({}, "a.b.c", 42); // {a: {b: {c: 42}}}
\`\`\`

**Clarifying questions expected:**
- Does this need to CREATE missing intermediate objects, or only update a path that already fully exists?
- Should a numeric path segment (like \`"a[0].b"\`) create a real ARRAY at that level, not a plain object with a \`"0"\` key?
- Does this mutate the original object in place, or return a genuinely new one?

**Code / implementation expected:** Yes — real, direct proof of missing-intermediate-object creation, correct updates to an already-existing deep path, and correct array creation for a numeric path segment.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, easy-to-get-wrong detail this question tests — that a NUMERIC path segment should create a genuine ARRAY, not a plain object with a stringified numeric key — was verified directly: \`set({}, "a[0].b", "x")\` correctly produced a real array at \`a\` (confirmed via \`Array.isArray\`), not a plain object shaped like \`{"0": {...}}\`.

## 1. The problem, restated

Write \`value\` at the end of a deeply nested path, MUTATING the original object in place — automatically creating any MISSING intermediate container along the way (a plain object for a string key segment, but a genuine ARRAY specifically when the NEXT segment looks numeric) — matching lodash's own well-known \`_.set\` contract, including its real, defining array-vs-object creation heuristic.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Creates missing intermediates? | Yes, genuinely — this is the real, defining difference from a simple assignment, which would throw on a missing intermediate. |
| Array vs. object for numeric segments? | A real array should be created specifically when the segment being descended INTO is followed by a numeric-looking next segment — matching real, idiomatic JS data shapes. |
| Mutates or returns new? | Mutates the ORIGINAL object in place (matching real \`_.set\`'s own documented, mutating convention), and also returns that same object for convenient chaining. |

## 3. Thought process

The mechanism normalizes the path into a key array (identical technique to the paired \`get\` function), then walks all but the LAST key, maintaining a \`current\` pointer into the object being built. At each step, it checks whether the value ALREADY there is usable as a container (genuinely non-null and an object) — if NOT, it creates a fresh one, choosing a real ARRAY specifically when the NEXT key looks like a numeric index (tested via a simple \`/^\\d+$/\` regex), or a plain object otherwise. After walking every intermediate segment, the FINAL key is assigned \`value\` directly onto whatever \`current\` now points to — since \`current\` was updated at every step to point INTO the just-created-or-existing nested structure, this final assignment correctly lands at the true end of the real path.

## 4. Verified solution

\`\`\`js
function set(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== "object") {
      const nextKey = keys[i + 1];
      current[key] = /^\\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
}
\`\`\`

\`\`\`
real, verified proof:
  set({}, "a.b.c", 42) -> {"a":{"b":{"c":42}}}   -- missing intermediates created

  set({a:{b:{c:1}}}, "a.b.c", 99) -> {"a":{"b":{"c":99}}}   -- updates an EXISTING path

  set({}, "a[0].b", "x") -> {"a":[{"b":"x"}]}
  Array.isArray(result.a) -> true   -- a REAL array, not a plain {"0":{...}} object

  set({}, "x", 1) returns the SAME, mutated object reference
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism normalizes the path into a key array identical technique to the paired get function then walks all but the last key maintaining a current pointer into the object being built at each step it checks whether the value already there is usable as a container genuinely non null and an object if not it creates a fresh one choosing a real array specifically when the next key looks like a numeric index tested via a simple regex or a plain object otherwise after walking every intermediate segment the final key is assigned value directly onto whatever current now points to verified directly a numeric path segment correctly produced a real array not a plain object with a stringified numeric key">
  <defs>
    <marker id="lodashsetpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a numeric next segment correctly creates a real array, not an object</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">walk all but the last key, tracking current</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">create a missing container, checking the NEXT key</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">next key numeric: create an array, else object</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">matches idiomatic real JS data shapes</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the final key assignment lands correctly since current tracks the true end of the path</text>
</svg>

## 5. Complexity

Time: O(d) where \`d\` is the path depth. Space: O(1) beyond whatever new containers are created along a previously-missing path.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A single-segment path | Correctly assigns directly at the top level | The intermediate loop never runs (\`keys.length - 1 === 0\`) |
| The path already fully exists | Correctly, simply overwrites the final value | The intermediate "create if missing" check finds existing usable containers, skipping creation |
| An intermediate value exists but is NOT an object (e.g. a string) | Correctly, genuinely OVERWRITES it with a fresh container | The \`typeof current[key] !== "object"\` check treats a non-object as "needs replacing" |
| A path segment collides with a real array index beyond the array's current length | Correctly extends the array (JS arrays allow assigning past the current length, creating real holes) | Standard JS array assignment semantics |

## 7. Common Pitfalls

- **Always creating a plain object for a missing intermediate, ignoring numeric segments.** A real, easy oversight — this would incorrectly produce \`{"a":{"0":{"b":"x"}}}\` instead of the real, expected \`{"a":[{"b":"x"}]}\`, diverging from real, idiomatic JS array shapes.
- **Checking the CURRENT key for numeric-ness instead of the NEXT key.** A real, subtle, easy-to-invert mistake — the decision of whether to create an ARRAY at position \`i\` depends on whether the key AFTER it (\`i+1\`, the one that will actually index INTO the newly-created container) looks numeric, not the key being created itself.
- **Not handling the case where an existing value is present but genuinely NOT an object** (a real string, number, etc). Attempting to descend further into it without replacing it would silently, incorrectly attach a new property onto a real primitive (which JS allows but silently discards), rather than correctly building out the real, intended structure.
- **Confusing set's real, DOCUMENTED mutating convention with a non-mutating alternative.** Real \`_.set\` genuinely mutates the original object — a caller wanting a non-mutating version should explicitly clone first (or use this bank's own separate, dedicated immutable \`setIn\` question instead).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Write a deep value, creating missing intermediates -- should a numeric segment create a real array, not a plain object?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the walk-and-create approach:</strong> <span style="color:#f0e2c8;">"Walk all but the last key, tracking a current pointer, creating a missing container based on the NEXT key's shape."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the array-vs-object decision:</strong> <span style="color:#f0e2c8;">"Checking if the NEXT key looks numeric is what determines array versus plain object creation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"normalize the path, loop creating a missing container per step, then assign the final value at current."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check Array.isArray on a numeric-segment result and confirm it's a real array, not a plain object."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a real, non-mutating version of this that returns a new object instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely direct approach: this bank's own dedicated Immutable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setIn</code> question covers exactly that — a genuinely RECURSIVE, spread-based version that only creates NEW references ALONG the changed path, leaving unrelated sibling data structurally SHARED, rather than this mutating implementation's direct in-place writes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely need set() over simply writing the assignment directly, like obj.a.b.c = value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: when the PATH itself is only known at RUNTIME (identical motivation to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>'s own follow-up on this exact point) — e.g., writing a real, dynamic configuration value at a path constructed from user input or a real, external schema definition — a hardcoded direct assignment genuinely cannot express that, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>'s string/array-path approach genuinely can.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation correctly handle setting a value on a genuinely frozen object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — as this bank's own dedicated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepFreeze</code> question directly demonstrated, a real, genuinely frozen object silently rejects (or throws, in strict mode) any new property assignment; attempting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">current[key] = ...</code> on a frozen intermediate would silently fail (non-strict mode) rather than correctly building out the real, intended structure — a real, honest limitation worth naming if the input object might genuinely be frozen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this correctly handle overwriting an intermediate value that is currently a real array with a plain object instead, if the path demands it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — since a real array IS itself a genuine object (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof [] === "object"</code>), the "is this already usable as a container" check would actually see the EXISTING array as usable and try to descend INTO it using the NEXT key as a property name — this could produce a genuinely surprising real result (a non-numeric string property tacked onto an array) if the caller's real intent was actually to REPLACE the array with a plain object; a real, more defensive implementation might explicitly check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.isArray</code> too, depending on the exact real requirements.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **lodash.set** | Writes a deep value, creating missing intermediates along the way |
| **Array vs. object creation** | A numeric next-key creates a real array, otherwise a plain object |
| **Mutating convention** | The original object is directly modified, matching real _.set |

---
**Conclusion:** \`set\` normalizes the path into a key array, then walks all but the last key — at each step, creating a fresh container ONLY if none usable already exists there, choosing a genuine ARRAY specifically when the NEXT key looks numeric (otherwise a plain object) — and finally assigns \`value\` directly at the last key onto whatever \`current\` now correctly points to, mutating the original object in place. Verified directly: correct creation of missing intermediate objects along a fresh path, correct in-place update of an already-existing deep path, and — the real, defining array-vs-object heuristic — a numeric path segment correctly producing a genuine array, confirmed via \`Array.isArray\`.`,
    examples: [
      {
        label: "Real, direct proof: set() correctly creates missing intermediate objects, updates existing deep paths, and creates a real array (not a plain object) for a numeric path segment",
        tech: "javascript",
        runnable: true,
        code: `function set(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== "object") {
      const nextKey = keys[i + 1];
      current[key] = /^\\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
}

const target1 = {};
set(target1, "a.b.c", 42);
console.log("set creates missing intermediate objects:", JSON.stringify(target1));

const target2 = { a: { b: { c: 1 } } };
set(target2, "a.b.c", 99);
console.log("set updates an EXISTING deep path:", JSON.stringify(target2));

const target3 = {};
set(target3, "a[0].b", "x");
console.log("set correctly creates a real array for a numeric path segment:", JSON.stringify(target3), Array.isArray(target3.a));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement pick(obj, paths) Supporting Both Shallow and Nested Paths",
    seoDescription:
      "A pick() utility built on this bank's own get/set primitives was verified for shallow and nested paths, confirming a missing path is correctly ignored.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`pick(obj, paths)\` — building a genuinely NEW object containing only the specified paths (both shallow keys and nested dot-paths), matching lodash's own well-known \`_.pick\` behavior extended to support nested paths."

**Examples:**

\`\`\`
pick({a:1, b:2, c:{d:3, e:4}}, ["a", "c.d"]); // {a:1, c:{d:3}}
\`\`\`

**Clarifying questions expected:**
- Does this need to support NESTED dot-paths (like \`"c.d"\`), not just shallow top-level keys?
- If a specified path is genuinely missing from the source object, should it be silently skipped, or should an error be raised?
- Should the original object remain completely untouched?

**Code / implementation expected:** Yes — real, direct proof of both shallow and nested path selection, confirmation a genuinely missing path is silently skipped, and confirmation the original object is never mutated.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** this implementation is a real, direct demonstration of BUILDING ON already-verified primitives — it does not reimplement path-walking logic from scratch, instead directly reusing this bank's own already-verified \`get\`/\`set\` functions, which was verified to correctly handle both shallow keys and nested dot-paths with zero additional path-parsing code needed here.

## 1. The problem, restated

Build a genuinely NEW object containing only the values found at the specified \`paths\` (each either a shallow top-level key, like \`"a"\`, or a nested dot-path, like \`"c.d"\`) — silently, correctly SKIPPING any path that does not actually resolve to a real value in the source object, matching lodash's own well-known \`_.pick\` contract, extended to genuinely support nested paths.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Nested path support? | Yes — a real, genuinely useful extension beyond lodash's OWN base \`_.pick\` (which is shallow-only), matching this specific question's own explicit title. |
| Missing path behavior? | Silently, correctly skipped — no error thrown, the resulting object simply does not include that key. |
| Original object untouched? | Yes — a genuinely NEW object is built and returned. |

## 3. Thought process

Rather than reimplementing path-walking from scratch, this mechanism directly REUSES this bank's own already-verified \`get\` and \`set\` functions: for each requested path, \`get(obj, path)\` safely reads the value (correctly returning \`undefined\` for any genuinely missing path, with no risk of throwing) — if that value is NOT \`undefined\`, \`set(result, path, value)\` writes it into the GROWING result object at the IDENTICAL path structure, correctly, automatically creating any needed intermediate containers along the way (the exact same mechanism this bank's own dedicated \`set\` question already verified). This composition means \`pick\` needs essentially NO new path-parsing logic of its own — it is, in effect, a thin, real orchestration layer over two already-proven primitives.

## 4. Verified solution

\`\`\`js
function pick(obj, paths) {
  const result = {};
  for (const path of paths) {
    const value = get(obj, path);
    if (value !== undefined) set(result, path, value);
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof (using this bank's own already-verified get/set):
  const source = {a:1, b:2, c:{d:3, e:4}, f:5};

  pick(source, ["a","f"]) -> {"a":1,"f":5}   -- shallow keys

  pick(source, ["c.d"]) -> {"c":{"d":3}}   -- a nested path, correctly rebuilt

  pick(source, ["a","nonexistent"]) -> {"a":1}   -- the missing path silently skipped

  source itself is completely unchanged after all pick() calls
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="rather than reimplementing path walking from scratch this mechanism directly reuses this banks own already verified get and set functions for each requested path get obj path safely reads the value correctly returning undefined for any genuinely missing path with no risk of throwing if that value is not undefined set result path value writes it into the growing result object at the identical path structure correctly automatically creating any needed intermediate containers along the way this composition means pick needs essentially no new path parsing logic of its own it is in effect a thin real orchestration layer over two already proven primitives">
  <defs>
    <marker id="pickpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Built directly on this bank own already-verified get() and set()</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">get(obj, path) safely reads each value</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">returns undefined for a genuinely missing path</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">set(result, path, value) rebuilds the structure</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">only when the value is genuinely present</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">no new path-parsing logic needed at all, purely orchestrating two already-proven primitives</text>
</svg>

## 5. Complexity

Time: O(p * d) where \`p\` is the number of paths and \`d\` is the average path depth — each path costs one \`get\` plus one \`set\`, both O(d). Space: O(p * d) for the newly-built result structure.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty \`paths\` array | Correctly returns a genuinely empty object | The loop simply never runs |
| Every requested path is genuinely missing | Correctly returns a genuinely empty object | Every \`get\` call returns \`undefined\`, so no \`set\` call ever runs |
| A value at the path is a genuine falsy value (\`0\`) | Correctly, genuinely included | \`get\`'s own already-verified \`=== undefined\` check (not truthiness) correctly distinguishes it |
| Two paths sharing a common nested PARENT (e.g. \`"c.d"\` and \`"c.e"\`) | Both correctly, genuinely coexist under the same rebuilt \`c\` object | \`set\`'s own "reuse an already-usable existing container" check correctly avoids overwriting the first pick's own work |

## 7. Common Pitfalls

- **Reimplementing path-walking logic from scratch instead of reusing already-verified primitives.** A real, easy source of DUPLICATED bugs — if \`get\`/\`set\` already correctly handle every real edge case (missing paths, bracket notation, array creation), reusing them directly is both less code AND inherits their own already-proven correctness.
- **Using a truthiness check instead of \`!== undefined\` when deciding whether to include a value.** Would incorrectly SKIP a real, genuine falsy value like \`0\` — the exact same missing-vs-falsy distinction this bank's own \`get\` question already covers in depth.
- **Mutating the SOURCE object instead of building a genuinely new result.** A real, easy correctness slip — \`pick\` must always return a fresh, separate object, never write back into the caller's own original data.
- **Assuming two nested picks sharing a common parent path would OVERWRITE each other.** A real, easy but INCORRECT worry — since \`set\`'s own "reuse if already usable" logic correctly detects the already-created parent container from the FIRST pick and writes the second value alongside it, rather than replacing it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Select specific paths into a new object -- does this need to support nested dot-paths, not just shallow keys?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the composition approach:</strong> <span style="color:#f0e2c8;">"Reuse already-verified get and set primitives instead of writing new path logic -- get reads, set rebuilds."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the missing-path handling:</strong> <span style="color:#f0e2c8;">"A missing path is silently skipped, since get correctly returns undefined and the set is conditionally guarded."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop paths, get the value, if it's genuinely present, set it into the growing result at the same path."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually pick two paths sharing a nested parent and confirm they both correctly coexist in the result."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is building pick on top of get/set genuinely better engineering than a separate, standalone implementation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine software-engineering principle — REUSING already-tested, already-verified primitives means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> automatically, correctly inherits their own real correctness (bracket-notation handling, the missing-vs-falsy distinction, array-vs-object creation) for FREE, without needing to re-derive or re-test any of that logic separately; a bug fix in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> automatically, correctly propagates to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement omit() using a genuinely similar composition approach?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">This bank's own dedicated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">omit</code> question directly covers this — it also reuses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> for its own NESTED-path removal logic, but the SHALLOW case is handled differently (via a direct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code> filter), since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">omit</code>'s real, defining task is genuinely the OPPOSITE of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code>'s — starting from EVERYTHING and removing specific paths, rather than starting from nothing and adding them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely need pick() with nested paths specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: sanitizing a large, real API response object down to just the SPECIFIC nested fields a particular UI component actually needs (e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"user.profile.name"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"user.settings.theme"</code>), avoiding passing an entire, real, potentially large response object down through props when only a few real, specific nested values are genuinely used.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely deep-clone the picked values, or share references with the original?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, it SHARES references for any object/array VALUE found at a path — only the CONTAINER STRUCTURE leading to that value is newly built; if a picked value is itself an object, both the original and the picked result genuinely point to the SAME underlying object, so mutating it through either one affects both — a real, honest, shallow-picking limitation worth naming if deep independence is genuinely required.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **pick** | Builds a new object containing only the specified paths |
| **Composition over reimplementation** | Reuses already-verified get/set instead of new path logic |
| **Missing path** | Silently skipped, no error, simply absent from the result |

---
**Conclusion:** \`pick\` loops over every requested path, using this bank's own already-verified \`get\` to safely read each value (correctly returning \`undefined\` for a genuinely missing path, with zero risk of throwing) — and, only when a value is genuinely present, uses \`set\` to write it into the growing result object at the IDENTICAL path structure, correctly, automatically rebuilding any needed nested containers. Verified directly: correct selection of both shallow keys and nested dot-paths, correct silent skipping of a genuinely missing path, and confirmation the original source object remains completely untouched throughout.`,
    examples: [
      {
        label: "Real, direct proof: pick() built on this bank's own get/set primitives correctly selects both shallow and nested paths, silently skipping a genuinely missing one",
        tech: "javascript",
        runnable: true,
        code: `function get(obj, path) {
  const keys = path.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let result = obj;
  for (const key of keys) {
    if (result == null) return undefined;
    result = result[key];
  }
  return result;
}
function set(obj, path, value) {
  const keys = path.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
}
function pick(obj, paths) {
  const result = {};
  for (const path of paths) {
    const value = get(obj, path);
    if (value !== undefined) set(result, path, value);
  }
  return result;
}

const source = { a: 1, b: 2, c: { d: 3, e: 4 }, f: 5 };
console.log("pick shallow keys:", JSON.stringify(pick(source, ["a", "f"])));
console.log("pick a nested path:", JSON.stringify(pick(source, ["c.d"])));
console.log("pick ignores a genuinely missing path:", JSON.stringify(pick(source, ["a", "nonexistent"])));
console.log("original object is not mutated by pick:", JSON.stringify(source));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement omit(obj, paths) Supporting Both Shallow and Nested Paths",
    seoDescription:
      "An omit() utility supporting nested paths verified to correctly remove shallow keys and nested fields alike, confirming the original object is untouched.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`omit(obj, paths)\` — building a genuinely NEW object with every property EXCEPT the specified paths (both shallow keys and nested dot-paths) removed, matching lodash's own well-known \`_.omit\` behavior extended to support nested paths."

**Examples:**

\`\`\`
omit({a:1, b:2, c:{d:3, e:4}}, ["b", "c.e"]); // {a:1, c:{d:3}}
\`\`\`

**Clarifying questions expected:**
- Does this need to support removing a NESTED field specifically (leaving its sibling fields intact), not just entire top-level keys?
- Should the original object remain completely untouched, including its nested sub-objects?
- What is the real, correct behavior if a specified path does not actually exist in the object at all?

**Code / implementation expected:** Yes — real, direct proof of correct shallow-key removal, correct nested-field removal (with sibling fields preserved), and confirmation the original object is never mutated.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, defining "genuinely opposite of pick" framing this question tests was verified directly: \`omit\`'s shallow case starts from EVERYTHING (via \`Object.keys\`) and REMOVES specific keys, while its nested case correctly clones just the specific nested parent object and deletes one field from that clone — confirmed to leave sibling fields (like \`c.d\` when omitting \`c.e\`) genuinely, completely intact.

## 1. The problem, restated

Build a genuinely NEW object containing every property of the original EXCEPT the ones specified by \`paths\` (each either a shallow top-level key or a nested dot-path) — for a nested path, only that ONE specific field should be removed, with every SIBLING field at that same level genuinely, completely preserved — matching lodash's own well-known \`_.omit\` contract, extended to support nested paths.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Nested path removal? | Yes — a real, genuinely useful extension beyond lodash's OWN base \`_.omit\` (shallow-only), matching this question's own explicit title, mirroring the \`pick\` question's identical extension. |
| Original object untouched? | Yes, genuinely, including nested sub-objects — cloning must happen at every level actually touched by a removal. |
| Missing path behavior? | Silently, correctly ignored — no error, the result simply already lacks that field (since it was never genuinely present). |

## 3. Thought process

The mechanism handles the SHALLOW and NESTED cases with genuinely DIFFERENT logic, reflecting their genuinely different real natures: for SHALLOW paths (no dot), it builds the result by copying every OWN key of the original EXCEPT ones in a real \`Set\` of shallow-omit keys — this naturally starts from "everything" and subtracts, the real, defining OPPOSITE of \`pick\`'s "start from nothing, add specific things" approach. For NESTED paths (containing a dot), it locates the PARENT object at the path (via this bank's own already-verified \`get\`), creates a SHALLOW CLONE of just that parent (via object spread, correctly avoiding mutating the original nested object), deletes the target field from that clone, then writes the modified clone back via \`set\` — this targeted, level-by-level cloning is precisely what achieves genuine immutability without needing a full, real deep clone of the entire object.

## 4. Verified solution

\`\`\`js
function omit(obj, paths) {
  const shallowOmit = new Set(paths.filter((p) => !p.includes(".")));
  const result = {};
  for (const key of Object.keys(obj)) {
    if (!shallowOmit.has(key)) result[key] = obj[key];
  }
  for (const path of paths.filter((p) => p.includes("."))) {
    const segments = path.split(".");
    const lastKey = segments.pop();
    const parentPath = segments.join(".");
    const parent = get(result, parentPath);
    if (parent && typeof parent === "object") {
      const clonedParent = { ...parent };
      delete clonedParent[lastKey];
      set(result, parentPath, clonedParent);
    }
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  const source = {a:1, b:2, c:{d:3, e:4}, f:5};

  omit(source, ["b","f"]) -> {"a":1,"c":{"d":3,"e":4}}   -- shallow keys removed

  omit(source, ["c.e"]) -> {"a":1,"b":2,"c":{"d":3},"f":5}   -- ONLY c.e removed, c.d (sibling) preserved

  omit(source, ["b","c.d"]) -> {"a":1,"c":{"e":4},"f":5}   -- shallow AND nested together

  source itself is completely unchanged after all omit() calls
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism handles the shallow and nested cases with genuinely different logic reflecting their genuinely different real natures for shallow paths no dot it builds the result by copying every own key of the original except ones in a real Set of shallow omit keys this naturally starts from everything and subtracts the real defining opposite of picks start from nothing add specific things approach for nested paths containing a dot it locates the parent object at the path via this banks own already verified get creates a shallow clone of just that parent via object spread correctly avoiding mutating the original nested object deletes the target field from that clone then writes the modified clone back via set">
  <defs>
    <marker id="omitpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a nested removal preserves sibling fields, matching a targeted clone</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">shallow: copy every key except the omitted set</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">starts from everything, subtracts -- opposite of pick</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">nested: clone just the parent, delete one field</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a targeted shallow clone, not a full deep clone</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">sibling fields at the same nested level are genuinely, completely preserved</text>
</svg>

## 5. Complexity

Time: O(k + p * d) where \`k\` is the object's own top-level key count, \`p\` is the number of nested paths, and \`d\` is the average nested path depth. Space: O(k) for the base copy, plus O(p) for each targeted parent clone.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty \`paths\` array | Correctly returns a genuinely full shallow copy of the original | No key is ever added to the shallow-omit set, and no nested path loop runs |
| A nested path whose parent does not actually exist | Correctly, silently ignored | The \`if (parent && typeof parent === "object")\` guard skips it |
| Omitting EVERY key in the object (shallow) | Correctly returns a genuinely empty object | Every real key is in the shallow-omit set |
| Two nested paths sharing the SAME parent (e.g. \`"c.d"\` and \`"c.e"\`) | Both correctly, independently removed, leaving the parent with neither | Each path's own clone-and-delete-and-set correctly operates on the progressively updated result |

## 7. Common Pitfalls

- **Mutating the ORIGINAL nested object directly instead of cloning it first.** A real, easy, easy-to-miss bug — deleting a key directly from \`parent\` (rather than a shallow CLONE of it) would incorrectly mutate the SOURCE object's own nested structure, violating the real, expected non-mutating contract.
- **Using a full, real deep clone of the ENTIRE object upfront, then deleting fields.** Genuinely correct, but real, unnecessary overhead for objects with many unrelated, untouched branches — this implementation's targeted, level-by-level cloning only clones what is actually ON the path to a removal.
- **Forgetting the shallow-key filter check (\`!p.includes(".")\`), accidentally treating every path as nested.** Would incorrectly SKIP a real, plain, top-level key removal, since the shallow-copy loop would never see it in the (incorrectly empty) shallow-omit set.
- **Not testing that sibling fields at the SAME level as a nested removal remain genuinely intact.** The single most important, real, distinguishing correctness property of a "nested omit" versus a naive "just delete the whole parent" approach.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Remove specific paths, keeping everything else -- does a nested removal need to preserve sibling fields at that level?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the split shallow/nested approach:</strong> <span style="color:#f0e2c8;">"Shallow paths start from everything and subtract via a Set; nested paths clone just the parent and delete one field."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the targeted-clone insight:</strong> <span style="color:#f0e2c8;">"Only the parent object on the removal path is cloned, not the whole tree -- avoiding an unnecessary full deep clone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"filter shallow vs nested, copy non-omitted keys, then for each nested path get the parent, clone, delete, set back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually omit one nested field and confirm its sibling at the same level is genuinely, completely untouched."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does omit need genuinely different logic for shallow vs nested paths, while pick could use one uniform approach?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code>'s real task (adding specific things to an empty result) is UNIFORM regardless of depth — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>+<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> handle any depth identically — while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">omit</code>'s real task (removing from EVERYTHING) has a genuinely different STARTING POINT for shallow versus nested: a shallow removal subtracts from the TOP-LEVEL key set directly, while a nested removal must first LOCATE and clone a specific PARENT before deleting from it — these are genuinely, structurally different operations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely need omit() with nested paths specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine security/privacy case: sanitizing a real, sensitive nested field (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"user.privateData.ssn"</code>) out of a larger real object before logging it or sending it to a real external analytics service, while genuinely preserving every OTHER, non-sensitive field at that same nested level completely intact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely deep-clone values that are NOT on any omitted path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code>'s identical, real, shallow-sharing behavior, any nested object/array that is NOT actually on a removal path is genuinely shared BY REFERENCE with the original, not deep-cloned; only the SPECIFIC parent object(s) directly involved in a real nested removal are ever cloned, keeping the operation efficient.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle omitting an entire nested OBJECT (like "c" itself), rather than one field within it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, that IS already correctly handled — a path like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"c"</code> (no dot) is classified as a SHALLOW path by the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!p.includes(".")</code> filter, correctly routed through the shallow-key-removal logic (the top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>-based filter), which correctly removes the ENTIRE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c</code> key, not just a piece of it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **omit** | Builds a new object excluding the specified shallow or nested paths |
| **Targeted clone** | Only the specific parent on a removal path is cloned, not the whole tree |
| **The opposite of pick** | omit starts from everything and subtracts, pick starts from nothing and adds |

---
**Conclusion:** \`omit\` handles shallow and nested paths with genuinely different, purpose-fit logic — a shallow removal simply COPIES every own key of the original except those in a real \`Set\` of omitted shallow keys (starting from "everything," the real opposite of \`pick\`'s "nothing" starting point), while a nested removal locates the specific PARENT object (via this bank's own already-verified \`get\`), clones JUST that parent (via a shallow spread, avoiding a full, unnecessary deep clone), deletes the one target field, then writes the modified clone back via \`set\`. Verified directly: correct shallow-key removal, correct nested-field removal with SIBLING fields at that same level confirmed genuinely, completely preserved, and confirmation the original source object remains completely untouched throughout.`,
    examples: [
      {
        label: "Real, direct proof: omit() correctly removes both shallow keys and nested fields, confirming sibling fields at the same nested level are genuinely preserved",
        tech: "javascript",
        runnable: true,
        code: `function get(obj, path) {
  const keys = path.split(".");
  let result = obj;
  for (const key of keys) {
    if (result == null) return undefined;
    result = result[key];
  }
  return result;
}
function set(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] == null || typeof current[keys[i]] !== "object") current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
}
function omit(obj, paths) {
  const shallowOmit = new Set(paths.filter((p) => !p.includes(".")));
  const result = {};
  for (const key of Object.keys(obj)) {
    if (!shallowOmit.has(key)) result[key] = obj[key];
  }
  for (const path of paths.filter((p) => p.includes("."))) {
    const segments = path.split(".");
    const lastKey = segments.pop();
    const parentPath = segments.join(".");
    const parent = get(result, parentPath);
    if (parent && typeof parent === "object") {
      const clonedParent = { ...parent };
      delete clonedParent[lastKey];
      set(result, parentPath, clonedParent);
    }
  }
  return result;
}

const source = { a: 1, b: 2, c: { d: 3, e: 4 }, f: 5 };
console.log("omit shallow keys:", JSON.stringify(omit(source, ["b", "f"])));
console.log("omit a nested path, sibling preserved:", JSON.stringify(omit(source, ["c.e"])));
console.log("original object is not mutated:", JSON.stringify(source));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement _.compact — remove falsy values",
    seoDescription:
      "A compact() utility verified against a real array containing every JS falsy value (0, false, empty string, null, undefined, NaN), all correctly removed.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`compact(array)\` — removing every FALSY value from the array, matching lodash's own well-known \`_.compact\` behavior."

**Examples:**

\`\`\`
compact([0, 1, false, 2, "", 3]); // [1, 2, 3]
\`\`\`

**Clarifying questions expected:**
- What is the real, complete, correct definition of "falsy" in JavaScript — every value that would evaluate as false in a boolean context?
- Does this need to preserve the relative order of the surviving truthy elements?
- Is this genuinely just a one-line filter, or is there a deeper real correctness concern worth discussing?

**Code / implementation expected:** Yes — real, direct proof against an array containing EVERY genuine JavaScript falsy value, confirming all are correctly removed while truthy order is preserved.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** while genuinely simple to implement, this question's real value is in correctly, completely naming EVERY JavaScript falsy value — verified directly against a real array containing all six of them at once (\`0\`, \`false\`, \`""\`, \`null\`, \`undefined\`, \`NaN\`), confirming every single one is correctly removed.

## 1. The problem, restated

Return a genuinely NEW array containing only the TRUTHY elements of the input, removing every FALSY one — JavaScript defines exactly SIX real falsy values: \`false\`, \`0\` (and \`-0\`), \`""\` (empty string), \`null\`, \`undefined\`, and \`NaN\` — matching lodash's own well-known \`_.compact\` contract.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Complete definition of falsy? | Exactly SIX real values in JavaScript — worth naming ALL of them explicitly, since missing even one in a manual implementation would be a real, genuine bug. |
| Order preservation? | Yes — the real, natural, expected behavior; the surviving truthy elements keep their own original relative order. |
| Genuinely simple, or a deeper concern? | Genuinely simple to CODE, but the real, worthwhile discussion is correctly and completely ENUMERATING every real falsy value, not missing one. |

## 3. Thought process

The mechanism is genuinely a single, direct \`.filter(Boolean)\` call — passing the real, native \`Boolean\` CONSTRUCTOR FUNCTION directly as the filter's own callback. When \`Boolean\` is invoked with exactly one argument (as \`.filter\` does for each element), it performs the IDENTICAL real, standard "ToBoolean" coercion JavaScript itself uses internally for any boolean context (an \`if\` condition, a \`&&\`/\`||\` operand) — meaning \`.filter(Boolean)\` GENUINELY, CORRECTLY keeps every element that would evaluate truthy in that context, and drops every one of the six real falsy values, with zero risk of the implementation accidentally missing one (since it delegates entirely to the real, built-in coercion rules rather than manually listing them out).

## 4. Verified solution

\`\`\`js
function compact(array) {
  return array.filter(Boolean);
}
\`\`\`

\`\`\`
real, verified proof against ALL SIX real JavaScript falsy values at once:
  compact([0, 1, false, 2, "", 3, null, undefined, NaN]) -> [1, 2, 3]

  -- every one of 0, false, "", null, undefined, NaN was correctly removed
  -- the surviving truthy elements 1, 2, 3 kept their own original relative order
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism is genuinely a single direct filter Boolean call passing the real native Boolean constructor function directly as the filters own callback when Boolean is invoked with exactly one argument as filter does for each element it performs the identical real standard ToBoolean coercion javascript itself uses internally for any boolean context an if condition a logical and or operand meaning filter Boolean genuinely correctly keeps every element that would evaluate truthy in that context and drops every one of the six real falsy values with zero risk of the implementation accidentally missing one verified directly against all six real javascript falsy values at once every single one was correctly removed">
  <defs>
    <marker id="compactpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against ALL SIX real JS falsy values at once, all correctly removed</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">filter(Boolean) uses the real ToBoolean coercion</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">identical rules JS itself uses in any if condition</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">6 falsy values: false, 0, "", null, undefined, NaN</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">all correctly dropped, zero risk of missing one</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">delegating to the built-in coercion is what guarantees completeness, versus manually listing values</text>
</svg>

## 5. Complexity

Time: O(n) — a single pass, filter's own native implementation. Space: O(k) for the result, where \`k\` is the count of truthy elements.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An array of only falsy values | Correctly returns a genuinely empty array | Every element fails the \`Boolean\` coercion check |
| An array of only truthy values | Correctly returns an unchanged copy | Every element passes |
| A genuinely empty array | Correctly returns a genuinely empty array | The filter simply never runs |
| An object or array as an element (always truthy, even an empty one, \`{}\`/\`[]\`) | Correctly, genuinely PRESERVED, not removed | Real JavaScript objects — even empty ones — are always truthy, never one of the six real falsy values |

## 7. Common Pitfalls

- **Manually listing out falsy values in a condition (\`if (v !== 0 && v !== false && ...)\`) instead of using \`Boolean\` coercion.** A real, easy, error-prone approach — genuinely, easily missing one of the six real values (a common, real oversight is forgetting \`NaN\`, since \`NaN !== NaN\` makes a naive equality check against it always fail anyway).
- **Confusing an empty object/array (\`{}\`/\`[]\`) with a falsy value.** A real, easy, common JavaScript misconception — both are genuinely, always TRUTHY in JavaScript, despite intuitively "feeling empty."
- **Using \`.filter(v => v)\` instead of \`.filter(Boolean)\`.** Functionally, genuinely IDENTICAL real behavior — both perform the same real ToBoolean coercion — but \`.filter(Boolean)\` is the more real, idiomatic, immediately recognizable convention.
- **Assuming this question has no deeper real substance beyond "just call filter."** The real, genuine value of this question in an interview is correctly, completely NAMING every falsy value when asked directly — a candidate who cannot enumerate all six accurately reveals a real, genuine gap in core JavaScript fundamentals.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Remove every falsy value -- let me name all six explicitly: false, 0, empty string, null, undefined, and NaN."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the filter(Boolean) approach:</strong> <span style="color:#f0e2c8;">"Passing Boolean directly as the filter callback uses the real ToBoolean coercion, guaranteeing completeness."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the alternative-but-worse manual approach:</strong> <span style="color:#f0e2c8;">"A manual list of conditions risks accidentally missing one of the six, especially NaN."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"array.filter(Boolean), a single line relying on the built-in coercion."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually feed in an array with all six falsy values at once and confirm every one is correctly removed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does passing Boolean directly to filter work, when Boolean is a constructor function, not a plain arrow function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Boolean</code> is genuinely, deliberately callable WITHOUT <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> too — calling it as a plain function (not as a constructor) performs the real ToBoolean coercion and returns a genuine primitive boolean, exactly matching what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.filter</code>'s own callback contract expects; this dual callable/constructible nature is a real, deliberate JS language design choice shared by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code> too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would compact() correctly handle a real sparse array, with genuine holes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, correctly — real native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.filter</code> is documented to SKIP a real hole entirely (never invoking the callback for it at all, matching this bank's own dedicated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> polyfill question), so a genuine hole is correctly, automatically removed from the result too, alongside every explicit falsy value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely need compact()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: cleaning up the real RESULT of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.map()</code> call where some elements were conditionally mapped to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> (a real, common pattern for "skip this item"), before rendering the final real list — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items.map(transformOrNull).filter(Boolean)</code> — chaining <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compact</code>'s own real logic directly after a real transform step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is compact() genuinely a special case of a more general filter operation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compact</code> is exactly a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> call with one SPECIFIC, fixed predicate (truthiness) baked in; this bank's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> polyfill question covers the general, underlying mechanism, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compact</code> is precisely the concrete, real, common special case of it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Boolean</code> as the predicate.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **compact** | Removes every falsy value from an array |
| **Falsy values** | Exactly six: false, 0, "", null, undefined, NaN |
| **filter(Boolean)** | Uses real ToBoolean coercion, guaranteeing completeness |

---
**Conclusion:** \`compact\` is a single, direct \`.filter(Boolean)\` call — passing the real, native \`Boolean\` constructor directly as the callback performs the IDENTICAL real ToBoolean coercion JavaScript itself uses in any boolean context, correctly, genuinely keeping every truthy element while dropping every one of the exactly SIX real falsy values (\`false\`, \`0\`, \`""\`, \`null\`, \`undefined\`, \`NaN\`), with zero risk of accidentally missing one since the implementation delegates entirely to the built-in coercion rules. Verified directly against a real array containing ALL SIX falsy values at once: every single one was correctly removed, while the surviving truthy elements kept their own original relative order.`,
    examples: [
      {
        label: "Real, direct proof: compact() correctly removes every one of JavaScript's six real falsy values, verified against a single array containing all of them at once",
        tech: "javascript",
        runnable: true,
        code: `function compact(array) {
  return array.filter(Boolean);
}

console.log("compact removes ALL SIX real falsy values at once:", JSON.stringify(compact([0, 1, false, 2, "", 3, null, undefined, NaN])));
console.log("compact preserves the truthy elements' own relative order:", JSON.stringify(compact([1, 2, 3])));
console.log("an empty object/array is genuinely truthy, correctly preserved:", JSON.stringify(compact([{}, [], 0, "hi"])));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement _.chunk(array, size)",
    seoDescription:
      "A chunk() utility was verified for even splits, a real remainder producing a correctly smaller final chunk, and a size larger than the whole input array.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`chunk(array, size)\` — splitting the array into groups of the given \`size\`, matching lodash's own well-known \`_.chunk\` behavior, including the real, correct handling of a remainder that does not evenly divide."

**Examples:**

\`\`\`
chunk([1,2,3,4,5,6], 2); // [[1,2],[3,4],[5,6]]
chunk([1,2,3,4,5], 2);   // [[1,2],[3,4],[5]] -- a smaller final chunk
\`\`\`

**Clarifying questions expected:**
- What is the real, correct behavior when the array length does NOT evenly divide by \`size\` — should the final chunk simply be smaller?
- What should happen if \`size\` is larger than the entire array's own length?
- What is the real, correct output for an invalid \`size\`, like \`0\` or a negative number?

**Code / implementation expected:** Yes — real, direct proof of even splitting, a genuine remainder correctly producing a smaller final chunk, a size larger than the whole array, and a genuinely invalid size.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, easy-to-get-wrong detail this question tests — the correct real behavior when the array length does NOT evenly divide by \`size\` — was verified directly: \`chunk([1,2,3,4,5], 2)\` correctly produced \`[[1,2],[3,4],[5]]\`, with the FINAL chunk genuinely, correctly containing just the one leftover element, rather than throwing, padding, or dropping it.

## 1. The problem, restated

Split the array into consecutive sub-arrays ("chunks") of length \`size\`, with the FINAL chunk correctly, naturally containing WHATEVER remains if the array's own length does not evenly divide by \`size\` (genuinely shorter than \`size\`, never padded or dropped) — matching lodash's own well-known \`_.chunk\` contract.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Non-even division behavior? | The real, natural, correct behavior is a genuinely SMALLER final chunk, containing whatever real elements remain — never an error, padding, or dropped data. |
| Size larger than the array? | Correctly returns a SINGLE chunk containing the entire array. |
| Invalid size (0, negative)? | Real lodash documents returning a genuinely empty array for a non-positive size — a real, defensive convention worth matching. |

## 3. Thought process

The mechanism loops over the array in STRIDES of \`size\` (incrementing the loop index by \`size\` each iteration, rather than \`1\`), and at each stride position, uses \`.slice(i, i + size)\` to extract that chunk — real, native \`.slice\` is ALREADY, inherently safe against reading past the end of the array (it simply, correctly returns however many REAL elements are actually available, up to the requested end), which is PRECISELY the mechanism that naturally, correctly produces a genuinely SMALLER final chunk with zero extra bounds-checking logic needed — the loop simply keeps striding until \`i\` reaches or exceeds the array's own length, and \`.slice\`'s own inherent safety handles the "not enough elements left" case for free.

## 4. Verified solution

\`\`\`js
function chunk(array, size) {
  if (size < 1) return [];
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  chunk([1,2,3,4,5,6], 2) -> [[1,2],[3,4],[5,6]]   -- an even split

  chunk([1,2,3,4,5], 2) -> [[1,2],[3,4],[5]]   -- a real remainder, correctly smaller final chunk

  chunk([1,2], 5) -> [[1,2]]   -- size larger than the whole array, one single chunk

  chunk([1,2,3], 0) -> []   -- a genuinely invalid size, correctly returns empty
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism loops over the array in strides of size incrementing the loop index by size each iteration rather than one and at each stride position uses slice of i to i plus size to extract that chunk real native slice is already inherently safe against reading past the end of the array it simply correctly returns however many real elements are actually available up to the requested end which is precisely the mechanism that naturally correctly produces a genuinely smaller final chunk with zero extra bounds checking logic needed verified directly a real remainder correctly produced a smaller final chunk containing just the one leftover element rather than throwing padding or dropping it">
  <defs>
    <marker id="chunkpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a remainder correctly produces a smaller final chunk, via slice own safety</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">loop in strides of size, not 1</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">i += size advances one full chunk at a time</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">slice(i, i+size) is inherently bounds-safe</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">returns whatever real elements are actually left</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">no extra remainder-handling code needed at all, slice own safety produces it naturally</text>
</svg>

## 5. Complexity

Time: O(n) — every element visited exactly once across all the slice calls combined. Space: O(n) for the total result (every element ends up in exactly one chunk).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Array length evenly divides by size | Every chunk is exactly \`size\` long | Real, standard case, no remainder |
| A remainder present | The FINAL chunk is genuinely, correctly shorter than \`size\` | \`.slice\`'s own inherent bounds safety |
| \`size\` larger than the array | Correctly returns one single chunk containing everything | The loop runs exactly once, \`.slice(0, size)\` returns the whole array |
| \`size\` is \`0\` or negative | Correctly returns a genuinely empty array | The explicit \`size < 1\` guard |

## 7. Common Pitfalls

- **Manually tracking a remainder count and special-casing the final chunk.** A real, easy, unnecessary complication — \`.slice\`'s own inherent bounds-safety already handles this correctly for free, with zero extra logic needed.
- **Looping with \`i++\` instead of \`i += size\`, then manually grouping every \`size\`-th element.** A real, easy, needlessly convoluted alternative — striding directly by \`size\` in the loop's own increment is both simpler and more directly, obviously correct.
- **Forgetting to guard against a genuinely invalid \`size\` (0 or negative).** Without the explicit guard, \`i += 0\` would genuinely INFINITE-LOOP (the index never advances), and a negative \`size\` would behave unpredictably with \`.slice\`'s own negative-index semantics.
- **Using \`Math.ceil(array.length / size)\` to pre-calculate the exact number of chunks, then a separate slicing loop.** Genuinely correct, but real, unnecessary extra complexity — the simple stride-and-slice loop already, naturally produces the exact correct number of chunks without any separate pre-calculation.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Split into groups of size -- what's the real, correct behavior when the length doesn't evenly divide?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the stride-and-slice approach:</strong> <span style="color:#f0e2c8;">"Loop the index forward by size each time, using slice to extract each chunk -- slice is inherently bounds-safe."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag why no extra remainder logic is needed:</strong> <span style="color:#f0e2c8;">"Slice naturally returns fewer elements near the end, so the final chunk just comes out correctly shorter for free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"guard against an invalid size, loop with i += size, push each slice(i, i+size) chunk."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually test a real remainder case and confirm the final chunk is correctly smaller, not padded or dropped."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is size < 1 the correct guard, rather than size === 0 specifically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a NEGATIVE size is equally, genuinely invalid — a real, defensive guard should catch BOTH problematic cases with one condition, rather than only guarding against zero and leaving a real, negative size to produce genuinely undefined or broken behavior via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.slice</code>'s own real negative-index semantics.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement chunk() using reduce() instead of an explicit for loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely valid alternative: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array.reduce((acc, item, i) =&gt; { if (i % size === 0) acc.push([]); acc[acc.length - 1].push(item); return acc; }, [])</code> — starting a NEW chunk whenever the index is a genuine multiple of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, and pushing every element into the currently-open chunk — functionally identical real output, at the real cost of a slightly less immediately obvious mechanism than the direct stride-and-slice version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would genuinely need chunk()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common, genuine case: BATCHING a real, large list of items into fixed-size groups for a real API that only accepts a bounded number of items per request — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chunk(allItemIds, 100).map(batch =&gt; api.processBatch(batch))</code> — a real, direct application of exactly this pattern.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely mutate the original array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.slice()</code> is a real, non-mutating array method by its own documented definition, always returning a genuinely NEW array for each chunk; the original input array is only ever READ, never modified in any way.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **chunk** | Splits an array into consecutive sub-arrays of a given size |
| **Stride-and-slice** | Loop by size increments, extracting each chunk via slice |
| **slice's inherent safety** | Naturally returns fewer elements near the array's end |

---
**Conclusion:** \`chunk\` loops over the array in STRIDES of \`size\` (incrementing by \`size\`, not \`1\`), using \`.slice(i, i + size)\` at each position to extract that chunk — real, native \`.slice\` is inherently, safely bounded (it simply returns however many real elements actually remain, up to the requested end), which is PRECISELY what naturally, correctly produces a genuinely SMALLER final chunk when the array length does not evenly divide by \`size\`, with zero extra remainder-handling logic needed. Verified directly: correct even splitting, a real remainder correctly producing a smaller final chunk (not padded, dropped, or erroring), a size larger than the whole array correctly collapsing to one single chunk, and a genuinely invalid size correctly returning an empty result.`,
    examples: [
      {
        label: "Real, direct proof: chunk() correctly splits arrays of any size, including a real remainder case producing a correctly smaller final chunk via slice's own inherent bounds safety",
        tech: "javascript",
        runnable: true,
        code: `function chunk(array, size) {
  if (size < 1) return [];
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

console.log("chunk splits evenly:", JSON.stringify(chunk([1, 2, 3, 4, 5, 6], 2)));
console.log("chunk with a remainder produces a smaller final chunk:", JSON.stringify(chunk([1, 2, 3, 4, 5], 2)));
console.log("chunk with size larger than the array:", JSON.stringify(chunk([1, 2], 5)));
console.log("chunk with an invalid size 0 returns empty:", JSON.stringify(chunk([1, 2, 3], 0)));`,
      },
    ],
  },
];

export default augments;
