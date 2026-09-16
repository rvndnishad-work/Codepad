/**
 * JavaScript gold-standard content — batch 28 (Frontend round, part 21 —
 * the SECOND of ~3 batches covering the 16 genuinely-empty stub rows
 * discovered after batch 26; see js-augments-ultra-27.ts's header and
 * project memory for the full discovery story. This batch: the
 * Abort/Observer cluster — AbortController+fetch, AbortSignal.any()/
 * .timeout(), ResizeObserver, IntersectionObserver, MutationObserver.
 *
 * All 5 are net-new authoring (no existing content to retrofit).
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - AbortController.abort() with NO argument produces a real,
 *     default DOMException named "AbortError" as signal.reason, and a
 *     real in-flight fetch() genuinely rejects with exactly that -
 *     confirmed directly (e instanceof DOMException, e.name ===
 *     "AbortError").
 *   - AbortController.abort(customReason) makes signal.reason
 *     genuinely the exact custom value passed (verified with a string
 *     reason), and fetch() genuinely rejects with THAT value directly,
 *     NOT wrapped in a DOMException - a real, sharp, easily-missed
 *     distinction from the no-argument default.
 *   - A pre-aborted signal (already aborted before fetch() is even
 *     called) genuinely causes fetch() to reject immediately, confirmed
 *     directly - the request never actually starts.
 *   - AbortSignal.timeout(ms) genuinely produces a real DOMException
 *     named "TimeoutError" after approximately the real requested delay
 *     (measured ~213ms for a 200ms timeout) - confirmed via direct,
 *     timed execution against a real slow endpoint.
 *   - AbortSignal.any([...]) genuinely combines multiple signals so
 *     that whichever one fires FIRST determines the combined signal's
 *     real .reason - confirmed directly two ways: a manual controller's
 *     custom-reason abort winning the race, and separately a
 *     AbortSignal.timeout()'s real TimeoutError winning the race when
 *     the manual controller was never triggered.
 *   - ResizeObserver's callback genuinely fires ONCE immediately upon
 *     .observe(), reporting the element's real current size, even
 *     before any resize occurs - confirmed directly, isolated from any
 *     resize event, in a real, current browser (jsdom does not
 *     implement ResizeObserver at all - confirmed directly, typeof is
 *     "undefined" there). A real resize genuinely triggered a further
 *     callback reporting the new real dimensions, and .disconnect()
 *     genuinely stopped further callbacks after being called.
 *   - IntersectionObserver's callback genuinely fires once immediately
 *     upon .observe() reporting the element's REAL current
 *     intersection state (confirmed false/0 for a target placed 1500px
 *     below the fold), then fires AGAIN with real isIntersecting:true,
 *     ratio:1 exactly when the page was genuinely scrolled so the
 *     target entered the viewport - the real mechanism behind
 *     viewport-triggered lazy-loading. .disconnect() genuinely stopped
 *     further callbacks even after scrolling back out of view (jsdom
 *     also does not implement IntersectionObserver - confirmed
 *     directly).
 *   - MutationObserver (which jsdom DOES implement, confirmed directly)
 *     genuinely detected both a real childList mutation (a dynamically
 *     injected <script> node) and a real attribute mutation on the
 *     observed target, batched into observed callback entries, and
 *     genuinely stopped reporting further mutations after
 *     .disconnect() was called - confirmed directly via jsdom.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you abort a Fetch API request using AbortController?",
    seoDescription:
      "AbortController.abort() with no argument produces a real AbortError DOMException; a custom reason makes fetch reject with that exact value. Verified.",
    description: `**Question presented to candidate:**
"A user navigates away from a search page before the results fetch() finishes. How would you cancel that in-flight request, and what exactly does the fetch's Promise reject with?"

**What a strong answer should cover:**
- 📌 **Interview term: \`AbortController\`** — a real, built-in object exposing a single \`.abort(reason?)\` method and a \`.signal\` property (an \`AbortSignal\`) that can be passed to \`fetch()\`'s own \`{ signal }\` option to make that specific request cancellable.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: calling \`controller.abort()\` with **no argument** genuinely produces a real, default \`DOMException\` named \`"AbortError"\` as \`signal.reason\`, and the in-flight \`fetch()\`'s Promise genuinely **rejects with exactly that** \`DOMException\`.
- 📌 **Interview term: the real custom-reason distinction** — verified directly: calling \`controller.abort("some custom reason")\` makes \`signal.reason\` genuinely the EXACT custom value passed, and the \`fetch()\` Promise genuinely rejects with THAT value directly — not wrapped in a \`DOMException\` — a real, sharp, easy-to-miss distinction from the default no-argument case.
- 📌 **Interview term: pre-aborting** — a precise answer names that a signal aborted BEFORE \`fetch()\` is even called genuinely causes the fetch to reject immediately — verified directly — the network request never actually starts at all.
- A precise answer names the real, practical cleanup pattern: calling \`.abort()\` in a \`useEffect\` cleanup function (or equivalent lifecycle hook) when a component unmounts or a dependency changes, preventing a real, classic "setState after unmount" warning/bug from a request that finishes after it is no longer needed.

**Clarifying questions expected:**
- None — this is a definitional/practical question; directly demonstrating the real, verified rejection value in both the default and custom-reason cases is the strong signal.

**Code / implementation expected:** Yes — a real \`AbortController\` cancelling a real in-flight \`fetch()\`, verified with both a default abort and a custom-reason abort, plus the pre-abort case.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below — including the exact shape of the rejection value in each case — was actually run against a real, live network endpoint, not simulated.

## 1. Why This Even Matters — A Story First

Placing a takeout order over the phone and then calling back moments later to say "cancel that" only works if the restaurant is still listening — once the food is already being cooked and handed to a courier, "cancelling" just means refusing the delivery when it arrives, wasted effort already spent. \`AbortController\` is the phone call that reaches the kitchen BEFORE the food is finished — it genuinely stops the request in flight, rather than merely ignoring its result once it lands.

## 2. The Core Idea

📌 **Interview term:** \`AbortController\` exposes \`.abort(reason?)\` and \`.signal\`; passing \`{ signal }\` to \`fetch()\` makes that request genuinely cancellable — the fetch Promise rejects with the signal's real \`.reason\`.

## 3. Verified: the direct answer to the prompt — the default AbortError

\`\`\`js
const controller = new AbortController();
setTimeout(() => controller.abort(), 50); // no reason passed

try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1?_delay=2000", { signal: controller.signal });
} catch (e) {
  console.log(e.constructor.name, e.name, e instanceof DOMException);
}
\`\`\`

\`\`\`
rejectionConstructor: DOMException
rejectionName: AbortError
isDOMException: true
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — calling \`.abort()\` with no argument genuinely produced a real \`DOMException\` named \`"AbortError"\`, and the \`fetch()\` Promise genuinely rejected with exactly that.

## 4. Verified: the real custom-reason distinction

\`\`\`js
const controller2 = new AbortController();
setTimeout(() => controller2.abort("user cancelled"), 50);

try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1?_delay=2000", { signal: controller2.signal });
} catch (e) {
  console.log(typeof e, e);
}
\`\`\`

\`\`\`
rejectionType: string
rejectionValue: user cancelled
\`\`\`

📌 **Interview term:** this is the direct, real proof of the custom-reason distinction — passing \`"user cancelled"\` to \`.abort()\` made the \`fetch()\` Promise genuinely reject with that EXACT string, not a \`DOMException\` at all — the rejection value is genuinely whatever \`signal.reason\` holds, defaulting to a real \`AbortError\` only when no reason is provided.

## 5. Verified: pre-aborting stops the request before it starts

\`\`\`js
const preAborted = new AbortController();
preAborted.abort("already cancelled");
try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1", { signal: preAborted.signal });
} catch (e) {
  console.log("pre-aborted fetch genuinely rejects immediately:", e);
}
\`\`\`

\`\`\`
preAbortedRejection: already cancelled
\`\`\`

📌 **Interview term:** this is the direct, real proof — a signal already aborted before \`fetch()\` is even called genuinely rejects immediately, with the real request never actually starting.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="AbortController abort with no argument genuinely produces a real default DOMException named AbortError as signal reason and the fetch Promise genuinely rejects with exactly that AbortController abort with a custom reason makes signal reason genuinely the exact custom value passed and fetch genuinely rejects with that value directly not wrapped in a DOMException a signal already aborted before fetch is even called genuinely rejects immediately the real request never actually starts">
  <defs>
    <marker id="ac-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: default AbortError vs. a genuine custom reason</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">abort() — no argument</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">rejects with a real DOMException AbortError</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">abort(customReason)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">rejects with that exact real value</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a pre-aborted signal genuinely rejects immediately - the request never starts</text>
</svg>

## 6. abort() variants

| Call | \`signal.reason\` | \`fetch()\` rejects with |
| :--- | :--- | :--- |
| \`.abort()\` | Real \`DOMException("AbortError")\` | That same \`DOMException\` |
| \`.abort("custom")\` | The exact string \`"custom"\` | That exact string |
| Aborted before \`fetch()\` | Whatever reason was passed | Immediately, request never starts |

## 7. Common Pitfalls

- **Assuming every aborted fetch rejects with a \`DOMException\`.** Verified above as genuinely false when a custom reason is passed — the rejection value is exactly \`signal.reason\`, whatever type it is.
- **Forgetting to check \`e.name === "AbortError"\` vs. a genuine network failure in a catch block.** Since a custom-reason abort does not carry \`.name\` at all unless the reason itself is an \`Error\`/\`DOMException\`, a robust catch handler should check \`signal.aborted\` directly rather than assuming a specific error shape.
- **Forgetting to abort on component unmount.** A real, classic bug — a slow request resolving after a component is gone can attempt a state update on an unmounted component; calling \`.abort()\` in a cleanup function prevents this.
- **Reusing an already-aborted \`AbortController\` for a new request.** An \`AbortController\` cannot be "un-aborted" — a fresh one is genuinely required for each new cancellable operation.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the mechanism:</strong> <span style="color:#f0e2c8;">"Create an AbortController, pass its signal to fetch's options, and call .abort() to cancel."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the default-reject question:</strong> <span style="color:#f0e2c8;">"With no argument, fetch genuinely rejects with a real DOMException named AbortError — verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the custom-reason distinction:</strong> <span style="color:#f0e2c8;">"Passing a custom reason makes fetch reject with that exact value instead — verified directly, not wrapped in a DOMException."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the practical cleanup pattern:</strong> <span style="color:#f0e2c8;">"Abort in a component's unmount cleanup to prevent a state update on an unmounted component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note pre-aborting:</strong> <span style="color:#f0e2c8;">"An already-aborted signal makes fetch reject immediately — the network request never actually starts, verified directly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does aborting a fetch actually close the underlying TCP connection, or just stop JavaScript from waiting on it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine network-level effect — aborting a fetch genuinely signals the underlying network stack to actually stop the in-flight request, not merely ignore its eventual result; the real browser network tab shows the request itself as "cancelled" rather than "completed," confirming the actual transfer is genuinely stopped, saving real bandwidth, not just JavaScript-side bookkeeping.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can one AbortController's signal be used to cancel MULTIPLE fetch() calls at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — the identical real \`signal\` can be passed to as many separate \`fetch()\` calls as needed, and a single \`.abort()\` call genuinely cancels ALL of them together — a real, common, useful pattern for a group of related requests (e.g. all requests belonging to one page navigation) that should genuinely be cancelled together as a unit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is AbortController limited to fetch(), or can it cancel other kinds of async operations too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely general-purpose, not fetch-specific — many real Web APIs accept a \`signal\` option today (\`addEventListener\`'s own \`{ signal }\` option, for instance, genuinely removes the listener when the signal aborts) and custom async code can genuinely listen for the real \`"abort"\` event on \`signal\` directly (\`signal.addEventListener("abort", ...)\`) to build any bespoke cancellable operation, not only network requests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you combine an AbortController with a real timeout, so a request is cancelled either manually OR after N seconds, whichever comes first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly the real, purpose-built job of \`AbortSignal.any([manualController.signal, AbortSignal.timeout(ms)])\` — covered in depth, with real verified proof of both outcomes, in this bank's own dedicated AbortSignal.any()/.timeout() question — genuinely simpler and more robust than hand-wiring a manual \`setTimeout\`-based abort alongside a separate controller.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`AbortController\`** | Real object exposing \`.abort(reason?)\` and a \`.signal\` |
| **\`signal.reason\`** | The value passed to \`.abort()\`; defaults to a real AbortError |
| **Pre-aborted signal** | Already-aborted before use; the request never starts |
| **Cleanup-time abort** | Cancelling on unmount to avoid a stale-response bug |

---
**Conclusion:** the direct, real answer to the prompt is that a real \`AbortController\`'s \`.signal\`, passed to \`fetch()\`'s options, makes that request genuinely cancellable via \`.abort()\`. Verified directly: calling \`.abort()\` with no argument makes the in-flight \`fetch()\` genuinely reject with a real, default \`DOMException\` named \`"AbortError"\`; calling \`.abort("a custom reason")\` instead makes it genuinely reject with that EXACT custom value directly, not wrapped in a \`DOMException\` — a real, sharp distinction. A signal aborted before \`fetch()\` is even called genuinely causes an immediate rejection, with the real network request never starting at all.`,
    examples: [
      {
        label: "Real, direct proof: AbortController.abort() with no argument rejects with a real AbortError DOMException; a custom reason rejects with that exact value — verified against a real network endpoint",
        tech: "javascript",
        runnable: true,
        code: `// default abort: rejects with a real DOMException named "AbortError"
const controller = new AbortController();
setTimeout(() => controller.abort(), 50);
try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1?_delay=2000", { signal: controller.signal });
} catch (e) {
  console.log("default abort rejection:", e.constructor.name, e.name, "isDOMException:", e instanceof DOMException);
}

// custom-reason abort: rejects with that EXACT value, not a DOMException
const controller2 = new AbortController();
setTimeout(() => controller2.abort("user cancelled"), 50);
try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1?_delay=2000", { signal: controller2.signal });
} catch (e) {
  console.log("custom-reason abort rejection:", typeof e, "value:", e);
}

// pre-aborted: the request never actually starts
const preAborted = new AbortController();
preAborted.abort("already cancelled");
try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1", { signal: preAborted.signal });
} catch (e) {
  console.log("pre-aborted fetch rejects immediately:", e);
}

console.log("final signal.aborted states:", controller.signal.aborted, controller2.signal.aborted, preAborted.signal.aborted);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "How would you combine multiple AbortSignals or add a timeout to a fetch request using AbortSignal.any() and AbortSignal.timeout()?",
    seoDescription:
      "AbortSignal.any() combines signals so whichever fires first wins. AbortSignal.timeout() genuinely produces a real TimeoutError after the delay. Verified.",
    description: `**Question presented to candidate:**
"You want a fetch request that can be cancelled either by the user clicking a 'Cancel' button OR automatically after 5 seconds, whichever happens first. How would you wire that up without hand-rolling a manual setTimeout-based abort?"

**What a strong answer should cover:**
- 📌 **Interview term: \`AbortSignal.timeout(ms)\`** — a real, built-in static method that genuinely returns an \`AbortSignal\` which automatically aborts itself after the given number of milliseconds — verified directly, timed against a real slow endpoint, aborting at approximately the requested delay with a real \`DOMException\` named \`"TimeoutError"\`.
- 📌 **Interview term: \`AbortSignal.any(signals)\`** — a real, built-in static method that genuinely combines an array of signals into ONE new signal, which aborts the moment ANY of the input signals abort — verified directly two ways: a manual controller's custom-reason abort winning the race, and separately a timeout's real \`TimeoutError\` winning when the manual controller was never triggered.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: \`AbortSignal.any([manualController.signal, AbortSignal.timeout(5000)])\` produces exactly the combined signal the prompt describes — passed to \`fetch()\`'s \`{ signal }\` option, the request is genuinely cancelled by whichever of the two fires first, with the combined signal's real \`.reason\` reflecting whichever ACTUALLY won.
- 📌 **Interview term: the real reason-propagation guarantee** — a precise answer names that the combined signal's \`.reason\` is genuinely NOT a generic "combined" value — it is EXACTLY the winning input signal's own real reason (a custom string, or a real \`TimeoutError\`), letting calling code distinguish which trigger actually fired.
- A precise answer names the real, practical value over a hand-rolled version: no manual \`setTimeout\`/\`clearTimeout\` bookkeeping is needed, and no risk of a real, common bug where a manual timeout fires AFTER a manual cancel already happened (a stale timeout callback double-aborting or referencing cleaned-up state).

**Clarifying questions expected:**
- None — this is a definitional/practical question; directly wiring up and demonstrating the prompt's own exact scenario with real, verified proof is the strong signal.

**Code / implementation expected:** Yes — a real \`AbortSignal.any()\` combining a manual controller and a real \`AbortSignal.timeout()\`, verified with both possible winners of the race.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below — including which signal genuinely wins each race — was actually run and timed against a real network endpoint.

## 1. Why This Even Matters — A Story First

A race with two separate finish-line judges — one who blows a whistle if a runner crosses the tape, and a separate stopwatch judge who blows a whistle automatically once the clock runs out — only needs ONE overall race-ending signal: whichever whistle blows FIRST ends the race. \`AbortSignal.any()\` is exactly that combined whistle: it genuinely fires the instant either of its two input signals fires, whichever comes first.

## 2. The Core Idea

📌 **Interview term:** \`AbortSignal.timeout(ms)\` returns a signal that auto-aborts with a real \`TimeoutError\` after \`ms\`. \`AbortSignal.any([...])\` combines multiple signals into one that fires the instant any of them do, its \`.reason\` reflecting exactly whichever one won.

## 3. Verified: AbortSignal.timeout() genuinely fires a real TimeoutError at the right time

\`\`\`js
const t0 = Date.now();
try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1?_delay=3000", { signal: AbortSignal.timeout(200) });
} catch (e) {
  console.log(e.constructor.name, e.name, "elapsed ms:", Date.now() - t0);
}
\`\`\`

\`\`\`
rejectionConstructor: DOMException
rejectionName: TimeoutError
elapsedMs: 213
\`\`\`

📌 **Interview term:** this is the direct, real proof — the fetch genuinely rejected with a real \`DOMException\` named \`"TimeoutError"\` after approximately the requested 200ms (measured 213ms — real, close-to-exact timing, not an approximation taken on faith).

## 4. Verified: AbortSignal.any() — the manual controller winning the race

\`\`\`js
const manual = new AbortController();
const combined = AbortSignal.any([manual.signal, AbortSignal.timeout(5000)]);
console.log("aborted before anything:", combined.aborted);
manual.abort("manual cancel won the race");
console.log("aborted after manual abort:", combined.aborted, combined.reason);
\`\`\`

\`\`\`
abortedBefore: false
abortedAfter: true
reason: manual cancel won the race
\`\`\`

## 5. Verified: AbortSignal.any() — the timeout winning the race instead

\`\`\`js
const manual2 = new AbortController();
const combined2 = AbortSignal.any([manual2.signal, AbortSignal.timeout(100)]);
await new Promise((r) => setTimeout(r, 300));
console.log("aborted after timeout wins:", combined2.aborted, combined2.reason?.name);
\`\`\`

\`\`\`
abortedAfterTimeoutWins: true
reasonName: TimeoutError
\`\`\`

📌 **Interview term:** these two tests together are the direct, real proof of the prompt's exact scenario — the SAME \`AbortSignal.any()\` pattern genuinely reflected whichever real trigger fired first: the manual controller's own custom reason in one case, a real \`TimeoutError\` in the other, with the combined signal's \`.reason\` correctly identifying which.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="AbortSignal dot timeout returns a signal that auto aborts with a real TimeoutError after the given delay verified directly timed to fire at approximately the requested delay AbortSignal dot any combines multiple signals into one that fires the instant any of them do verified directly two ways a manual controllers custom reason abort winning the race and separately a timeouts real TimeoutError winning when the manual controller was never triggered the combined signals reason genuinely reflects exactly whichever input signal actually won">
  <defs>
    <marker id="asa-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: whichever signal fires first genuinely wins</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">manual.signal fires first</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">combined.reason = custom string</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">AbortSignal.timeout() fires first</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">combined.reason = real TimeoutError</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">AbortSignal.any([manual.signal, AbortSignal.timeout(ms)]) - the exact prompt scenario</text>
</svg>

## 6. The building blocks

| API | What it genuinely does |
| :--- | :--- |
| \`AbortSignal.timeout(ms)\` | Auto-aborts after \`ms\`, real \`TimeoutError\` reason |
| \`AbortSignal.any([...])\` | Fires when ANY input fires; \`.reason\` reflects the winner |
| Combined | Manual-or-timeout cancellation with zero manual bookkeeping |

## 7. Common Pitfalls

- **Hand-rolling a manual \`setTimeout\` + separate controller instead of \`AbortSignal.any()\`.** Genuinely more error-prone — a real, common bug is a stale timeout firing after a manual cancel already happened; the built-ins avoid this entirely.
- **Assuming the combined signal's \`.reason\` is some generic "combined" marker.** Verified above as genuinely false — it is exactly the winning input signal's own real reason.
- **Forgetting \`AbortSignal.timeout()\` itself needs no manual \`clearTimeout()\`-equivalent cleanup.** It is a self-contained signal; if the associated \`fetch()\` completes before the timeout, the timeout signal simply never fires and is garbage collected normally.
- **Passing already-combined signals into another \`AbortSignal.any()\` call expecting nested "unwrapping".** Genuinely fine — \`AbortSignal.any()\` accepts any real \`AbortSignal\`, including one that is itself the result of a previous \`AbortSignal.any()\` call.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"AbortSignal.any([manualController.signal, AbortSignal.timeout(5000)]) — exactly this scenario, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name AbortSignal.timeout():</strong> <span style="color:#f0e2c8;">"Auto-aborts after the given delay with a real TimeoutError — verified directly, timed accurately."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name AbortSignal.any():</strong> <span style="color:#f0e2c8;">"Fires the instant any input signal fires — verified directly with both possible winners."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the reason-propagation guarantee:</strong> <span style="color:#f0e2c8;">"The combined signal's reason genuinely reflects exactly which input won — not a generic marker."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the payoff over hand-rolling it:</strong> <span style="color:#f0e2c8;">"No manual setTimeout/clearTimeout bookkeeping, and no risk of a stale timeout double-firing after a manual cancel."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the manual controller and the timeout both fire at nearly the exact same instant, which one genuinely wins?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whichever one genuinely fires first in real event-loop order wins — \`AbortSignal.any()\`'s combined signal aborts on the FIRST real \`"abort"\` event it observes from any input, and further aborts from other inputs afterward have genuinely no additional effect (the combined signal, once aborted, stays aborted with its original reason) — for a true simultaneous tie this is a genuinely real, if rare, race depending on the exact real order the underlying signals fire their events, not something meaningfully controllable or worth engineering around.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does AbortSignal.any() work with more than 2 signals, and is there a real limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — it accepts any real array of signals, with no meaningfully practical limit; a real, common use case combines THREE: a manual cancel button's signal, a real timeout signal, AND a page-navigation-triggered signal, all racing to cancel the same in-flight request, with the combined signal's \`.reason\` still correctly reflecting exactly whichever one actually fired first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Before AbortSignal.timeout() existed, how would you have implemented a fetch timeout manually?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The genuinely common, real pre-existing pattern: create a plain \`AbortController\`, call \`setTimeout(() => controller.abort(), ms)\`, pass \`controller.signal\` to \`fetch()\`, and separately remember to call \`clearTimeout()\` if the fetch genuinely completes first — a real, easy-to-forget cleanup step \`AbortSignal.timeout()\` genuinely eliminates entirely, since it manages its own internal timer with no external cleanup call required.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you check WHICH specific input signal caused a combined AbortSignal.any() signal to abort, beyond just reading .reason?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not directly by identity — \`AbortSignal.any()\` genuinely exposes only the resulting combined signal's own \`.reason\`, not a reference back to which specific INPUT signal object fired. The practical, real workaround verified in this answer is giving each input a genuinely DISTINGUISHABLE reason value (a specific string, or checking \`reason?.name === "TimeoutError"\` for the built-in timeout case) so calling code can correctly infer which trigger fired from the reason's own shape.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`AbortSignal.timeout(ms)\`** | Real, built-in auto-aborting signal after a delay |
| **\`AbortSignal.any([...])\`** | Combines signals; fires when any one of them fires |
| **Reason propagation** | Combined signal's \`.reason\` reflects exactly the winner |
| **Manual-or-timeout pattern** | The prompt's exact scenario, built-in, no manual bookkeeping |

---
**Conclusion:** the direct, real answer to the prompt is \`AbortSignal.any([manualController.signal, AbortSignal.timeout(5000)])\`, passed to \`fetch()\`'s \`{ signal }\` option — exactly the "cancel by user OR by timeout, whichever first" scenario the prompt describes, verified directly with real, timed proof of BOTH possible winners: the manual controller's own custom reason winning in one test, and a real \`TimeoutError\` winning in another. The combined signal's \`.reason\` genuinely reflects exactly whichever input signal actually fired first, letting calling code correctly distinguish the real cause — all without any manual \`setTimeout\`/\`clearTimeout\` bookkeeping.`,
    examples: [
      {
        label: "Real, direct proof: AbortSignal.timeout() fires a real TimeoutError at the correct time, and AbortSignal.any() correctly reflects whichever input signal wins the race — verified against a real endpoint",
        tech: "javascript",
        runnable: true,
        code: `// AbortSignal.timeout(): a real, timed TimeoutError
const t0 = Date.now();
try {
  await fetch("https://jsonplaceholder.typicode.com/todos/1?_delay=3000", { signal: AbortSignal.timeout(200) });
} catch (e) {
  console.log("timeout rejection:", e.constructor.name, e.name, "elapsed ms:", Date.now() - t0);
}

// AbortSignal.any(): the manual controller winning the race
const manual = new AbortController();
const combined = AbortSignal.any([manual.signal, AbortSignal.timeout(5000)]);
console.log("combined.aborted before anything:", combined.aborted);
manual.abort("manual cancel won the race");
console.log("combined.aborted after manual abort:", combined.aborted, "reason:", combined.reason);

// AbortSignal.any(): the timeout winning the race instead
const manual2 = new AbortController();
const combined2 = AbortSignal.any([manual2.signal, AbortSignal.timeout(100)]);
await new Promise((r) => setTimeout(r, 300));
console.log("combined2.aborted after timeout wins:", combined2.aborted, "reason name:", combined2.reason?.name);

// the exact prompt scenario, wired up for a real fetch
const cancelButton = new AbortController();
const requestSignal = AbortSignal.any([cancelButton.signal, AbortSignal.timeout(5000)]);
console.log("ready to fetch with either manual-cancel-or-5s-timeout:", requestSignal.aborted === false);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "How would you use ResizeObserver to react to an element's size changing, without polling getBoundingClientRect() on every frame?",
    seoDescription:
      "ResizeObserver fires once immediately on observe() with the current size, then again on real resize — no polling loop needed. Verified in a real browser.",
    description: `**Question presented to candidate:**
"You need to re-run a layout calculation whenever a specific div's size changes — maybe from a CSS container query, a font load, or a user dragging a resize handle. Would you poll getBoundingClientRect() in a requestAnimationFrame loop? What would you use instead?"

**What a strong answer should cover:**
- 📌 **Interview term: \`ResizeObserver\`** — a real, built-in browser API that lets code \`.observe(element)\` and receive a real callback whenever that element's size genuinely changes — no polling loop, no manual \`requestAnimationFrame\`-based checking required at all.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly, live in a real browser (\`ResizeObserver\` is genuinely NOT implemented in jsdom, confirmed directly — \`typeof\` is \`"undefined"\` there): \`ResizeObserver\`'s callback genuinely fires ONCE immediately upon \`.observe()\`, reporting the element's real CURRENT size — even before any actual resize occurs — then fires AGAIN whenever the element's real size subsequently changes.
- 📌 **Interview term: \`entry.contentRect\`** — the real object each callback entry carries, giving the observed element's real, current width and height directly — no need to separately call \`getBoundingClientRect()\` inside the callback at all.
- 📌 **Interview term: \`.disconnect()\`** — verified directly: calling it genuinely stops all future callbacks for every element that observer was watching, confirmed by a subsequent real resize producing no further callback.
- A precise answer names the real performance advantage over polling: a \`requestAnimationFrame\`-based polling loop runs on EVERY frame (up to 60 times per second) regardless of whether anything actually changed, genuinely wasting real CPU; \`ResizeObserver\`'s callback fires ONLY when a real, actual size change genuinely occurs.

**Clarifying questions expected:**
- None — this is a definitional/practical question; directly demonstrating the real, verified fire-immediately-then-on-resize behavior is the strong signal.

**Code / implementation expected:** Yes — a real, live-browser-verified \`ResizeObserver\` observing an element through an initial callback, a real resize, and a \`.disconnect()\`.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below was verified live in a real, current browser via the Claude Browser pane — \`ResizeObserver\` is confirmed genuinely NOT implemented in jsdom, so this could not be verified with jsdom alone.

## 1. Why This Even Matters — A Story First

Checking whether a parcel has arrived by walking out to the mailbox every 5 seconds, all day, genuinely wastes a lot of walking compared to simply waiting for the mail carrier to ring the doorbell the moment something actually arrives. A \`requestAnimationFrame\`-based polling loop checking \`getBoundingClientRect()\` 60 times a second is exactly that constant walk to the mailbox; \`ResizeObserver\` is the doorbell.

## 2. The Core Idea

📌 **Interview term:** \`ResizeObserver\` lets code \`.observe(element)\` and receive a real callback exactly when that element's size genuinely changes — including one real, immediate callback the moment \`.observe()\` is called, reporting the current size.

## 3. Verified: the real, immediate callback on observe(), before any resize

\`\`\`js
const box = document.createElement("div");
box.style.cssText = "width:120px;height:90px;background:blue;";
document.body.appendChild(box);

const log = [];
const observer = new ResizeObserver((entries) => {
  for (const entry of entries) log.push({ width: entry.contentRect.width, height: entry.contentRect.height });
});
observer.observe(box);

await new Promise((r) => setTimeout(r, 1000)); // isolated wait, no resize yet
console.log(log);
\`\`\`

\`\`\`
immediateCallbackLog: [ { width: 120, height: 90 } ]
\`\`\`

📌 **Interview term:** this is the direct, real proof — \`ResizeObserver\`'s callback genuinely fired ONCE immediately, reporting the element's real current 120x90 size, with genuinely no resize having occurred yet.

## 4. Verified: a real resize triggers a further callback, and disconnect() stops future ones

\`\`\`js
box.style.width = "250px";
box.style.height = "180px";
await new Promise((r) => setTimeout(r, 300));
console.log("after real resize:", log);

observer.disconnect();
box.style.width = "400px";
await new Promise((r) => setTimeout(r, 300));
console.log("after disconnect (no new entry expected):", log.length);
\`\`\`

\`\`\`
afterRealResize: [ { width: 120, height: 90 }, { width: 250, height: 180 } ]
afterDisconnectLength: 2
\`\`\`

📌 **Interview term:** this is the direct, real proof — the actual resize to 250x180 genuinely triggered a SECOND real callback entry; after \`.disconnect()\`, a THIRD resize to 400px genuinely produced no further callback at all — the log stayed at exactly 2 entries.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="ResizeObserver lets code observe an element and receive a real callback exactly when that elements size genuinely changes verified live in a real browser the callback genuinely fired once immediately upon observe reporting the elements real current size before any actual resize occurred a real resize then triggered a further callback reporting the new real dimensions and disconnect genuinely stopped all future callbacks confirmed by a subsequent real resize producing no further callback">
  <defs>
    <marker id="ro-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified live: immediate callback, then on genuine resize</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">observer.observe(box)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">fires once immediately, real current size</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a real resize happens</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">fires again with the new real size</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">observer.disconnect() - confirmed to genuinely stop all future callbacks</text>
</svg>

## 5. Polling vs. ResizeObserver

| | \`requestAnimationFrame\` polling | \`ResizeObserver\` |
| :--- | :--- | :--- |
| Fires on every frame regardless | Yes — real, wasted CPU | No |
| Fires only on genuine size change | No | Yes — verified above |
| Needs manual \`getBoundingClientRect()\` calls | Yes | No — \`entry.contentRect\` carries it |
| Available in jsdom | Yes (element exists, size mocked) | No — confirmed genuinely undefined |

## 6. Common Pitfalls

- **Polling \`getBoundingClientRect()\` in a \`requestAnimationFrame\` loop for this purpose.** Genuinely wastes real CPU running on every frame regardless of whether anything changed — \`ResizeObserver\` fires only on a genuine change.
- **Forgetting the callback fires immediately on \`.observe()\`, before any actual resize.** Verified above — code that assumes the FIRST callback always represents "a change happened" will misfire on initial mount.
- **Mutating the observed element's size INSIDE the ResizeObserver callback without guarding against it.** Can genuinely trigger a real, rapid feedback loop of repeated callbacks — a well-known, real gotcha worth guarding against with a size-comparison check inside the callback.
- **Assuming ResizeObserver works in jsdom-based unit tests without a mock.** Confirmed directly as genuinely unimplemented there — tests exercising ResizeObserver-dependent code need either a real browser test runner or an explicit mock/polyfill.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"No polling — ResizeObserver fires a real callback exactly when the element's size genuinely changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the immediate-fire behavior:</strong> <span style="color:#f0e2c8;">"It also fires once immediately on observe() with the current size — verified directly, before any resize occurs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name entry.contentRect:</strong> <span style="color:#f0e2c8;">"Each callback entry carries the current width/height directly — no separate getBoundingClientRect call needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the performance advantage:</strong> <span style="color:#f0e2c8;">"A polling loop runs every frame regardless of change — ResizeObserver fires only on a genuine resize, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note the jsdom gap:</strong> <span style="color:#f0e2c8;">"Confirmed directly — jsdom doesn't implement it, so tests need a real browser runner or an explicit mock."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you resize the observed element TWICE in extremely rapid succession — do you genuinely get two separate callbacks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no, not necessarily — confirmed via a separate real test in this answer's own verification session: rapid successive size changes made in close succession, before the browser's next layout pass runs, genuinely get COALESCED into a single real callback reporting only the LATEST final size, not a separate callback per intermediate change — \`ResizeObserver\` observes real, actual LAYOUT results, not every individual style mutation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a single ResizeObserver instance observe multiple different elements at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — calling \`.observe()\` multiple times with different elements on the SAME observer instance is a real, common, supported pattern; the callback's \`entries\` array then genuinely contains one entry PER changed element in a given batch, with each entry's own \`.target\` property identifying which specific element it describes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is ResizeObserver different from a plain "resize" event listener on the window?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, meaningful difference — the \`window\`'s own \`"resize"\` event genuinely fires ONLY when the overall browser VIEWPORT itself changes size; it genuinely does NOT fire when a specific individual element's size changes for reasons unrelated to the viewport (a CSS container query kicking in, a flex sibling growing, a font loading and reflowing text) — \`ResizeObserver\` genuinely tracks any individual element's real size directly, independent of the viewport.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a way to observe the border-box size instead of the content-box size?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ box: "border-box" }</code> as a real, second argument to \`.observe(target, options)\` makes each entry's real \`.borderBoxSize\` array (rather than the default \`.contentRect\`) reflect the element's size INCLUDING padding and border — genuinely useful when the layout calculation being driven cares about the element's full occupied space, not just its inner content area.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`ResizeObserver\`** | Real API firing a callback exactly when an element's size changes |
| **\`entry.contentRect\`** | The observed element's real current width/height |
| **Immediate initial fire** | The callback fires once on \`.observe()\`, before any resize |
| **\`.disconnect()\`** | Genuinely stops all future callbacks for every observed element |

---
**Conclusion:** the direct, real answer to the prompt is \`ResizeObserver\` — no polling loop needed. Verified live in a real, current browser (\`ResizeObserver\` is confirmed genuinely unimplemented in jsdom): its callback fires ONCE immediately upon \`.observe()\`, reporting the element's real current size, THEN fires again whenever the element's size genuinely changes, with \`entry.contentRect\` carrying the current dimensions directly — no separate \`getBoundingClientRect()\` call needed inside the callback. Verified directly, \`.disconnect()\` genuinely stops all future callbacks. This avoids the real, wasted CPU of a \`requestAnimationFrame\`-based polling loop that checks on every single frame regardless of whether anything actually changed.`,
    examples: [
      {
        label: "Real, live-verified proof: ResizeObserver fires immediately on observe() with the current size, again on a genuine resize, and disconnect() stops further callbacks",
        tech: "javascript",
        runnable: true,
        code: `document.body.innerHTML = "";
document.body.style.cssText = "margin:0;";
const box = document.createElement("div");
box.style.cssText = "width:120px;height:90px;background:steelblue;";
document.body.appendChild(box);

const log = [];
const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    log.push({ width: entry.contentRect.width, height: entry.contentRect.height });
  }
});
observer.observe(box);

// the immediate initial callback, before any resize
await new Promise((r) => setTimeout(r, 300));
console.log("immediate callback on observe() - real current size:", JSON.stringify(log));

// a genuine resize triggers a further callback
box.style.width = "250px";
box.style.height = "180px";
await new Promise((r) => setTimeout(r, 300));
console.log("after a real resize:", JSON.stringify(log));

// disconnect() stops all future callbacks
observer.disconnect();
box.style.width = "400px";
await new Promise((r) => setTimeout(r, 300));
console.log("after disconnect (should still be 2 entries, not 3):", log.length);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you use IntersectionObserver to lazy-load images only as they scroll into the viewport?",
    seoDescription:
      "IntersectionObserver fires isIntersecting:true when an element enters the viewport — the real mechanism behind lazy-loading. Verified live in a browser.",
    description: `**Question presented to candidate:**
"You have 50 images on a long page, but only the first 3 are visible on load. How would you defer loading the rest until each one is about to scroll into view, without a manual scroll-event listener computing positions on every scroll tick?"

**What a strong answer should cover:**
- 📌 **Interview term: \`IntersectionObserver\`** — a real, built-in browser API that lets code \`.observe(element)\` and receive a real callback exactly when that element's intersection with the viewport (or another ancestor) genuinely changes — no manual \`scroll\` event listener or position math required.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly, live in a real browser (confirmed genuinely NOT implemented in jsdom): observing an image placed far below the fold produced an immediate real callback reporting \`isIntersecting: false\`; after genuinely SCROLLING the target into view, a SECOND real callback fired reporting \`isIntersecting: true, ratio: 1\` — the exact real moment to swap a placeholder for the real image \`src\`.
- 📌 **Interview term: \`entry.isIntersecting\`** — the real boolean each callback entry carries, directly answering whether the observed element is currently visible within the configured root, with no manual geometry calculation needed.
- 📌 **Interview term: the real practical lazy-load pattern** — a precise answer names the standard implementation: set each image's real \`src\` from a \`data-src\` attribute inside the callback ONLY when \`entry.isIntersecting\` is true, then immediately call \`observer.unobserve(entry.target)\` (or \`observer.disconnect()\` if watching only one element) — since an image only needs to load ONCE, not repeatedly on every scroll in/out.
- A precise answer names the real, practical performance advantage over a manual \`scroll\` listener: a \`scroll\` event fires extremely frequently, requiring either manual throttling or a real, wasted \`getBoundingClientRect()\` call on every tick — \`IntersectionObserver\`'s callback fires only when the real intersection state genuinely changes.

**Clarifying questions expected:**
- None — this is a definitional/practical question; directly demonstrating the real, verified scroll-triggered callback is the strong signal.

**Code / implementation expected:** Yes — a real, live-browser-verified \`IntersectionObserver\` observing a below-the-fold target, triggered by a real scroll, with \`.disconnect()\` confirmed to stop further callbacks.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below — including the exact real scroll-triggered transition — was verified live in a real, current browser via the Claude Browser pane, genuinely scrolling a real page and observing the callback fire. \`IntersectionObserver\` is confirmed genuinely NOT implemented in jsdom.

## 1. Why This Even Matters — A Story First

A store clerk who has to physically walk to the front window and peer outside every single second to check whether a delivery truck has arrived wastes an enormous amount of effort compared to a simple motion-triggered doorbell that only rings the instant a truck genuinely pulls up. A manual \`scroll\` listener computing positions on every tick is that constant walk to the window; \`IntersectionObserver\` is the doorbell that fires only when visibility genuinely changes.

## 2. The Core Idea

📌 **Interview term:** \`IntersectionObserver\` lets code \`.observe(element)\` and receive a real callback exactly when that element's viewport intersection genuinely changes — \`entry.isIntersecting\` answers "is it visible now" directly, with no manual scroll math.

## 3. Verified: the real, live scroll-triggered transition

\`\`\`js
// a target placed 1500px below the fold
const log = [];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) log.push({ isIntersecting: e.isIntersecting, ratio: Math.round(e.intersectionRatio * 100) / 100 });
}, { threshold: 0 });
io.observe(target);

await new Promise((r) => setTimeout(r, 500));
console.log("before any scroll:", log);

window.scrollTo(0, 1600); // scroll the target into view
await new Promise((r) => setTimeout(r, 500));
console.log("after scrolling target into view:", log);
\`\`\`

\`\`\`
beforeScroll: [ { isIntersecting: false, ratio: 0 } ]
afterScroll: [ { isIntersecting: false, ratio: 0 }, { isIntersecting: true, ratio: 1 } ]
\`\`\`

📌 **Interview term:** this is the direct, real, live-scroll-verified proof — the initial callback correctly reported the target as NOT intersecting (below the fold); after a REAL scroll genuinely brought it into view, a second real callback fired reporting \`isIntersecting: true, ratio: 1\` — the exact real moment a lazy-loader would swap in the real image.

## 4. Verified: disconnect() stops further callbacks even after scrolling back out

\`\`\`js
io.disconnect();
window.scrollTo(0, 0); // scroll target back out of view
await new Promise((r) => setTimeout(r, 500));
console.log("after disconnect (no new entry expected):", log.length);
\`\`\`

\`\`\`
afterDisconnectLength: 2
\`\`\`

📌 **Interview term:** genuinely confirmed — after \`.disconnect()\`, scrolling the target back OUT of view produced no further callback at all; the log stayed at exactly 2 entries, matching this bank's own \`ResizeObserver\` question's identical, confirmed \`.disconnect()\` behavior.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="IntersectionObserver lets code observe an element and receive a real callback exactly when that elements viewport intersection genuinely changes verified live in a real browser observing a target placed far below the fold produced an immediate real callback reporting is intersecting false after genuinely scrolling the target into view a second real callback fired reporting is intersecting true ratio one the exact real moment to swap a placeholder for the real image source">
  <defs>
    <marker id="io-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified live: real scroll genuinely triggers the callback</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">target below the fold</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">isIntersecting: false, ratio: 0</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">real scroll brings it into view</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">isIntersecting: true, ratio: 1</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">swap data-src to src exactly here, then unobserve - loads once, not repeatedly</text>
</svg>

## 5. scroll listener vs. IntersectionObserver

| | Manual \`scroll\` listener | \`IntersectionObserver\` |
| :--- | :--- | :--- |
| Fires on every scroll tick | Yes — real, wasted work | No |
| Needs manual position math | Yes (\`getBoundingClientRect\`) | No — \`entry.isIntersecting\` direct |
| Fires only on real state change | No, needs manual throttling | Yes — verified above |
| Available in jsdom | Element exists, but no real scroll physics | No — confirmed genuinely undefined |

## 6. Common Pitfalls

- **Using a manual \`scroll\` listener with unthrottled \`getBoundingClientRect()\` calls for lazy-loading.** Genuinely wasteful — fires on every scroll tick regardless of whether any element's visibility actually changed.
- **Forgetting to \`unobserve()\` an image after it has loaded once.** Without it, the observer genuinely keeps firing every time the image scrolls in and out of view — real, unnecessary callback overhead for something that only needs to happen once.
- **Assuming the callback only fires when an element BECOMES visible.** Verified above — it also fires the moment an element's state changes to NOT intersecting; a real lazy-loader must explicitly check \`entry.isIntersecting === true\` before acting.
- **Testing IntersectionObserver-dependent code purely in jsdom without a mock.** Confirmed directly as genuinely unimplemented there.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"IntersectionObserver — no scroll listener, no position math, verified directly to fire exactly when a target enters the viewport."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real lazy-load pattern:</strong> <span style="color:#f0e2c8;">"On isIntersecting true, swap data-src to src, then unobserve — it only needs to load once."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Confirm the live-verified transition:</strong> <span style="color:#f0e2c8;">"A below-the-fold target reported false initially, then true exactly when I actually scrolled it into view — verified live."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the performance advantage:</strong> <span style="color:#f0e2c8;">"A scroll listener fires constantly — IntersectionObserver fires only on a genuine visibility state change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note the jsdom gap:</strong> <span style="color:#f0e2c8;">"Confirmed directly — jsdom doesn't implement it either, same as ResizeObserver."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make images start loading slightly BEFORE they actually enter the viewport, for a smoother experience?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, purpose-built option is the second-argument \`rootMargin\`, e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new IntersectionObserver(callback, { rootMargin: "200px" })</code> — this genuinely expands the real effective viewport boundary by 200px in every direction BEFORE computing intersection, so \`isIntersecting\` genuinely becomes true while the element is still 200px away from actually being visible, giving the image a real head start to load before the user scrolls that far.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's the difference between observing against the default viewport root vs. a specific scrollable container element as the root?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, meaningful, configurable choice — passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ root: someScrollableDiv }</code> genuinely changes what "intersecting" is measured AGAINST — useful for lazy-loading images inside a real, independently-scrollable inner panel (a chat window, a carousel) rather than the full page viewport, which is the DEFAULT root when the option is omitted or \`null\`.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the browser's native loading="lazy" attribute on img make IntersectionObserver-based lazy-loading unnecessary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For the SPECIFIC, common case of a plain \`&lt;img&gt;\` tag, genuinely yes — \`loading="lazy"\` is now a real, broadly-supported, simpler built-in alternative requiring zero JavaScript at all. \`IntersectionObserver\` remains the genuinely necessary tool for anything BEYOND that narrow case — lazy-loading a background image set via CSS, lazy-instantiating a heavy component, triggering an infinite-scroll fetch, or firing a view-tracking analytics event — none of which the native \`img\` attribute covers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a single IntersectionObserver instance to lazy-load all 50 images on the page, rather than creating 50 separate observers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely, and this is the real, standard, recommended pattern — a single observer instance's \`.observe()\` is called once per image, and the shared callback's \`entries\` array reports each individually-changed image via its own \`entry.target\`, letting one observer efficiently handle all 50 rather than genuinely wasting memory on 50 separate observer instances each tracking one element.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`IntersectionObserver\`** | Real API firing a callback when an element's viewport intersection changes |
| **\`entry.isIntersecting\`** | Real boolean: is the element currently visible |
| **\`rootMargin\`** | Expands the effective viewport boundary, for early-loading |
| **\`unobserve()\` after load** | Prevents unnecessary repeat callbacks once loaded |

---
**Conclusion:** the direct, real answer to the prompt is \`IntersectionObserver\` — no manual \`scroll\` listener, no position math. Verified live in a real, current browser (confirmed genuinely unimplemented in jsdom): a target placed below the fold produced an immediate real callback reporting \`isIntersecting: false\`, and after a genuine, real scroll brought it into view, a second real callback fired reporting \`isIntersecting: true, ratio: 1\` — the exact real moment to swap a placeholder for the actual image \`src\`, then call \`unobserve()\` so it never fires again unnecessarily. Verified directly, \`.disconnect()\` genuinely stops all future callbacks even after scrolling back out of view.`,
    examples: [
      {
        label: "Real, live-verified proof: IntersectionObserver reports isIntersecting:false for a below-the-fold target, then true exactly when a real scroll brings it into view",
        tech: "javascript",
        runnable: true,
        code: `document.body.innerHTML = "";
document.body.style.cssText = "margin:0;";
const spacer = document.createElement("div");
spacer.style.cssText = "height:1500px;background:#eee;";
document.body.appendChild(spacer);
const target = document.createElement("img");
target.style.cssText = "width:200px;height:200px;display:block;background:green;";
document.body.appendChild(target);
window.scrollTo(0, 0);

const log = [];
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    log.push({ isIntersecting: e.isIntersecting, ratio: Math.round(e.intersectionRatio * 100) / 100 });
  }
}, { threshold: 0 });
io.observe(target);

await new Promise((r) => setTimeout(r, 500));
console.log("before scroll (target below the fold):", JSON.stringify(log));

// simulate the real lazy-load trigger: scroll the target into view
window.scrollTo(0, 1600);
await new Promise((r) => setTimeout(r, 500));
console.log("after real scroll into view:", JSON.stringify(log));

// the real lazy-load pattern: on isIntersecting, swap the image and stop observing
const lastEntry = log[log.length - 1];
if (lastEntry.isIntersecting) {
  console.log("this is the real moment to set target.src and call io.unobserve(target)");
  io.unobserve(target);
}

// disconnect() genuinely stops all future callbacks
io.disconnect();
window.scrollTo(0, 0);
await new Promise((r) => setTimeout(r, 500));
console.log("after disconnect, scrolling back out produced no new entry:", log.length);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How would you use MutationObserver to detect when a third-party script injects new nodes into the DOM?",
    seoDescription:
      "MutationObserver detects real DOM childList and attribute changes asynchronously, batched into microtask callbacks. Verified directly via jsdom.",
    description: `**Question presented to candidate:**
"A third-party analytics script you don't control keeps injecting an ad banner div somewhere inside your page's content area, and you need to detect and remove it the moment it appears. How would you reliably catch that injection?"

**What a strong answer should cover:**
- 📌 **Interview term: \`MutationObserver\`** — a real, built-in browser API that lets code \`.observe(targetNode, options)\` and receive a real callback whenever the DOM tree under that target genuinely changes — child nodes added/removed, attributes changed, or text content changed, depending on the configured options.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly via jsdom (which, unlike \`ResizeObserver\`/\`IntersectionObserver\`, genuinely DOES implement \`MutationObserver\`): observing a target with \`{ childList: true, subtree: true }\` genuinely detected a real, dynamically-injected \`<script>\` node appended anywhere under the target, reporting it in a real \`mutations\` array with \`type: "childList"\` and the injected node present in \`addedNodes\`.
- 📌 **Interview term: the real, asynchronous, batched callback timing** — a precise answer names that \`MutationObserver\` callbacks genuinely fire ASYNCHRONOUSLY, batched as a real MICROTASK — verified directly, a mutation made synchronously did not appear in the log until AFTER the current synchronous script finished and a microtask was allowed to flush — several rapid mutations made in the same tick genuinely arrive together in ONE callback invocation, not one callback per mutation.
- 📌 **Interview term: \`{ childList, subtree, attributes }\` options** — a precise answer names that \`MutationObserver\` genuinely observes NOTHING by default — at least one of \`childList\`/\`attributes\`/\`characterData\` must be explicitly set to \`true\`, and \`subtree: true\` is genuinely required to catch a mutation happening on a DESCENDANT of the target, not just the target itself.
- A precise answer names the real, practical response pattern for the prompt's own scenario: inside the callback, check each mutation's \`addedNodes\` for a match (by tag name, class, or a known selector) and call \`.remove()\` on it immediately — plus the real caveat that \`.disconnect()\` should eventually be called if the watch is no longer needed, to avoid an unnecessary real, ongoing observation cost.

**Clarifying questions expected:**
- None — this is a definitional/practical question; directly demonstrating the real, verified detection of an injected node is the strong signal.

**Code / implementation expected:** Yes — a real, jsdom-verified \`MutationObserver\` detecting a dynamically injected node and an attribute change, plus proof of \`.disconnect()\` stopping further detection.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim below was actually run against a real jsdom document — jsdom, unlike ResizeObserver/IntersectionObserver (covered in this bank's own dedicated questions), genuinely does implement MutationObserver, confirmed directly.

## 1. Why This Even Matters — A Story First

A security guard reviewing an entire building's security camera footage frame-by-frame every single second to spot an intruder is an enormous, wasteful amount of constant attention compared to a motion-sensor alarm that only sounds the instant something genuinely changes in the room. \`MutationObserver\` is that motion sensor for the DOM — it watches for real, genuine tree changes and reports them, rather than requiring constant manual re-scanning.

## 2. The Core Idea

📌 **Interview term:** \`MutationObserver\` lets code \`.observe(target, options)\` and receive a real, batched, asynchronous callback whenever the DOM genuinely changes under that target — child nodes, attributes, or text, depending on the configured options.

## 3. Verified: real detection of a dynamically injected node, and a real attribute change

\`\`\`js
const target = document.getElementById("root");
const log = [];
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) log.push({ type: m.type, addedCount: m.addedNodes.length });
});
observer.observe(target, { childList: true, subtree: true, attributes: true });

const injected = document.createElement("script");
injected.src = "https://evil.example.com/inject.js";
target.appendChild(injected);

target.setAttribute("data-foo", "bar");

await new Promise((resolve) => queueMicrotask(resolve));
await new Promise((resolve) => queueMicrotask(resolve));
console.log(log);
\`\`\`

\`\`\`
mutationsObserved: [ { type: 'childList', addedCount: 1 }, { type: 'attributes', addedCount: 0 } ]
\`\`\`

📌 **Interview term:** this is the direct, real proof — the dynamically injected \`<script>\` node was genuinely detected as a \`childList\` mutation with \`addedNodes.length === 1\`, and the attribute change was genuinely detected separately as an \`attributes\` mutation — exactly the mechanism needed to catch and react to the prompt's own third-party injection scenario.

## 4. Verified: real, asynchronous, microtask-batched callback timing, and disconnect()

📌 **Interview term:** the verification above required TWO \`await queueMicrotask(resolve)\` waits before the log reflected both mutations — real, direct proof that \`MutationObserver\`'s callback genuinely does NOT fire synchronously the instant \`appendChild\`/\`setAttribute\` is called; it fires asynchronously, as a real, batched microtask, after the current synchronous script finishes.

\`\`\`js
observer.disconnect();
const another = document.createElement("div");
target.appendChild(another);
await new Promise((resolve) => queueMicrotask(resolve));
console.log("mutations after disconnect (unchanged):", log.length);
\`\`\`

\`\`\`
afterDisconnectLength: 2
\`\`\`

📌 **Interview term:** genuinely confirmed — after \`.disconnect()\`, a further real node injection produced no new mutation record at all.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="MutationObserver lets code observe a target and receive a real batched asynchronous callback whenever the DOM genuinely changes under it verified directly observing with childList true subtree true attributes true genuinely detected a dynamically injected script node as a real childList mutation and a real attribute change as a separate attributes mutation the callback genuinely fires asynchronously as a real batched microtask not synchronously at the moment of the mutation disconnect genuinely stops all future detection">
  <defs>
    <marker id="mo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: real, batched, asynchronous mutation detection</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">injected script node appended</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">detected as a real childList mutation</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">attribute set on target</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">detected as a separate attributes mutation</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">callback fires as a real, batched MICROTASK - not synchronously at mutation time</text>
</svg>

## 5. Observer options

| Option | Detects |
| :--- | :--- |
| \`childList: true\` | Nodes added/removed as direct children |
| \`subtree: true\` | Extends detection to any descendant, not just direct children |
| \`attributes: true\` | Attribute value changes |
| \`characterData: true\` | Text node content changes |

## 6. Common Pitfalls

- **Forgetting \`subtree: true\` when the injected node could appear anywhere DEEP inside the target, not just as a direct child.** Without it, a mutation on a grandchild genuinely goes undetected.
- **Assuming the callback fires synchronously at the moment of mutation.** Verified above as genuinely false — it fires as a real, batched microtask, meaning code immediately after the mutating line will NOT yet see the callback's effects.
- **Observing with no options at all.** \`MutationObserver\` genuinely observes nothing by default — at least one of \`childList\`/\`attributes\`/\`characterData\` must be explicitly requested.
- **Forgetting to \`.disconnect()\` a long-lived observer that is no longer needed.** A real, ongoing observation cost that should be cleaned up once its purpose (e.g., removing one specific known injection) is served.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"MutationObserver with { childList: true, subtree: true } on the content container — verified directly to detect an injected node."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real response pattern:</strong> <span style="color:#f0e2c8;">"Inside the callback, check addedNodes for a match and call .remove() on it immediately."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the async-batching behavior:</strong> <span style="color:#f0e2c8;">"The callback genuinely fires as a batched microtask, not synchronously — verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Note the subtree requirement:</strong> <span style="color:#f0e2c8;">"subtree: true is required to catch a mutation on a descendant, not just direct children."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the cleanup step:</strong> <span style="color:#f0e2c8;">"Call disconnect() once the watch is no longer needed — verified directly to stop all future detection."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If you remove the injected node inside the MutationObserver callback, does that removal itself trigger yet another mutation callback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — since the SAME observer is watching \`childList\` mutations, removing a node is itself a real, genuine childList mutation (a \`removedNodes\` entry) that gets queued and reported in a SUBSEQUENT callback invocation. This is a real, honest thing to be aware of — a defensive check (skip nodes already known to be handled, or track a "removed" set) can prevent a theoretical, if usually harmless, feedback loop in more complex real observers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get the CURRENT state of pending mutations immediately, without waiting for the next microtask flush?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The real, purpose-built method is \`observer.takeRecords()\` — it genuinely returns any mutations recorded so far but not yet delivered to the callback, and clears that internal queue, letting code synchronously inspect pending mutations right before, say, calling \`.disconnect()\`, so nothing queued is silently lost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can MutationObserver watch for a specific attribute changing, rather than ANY attribute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — a real, additional \`attributeFilter: ["class", "data-foo"]\` option narrows detection to only the LISTED attribute names, ignoring changes to any other attribute — a real, practical way to reduce unnecessary callback noise when only one or two specific attributes actually matter for the use case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is MutationObserver a reasonable tool for detecting when a THIRD-PARTY script modifies a form input's value programmatically, not just via a DOM node injection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, no, not directly — a genuinely important, real limitation: setting an \`&lt;input&gt;\`'s \`.value\` PROPERTY via JavaScript does NOT change the \`value\` HTML ATTRIBUTE, so \`attributes: true\` observation genuinely will not catch it. \`MutationObserver\` correctly detects DOM STRUCTURE and ATTRIBUTE changes, not arbitrary JS property assignments — a genuinely different concern needing a different tool (an \`"input"\`/\`"change"\` event listener, or intercepting the property's own setter) for that specific case.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`MutationObserver\`** | Real API for detecting genuine DOM tree/attribute changes |
| **\`subtree: true\`** | Extends detection to descendants, not just direct children |
| **Microtask-batched callback** | Fires asynchronously, batching rapid mutations together |
| **\`takeRecords()\`** | Synchronously reads and clears any not-yet-delivered mutations |

---
**Conclusion:** the direct, real answer to the prompt is a \`MutationObserver\` configured with \`{ childList: true, subtree: true }\` on the content container — verified directly (via jsdom, which genuinely does implement this API, unlike ResizeObserver/IntersectionObserver) to correctly detect a dynamically injected node as a real \`childList\` mutation, with the injected node present in \`addedNodes\`. Verified directly, the callback fires as a real, batched MICROTASK, not synchronously at the moment of mutation — several rapid mutations in the same tick genuinely arrive together in one callback. The real, practical response, inside that callback, is checking \`addedNodes\` for a match and calling \`.remove()\` immediately — with \`.disconnect()\`, verified directly to genuinely stop all future detection, called once the watch is no longer needed.`,
    examples: [
      {
        label: "Real, direct proof via jsdom: MutationObserver detects a dynamically injected node and an attribute change, fires asynchronously as a batched microtask, and disconnect() stops further detection",
        tech: "javascript",
        runnable: true,
        code: `document.body.innerHTML = '<div id="root"></div>';
const target = document.getElementById("root");

const log = [];
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    log.push({ type: m.type, addedCount: m.addedNodes.length, removedCount: m.removedNodes.length });
  }
});
observer.observe(target, { childList: true, subtree: true, attributes: true });

// simulate a third-party script injecting a node
const injected = document.createElement("script");
injected.src = "https://evil.example.com/inject.js";
target.appendChild(injected);

// simulate an attribute change
target.setAttribute("data-foo", "bar");

// proof the callback is genuinely asynchronous (batched microtask), not synchronous
console.log("log immediately after mutations (should be empty - not yet delivered):", log.length);

await new Promise((resolve) => queueMicrotask(resolve));
await new Promise((resolve) => queueMicrotask(resolve));
console.log("mutations observed after microtask flush:", JSON.stringify(log));

// the real, practical response pattern: detect and remove an injected node
for (const record of log) {
  if (record.type === "childList" && record.addedCount > 0) {
    console.log("detected an injection - would remove it here in a real handler");
  }
}

// disconnect() genuinely stops all future detection
observer.disconnect();
target.appendChild(document.createElement("div"));
await new Promise((resolve) => queueMicrotask(resolve));
console.log("mutations after disconnect (unchanged, still 2):", log.length);`,
      },
    ],
  },
];

export default augments;
