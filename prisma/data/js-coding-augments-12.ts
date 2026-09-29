/**
 * Practical JS coding-interview content — batch 12 (Low-Level Design round,
 * medium tier — the parsing/reactive-utility cluster). See
 * js-coding-augments-1.ts's header for the full template rationale, and
 * js-coding-augments-11.ts's header for the standing card-backtick rule
 * (always use explicit, properly-closed <code style="..."> tags inside a
 * card, never a bare markdown backtick — confirmed clean again this batch).
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - A minimal JSON Schema validator was verified across 5 real cases:
 *     fully valid data, a missing required property, a wrong primitive
 *     type, a value below a real numeric minimum, and an invalid item
 *     type inside a nested array — each producing the exact correct,
 *     specific error message.
 *   - An Observable with map()/filter() operators was verified to be
 *     genuinely lazy: a real counter proved the map() callback made
 *     ZERO calls before subscribe() was ever invoked, and exactly one
 *     call per real emission once it was; the full pipeline (map then
 *     filter) was verified end-to-end against a real 5-value source.
 *   - A JSONPath-Lite evaluator (supporting dot paths and [*] wildcards)
 *     was verified against a real, nested users array, correctly
 *     extracting every name and every age across all 3 real records,
 *     and correctly returning an empty result for a genuinely
 *     nonexistent path.
 *   - An async priority task scheduler was verified with a real,
 *     concurrency-1 setup: a low-priority task scheduled FIRST was
 *     allowed to keep running uninterrupted (no preemption), but the
 *     two tasks queued immediately after it were then correctly
 *     started in PRIORITY order (high before medium), not insertion
 *     order — a real, logged execution sequence confirmed this exactly.
 *   - A Trie was verified to return the correct, sorted set of
 *     autocomplete matches for multiple real prefixes, and correctly
 *     an empty array for a genuinely unmatched prefix.
 *   - A minimal HTML tag-tree parser was verified against a real,
 *     nested HTML string (nested <div>/<p>/<span> tags plus text
 *     nodes), producing the exact correct nested tree structure.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "JSON schema validator",
    seoDescription:
      "A minimal JSON Schema validator was verified across 5 real cases: valid data, a missing property, a wrong type, a below-minimum value, a bad array item.",
    description: `**Problem, as an interviewer would state it:**
"Implement a minimal \`validate(schema, data)\` supporting a real subset of JSON Schema: \`type\`, \`required\`, \`properties\`, \`items\`, and \`minimum\` — returning every validation error found, with the exact path to each one."

**Examples:**

\`\`\`
validate({ type: "object", required: ["name"], properties: { name: { type: "string" } } }, { });
// { valid: false, errors: ["$: missing required property \\"name\\""] }
\`\`\`

**Clarifying questions expected:**
- Should validation stop at the FIRST error, or collect every error across the whole structure?
- Does each error need to report the exact PATH to the offending field, for real usability?
- Which real JSON Schema keywords are actually in scope — the full real spec, or a deliberately small subset?

**Code / implementation expected:** Yes — real, direct proof across 5 scenarios: fully valid data, a missing required field, a wrong type, a below-minimum number, and an invalid nested array item type.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** all 5 real validation scenarios below — valid data, a missing field, a wrong type, a below-minimum value, and a bad nested array item — were verified directly, each producing the exact expected error message and path.

## 1. The problem, restated

Given a schema describing an object's expected shape (\`type\`, \`required\` properties, nested \`properties\`, array \`items\`, and a numeric \`minimum\` constraint), recursively check real data against it, COLLECTING every validation failure found anywhere in the structure — not stopping at the first — with each error reporting the exact field path it applies to.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Stop at first error, or collect all? | Collecting all is the real, more useful convention — a real form/API validator showing only ONE error at a time forces a frustrating fix-one-resubmit-repeat cycle. |
| Exact path per error? | Yes, genuinely important for real usability — "invalid data" alone is not actionable; "$.age: expected number, got string" is. |
| Full real spec, or a deliberate subset? | A deliberate subset — the real, full JSON Schema spec is enormous; this question tests the CORE recursive validation pattern, not spec completeness. |

## 3. Thought process

A single recursive \`check(schema, data, path)\` function handles every schema keyword: first, if \`type\` is specified and the data's own real type does not match, record an error and stop checking THIS specific node further (a type mismatch makes any deeper checks meaningless). If the schema is an \`object\` type with \`properties\`, check every \`required\` key is present, then recursively check EACH declared property against its own sub-schema, extending the path with the property name (\`\${path}.\${key}\`). If the schema is an \`array\` type with \`items\`, recursively check EVERY array element against that single \`items\` schema, extending the path with the numeric index (\`\${path}[\${i}]\`). A \`minimum\` constraint is a simple, direct numeric comparison, independent of the recursive structure.

## 4. Verified solution

\`\`\`js
function validate(schema, data, path = "$") {
  const errors = [];
  function typeOf(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value;
  }
  function check(schema, data, path) {
    if (schema.type && typeOf(data) !== schema.type) {
      errors.push(\`\${path}: expected type \${schema.type}, got \${typeOf(data)}\`);
      return;
    }
    if (schema.type === "object" && schema.properties) {
      for (const key of schema.required || []) {
        if (!(key in data)) errors.push(\`\${path}: missing required property "\${key}"\`);
      }
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) check(propSchema, data[key], \`\${path}.\${key}\`);
      }
    }
    if (schema.type === "array" && schema.items) {
      data.forEach((item, i) => check(schema.items, item, \`\${path}[\${i}]\`));
    }
    if (schema.minimum !== undefined && typeof data === "number" && data < schema.minimum) {
      errors.push(\`\${path}: \${data} is below minimum \${schema.minimum}\`);
    }
  }
  check(schema, data, path);
  return { valid: errors.length === 0, errors };
}
\`\`\`

\`\`\`
real, verified outcomes -- schema requiring { name: string, age: number >= 0, tags?: string[] }:
  fully valid data                    -> { valid: true, errors: [] }
  missing "name"                       -> ["$: missing required property \\"name\\""]
  age as a string, not a number        -> ["$.age: expected type number, got string"]
  age of -5, below the real minimum 0  -> ["$.age: -5 is below minimum 0"]
  tags[1] is a number, not a string    -> ["$.tags[1]: expected type string, got number"]
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a single recursive check function handles every schema keyword a type mismatch records an error and stops checking that node further an object type with properties checks every required key then recursively checks each declared property extending the path with the property name an array type with items recursively checks every element extending the path with the numeric index verified directly across five real scenarios each producing the exact expected error message and path">
  <defs>
    <marker id="schema-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: 5 real scenarios, exact error messages and paths</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">object schema: check required, recurse</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">into each declared property, extending the path</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">array schema: recurse into every item</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">against one items schema, index in the path</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">errors are collected, not thrown at the first failure, so every issue is reported together</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of fields/array elements across the whole real data structure — each checked once. Space: O(e + d) for the errors array (\`e\` errors) and the recursion call stack (\`d\` nesting depth).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An extra property NOT declared in the schema | Genuinely ignored, not flagged as an error | This minimal version has no real \`additionalProperties: false\` support — worth naming as a real, common extension |
| A schema with no \`type\` at all | Genuinely accepts any real value for that node | The type check is conditional on \`schema.type\` being present |
| \`required\` listing a key not present in \`properties\` at all | Still correctly checked for presence | \`required\` and \`properties\` are independently processed |
| Multiple errors in the SAME nested object | All genuinely collected together, not just the first | The shared, single \`errors\` array accumulates across every recursive call |

## 7. Common Pitfalls

- **Stopping at the first error found, using an exception-based approach.** Genuinely less useful for a real caller who wants to see EVERY problem at once, not fix-one-resubmit-repeat.
- **Not extending the path when recursing.** Without \`\${path}.\${key}\`/\`\${path}[\${i}]\`, every error would report the SAME generic top-level path, genuinely useless for locating the actual offending field in a real, large payload.
- **Continuing to check nested properties/items after a top-level type mismatch.** If \`data\` is not even the right TYPE (e.g. a string where an object was expected), recursing into "properties" that do not meaningfully exist on it would either crash or produce genuinely confusing, redundant errors — the early \`return\` after a type mismatch avoids this.
- **Forgetting the \`data\` guard on \`Array.isArray\`/\`typeof\` checks for null.** \`typeof null === "object"\` is a real, classic JS gotcha — the explicit \`typeOf\` helper correctly special-cases \`null\` before the generic \`typeof\` fallback.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Validate against a schema subset -- should I collect every error, or stop at the first?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the recursive structure:</strong> <span style="color:#f0e2c8;">"One check function handling type, object properties, and array items, recursing with an extended path each time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Note the type-mismatch short-circuit:</strong> <span style="color:#f0e2c8;">"If the type itself is wrong, I stop checking deeper on that node -- further checks wouldn't be meaningful."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a shared errors array, type check first, then required/properties for objects, items for arrays, minimum last."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run a few real bad payloads and confirm the error messages report the exact right path."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add support for additionalProperties: false, rejecting unknown fields?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the object-checking branch, when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">schema.additionalProperties === false</code>, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys(data)</code> against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys(schema.properties)</code>, flagging any real key present in the DATA but not declared in the schema as an error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support real string constraints, like minLength or a regex pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a new, real conditional branch alongside the existing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minimum</code> check: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (schema.minLength !== undefined && typeof data === "string" && data.length < schema.minLength)</code>, and similarly for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pattern</code> via a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new RegExp(schema.pattern).test(data)</code> check — the same additive pattern every new schema keyword follows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a real production app prefer a real library like Zod or Ajv over hand-rolling this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, full JSON Schema spec is genuinely enormous (real conditional schemas, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$ref</code> resolution, format validators for real dates/emails/URIs, schema composition via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">anyOf</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allOf</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">oneOf</code>) — a real, battle-tested library correctly implements all of that plus real performance optimizations (precompiling a schema into a fast validator function); this exercise specifically tests understanding the CORE recursive validation pattern such libraries are built on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own JSONPath-Lite question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely complementary real pairing — this question walks a schema alongside real DATA to check correctness; JSONPath-Lite walks a PATH EXPRESSION alongside real data to EXTRACT values; both share the identical underlying recursive-tree-walking shape, just applied to two genuinely different real purposes.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Schema** | A description of the expected shape/constraints of real data |
| **Path-tracked recursion** | Extending a string path at each recursive step for actionable errors |
| **Error collection** | Gathering every validation failure, not stopping at the first |

---
**Conclusion:** a single recursive \`check\` function, extending a string path at every nested step, correctly implements a real JSON Schema subset — checking type first (short-circuiting deeper checks on a mismatch), then object \`required\`/\`properties\` and array \`items\` recursively, collecting every error into one shared array rather than stopping at the first. Verified directly across 5 real scenarios: valid data, a missing required field, a wrong type, a below-minimum number, and an invalid nested array item type all produced the exact expected error message and path.`,
    examples: [
      {
        label: "Real, direct proof: the validator correctly reports the exact error and path across 5 real scenarios, including a nested array item type mismatch",
        tech: "javascript",
        runnable: true,
        code: `function validate(schema, data, path = "$") {
  const errors = [];
  function typeOf(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value;
  }
  function check(schema, data, path) {
    if (schema.type && typeOf(data) !== schema.type) {
      errors.push(path + ": expected type " + schema.type + ", got " + typeOf(data));
      return;
    }
    if (schema.type === "object" && schema.properties) {
      for (const key of schema.required || []) {
        if (!(key in data)) errors.push(path + ': missing required property "' + key + '"');
      }
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) check(propSchema, data[key], path + "." + key);
      }
    }
    if (schema.type === "array" && schema.items) {
      data.forEach((item, i) => check(schema.items, item, path + "[" + i + "]"));
    }
    if (schema.minimum !== undefined && typeof data === "number" && data < schema.minimum) {
      errors.push(path + ": " + data + " is below minimum " + schema.minimum);
    }
  }
  check(schema, data, path);
  return { valid: errors.length === 0, errors };
}

const userSchema = {
  type: "object",
  required: ["name", "age"],
  properties: {
    name: { type: "string" },
    age: { type: "number", minimum: 0 },
    tags: { type: "array", items: { type: "string" } },
  },
};

console.log("valid data:", JSON.stringify(validate(userSchema, { name: "Ada", age: 30, tags: ["admin"] })));
console.log("missing required field:", JSON.stringify(validate(userSchema, { age: 30 })));
console.log("wrong type:", JSON.stringify(validate(userSchema, { name: "Ada", age: "thirty" })));
console.log("below minimum:", JSON.stringify(validate(userSchema, { name: "Ada", age: -5 })));
console.log("invalid array item type:", JSON.stringify(validate(userSchema, { name: "Ada", age: 30, tags: ["admin", 42] })));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Observable map/filter operators",
    seoDescription:
      "An Observable with map/filter operators was verified genuinely lazy: a real counter proved zero map() calls happened before subscribe() was ever invoked.",
    description: `**Problem, as an interviewer would state it:**
"Implement a minimal \`Observable\` class with \`.subscribe()\`, plus \`.map()\` and \`.filter()\` operators — like a simplified RxJS. Operators should be genuinely LAZY, only running once something actually subscribes."

**Examples:**

\`\`\`
const doubled = source.map(n => n * 2).filter(n => n > 10);
doubled.subscribe({ next: v => console.log(v) }); // NOTHING ran until this line
\`\`\`

**Clarifying questions expected:**
- Must map()/filter() be genuinely lazy, doing nothing at all until subscribe() is called?
- Does each operator need to correctly forward error and complete notifications, not just next values?
- Should subscribe() return an unsubscribe function, matching real Observable conventions?

**Code / implementation expected:** Yes — real, direct proof of genuine laziness: a real counter confirming zero operator calls happen before subscribe(), and exactly one call per real emission once subscribed.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the defining, real property this pattern is tested on — genuine LAZINESS, where an operator like \`.map()\` does absolutely nothing until something actually subscribes — was verified directly with a real counter: zero calls before \`subscribe()\`, exactly one per emission after.

## 1. The problem, restated

Unlike a Promise (which starts running the instant it is created) or an eagerly-computed array (\`.map()\` runs immediately), a real Observable represents a LAZY, potentially-repeatable stream of values — nothing happens until \`.subscribe()\` is called, and each separate subscription gets its own, independent run of the underlying producer logic.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Genuinely lazy, zero work before subscribe? | Yes — this is the real, single defining characteristic distinguishing an Observable from a Promise or a plain array method. |
| Forward error/complete, not just next? | Yes, genuinely required — a real, complete Observable-consumer contract needs all three notification types correctly propagated through every operator. |
| Return an unsubscribe function? | A real, standard, valuable addition, though this minimal version can start without it and layer it in as a follow-up. |

## 3. Thought process

The key design: the \`Observable\` constructor takes a real "subscribe function" (the actual PRODUCER logic) but does NOT invoke it right away — it only stores it. \`.subscribe()\` is the one place that ever actually CALLS that stored function, and only when a real consumer asks for it. An operator like \`.map(fn)\` does NOT eagerly transform anything either — it returns a BRAND NEW \`Observable\`, whose own subscribe function, when eventually called, subscribes to the ORIGINAL source with a wrapped observer that applies \`fn\` to each value before forwarding it onward — genuinely deferring all real work until that final \`.subscribe()\` call reaches all the way back down the operator chain to the true source.

## 4. Verified solution

\`\`\`js
class Observable {
  constructor(subscribeFn) { this._subscribe = subscribeFn; }
  subscribe(observer) { return this._subscribe(observer); }

  map(fn) {
    return new Observable((observer) => this.subscribe({
      next: (v) => observer.next(fn(v)),
      error: (e) => observer.error && observer.error(e),
      complete: () => observer.complete && observer.complete(),
    }));
  }

  filter(fn) {
    return new Observable((observer) => this.subscribe({
      next: (v) => { if (fn(v)) observer.next(v); },
      error: (e) => observer.error && observer.error(e),
      complete: () => observer.complete && observer.complete(),
    }));
  }
}
\`\`\`

\`\`\`
real, verified proof:
  const lazySource = new Observable((observer) => { observer.next(1); observer.complete(); });
  const piped = lazySource.map((n) => { eagerCheckCalls++; return n; }); // NOT subscribed yet

  before subscribing, map() has genuinely NOT run at all: eagerCheckCalls === 0  -> true
  piped.subscribe({ next: () => {} });
  after subscribing, map() runs exactly once:            eagerCheckCalls === 1  -> true

  full pipeline test -- source emits 1..5, .map(n => n*10).filter(n => n > 20):
  results: [30, 40, 50, "done"]   -- correct, real map() calls made: 5 (once per source emission)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the Observable constructor takes a real subscribe function but does not invoke it right away it only stores it dot subscribe is the one place that ever actually calls that stored function an operator like dot map does not eagerly transform anything either it returns a brand new Observable whose own subscribe function when eventually called subscribes to the original source with a wrapped observer applying the transform verified directly a real counter proved zero map calls happened before subscribe was ever invoked and exactly one call per real emission once it was">
  <defs>
    <marker id="obs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: zero calls before subscribe(), one call per real emission after</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">.map(fn) returns a NEW Observable</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">its subscribe function is only stored, not run</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">.subscribe() finally invokes the chain</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">each operator wraps the observer, forwarding transformed values</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">error and complete are forwarded through every operator too, not just next</text>
</svg>

## 5. Complexity

Time: O(1) to build the operator chain (each \`.map\`/\`.filter\` call just wraps a function), O(n) real work per emission across the whole chain once subscribed, where \`n\` is the number of chained operators. Space: O(k) for a chain of \`k\` operators, each holding a reference to its own upstream source.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Subscribing to the SAME Observable twice | Each subscription independently re-runs the full producer logic from scratch | The stored subscribe function is called fresh, per subscription, with no shared state between them |
| An observer missing \`error\`/\`complete\` handlers | Genuinely safe, no crash | The \`observer.error && observer.error(e)\` guard checks existence before calling |
| A filter() that rejects every value | \`complete\` still correctly fires once the source finishes, even with zero \`next\` calls ever forwarded | \`complete\` is forwarded independently of whether any values passed the filter |
| A long chain of many operators | Each still genuinely does zero work until the final \`.subscribe()\` reaches all the way down | Laziness composes correctly through any chain depth |

## 7. Common Pitfalls

- **Calling the subscribe function immediately inside the constructor.** Genuinely defeats the entire point of an Observable — this would make it behave like an eager Promise instead, running before anyone asked for the values.
- **Forgetting to forward error/complete through an operator, only handling next.** A real, incomplete operator — a consumer relying on knowing when the stream finishes (or failed) would never be correctly notified.
- **Sharing state between separate subscriptions.** Real Observables are, by default, "cold" — each subscription gets its own, independent run; accidentally sharing mutable state between them is a real, common source of subtle bugs.
- **Not testing laziness explicitly, only testing the final piped result.** Verifying the FINAL output alone does not prove the intermediate operators were genuinely lazy — a real, direct counter check (as done here) is needed to actually confirm it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A lazy stream with map/filter operators -- must this stay genuinely lazy, doing zero work before subscribe?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the storage-not-invocation design:</strong> <span style="color:#f0e2c8;">"The constructor stores the subscribe function, never calls it -- only subscribe() itself ever invokes it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State how an operator stays lazy:</strong> <span style="color:#f0e2c8;">"map returns a new Observable wrapping the observer -- it doesn't touch the source until someone subscribes to it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a constructor storing subscribeFn, map and filter each returning a new Observable subscribing to this with a wrapped observer."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually count real map() calls before and after subscribing to prove this is genuinely lazy."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add unsubscribe support, stopping a subscription mid-stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.subscribe()</code> return a real cleanup function (or object with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsubscribe()</code> method), and have the underlying subscribe function itself return one too, propagating it through each operator layer — each operator's own wrapping subscribe function returns whatever cleanup ITS upstream subscription returned, so calling unsubscribe at the outermost level correctly cascades all the way down to the true source.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a takeUntil or take(n) operator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">take(n)</code> operator would track a local count in its own wrapping observer's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> handler, forwarding values only while under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>, and calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">observer.complete()</code> (plus, ideally, unsubscribing from the upstream source) once the count is reached — genuinely the same wrapping-observer pattern as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code>, just with its own internal state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does an Observable genuinely differ from an async generator/iterator for representing a stream of values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely important real distinction — an Observable is PUSH-based (the producer decides when to emit, and MULTIPLE subscribers can independently receive the same events), while a real async generator/iterator is PULL-based (the CONSUMER decides when to ask for the next value via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.next()</code>) and typically supports only one real consumer at a time; a real, common use case genuinely needing push-based delivery is a stream of DOM events, which can fire at any time regardless of whether a consumer is actively "pulling."</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a "hot" vs. "cold" Observable, and which is this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">This implementation is genuinely "cold" — since the subscribe function itself runs INDEPENDENTLY for each subscription, two separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.subscribe()</code> calls each get their own, fresh run of the producer logic, potentially seeing different real values if the producer is non-deterministic (like a real timer); a "hot" Observable, by contrast, shares ONE single, ongoing producer among every subscriber, needing a real, separate "Subject"-style implementation to correctly multicast the same events to all of them.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lazy Observable** | Does nothing until subscribe() is actually called |
| **Wrapped observer** | An operator's own observer that transforms values before forwarding |
| **Cold Observable** | Each subscription independently re-runs the producer from scratch |

---
**Conclusion:** genuine laziness comes from the constructor only STORING the real subscribe function rather than invoking it, and each operator (\`.map\`/\`.filter\`) returning a BRAND NEW Observable whose own subscribe function, when eventually called, subscribes to its upstream source with a wrapped observer applying the transform — deferring all real work until a final \`.subscribe()\` call reaches all the way down the chain. Verified directly: a real counter proved zero \`map()\` calls happened before \`subscribe()\` was ever invoked, and exactly one call occurred per real source emission once it was.`,
    examples: [
      {
        label: "Real, direct proof: a real counter confirms zero map() calls happen before subscribe(), and the full map+filter pipeline produces the correct piped results",
        tech: "javascript",
        runnable: true,
        code: `class Observable {
  constructor(subscribeFn) { this._subscribe = subscribeFn; }
  subscribe(observer) { return this._subscribe(observer); }
  map(fn) {
    return new Observable((observer) => this.subscribe({
      next: (v) => observer.next(fn(v)),
      error: (e) => observer.error && observer.error(e),
      complete: () => observer.complete && observer.complete(),
    }));
  }
  filter(fn) {
    return new Observable((observer) => this.subscribe({
      next: (v) => { if (fn(v)) observer.next(v); },
      error: (e) => observer.error && observer.error(e),
      complete: () => observer.complete && observer.complete(),
    }));
  }
}

let eagerCheckCalls = 0;
const lazySource = new Observable((observer) => { observer.next(1); observer.complete(); });
const piped = lazySource.map((n) => { eagerCheckCalls++; return n; });
console.log("before subscribing, map() has NOT run at all:", eagerCheckCalls === 0);
piped.subscribe({ next: () => {} });
console.log("after subscribing, map() ran exactly once:", eagerCheckCalls === 1);

let mapCalls = 0;
const source = new Observable((observer) => {
  [1, 2, 3, 4, 5].forEach((n) => observer.next(n));
  observer.complete();
});
const results = [];
source
  .map((n) => { mapCalls++; return n * 10; })
  .filter((n) => n > 20)
  .subscribe({ next: (v) => results.push(v), complete: () => results.push("done") });

console.log("piped results (map then filter):", results);
console.log("real map() calls, once per source emission:", mapCalls);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a JSONPath-Lite Query Evaluator (Supports Wildcards Like $.users[*].name)",
    seoDescription:
      "A JSONPath-Lite evaluator supporting dot paths and [*] wildcards was verified against a real nested array, correctly extracting every matching value.",
    description: `**Problem, as an interviewer would state it:**
"Implement a simplified JSONPath evaluator supporting dot-notation paths and a \`[*]\` wildcard — \`$.users[*].name\` should return every user's name from a real array of user objects."

**Examples:**

\`\`\`
jsonPathLite(data, "$.users[*].name"); // ["Ada", "Grace", "Alan"]
\`\`\`

**Clarifying questions expected:**
- Does the function always return an ARRAY of matches, even when the path resolves to conceptually one value?
- What should a genuinely nonexistent path return — an empty array, or throw?
- Should this support multiple \`[*]\` wildcards chained together (e.g., an array of arrays)?

**Code / implementation expected:** Yes — real, direct proof against a real, nested users array, correctly extracting every name and every age, and correctly returning empty for a nonexistent path.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the wildcard-expansion mechanism was verified directly against a real, nested 3-user array — correctly extracting all 3 names AND all 3 ages via the SAME evaluator, plus confirming a genuinely nonexistent path correctly returns an empty result rather than crashing.

## 1. The problem, restated

Parse a simplified path expression like \`$.users[*].name\` into a sequence of navigation steps, then walk real data following those steps — a plain key step (\`users\`, \`name\`) moves into that property, while a \`[*]\` wildcard step FANS OUT, applying every SUBSEQUENT step to every element of the current array independently, collecting all resulting matches together.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Always returns an array? | Yes, genuinely the real, standard JSONPath convention — even a path with no wildcard still returns a real array (typically of length 0 or 1), for a consistent, predictable caller contract. |
| Nonexistent path? | Returns an empty array — a real, honest "no matches found," not an error, since a missing field is a normal, expected real-world case. |
| Multiple chained wildcards? | This implementation genuinely supports it naturally, since the fan-out logic is a real, general recursive mechanism, not special-cased to exactly one wildcard. |

## 3. Thought process

The approach splits into two real phases: PARSING the path string into an ordered list of simple tokens (plain keys, and a special \`"*"\` token for a wildcard segment), then EVALUATING those tokens against the data one at a time. Evaluation maintains a real, GROWING list of "current matched nodes" (starting as just \`[data]\`) — for each ordinary key token, it maps every current node to its own value at that key (dropping any node that does not have it); for a \`"*"\` wildcard token, it FLATTENS every current node's own array elements into the new current list — this flattening is exactly what correctly "fans out" the traversal, so every SUBSEQUENT token then applies independently to EVERY one of those fanned-out elements.

## 4. Verified solution

\`\`\`js
function jsonPathLite(data, path) {
  const tokens = path
    .replace(/^\\$\\.?/, "")
    .split(".")
    .filter(Boolean)
    .flatMap((seg) => {
      const m = seg.match(/^([^\\[]+)(\\[\\*\\])?$/);
      return m[2] ? [m[1], "*"] : [seg];
    });

  function evaluate(nodes, tokens) {
    if (tokens.length === 0) return nodes;
    const [token, ...rest] = tokens;
    let next;
    if (token === "*") {
      next = nodes.flatMap((n) => (Array.isArray(n) ? n : []));
    } else {
      next = nodes.flatMap((n) => (n && typeof n === "object" && token in n ? [n[token]] : []));
    }
    return evaluate(next, rest);
  }

  return evaluate([data], tokens);
}
\`\`\`

\`\`\`
real, verified proof -- data.users = [{name:"Ada",age:30},{name:"Grace",age:45},{name:"Alan",age:41}]:
  $.users[*].name  -> ["Ada", "Grace", "Alan"]
  $.users[*].age   -> [30, 45, 41]
  $.users          -> [ [ {name:"Ada",...}, {name:"Grace",...}, {name:"Alan",...} ] ]  (one match: the whole array)
  $.nonexistent[*].x -> []   (genuinely empty, no error thrown)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the path string is parsed into an ordered list of simple tokens plain keys and a special star token for a wildcard segment evaluation maintains a growing list of current matched nodes starting as just the root data for an ordinary key token it maps every current node to its own value at that key for a star wildcard token it flattens every current nodes own array elements into the new current list which is exactly what fans out the traversal so every subsequent token applies independently to every fanned out element verified directly against a real nested three user array correctly extracting all three names and all three ages">
  <defs>
    <marker id="jsonpath-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: [*] wildcard correctly fans out across a real 3-user array</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a plain key token maps every current node</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">to its own value at that key</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a [*] wildcard flattens array elements</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">fanning out - every element becomes its own current node</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">later tokens then apply independently to every fanned out element from the wildcard</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of elements ever visited across the whole traversal — genuinely proportional to the size of the matched data, not the whole original structure. Space: O(n) for the growing list of current matched nodes at each step.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A path with no wildcard at all (\`$.users\`) | Returns an array with exactly ONE match: the whole matched value | The evaluation still runs through the standard "growing list" mechanism, just never fanning out |
| A wildcard applied to a non-array value | That node contributes NOTHING to the fanned-out result | The \`Array.isArray(n) ? n : []\` guard correctly skips non-array nodes |
| A key that does not exist on some (but not all) matched nodes | Only the nodes that genuinely HAVE that key contribute a result | The \`token in n\` check per-node, inside a real \`flatMap\`, naturally drops non-matching nodes |
| Multiple \`[*]\` wildcards chained (e.g. an array of arrays) | Correctly, genuinely supported — each wildcard token independently fans out the CURRENT list further | The mechanism is a real, general recursive reduction over the token list, not hardcoded for exactly one wildcard |

## 7. Common Pitfalls

- **Assuming the result is always a single value instead of an array.** The real, standard JSONPath convention (and this implementation) always returns an array of matches — even a path resolving to conceptually "one thing" returns a real 1-element array.
- **Not correctly flattening on a wildcard, instead nesting arrays.** Using \`.map\` instead of \`.flatMap\` for the wildcard case would leave each array's elements NESTED inside an outer array rather than genuinely fanned out into the flat current-node list, breaking every subsequent token's traversal.
- **Throwing an error for a nonexistent path instead of returning an empty array.** A real, common real-world case (a missing optional field) should genuinely produce "no matches," not a crash.
- **Not handling a key access on a non-object node gracefully.** Without the \`n && typeof n === "object"\` guard, accessing a property on a genuinely primitive value (a string, number, or \`null\`) mid-traversal could throw or silently produce an incorrect \`undefined\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Dot paths with a wildcard -- does the result always come back as an array, even for a single match?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two-phase approach:</strong> <span style="color:#f0e2c8;">"Parse the path into tokens first, then evaluate them one at a time against a growing list of current nodes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the fan-out mechanism:</strong> <span style="color:#f0e2c8;">"A wildcard token flattens array elements into the current list, so later tokens apply to every one independently."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"tokenize the path, then a recursive evaluate mapping or flattening the current nodes per token."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run this against a real nested array with multiple entries and confirm every value is correctly extracted."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add support for an explicit numeric array index, like $.users[0].name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extend the tokenizer regex to also capture a real numeric index (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\\[(\\d+)\\]</code>), producing a distinct token type; the evaluator's per-token switch would then map each current array node to its real element at that SPECIFIC index (or drop the node if out of bounds), rather than fanning out to every element like the wildcard case does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support a filter expression, like $.users[?(@.age > 40)].name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely significant, real extension — the real, full JSONPath spec's filter syntax requires a small real expression PARSER capable of evaluating a boolean condition (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@.age &gt; 40</code>) against each candidate array element, then only including elements that satisfy it in the fanned-out result — genuinely a much bigger real undertaking than the simple wildcard case, worth naming honestly as beyond this minimal version's real scope.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical use case does a JSONPath-style query have, beyond a coding exercise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: extracting a small, specific slice of data from a large, real API response without writing custom real destructuring/mapping code for each new query — real tools like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jq</code> (for JSON on the command line) and real API-testing tools genuinely rely on exactly this kind of path-query language for flexible, ad-hoc data extraction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own JSON schema validator question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely the same underlying real shape — both walk a real, nested data structure step by step, tracking a real "current position" (or set of positions) as they go; the schema validator walks alongside a SCHEMA to check correctness, while this walks alongside a PATH EXPRESSION to extract values — recognizing this shared recursive-tree-walking pattern across superficially different real questions is a genuinely strong interview signal.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Token** | A single parsed step of the path — a plain key or a wildcard |
| **Fan-out** | A wildcard flattening array elements so later steps apply to each |
| **Current node list** | The growing set of matched values threaded through evaluation |

---
**Conclusion:** parsing a path into an ordered list of tokens, then evaluating them against a growing "current matched nodes" list — a plain key MAPS every current node to its property value, while a \`[*]\` wildcard FLATTENS every current node's array elements into the list — correctly implements dot-path-with-wildcard querying, with later tokens naturally applying independently to every fanned-out element. Verified directly against a real, nested 3-user array: the identical evaluator correctly extracted all 3 names and all 3 ages, and correctly returned an empty result for a genuinely nonexistent path rather than crashing.`,
    examples: [
      {
        label: "Real, direct proof: the evaluator correctly extracts every name and every age from a real nested users array, and returns empty for a nonexistent path",
        tech: "javascript",
        runnable: true,
        code: `function jsonPathLite(data, path) {
  const tokens = path
    .replace(/^\\$\\.?/, "")
    .split(".")
    .filter(Boolean)
    .flatMap((seg) => {
      const m = seg.match(/^([^\\[]+)(\\[\\*\\])?$/);
      return m[2] ? [m[1], "*"] : [seg];
    });

  function evaluate(nodes, tokens) {
    if (tokens.length === 0) return nodes;
    const [token, ...rest] = tokens;
    let next;
    if (token === "*") {
      next = nodes.flatMap((n) => (Array.isArray(n) ? n : []));
    } else {
      next = nodes.flatMap((n) => (n && typeof n === "object" && token in n ? [n[token]] : []));
    }
    return evaluate(next, rest);
  }

  return evaluate([data], tokens);
}

const data = {
  users: [
    { name: "Ada", age: 30 },
    { name: "Grace", age: 45 },
    { name: "Alan", age: 41 },
  ],
};

console.log("$.users[*].name:", jsonPathLite(data, "$.users[*].name"));
console.log("$.users[*].age:", jsonPathLite(data, "$.users[*].age"));
console.log("a nonexistent path returns empty:", jsonPathLite(data, "$.nonexistent[*].x"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Async Priority Task Scheduler",
    seoDescription:
      "An async priority scheduler was verified with real, logged execution: two tasks queued after an already-running one correctly started in priority order.",
    description: `**Problem, as an interviewer would state it:**
"Build a task scheduler that runs queued ASYNC tasks by PRIORITY, not insertion order — a higher-priority task queued later should still run before a lower-priority one that was queued earlier, as long as neither has started yet."

**Examples:**

\`\`\`
scheduler.schedule(lowPriorityTask, 1);
scheduler.schedule(highPriorityTask, 10); // queued SECOND, but should run FIRST
\`\`\`

**Clarifying questions expected:**
- Can an already-RUNNING task be preempted by a higher-priority one arriving later, or does priority only affect the order of tasks that have not started yet?
- What real concurrency limit applies — one task at a time, or several running simultaneously?
- Should two tasks with the SAME priority run in their original insertion order (a stable sort)?

**Code / implementation expected:** Yes — real, direct, logged proof that tasks queued after an already-started one correctly run in PRIORITY order, not insertion order.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, defining behavior a priority scheduler must get right — that tasks NOT YET STARTED run in priority order, while an ALREADY-RUNNING task is never interrupted — was verified directly with a real, logged execution sequence: a low-priority task allowed to keep running, followed correctly by high-before-medium for the two tasks queued after it.

## 1. The problem, restated

A scheduler accepting async tasks with a numeric priority, running them respecting a configured concurrency limit — but critically, among tasks that have NOT yet started, a higher-priority one must run BEFORE a lower-priority one, regardless of which was scheduled first. JavaScript's single-threaded, run-to-completion nature means a genuinely ALREADY-RUNNING task cannot be interrupted mid-execution — priority only affects which task starts NEXT, once a slot is free.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Can a running task be preempted? | Genuinely, no — JavaScript has no real mechanism to pause an in-progress synchronous stretch of execution; priority only governs which task starts NEXT. |
| What concurrency limit? | A real, configurable parameter — worth naming that concurrency=1 makes priority ordering the most directly observable. |
| Same-priority tie-breaking? | Stable insertion order is the real, common, expected convention for equal priorities. |

## 3. Thought process

The core mechanism: a real, growing QUEUE of pending \`{priority, task, resolve, reject}\` entries. Every time a NEW task is scheduled, push it onto the queue, then RE-SORT the whole queue by priority (descending) — this keeps the highest-priority PENDING task always at the front, ready to run next. Separately, an \`active\` counter, gated against the configured \`concurrency\`, controls when a task is actually allowed to START: whenever a slot is free AND the queue is non-empty, shift the FRONT (now guaranteed highest-priority) entry off the queue and run it — when it finishes, free the slot and immediately try to start the next one.

## 4. Verified solution

\`\`\`js
function createPriorityScheduler(concurrency) {
  const queue = [];
  let active = 0;

  function schedule(task, priority = 0) {
    return new Promise((resolve, reject) => {
      queue.push({ priority, task, resolve, reject });
      queue.sort((a, b) => b.priority - a.priority); // highest priority first
      runNext();
    });
  }

  function runNext() {
    if (active >= concurrency || queue.length === 0) return;
    const { task, resolve, reject } = queue.shift();
    active++;
    Promise.resolve(task()).then(resolve, reject).finally(() => {
      active--;
      runNext();
    });
  }

  return { schedule };
}
\`\`\`

\`\`\`
real, verified proof -- concurrency=1 (so priority ordering is directly, clearly observable):
  scheduler.schedule(lowTask, 1);     // starts running immediately, before anything else is queued
  scheduler.schedule(highTask, 10);   // queued while "low" is already running
  scheduler.schedule(mediumTask, 5);  // queued right after

  real, logged execution order: ["low", "high", "medium"]
  -- "low" was NOT preempted (already running when the others arrived), but
     "high" correctly ran BEFORE "medium" once a slot freed, by priority, not insertion order
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a growing queue of pending entries every time a new task is scheduled push it onto the queue then re sort the whole queue by priority descending keeping the highest priority pending task always at the front an active counter gated against the configured concurrency controls when a task is allowed to start whenever a slot is free and the queue is non empty shift the front now guaranteed highest priority entry off the queue and run it verified directly with real logged execution a low priority already running task was not preempted but two tasks queued after it correctly ran in priority order high before medium not insertion order">
  <defs>
    <marker id="sched-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: tasks queued after an already-running one run in priority order</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">schedule() pushes, then re-sorts by priority</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the highest-priority PENDING task stays at the front</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a free slot shifts the front entry off</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">an already-running task is never interrupted</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">priority only governs which PENDING task starts next, never preempts a running one</text>
</svg>

## 5. Complexity

Time: O(k log k) per real \`schedule\` call for the re-sort, where \`k\` is the current queue length — a real, honest trade-off worth naming; a production version would use a real priority-queue (binary heap, this bank's own dedicated question) for O(log k) insertion instead of a full re-sort. Space: O(k) for the pending queue.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`concurrency\` greater than the number of scheduled tasks | All genuinely start immediately, priority order becomes irrelevant since nothing ever waits | The \`active >= concurrency\` guard never blocks anything |
| Two tasks with the IDENTICAL priority | Run in their original, real insertion (schedule) order relative to each other | JS's real, stable \`Array.prototype.sort\` preserves relative order for equal comparator results |
| A scheduled task itself throws/rejects | That specific caller's promise rejects; the scheduler correctly continues processing the rest of the queue | \`.then(resolve, reject)\` plus \`.finally\` always calls \`runNext()\` regardless of outcome |
| Scheduling many tasks in a tight synchronous burst | All correctly queued and sorted before any of them (beyond the concurrency limit) can start | Each \`schedule\` call synchronously pushes+sorts before \`runNext\` even checks the active count |

## 7. Common Pitfalls

- **Sorting the queue only ONCE at read time instead of after every insertion.** Without re-sorting on EVERY \`schedule\` call, a later, higher-priority task added to an already-sorted queue would not actually move to the correct front position.
- **Assuming priority can preempt an already-running task.** Genuinely, structurally impossible in JavaScript's synchronous execution model — this is a real, honest limitation worth stating explicitly rather than over-promising.
- **Using an unstable sort or naive equal-priority handling.** Real, common expectation is that equal-priority tasks run in their original relative order — an unstable sort could silently reorder them unpredictably.
- **Reimplementing this with a plain array re-sort at real production scale with MANY tasks.** A real, honest performance concern worth naming — a proper binary-heap-backed priority queue (this bank's own dedicated question) is the real, more efficient choice for a large, busy scheduler.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Run pending tasks by priority -- can an already-running task be preempted, or only pending ones reordered?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the JS execution constraint:</strong> <span style="color:#f0e2c8;">"JavaScript can't preempt an already-running synchronous stretch -- priority only affects which pending task starts next."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the queue-plus-resort mechanism:</strong> <span style="color:#f0e2c8;">"A growing queue, re-sorted by priority on every schedule call, an active counter gating concurrency."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"schedule pushes and sorts then calls runNext, runNext checks the active count and shifts the front entry."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually schedule a low-priority task first, then a high and medium one, and confirm the real execution order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you swap the plain array + re-sort for a real, more efficient binary heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.push</code> + full re-sort with a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MinHeap</code>-style <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code> (this bank's own dedicated priority-queue question) using an INVERTED comparator for max-priority-first, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extractMin</code> in place of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.shift()</code> — reducing per-operation cost from O(k log k) to O(log k), a real, meaningful improvement at scale.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support dynamically CHANGING a pending task's priority after it's already been scheduled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">schedule</code> return a real, unique task ID (or the mutable queue entry object itself) alongside its promise; a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updatePriority(id, newPriority)</code> method would find that entry, mutate its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority</code> field, and re-sort the queue — genuinely straightforward with this array-based approach, though a real binary-heap version would need a more careful real re-heapify step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario needs priority-based task scheduling like this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: a real image-loading queue on a page with limited concurrent real network requests, where images currently VISIBLE in the viewport should genuinely load before ones further down the page that the user has not scrolled to yet — as the user scrolls, newly-visible images can be scheduled with a HIGHER real priority, correctly jumping ahead of still-pending, lower-priority off-screen ones.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to the real, native Prioritized Task Scheduling API (scheduler.postTask)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, the SAME real underlying idea, at the real BROWSER level rather than app level — real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">scheduler.postTask(callback, {priority})</code> (covered in this bank's own completed JS ULTRA project's coverage of scheduler.yield) lets the real browser itself schedule work at "user-blocking"/"user-visible"/"background" priority levels, correctly interleaving it with real rendering and other browser work — a genuinely more powerful, native version of the same priority-ordering principle this question builds by hand.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Priority ordering** | Higher-priority PENDING tasks run before lower-priority ones |
| **No preemption** | An already-running task is never interrupted, by JS's own nature |
| **Active/concurrency gate** | Controls how many tasks are allowed to run simultaneously |

---
**Conclusion:** a growing queue, re-sorted by priority on every real \`schedule\` call, keeps the highest-priority PENDING task always at the front — an active-count gate, checked against a configured concurrency limit, shifts that front entry off and runs it whenever a slot frees, correctly implementing priority ordering among not-yet-started tasks while genuinely never interrupting one already running (JavaScript's own execution model makes true preemption impossible). Verified directly with a real, logged execution sequence: a low-priority task already running was correctly left uninterrupted, while the two tasks queued after it correctly ran in real PRIORITY order (high before medium), not insertion order.`,
    examples: [
      {
        label: "Real, direct proof: two tasks queued after an already-running low-priority task correctly run in priority order (high before medium), not insertion order",
        tech: "javascript",
        runnable: true,
        code: `function createPriorityScheduler(concurrency) {
  const queue = [];
  let active = 0;

  function schedule(task, priority = 0) {
    return new Promise((resolve, reject) => {
      queue.push({ priority, task, resolve, reject });
      queue.sort((a, b) => b.priority - a.priority);
      runNext();
    });
  }

  function runNext() {
    if (active >= concurrency || queue.length === 0) return;
    const { task, resolve, reject } = queue.shift();
    active++;
    Promise.resolve(task()).then(resolve, reject).finally(() => {
      active--;
      runNext();
    });
  }

  return { schedule };
}

(async () => {
  const scheduler = createPriorityScheduler(1);
  const order = [];
  const makeTask = (label) => async () => {
    order.push(label);
    await new Promise((r) => setTimeout(r, 5));
    return label;
  };

  const p1 = scheduler.schedule(makeTask("low"), 1);
  const p2 = scheduler.schedule(makeTask("high"), 10);
  const p3 = scheduler.schedule(makeTask("medium"), 5);

  await Promise.all([p1, p2, p3]);
  console.log("real execution order (priority, not insertion order, for the pending tasks):", order);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Trie autocomplete suffix search",
    seoDescription:
      "A Trie was verified to return correct, sorted autocomplete matches for multiple real prefixes, and correctly an empty array for a genuinely unmatched one.",
    description: `**Problem, as an interviewer would state it:**
"Implement a Trie (prefix tree) with \`insert(word)\` and \`autocomplete(prefix)\`, returning every real inserted word that starts with the given prefix."

**Examples:**

\`\`\`
trie.insert("cat"); trie.insert("car"); trie.insert("card");
trie.autocomplete("ca"); // ["car", "card", "cat"]
\`\`\`

**Clarifying questions expected:**
- Should autocomplete results be returned in a specific order (like alphabetical), or is any order acceptable?
- Should the prefix itself, if it is also a complete inserted word, be included in its own results?
- What is the real time complexity of autocomplete relative to the total number of inserted words, versus just the matching ones?

**Code / implementation expected:** Yes — real, direct proof of correct, sorted autocomplete results across multiple real prefixes, including a genuinely unmatched prefix returning an empty array.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** real, direct autocomplete results were verified across multiple real prefixes against a small dictionary of inserted words, confirming both correct matches and a correctly empty result for a genuinely unmatched prefix.

## 1. The problem, restated

A Trie stores words character-by-character down a tree, where each node represents ONE character position shared by every word passing through it — this shared-prefix structure is exactly what makes "find every word starting with X" efficient: walk down the tree following the prefix's own characters ONCE, then explore only the subtree beneath that point.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Specific result order? | Alphabetical is the real, common, user-friendly convention for a real autocomplete UI — worth confirming explicitly. |
| Prefix that is itself a complete word? | Should genuinely be included in its own results — a real, easy-to-miss edge case. |
| Complexity relative to total words vs. matches? | Genuinely proportional to the PREFIX length plus the number of MATCHING words (and their own lengths), not the total dictionary size — the real, defining efficiency benefit of a Trie. |

## 3. Thought process

\`insert(word)\` walks the Trie one character at a time, creating a new child node whenever a character path does not already exist, and marking the FINAL node (after the last character) with an \`isEnd\` flag. \`autocomplete(prefix)\` first walks down the Trie following the prefix's own characters — if that walk ever hits a character with no corresponding child node, the prefix genuinely has NO matches, and an empty array returns immediately. Otherwise, from the node reached at the end of the prefix, a DEPTH-FIRST traversal collects every word ending (\`isEnd\` node) found anywhere in that entire subtree, reconstructing each complete word by tracking the accumulated path of characters along the way.

## 4. Verified solution

\`\`\`js
class TrieNode {
  constructor() { this.children = new Map(); this.isEnd = false; }
}
class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }
  _collect(node, prefix, results) {
    if (node.isEnd) results.push(prefix);
    for (const [ch, child] of node.children) this._collect(child, prefix + ch, results);
  }
  autocomplete(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const results = [];
    this._collect(node, prefix, results);
    return results.sort();
  }
}
\`\`\`

\`\`\`
real, verified proof -- inserted: cat, car, card, care, dog, do
  autocomplete("ca")  -> ["car", "card", "care", "cat"]
  autocomplete("car") -> ["car", "card", "care"]
  autocomplete("do")  -> ["do", "dog"]    -- "do" itself is a complete word, correctly included
  autocomplete("xyz") -> []               -- genuinely no matches, no crash
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="insert walks the Trie one character at a time creating a new child node whenever a character path does not already exist marking the final node with an isEnd flag autocomplete first walks down the Trie following the prefixs own characters if that walk hits a missing character the prefix genuinely has no matches otherwise a depth first traversal from that node collects every word ending found in that entire subtree reconstructing each complete word along the way verified directly across multiple real prefixes against a small dictionary confirming correct matches and a correctly empty result for a genuinely unmatched prefix">
  <defs>
    <marker id="trie-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: correct, sorted matches across multiple real prefixes</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">walk the prefix own characters down</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a missing character means genuinely zero matches</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">depth-first collect every isEnd below</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">reconstructing each word along the accumulated path</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">only the matching subtree is ever explored, never the whole dictionary</text>
</svg>

## 5. Complexity

Time: O(p) to walk down the prefix, plus O(m) to collect every matching word (where \`m\` is the total character count across every matched word) — genuinely independent of the total dictionary size beyond the matched subtree. Space: O(total characters across all inserted words) for the Trie structure itself.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty-string prefix | Returns EVERY inserted word, sorted | The prefix walk trivially succeeds with zero steps, and collection starts from the root itself |
| A prefix that is itself a complete word | Correctly included in its own results | The starting node's own \`isEnd\` flag is checked during collection just like any other node |
| Two words sharing a long common prefix (e.g. "card"/"care") | Correctly, both returned for prefix "car" | Shared characters correctly reuse the SAME Trie nodes, diverging only where the words themselves differ |
| A prefix genuinely absent from the Trie | Returns an empty array immediately, no unnecessary traversal | The walk-down loop returns \`[]\` the instant a missing character is found |

## 7. Common Pitfalls

- **Scanning the entire dictionary linearly for each autocomplete call instead of using the Trie's own shared-prefix structure.** Defeats the entire real point of a Trie — a real, naive linear scan is genuinely O(total dictionary size) per query, while the Trie approach is proportional only to the prefix length plus matched results.
- **Forgetting to check \`isEnd\` at the STARTING node of collection.** Missing the case where the prefix itself is also a genuinely complete, previously-inserted word.
- **Not sorting the final results, if a specific real order matters for the use case.** A real autocomplete UI genuinely benefits from a predictable, alphabetical order rather than whatever arbitrary order the Map's own iteration happens to produce.
- **Using a plain object instead of a Map for children, without considering key-ordering or prototype-pollution concerns.** A real, minor but genuine concern — a plain object's own keys could theoretically collide with inherited prototype properties (like \`"constructor"\`) for a genuinely adversarial input; a real \`Map\` sidesteps this entirely.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Every inserted word starting with a prefix -- does the prefix itself, if it's a complete word, need to be included?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the shared-prefix structure:</strong> <span style="color:#f0e2c8;">"A Trie shares nodes across common prefixes -- walk the prefix once, then only explore that subtree."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the two operations:</strong> <span style="color:#f0e2c8;">"insert walks and creates missing nodes, marking isEnd; autocomplete walks the prefix then depth-first collects every isEnd below."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a TrieNode with children and isEnd, insert building the path, autocomplete walking then a recursive _collect."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check a prefix that's itself a complete word, plus one that has genuinely no matches."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rank autocomplete results by real popularity/frequency instead of alphabetically?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a real, additional <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frequency</code> field on each real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code> node (or in a real, separate lookup map keyed by word), and change the final <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.sort()</code> call to sort by that frequency descending instead of alphabetically — genuinely the same collection mechanism, just a different real final ordering.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you limit results to just the top N matches, for a real large dictionary with a common short prefix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, simple fix is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.slice(0, n)</code> after sorting — genuinely correct but potentially wasteful if the matching subtree is huge, since it still collects EVERY match before truncating; a real, more efficient version would stop the depth-first collection early once <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> results are found, avoiding exploring the rest of a genuinely large subtree unnecessarily.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a real delete(word) operation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk down to the word's own final node and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd = false</code> — genuinely enough for CORRECTNESS (the word no longer appears in results), though a real, more thorough version would also prune now-unnecessary trailing nodes that have no OTHER real word depending on them, to avoid real, unbounded memory growth from words that are inserted and deleted repeatedly over a long session.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical products use a Trie-based autocomplete under the hood?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely common, real, practical examples: a real search engine's own query-suggestion dropdown, a real IDE's code-completion feature (matching partially-typed identifiers), and a real phone keyboard's own next-word prediction — all rely on this identical shared-prefix-tree principle to efficiently narrow down candidates from a real, large real dictionary or corpus.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Trie / prefix tree** | A tree sharing nodes across common prefixes of inserted words |
| **isEnd flag** | Marks a node as the genuine end of a real, complete inserted word |
| **Depth-first collection** | Walking a subtree to gather every complete word found within it |

---
**Conclusion:** a Trie's shared-prefix structure lets \`autocomplete\` walk down the prefix's own characters ONCE, then depth-first collect every complete word (\`isEnd\` node) found anywhere in that specific subtree — genuinely efficient because only the MATCHING portion of the whole dictionary is ever explored, not the entire structure. Verified directly across multiple real prefixes against a small dictionary: correct, sorted matches every time, including the case where the prefix itself was a complete word, and a genuinely empty result for an unmatched prefix.`,
    examples: [
      {
        label: "Real, direct proof: autocomplete() returns the correct, sorted matches across multiple real prefixes, including a prefix that is itself a complete word",
        tech: "javascript",
        runnable: true,
        code: `class TrieNode {
  constructor() { this.children = new Map(); this.isEnd = false; }
}
class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }
  _collect(node, prefix, results) {
    if (node.isEnd) results.push(prefix);
    for (const [ch, child] of node.children) this._collect(child, prefix + ch, results);
  }
  autocomplete(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const results = [];
    this._collect(node, prefix, results);
    return results.sort();
  }
}

const trie = new Trie();
["cat", "car", "card", "care", "dog", "do"].forEach((w) => trie.insert(w));
console.log("autocomplete('ca'):", trie.autocomplete("ca"));
console.log("autocomplete('car'):", trie.autocomplete("car"));
console.log("autocomplete('do') -- 'do' itself is a complete word:", trie.autocomplete("do"));
console.log("autocomplete('xyz') -- genuinely no matches:", trie.autocomplete("xyz"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "HTML tag tree parser",
    seoDescription:
      "A minimal HTML tag-tree parser was verified against a real, nested HTML string with multiple tags and text nodes, producing the exact correct tree.",
    description: `**Problem, as an interviewer would state it:**
"Write a minimal HTML parser converting a plain HTML string into a nested TAG TREE — no external libraries, just tracking open/close tags and building a simple tree of \`{ tag, children }\` nodes."

**Examples:**

\`\`\`
parseHtml("<div><p>Hello</p></div>");
// { tag: "root", children: [{ tag: "div", children: [{ tag: "p", children: [...] }] }] }
\`\`\`

**Clarifying questions expected:**
- Does this need to handle real, malformed/unclosed HTML robustly, or is well-formed input a fair assumption?
- Should self-closing tags (like a real \`<br/>\`) be handled without expecting a matching closing tag?
- Should plain text content between tags become its own kind of node in the tree?

**Code / implementation expected:** Yes — real, direct proof against a real, nested HTML string with multiple tag levels and text content, producing the exact correct nested tree structure.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the parser was verified directly against a real, nested HTML string containing multiple tag levels, a text node inside a deeply nested tag, and two sibling paragraphs — producing the exact correct tree structure, confirmed via direct comparison.

## 1. The problem, restated

Convert a plain HTML string into a nested tree of \`{ tag, children }\` objects — an OPENING tag creates a new node and becomes the "current" node for anything that follows; a CLOSING tag moves back up to that node's own parent; plain text between tags becomes its own kind of leaf node.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Robust malformed-HTML handling? | A real, honest scope question — a full, error-tolerant HTML parser (matching real browser behavior) is a MASSIVE undertaking; well-formed input is a fair, common simplifying assumption for this exercise. |
| Self-closing tags? | Genuinely needs explicit handling — a tag ending in \`/>\` should not expect (or wait for) a separate closing tag. |
| Text as its own node type? | Yes — a real, useful tree representation needs to distinguish element nodes from raw text content. |

## 3. Thought process

The core mechanism is a real, classic STACK-based approach: maintain a stack of "currently open" nodes, starting with a synthetic \`root\` node already on it. Scanning the HTML string token by token (using a real regex matching either a tag or a run of plain text): an OPENING tag creates a new \`{tag, children}\` node, appends it as a child of whatever is currently at the TOP of the stack, and then PUSHES it onto the stack (it becomes the new "current" context for anything nested inside it) — UNLESS it is self-closing, in which case it is never pushed at all. A CLOSING tag simply POPS the stack, moving back up to the parent context. Plain text creates a leaf \`{tag: "#text", value}\` node, appended as a child of whatever is currently at the top of the stack, without ever being pushed itself (text cannot contain further nested tags).

## 4. Verified solution

\`\`\`js
function parseHtml(html) {
  const root = { tag: "root", children: [] };
  const stack = [root];
  const tagRegex = /<\\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>|[^<]+/g;
  let match;
  while ((match = tagRegex.exec(html))) {
    const token = match[0];
    if (token.startsWith("</")) {
      stack.pop();
    } else if (token.startsWith("<")) {
      const tagName = match[1];
      const node = { tag: tagName, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!token.endsWith("/>")) stack.push(node);
    } else {
      const text = token.trim();
      if (text) stack[stack.length - 1].children.push({ tag: "#text", value: text });
    }
  }
  return root;
}
\`\`\`

\`\`\`
real, verified proof -- parseHtml("<div><p>Hello <span>World</span></p><p>Second</p></div>"):

  {
    tag: "root",
    children: [{
      tag: "div",
      children: [
        { tag: "p", children: [
            { tag: "#text", value: "Hello" },
            { tag: "span", children: [{ tag: "#text", value: "World" }] }
        ]},
        { tag: "p", children: [{ tag: "#text", value: "Second" }] }
      ]
    }]
  }
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a real classic stack based approach maintain a stack of currently open nodes starting with a synthetic root node an opening tag creates a new node appends it as a child of whatever is currently at the top of the stack then pushes it onto the stack unless it is self closing a closing tag simply pops the stack moving back up to the parent context plain text creates a leaf text node appended to the current top of stack without ever being pushed itself verified directly against a real nested HTML string with multiple tag levels and text content producing the exact correct nested tree structure">
  <defs>
    <marker id="htmlparse-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real nested HTML string produced the exact correct tree</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">an opening tag: append as a child, PUSH it</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">becomes the new current context for nested content</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a closing tag: POP the stack</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">moves back up to the parent context</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">plain text becomes its own leaf node, appended but never pushed onto the stack itself</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the length of the HTML string — a single regex scan across the whole input. Space: O(d + t) for the stack (bounded by real maximum nesting depth \`d\`) plus O(t) for the total number of nodes produced in the tree.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A self-closing tag (\`<br/>\`) | Correctly appended as a child, but genuinely never pushed onto the stack | The explicit \`!token.endsWith("/>")\` guard before pushing |
| Whitespace-only text between tags | Correctly ignored, no empty \`#text\` node created | The \`if (text)\` check after \`.trim()\` |
| A tag with real attributes (a class or id on it) | Correctly parsed — only the tag NAME is captured, attributes are matched but discarded by this minimal version | The regex's \`[^>]*\` portion consumes attributes without capturing them |
| Mismatched/malformed closing tags | This minimal implementation would genuinely produce an INCORRECT tree, since it blindly pops on any closing tag regardless of whether it matches the current top | A real, honest limitation — a more robust real parser would verify the closing tag NAME matches the top-of-stack node before popping |

## 7. Common Pitfalls

- **Not distinguishing self-closing tags from ones expecting a real closing tag.** Would incorrectly push a self-closing tag onto the stack, permanently corrupting the nesting for everything that follows, since no matching closing tag will ever arrive to pop it back off.
- **Creating empty text nodes for pure whitespace between tags.** Clutters the resulting tree with real, meaningless nodes that add no genuine content.
- **Not verifying a closing tag's name matches the current top-of-stack node.** A real, honest gap in this minimal version — genuinely malformed HTML (mismatched tags) would silently produce an incorrect tree rather than being detected and reported as an error.
- **Assuming this is a complete, production-grade HTML parser.** A real, honest limitation worth naming explicitly — real HTML parsing (matching actual browser behavior) has extensive, genuinely complex rules for implicit tag closing, void elements, and malformed-markup recovery that this minimal, well-formed-input-only version does not attempt to replicate.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A nested tag tree from an HTML string -- can I assume well-formed input, or must this handle malformed markup robustly?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the stack-based approach:</strong> <span style="color:#f0e2c8;">"A stack of currently-open nodes -- an opening tag pushes, a closing tag pops."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the self-closing-tag detail:</strong> <span style="color:#f0e2c8;">"A self-closing tag appends as a child but is never pushed -- there's no closing tag coming to pop it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a regex matching a tag or a run of text, opening pushes and appends, closing pops, text appends as its own node."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run this against a real, nested HTML string with multiple sibling and text nodes and confirm the tree structure exactly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you also capture a tag's attributes into the tree nodes, not just discard them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extend the regex to separately capture the attribute portion (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[^>]*</code> becomes a real capturing group), then run a SECOND, smaller regex over just that captured attribute string (matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name="value"</code> pairs) to build a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attributes</code> object added to each node, alongside its existing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tag</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle real void elements like &lt;br&gt; or &lt;img&gt; that never have a closing tag AND aren't written with a trailing slash?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Maintain a real, hardcoded Set of known real HTML void-element tag names (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">br</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">img</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hr</code>, etc., matching the real, documented HTML5 spec list), and treat a tag whose NAME is in that set the same as a genuinely self-closing one — never pushing it onto the stack, regardless of whether it happens to end in a trailing slash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you detect and report a genuinely mismatched closing tag, instead of silently producing a wrong tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before popping on a closing tag, compare the CLOSING tag's own name (also captured by the regex, e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;/div&gt;</code> captures <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">div</code>) against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack[stack.length - 1].tag</code> — if they genuinely do not match, throw a real, descriptive error rather than silently popping the wrong node and corrupting the rest of the tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own HTML template compiler question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely direct, real building block — a template compiler's own first real step is typically PARSING the template string into exactly this kind of tag tree, THEN walking that tree to generate real, executable rendering code (or a real virtual-DOM-creation function); this parser is the real foundation that question's own compilation step builds directly on top of.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stack-based parsing** | Tracking currently-open tags via push/pop, mirroring real nesting |
| **Self-closing tag** | A tag with no real matching closing tag, never pushed onto the stack |
| **Text leaf node** | Plain content between tags, represented as its own #text node |

---
**Conclusion:** a real, classic stack of currently-open nodes correctly builds a nested tag tree — an opening tag appends as a child of the current top-of-stack node and (unless self-closing) is itself pushed as the new current context, a closing tag pops back to the parent, and plain text appends as its own leaf node without ever being pushed. Verified directly against a real, nested HTML string containing multiple tag levels, a text node inside a deeply nested tag, and two sibling paragraphs — producing the exact correct nested tree structure.`,
    examples: [
      {
        label: "Real, direct proof: parseHtml() produces the exact correct nested tree for a real HTML string with multiple tag levels, siblings, and text content",
        tech: "javascript",
        runnable: true,
        code: `function parseHtml(html) {
  const root = { tag: "root", children: [] };
  const stack = [root];
  const tagRegex = /<\\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>|[^<]+/g;
  let match;
  while ((match = tagRegex.exec(html))) {
    const token = match[0];
    if (token.startsWith("</")) {
      stack.pop();
    } else if (token.startsWith("<")) {
      const tagName = match[1];
      const node = { tag: tagName, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!token.endsWith("/>")) stack.push(node);
    } else {
      const text = token.trim();
      if (text) stack[stack.length - 1].children.push({ tag: "#text", value: text });
    }
  }
  return root;
}

const tree = parseHtml("<div><p>Hello <span>World</span></p><p>Second</p></div>");
console.log("parsed tag tree:", JSON.stringify(tree, null, 2));

const expected = {
  tag: "root",
  children: [{
    tag: "div",
    children: [
      { tag: "p", children: [{ tag: "#text", value: "Hello" }, { tag: "span", children: [{ tag: "#text", value: "World" }] }] },
      { tag: "p", children: [{ tag: "#text", value: "Second" }] },
    ],
  }],
};
console.log("matches the exact expected tree structure:", JSON.stringify(tree) === JSON.stringify(expected));`,
      },
    ],
  },
];

export default augments;
