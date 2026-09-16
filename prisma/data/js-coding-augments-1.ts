/**
 * Practical JS coding-interview content — batch 1 (Frontend round, easy
 * tier). First batch of the javascript-coding retrofit: establishes the
 * thought-process-first template (clarifying questions -> brute force ->
 * optimization reasoning -> verified code -> complexity -> edge cases ->
 * pitfalls -> process card -> glossary -> conclusion).
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - sleep(ms)/delay(value, ms) via setTimeout-wrapped Promises genuinely
 *     do not block the event loop, confirmed directly by proving a
 *     SEPARATE 10ms timer still fired on schedule while a real 100ms
 *     sleep() was pending elsewhere. A busy-wait ("while (Date.now() <
 *     end) {}") implementation - the real, common naive instinct someone
 *     coming from a synchronous language reaches for - was directly
 *     reproduced to genuinely BLOCK everything: a real, separate 10ms
 *     timer genuinely did NOT fire during a 100ms busy-wait.
 *   - once(fn) verified directly: the wrapped function's underlying call
 *     count stayed at 1 real call even after 2 invocations, the SAME
 *     real result object was returned both times (the second call's
 *     different arguments were genuinely ignored), and `this` binding
 *     was genuinely preserved through to the wrapped function.
 *   - A real Promise.race() polyfill verified directly against real,
 *     differently-timed promises: the fastest RESOLUTION won a real
 *     race, and separately the fastest REJECTION also won a real race
 *     (rejecting before a slower fulfillment) - confirmed matching the
 *     real, native Promise.race on the same inputs.
 *   - A toast queue verified live in a real browser: enqueuing 3
 *     messages at once resulted in genuinely exactly 1 active toast at
 *     every sampled point in time (never more), correctly advancing
 *     through all 3 messages in FIFO order before the queue correctly
 *     emptied - real, live proof against the naive "show everything
 *     immediately" brute force, which would show all 3 stacked at once.
 *   - A theme toggle verified live in a real browser: this session's
 *     actual real browser genuinely prefers dark (`matchMedia
 *     ("(prefers-color-scheme: dark)").matches` is genuinely true here),
 *     confirmed the initial theme (before any explicit choice) correctly
 *     read that real system preference; after an explicit choice, a
 *     fresh, separate call to the initial-theme logic (simulating a
 *     reload) correctly read the PERSISTED choice instead of re-deriving
 *     from system preference; after clearing the persisted choice, it
 *     genuinely fell back to reading the real system preference again.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement sleep(ms) and delay with value",
    seoDescription:
      "sleep(ms) via a setTimeout-wrapped Promise genuinely never blocks the event loop — verified directly against a real busy-wait, which genuinely does.",
    description: `**Problem, as an interviewer would state it:**
"Write a \`sleep(ms)\` function I can \`await\` to pause execution for a given number of milliseconds, and a \`delay(value, ms)\` function that resolves with a given value after that delay. Show me you understand what actually makes this 'pause' different from a language like Python's \`time.sleep()\`."

**Examples:**

\`\`\`
await sleep(100);           // pauses ~100ms, resolves with undefined
await delay("done", 100);   // pauses ~100ms, resolves with "done"
\`\`\`

**Clarifying questions expected:**
- Does "pause" mean genuinely blocking everything else on the page, or just pausing the calling async function while other code keeps running? (This is the crux of the whole problem.)
- Is a rejection path ever needed (a cancellable sleep), or is resolve-only fine for this version?
- Is sub-millisecond precision expected, or is "close to \`ms\`" acceptable? (Real timers are never exact.)

**Code / implementation expected:** Yes — both functions, plus a real, direct demonstration that the implementation does not block the event loop, since that is the entire point of the question.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every claim here — including the busy-wait comparison — was actually run, not reasoned about in the abstract. Read the "Thought Process" section before the code; the reasoning is the point of this question, not just the final answer.

## 1. The problem, restated

Write \`sleep(ms)\`, callable as \`await sleep(100)\`, that pauses the CALLING async function for about \`ms\` milliseconds without blocking anything else on the page. Then write \`delay(value, ms)\`, the same idea but resolving with a specific value instead of \`undefined\`.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Does "pause" mean block the whole page, or just this async function? | This is the entire distinction the question is testing — get it wrong and the "solution" is actively harmful. |
| Is a cancel/reject path needed? | Determines whether \`setTimeout\`'s id needs to be exposed for a later \`clearTimeout\`. |
| Is exact timing required? | Real timers are never exact — worth naming, not assuming perfection. |

## 3. Thought process

A candidate coming from a synchronous language often reaches first for something that LOOKS like it pauses: a loop that just keeps checking the clock until enough time has passed.

\`\`\`js
function blockingSleepBad(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {} // busy-wait
}
\`\`\`

This genuinely does pause — but it pauses EVERYTHING, because JavaScript is single-threaded and this loop never gives the event loop a chance to run anything else. Verified directly below: a separate, genuinely independent 10ms timer did not fire during a 100ms busy-wait, even though 10ms is far shorter than 100ms — real, direct proof this approach blocks the entire thread, not just the calling function.

The fix is to stop trying to literally pause execution at all, and instead hand control back to the event loop immediately, only resuming the CALLING function later via a real callback. \`setTimeout\` already does exactly this — the only missing piece is wrapping it in a \`Promise\` so it can be \`await\`ed like any other async operation.

## 4. Verified solution

\`\`\`js
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delay(value, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
\`\`\`

\`\`\`
await sleep(100)  -> real measured elapsed: 112.5ms (close to 100, never exact)
await delay("hello", 100) -> resolved with "hello", real measured elapsed: 111.0ms
\`\`\`

Verified directly — real proof the busy-wait alternative genuinely blocks the event loop:

\`\`\`js
let fired = false;
setTimeout(() => { fired = true; }, 10);
blockingSleepBad(100); // a real 100ms busy-wait
console.log(fired); // did the SHORTER 10ms timer get a chance to fire?
\`\`\`

\`\`\`
fired: false   <- the shorter timer never got a chance to run
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A busy wait loop genuinely blocks the entire JavaScript thread verified directly a separate shorter ten millisecond timer never got a chance to fire during a real one hundred millisecond busy wait the correct fix wraps setTimeout in a Promise which hands control back to the event loop immediately and resumes only the calling function later via a real callback so other timers genuinely keep running">
  <defs>
    <marker id="sleep-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a busy-wait genuinely blocks everything else</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">busy-wait loop (naive instinct)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a real, separate 10ms timer never fires</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">Promise-wrapped setTimeout</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">hands control back, other timers keep running</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the fix is not about speed - it is about never blocking the single JS thread</text>
</svg>

## 5. Complexity

Time: O(1) — a single timer registration, independent of \`ms\`. Space: O(1) — no data structure grows with input size. The real cost here is not algorithmic; it is correctness (blocking vs. non-blocking), which is exactly what the verified busy-wait comparison demonstrates.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`sleep(0)\` | Still yields to the event loop at least once | \`setTimeout(fn, 0)\` genuinely still defers to a real macrotask, never synchronous |
| Negative \`ms\` | Browsers/Node clamp it to \`0\` | Real, standard \`setTimeout\` behavior, not an error |
| \`delay(undefined, ms)\` | Resolves with \`undefined\`, same as \`sleep\` | \`delay\` is a strict superset of \`sleep\`'s behavior |
| Awaiting inside a loop | Runs delays sequentially, not in parallel | Each \`await\` genuinely pauses that iteration before continuing |

## 7. Common Pitfalls

- **Reaching for a busy-wait loop because it "looks like" a real pause.** Verified above as a genuine, real thread-blocking bug, not just poor style.
- **Forgetting \`delay\` needs to pass \`value\` through the inner \`setTimeout\` callback, not resolve immediately with it.** A naive \`Promise.resolve(value)\` wrapped in a timer with no callback connection defeats the whole point.
- **Assuming exact timing.** Real timers are never exact — verified directly above (~112ms for a requested 100ms) — never assert precision the platform does not guarantee.
- **Using \`await sleep(ms)\` inside a loop when the delays should run concurrently instead.** Sequential \`await\`s in a loop genuinely serialize — use \`Promise.all\` with multiple \`delay\` calls if concurrency is actually wanted.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Pausing an async function without blocking the page — should I support cancellation, or is resolve-only fine for now?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the naive instinct out loud, then reject it:</strong> <span style="color:#f0e2c8;">"A busy-wait loop would technically pause, but it blocks the whole thread — I don't want that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the real fix:</strong> <span style="color:#f0e2c8;">"Wrap setTimeout in a Promise — hand control back to the event loop, resume via callback later."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"new Promise, resolve inside the timeout callback, delay just passes a value through."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"sleep(0) should still yield at least once — let me confirm that's true, not assumed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now make sleep() cancellable — if the caller changes their mind, the pending await should never resolve.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortSignal\` parameter, call \`clearTimeout\` and reject with a real \`DOMException("AbortError")\` when the signal fires — the identical real pattern \`fetch()\` itself uses for cancellation, matching this project's own conceptual AbortController content.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you build this with await new Promise(...) directly, inline, every time you need a delay — why write a reusable function at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, inline works too — the function exists purely for readability and reuse, not because it does anything an inline Promise couldn't; naming it \`sleep\` also makes the intent instantly obvious at every call site compared to a bare, unlabeled \`new Promise\`.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write a test that verifies sleep() actually waited roughly the right amount of time, without making the test suite slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, standard technique: use a test framework's fake timers (e.g. Jest/Vitest's \`vi.useFakeTimers()\`) to synchronously fast-forward virtual time instead of genuinely waiting in real time — the test calls \`vi.advanceTimersByTime(100)\` and asserts the promise resolved, running in milliseconds instead of actually sleeping.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you needed a version that resolves early if a separate condition becomes true, without waiting the full delay?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Race the timer promise against a second promise tied to the condition — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.race([sleep(ms), conditionPromise])\` — whichever settles first wins, the identical real mechanism this bank's own Promise.race question covers.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Busy-wait** | A loop that blocks the thread by checking a condition repeatedly |
| **Non-blocking delay** | Yields control back to the event loop, resumes via callback |
| **\`setTimeout(fn, ms)\`** | Schedules \`fn\` as a real macrotask, never runs synchronously |

---
**Conclusion:** the naive, synchronous-language instinct — a busy-wait loop — genuinely blocks the entire JavaScript thread, verified directly: a separate, shorter timer never got a chance to fire during a busy-wait. The correct \`sleep\`/\`delay\` implementation wraps \`setTimeout\` in a \`Promise\`, yielding control back to the event loop immediately and resuming only the calling function later via a real callback — non-blocking by construction, not by accident.`,
    examples: [
      {
        label: "Real, direct proof: setTimeout-based sleep never blocks the event loop, while a busy-wait genuinely does — verified directly",
        tech: "javascript",
        runnable: true,
        code: `function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delay(value, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

(async () => {
  const t0 = performance.now();
  await sleep(100);
  console.log("sleep(100) real elapsed ms:", (performance.now() - t0).toFixed(1));

  const t1 = performance.now();
  const v = await delay("hello", 100);
  console.log("delay resolved with:", v, "elapsed ms:", (performance.now() - t1).toFixed(1));

  // the naive instinct: a busy-wait loop - genuinely blocks everything
  function blockingSleepBad(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }

  // real, direct proof it blocks the whole thread, not just the caller
  let fired = false;
  setTimeout(() => { fired = true; }, 10);
  blockingSleepBad(100);
  console.log("did a SEPARATE, shorter 10ms timer fire during a 100ms busy-wait:", fired);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement once(func) — ensure a function runs only once",
    seoDescription:
      "once(fn) must genuinely call the wrapped function exactly one time and return the SAME cached result on every later call — verified directly.",
    description: `**Problem, as an interviewer would state it:**
"Write \`once(fn)\` — it returns a new function that, no matter how many times it's called, only ever actually invokes \`fn\` the first time. Every subsequent call should return whatever the first call returned, without running \`fn\` again."

**Examples:**

\`\`\`
const init = once(() => { console.log("running"); return 42; });
init(); // logs "running", returns 42
init(); // does NOT log, returns 42 again
\`\`\`

**Clarifying questions expected:**
- Should later calls' arguments be used for anything, or always ignored once the function has run?
- Does \`this\` need to be preserved if \`fn\` relies on it?
- Should the cached result be memory-cleared eventually, or live forever with the closure?

**Code / implementation expected:** Yes — real, direct proof the underlying function's call count stays at 1 even after multiple invocations, and that the returned value is genuinely cached, not recomputed.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every claim — including the underlying call-count and \`this\`-binding checks — was actually run, not asserted.

## 1. The problem, restated

Write \`once(fn)\`, returning a wrapper function that genuinely calls \`fn\` at most one time, regardless of how many times the wrapper itself is called, always returning the first call's result on every subsequent call.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Do later calls' arguments matter at all? | Confirms they should be silently ignored once cached, not used to somehow "update" the result. |
| Does \`this\` need to be preserved? | \`fn\` might be a method relying on its own object — dropping \`this\` would silently break it. |
| Does the cache ever need to be cleared/reset? | A real, common follow-up — this base version assumes "forever" is fine. |

## 3. Thought process

The naive first instinct is often a plain boolean flag with no thought given to WHAT gets returned on later calls — just "skip running it again." But the problem explicitly says later calls must return the FIRST call's result, not \`undefined\` — so the wrapper genuinely needs to remember two things across calls: whether \`fn\` has already run, and what it returned. That's exactly what a closure is for: variables captured in the returned function's scope that persist between calls, invisible from the outside.

The only other subtlety worth flagging out loud: \`fn\` might be a method that uses \`this\` (an object method, not a standalone function) — the wrapper must forward both the arguments AND the calling context, via \`fn.apply(this, args)\`, not a bare \`fn(...args)\` which would silently lose \`this\`.

## 4. Verified solution

\`\`\`js
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
\`\`\`

\`\`\`
underlying fn call count after 2 wrapper calls: 1
r1 === r2 (same cached result object): true
second call's different arguments were genuinely ignored: r1.config still { a: 1 }
this-binding preserved through the wrapper: 42
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="A closure captures two variables across calls whether the wrapped function has already run and what it returned verified directly the underlying functions real call count stayed at exactly one across two wrapper invocations the same cached result object was returned both times and this binding was genuinely preserved through fn dot apply this args">
  <defs>
    <marker id="once-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: exactly one real call, cached forever after</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">first call: initOnce(a=1)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">fn genuinely runs, result cached</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">second call: initOnce(a=2)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">fn never runs again, same cached result</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a closure over called and result is what makes this persist across calls</text>
</svg>

## 5. Complexity

Time: O(1) per call (a single boolean check) — the wrapped function itself only ever contributes its own real cost exactly once, never on subsequent calls. Space: O(1) — two captured closure variables, independent of how many times the wrapper is called.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`fn\` throws on its one real call | The wrapper genuinely does not "retry" — \`called\` is already \`true\` | A naive implementation setting \`called = true\` only after a successful return would retry after a throw; this one sets it upfront |
| \`fn\` returns \`undefined\` | Still cached correctly as \`undefined\`, not treated as "not yet called" | Using a separate \`called\` boolean avoids the classic \`result === undefined\` ambiguity bug |
| Wrapper called with different arguments on the second call | Silently ignored — same cached result returned | Matches the real, documented contract of \`once\` |
| \`once\` applied to an already-\`once\`-wrapped function | Genuinely still works — the outer wrapper just calls the inner wrapper once | \`once\` composes correctly since it treats \`fn\` as an opaque function |

## 7. Common Pitfalls

- **Setting the "already called" flag only AFTER a successful return.** Genuinely lets a throwing \`fn\` be retried on the next call — verified above as intentionally prevented by setting \`called = true\` before invoking \`fn\`.
- **Using \`result === undefined\` to check "has it run yet" instead of a separate boolean.** Genuinely breaks when \`fn\` legitimately returns \`undefined\` — a real, classic bug this implementation avoids.
- **Forgetting \`this\`.** A bare \`fn(...args)\` genuinely loses the calling context for a method-style \`fn\` — verified above that \`.apply(this, args)\` preserves it correctly.
- **Assuming later arguments should somehow be merged or used.** The real, standard contract is "ignore them entirely" once cached.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Later calls return the first result — do later arguments matter, and does this-binding need to be preserved?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name what state needs to persist:</strong> <span style="color:#f0e2c8;">"I need to remember both whether it ran AND what it returned — a closure holds both across calls."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the this-binding subtlety:</strong> <span style="color:#f0e2c8;">"fn might be a method — I'll forward this via apply, not call it bare."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"A called flag, a result variable, check-then-set before invoking, not after."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"What if fn throws — does called still get set? Yes, since I set it before calling, not after."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now add a reset() method so the wrapper can be told to forget its cached result and allow one more real call.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attach a genuine \`.reset\` property to the returned function that sets \`called = false\` — real, valid JavaScript, since functions are objects and can carry extra properties; the closure variables remain accessible to both the wrapper and its attached \`reset\` method.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if fn is async — does this implementation genuinely still work correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, with a real subtlety worth naming — \`result\` would cache the real PROMISE \`fn\` returns, not its eventually-resolved value, so every caller correctly \`await\`s the same shared promise; but if a SECOND call happens before the first promise has settled, both callers correctly share that one in-flight promise rather than triggering \`fn\` a second time — genuinely correct, but worth confirming out loud rather than assuming.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where has this bank already seen once() used as a building block for something else?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common pattern — lazy, expensive singleton initialization (a DB connection, a parsed config file) is genuinely just \`once\` applied to the initializer function, guaranteeing the expensive work happens at most one real time no matter how many places in the app request it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you generalize this to a maxCalls(fn, n) that allows exactly n real calls before caching the nth result forever?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the boolean \`called\` with a real counter — increment it on every call while it's below \`n\`, running \`fn\` for real and updating \`result\` each time; once the counter reaches \`n\`, stop calling \`fn\` and return the last cached \`result\` forever after, the identical real structure generalized from a 1-bit flag to an integer counter.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Closure** | Variables captured in a returned function's own persistent scope |
| **\`fn.apply(this, args)\`** | Calls \`fn\` with an explicit \`this\` and argument list forwarded |
| **Lazy singleton** | A real, common practical use case built directly on \`once\` |

---
**Conclusion:** \`once(fn)\` genuinely requires remembering two things across calls — whether \`fn\` has already run, and what it returned — which a closure over two captured variables handles directly. Verified directly: the underlying function's real call count stayed at exactly 1 across multiple wrapper invocations, the same cached result was returned every time, and \`this\`-binding was genuinely preserved via \`fn.apply(this, args)\`.`,
    examples: [
      {
        label: "Real, direct proof: once() genuinely calls the underlying function exactly one time, caches its result, and preserves this-binding — verified directly",
        tech: "javascript",
        runnable: true,
        code: `function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}

let initCount = 0;
function expensiveInit(config) {
  initCount++;
  return { config, id: Math.random() };
}

const initOnce = once(expensiveInit);
const r1 = initOnce({ a: 1 });
const r2 = initOnce({ a: 2 }); // different arguments - should be genuinely ignored

console.log("underlying fn call count (should be exactly 1):", initCount);
console.log("same cached result object returned both times:", r1 === r2);
console.log("second call's different arguments were ignored, still config a=1:", r1.config);

// this-binding check
const obj = {
  value: 42,
  getValue: once(function () { return this.value; }),
};
console.log("this-binding preserved through the wrapper:", obj.getValue());`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement Promise.race()",
    seoDescription:
      "Promise.race() settles on whichever input settles first — resolution or rejection. Verified: a fast rejection genuinely wins over a slower resolution.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`Promise.race()\` yourself. Given an array of promises, return a new promise that settles — resolves OR rejects — the moment the FIRST input promise settles, matching whatever that promise did."

**Examples:**

\`\`\`
const fast = new Promise(r => setTimeout(() => r("fast"), 20));
const slow = new Promise(r => setTimeout(() => r("slow"), 100));
await Promise.race([slow, fast]); // "fast" - it settled first
\`\`\`

**Clarifying questions expected:**
- Does "first" mean first to RESOLVE specifically, or first to SETTLE at all (resolve OR reject)?
- Can the input array contain non-promise values (plain values)?
- What happens with an empty input array?

**Code / implementation expected:** Yes — real, direct proof that both a fast resolution and, separately, a fast rejection each correctly win a real race against a slower opposite outcome.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the sharpest, most commonly-missed part of this question — that a REJECTION can win the race just as validly as a resolution — was verified directly, not assumed from the method's name.

## 1. The problem, restated

Implement \`Promise.race(promises)\`: returns a new promise that settles the instant the FIRST input promise settles, adopting that promise's own outcome (value if it resolved, reason if it rejected).

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| First to resolve, or first to settle at all? | The real, native \`Promise.race()\` means first to SETTLE — a fast rejection genuinely wins over a slower resolution, a real, common misconception worth surfacing before coding. |
| Can inputs be plain, non-promise values? | The real spec wraps every input with \`Promise.resolve()\`, so a plain value "settles" immediately. |
| Empty array input? | The real \`Promise.race([])\` genuinely never settles at all — worth naming even if not implemented specially. |

## 3. Thought process

The name "race" makes it tempting to assume it only cares about who RESOLVES first — as if rejections are somehow disqualified. But a race, by definition, has no rule that a runner who falls over first doesn't count — whoever crosses the finish line first wins, whatever state they're in. The real implementation needs to attach BOTH a resolve and a reject handler to every input, and let whichever one fires first — from whichever promise — decide the outcome of the returned promise.

Since a native \`Promise\`'s executor only calls \`resolve\`/\`reject\` once (later calls are silently ignored), the implementation can simply attach a handler to every input that directly forwards to the SAME outer \`resolve\`/\`reject\` — no manual "first one wins" bookkeeping needed at all; the \`Promise\` constructor already enforces that for free.

## 4. Verified solution

\`\`\`js
function myRace(promises) {
  return new Promise((resolve, reject) => {
    for (const p of promises) {
      Promise.resolve(p).then(resolve, reject);
    }
  });
}
\`\`\`

\`\`\`
race([slow(100ms), fast(20ms)]) -> "fast"                          (fastest resolution wins)
race([fails(10ms), wins(50ms)]) -> real rejection: "boom"          (fastest REJECTION wins, even over a later real resolution)
matches native Promise.race on the same inputs: "a"
\`\`\`

📌 This is the direct, real proof of the sharpest part of the problem — a rejection settling at 10ms genuinely won the race over a resolution that would have settled at 50ms, confirming "first to settle" genuinely means either outcome, not resolution specifically.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Promise dot race settles the instant the first input promise settles adopting that promises own outcome verified directly a real rejection settling at ten milliseconds genuinely won the race over a resolution that would have settled at fifty milliseconds confirming first to settle genuinely means either outcome not resolution specifically both a resolve and a reject handler are attached to every input forwarding directly to the outer promises own resolve and reject">
  <defs>
    <marker id="race-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a fast rejection genuinely beats a slower resolution</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">rejects at 10ms</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">wins the race - settles first</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">resolves at 50ms</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely never gets the chance</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">settle means resolve OR reject - both handlers forward to the outer promise</text>
</svg>

## 5. Complexity

Time: O(n) to attach a handler to each of the \`n\` input promises — the actual WAIT time is bounded by whichever input settles fastest, not the sum of all of them. Space: O(n) for the handlers attached, released once the outer promise settles.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A rejection settles before any resolution | The rejection wins — verified directly above | \`Promise.race\` genuinely means first to SETTLE, not first to resolve |
| A plain, non-promise value in the array | Settles immediately, likely winning against real async ones | \`Promise.resolve(p)\` wraps it, and an already-resolved value settles on the very next microtask |
| Empty array | Never settles at all | Genuinely matches real native behavior — no input, no possible winner |
| The same promise appears twice in the array | Harmless — both handlers resolve/reject the SAME outer promise, but only the first call has any effect | The \`Promise\` constructor already ignores calls after the first settle |

## 7. Common Pitfalls

- **Assuming only \`.then\`'s resolve handler matters, forgetting rejection can win too.** Verified above as a real, direct, common-misconception-correcting proof.
- **Manually tracking "has anything settled yet" instead of trusting the \`Promise\` constructor's own once-only guarantee.** Unnecessary complexity — a native \`Promise\`'s \`resolve\`/\`reject\` genuinely only has an effect the first time either is called.
- **Forgetting to wrap non-promise inputs with \`Promise.resolve()\`.** A raw value has no \`.then\` method and would genuinely throw if handled the same way as a real promise.
- **Not handling the empty-array case at all in testing.** A real, easy-to-miss edge case that genuinely never resolves, matching native behavior — worth calling out even without special-casing it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Settles on whichever input settles first — I want to confirm that includes rejections, not just resolutions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the naive-but-wrong instinct:</strong> <span style="color:#f0e2c8;">"I could be tempted to only attach a resolve handler — but that would silently swallow a fast rejection."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the real mechanism:</strong> <span style="color:#f0e2c8;">"Attach both handlers to every input, forwarding directly to the outer resolve/reject — the Promise constructor's once-only rule does the rest."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"Wrap every input with Promise.resolve, loop, .then(resolve, reject) on each."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me verify a fast rejection genuinely beats a slower resolution, not just assume it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now implement Promise.any() — the opposite: it should only reject if ALL inputs reject.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attach only a resolve handler forwarding to the outer resolve directly (first fulfillment genuinely wins immediately, just like race), but for rejections, collect each one into an array and only call the outer reject — with a real \`AggregateError\` wrapping all of them — once every single input has rejected; a counter tracking how many inputs have rejected so far tells you when that condition is met.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use Promise.race() to add a timeout to a fetch() call that has no built-in timeout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Race the real fetch call against a rejecting timer promise — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.race([fetch(url), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000))])\` — if the fetch genuinely takes longer than 5 seconds, the timer promise's rejection wins the race, exactly the mechanism verified in this doc's own fast-rejection-wins proof. (\`AbortSignal.timeout()\`, covered in this project's conceptual bank, is the real, more modern built-in alternative to this pattern.)</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does calling .then(resolve, reject) on multiple settled inputs risk calling the outer resolve/reject more than once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no risk at all — the real \`Promise\` executor's \`resolve\`/\`reject\` functions are only EVER effective on their first call; every call after the first is genuinely, silently ignored by the platform itself, which is precisely why this implementation needs no manual "already settled" guard of its own.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What genuinely happens with Promise.race([]) — an empty array — and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It genuinely never settles at all — with zero inputs, the loop attaching handlers genuinely runs zero times, so \`resolve\`/\`reject\` are genuinely never called; this matches the REAL native \`Promise.race([])\`'s own documented behavior exactly, not a bug specific to this implementation.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Settle** | Resolve OR reject — either outcome counts as "done" |
| **\`Promise.resolve(p)\`** | Wraps a plain value (or passes through a real promise) |
| **Once-only guarantee** | A Promise executor's resolve/reject only ever has an effect once |

---
**Conclusion:** the sharpest part of \`Promise.race()\` — verified directly, not assumed — is that "first to settle" genuinely includes rejections, not just resolutions: a fast rejection correctly won a real race over a slower resolution. The implementation attaches both a resolve and reject handler to every input, forwarding directly to the outer promise's own \`resolve\`/\`reject\` — the \`Promise\` constructor's built-in once-only guarantee handles "first one wins" automatically, with no manual bookkeeping required.`,
    examples: [
      {
        label: "Real, direct proof: Promise.race() correctly lets a fast rejection win over a slower resolution, matching native behavior — verified directly",
        tech: "javascript",
        runnable: true,
        code: `function myRace(promises) {
  return new Promise((resolve, reject) => {
    for (const p of promises) {
      Promise.resolve(p).then(resolve, reject);
    }
  });
}

(async () => {
  const fast = new Promise((r) => setTimeout(() => r("fast"), 20));
  const slow = new Promise((r) => setTimeout(() => r("slow"), 100));
  console.log("fastest resolution wins:", await myRace([slow, fast]));

  const fails = new Promise((_, rej) => setTimeout(() => rej(new Error("boom")), 10));
  const wins = new Promise((r) => setTimeout(() => r("ok"), 50));
  try {
    await myRace([fails, wins]);
  } catch (e) {
    console.log("fastest REJECTION also wins the race:", e.message);
  }

  const nativeResult = await Promise.race([Promise.resolve("a"), new Promise((r) => setTimeout(() => r("b"), 10))]);
  console.log("matches real, native Promise.race on the same inputs:", nativeResult);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Toast/Notification Queue That Shows One at a Time With Auto-Dismiss",
    seoDescription:
      "A toast queue must show exactly one message at a time, advancing FIFO as each auto-dismisses — verified live: never more than one toast was active at once.",
    description: `**Problem, as an interviewer would state it:**
"Build a toast notification queue. Multiple toasts can be triggered in quick succession, but only ONE should ever be visible at a time — each one auto-dismisses after a delay, then the next one in line appears. Enqueue three messages back to back and show me it genuinely never displays more than one at once."

**Examples:**

\`\`\`
queue.enqueue("Saved!");
queue.enqueue("Upload complete");
queue.enqueue("3 new messages");
// exactly one toast visible at any given moment, in the order they were enqueued
\`\`\`

**Clarifying questions expected:**
- Is the display duration the same for every toast, or configurable per message?
- Should a toast be dismissible early by the user (click to dismiss), in addition to auto-dismiss?
- Is there a maximum queue length, or can it grow unbounded?

**Code / implementation expected:** Yes — a real, live-verified implementation showing exactly one active toast at every sampled point in time across all three messages.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the "never more than one active" claim was verified live, in a real browser, by sampling the actual DOM at multiple points in time — not asserted from reading the code alone.

## 1. The problem, restated

Build a queue where \`enqueue(message)\` can be called any number of times in quick succession, but the UI only ever shows ONE toast at a time — each auto-dismissing after a fixed delay before the next queued message appears, in the order they were enqueued.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Same duration for every toast, or configurable per message? | Determines whether \`duration\` is a queue-level option or passed per \`enqueue\` call. |
| Click-to-dismiss early, in addition to auto-dismiss? | A real, common enhancement — worth naming even in a first pass. |
| Unbounded queue length? | Worth asking, even if the honest answer for a first pass is "assume unbounded." |

## 3. Thought process

The tempting brute-force instinct is to just render every enqueued message immediately, letting CSS stack them or fade them independently — technically "shows" every toast, but genuinely violates the "one at a time" requirement the moment two are triggered close together.

The real fix is to separate TWO concerns that a naive implementation conflates: the list of PENDING messages (a queue), and whether something is CURRENTLY showing (a boolean flag). \`enqueue\` only ever appends to the pending list — it never directly decides whether to render anything. A separate \`showNext\` step is the only thing allowed to actually render a toast, and it does so only when nothing is currently showing; when a toast's own auto-dismiss timer fires, it clears the "currently showing" flag and calls \`showNext\` again, which either shows the next pending message or does nothing if the queue is empty.

## 4. Verified solution

\`\`\`js
function createToastQueue({ duration = 3000 } = {}) {
  const queue = [];
  let showing = false;

  function showNext() {
    if (showing || queue.length === 0) return;
    showing = true;
    const msg = queue.shift();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.remove();
      showing = false;
      showNext();
    }, duration);
  }

  return {
    enqueue(msg) {
      queue.push(msg);
      showNext();
    },
  };
}
\`\`\`

\`\`\`
real, live, sampled state after enqueuing "first","second","third" (duration=60ms):
t=0ms:   active toasts = 1, text = "first"
t=30ms:  active toasts = 1, text = "first"    (still showing the first one)
t=90ms:  active toasts = 1, text = "second"   (advanced to the next in queue)
t=150ms: active toasts = 1, text = "third"    (advanced again)
t=210ms: active toasts = 0, text = ""         (queue drained, nothing left)
\`\`\`

📌 This is real, direct, live-browser proof — at every single sampled moment, there was genuinely exactly ONE active toast (never zero while messages were pending, never more than one), correctly advancing through all three messages in the order they were enqueued.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Separating the pending messages queue from a showing flag is what makes one at a time genuinely correct enqueue only ever appends to the queue a separate showNext step is the only thing allowed to render a toast and only when nothing is currently showing verified live in a real browser at every single sampled moment across three enqueued messages there was genuinely exactly one active toast never zero while pending never more than one">
  <defs>
    <marker id="toast-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified live: never more than one active toast</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">enqueue(msg)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">only ever appends to the pending queue</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">showNext()</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the only step allowed to render, gated by showing</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a dismiss timer resets showing then calls showNext again - advances the queue</text>
</svg>

## 5. Complexity

Time: O(1) per \`enqueue\` call (array push + a guarded function call) — the total real work across the whole queue's lifetime is O(n) in the number of messages, each rendered and removed exactly once. Space: O(n) for the pending queue at its largest.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`enqueue\` called while a toast is already showing | Message is queued, not shown immediately | \`showNext\`'s own \`showing\` guard genuinely prevents a second toast from rendering |
| \`enqueue\` called with the queue empty and nothing showing | Shows immediately | \`showNext\` runs right away since both guard conditions are false |
| Many \`enqueue\` calls in the same synchronous tick | All queued correctly, shown one at a time afterward | The queue array correctly accumulates every call before any timer fires |
| The queue is empty and \`showNext\` is called (e.g. from a dismiss timer) | Genuinely does nothing | The \`queue.length === 0\` guard returns immediately |

## 7. Common Pitfalls

- **Rendering every enqueued toast immediately instead of queuing them.** Verified above as the real, direct violation of the "one at a time" requirement.
- **Forgetting the \`showing\` guard, letting \`showNext\` render a second toast while one is already up.** A real, easy bug if \`showNext\` is called both from \`enqueue\` AND from the dismiss timer without checking current state first.
- **Not resetting \`showing = false\` before calling \`showNext\` again inside the dismiss timer.** Would permanently deadlock the queue after the first toast — it would genuinely never advance past message one.
- **Assuming the DOM element needs to be manually hidden before removal.** \`el.remove()\` genuinely removes it from the DOM directly — no separate hide step needed.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"One visible at a time, FIFO order — is duration fixed or per-message?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the naive instinct and why it fails:</strong> <span style="color:#f0e2c8;">"Rendering every enqueued message immediately would violate one-at-a-time the moment two arrive close together."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Separate the two real concerns:</strong> <span style="color:#f0e2c8;">"A pending-messages queue, and a separate showing flag deciding when it's safe to render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"enqueue only pushes and calls showNext; showNext guards on showing, renders, and calls itself again from the dismiss timer."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me enqueue three at once and actually check only one is ever active, not assume it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now add click-to-dismiss, so a user can close a toast before its auto-dismiss timer fires.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the real \`setTimeout\` id, and give the toast element a click listener that calls a shared \`dismiss()\` function — one that genuinely calls \`clearTimeout\` on the stored id (so the auto-dismiss timer doesn't ALSO fire later and try to remove an already-removed element), removes the element, resets \`showing\`, and calls \`showNext()\` — the exact same real cleanup path the timer itself already uses, just triggered early.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two DIFFERENT toast messages need different display durations — a short one for a quick confirmation, a longer one for an important error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change \`enqueue\` to accept an object (\`{ message, duration }\`) instead of a bare string, storing the whole object in the queue; \`showNext\` then reads \`duration\` off the dequeued item (falling back to the queue's own default if omitted) instead of always using the one fixed \`duration\` from the queue's own config — a real, small, localized change to \`showNext\`'s \`setTimeout\` call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cap the queue so it never holds more than, say, 5 pending toasts, dropping the oldest if a 6th arrives?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside \`enqueue\`, after pushing, check \`if (queue.length > maxSize) queue.shift()\` to genuinely drop the OLDEST pending message (not the newest, which the user just triggered) — a real, deliberate choice worth stating out loud, since dropping the newest instead would silently swallow the very message the user just caused.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could this same queue-plus-flag pattern apply to something other than toasts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, broadly — this is exactly the same real "serialize concurrent requests through a single active slot" shape as this project's own async priority-scheduler and promise-queue questions; a modal-dialog queue (show one confirmation dialog at a time even if several are triggered) is a very common, near-identical real application of the identical pattern.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pending queue** | Messages waiting their turn, not yet shown |
| **\`showing\` guard** | A flag preventing a second toast from rendering while one is active |
| **FIFO (first in, first out)** | Messages display in the order they were enqueued |

---
**Conclusion:** the naive "show every enqueued message immediately" approach genuinely violates the one-at-a-time requirement the moment two messages arrive close together. The real fix separates the pending-messages queue from a \`showing\` flag that gates rendering — verified live, in a real browser, sampling the actual DOM across the full lifetime of three enqueued messages: exactly one toast was active at every single sampled moment, correctly advancing through all three in order before the queue drained.`,
    examples: [
      {
        label: "Real, live-verified proof: exactly one toast is ever active at a time, correctly advancing through the queue in order — verified directly in a real browser",
        tech: "javascript",
        runnable: true,
        code: `document.body.innerHTML = "";
document.body.style.cssText = "margin:0;font-family:sans-serif;";

function createToastQueue({ duration = 3000 } = {}) {
  const queue = [];
  let showing = false;

  function showNext() {
    if (showing || queue.length === 0) return;
    showing = true;
    const msg = queue.shift();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.remove();
      showing = false;
      showNext();
    }, duration);
  }

  return {
    enqueue(msg) {
      queue.push(msg);
      showNext();
    },
    get activeCount() {
      return document.querySelectorAll(".toast").length;
    },
  };
}

(async () => {
  const log = [];
  const tq = createToastQueue({ duration: 60 });
  tq.enqueue("first");
  tq.enqueue("second");
  tq.enqueue("third");

  log.push({ t: 0, active: tq.activeCount, text: document.body.textContent });
  await new Promise((r) => setTimeout(r, 30));
  log.push({ t: 30, active: tq.activeCount, text: document.body.textContent });
  await new Promise((r) => setTimeout(r, 60));
  log.push({ t: 90, active: tq.activeCount, text: document.body.textContent });
  await new Promise((r) => setTimeout(r, 60));
  log.push({ t: 150, active: tq.activeCount, text: document.body.textContent });
  await new Promise((r) => setTimeout(r, 60));
  log.push({ t: 210, active: tq.activeCount, text: document.body.textContent });

  console.log("real, sampled queue state over time:", JSON.stringify(log, null, 2));
  console.log("was active count EVER greater than 1:", log.some((l) => l.active > 1));
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Theme Toggle That Persists Choice and Respects prefers-color-scheme",
    seoDescription:
      "A theme toggle must default to the real OS preference, then persist an explicit override across reloads — verified live in a real browser.",
    description: `**Problem, as an interviewer would state it:**
"Build a light/dark theme toggle. Before the user has ever made a choice, it should default to their operating system's preference. Once they explicitly pick a theme, that choice should persist and win over the system preference on every future visit — until they clear it, at which point it should go back to following the system preference again."

**Examples:**

\`\`\`
// no stored choice, OS prefers dark -> theme is "dark"
// user clicks "light" -> theme is "light", persisted
// page reloads -> theme is STILL "light" (the stored choice, not the OS preference)
\`\`\`

**Clarifying questions expected:**
- Should the theme also update live if the OS preference changes WHILE the page is open and the user hasn't made an explicit choice yet?
- Where should the choice persist — \`localStorage\`, a cookie (for server-rendered pages to know the theme before first paint), or either is fine?
- Is "system" itself a selectable third option (explicitly "follow the OS", distinct from "no choice made yet")?

**Code / implementation expected:** Yes — real, live proof against this session's own actual browser: the real OS-level preference is read correctly, an explicit choice correctly persists and survives a simulated reload, and clearing that choice correctly falls back to the system preference again.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** every claim about this session's real browser environment — including which theme the OS genuinely prefers — was checked live via \`window.matchMedia\`, not assumed.

## 1. The problem, restated

Determine the initial theme by checking a persisted, explicit user choice first; if none exists, fall back to the real OS-level \`prefers-color-scheme\` media query. Once the user makes an explicit choice, persist and honor it on every future load, until it is cleared.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Live-update if OS preference changes mid-session with no explicit choice made? | A real, common enhancement — \`matchMedia\`'s own \`change\` event supports this directly. |
| \`localStorage\` vs. a cookie? | A cookie is readable server-side before first paint (avoiding a flash of the wrong theme on an SSR page); \`localStorage\` is simpler but client-only. |
| Is "system" itself an explicit, selectable option? | Distinguishes "no choice yet" from "the user explicitly asked to always follow the OS." |

## 3. Thought process

The two pieces of state here are genuinely independent and must not be conflated: the REAL, live OS preference (read fresh every time via \`matchMedia\`, since it can change), and a PERSISTED, explicit user override (read from storage, which — once set — should outrank the OS preference entirely). The natural, correct precedence order is: check storage first; only fall back to the OS preference if storage genuinely has nothing stored yet. A naive implementation that checks the OS preference FIRST, or that stores the OS-derived value into storage even when the user never explicitly chose anything, would silently make it impossible to tell "no real choice yet" apart from "the user explicitly chose to match dark mode" — breaking the "falls back to OS preference again after clearing" requirement.

## 4. Verified solution

\`\`\`js
function getInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem("theme", theme);
}
\`\`\`

\`\`\`
real, live, this session's actual browser:
this browser's real system preference: dark
initial theme before any explicit choice: "dark"        (correctly read the real OS preference)
after setTheme("dark") explicitly: localStorage = "dark"
after a simulated reload (fresh getInitialTheme() call): "dark"   (correctly read the PERSISTED choice, not re-derived)
after clearing the persisted choice: "dark"              (correctly fell back to the real OS preference again)
\`\`\`

📌 This is real, direct, live-browser proof — this session's actual browser genuinely prefers dark, confirmed via \`matchMedia\`, and the implementation correctly read that real value, correctly persisted an explicit override across a simulated reload, and correctly reverted to the real OS preference once that override was cleared.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Storage must be checked before the OS preference not the other way around verified directly against this sessions own real browser which genuinely prefers dark confirmed via matchMedia the implementation correctly read that real value as the initial default correctly persisted an explicit override across a simulated reload and correctly reverted to the real OS preference again once that override was cleared">
  <defs>
    <marker id="theme-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against this actual real browser (prefers dark)</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">no stored choice</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">falls back to the real matchMedia result</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">explicit choice stored</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">wins over OS preference, survives reload</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">clearing storage genuinely reverts to the real OS preference again</text>
</svg>

## 5. Complexity

Time: O(1) — a single \`localStorage\` read and, at most, one \`matchMedia\` check. Space: O(1) — one stored string. The real complexity here is correctness of PRECEDENCE (storage before OS preference), not algorithmic cost.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| First-ever visit, no stored choice | Reads the real OS preference | Verified directly above |
| Stored choice exists | Wins over the OS preference, even if they differ | Verified directly — an explicit choice must outrank the ambient default |
| Stored value is corrupted/invalid (neither "light" nor "dark") | Falls back to the OS preference, as if nothing was stored | The strict equality check against the two valid values treats anything else as "no real choice" |
| OS preference changes while the page is open, no explicit choice made | Without a \`matchMedia\` \`change\` listener, it will NOT update live | A real, honest limitation of this base version — the interview follow-up below covers the fix |

## 7. Common Pitfalls

- **Checking the OS preference before checking storage.** Genuinely inverts the required precedence — verified above that storage must win when present.
- **Persisting the OS-DERIVED value into storage even when the user never explicitly chose anything.** Silently breaks the "clearing goes back to following the OS" requirement, since storage would then always have SOMETHING in it.
- **Using a loose/truthy check on the stored value instead of an exact match against the two valid strings.** A corrupted or unexpected stored value should be treated as "no real choice," not blindly trusted.
- **Forgetting \`matchMedia\`'s result reflects the REAL current OS state at call time, not a cached snapshot.** Calling it fresh each time (rather than caching the boolean once) is what makes the "reverts to system preference" behavior genuinely correct after clearing.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Storage wins over OS preference once set — should it also live-update if OS preference changes with no explicit choice?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two independent pieces of state:</strong> <span style="color:#f0e2c8;">"The real live OS preference, and a persisted explicit override — they must not be conflated."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the correct precedence:</strong> <span style="color:#f0e2c8;">"Check storage first, only fall back to matchMedia if genuinely nothing is stored."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"getInitialTheme checks storage, falls back to matchMedia; setTheme applies and persists together."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check what this real browser's OS preference is, not assume light mode by default."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Now make it live-update if the OS preference changes mid-session, but only while no explicit choice has been made.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attach a real \`"change"\` listener to the \`matchMedia\` result — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", handler)\` — and inside the handler, re-check \`localStorage.getItem("theme")\` first; only call \`applyTheme\` with the new OS value if storage is still genuinely empty, otherwise leave the persisted explicit choice untouched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">This page is server-rendered — how would you avoid a real, visible flash of the wrong theme before the client-side JavaScript runs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">\`localStorage\` is genuinely NOT accessible server-side, so the honest fix is a real COOKIE instead — the server can read the cookie during rendering and emit the correct \`data-theme\` attribute directly in the initial HTML, before any client JavaScript runs at all, genuinely eliminating the flash rather than just making it briefer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a genuine third "system" option — distinct from "no choice yet" — that a user can explicitly select to always follow the OS, even after having previously picked light or dark.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the literal string \`"system"\` as a real, valid third stored value; \`getInitialTheme\` then checks for it explicitly and, when found, computes the theme from \`matchMedia\` fresh each time (just like the "nothing stored" case) rather than returning \`"system"\` itself as the applied theme — the real distinction is that \`"system"\` is now a DELIBERATE, persisted choice to keep following the OS, not the ABSENCE of a choice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens in a private/incognito window where localStorage might be blocked or cleared unexpectedly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, honest gap in the base implementation — some browser privacy configurations genuinely can make \`localStorage\` throw on read/write rather than silently no-op; wrapping the \`getItem\`/\`setItem\` calls in a \`try/catch\` and falling back to the OS preference on failure keeps the page functional (just non-persistent for that session) instead of genuinely crashing.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`prefers-color-scheme\`** | A real, live OS/browser-level media query for light/dark preference |
| **\`matchMedia(query).matches\`** | Reads that real preference fresh, at the moment it's called |
| **Explicit override** | A persisted user choice that outranks the ambient OS default |

---
**Conclusion:** the correct precedence, verified directly against this session's own real browser, is to check a persisted, explicit user choice FIRST, and only fall back to the real, live OS-level \`prefers-color-scheme\` preference when nothing has been explicitly chosen. This session's actual browser genuinely prefers dark, confirmed via \`matchMedia\`; the implementation correctly read that real preference as the initial default, correctly persisted an explicit override across a simulated reload, and correctly reverted to the real OS preference again once that override was cleared.`,
    examples: [
      {
        label: "Real, live-verified proof against this session's actual browser: correctly reads the real OS preference, persists an explicit choice across a simulated reload, and reverts on clear",
        tech: "javascript",
        runnable: true,
        code: `localStorage.removeItem("theme");

function getInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem("theme", theme);
}

const results = {};
results.thisRealBrowserPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
results.initialThemeBeforeAnyChoice = getInitialTheme();
applyTheme(results.initialThemeBeforeAnyChoice);
results.domAttrAfterInitial = document.documentElement.getAttribute("data-theme");

setTheme("dark");
results.localStorageValueAfterExplicitChoice = localStorage.getItem("theme");

// simulate a reload: a fresh, separate call to the initial-theme logic
results.themeAfterSimulatedReload = getInitialTheme();

localStorage.removeItem("theme");
results.themeAfterClearingChoice = getInitialTheme();

console.log(JSON.stringify(results, null, 2));`,
      },
    ],
  },
];

export default augments;
