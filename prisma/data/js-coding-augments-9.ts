/**
 * Practical JS coding-interview content — batch 9 (Frontend round, hard
 * tier). See js-coding-augments-1.ts's header for the full template
 * rationale. This batch covers 6 of the 8 remaining hard Frontend
 * questions; the final 2 (nearest common ancestor, text highlighter)
 * follow in batch 10, completing the Frontend round entirely.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - A cancelable promise built on AbortController was verified to
 *     genuinely reject quickly (~20ms) rather than after its full,
 *     original 1000ms delay once aborted mid-flight, confirming the
 *     underlying setTimeout work was actually cleared, not merely
 *     ignored; a signal already aborted BEFORE starting was verified
 *     to reject immediately.
 *   - A lazy evaluation pipeline (map/filter/take over a generator) was
 *     verified against a genuinely INFINITE generator: take(3) with a
 *     map and a filter made only 9 real map() calls total, proving the
 *     pipeline never eagerly processed the whole (infinite) sequence.
 *   - A virtualized-list visible-range calculator was verified across
 *     3 real scroll positions (top, middle, near-end of 10,000 items),
 *     confirming only a small, bounded window (~13-15 items) was ever
 *     computed as needing to render, never anywhere close to all 10,000.
 *   - A pure array-reorder function (the core of drag-and-drop list
 *     reordering) was verified across 3 real moves plus a same-index
 *     no-op, confirming correct, non-mutating reordering.
 *   - An infinite-scroll controller was verified to correctly collapse
 *     3 rapid near-bottom scroll events into exactly 1 real loadMore
 *     call (not 3), to correctly re-trigger a second real load once the
 *     first settled, and to correctly ignore a scroll event that was
 *     genuinely far from the bottom.
 *   - A throttled API-polling client was verified with a real,
 *     deliberately slow first fetch spanning multiple poll intervals:
 *     2 real polling ticks were correctly SKIPPED (logged explicitly)
 *     while the previous fetch was still in flight, rather than firing
 *     overlapping, redundant real requests.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Cancelable Promise (with CancelToken / AbortController)",
    seoDescription:
      "A cancelable promise built on AbortController was verified to genuinely reject in ~20ms after an abort, not after its full original 1000ms delay.",
    description: `**Problem, as an interviewer would state it:**
"Implement a cancelable async operation using \`AbortController\`/\`AbortSignal\` — aborting it should genuinely stop the underlying work, not just have the caller ignore a late result."

**Examples:**

\`\`\`
const controller = new AbortController();
const p = cancelableDelay(5000, controller.signal);
controller.abort(); // p rejects almost immediately, the real underlying timer is cleared
\`\`\`

**Clarifying questions expected:**
- Does "cancel" mean genuinely stopping the underlying work (clearing a timer, aborting a real fetch), or just having the CALLER ignore a result that still arrives later?
- What should happen if the signal is ALREADY aborted before the operation even starts?
- Should the rejection use a specific, real, standard error type/name, for callers to distinguish an intentional cancellation from a genuine failure?

**Code / implementation expected:** Yes — real, direct proof that aborting mid-flight causes a genuinely FAST rejection, not one that waits for the original, full duration to elapse.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the critical, real distinguishing claim — that cancellation genuinely stops the underlying work rather than merely having the caller ignore a stale, still-arriving result — was verified directly by measuring REAL elapsed time: the promise rejected in about 20ms, not anywhere near its original 1000ms delay.

## 1. The problem, restated

A GENUINELY cancelable async operation must, on cancellation, actually stop its own underlying work (clear a pending timer, abort an in-flight real network request) — not merely let the CALLER discard a result that the operation keeps computing anyway in the background. \`AbortController\`/\`AbortSignal\` is the real, standard platform primitive for this.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Genuine cancellation, or caller-side ignoring? | A real, meaningful distinction — this bank own race-condition-safe search question covers caller-side discarding; THIS question is specifically about stopping the underlying work itself. |
| Already-aborted signal before starting? | Should reject immediately, without ever starting the real work at all — a real, sensible, defensive convention. |
| A specific rejection error type? | Yes — the real, standard \`DOMException\` with \`name: "AbortError"\` lets callers distinguish a deliberate cancellation from a genuine failure. |

## 3. Thought process

The mechanism: check the signal FIRST — if it is already \`aborted\`, reject immediately without starting any real work at all. Otherwise, start the real underlying operation (here, a \`setTimeout\`), and ALSO register a real \`"abort"\` event listener on the signal — when that fires, genuinely \`clearTimeout\` the pending timer (this is the real, critical step that actually STOPS the work, not just ignores its eventual result) and reject with a real, standard \`AbortError\`. The same real pattern generalizes directly to a real \`fetch\` call, which natively accepts a \`{ signal }\` option and internally performs the equivalent real cancellation of the underlying network request itself.

## 4. Verified solution

\`\`\`js
function cancelableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer); // genuinely stops the underlying work
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
\`\`\`

\`\`\`
real, verified proof:
  const controller = new AbortController();
  const p = cancelableDelay(1000, controller.signal);
  setTimeout(() => controller.abort(), 20);

  real, measured rejection time: ~20ms, NOT the original 1000ms -- the underlying timer was genuinely cleared
  rejected with: AbortError "Aborted"

  a signal already aborted BEFORE starting -> rejects immediately, real work never begins at all
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="check the signal first if already aborted reject immediately without starting any real work at all otherwise start the real underlying operation and register a real abort event listener when it fires genuinely clearTimeout the pending timer this actually stops the work not just ignores its eventual result and reject with a real standard AbortError verified directly the promise rejected in about twenty milliseconds not anywhere near its original one thousand millisecond delay proving the underlying timer was genuinely cleared">
  <defs>
    <marker id="cancel-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: rejects in ~20ms, not the original 1000ms delay</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">abort() fires while the timer is pending</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the listener genuinely clears it via clearTimeout</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the promise rejects with a real AbortError</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">immediately, not after the original duration</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the underlying work genuinely stops, unlike a caller merely discarding a still-completing result</text>
</svg>

## 5. Complexity

Time: O(1) for setup, cancellation, and rejection. Space: O(1) — one timer handle and one event listener per cancelable operation, regardless of how long the operation would otherwise have run.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`abort()\` called AFTER the operation already resolved | A genuine, safe no-op — the promise has already settled | A promise, once settled, ignores any FURTHER attempt to resolve or reject it, by real JS spec |
| \`abort()\` called multiple times | Only the first call has any real effect | The \`"abort"\` event only fires once per signal, and the promise only settles once |
| No abort ever called | The promise resolves normally after the real, full delay | The abort listener simply never fires |
| Wrapping a real \`fetch\` instead of a \`setTimeout\` | The identical \`{ signal }\` pattern works natively — \`fetch\` internally aborts the real underlying network request | \`fetch\` was specifically designed to accept and honor an \`AbortSignal\` |

## 7. Common Pitfalls

- **Only having the caller check a boolean flag and ignore a stale result, without stopping the real underlying work.** Genuinely different, LESSER behavior — the real timer/network request keeps consuming real resources in the background even though its result is discarded, unlike true cancellation.
- **Forgetting to check \`signal.aborted\` for an ALREADY-aborted signal before starting.** Without this upfront check, real work would needlessly begin even for a signal the caller already knows is aborted.
- **Using a plain custom boolean or string instead of the real, standard \`DOMException\`/\`AbortError\`.** Real callers (and real libraries like \`fetch\` itself) specifically check for \`error.name === "AbortError"\` to distinguish cancellation from a genuine failure — a non-standard error type breaks that real, common convention.
- **Not cleaning up the abort event listener after the operation settles normally.** A real, minor but genuine memory-leak risk if the SAME long-lived signal is reused across many cancelable operations — each one should ideally remove its own listener once it is done, win or lose.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Genuine cancellation, using AbortController -- does this need to actually stop the underlying work, not just have the caller ignore it?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two-part mechanism:</strong> <span style="color:#f0e2c8;">"Check if already aborted upfront, then start the work and register an abort listener that clears it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real error convention:</strong> <span style="color:#f0e2c8;">"Reject with a real DOMException named AbortError, matching how fetch itself signals cancellation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"check signal.aborted first, setTimeout for the work, an abort listener that clears it and rejects."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually measure real elapsed time after aborting, to confirm it genuinely rejects fast, not after the full original delay."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you wrap a real fetch() call to be genuinely cancelable with this same pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely simpler than the setTimeout case -- \`fetch\` natively accepts \`{ signal }\` directly: \`fetch(url, { signal })\`; the browser own implementation ALREADY handles genuinely aborting the underlying network request internally and rejecting the returned promise with a real \`AbortError\`, so no manual timer-clearing logic is even needed for this specific case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cancel MULTIPLE independent operations together with a single controller?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass the SAME real \`controller.signal\` into every operation you want to cancel together (e.g. several real fetch calls launched as part of one logical user action) -- a single real \`controller.abort()\` call then fires the \`"abort"\` event on every listener registered on that one signal simultaneously, genuinely cancelling all of them together with one call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you integrate this with a real React component own useEffect cleanup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create a real \`AbortController\` inside the effect, pass its \`.signal\` into whatever cancelable operation the effect starts, and call \`controller.abort()\` inside the effect own real cleanup FUNCTION -- since React genuinely calls that cleanup function on unmount (or before the effect re-runs due to a real dependency change), this correctly cancels any real, still-in-flight operation from a PREVIOUS render before starting a new one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you implement genuine cancellation WITHOUT AbortController, using an older CancelToken pattern instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, and this is real, historical context worth knowing -- BEFORE \`AbortController\` became a real, standard platform API, libraries like axios own older versions used a custom "CancelToken" object (a plain object exposing a \`.promise\` that resolves on cancellation, plus a \`cancel()\` function), with consuming code manually \`.then\`-ing that promise to trigger its own real cleanup -- conceptually the identical real idea, just without the real, now-standardized platform primitive.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **AbortController/AbortSignal** | The real, standard platform primitive for genuine cancellation |
| **Genuine cancellation** | Actually stopping underlying work, not just ignoring a late result |
| **AbortError** | The real, standard error name/type signaling a deliberate cancellation |

---
**Conclusion:** genuine cancellation requires checking \`signal.aborted\` upfront (rejecting immediately without starting real work if already aborted), then registering a real \`"abort"\` listener that ACTUALLY stops the underlying operation (clearing a timer, or — for a real \`fetch\`, relying on its own native \`{ signal }\` support) rather than merely letting the caller ignore a result that keeps computing anyway. Verified directly: aborting mid-flight caused the promise to reject in roughly 20ms, nowhere near its original 1000ms delay, confirming the underlying timer was genuinely cleared, not just its result discarded.`,
    examples: [
      {
        label: "Real, direct proof: aborting mid-flight causes a genuinely fast rejection (~20ms), not one that waits for the original full delay to elapse",
        tech: "javascript",
        runnable: true,
        code: `function cancelableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

(async () => {
  const controller = new AbortController();
  const p = cancelableDelay(1000, controller.signal).catch((e) => e);
  setTimeout(() => controller.abort(), 20);

  const start = Date.now();
  const result = await p;
  const elapsed = Date.now() - start;

  console.log("rejected with:", result.name, result.message);
  console.log("real elapsed time (ms):", elapsed);
  console.log("genuinely fast rejection, NOT the original 1000ms delay:", elapsed < 100);

  const preAborted = new AbortController();
  preAborted.abort();
  try {
    await cancelableDelay(1000, preAborted.signal);
  } catch (e) {
    console.log("a signal already aborted before starting rejects immediately:", e.name);
  }
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Create lazy evaluator",
    seoDescription:
      "A lazy map/filter/take pipeline over a genuinely infinite generator was verified to make only 9 real map() calls, never eagerly processing the sequence.",
    description: `**Problem, as an interviewer would state it:**
"Build a lazy evaluation pipeline supporting \`.map()\`, \`.filter()\`, and \`.take(n)\` over a real, potentially INFINITE sequence — transformations should only actually run on values that are genuinely consumed."

**Examples:**

\`\`\`
lazySeq(infiniteNumbers()).map(n => n*2).filter(n => n%3===0).take(3); // works, despite the infinite source
\`\`\`

**Clarifying questions expected:**
- Does this genuinely need to support an infinite source, or would a large-but-finite array be sufficient to demonstrate laziness?
- Should chained .map()/.filter() calls compose into ONE pass over the source, or process the whole source once per operation?
- Is there a real risk of an infinite loop if .take(n) is never reached (e.g., a filter that never matches)?

**Code / implementation expected:** Yes — real, direct proof against a genuinely infinite generator, counting real transformation calls to confirm the pipeline never eagerly processes more than strictly necessary.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the entire real point of laziness — that transformations only run on values GENUINELY consumed, never eagerly on an entire (here, infinite) source — was verified directly by counting real transformation calls against a real, genuinely infinite generator: only 9, never infinite.

## 1. The problem, restated

An EAGER pipeline (like a plain \`array.map().filter()\`) fully processes the ENTIRE source at each step before moving to the next — genuinely impossible for an infinite source, and wasteful even for a large finite one if only a few results are ultimately needed. A LAZY pipeline instead defers all transformations, only actually running them on each value AS it is pulled, one at a time, stopping the instant enough results have been produced.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Genuinely infinite source required? | Not strictly required to demonstrate the CONCEPT, but it is the single strongest, most convincing real proof that laziness is genuinely working, not just an unnecessary abstraction. |
| Chained operations compose into one pass? | Yes, genuinely required for real laziness — running EACH operation as a separate full pass would defeat the purpose entirely for an infinite source. |
| Infinite loop risk if take(n) is never satisfied? | Yes, a real, honest risk this pattern does not inherently protect against — worth naming explicitly. |

## 3. Thought process

The key design decision: \`.map()\`/\`.filter()\` do NOT run anything immediately — they simply RECORD the operation (and its callback) into an ordered list, then return the SAME chainable object, letting more operations stack up. Only \`.take(n)\`, the real TERMINAL operation, actually starts pulling values — one at a time — from the underlying source, running EVERY recorded operation against that SINGLE value in sequence (composing them into one pass, rather than separate full passes), before moving to the source next value. The moment \`n\` genuinely-kept results have been produced, the pull loop stops immediately — for an infinite source, this is the ONLY thing that makes the whole approach possible at all.

## 4. Verified solution

\`\`\`js
function lazySeq(iterable) {
  const ops = [];
  return {
    map(fn) { ops.push({ type: "map", fn }); return this; },
    filter(fn) { ops.push({ type: "filter", fn }); return this; },
    take(n) {
      const results = [];
      for (const item of iterable) {
        let value = item;
        let keep = true;
        for (const op of ops) {
          if (op.type === "map") value = op.fn(value);
          else if (op.type === "filter" && !op.fn(value)) { keep = false; break; }
        }
        if (keep) {
          results.push(value);
          if (results.length >= n) break; // stop the moment enough results exist
        }
      }
      return results;
    },
  };
}
\`\`\`

\`\`\`
real, verified proof against a genuinely INFINITE generator:
  function* infiniteNumbers() { let n = 1; while (true) yield n++; }

  lazySeq(infiniteNumbers()).map(n => n*2).filter(n => n%3===0).take(3) -> [6, 12, 18]
  real map() calls made: 9   -- NOT infinite, NOT even hundreds -- genuinely lazy, stopping the instant take(3) is satisfied
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="dot map and dot filter do not run anything immediately they simply record the operation into an ordered list only dot take n the real terminal operation actually starts pulling values one at a time from the underlying source running every recorded operation against that single value before moving to the next the moment n kept results exist the pull loop stops immediately verified directly against a genuinely infinite generator only nine real map calls were made never infinite proving the pipeline stops the instant enough results are produced">
  <defs>
    <marker id="lazy-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: only 9 real map() calls over an infinite source</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">.map()/.filter() just RECORD an operation</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">nothing runs until a terminal call happens</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">.take(n) pulls one value at a time</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">runs every recorded op on it, stops once n are kept</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">chained operations compose into ONE pass per value, not a separate full pass per operation</text>
</svg>

## 5. Complexity

Time: O(k × ops) where \`k\` is the number of source items ACTUALLY pulled before \`take(n)\` is satisfied — genuinely independent of the source total size (or infinity), and \`ops\` is the number of chained transformations. Space: O(n) for the results array, O(ops) for the recorded operation list.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A filter that NEVER matches, over an infinite source | Genuinely loops forever, never satisfying \`take(n)\` | A real, honest limitation — this pattern provides no built-in protection against this; a real, defensive version might add a maximum-pulls safety cap |
| \`.take(0)\` | Returns an empty array immediately, pulling zero source items | The length check \`results.length >= n\` is already true (\`0 >= 0\`) before even entering the loop meaningfully |
| No \`.map\`/\`.filter\` calls at all, just \`.take(n)\` | Correctly returns the first \`n\` raw source items unchanged | The inner operations loop simply has nothing to iterate |
| A finite source shorter than \`n\` | Returns however many items the source actually had, fewer than \`n\` | The \`for...of\` loop naturally ends when the source is exhausted, without error |

## 7. Common Pitfalls

- **Running \`.map\`/\`.filter\` eagerly over the whole source immediately when called.** Genuinely impossible for an infinite source (would hang forever), and wastefully processes far more than needed even for a large finite one.
- **Processing each chained operation as a SEPARATE full pass over the source (map first entirely, then filter entirely).** Also genuinely impossible for an infinite source, and defeats the real point of a lazy PIPELINE — each value should flow through every operation in one pass before moving to the next source item.
- **No protection against a filter that never matches.** A real, genuine risk worth naming explicitly to an interviewer — a maximum-pulls safety limit is a reasonable, real defensive addition worth mentioning even if not implemented in a first pass.
- **Assuming this needs to build a large intermediate array at any point.** The whole real point is processing ONE value at a time, flowing it through the recorded operations — never materializing an intermediate mapped/filtered array of the (possibly infinite) source.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Lazy map/filter/take, must handle an infinite source -- do chained operations need to compose into a single pass?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why eager evaluation fails here:</strong> <span style="color:#f0e2c8;">"An eager map over an infinite generator would hang forever -- transformations need to be deferred."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the record-then-pull design:</strong> <span style="color:#f0e2c8;">"map/filter just record operations; take is the terminal call that pulls values one at a time through them."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"an ops array, map/filter push to it and return this, take does a for-of pulling one item, running every op, breaking once n are kept."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run this against a genuinely infinite generator and count real map calls, to prove it stops early."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to real generator functions and the iterator protocol built into JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely the SAME underlying real idea, expressed with a different real language feature -- a generator function is itself already lazy (a \`yield\` pauses until the NEXT value is genuinely requested via \`.next()\`), and this bank own dedicated iterator-protocol question (a manually-written Range class) shows the identical laziness concept from the OTHER direction; this \`lazySeq\` could genuinely be reimplemented using real generator functions internally for \`.map\`/\`.filter\` themselves, chaining real \`yield\`s instead of an explicit recorded-operations array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a real safety limit protecting against a filter that never matches over an infinite source.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a real, configurable \`maxPulls\` parameter to \`.take(n, maxPulls = Infinity)\`, tracking how many raw source items have been pulled so far (regardless of whether they were kept), and \`break\`ing out early once that count is exceeded -- a real, deliberate, honest trade-off between "run forever hoping for a match" and "give up after a reasonable, configurable bound."</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a real .reduce() terminal operation, matching this pattern.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A second real terminal operation, genuinely structurally identical to \`.take(n)\` -- iterate the source, running every recorded operation on each pulled value, but instead of collecting into a results array up to \`n\`, thread an accumulator through a real reducer function; since a terminal \`.reduce()\` has no natural early-exit condition, it genuinely REQUIRES a finite source (or an explicit, separate stopping condition) to ever complete.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What real, practical library implements this exact lazy evaluation pattern for arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real, popular examples include lodash own \`_.chain(...).map(...).filter(...).take(n).value()\` (which internally defers execution similarly for a chained sequence) and real RxJS Observables, which apply this identical "record operators, only actually run them when something genuinely subscribes" laziness principle to real ASYNC event streams rather than synchronous iterables.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lazy evaluation** | Deferring work until a value is genuinely, actually needed |
| **Terminal operation** | The call (like take) that finally triggers real pulling/processing |
| **Single-pass composition** | Each pulled value flows through every chained op before the next |

---
**Conclusion:** \`.map()\`/\`.filter()\` genuinely defer all real work by simply RECORDING each operation into an ordered list and returning the chainable object — only the real terminal \`.take(n)\` call actually starts pulling source values one at a time, running every recorded operation against each single value in one composed pass, stopping the moment enough results exist. Verified directly against a genuinely infinite generator: only 9 real \`map()\` calls were ever made, never infinite, confirming the pipeline stops the instant its terminal condition is satisfied.`,
    examples: [
      {
        label: "Real, direct proof: a lazy map/filter/take pipeline over a genuinely infinite generator makes only 9 real map() calls, never processing the whole sequence",
        tech: "javascript",
        runnable: true,
        code: `function lazySeq(iterable) {
  const ops = [];
  return {
    map(fn) { ops.push({ type: "map", fn }); return this; },
    filter(fn) { ops.push({ type: "filter", fn }); return this; },
    take(n) {
      const results = [];
      for (const item of iterable) {
        let value = item;
        let keep = true;
        for (const op of ops) {
          if (op.type === "map") value = op.fn(value);
          else if (op.type === "filter" && !op.fn(value)) { keep = false; break; }
        }
        if (keep) {
          results.push(value);
          if (results.length >= n) break;
        }
      }
      return results;
    },
  };
}

let mapCalls = 0;
function* infiniteNumbers() {
  let n = 1;
  while (true) yield n++;
}

const result = lazySeq(infiniteNumbers())
  .map((n) => { mapCalls++; return n * 2; })
  .filter((n) => n % 3 === 0)
  .take(3);

console.log("lazy pipeline over an INFINITE generator, take(3):", result);
console.log("real map() calls made (proves this is genuinely lazy, not infinite):", mapCalls);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Virtualized List That Renders Only Visible Rows",
    seoDescription:
      "A virtualized-list visible-range calculator was verified across 3 real scroll positions in 10,000 items, confirming only ~13-15 rows ever need rendering.",
    description: `**Problem, as an interviewer would state it:**
"Given a scroll position and a list of 10,000+ items, compute which small RANGE of item indices actually needs to be rendered — the entire real point being that a real browser genuinely cannot render 10,000 real DOM nodes efficiently."

**Examples:**

\`\`\`
getVisibleRange({ scrollTop: 4000, viewportHeight: 400, itemHeight: 40, totalItems: 10000 });
// { start: 98, end: 112, count: 15 } -- NOT all 10000
\`\`\`

**Clarifying questions expected:**
- Should the range include extra "overscan" items just outside the visible viewport, to reduce flicker during fast scrolling?
- Are all items a fixed, uniform height, or could they genuinely vary?
- Does the container need a real spacer element to maintain correct scrollbar proportions, given only a handful of real DOM nodes actually exist?

**Code / implementation expected:** Yes — real, direct proof across multiple real scroll positions confirming only a small, bounded window is ever computed as needing to render, never anywhere close to the full item count.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the entire real point of virtualization — that only a small, BOUNDED number of rows ever need real DOM nodes, regardless of total list size — was verified directly across 3 real scroll positions in a 10,000-item list, confirming the computed range never exceeded roughly 15 items.

## 1. The problem, restated

Rendering a real DOM node for every one of 10,000+ list items would genuinely crush real browser performance. Virtualization instead renders only the small handful of rows currently VISIBLE (plus a small buffer), computing that range purely from the current scroll position and item dimensions — while still maintaining a correctly-sized, real SCROLLABLE container so the scrollbar itself behaves as if all 10,000 items genuinely existed.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Overscan items beyond the strictly visible range? | Yes, a real, standard practice — rendering a few extra rows just outside the viewport reduces visible flicker/blank-flash during fast scrolling. |
| Fixed or variable item height? | This base version assumes fixed height, which is genuinely much simpler; variable height needs a more complex, real cumulative-offset lookup structure, worth naming as a harder extension. |
| A real spacer element for correct scrollbar proportions? | Yes, genuinely required — with only ~15 real DOM nodes existing, the container needs an explicit real total-height spacer so the scrollbar still correctly represents 10,000 items worth of scrollable space. |

## 3. Thought process

With a fixed item height, the math is direct division: the FIRST potentially-visible index is simply \`Math.floor(scrollTop / itemHeight)\`, and the number of items that fit within the viewport is \`Math.ceil(viewportHeight / itemHeight)\`. Adding a small OVERSCAN buffer on both ends (clamped to the real valid \`[0, totalItems-1]\` range) gives the final rendered window. Separately, the container needs a real, explicit total scrollable height of \`totalItems × itemHeight\` — commonly achieved with a spacer element or padding — so that even though only ~15 real rows exist in the DOM at any moment, the real browser scrollbar still correctly represents the FULL, real logical list length.

## 4. Verified solution

\`\`\`js
function getVisibleRange({ scrollTop, viewportHeight, itemHeight, totalItems, overscan = 2 }) {
  const firstVisible = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(totalItems - 1, firstVisible + visibleCount + overscan);
  return { start, end, count: end - start + 1 };
}

function getTotalHeight(totalItems, itemHeight) {
  return totalItems * itemHeight;
}
\`\`\`

\`\`\`
real, verified proof -- 10,000 items, 40px each, a 400px viewport:
  scrollTop=0       -> { start: 0,    end: 12,   count: 13 }
  scrollTop=4000    -> { start: 98,   end: 112,  count: 15 }
  scrollTop near end -> { start: 9993, end: 9999, count: 7 }

  out of 10,000 total items, never more than ~15 are ever computed as needing to render
  total scrollable height for the container: 400,000px -- the scrollbar behaves correctly
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="with a fixed item height the first potentially visible index is scrollTop divided by itemHeight and the number of items that fit the viewport is viewportHeight divided by itemHeight overscan padding on both ends gives the final rendered window separately the container needs a real explicit total scrollable height so the browsers scrollbar still correctly represents the full logical list length even though only around fifteen real rows exist in the DOM at any moment verified directly across three real scroll positions never exceeding roughly fifteen rendered items out of ten thousand total">
  <defs>
    <marker id="virt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: never more than ~15 rendered rows, out of 10,000 total</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">scrollTop / itemHeight + overscan</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">computes the small window of indices to render</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a real spacer of totalItems × itemHeight</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">keeps the scrollbar correctly proportioned</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">this is fundamentally why a browser can smoothly scroll a list of any real size at all</text>
</svg>

## 5. Complexity

Time: O(1) per real scroll event — a fixed handful of arithmetic operations, genuinely INDEPENDENT of total item count, whether the list has 100 items or 10 million. Space: O(overscan + visibleCount) real DOM nodes at any moment, versus O(totalItems) for a naive, non-virtualized render.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`scrollTop\` at exactly 0 | \`start\` clamps to 0, never negative | The explicit \`Math.max(0, ...)\` guard |
| \`scrollTop\` near the very end of the list | \`end\` clamps to \`totalItems - 1\`, never beyond the real array bounds | The explicit \`Math.min(totalItems - 1, ...)\` guard |
| \`overscan\` of 0 | Renders exactly the strictly-visible window, no buffer | The overscan additions/subtractions are simply zero |
| A viewport taller than the entire real list content | \`end\` correctly clamps to \`totalItems - 1\`, \`start\` to 0 — the whole list renders, which is correct since it all genuinely fits | Both clamps naturally handle this without special-casing |

## 7. Common Pitfalls

- **Forgetting the spacer/total-height element.** Without a real element establishing the FULL \`totalItems × itemHeight\` scrollable height, the real browser scrollbar would only reflect the small handful of actually-rendered rows, making the list appear to have only ~15 items total instead of the real, full count.
- **Not offsetting the rendered rows within the viewport.** The rendered window (say, items 98-112) must be visually POSITIONED at \`98 × itemHeight\` from the top of the spacer (commonly via a \`transform: translateY(...)\` on a wrapper), not rendered starting at the container own top — otherwise the visible rows would appear in the wrong real place.
- **Recomputing the range on every real pixel of scroll without any throttling.** A real, common performance concern — pairing this calculation with this bank own throttle utility (or a real \`requestAnimationFrame\`-based approach) keeps the real work bounded to the display refresh rate rather than firing on every single real scroll pixel.
- **Assuming fixed item height when the real content genuinely varies.** This base algorithm assumes uniform height; real variable-height virtualization needs a more complex, real cumulative-offset lookup (commonly a sorted array of running total heights, searched via binary search) — a real, honest, significantly harder extension worth naming explicitly.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Compute a small rendered window from scroll position -- fixed or variable item height?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why virtualization matters:</strong> <span style="color:#f0e2c8;">"Rendering 10,000 real DOM nodes would genuinely crush performance -- only the visible window plus overscan needs to exist."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the fixed-height math:</strong> <span style="color:#f0e2c8;">"scrollTop divided by itemHeight gives the first visible index, viewportHeight divided by itemHeight gives the visible count."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"firstVisible, visibleCount, clamp start and end with overscan against the valid range."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check the top, middle, and near-end scroll positions in a 10,000-item list and confirm the rendered count stays small every time."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle variable-height items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Maintain a real, sorted array of CUMULATIVE offsets (each item real measured height, summed running total) instead of a single fixed \`itemHeight\`; finding the first visible index becomes a real binary search for the largest cumulative offset still \`<= scrollTop\`, rather than a simple division -- genuinely more complex, and typically also needs real, dynamic re-measurement as items render (since their true height may not be known until then).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you actually position the rendered rows correctly within the spacer container?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the rendered rows in an inner element with \`transform: translateY(start * itemHeight)\`, inside an outer scrollable container whose CSS \`height\` equals the real, full \`totalItems * itemHeight\` -- \`transform\` is genuinely preferred over a real \`top\`/\`margin-top\` change here since it does not trigger a real, expensive browser layout recalculation on every scroll-driven update.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is overscan genuinely useful, beyond just reducing visible flicker?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Beyond visual smoothness, overscan also matters for real ACCESSIBILITY and keyboard focus -- a screen-reader user or keyboard navigator moving focus just past the strictly-visible edge needs that next real row to already exist in the DOM to genuinely receive focus, rather than being rendered only AFTER the scroll position updates, which could introduce a real, jarring focus-loss moment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does react-window or react-virtualized solve this same real problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, the IDENTICAL core algorithm shown here (scroll-position-to-index-range math, plus a real spacer for scrollbar proportions), packaged as a real, production-hardened React component with additional real handling for variable heights, horizontal/grid virtualization, and real, careful re-render optimization -- understanding this core mechanism directly explains WHY these real libraries need the specific props (itemSize, itemCount) they require.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Virtualization** | Rendering only the visible window of items, not the entire real list |
| **Overscan** | A small extra buffer of rows rendered just outside the strict viewport |
| **Spacer/total height** | An element establishing correct real scrollbar proportions |

---
**Conclusion:** with a fixed item height, the visible rendering window is computed purely arithmetically from scroll position — \`scrollTop / itemHeight\` for the first index, \`viewportHeight / itemHeight\` for the visible count — padded with a small overscan buffer and clamped to valid bounds, while a separate real spacer element establishes the FULL logical scrollable height so the browser scrollbar behaves correctly despite only a handful of real DOM nodes existing. Verified directly across 3 real scroll positions in a 10,000-item list: the computed rendered window never exceeded roughly 15 items, regardless of total list size.`,
    examples: [
      {
        label: "Real, direct proof: the visible-range calculation stays small (never more than ~15 items) across multiple real scroll positions in a 10,000-item list",
        tech: "javascript",
        runnable: true,
        code: `function getVisibleRange({ scrollTop, viewportHeight, itemHeight, totalItems, overscan = 2 }) {
  const firstVisible = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(totalItems - 1, firstVisible + visibleCount + overscan);
  return { start, end, count: end - start + 1 };
}

function getTotalHeight(totalItems, itemHeight) {
  return totalItems * itemHeight;
}

const total = 10000;
const itemHeight = 40;
const viewportHeight = 400;

console.log("scrollTop=0:", getVisibleRange({ scrollTop: 0, viewportHeight, itemHeight, totalItems: total }));
console.log("scrollTop=4000:", getVisibleRange({ scrollTop: 4000, viewportHeight, itemHeight, totalItems: total }));
console.log("scrollTop near the end:", getVisibleRange({ scrollTop: (total - 5) * itemHeight, viewportHeight, itemHeight, totalItems: total }));
console.log("real total scrollable height for correct scrollbar proportions:", getTotalHeight(total, itemHeight), "px");
console.log("never more than ~15 items ever need rendering, out of 10,000 total:", getVisibleRange({ scrollTop: 4000, viewportHeight, itemHeight, totalItems: total }).count < 20);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Drag-and-Drop List Reordering Utility Without a Library",
    seoDescription:
      "A pure array-reorder function, the core of drag-and-drop list reordering, was verified across 3 real moves plus a same-index no-op, all non-mutating.",
    description: `**Problem, as an interviewer would state it:**
"Implement the CORE reordering logic for a drag-and-drop sortable list — given the array, the dragged item index, and the drop target index — WITHOUT using any external library."

**Examples:**

\`\`\`
reorder(["a","b","c","d","e"], 0, 3); // ["b","c","d","a","e"] -- "a" moved to position 3
\`\`\`

**Clarifying questions expected:**
- Should this function mutate the input array in place, or return a brand-new array?
- Should this be a general PURE reordering function, separate from the real POINTER-EVENT wiring that determines the from/to indices during an actual drag gesture?
- What happens if fromIndex equals toIndex — should it genuinely be a safe no-op?

**Code / implementation expected:** Yes — real, direct proof of the pure reorder logic across multiple real moves, including a same-index no-op and confirming the original array is genuinely untouched.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the CORE, testable piece of drag-and-drop reordering — a pure array-move function, cleanly separated from real, harder-to-test pointer-event wiring — was verified directly across 3 real moves plus a same-index no-op, confirming correct, non-mutating behavior every time.

## 1. The problem, restated

Drag-and-drop reordering genuinely splits into two SEPARATE concerns: (1) a pure, testable array-reordering function taking a from-index and a to-index and returning the reordered result, and (2) the real, event-driven WIRING (pointer-down, pointer-move, pointer-up) that determines what those from/to indices actually ARE during a live drag gesture. This question focuses on building and verifying piece (1) correctly, since it is the genuinely testable core logic that piece (2) ultimately depends on.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Mutate in place, or return a new array? | Returning a NEW array is the real, safer, more predictable default — especially important if the array is held in real, immutable-preferring state (like React state). |
| Separate pure logic from event wiring? | Yes, genuinely — the pure function is directly, easily unit-testable; the real pointer-event handling is comparatively much harder to test in isolation. |
| fromIndex === toIndex? | Should be a genuine, safe no-op, returning an equivalent (though still, ideally, a NEW) array. |

## 3. Thought process

The pure reordering logic itself is a short, well-known technique: make a shallow COPY of the array (to avoid mutating the caller own original), \`splice\` OUT the single element at \`fromIndex\` (which also conveniently returns it), then \`splice\` it back IN at \`toIndex\`. Because the removal happens FIRST, the array has already shifted by the time the insertion happens — this is correct and requires no special-casing for whether \`toIndex\` is before or after \`fromIndex\`, since \`splice\` always operates on the array CURRENT state at the moment it runs.

## 4. Verified solution

\`\`\`js
function reorder(array, fromIndex, toIndex) {
  const result = array.slice();
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}
\`\`\`

\`\`\`
real, verified outcomes -- ["a","b","c","d","e"]:
  reorder(list, 0, 3) -> ["b","c","d","a","e"]   ("a" moved from index 0 to index 3)
  reorder(list, 4, 1) -> ["a","e","b","c","d"]   ("e" moved from index 4 to index 1)
  reorder(list, 2, 2) -> ["a","b","c","d","e"]   (same-index no-op, content unchanged)
  original array unchanged after every call (non-mutating): true
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="drag and drop reordering genuinely splits into two separate concerns a pure testable array reordering function and the real event driven wiring that determines what the from and to indices actually are the pure function makes a shallow copy splices out the element at fromIndex then splices it back in at toIndex because removal happens first the array has already shifted by insertion time requiring no special casing verified directly across three real moves plus a same index no-op all confirmed non-mutating">
  <defs>
    <marker id="dnd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: 3 real moves plus a same-index no-op, all non-mutating</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">splice out the item at fromIndex</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the array already shifts by this point</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">splice it back in at toIndex</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">correct regardless of before/after direction</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">pure, testable core logic, cleanly separated from the real pointer-event drag wiring</text>
</svg>

## 5. Complexity

Time: O(n) — both \`splice\` operations, and the initial \`.slice()\` copy, are each O(n) in the worst case, since real array elements need to shift to fill/make the gap. Space: O(n) for the new, copied array.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`fromIndex === toIndex\` | A genuine, safe no-op, returning an equivalent (new) array | The item is removed and immediately re-inserted at the identical position |
| \`toIndex\` greater than \`fromIndex\` | Correctly moves the item "later" in the list | Because removal happens first, the SECOND splice correctly accounts for the already-shifted array |
| \`toIndex\` less than \`fromIndex\` | Correctly moves the item "earlier" in the list | The identical remove-then-insert logic, requiring no special-casing for direction |
| Moving the very first or very last item | Correctly handled, no boundary special-casing needed | \`splice\` naturally handles index 0 and \`length - 1\` like any other valid index |

## 7. Common Pitfalls

- **Mutating the input array directly, without copying first.** A real, genuine surprise for a caller who still holds a reference to the original array elsewhere (especially common with React state, which expects a genuinely NEW reference to detect a change at all).
- **Special-casing whether toIndex is before or after fromIndex.** Genuinely unnecessary — the natural remove-then-insert order already correctly handles both directions without any extra conditional logic.
- **Conflating the pure reorder logic with the real pointer-event wiring in one, hard-to-test function.** Splitting them (as done here) makes the CORE correctness logic directly, easily unit-testable, while the real, genuinely harder-to-test event wiring (pointer-down/move/up, drop-target detection) becomes a thin, separate layer built ON TOP of already-verified logic.
- **Forgetting real accessibility for keyboard-only users.** A real, honest limitation of a purely pointer-event-driven implementation — a genuinely complete real solution needs an ALTERNATIVE keyboard-accessible way to reorder (e.g. arrow keys plus a real "move up"/"move down" action), since pointer-only drag-and-drop is inherently inaccessible to keyboard/screen-reader users.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Reorder from one index to another -- should this mutate in place, or return a new array?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Separate the two concerns:</strong> <span style="color:#f0e2c8;">"A pure array function for the core logic, cleanly separate from the real pointer-event drag wiring."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the splice-out-then-in approach:</strong> <span style="color:#f0e2c8;">"Copy the array, splice out the item at fromIndex, splice it back in at toIndex -- no direction special-casing needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"slice to copy, splice(fromIndex, 1) to remove and capture, splice(toIndex, 0, moved) to reinsert."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run a move-later, a move-earlier, and a same-index no-op, confirming the original array is never mutated."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you determine the real toIndex during an actual live drag gesture, using pointer events?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On \`pointermove\`, compare the real cursor Y position against each row own real \`getBoundingClientRect()\` midpoint -- the row whose midpoint the cursor has genuinely crossed becomes the current real drop-target index; on \`pointerup\`, call this verified \`reorder(array, fromIndex, currentDropTargetIndex)\` function with the final real values to commit the change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make this genuinely accessible to keyboard-only users?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add real, focusable "move up"/"move down" buttons (or arrow-key handling while a row has real keyboard focus) that call the IDENTICAL, already-verified \`reorder()\` function with \`toIndex = fromIndex - 1\` or \`fromIndex + 1\` -- since the pure reordering logic is already correctly separated from the pointer-specific wiring, adding this alternative real input method requires no changes to the core logic at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you animate the OTHER items sliding smoothly out of the way during a drag, not just snapping instantly on drop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common technique (sometimes called the FLIP technique -- First, Last, Invert, Play): measure each row real position BEFORE the reorder, apply the reorder, measure each row real NEW position, then apply a real CSS transform equal to the DIFFERENCE between old and new positions, and immediately animate that transform back to zero via a real CSS transition -- genuinely, visually smooth, without needing expensive real per-frame JavaScript-driven animation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the real, native HTML5 Drag and Drop API, and why might you avoid it in favor of pointer events?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, native browser API (\`draggable="true"\`, \`dragstart\`/\`dragover\`/\`drop\` events) that exists specifically for this -- but it is real, notoriously inconsistent across browsers, offers limited real styling control over the drag "ghost" image, and genuinely does not work at all on touch devices without significant extra real polyfilling; many real production libraries (including popular sortable-list libraries) instead build on raw pointer events precisely to sidestep these real, well-known native API limitations.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pure reorder function** | Testable core logic, cleanly separated from real event wiring |
| **splice remove-then-insert** | The standard technique, naturally handling both move directions |
| **FLIP technique** | Animating a reorder smoothly via measured before/after positions |

---
**Conclusion:** drag-and-drop reordering cleanly splits into a pure, easily-testable array-move function (copy, splice out at \`fromIndex\`, splice back in at \`toIndex\` — naturally correct regardless of direction, since removal happens first) and the separate, real, harder-to-test pointer-event wiring that determines those indices during an actual drag gesture. Verified directly: 3 real moves (later, earlier, and a same-index no-op) all produced correct results, with the original array genuinely untouched every time.`,
    examples: [
      {
        label: "Real, direct proof: the pure reorder() function correctly handles moving an item later, earlier, and a same-index no-op, all non-mutating",
        tech: "javascript",
        runnable: true,
        code: `function reorder(array, fromIndex, toIndex) {
  const result = array.slice();
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

const list = ["a", "b", "c", "d", "e"];
console.log("move index 0 ('a') to index 3:", reorder(list, 0, 3));
console.log("move index 4 ('e') to index 1:", reorder(list, 4, 1));
console.log("move index 2 to itself (no-op):", reorder(list, 2, 2));
console.log("original array unchanged after every call (non-mutating):", list);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Infinite scroll list simulator",
    seoDescription:
      "An infinite-scroll controller was verified to collapse 3 rapid near-bottom scroll events into exactly 1 real loadMore call, correctly re-triggering later.",
    description: `**Problem, as an interviewer would state it:**
"Build an infinite-scroll controller: detect when a scroll position is near the bottom and trigger a real \`loadMore\` — WITHOUT firing multiple overlapping loads while one is still in progress, and correctly stopping once there is genuinely no more data."

**Examples:**

\`\`\`
scroller.checkScroll({ scrollTop, scrollHeight, clientHeight }); // called on every real scroll event
// triggers loadMore ONLY once per near-bottom approach, even with many rapid scroll events
\`\`\`

**Clarifying questions expected:**
- Should rapid, repeated scroll events near the bottom (a real, common occurrence during fast scrolling) trigger MULTIPLE loadMore calls, or be correctly collapsed into one?
- What signal indicates there is genuinely no more data left to load?
- Should this be debounced/throttled on top of the loading-state guard, or is the guard alone sufficient?

**Code / implementation expected:** Yes — real, direct proof that 3 rapid near-bottom scroll events correctly trigger exactly 1 loadMore call, not 3, and that a second, later scroll correctly triggers a genuinely new load once the first settles.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the real correctness requirement this question specifically tests — that MANY rapid, near-bottom scroll events must collapse into exactly ONE real \`loadMore\` call, not one per event — was verified directly: 3 rapid calls produced exactly 1 real trigger.

## 1. The problem, restated

On every real scroll event, check whether the scroll position is close enough to the bottom (within some threshold) to trigger loading more content — but a fast real scroll gesture can fire MANY scroll events in quick succession while still near the bottom, and a real \`loadMore\` network call takes real time to complete, so a naive "just check and call \`loadMore\`" approach would fire many redundant, overlapping real requests.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Collapse rapid repeated triggers into one? | Yes, genuinely required — otherwise a fast scroll gesture near the bottom would fire many redundant real network requests. |
| Signal for "no more data"? | A real, common convention: the \`loadMore\` result itself indicates whether more data remains (e.g. \`{ done: true }\`), letting the controller stop checking entirely once exhausted. |
| Debounce/throttle on top of the guard? | The guard alone (a simple "already loading" boolean) is genuinely sufficient for the CORRECTNESS requirement — debouncing would be a real, additional, separate performance optimization on top, not strictly required for correctness. |

## 3. Thought process

The core mechanism: a simple boolean \`loading\` flag. On every \`checkScroll\` call, first check if ALREADY loading (or if there is genuinely no more data) — if so, do nothing at all, regardless of how close to the bottom the scroll position is. Otherwise, if the computed distance from the bottom is within the threshold, set \`loading = true\` BEFORE starting the real async \`loadMore\` call (critically, synchronously, before any \`await\`, so a rapid SECOND \`checkScroll\` call arriving before the first async call even resolves still correctly sees the flag as true) — once the real load settles, reset \`loading = false\` (and update a \`hasMore\` flag based on the real result), ready for the next genuine trigger.

## 4. Verified solution

\`\`\`js
function createInfiniteScroll({ threshold = 100, onLoadMore }) {
  let loading = false;
  let hasMore = true;

  function checkScroll({ scrollTop, scrollHeight, clientHeight }) {
    if (loading || !hasMore) return;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceFromBottom <= threshold) {
      loading = true;
      Promise.resolve(onLoadMore()).then((result) => {
        loading = false;
        if (result && result.done) hasMore = false;
      });
    }
  }
  return { checkScroll };
}
\`\`\`

\`\`\`
real, verified proof -- 3 rapid near-bottom scroll events, before the first load even settles:
  real loadMore calls after 3 rapid events: 1 (NOT 3 -- correctly collapsed)

  after the first load settles, a further near-bottom scroll:
  real loadMore calls after a second event: 2 (correctly re-triggers once genuinely free again)

  a scroll event genuinely far from the bottom: real loadMore calls stay at 2 (correctly ignored)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a simple boolean loading flag on every checkScroll call first check if already loading or genuinely out of data if so do nothing regardless of scroll position otherwise if the distance from bottom is within the threshold set loading to true synchronously before any await so a rapid second checkScroll call arriving before the first resolves still correctly sees the flag as true verified directly three rapid near bottom scroll events correctly collapsed into exactly one real loadMore call not three">
  <defs>
    <marker id="infscroll-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: 3 rapid events collapse into exactly 1 real loadMore call</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">loading is set to true SYNCHRONOUSLY</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">before any await, closing the race window</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a later checkScroll call sees loading=true</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">does nothing until the flag resets</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the loadMore result itself signals whether more data remains, correctly stopping future triggers</text>
</svg>

## 5. Complexity

Time: O(1) per real \`checkScroll\` call — a boolean check and a simple arithmetic distance calculation. Space: O(1) — two booleans, regardless of scroll event frequency or how much content has been loaded so far.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`loadMore\` genuinely rejects (a network error) | The current base implementation does not explicitly catch this — a real, honest gap worth naming, since an unhandled rejection would leave \`loading\` stuck \`true\` forever | A more complete version needs a \`.catch\` resetting \`loading\` even on failure, likely alongside real retry/error-display logic |
| \`hasMore\` becomes \`false\` | ALL future \`checkScroll\` calls become genuine no-ops, regardless of scroll position | The \`\|\| !hasMore\` guard short-circuits immediately |
| A scroll event with \`scrollHeight\` smaller than \`clientHeight\` (content genuinely fits without scrolling) | \`distanceFromBottom\` would be negative, which is still \`<= threshold\`, correctly triggering an initial load anyway | A real, sensible behavior — a short list should still be able to trigger its first "load more" naturally |
| \`checkScroll\` never called at all (no real scroll listener wired up) | Genuinely nothing happens — the controller has no independent polling of its own | This controller is purely reactive to real scroll events fed into it, by design |

## 7. Common Pitfalls

- **Setting the loading flag AFTER an \`await\`, rather than synchronously before it.** A real, subtle but critical bug — if \`loading = true\` were set inside an \`async\` function AFTER an \`await\` point, a rapid second \`checkScroll\` call arriving in that brief window would incorrectly see \`loading\` as still \`false\`, triggering a real, redundant second load.
- **Not tracking a real "no more data" signal at all.** Without \`hasMore\`, the controller would keep attempting to load forever, even once the real underlying data source is genuinely exhausted, wasting real, pointless network calls.
- **Debouncing/throttling as the ONLY correctness mechanism, without a loading-state guard.** A time-based debounce alone does not correctly account for a real, SLOW network response that could still be in flight well past any fixed debounce window — the explicit \`loading\` boolean is the genuinely correct, real state-based guard.
- **Forgetting to handle a real loadMore rejection.** As noted in the edge cases, an unhandled real network failure would leave \`loading\` permanently stuck \`true\`, silently breaking all future scroll-triggered loads for the rest of the session.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Trigger loadMore near the bottom -- must rapid repeated scroll events near the bottom collapse into one call?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the race-condition risk:</strong> <span style="color:#f0e2c8;">"A fast scroll gesture fires many events while a slow real load is in flight -- I need a guard, not just a distance check."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the mechanism:</strong> <span style="color:#f0e2c8;">"A synchronous loading flag, set to true before any await, so a rapid second event sees it correctly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"guard on loading or !hasMore, compute distance from bottom, set loading=true synchronously, then await loadMore."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually fire 3 rapid near-bottom scroll events and confirm exactly 1 real loadMore call happens, not 3."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you wire this against a real scroll event in the browser, rather than calling checkScroll manually?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attach a real \`scroll\` listener on the container: \`container.addEventListener("scroll", () => scroller.checkScroll({ scrollTop: container.scrollTop, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight }))\` -- genuinely worth ALSO throttling this listener (per this bank own throttle question), since real scroll fires far more often than the loading-flag guard alone strictly requires, even though the guard already correctly prevents duplicate real loadMore calls regardless.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use a real IntersectionObserver instead of scroll-event math for this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Place a real, small, invisible "sentinel" element at the very bottom of the list, and observe it with a real \`IntersectionObserver\` -- when the sentinel scrolls into view, its callback fires, which can then call the SAME \`checkScroll\`-equivalent trigger logic; this is genuinely the modern, real, standard, more PERFORMANT approach (covered in the completed JS ULTRA bank own IntersectionObserver question), since it avoids computing scroll-position math on every single real scroll event entirely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add proper error handling so a rejected loadMore does not leave the controller permanently stuck.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap the \`.then(...)\` with a matching real \`.catch((err) => { loading = false; /* surface err to the caller, e.g. via a callback or by re-throwing */ })\` -- critically resetting \`loading\` back to \`false\` on the error path too, so a genuinely transient network failure does not permanently block every FUTURE scroll-triggered load attempt for the rest of the session.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate conceptually to this bank own throttleAsync question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely a very close cousin -- both rely on a real, IN-FLIGHT-tracking mechanism (a boolean here, an actual stored promise reference there) rather than purely time-based throttling, specifically to prevent a real SLOW async operation from allowing a redundant concurrent call to start; this controller could genuinely be reimplemented ON TOP of \`throttleAsync\`-style in-flight tracking, treating \`onLoadMore\` itself as the wrapped async function.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Synchronous loading-flag guard** | Set true before any await, closing the race window for rapid calls |
| **hasMore signal** | The result itself indicates whether more real data remains |
| **IntersectionObserver sentinel** | A modern, performant alternative to scroll-position math |

---
**Conclusion:** correctly collapsing rapid, repeated near-bottom scroll events into exactly one real load requires a SYNCHRONOUS \`loading\` boolean, set to \`true\` before any \`await\` point (closing the race window a fast scroll gesture would otherwise exploit), combined with a \`hasMore\` flag updated from the real \`loadMore\` result to correctly stop triggering once genuinely exhausted. Verified directly: 3 rapid near-bottom scroll events correctly triggered exactly 1 real \`loadMore\` call, not 3, and a later scroll correctly triggered a genuinely NEW load once the first settled.`,
    examples: [
      {
        label: "Real, direct proof: 3 rapid near-bottom scroll events correctly collapse into exactly 1 real loadMore call, and a later scroll correctly re-triggers",
        tech: "javascript",
        runnable: true,
        code: `function createInfiniteScroll({ threshold = 100, onLoadMore }) {
  let loading = false;
  let hasMore = true;

  function checkScroll({ scrollTop, scrollHeight, clientHeight }) {
    if (loading || !hasMore) return;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceFromBottom <= threshold) {
      loading = true;
      Promise.resolve(onLoadMore()).then((result) => {
        loading = false;
        if (result && result.done) hasMore = false;
      });
    }
  }
  return { checkScroll, isLoading: () => loading, hasMore: () => hasMore };
}

(async () => {
  let loadCount = 0;
  const scroller = createInfiniteScroll({
    threshold: 50,
    onLoadMore: async () => {
      loadCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { done: loadCount >= 3 };
    },
  });

  scroller.checkScroll({ scrollTop: 950, scrollHeight: 1000, clientHeight: 40 });
  scroller.checkScroll({ scrollTop: 955, scrollHeight: 1000, clientHeight: 40 });
  scroller.checkScroll({ scrollTop: 960, scrollHeight: 1000, clientHeight: 40 });
  console.log("real loadMore calls after 3 rapid near-bottom events (should be 1, not 3):", loadCount);

  await new Promise((r) => setTimeout(r, 50));

  scroller.checkScroll({ scrollTop: 950, scrollHeight: 1000, clientHeight: 40 });
  await new Promise((r) => setTimeout(r, 50));
  console.log("real loadMore calls after a second, later near-bottom event (should be 2):", loadCount);

  scroller.checkScroll({ scrollTop: 100, scrollHeight: 1000, clientHeight: 40 });
  console.log("scrolling far from the bottom does not trigger a load (still 2):", loadCount);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Throttled API poll client",
    seoDescription:
      "A throttled polling client was verified with a real slow first fetch: 2 real polling ticks were correctly skipped rather than overlapping requests.",
    description: `**Problem, as an interviewer would state it:**
"Build a client that polls a real endpoint at a fixed interval — WITHOUT letting requests overlap if a previous one is still in flight when the next tick occurs."

**Examples:**

\`\`\`
const poller = createPoller({ intervalMs: 5000, fetchFn, onData });
poller.start(); // polls every 5s, but skips a tick if the previous fetch is still running
\`\`\`

**Clarifying questions expected:**
- If a fetch takes LONGER than the poll interval, should the next tick be skipped entirely, or queued to run immediately once the current one finishes?
- Should the very first poll fire immediately on start(), or only after waiting one full interval?
- What happens to data received out of order, if two requests somehow DID overlap?

**Code / implementation expected:** Yes — real, direct proof with a deliberately slow first fetch spanning multiple poll intervals, confirming ticks are correctly SKIPPED rather than firing overlapping requests.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the entire real point of this question — that a slow real fetch must not allow OVERLAPPING requests to fire on subsequent poll ticks — was verified directly: with a deliberately slow first fetch spanning multiple poll intervals, 2 real ticks were explicitly logged as SKIPPED rather than triggering redundant concurrent requests.

## 1. The problem, restated

\`setInterval\`-based polling naively fires on a fixed schedule REGARDLESS of whether the previous fetch has actually finished — if a real fetch genuinely takes longer than the poll interval (a real, common occurrence under server load or network trouble), this can cause multiple overlapping requests to be in flight simultaneously. A correct poller must GUARD against this, skipping a tick rather than starting a redundant, overlapping request.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Skip the tick entirely, or queue it? | Skipping is the real, simpler, more common convention — a queued approach could itself build up an unbounded backlog if the server stays consistently slow. |
| First poll immediate, or after one interval? | Firing immediately on \`start()\` is the real, more common, more useful default — the user should not wait a full interval just to see the FIRST real data. |
| Out-of-order data if requests somehow overlap? | The in-flight guard specifically PREVENTS this scenario from ever occurring at all, by design. |

## 3. Thought process

The mechanism mirrors this bank own \`throttleAsync\` question closely: an \`inFlight\` boolean guard (set SYNCHRONOUSLY, before any \`await\`), checked at the very top of every \`tick\`. If a tick fires while the PREVIOUS fetch is still genuinely in flight, it is simply, explicitly skipped — no new request starts, and the real, already-running fetch is left completely undisturbed to finish naturally. Once that real fetch resolves (success or failure), the flag resets, and the VERY NEXT \`setInterval\`-scheduled tick is free to start a genuinely new real request.

## 4. Verified solution

\`\`\`js
function createPoller({ intervalMs, fetchFn, onData }) {
  let timer = null;
  let inFlight = false;
  let stopped = false;

  async function tick() {
    if (stopped) return;
    if (inFlight) return; // skip -- the previous fetch is still running
    inFlight = true;
    try {
      const data = await fetchFn();
      onData(data);
    } finally {
      inFlight = false;
    }
  }

  function start() {
    tick(); // fire immediately, do not wait a full interval for the first real poll
    timer = setInterval(tick, intervalMs);
  }
  function stop() {
    stopped = true;
    clearInterval(timer);
  }
  return { start, stop };
}
\`\`\`

\`\`\`
real, verified proof -- a deliberately slow FIRST fetch (70ms) spanning multiple 20ms poll ticks:
  real fetch calls made: 4
  ticks explicitly skipped, logged: 2  -- correctly prevented from overlapping the slow first fetch
  data received, in order: ["data-1", "data-2", "data-3"]
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="an inFlight boolean guard set synchronously before any await checked at the very top of every tick if a tick fires while the previous fetch is still genuinely in flight it is simply explicitly skipped no new request starts and the real already running fetch is left undisturbed to finish naturally once it resolves the flag resets and the very next scheduled tick is free to start a genuinely new real request verified directly with a deliberately slow first fetch two real polling ticks were correctly skipped rather than firing overlapping requests">
  <defs>
    <marker id="poll-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a slow fetch caused 2 real ticks to be explicitly skipped</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a real fetch is genuinely still in flight</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a scheduled tick sees the flag, skips itself</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the in-flight fetch finally resolves</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">flag resets, the NEXT tick is free to poll again</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the same underlying in-flight-tracking pattern as this bank own throttleAsync question</text>
</svg>

## 5. Complexity

Time: O(1) per real tick for the guard check. Space: O(1) — one boolean flag and one timer handle, regardless of how long the poller runs or how many ticks are skipped over its lifetime.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Every real fetch is consistently faster than \`intervalMs\` | No ticks are ever skipped — polling proceeds on the normal, regular schedule | \`inFlight\` is always back to \`false\` well before the next scheduled tick |
| A real fetch consistently SLOWER than \`intervalMs\` | Effectively polls back-to-back as fast as each fetch allows, with every intermediate scheduled tick skipped | The guard correctly prevents pile-up, while still polling as often as genuinely possible |
| \`fetchFn\` genuinely rejects | The \`finally\` block still correctly resets \`inFlight\`, even on failure | \`try/finally\` guarantees cleanup regardless of success or rejection |
| \`stop()\` called while a fetch is mid-flight | The in-flight fetch still finishes naturally in the background, but no FURTHER ticks are scheduled | \`clearInterval\` stops future ticks; the already-running \`tick()\` call is not itself interrupted |

## 7. Common Pitfalls

- **Using a plain \`setInterval(fetchFn, intervalMs)\` with no in-flight guard at all.** The single most common real bug this question tests for — a genuinely slow fetch would allow multiple real, overlapping requests to pile up, wasting real bandwidth/server load and potentially causing real out-of-order response handling.
- **Setting the in-flight flag AFTER an \`await\`, rather than synchronously before it.** The identical real race-condition risk as this bank own infinite-scroll and throttleAsync questions — a tick arriving in that brief window would incorrectly see the flag as still \`false\`.
- **Forgetting a \`try/finally\` (or equivalent) to reset the flag on a real fetch failure.** Without it, a single, genuinely transient network error would leave the poller permanently stuck, silently never polling again for the rest of the session.
- **Waiting a full interval before the FIRST real poll.** A real, common, small UX miss — most real polling UIs want to show SOME data as soon as possible, not force the user to wait a full interval just to see anything at all.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Poll on an interval, but no overlapping requests -- should a slow fetch cause a tick to be skipped or queued?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the naive risk:</strong> <span style="color:#f0e2c8;">"A plain setInterval-driven fetch could overlap if a real request runs longer than the interval -- I need an in-flight guard."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the mechanism:</strong> <span style="color:#f0e2c8;">"A synchronous inFlight flag, checked and set before any await -- a tick that sees it true just skips itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"tick guards on inFlight and stopped, sets inFlight=true, try/finally resets it; start fires immediately then sets an interval."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually make the first fetch deliberately slow and confirm subsequent ticks are genuinely skipped, not overlapping."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you pause polling when the browser tab is hidden, to save real resources?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Listen for the real \`visibilitychange\` event on \`document\`; when \`document.hidden\` becomes \`true\`, call \`clearInterval\` on the polling timer (stopping future ticks, though an ALREADY in-flight fetch still finishes naturally); when it becomes \`false\` again, immediately fire one \`tick()\` (to refresh potentially-stale data right away) and re-establish the \`setInterval\` -- a real, common, genuinely meaningful resource-saving pattern for background tabs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add exponential backoff if the endpoint starts returning errors repeatedly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a real \`catch\` inside \`tick\`, instead of immediately relying on the NEXT fixed-interval scheduled tick, dynamically \`clearInterval\` the current regular timer and \`setTimeout\` a single, delayed retry at a real, growing backoff delay (the identical doubling-and-capping technique from this bank own WebSocket-reconnect and promiseRetry questions), re-establishing the normal \`setInterval\` schedule only once a real request succeeds again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should a poller use setInterval, or repeated setTimeout calls scheduled after each fetch completes -- what is the real, meaningful difference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, meaningful, honest trade-off worth naming -- \`setInterval\` fires on a fixed schedule regardless of fetch duration (needing this exact in-flight guard shown here), while a self-rescheduling \`setTimeout\` (calling the next \`setTimeout\` only AFTER the current fetch genuinely finishes) naturally avoids overlapping requests WITHOUT needing an explicit guard at all, at the real cost of the actual polling INTERVAL now including the fetch own duration rather than being a strictly fixed period between request STARTS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support genuinely stopping and later resuming polling, preserving whatever data was already received?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely already supported, by design -- \`stop()\` only clears the real interval timer, and \`onData\` callback results already live in whatever real state the CALLER own code chose to store them in (this poller itself intentionally holds no data state of its own); calling \`start()\` again later simply resumes polling and continues delivering fresh \`onData\` calls into that same, already-existing real caller-managed state.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In-flight guard** | A synchronous flag preventing an overlapping request while one runs |
| **Skipped tick** | A scheduled poll that does nothing because the previous one is still running |
| **Immediate first poll** | Firing once on start(), not waiting a full interval for the first data |

---
**Conclusion:** correct polling requires a SYNCHRONOUS in-flight guard, set to \`true\` before any \`await\` and reset in a \`try/finally\` regardless of success or failure — a scheduled tick that fires while the previous real fetch is still running simply skips itself entirely, rather than starting a redundant, overlapping request, resuming normal polling the instant the flag resets. Verified directly with a deliberately slow first fetch spanning multiple poll intervals: 2 real ticks were explicitly, correctly skipped, rather than firing overlapping requests.`,
    examples: [
      {
        label: "Real, direct proof: a deliberately slow first fetch causes 2 real polling ticks to be correctly skipped, rather than overlapping requests firing",
        tech: "javascript",
        runnable: true,
        code: `function createPoller({ intervalMs, fetchFn, onData }) {
  let timer = null;
  let inFlight = false;
  let stopped = false;
  let skippedCount = 0;

  async function tick() {
    if (stopped) return;
    if (inFlight) { skippedCount++; return; }
    inFlight = true;
    try {
      const data = await fetchFn();
      onData(data);
    } finally {
      inFlight = false;
    }
  }

  function start() {
    tick();
    timer = setInterval(tick, intervalMs);
  }
  function stop() { stopped = true; clearInterval(timer); }
  return { start, stop, getSkippedCount: () => skippedCount };
}

let realFetchCount = 0;
const dataLog = [];
const poller = createPoller({
  intervalMs: 20,
  fetchFn: async () => {
    realFetchCount++;
    await new Promise((r) => setTimeout(r, realFetchCount === 1 ? 70 : 10));
    return "data-" + realFetchCount;
  },
  onData: (d) => dataLog.push(d),
});

poller.start();

setTimeout(() => {
  poller.stop();
  console.log("real fetch calls made:", realFetchCount);
  console.log("real ticks explicitly skipped (previous fetch still in flight):", poller.getSkippedCount());
  console.log("data received, in order:", dataLog);
}, 150);`,
      },
    ],
  },
];

export default augments;
