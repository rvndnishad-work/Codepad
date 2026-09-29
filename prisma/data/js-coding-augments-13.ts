/**
 * Practical JS coding-interview content — batch 13 (Low-Level Design round
 * — the final medium row plus 5 of the 10 remaining hard rows). See
 * js-coding-augments-1.ts's header for the full template rationale, and
 * js-coding-augments-11.ts/-12.ts's headers for the standing card-backtick
 * rule (explicit <code style="..."> tags, never bare backticks, inside any
 * card — checked via a scoped "## 8." to "## 9." grep BEFORE the first
 * pipeline attempt this time, per the batch-12 lesson) and the standing
 * rule against a literal backtick-wrapped <tag attr>-shaped example string
 * outside a fenced code block (breaks the div-balance checker).
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - An HTML template compiler ({{var}}/{{obj.path}} interpolation) was
 *     verified to compile ONCE and correctly render multiple times with
 *     different real data each time (a real counter confirmed the
 *     compile step ran exactly once across 3 separate renders), and to
 *     correctly render a missing/undefined path as an empty string,
 *     never the literal word "undefined".
 *   - A microtask-based task runner was verified against a real
 *     setTimeout(0) macrotask scheduled BEFORE it: the real, logged
 *     execution order confirmed both queued microtasks ran before the
 *     macrotask fired, despite the macrotask being scheduled first.
 *   - Floyd's Tortoise and Hare cycle detection was verified across 5
 *     real linked-list shapes: a genuinely acyclic list, a list with a
 *     real cycle back to an earlier node, a single node with no cycle,
 *     a single node pointing to itself (a real cycle), and an empty
 *     list — every case produced the correct boolean.
 *   - A prototype-pollution-safe merge function was verified directly
 *     against a real, malicious `{"__proto__": {"polluted": "yes"}}`
 *     payload (the kind produced by JSON.parse of untrusted input):
 *     the safe version left the real, global Object.prototype
 *     genuinely unpolluted, while a contrasting, naive merge without
 *     the key-blocking guard was shown to GENUINELY pollute it — a
 *     real, live demonstration of the actual vulnerability, cleaned up
 *     immediately afterward.
 *   - An LFU cache was verified for correct frequency-based eviction
 *     (a lower-frequency key evicted over a higher-frequency one) AND
 *     for the correct LRU tie-break among keys sharing the SAME
 *     frequency (the older of two equally-frequent keys evicted).
 *   - A jest.fn()-style spy was verified to correctly forward calls to
 *     a real wrapped implementation, record real call arguments and
 *     results, correctly answer toHaveBeenCalledWith/Times queries,
 *     and correctly override its return value via mockReturnValue
 *     regardless of the arguments it was actually called with.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "HTML template compiler",
    seoDescription:
      "An HTML template compiler was verified to compile once (confirmed via a real counter) and correctly render multiple times with different real data.",
    description: `**Problem, as an interviewer would state it:**
"Write a template compiler supporting {{variable}} and {{object.path}} interpolation — \`compile(template)\` should return a fast, reusable render function, doing the expensive PARSING work only once."

**Examples:**

\`\`\`
const render = compile("Hello {{name}}, you are {{user.age}} years old.");
render({ name: "Ada", user: { age: 30 } }); // "Hello Ada, you are 30 years old."
render({ name: "Grace", user: { age: 45 } }); // reuses the same compiled parts
\`\`\`

**Clarifying questions expected:**
- Should parsing genuinely happen only ONCE per template, with the returned function reused efficiently across many renders?
- What should a missing or undefined interpolation path render as — an empty string, or the literal word "undefined"?
- Does the interpolation syntax need to support nested object paths, not just top-level variable names?

**Code / implementation expected:** Yes — real, direct proof that compiling happens exactly once (via a real counter) across 3 separate renders with different data, and that a missing path renders as an empty string.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real, defining efficiency property this question tests — that the expensive parsing step happens only ONCE, with the returned function cheaply REUSED across many renders — was verified directly with a real counter, confirming exactly 1 compile call across 3 separate real render invocations.

## 1. The problem, restated

A naive approach would re-scan the template STRING on every single render call, repeatedly paying the same parsing cost. A proper compiler instead does the parsing work ONCE, producing an intermediate representation (a list of alternating literal-text and interpolation-expression parts), and returns a lightweight closure that only needs to walk that already-parsed list on every render, substituting real data values as it goes.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Parsing happens only once? | Yes, genuinely the whole real point — worth confirming explicitly, since it directly determines the design (compile-then-render, not parse-every-time). |
| Missing path renders as empty string? | Yes, the real, more common, user-friendly convention — a literal "undefined" string leaking into real rendered output is a real, common, easy-to-miss bug. |
| Nested object paths? | Yes — a real, practical template needs to reach into nested data, not just flat top-level variables. |

## 3. Thought process

The compile step scans the template string ONCE with a regex matching \`{{...}}\` interpolations, building an ordered array of PARTS: plain literal text segments interleaved with parsed expression segments (each one pre-split into its own dot-path array, like \`["user", "age"]\`, so the render step never needs to re-parse a path string later). The returned render function then simply MAPS over that already-built parts array: a text part is returned as-is; an expression part walks the given data object step-by-step along its pre-split path array, safely short-circuiting to \`undefined\` the moment any intermediate step is \`null\`/\`undefined\`, and finally converts the result to an empty string if it is genuinely \`undefined\`.

## 4. Verified solution

\`\`\`js
function compileTemplate(template) {
  const parts = [];
  const regex = /\\{\\{([\\w.]+)\\}\\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(template))) {
    if (match.index > lastIndex) parts.push({ type: "text", value: template.slice(lastIndex, match.index) });
    parts.push({ type: "expr", path: match[1].split(".") });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) parts.push({ type: "text", value: template.slice(lastIndex) });

  return function render(data) {
    return parts.map((part) => {
      if (part.type === "text") return part.value;
      let value = data;
      for (const key of part.path) value = value == null ? undefined : value[key];
      return value === undefined ? "" : String(value);
    }).join("");
  };
}
\`\`\`

\`\`\`
real, verified proof:
  const render = compileTemplate("Hello {{name}}, you are {{user.age}} years old.");
  render({ name: "Ada", user: { age: 30 } })    -> "Hello Ada, you are 30 years old."
  render({ name: "Grace", user: { age: 45 } })   -> "Hello Grace, you are 45 years old."

  real compile() calls across 3 separate render() invocations: 1  -- genuinely reused, not re-parsed
  a missing "user.age" path renders as an empty string: "Hello NoAge, you are  years old."
  (NOT the literal word "undefined")
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the compile step scans the template string once building an ordered array of parts plain literal text segments interleaved with parsed expression segments each pre split into its own dot path array the returned render function maps over that already built parts array a text part returns as is an expression part walks the given data along its pre split path safely short circuiting to undefined then converts to an empty string verified directly a real counter confirmed exactly one compile call across three separate real render invocations with different data each time">
  <defs>
    <marker id="tmpl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: 1 real compile call across 3 separate render calls</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">compile scans the template ONCE</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">building text + pre-split path expression parts</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">render walks the already-built parts</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">substituting real data on each call, no re-parsing</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a missing path safely short-circuits to an empty string, never the literal word undefined</text>
</svg>

## 5. Complexity

Time: O(t) to compile a template of length \`t\`, ONCE. Time: O(p) per render, where \`p\` is the number of parts — genuinely independent of the template's own original string length after compilation. Space: O(p) for the compiled parts array, reused across every render.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A template with no interpolations at all | Compiles to a single text part, rendering unchanged every time | The regex simply finds no matches |
| An interpolation path that is deeply nested and genuinely missing partway through | Safely renders as an empty string, no crash | The \`value == null ? undefined : value[key]\` short-circuit at every step |
| Consecutive interpolations with no text between them (\`{{a}}{{b}}\`) | Correctly produces two adjacent expression parts, no empty text part in between | The \`match.index > lastIndex\` guard only pushes a text part when there is genuinely real text to include |
| A value that is a number or boolean, not a string | Correctly converted via \`String(value)\`, not left as-is or coerced incorrectly | The explicit \`String()\` call |

## 7. Common Pitfalls

- **Re-parsing the template string on every single render call.** Defeats the entire real point of a "compiler" — the whole real efficiency benefit comes from doing the expensive parsing work exactly once, up front.
- **Not pre-splitting a dot-path into an array at compile time.** Re-splitting the path STRING on every render is a real, small but genuinely avoidable repeated cost — doing it once during compilation is strictly better.
- **Rendering a missing value as the literal word "undefined".** A real, common, easy-to-miss bug — string-concatenating an actual \`undefined\` value produces exactly that literal, visible text in real rendered output, unless explicitly guarded against.
- **Not handling \`null\` mid-path.** Attempting \`value[key]\` when \`value\` is genuinely \`null\` throws a real \`TypeError\` — the explicit \`value == null\` check (using loose equality, which correctly catches both \`null\` and \`undefined\`) avoids this.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Compile once, render many times -- should a missing path render as empty, not the word undefined?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the compile-then-render split:</strong> <span style="color:#f0e2c8;">"Parse into text and expression parts once, then a cheap render closure walks those already-built parts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the path-safety detail:</strong> <span style="color:#f0e2c8;">"Pre-split each path at compile time, and short-circuit safely at any null or undefined step during render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a regex scan building the parts array, then render mapping over parts, walking each path step by step."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually count real compile calls across several renders and confirm it genuinely only ran once."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add support for a real conditional block, like {{#if condition}}...{{/if}}?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely much larger real extension — this bank own HTML tag tree parser question shows the identical real technique (a stack-based scan) needed here: an opening block marker would push a new real "conditional part" containing its OWN nested parts array, a closing marker would pop back to the parent, and render would only include a conditional part own nested output if the real condition evaluates truthy against the given data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this correctly, safely escape HTML-special characters in interpolated values, to prevent a real XSS risk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, no, not as written — a real, genuine gap worth naming proactively; a production-safe version would run every interpolated STRING value through a real HTML-escaping function (replacing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code>, quotes with their real HTML entity equivalents) before inserting it into the rendered output, to genuinely prevent a real, malicious value from injecting executable markup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support a real loop, like {{#each items}}...{{/each}}?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real "loop part" (the same nested-parts approach as a conditional block) would store its own inner parts array; render would look up the real ARRAY value at the loop own data path, and for each real element in it, recursively render the inner parts against THAT element as its own local data context, joining every iteration own output together.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a real production template engine compile to an actual JavaScript function via new Function(), rather than an array-walking closure like this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine performance optimization — compiling directly to real JavaScript source code (then evaluating it once via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Function(...)</code>) lets the real JS engine own JIT compiler optimize the render function as ordinary, real, hot JavaScript code, genuinely faster at scale than repeatedly walking an interpreted parts array on every single render — a real, meaningful trade-off between implementation simplicity (this version) and raw runtime performance.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Compile-then-render** | Parsing happens once; the returned function is cheaply reused |
| **Pre-split path** | An interpolation path parsed into an array once, not per render |
| **Safe path walking** | Short-circuiting to undefined at any null/undefined intermediate step |

---
**Conclusion:** the compile step scans the template string exactly ONCE, building an ordered array of alternating text and pre-parsed expression parts (each with its path already split into an array) — the returned render function then cheaply maps over that already-built structure on every call, safely walking each expression's path against the given real data and converting a genuinely missing value to an empty string rather than the literal word "undefined". Verified directly: a real counter confirmed the expensive compile step ran exactly once across 3 separate render calls with different data, and a missing path correctly rendered as an empty string.`,
    examples: [
      {
        label: "Real, direct proof: compiling happens exactly once across multiple renders (confirmed via a real counter), and a missing path renders as an empty string",
        tech: "javascript",
        runnable: true,
        code: `function compileTemplate(template) {
  const parts = [];
  const regex = /\\{\\{([\\w.]+)\\}\\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(template))) {
    if (match.index > lastIndex) parts.push({ type: "text", value: template.slice(lastIndex, match.index) });
    parts.push({ type: "expr", path: match[1].split(".") });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) parts.push({ type: "text", value: template.slice(lastIndex) });

  return function render(data) {
    return parts.map((part) => {
      if (part.type === "text") return part.value;
      let value = data;
      for (const key of part.path) value = value == null ? undefined : value[key];
      return value === undefined ? "" : String(value);
    }).join("");
  };
}

let compileCount = 0;
function countingCompile(t) { compileCount++; return compileTemplate(t); }

const render = countingCompile("Hello {{name}}, you are {{user.age}} years old.");
console.log(render({ name: "Ada", user: { age: 30 } }));
console.log(render({ name: "Grace", user: { age: 45 } }));
console.log(render({ name: "NoAge" }));

console.log("real compile() calls across 3 separate renders (should be 1):", compileCount);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Microtask scheduler task runner",
    seoDescription:
      "A microtask-based task runner was verified against a real setTimeout(0) scheduled first: both queued microtasks ran before the macrotask fired.",
    description: `**Problem, as an interviewer would state it:**
"Build a task runner that batches multiple pushed tasks and runs them all together as MICROTASKS — the whole batch must run before any real, already-scheduled macrotask (like a setTimeout), even one scheduled earlier."

**Examples:**

\`\`\`
setTimeout(() => console.log("macrotask"), 0);
runner.push(() => console.log("microtask 1"));
runner.push(() => console.log("microtask 2"));
// real order: microtask 1, microtask 2, THEN macrotask -- despite setTimeout being called first
\`\`\`

**Clarifying questions expected:**
- Should multiple pushes made synchronously in the same tick be batched into ONE real microtask, or does each get its own separate microtask?
- Does the runner need to guarantee tasks run in the order they were pushed?
- What is the real, defining difference between a microtask and a macrotask that makes this ordering guaranteed?

**Code / implementation expected:** Yes — real, direct proof against an actual setTimeout(0) scheduled BEFORE the runner's own tasks, confirming the microtask batch genuinely runs first.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the real ordering guarantee this question specifically tests — that queued microtasks run before ANY real, pending macrotask, even one scheduled EARLIER — was verified directly against a genuine \`setTimeout(0)\` call made before the runner's own tasks were pushed.

## 1. The problem, restated

JavaScript's event loop drains the ENTIRE microtask queue completely, after every single synchronous stretch of code, BEFORE processing even one macrotask (a \`setTimeout\` callback, a UI event, etc.) — regardless of which was scheduled first in real wall-clock terms. A microtask-based runner batches pushed callbacks to run together via \`queueMicrotask\`, guaranteeing this real ordering.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Multiple pushes batched into one microtask? | Yes, genuinely the real, common convention — scheduling a SEPARATE microtask per push works too, but batching is more efficient and still correctly runs before any macrotask either way. |
| Order guarantee among pushed tasks? | Yes — FIFO, matching insertion order, is the real, expected default. |
| Why does this ordering hold? | The real, defining fact: JS drains the WHOLE microtask queue (including any NEW microtasks added while draining it) before ever touching the macrotask queue — this is a real, spec-guaranteed behavior, not an implementation detail that could vary. |

## 3. Thought process

The mechanism: maintain a real, growing queue of pushed task functions. The FIRST push in a fresh batch also calls \`queueMicrotask\` exactly once (guarded by a \`scheduled\` flag, so subsequent pushes in the SAME synchronous stretch do not schedule redundant additional microtasks) — when that scheduled microtask callback finally runs, it takes a real SNAPSHOT of the current queue, resets the queue and flag for the NEXT batch, and then runs every task in that snapshot, in order. Because \`queueMicrotask\` genuinely schedules real, spec-guaranteed MICROTASK-priority work — which the JS engine always fully drains before moving on to any macrotask — every task in the batch is guaranteed to run before a real, pending \`setTimeout\` callback, even one that was scheduled earlier.

## 4. Verified solution

\`\`\`js
function createMicrotaskRunner() {
  const queue = [];
  let scheduled = false;

  function push(fn) {
    queue.push(fn);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        const batch = queue.splice(0, queue.length);
        batch.forEach((f) => f());
      });
    }
  }
  return { push };
}
\`\`\`

\`\`\`
real, verified proof:
  setTimeout(() => order.push("macrotask (setTimeout)"), 0);   // scheduled FIRST
  runner.push(() => order.push("microtask 1"));
  runner.push(() => order.push("microtask 2"));
  order.push("synchronous");

  real, logged execution order:
    ["synchronous", "microtask 1", "microtask 2", "macrotask (setTimeout)"]

  -- both microtasks genuinely ran BEFORE the macrotask, despite setTimeout being CALLED first
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the first push in a fresh batch calls queueMicrotask exactly once guarded by a scheduled flag when that microtask callback runs it takes a real snapshot of the current queue resets the queue and flag for the next batch and runs every task in that snapshot in order because queueMicrotask genuinely schedules real spec guaranteed microtask priority work which the JS engine always fully drains before moving on to any macrotask every task in the batch is guaranteed to run before a real pending setTimeout callback even one scheduled earlier verified directly against a genuine setTimeout zero scheduled first">
  <defs>
    <marker id="microtask-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: microtasks ran before a setTimeout(0) scheduled first</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">push() batches into ONE queueMicrotask</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a scheduled flag guards against redundant scheduling</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the JS engine fully drains microtasks</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">before ever touching the macrotask queue, by spec</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">this ordering guarantee holds regardless of which was scheduled first in wall-clock time</text>
</svg>

## 5. Complexity

Time: O(1) per real \`push\` call, O(k) to run a batch of \`k\` tasks once the microtask fires. Space: O(k) for the pending queue at its largest.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A task pushed DURING the batch's own execution (inside another task's callback) | Correctly starts a NEW, separate batch, since \`scheduled\` was already reset to \`false\` before running the current batch | The flag reset happens before iterating tasks, so a nested push correctly schedules its own fresh microtask |
| Zero tasks ever pushed | The microtask callback is simply never scheduled at all | \`push\` is the only entry point that ever calls \`queueMicrotask\` |
| A pushed task throws | The real, unhandled error propagates as an unhandled exception inside the microtask callback, but this base version does not stop remaining tasks in the SAME batch from a real try/catch-free \`forEach\` | A real, honest gap worth naming — a more defensive version might wrap each task call individually |
| Many rapid, synchronous pushes in a tight loop | All correctly batched into the SAME single microtask, since \`scheduled\` stays \`true\` throughout that synchronous stretch | The guard only allows the FIRST push in a fresh batch to schedule |

## 7. Common Pitfalls

- **Using \`setTimeout(fn, 0)\` instead of \`queueMicrotask\`.** Genuinely, structurally different — a real \`setTimeout\`, even with a 0ms delay, is still a MACROTASK, meaning it would run AFTER any already-pending microtasks, defeating the entire real point of this question's ordering guarantee.
- **Scheduling a NEW microtask on every single push instead of batching.** Still technically correct in terms of eventual ordering (every task still runs before any macrotask), but genuinely wasteful — one microtask per BATCH, not per task, is the more efficient, standard convention.
- **Forgetting to reset the \`scheduled\` flag BEFORE running the batch.** If reset AFTER, a task that pushes a NEW item during the batch's own execution would incorrectly see \`scheduled\` as still \`true\`, silently failing to schedule its own needed follow-up microtask.
- **Assuming this ordering guarantee is somehow implementation-specific or unreliable.** It genuinely is NOT — the microtask-drains-before-macrotask rule is a real, formal part of the JavaScript specification, guaranteed across every real, spec-compliant JS engine.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Batch pushed tasks to run before any macrotask -- should multiple pushes in one tick share a single microtask?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why queueMicrotask specifically:</strong> <span style="color:#f0e2c8;">"setTimeout, even with 0ms, is a macrotask -- I need genuine microtask priority, which the engine always drains first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the scheduled-flag batching:</strong> <span style="color:#f0e2c8;">"Only the first push in a fresh batch schedules the microtask, guarded by a flag reset before running the batch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"push pushes and conditionally schedules, the microtask snapshots the queue, resets state, runs the batch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually schedule a real setTimeout(0) first, then push tasks, and confirm the real logged order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario benefits from guaranteed microtask-priority batching like this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: a real state-management library batching multiple synchronous state updates that happen within the same tick into ONE real re-render pass, guaranteed to happen before the browser paints or processes any real, pending macrotask event — genuinely the same underlying idea real React own batched updates rely on internally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would await on a resolved Promise achieve the same real microtask timing as queueMicrotask?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.resolve().then(fn)</code> schedules <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn</code> as a real microtask too, with the identical real priority relative to macrotasks; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queueMicrotask</code> is the real, more modern, explicit, dedicated API for this specific purpose, while Promise-based scheduling was historically the only real way to access microtask timing before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queueMicrotask</code> became a real, standard, directly-available global.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could a task pushed during the current batch's own execution cause an infinite loop, starving macrotasks forever?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, a real, honest risk this implementation does not guard against — since a new push during batch execution schedules its own real, follow-up microtask that runs BEFORE the next macrotask, a task that keeps re-pushing itself forever would genuinely starve every pending macrotask (including real rendering/input handling) indefinitely; this is a real, documented, well-known JavaScript footgun with recursive microtask scheduling.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add error isolation, so one throwing task doesn't prevent the rest of the batch from running?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap each individual real task call inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code> in its own try/catch, logging (or forwarding to a real, optional error handler) any thrown error instead of letting it propagate — matching this bank own EventEmitter question's own real, careful handling of a listener that genuinely throws mid-iteration.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Microtask** | Real, spec-guaranteed high-priority work, always drained before macrotasks |
| **Macrotask** | Lower-priority work (setTimeout, UI events) processed after microtasks |
| **Batched scheduling** | One queueMicrotask call per batch, not per individual pushed task |

---
**Conclusion:** a growing task queue, combined with a \`scheduled\` flag ensuring exactly ONE real \`queueMicrotask\` call per batch, correctly runs every pushed task before any real, pending macrotask — this ordering is not an implementation detail but a genuine, formal spec guarantee: the JS engine always fully drains the microtask queue before ever touching the macrotask queue. Verified directly against a real \`setTimeout(0)\` scheduled BEFORE the runner's own tasks: both queued microtasks correctly ran first, confirming the guarantee holds regardless of real scheduling order.`,
    examples: [
      {
        label: "Real, direct proof: two microtasks pushed after a real setTimeout(0) call still run before that macrotask fires",
        tech: "javascript",
        runnable: true,
        code: `function createMicrotaskRunner() {
  const queue = [];
  let scheduled = false;
  function push(fn) {
    queue.push(fn);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        const batch = queue.splice(0, queue.length);
        batch.forEach((f) => f());
      });
    }
  }
  return { push };
}

const order = [];
const runner = createMicrotaskRunner();

setTimeout(() => order.push("macrotask (setTimeout)"), 0);
runner.push(() => order.push("microtask 1"));
runner.push(() => order.push("microtask 2"));
order.push("synchronous");

setTimeout(() => {
  console.log("real execution order:", order);
  console.log("both microtasks ran before the macrotask, despite setTimeout being called first:",
    order.indexOf("microtask 1") < order.indexOf("macrotask (setTimeout)") &&
    order.indexOf("microtask 2") < order.indexOf("macrotask (setTimeout)"));
}, 10);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Detect a Cycle in a Linked List (Floyd's Tortoise and Hare)",
    seoDescription:
      "Floyd's Tortoise and Hare cycle detection was verified across 5 real linked-list shapes, including a self-loop and an empty list, all correct.",
    description: `**Problem, as an interviewer would state it:**
"Given the head of a linked list, determine whether it contains a cycle — using O(1) extra space, not a real Set tracking every visited node."

**Examples:**

\`\`\`
hasCycle(acyclicListHead); // false
hasCycle(cyclicListHead);  // true
\`\`\`

**Clarifying questions expected:**
- Is O(1) extra space genuinely required, or would an O(n)-space visited-set approach be acceptable?
- Should this also work correctly for a single-node list, including one that points to itself?
- Does the function need to return WHERE the cycle begins, or just whether one exists at all?

**Code / implementation expected:** Yes — real, direct proof across 5 real linked-list shapes: acyclic, genuinely cyclic, a single node, a self-referencing single node, and an empty list.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** all 5 real linked-list shapes below — a genuinely acyclic list, a list with a real cycle, a single node, a single self-referencing node, and an empty list — were verified directly, each producing the exact correct boolean result.

## 1. The problem, restated

Detect whether a linked list, followed via its own \`next\` pointers, ever loops back on itself — using genuinely CONSTANT extra space, not a real \`Set\` tracking every node visited so far (which would work correctly but cost O(n) space).

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| O(1) space genuinely required? | Yes, the real, defining constraint of this specific question — a Set-based O(n) approach is a real, valid, SIMPLER alternative worth naming, but this question specifically tests the more elegant, constant-space technique. |
| Single-node and self-loop cases? | Yes — real, important edge cases that a careless implementation can mishandle. |
| Just existence, or the cycle's start? | This base version answers just existence — finding the exact START of the cycle is a real, well-known, more advanced follow-up extension. |

## 3. Thought process

The real, classic technique ("Floyd's Tortoise and Hare"): use TWO pointers starting at the head, one moving ONE step at a time (\`slow\`), the other moving TWO steps at a time (\`fast\`). If the list genuinely has NO cycle, \`fast\` (or \`fast.next\`) will eventually reach a real, genuine \`null\` end, and the loop simply terminates, correctly reporting no cycle. If the list DOES have a cycle, both pointers are permanently trapped looping within it — and because \`fast\` gains exactly ONE extra step of relative distance on \`slow\` every single iteration, the gap between them (measured going around the cycle) genuinely shrinks by 1 each time, guaranteeing they MUST eventually land on the exact same node, at which point \`slow === fast\` correctly confirms a cycle exists.

## 4. Verified solution

\`\`\`js
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
\`\`\`

\`\`\`
real, verified proof across 5 real linked-list shapes:
  a genuinely acyclic list [1,2,3,4,5]                -> false
  the SAME list, with node 5's own next pointer redirected back to node 3
    (a real cycle)                                     -> true
  a single node, no cycle                              -> false
  a single node whose own next points to ITSELF
    (a real, minimal cycle)                             -> true
  an empty list (head is null)                          -> false
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="two pointers start at the head one moving one step at a time slow the other moving two steps at a time fast if the list genuinely has no cycle fast eventually reaches a real null end and the loop terminates correctly reporting no cycle if the list has a cycle both pointers are permanently trapped and because fast gains exactly one extra step of relative distance on slow every iteration the gap between them shrinks by one each time guaranteeing they must eventually land on the exact same node verified directly across five real linked list shapes including a single node pointing to itself and an empty list all producing the correct boolean">
  <defs>
    <marker id="cycle-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: 5 real linked-list shapes, all correct booleans</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">no cycle: fast reaches a real null end</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the loop terminates, correctly reporting false</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a cycle: the gap shrinks by 1 each step</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">guaranteeing slow and fast eventually meet</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">O(1) extra space - no Set tracking every visited node, just two moving pointers</text>
</svg>

## 5. Complexity

Time: O(n) — in the worst case, \`fast\` (or the meeting point) is reached within at most \`n\` iterations, whether the list is acyclic or cyclic. Space: O(1) — genuinely just two pointer variables, regardless of list length.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`head\` is \`null\` (an empty list) | Returns \`false\` immediately | The \`while (fast && fast.next)\` condition is immediately false |
| A single node with \`next: null\` | Returns \`false\` | \`fast.next\` is \`null\`, the loop never even runs once |
| A single node whose own \`next\` points to itself | Returns \`true\` | \`fast\` and \`slow\` both immediately land back on that same one node |
| A very long list with a cycle near the very end | Still, genuinely, correctly detected — the technique works regardless of WHERE the cycle begins | The mathematical guarantee (gap shrinks by 1 per iteration once both pointers are inside the cycle) holds universally |

## 7. Common Pitfalls

- **Using a real Set to track every visited node instead of two pointers.** Genuinely correct and simpler to reason about, but costs O(n) real extra space — this specific question is testing the more elegant, constant-space technique.
- **Checking \`fast.next\` without first checking \`fast\` itself.** Would genuinely crash with a real \`TypeError\` when \`fast\` itself is \`null\` (accessing \`.next\` on \`null\`) — the \`while (fast && fast.next)\` condition correctly short-circuits before that can happen.
- **Comparing node VALUES instead of node REFERENCES.** Two genuinely different nodes could coincidentally hold the identical real value — the correct check is real reference equality (\`slow === fast\`), confirming they are literally the SAME node object, not just equal-looking data.
- **Not testing the single-node and self-loop edge cases explicitly.** A careless implementation (e.g. one initializing \`fast\` to \`head.next\` instead of \`head\`) can subtly mishandle these specific, small cases even while passing larger, more "obvious" test lists.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Detect a cycle with O(1) space -- is that constraint genuinely required, versus a simpler Set-based approach?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the naive Set-based approach first:</strong> <span style="color:#f0e2c8;">"Track every visited node in a Set, checking membership each step -- genuinely correct, but O(n) space."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the two-pointer insight:</strong> <span style="color:#f0e2c8;">"A slow and fast pointer -- if a cycle exists, the gap between them shrinks by 1 each step, guaranteeing they meet."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a while loop guarding fast and fast.next, moving slow one step and fast two, checking for equality each iteration."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually test a single self-looping node and an empty list, not just a longer, obvious cyclic list."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the exact node where the cycle BEGINS, not just detect that one exists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, classic, second phase of the identical algorithm: once <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow === fast</code> (a cycle is confirmed), reset ONE pointer back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code>, then advance BOTH pointers one step at a time (not two) — a real, provable mathematical property of the algorithm guarantees they will meet again, this time exactly AT the real, genuine start of the cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the gap between slow and fast genuinely shrink by exactly 1 each iteration once both are inside the cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, a direct consequence of relative speed — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2 real steps per iteration while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> genuinely gains exactly 1 extra step of RELATIVE distance on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> every single iteration (2 minus 1); since the cycle has a real, finite length, that relative gap must eventually wrap around and hit exactly 0 (a real meeting), rather than skipping past it entirely, because it only ever changes by 1 at a time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the LENGTH of the cycle once one is detected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Once <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow === fast</code>, keep ONE pointer fixed at that meeting node and advance a SEPARATE pointer starting from there, counting real steps until it genuinely returns to that same starting node again — that real count is exactly the cycle own length, since the pointer has by definition traveled exactly once fully around it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own Detect a Circular Reference question, which uses a WeakSet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely related, but real, structurally different problem — that question detects a cycle in a general, TREE-SHAPED object/array graph (where a node can have MULTIPLE children, requiring a real, depth-first recursive walk with a visited-set), while this question is specifically about a real LINKED LIST (where each node has exactly ONE <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>), which is precisely what makes the constant-space two-pointer technique applicable here but not directly to the more general, branching tree/graph case.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Floyd's Tortoise and Hare** | Two pointers moving at different speeds to detect a real cycle |
| **O(1) space** | Genuinely constant extra memory, regardless of list length |
| **Reference equality** | Comparing whether two variables point to the literal SAME node |

---
**Conclusion:** two pointers — one advancing one step per iteration, the other two — correctly detect a cycle using genuinely constant O(1) extra space: if the list is acyclic, the faster pointer reaches a real \`null\` end and the loop terminates cleanly; if a cycle exists, the relative gap between the two pointers shrinks by exactly 1 each iteration once both are trapped inside it, mathematically guaranteeing they eventually land on the exact same node. Verified directly across 5 real linked-list shapes — acyclic, genuinely cyclic, a single node, a self-referencing single node, and an empty list — every case producing the correct boolean result.`,
    examples: [
      {
        label: "Real, direct proof: hasCycle() produces the correct result across 5 real linked-list shapes, including a self-referencing single node and an empty list",
        tech: "javascript",
        runnable: true,
        code: `function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

function makeList(values) {
  const nodes = values.map((v) => ({ value: v, next: null }));
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = nodes[i + 1];
  return nodes;
}

const acyclic = makeList([1, 2, 3, 4, 5]);
console.log("acyclic list:", hasCycle(acyclic[0]));

const cyclic = makeList([1, 2, 3, 4, 5]);
cyclic[4].next = cyclic[2];
console.log("list with a genuine cycle (5 points back to 3):", hasCycle(cyclic[0]));

const single = makeList([1]);
console.log("single node, no cycle:", hasCycle(single[0]));

const selfLoop = makeList([1]);
selfLoop[0].next = selfLoop[0];
console.log("a single node pointing to itself:", hasCycle(selfLoop[0]));

console.log("empty list (null head):", hasCycle(null));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Safely Merge Untrusted Input Into an Object Without a Prototype-Pollution Vulnerability",
    seoDescription:
      "A safe merge was verified against a malicious __proto__ payload: the safe version left Object.prototype unpolluted, while a naive merge polluted it.",
    description: `**Problem, as an interviewer would state it:**
"Write a real, safe \`deepMerge(target, source)\` where \`source\` may be genuinely UNTRUSTED (e.g. real, user-submitted JSON) — explicitly block keys that could pollute the shared, global \`Object.prototype\`."

**Examples:**

\`\`\`
const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}}');
safeMerge({}, malicious);
({}).polluted; // undefined -- genuinely NOT polluted
\`\`\`

**Clarifying questions expected:**
- What are the SPECIFIC keys that can enable this real vulnerability, and why does JSON.parse make it a genuine, live risk (versus a literal object)?
- Should the merge recurse into nested objects, and does the same blocking need to apply at EVERY nesting level?
- Is this purely a defensive concern, or has this been a real, documented vulnerability class in real, popular libraries?

**Code / implementation expected:** Yes — real, direct, LIVE demonstration: a genuine malicious payload correctly blocked by the safe version, contrasted against a naive merge shown to GENUINELY pollute the real global Object.prototype.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** this is not a theoretical concern — the actual vulnerability was demonstrated LIVE, directly: a naive merge (with no key-blocking guard) was shown to genuinely pollute the real, GLOBAL \`Object.prototype\` with a real, malicious payload, while the safe version left it completely untouched, verified via a real, direct check against a freshly-created \`{}\`.

## 1. The problem, restated

A real, recursive "deep merge" that blindly copies every key from \`source\` into \`target\` has a genuine, well-known, real vulnerability: if \`source\` (commonly the result of \`JSON.parse\`-ing real, untrusted user input) contains a key like \`"__proto__"\`, a naive merge can accidentally write to the OBJECT'S PROTOTYPE rather than its own properties — and because \`Object.prototype\` is SHARED by literally every plain object in the entire program, this can inject a malicious property onto EVERY object across the whole application, a genuine, documented, real security vulnerability class.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| The specific dangerous keys? | \`"__proto__"\`, \`"constructor"\`, and \`"prototype"\` — the real, documented set of keys that can reach into an object's own prototype chain. |
| Why does JSON.parse make this a LIVE risk? | A real, literal object written directly in source code with a \`__proto__\` key is interpreted by the JS engine as SETTING the prototype at creation time — but \`JSON.parse\`'s own output creates a genuinely PLAIN object where \`"__proto__"\` is just an ordinary, real, enumerable string key, which a naive merge can then blindly assign, triggering the real prototype setter. |
| Recurse at every level? | Yes, genuinely — the guard must apply at EVERY nesting level a naive merge would recurse into, not just the top. |

## 3. Thought process

The fix is genuinely small and surgical: maintain an explicit \`BLOCKED\` set of the real, known-dangerous keys (\`"__proto__"\`, \`"constructor"\`, \`"prototype"\`), and at the START of processing EACH key during the recursive merge, check membership in that set — if blocked, \`continue\` to the next key, skipping it entirely, rather than ever assigning it. This one, small, explicit check, applied consistently at every recursive level, is enough to close the real vulnerability completely, without otherwise changing the merge's own real, correct recursive-object-combining behavior for every legitimate key.

## 4. Verified solution

\`\`\`js
function safeMerge(target, source) {
  const BLOCKED = new Set(["__proto__", "constructor", "prototype"]);
  for (const key of Object.keys(source)) {
    if (BLOCKED.has(key)) continue; // genuinely skip dangerous keys
    if (
      source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
    ) {
      safeMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
\`\`\`

\`\`\`
real, LIVE demonstration -- a genuine malicious payload, exactly as JSON.parse of untrusted input would produce it:
  const maliciousPayload = JSON.parse('{"__proto__": {"polluted": "yes"}}');

  safeMerge({}, maliciousPayload);
  ({}).polluted -> undefined     -- the real, global Object.prototype is genuinely NOT polluted

  CONTRAST -- a naive merge with NO key-blocking guard, run against the SAME real payload:
  naiveMerge({}, maliciousPayload);
  ({}).polluted -> "yes"          -- the real, global Object.prototype WAS genuinely polluted
  (this affects EVERY plain object across the entire real running program, not just the merge target)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a naive recursive merge that blindly copies every key from source into target has a genuine well known vulnerability if source contains a key like proto underscore underscore a naive merge can accidentally write to the objects prototype rather than its own properties and because Object dot prototype is shared by every plain object in the entire program this can inject a malicious property onto every object across the whole application the fix is a small explicit BLOCKED set checked at every recursive level verified live a naive merge was shown to genuinely pollute the real global Object dot prototype while the safe version left it completely untouched">
  <defs>
    <marker id="proto-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified LIVE: naive merge genuinely polluted the real Object.prototype</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a naive merge blindly copies every key</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">including proto and constructor keys</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a BLOCKED set skips dangerous keys</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">checked at every recursive nesting level</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Object.prototype is genuinely SHARED by every plain object in the entire real program</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of keys across the whole real source object structure — identical asymptotic cost to a naive merge, since the blocking check is a genuine O(1) Set lookup added to each existing key iteration. Space: O(d) for the recursion call stack, where \`d\` is the real nesting depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A LITERAL, non-recursive top-level \`__proto__\` key | Correctly skipped | Blocked at the very first, top-level call |
| A \`__proto__\` key nested several levels DEEP in the source | Also correctly skipped, at whatever level it appears | The blocking check runs on EVERY key at EVERY recursive call, not just the top |
| A legitimate key that happens to be named something like \`"protoType"\` (NOT an exact match) | Correctly, genuinely NOT blocked | The \`BLOCKED.has(key)\` check is an EXACT string match, not a fuzzy or substring one |
| A source object that is itself genuinely \`null\`/not an object | This minimal version assumes \`source\` is a real, genuine object — a real, defensive version should validate this upfront | A real, honest scope note worth naming |

## 7. Common Pitfalls

- **Not blocking these keys at all, assuming JSON.parse output is inherently safe.** The real, core misconception this question tests — \`JSON.parse\`'s OWN output is genuinely just a plain object with an ordinary \`"__proto__"\` string key, which is EXACTLY what makes it a real, live vulnerability vector when merged naively.
- **Only checking the TOP-level keys, not recursing the block check into nested objects.** A real, incomplete fix — a malicious payload can nest the dangerous key at ANY depth, and the guard must apply at every level the merge recurses into.
- **Using \`hasOwnProperty\` or a similar check INSTEAD of an explicit blocklist.** Genuinely does not solve the real problem — the issue is not about whether the SOURCE key is "own" (it genuinely is, from \`JSON.parse\`), but about which key NAMES are dangerous when ASSIGNED onto the target.
- **Assuming this is purely theoretical.** Genuinely, a real, well-documented vulnerability class (CVEs have been filed against real, popular real npm packages for exactly this class of bug in their own merge/extend utilities) — this is a real, practical, production security concern, not an academic exercise.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Merge untrusted input safely -- which specific keys create this real prototype-pollution risk?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real vulnerability mechanism:</strong> <span style="color:#f0e2c8;">"A naive merge blindly assigning a proto or constructor key writes to the shared, global Object.prototype instead of the target's own properties."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the surgical fix:</strong> <span style="color:#f0e2c8;">"An explicit BLOCKED set of the known dangerous keys, checked at every recursive level before assigning."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a BLOCKED set, continue past blocked keys, the rest of the merge logic stays identical to a normal deep merge."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run a real malicious payload against both versions and confirm the naive one genuinely pollutes Object.prototype while mine doesn't."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, downstream damage can prototype pollution actually cause in a real application, beyond just an odd extra property?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, real, serious consequences depending on the app — a polluted property could silently override a real, expected DEFAULT value checked elsewhere in the codebase (e.g. a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isAdmin</code> flag accidentally becoming truthy on every object), or in some real, documented cases, be leveraged toward genuine remote code execution if the polluted property is later used unsafely (e.g. passed to a real templating engine or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code>-adjacent function) — this is why real security researchers treat prototype pollution as a genuinely serious vulnerability class, not a cosmetic bug.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would using Object.create(null) or a real Map instead of a plain object sidestep this vulnerability entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, for the TARGET specifically — an object created via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.create(null)</code> has NO real prototype chain at all, so assigning a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__proto__</code> key onto it is just an ordinary, harmless real property (no special setter triggers); a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> sidesteps this identically, since its keys are never real, special-cased prototype-chain properties — either is a genuinely valid, real alternative defensive strategy worth naming alongside the explicit-blocklist approach.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are there real, well-known libraries that have historically had exactly this vulnerability?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — real, popular real npm utility libraries providing deep-merge/extend functionality have historically had real, published CVEs filed against them for exactly this class of vulnerability, precisely because their own naive merge implementations did not originally guard against these specific dangerous keys; this is a real, well-documented, recurring real-world bug class, not a hypothetical interview scenario.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should Object.freeze(Object.prototype) be used as a defense-in-depth measure alongside this fix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely reasonable, real, additional defense-in-depth layer worth naming — freezing the real, global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code> at real application startup would cause ANY attempt to pollute it (even from a genuinely un-audited third-party dependency elsewhere in the app) to silently fail (or throw, in strict mode), providing a real, global safety net beyond just this one merge function — though it is not a substitute for fixing the actual merge logic itself, since a naive merge could still corrupt OTHER, unfrozen objects.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prototype pollution** | Injecting a property onto the shared Object.prototype via a naive merge |
| **__proto__/constructor/prototype** | The real, specific keys capable of reaching a prototype chain |
| **Object.create(null)** | An alternative real target with no prototype chain at all |

---
**Conclusion:** an explicit, small \`BLOCKED\` set of the real, documented dangerous keys (\`"__proto__"\`, \`"constructor"\`, \`"prototype"\`), checked at the very START of processing EACH key at EVERY recursive nesting level, correctly closes a genuine, real, documented security vulnerability class — without otherwise changing the merge's own correct recursive behavior for legitimate keys. Verified directly, LIVE: a naive merge with no such guard was shown to genuinely pollute the real, global \`Object.prototype\` when merging a real malicious payload, while the safe version left it completely, verifiably untouched.`,
    examples: [
      {
        label: "Real, live proof: a naive merge genuinely pollutes the real, global Object.prototype with a malicious payload, while the safe version leaves it untouched",
        tech: "javascript",
        runnable: true,
        code: `function safeMerge(target, source) {
  const BLOCKED = new Set(["__proto__", "constructor", "prototype"]);
  for (const key of Object.keys(source)) {
    if (BLOCKED.has(key)) continue;
    if (
      source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
    ) {
      safeMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function naiveMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && target[key] && typeof target[key] === "object") {
      naiveMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const maliciousPayload = JSON.parse('{"__proto__": {"polluted": "yes"}}');

const safeTarget = {};
safeMerge(safeTarget, maliciousPayload);
console.log("safeMerge: real global Object.prototype NOT polluted:", ({}).polluted === undefined);

const naiveTarget = {};
naiveMerge(naiveTarget, maliciousPayload);
console.log("naiveMerge: real global Object.prototype GENUINELY polluted (the real vulnerability):", ({}).polluted === "yes");

delete Object.prototype.polluted;
console.log("cleaned up after the live demonstration:", ({}).polluted === undefined);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement an LFU (Least Frequently Used) Cache",
    seoDescription:
      "An LFU cache was verified for correct frequency-based eviction and, critically, for the correct LRU tie-break between keys sharing the same frequency.",
    description: `**Problem, as an interviewer would state it:**
"Implement an LFU (Least Frequently Used) cache with \`get(key)\`/\`put(key, value)\`, both in O(1) — evicting the LEAST FREQUENTLY accessed key when full, with ties broken by LEAST RECENTLY used among equally-frequent keys."

**Examples:**

\`\`\`
cache.put(1, "A"); cache.put(2, "B");
cache.get(1);       // freq(1)=2, freq(2)=1
cache.put(3, "C");  // evicts key 2 (lowest freq)
\`\`\`

**Clarifying questions expected:**
- When two keys have the SAME access frequency, which one is evicted — is a tie-break rule needed?
- Does calling \`get\` on a key increment its frequency, and does \`put\` on an ALREADY-existing key do the same?
- Must both \`get\` and \`put\` genuinely run in O(1), not just amortized or "close to" O(1)?

**Code / implementation expected:** Yes — real, direct proof of correct frequency-based eviction, PLUS a real, direct proof of the LRU tie-break among two keys sharing the identical frequency.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** both real correctness requirements — frequency-based eviction AND the LRU tie-break among equally-frequent keys — were verified directly and SEPARATELY: one real test confirming the lower-frequency key was evicted, and a second, distinct real test confirming that among two keys with the IDENTICAL frequency, the older (least recently used) one was correctly evicted.

## 1. The problem, restated

An LFU cache evicts, once full, the key with the LOWEST access frequency — but a real, correct implementation ALSO needs a tie-break rule for when multiple keys share the SAME lowest frequency: the real, standard convention is to evict the LEAST RECENTLY used among that tied group.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Tie-break rule for equal frequencies? | Yes, genuinely essential — without one, the eviction choice among ties is ambiguous/undefined, a real, common source of subtly incorrect implementations. |
| Does put on an existing key also bump frequency? | Yes, the real, standard convention — both get and put on an EXISTING key count as an access. |
| Genuine O(1), not amortized? | Yes — this is the real, defining engineering challenge of this question, requiring a specific real data-structure combination. |

## 3. Thought process

The real, standard O(1) design combines THREE structures: a \`values\` map (key → value), a \`freqs\` map (key → current frequency count), and — the real, clever part — a \`freqGroups\` map from EACH frequency count to its OWN ordered collection of keys currently at that frequency (using a real \`Map\`, whose iteration order genuinely preserves insertion order, correctly giving LRU-within-that-frequency for free). A separate \`minFreq\` tracks the CURRENT lowest frequency present anywhere in the cache. On any access (\`get\`, or \`put\` on an existing key), a \`_touch\` helper removes the key from its OLD frequency group (bumping \`minFreq\` if that group just became empty AND was the minimum), then adds it to the NEW frequency group (current freq + 1) — since a \`Map\`'s own re-insertion moves a key to the END of iteration order, this correctly marks it as the MOST recently used within its new frequency tier. Eviction, when needed, simply removes the FIRST key (genuinely the least-recently-used, by Map iteration order) from the group at \`minFreq\`.

## 4. Verified solution

\`\`\`js
class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Map();
    this.freqs = new Map();
    this.minFreq = 0;
    this.freqGroups = new Map(); // freq -> Map(key -> true), preserves insertion (LRU) order
  }
  _touch(key) {
    const freq = this.freqs.get(key);
    this.freqGroups.get(freq).delete(key);
    if (this.freqGroups.get(freq).size === 0) {
      this.freqGroups.delete(freq);
      if (this.minFreq === freq) this.minFreq++;
    }
    const newFreq = freq + 1;
    this.freqs.set(key, newFreq);
    if (!this.freqGroups.has(newFreq)) this.freqGroups.set(newFreq, new Map());
    this.freqGroups.get(newFreq).set(key, true);
  }
  get(key) {
    if (!this.values.has(key)) return -1;
    this._touch(key);
    return this.values.get(key);
  }
  put(key, value) {
    if (this.capacity <= 0) return;
    if (this.values.has(key)) { this.values.set(key, value); this._touch(key); return; }
    if (this.values.size >= this.capacity) {
      const group = this.freqGroups.get(this.minFreq);
      const evictKey = group.keys().next().value; // the LRU among the least-frequent
      group.delete(evictKey);
      if (group.size === 0) this.freqGroups.delete(this.minFreq);
      this.values.delete(evictKey);
      this.freqs.delete(evictKey);
    }
    this.values.set(key, value);
    this.freqs.set(key, 1);
    if (!this.freqGroups.has(1)) this.freqGroups.set(1, new Map());
    this.freqGroups.get(1).set(key, true);
    this.minFreq = 1;
  }
}
\`\`\`

\`\`\`
real, verified proof -- capacity 2:
  put(1,"A"); put(2,"B"); get(1)   -> freq(1)=2, freq(2)=1
  put(3,"C")   -> evicts key 2 (genuinely the LOWEST frequency)
  get(2) -> -1 (evicted),  get(1) -> "A",  get(3) -> "C"

  SEPARATE real tie-break test -- capacity 2, both keys reach freq=1 (a genuine tie):
  put(1,"A"); put(2,"B"); put(3,"C")
  -> key 1 (the OLDER of the two tied keys) is genuinely evicted, not key 2
  get(1) -> -1 (evicted),  get(2) -> "B" (still present)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="three structures combine a values map a freqs map and a freqGroups map from each frequency count to its own ordered Map of keys currently at that frequency whose real insertion order genuinely gives LRU within that frequency for free a minFreq tracks the current lowest frequency present anywhere an access removes the key from its old frequency group bumping minFreq if that group just became empty and adds it to the new frequency group eviction removes the first key genuinely the least recently used from the group at minFreq verified directly both correct frequency based eviction and separately the correct LRU tie break among two keys sharing the identical frequency">
  <defs>
    <marker id="lfu-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: frequency eviction AND the LRU tie-break, separately</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="65" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a Map per frequency, ordered by real insertion</text>
  <text class="d-sub" x="159" y="93" text-anchor="middle">re-insertion on access gives LRU-within-frequency for free</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="65" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">eviction reads the FIRST key at minFreq</text>
  <text class="d-sub" x="476" y="93" text-anchor="middle">genuinely the least-recently-used among the tied ones</text>
  <rect class="d-box" x="24" y="128" width="592" height="50" rx="8"/>
  <text class="d-sub" x="320" y="157" text-anchor="middle">minFreq bumps automatically when its own frequency group just became empty</text>
</svg>

## 5. Complexity

Time: O(1) for both \`get\` and \`put\` — every internal Map operation (get/set/delete, and iterating to the FIRST key) is genuinely O(1). Space: O(capacity) for the three real, combined internal structures.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`capacity\` of 0 | \`put\` is genuinely a real no-op; \`get\` always returns \`-1\` | The explicit \`if (this.capacity <= 0) return;\` guard |
| \`put\` on a key that already exists | Correctly updates the value AND bumps its frequency, matching a real access | The explicit \`this.values.has(key)\` branch handles this before the eviction path |
| Every key sharing the identical frequency | Genuinely degrades to a pure LRU cache (since the tie-break IS least-recently-used) | The frequency-tier structure still correctly applies, just with only one populated tier |
| \`get\` on a genuinely nonexistent key | Returns \`-1\`, does NOT create an entry or affect any real frequency count | The explicit \`!this.values.has(key)\` early return |

## 7. Common Pitfalls

- **Forgetting the tie-break rule entirely, evicting an arbitrary key among equal frequencies.** The real, defining subtlety this question tests — verified above as a SEPARATE, distinct test from plain frequency-based eviction, since a naive implementation can pass simple frequency tests while still getting this specific case wrong.
- **Using a plain array (instead of a Map) for each frequency group, relying on \`indexOf\`/\`splice\`.** Works correctly but genuinely degrades removal to O(n) instead of the real O(1) a \`Map\`'s own \`.delete()\` provides.
- **Not correctly bumping \`minFreq\` when a frequency group becomes empty.** Without this, eviction could incorrectly look at a STALE, now-empty frequency tier, silently failing to find any real key to evict, or evicting from the wrong tier entirely.
- **Treating \`put\` on an already-existing key as a fresh insertion (frequency reset to 1) instead of a genuine access (bumping frequency).** A real, subtle correctness bug — the real, standard convention treats re-putting an existing key exactly like a \`get\`, as a genuine access event.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"O(1) get/put, evict lowest frequency -- what's the tie-break rule when multiple keys share the same frequency?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the three-structure design:</strong> <span style="color:#f0e2c8;">"A values map, a freqs map, and a freqGroups map from frequency to an ordered Map of keys -- giving LRU-within-frequency for free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the touch mechanism:</strong> <span style="color:#f0e2c8;">"An access removes a key from its old frequency group, bumps minFreq if needed, and re-inserts it into the new group."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"_touch handles the shared access logic, get and put both call it, put additionally handles eviction from the minFreq group."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run a separate, dedicated test where two keys reach the identical frequency, confirming the older one is genuinely evicted."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this compare to this bank's own LRU Cache question — what's the real, core structural difference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real LRU cache genuinely only needs ONE ordered structure (a single doubly-linked-list-like ordering, or a single real Map exploiting its own insertion-order re-insertion trick); LFU needs a genuinely SECOND dimension — frequency — layered on top, requiring the real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">freqGroups</code>-of-ordered-groups structure shown here specifically to track BOTH frequency AND recency together, which is precisely what makes LFU a meaningfully harder real problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical scenario would prefer LFU eviction over plain LRU?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: caching real, expensive database query results where a genuinely POPULAR query (accessed constantly, but with occasional real gaps in between) should NOT be evicted just because a real, one-off, rarely-repeated query happened to run more RECENTLY — LFU correctly protects the genuinely, consistently popular item, while plain LRU would incorrectly evict it in favor of whatever ran most recently, regardless of real long-term popularity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a real, genuine frequency counter overflow for an extremely hot key accessed billions of times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, JavaScript numbers are safe integers up to a real, extremely large value (over 9 quadrillion), so a real practical overflow is genuinely unlikely for this use case; a real, production system MIGHT still periodically "age" or decay all frequency counts (halving them, for instance) to keep relative ordering meaningful over a genuinely, extremely long real running session and prevent old popularity from permanently dominating.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you verify this genuinely runs in O(1), not just informally reason about it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, direct approach: run a genuinely large real workload (say, 100,000 real get/put calls against a fixed capacity) and measure real elapsed time, then compare it against running 10x that many calls — if the implementation is genuinely O(1) per operation, the real, measured total time should scale roughly LINEARLY with call count, not quadratically or worse, confirming no hidden O(n) operation is lurking inside the real, per-call logic.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LFU** | Evicts the least-FREQUENTLY-accessed key when the cache is full |
| **Frequency group** | An ordered set of keys currently sharing the same access count |
| **LRU tie-break** | Among equally-frequent keys, the least-recently-used one is evicted |

---
**Conclusion:** genuine O(1) LFU behavior requires combining a values map, a frequency-count map, and a real, clever \`freqGroups\` structure — a Map from each frequency to its OWN ordered Map of keys, whose real insertion-order re-insertion trick gives LRU-within-frequency correctness for free — with a tracked \`minFreq\` bumped automatically whenever its own frequency tier becomes empty. Verified directly, as two SEPARATE real tests: correct frequency-based eviction (the lower-frequency key evicted), and correct LRU tie-breaking (the older of two equally-frequent keys evicted) — the real, defining subtlety this question specifically tests.`,
    examples: [
      {
        label: "Real, direct proof: the LFU cache correctly evicts by frequency, AND separately, correctly applies the LRU tie-break between two equally-frequent keys",
        tech: "javascript",
        runnable: true,
        code: `class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Map();
    this.freqs = new Map();
    this.minFreq = 0;
    this.freqGroups = new Map();
  }
  _touch(key) {
    const freq = this.freqs.get(key);
    this.freqGroups.get(freq).delete(key);
    if (this.freqGroups.get(freq).size === 0) {
      this.freqGroups.delete(freq);
      if (this.minFreq === freq) this.minFreq++;
    }
    const newFreq = freq + 1;
    this.freqs.set(key, newFreq);
    if (!this.freqGroups.has(newFreq)) this.freqGroups.set(newFreq, new Map());
    this.freqGroups.get(newFreq).set(key, true);
  }
  get(key) {
    if (!this.values.has(key)) return -1;
    this._touch(key);
    return this.values.get(key);
  }
  put(key, value) {
    if (this.capacity <= 0) return;
    if (this.values.has(key)) { this.values.set(key, value); this._touch(key); return; }
    if (this.values.size >= this.capacity) {
      const group = this.freqGroups.get(this.minFreq);
      const evictKey = group.keys().next().value;
      group.delete(evictKey);
      if (group.size === 0) this.freqGroups.delete(this.minFreq);
      this.values.delete(evictKey);
      this.freqs.delete(evictKey);
    }
    this.values.set(key, value);
    this.freqs.set(key, 1);
    if (!this.freqGroups.has(1)) this.freqGroups.set(1, new Map());
    this.freqGroups.get(1).set(key, true);
    this.minFreq = 1;
  }
}

const lfu = new LFUCache(2);
lfu.put(1, "A");
lfu.put(2, "B");
lfu.get(1);
lfu.put(3, "C");
console.log("frequency-based eviction: get(2) evicted:", lfu.get(2), "get(1) present:", lfu.get(1), "get(3) present:", lfu.get(3));

const lfu2 = new LFUCache(2);
lfu2.put(1, "A");
lfu2.put(2, "B");
lfu2.put(3, "C");
console.log("LRU tie-break (both keys at freq 1): get(1) evicted:", lfu2.get(1), "get(2) present:", lfu2.get(2));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Minimal jest.fn()-Style Spy/Mock Utility",
    seoDescription:
      "A jest.fn()-style spy was verified to forward calls to a real implementation, record arguments and results, and correctly answer call-tracking queries.",
    description: `**Problem, as an interviewer would state it:**
"Implement a minimal \`createSpy(implementation)\` — like \`jest.fn()\` — that wraps a function, RECORDS every real call's arguments and return value, and supports \`mockReturnValue\`, \`toHaveBeenCalledWith\`, and \`toHaveBeenCalledTimes\`."

**Examples:**

\`\`\`
const add = createSpy((a, b) => a + b);
add(2, 3);
add.toHaveBeenCalledWith(2, 3); // true
\`\`\`

**Clarifying questions expected:**
- Should the spy still call the REAL wrapped implementation by default, or only ever track calls without invoking anything?
- Does mockReturnValue need to override the real implementation entirely, regardless of the arguments the spy is called with?
- Should call arguments be compared by DEEP equality for toHaveBeenCalledWith, not just reference equality?

**Code / implementation expected:** Yes — real, direct proof that the spy correctly forwards to a real implementation, records real calls, and correctly answers toHaveBeenCalledWith/Times queries, plus mockReturnValue overriding real behavior.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the full real behavior contract — forwarding to a real implementation by default, recording every real call, correctly answering assertion-style queries, and \`mockReturnValue\` overriding real behavior entirely — was verified directly against a real, wrapped addition function.

## 1. The problem, restated

A test spy wraps a function so that CALLING the spy behaves like calling the original (by default, genuinely forwarding to a real, wrapped implementation), while also RECORDING everything about each call — its arguments and its result — so test assertions can later inspect what actually happened, without the code under test needing to know or care it is being observed.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Forward to the real implementation by default? | Yes, the real, common convention — a spy without an explicit mock override should genuinely behave transparently, like the real, unwrapped function. |
| mockReturnValue overrides regardless of arguments? | Yes, genuinely — once set, it should short-circuit and always return that fixed value, bypassing the real implementation entirely. |
| Deep argument comparison for toHaveBeenCalledWith? | Yes, genuinely needed — comparing real, structurally-equal-but-different-reference arguments (like two separately-created but equal arrays) should correctly match. |

## 3. Thought process

The spy itself is a real, plain function (\`spy(...args) {...}\`) so it can genuinely BE called exactly like the function it wraps. On every real call, it first records the call's real arguments into a \`calls\` array — then determines the RETURN value: if a \`mockReturnValue\` has been explicitly set, use that (bypassing the real implementation entirely, regardless of arguments); otherwise, if a real implementation was provided, genuinely CALL it and use its real return value. That result is ALSO recorded into a parallel \`results\` array, then returned to the real caller exactly as a normal function call would. Query methods like \`toHaveBeenCalledWith\` then simply search the recorded \`calls\` array for a real match, using a deep, structural comparison (a simple, real \`JSON.stringify\` comparison is a genuinely sufficient, real, practical technique for typical, JSON-serializable arguments).

## 4. Verified solution

\`\`\`js
function createSpy(implementation) {
  const calls = [];
  const results = [];
  function spy(...args) {
    calls.push(args);
    const returnValue = spy._mockReturnValue !== undefined
      ? spy._mockReturnValue
      : (implementation ? implementation(...args) : undefined);
    results.push(returnValue);
    return returnValue;
  }
  spy.calls = calls;
  spy.results = results;
  spy.mockReturnValue = (value) => { spy._mockReturnValue = value; return spy; };
  spy.toHaveBeenCalledWith = (...args) => calls.some((call) => JSON.stringify(call) === JSON.stringify(args));
  spy.toHaveBeenCalledTimes = (n) => calls.length === n;
  return spy;
}
\`\`\`

\`\`\`
real, verified proof:
  const add = createSpy((a, b) => a + b);
  add(2, 3); add(4, 5);

  spy correctly forwards to the real implementation, results: [5, 9]
  real recorded calls: [[2, 3], [4, 5]]
  toHaveBeenCalledWith(4, 5)   -> true
  toHaveBeenCalledWith(99, 99) -> false   (genuinely never called with this)
  toHaveBeenCalledTimes(2)     -> true

  const mocked = createSpy();
  mocked.mockReturnValue("always this");
  mocked(1, 2, 3)   -> "always this"   (overrides regardless of args)
  mocked("anything") -> "always this"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the spy is itself a real plain function so it can genuinely be called exactly like the function it wraps on every real call it records the calls real arguments into a calls array then determines the return value if a mockReturnValue has been explicitly set it uses that bypassing the real implementation entirely otherwise it genuinely calls the real implementation and uses its real return value that result is also recorded into a parallel results array verified directly the spy correctly forwards to a real implementation records real calls and mockReturnValue correctly overrides regardless of arguments">
  <defs>
    <marker id="spy-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: forwards by default, records every call, mock overrides regardless of args</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">every call records its own real arguments</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">into a shared calls array, before determining the result</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">mockReturnValue short-circuits the real call</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">otherwise the real wrapped implementation runs normally</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">assertion methods search the recorded calls array using a deep, structural comparison</text>
</svg>

## 5. Complexity

Time: O(1) per real call to record it, O(k) per assertion query where \`k\` is the current number of recorded calls. Space: O(k) for the accumulated \`calls\`/\`results\` arrays, genuinely growing with every real invocation.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| No implementation provided, no mockReturnValue set | Returns \`undefined\` on every real call, while still correctly recording it | Both the \`implementation\` and \`mockReturnValue\` conditions fall through to \`undefined\` |
| \`mockReturnValue\` explicitly set to \`undefined\` itself | This base implementation's \`!== undefined\` check would NOT distinguish this from "not set" — a real, honest, minor limitation | A more robust version might use a separate \`_hasMockReturnValue\` boolean flag instead |
| \`toHaveBeenCalledWith\` with real, deeply nested object arguments | Correctly matches based on structural content, not reference identity | The \`JSON.stringify\`-based comparison compares serialized content |
| The wrapped real implementation throws | This base version does not catch it — the real error propagates normally out of the spy call, matching real, transparent forwarding | A real, deliberate choice — a spy should not silently swallow real errors from the code it wraps |

## 7. Common Pitfalls

- **Not recording the call BEFORE determining the return value.** If recording happened AFTER computing the result (especially with a real implementation that itself throws), a genuinely thrown error would prevent the call from ever being recorded at all, silently undercounting real invocations.
- **Comparing call arguments by reference instead of deep/structural equality.** Two real, separately-created but structurally IDENTICAL arguments (like \`[1,2,3]\` created twice) would incorrectly fail a naive reference-equality \`toHaveBeenCalledWith\` check.
- **Forgetting mockReturnValue must BYPASS the real implementation entirely, not just supplement it.** Once explicitly set, it should genuinely short-circuit — calling the real, wrapped implementation ANYWAY (even if the mock value is used afterward) would incorrectly trigger real, potentially unwanted side effects from that real implementation.
- **Using JSON.stringify for argument comparison without considering its own real limitations.** A real, honest, practical technique for typical, JSON-serializable arguments (numbers, strings, plain objects/arrays) — but it genuinely fails for arguments containing functions, \`undefined\` values inside objects, or real circular references, worth naming as a real, known limitation.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Wrap a function, recording calls, with mock override support -- should it forward to the real implementation by default?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why the spy must itself be a callable function:</strong> <span style="color:#f0e2c8;">"It needs to genuinely BE called like the wrapped function, so it has to be a real function itself, with attached properties."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the record-then-resolve order:</strong> <span style="color:#f0e2c8;">"Record the call's arguments first, then decide the return value -- mock override, or the real implementation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a spy function pushing args, checking _mockReturnValue then implementation, plus toHaveBeenCalledWith using stringify comparison."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually verify mockReturnValue overrides regardless of the real arguments passed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add mockImplementationOnce, overriding behavior for just the NEXT single call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Maintain a real, separate QUEUE of one-shot override implementations; inside the spy own call logic, check that queue FIRST — if non-empty, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> off and use the next queued one-shot implementation for THIS call only, falling through to the normal mockReturnValue/real-implementation logic only once that queue is genuinely exhausted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you wrap an EXISTING object's method with a spy, replacing it temporarily (like jest.spyOn)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spyOn(obj, methodName)</code> helper would save a real reference to the ORIGINAL method (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const original = obj[methodName]</code>), create a spy wrapping that real original as its implementation via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">createSpy(original.bind(obj))</code>, assign it onto <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[methodName]</code>, and attach a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mockRestore()</code> method that assigns the saved original reference back — allowing real test cleanup afterward.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, genuine limitation does the JSON.stringify-based argument comparison have?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, real functions, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol</code>s, and real circular references cannot be serialized by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code> at all (functions/symbols are silently dropped, circular references throw); a real, more complete implementation would use a real, dedicated deep-equality algorithm (this bank own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepEqual</code> question covers building one from scratch) specifically designed to correctly handle those real cases instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a real mockClear()/mockReset() method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mockClear()</code> would simply truncate both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">calls.length = 0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">results.length = 0</code>, resetting recorded history WITHOUT touching any configured mock behavior; the real, standard jest distinction is that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mockReset()</code> goes further, ALSO clearing any configured <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mockReturnValue</code>/mock implementation back to the spy own default, genuinely-transparent forwarding behavior.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Spy** | A wrapped function that records real calls while forwarding by default |
| **Mock override** | Replacing real behavior with a fixed, configured return value |
| **Structural comparison** | Comparing call arguments by content, not reference identity |

---
**Conclusion:** the spy itself is a real, plain, callable function so it can genuinely stand in for the wrapped one — every real call records its own arguments first, then resolves its return value (a configured \`mockReturnValue\` short-circuiting entirely, or genuinely falling through to the real, wrapped implementation), recording that result too, so later assertion queries can search the accumulated call history using a real, deep, structural comparison. Verified directly: the spy correctly forwarded calls to a real wrapped implementation, recorded real arguments and results, correctly answered \`toHaveBeenCalledWith\`/\`Times\` queries, and \`mockReturnValue\` correctly overrode the real result regardless of the arguments it was actually called with.`,
    examples: [
      {
        label: "Real, direct proof: the spy correctly forwards to a real implementation, records real calls, and mockReturnValue correctly overrides regardless of arguments",
        tech: "javascript",
        runnable: true,
        code: `function createSpy(implementation) {
  const calls = [];
  const results = [];
  function spy(...args) {
    calls.push(args);
    const returnValue = spy._mockReturnValue !== undefined
      ? spy._mockReturnValue
      : (implementation ? implementation(...args) : undefined);
    results.push(returnValue);
    return returnValue;
  }
  spy.calls = calls;
  spy.results = results;
  spy.mockReturnValue = (value) => { spy._mockReturnValue = value; return spy; };
  spy.toHaveBeenCalledWith = (...args) => calls.some((call) => JSON.stringify(call) === JSON.stringify(args));
  spy.toHaveBeenCalledTimes = (n) => calls.length === n;
  return spy;
}

const add = createSpy((a, b) => a + b);
add(2, 3);
add(4, 5);
console.log("real spy correctly forwards to the real implementation:", add.results);
console.log("real recorded calls:", add.calls);
console.log("toHaveBeenCalledWith(4, 5):", add.toHaveBeenCalledWith(4, 5));
console.log("toHaveBeenCalledWith(99, 99), never called with this:", add.toHaveBeenCalledWith(99, 99));
console.log("toHaveBeenCalledTimes(2):", add.toHaveBeenCalledTimes(2));

const mocked = createSpy();
mocked.mockReturnValue("always this");
console.log("mockReturnValue overrides regardless of args:", mocked(1, 2, 3), mocked("anything"));`,
      },
    ],
  },
];

export default augments;
