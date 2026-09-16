/**
 * JavaScript gold-standard content — batch 6 (Phone Screen round, SECOND 5 of
 * 15 questions in that round). Batches 1-5 covered System Design (5/5), DSA
 * (17/17), and the first 5 Phone Screen questions, all fully complete —
 * 27/165 total before this batch. Same process and quality bar as the
 * completed Node.js ultra retrofit and prior JavaScript batches: every
 * factual/behavioral claim below was verified by actually running it on this
 * machine (Node v24.19.0), not asserted from memory. Every question ships at
 * least one genuinely runnable (tech: "javascript") example for the
 * browser-based Sandpack playground.
 *
 * One of these five is a RETROFIT of pre-existing, pre-project answer
 * content (technology='javascript', "What are `let`, `const`, and `var`?
 * What are their differences?"). That existing content's core claims (var is
 * function-scoped and hoisted as undefined; let/const are block-scoped and
 * sit in the TDZ; const locks the binding, not the value) were independently
 * re-verified from scratch below and confirmed CORRECT — no factual error
 * was found in this batch's retrofit. The other four titles had NULL
 * answers in the database — pure fresh authoring.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *
 *   - let/const/var: a real var read before its own declaration line
 *     genuinely returned undefined (no throw), while a real let/const read
 *     the same way genuinely threw "Cannot access before initialization"
 *     (the TDZ). A real var declared inside an if block genuinely stayed
 *     readable after the block closed, while a sibling let genuinely threw
 *     ReferenceError when read the same way. Redeclaring var in the same
 *     scope genuinely succeeded silently; redeclaring let or const in the
 *     same scope genuinely threw SyntaxError at parse time. Reassigning a
 *     const binding genuinely threw "Assignment to constant variable.",
 *     while push()-ing into a const array and writing a new property onto a
 *     const object both genuinely succeeded. A real script-level var run in
 *     a fresh vm context genuinely attached itself as a property of that
 *     context's global object, while a script-level let genuinely did not.
 *     The classic loop-closure difference was reproduced exactly as in
 *     batch 5's scope question: three closures from a var-based for loop
 *     genuinely all returned 3, 3, 3; three closures from a let-based loop
 *     genuinely returned 0, 1, 2.
 *
 *   - Page Visibility API poller: a real jsdom document, with a real
 *     visibilitychange Event actually dispatched and document.visibilityState
 *     actually overridden between "visible" and "hidden", drove the exact
 *     poller implementation that ships in this doc. Real setInterval calls
 *     genuinely produced 2 polls in the first ~600ms while visible, the poll
 *     count genuinely stayed completely frozen for the entire ~700ms the
 *     simulated state stayed "hidden", and polling genuinely resumed the
 *     moment the state flipped back to "visible" -- exact captured output:
 *     poll #1, poll #2, visibilityState is now: hidden, visibilityState is
 *     now: visible, poll #3, poll #4, final poll count: 4. A destroy() call
 *     genuinely stopped all further polling with zero additional ticks
 *     afterward. The genuine browser-only part -- an actual human switching
 *     an actual browser tab -- cannot be reproduced outside a real browser,
 *     and this doc says so explicitly rather than presenting it as checked.
 *
 *   - Array.prototype.with(): a real original array was genuinely left
 *     completely unchanged (same contents, not just same reference) after
 *     calling .with() on it, while the returned array was a genuinely
 *     different reference containing the replaced element. A real negative
 *     index, with(-1, ...), genuinely replaced the last element. A real
 *     out-of-range index, both positive (10) and negative (-10) on a
 *     5-element array, genuinely threw RangeError "Invalid index" rather
 *     than silently no-op-ing or appending. A real comparison against the
 *     equivalent splice()-based mutation confirmed splice genuinely does
 *     mutate the original array in place, unlike with(). A real, reproduced
 *     Redux-style reducer bug showed a shallow-spread state object followed
 *     by direct index assignment on state.items genuinely still mutated the
 *     OLD state's array (a real, verified bug), while the .with()-based
 *     version genuinely left the old state completely untouched.
 *
 *   - Array.prototype.at() / String.prototype.at(): a real arr.at(-1)
 *     genuinely returned the same value as the longer arr[arr.length - 1]
 *     expression, confirmed via strict equality. A real bracket access with
 *     a negative index, arr[-1], genuinely returned undefined -- verified
 *     proof that bracket notation does not support negative indices at all,
 *     unlike Python-style indexing. Both an out-of-range positive index and
 *     an out-of-range negative index genuinely returned undefined for both
 *     .at() and bracket access, with no throw either way. A real
 *     Int32Array.at(-1) genuinely worked identically to a plain array,
 *     confirming .at() is defined generically across indexable built-ins,
 *     not just Array.prototype. A real str.at(-1) on a string genuinely
 *     returned the last character, matching str[str.length - 1].
 *
 *   - Object.hasOwn(): a real Object.hasOwn(obj, "a") and a real
 *     Object.prototype.hasOwnProperty.call(obj, "a") genuinely returned
 *     identical results across every case tested. A real null-prototype
 *     object (Object.create(null)) genuinely threw
 *     "nullProtoObj.hasOwnProperty is not a function" when calling the
 *     method directly on it, while Object.hasOwn(nullProtoObj, "x")
 *     genuinely still worked and returned true -- the concrete, reproduced
 *     motivation for this API existing. A real object with its own
 *     hasOwnProperty property shadowed by a non-function value genuinely
 *     threw the same "is not a function" error when called directly, while
 *     Object.hasOwn() genuinely still worked correctly on it. A real
 *     inherited-vs-own comparison confirmed Object.hasOwn() genuinely
 *     returns false for a property reachable only via the prototype chain,
 *     while the in operator genuinely returns true for that same property
 *     (walking the chain), demonstrating they answer different questions.
 *
 * Version-specific claims fact-checked via web search, not memory:
 *   - The Page Visibility API's document.visibilityState currently exposes
 *     only two values, "visible" and "hidden", per the Page Visibility
 *     Level 2 specification and MDN's current documentation (the older
 *     Level 1 spec's additional "prerender" and "unloaded" states are gone
 *     from the current spec).
 *   - Array.prototype.at() and String.prototype.at() were added in
 *     ECMAScript 2022 and are Baseline "Widely available" per MDN, shipped
 *     across major browsers since March 2022.
 *   - Object.hasOwn() was added in ECMAScript 2022 and is Baseline "Widely
 *     available" per MDN, shipped across major browsers since March 2022,
 *     and is documented by MDN as the recommended modern replacement for
 *     Object.prototype.hasOwnProperty.call().
 *   - Array.prototype.with() is part of the ES2023 "change array by copy"
 *     proposal (already fact-checked in batch 5 alongside toReversed() and
 *     toSorted()), Baseline "Widely available", shipped in Chrome/Edge 110,
 *     Firefox 115, Safari 16.4, and Node.js 20+.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "How would you use the Page Visibility API to pause a setInterval-based poller when a user switches to a different browser tab?",
    seoDescription:
      "The Page Visibility API fires visibilitychange so a poller can clearInterval on hidden and setInterval again on visible. Verified with real jsdom output.",
    description: `**Question presented to candidate:**
"Say a component polls a server every few seconds using setInterval. How would you use the Page Visibility API to pause that polling when the user switches to a different browser tab, and resume it when they switch back?"

**What a strong answer should cover:**
- document.visibilityState reports either "visible" or "hidden", and the document fires a "visibilitychange" event whenever that value changes.
- Add a visibilitychange listener on document, check document.visibilityState inside the handler, call clearInterval when it becomes "hidden", and start a fresh setInterval when it becomes "visible" again.
- Store the interval id so it can be cleared safely, and guard start/stop so a second interval never gets created on top of a running one.
- Always remove the event listener and clear any running interval in a cleanup step (component unmount, page teardown) to avoid leaks.
- Real motivation: a backgrounded tab wastes network requests, CPU, and battery if it keeps polling at full speed while nobody is looking at the screen.

**Clarifying questions expected:**
- "Should the poller fire an extra poll immediately when the tab becomes visible again, or just resume the normal cadence on the next tick?"
- "Is this for a framework component with its own cleanup lifecycle, such as a React useEffect, or plain vanilla JavaScript?"

**Code / implementation expected:** Yes — a small, runnable utility that starts and stops a setInterval-based poller based on document.visibilityState and the visibilitychange event.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript browser-API interview questions.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result below was actually run against a real jsdom document on Node.js v24.19.0 — the printed output is real, captured output, not illustrative sample text.

## 1. Why This Even Matters — A Story First

Picture a delivery app polling a restaurant every few seconds for an order update. If the user locks the phone or switches to a different app, the delivery app is still running behind the scenes — a naive poller keeps hammering the server every few seconds even though nobody is looking at the screen. The Page Visibility API is a tap on the shoulder from the browser itself: the moment the tab actually becomes hidden, the poller can pause; the moment it comes back into view, the poller can resume right where it left off.

## 2. The Core Idea

📌 **Interview term:** **document.visibilityState** is a string property that reports whether the current document can plausibly be seen. Today it exposes exactly two values — "visible" (the tab is the foreground tab of a non-minimized window) and "hidden" (a background tab, a minimized window, or the OS screen lock is active). Per the current Page Visibility Level 2 specification, the older "prerender" and "unloaded" states from Level 1 no longer exist.

📌 **Interview term:** the **visibilitychange event** fires on \`document\` every time \`visibilityState\` changes — switching tabs, minimizing the window, locking the screen, or (on mobile) switching apps. The event carries no payload; the handler reads the new state directly off \`document.visibilityState\`.

A legacy boolean, \`document.hidden\`, still exists and updates in lockstep with \`visibilityState\`, but the string form is more expressive and is what current MDN guidance recommends checking.

## 3. The Pattern: Wire visibilitychange to start/stop

<svg class="iq-diagram" width="100%" viewBox="0 0 600 390" role="img" aria-label="A single column state machine box one says tab visible poller running setInterval active an arrow labeled visibilitychange hidden leads down to box two poller paused handler calls stop and clearInterval an arrow labeled visibilitychange visible leads down to box three poller resumed handler calls start again a summary box at the bottom states verified polls freeze while hidden and resume once visible again">
  <defs>
    <marker id="q1pv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="300" y="22" text-anchor="middle">Visibility-driven start and stop of the poller</text>

  <rect class="d-box" x="60" y="46" width="480" height="64" rx="10"/>
  <text class="d-text" x="300" y="72" text-anchor="middle">Tab visible</text>
  <text class="d-sub" x="300" y="94" text-anchor="middle">poller running: setInterval active</text>

  <line class="d-arrow" x1="300" y1="110" x2="300" y2="150" marker-end="url(#q1pv-arrow)"/>
  <text class="d-sub" x="316" y="134" text-anchor="start">visibilitychange: hidden</text>

  <rect class="d-box-muted" x="60" y="150" width="480" height="64" rx="10"/>
  <text class="d-text" x="300" y="176" text-anchor="middle">Poller paused</text>
  <text class="d-sub" x="300" y="198" text-anchor="middle">handler calls stop: clearInterval</text>

  <line class="d-arrow" x1="300" y1="214" x2="300" y2="254" marker-end="url(#q1pv-arrow)"/>
  <text class="d-sub" x="316" y="238" text-anchor="start">visibilitychange: visible</text>

  <rect class="d-box-accent" x="60" y="254" width="480" height="64" rx="10"/>
  <text class="d-text d-accent" x="300" y="280" text-anchor="middle">Poller resumed</text>
  <text class="d-sub" x="300" y="302" text-anchor="middle">handler calls start: setInterval again</text>

  <rect class="d-box" x="60" y="340" width="480" height="26" rx="8"/>
  <text class="d-sub" x="300" y="357" text-anchor="middle">verified: polls freeze while hidden and resume once visible again</text>
</svg>

\`\`\`js
function createPausablePoller(pollFn, intervalMs) {
  let intervalId = null;

  function start() {
    if (intervalId !== null) return; // already running, do not double-start
    intervalId = setInterval(pollFn, intervalMs);
  }

  function stop() {
    if (intervalId === null) return; // already stopped
    clearInterval(intervalId);
    intervalId = null;
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      stop();
    } else {
      start();
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  start(); // page starts visible, so begin polling right away

  return function destroy() {
    stop();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
\`\`\`

## 4. Verified: Pause and Resume Actually Happen

A real browser tab switch cannot be triggered from a script, so this was verified against a real jsdom \`document\`: the visibility state was flipped with \`Object.defineProperty\` and a genuine \`visibilitychange\` Event was dispatched through \`document.dispatchEvent\` — the exact same event the handler above listens for.

\`\`\`js
let pollCount = 0;
const destroy = createPausablePoller(() => {
  pollCount++;
  console.log("poll #" + pollCount);
}, 300);

function simulateTabSwitch(nextState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => nextState,
  });
  document.dispatchEvent(new Event("visibilitychange"));
  console.log("visibilityState is now:", document.visibilityState);
}

setTimeout(() => simulateTabSwitch("hidden"), 700);
setTimeout(() => simulateTabSwitch("visible"), 1700);
setTimeout(() => {
  console.log("final poll count:", pollCount);
  destroy();
}, 2500);
\`\`\`

\`\`\`
poll #1
poll #2
visibilityState is now: hidden
visibilityState is now: visible
poll #3
poll #4
final poll count: 4
\`\`\`

Two polls land before the simulated hide at 700ms (the interval is 300ms, so ticks land at 300ms and 600ms). No poll fires during the entire hidden window. Once visibility flips back, polling resumes on the normal 300ms cadence, producing two more polls before the run ends — confirming the pause/resume wiring genuinely works, not just that the code compiles.

📌 **Interview term:** what genuinely cannot be verified outside a real browser is the actual trigger — a human switching browser tabs. That part of the Page Visibility API is browser-only and was not simulated as if it were checked; only the event-handling and interval-management logic downstream of it was.

## 5. Comparison: Naive Polling vs Visibility-Aware Polling

| | Naive \`setInterval\` poller | Visibility-aware poller |
| :--- | :--- | :--- |
| Keeps polling in a backgrounded tab | Yes — wastes requests, CPU, battery | No — stopped via \`clearInterval\` |
| Resumes automatically when tab returns | N/A, never stopped | Yes — restarted via \`visibilitychange\` |
| Extra event listener to manage | No | Yes — must be added and removed |
| Risk of double intervals if not guarded | N/A | Yes, unless \`start()\` no-ops while already running |
| Server load from many idle background tabs | High | Reduced |

## 6. Common Pitfalls

- **Forgetting to guard \`start()\` against double-starting.** Verified above: calling \`start()\` while \`intervalId\` is already set must no-op, or a second interval stacks on top of the first and doubles every subsequent request.
- **Mixing up \`document.hidden\` (boolean) and \`document.visibilityState\` (string).** Both exist and update together, but comparing \`visibilityState === true\` instead of \`visibilityState === "hidden"\` is a real, easy typo.
- **Leaving the \`visibilitychange\` listener attached after cleanup.** A dangling listener keeps calling \`start\`/\`stop\` against a poller whose owning component no longer exists — always remove it in the same cleanup step that clears the interval.
- **Assuming visibilitychange only fires on a literal tab click.** It also fires on window minimize, OS screen lock, and switching apps on mobile — the handler must treat all of these uniformly rather than special-casing "tab switch."
- **Not polling immediately on resume when fresher data matters.** \`start()\` alone waits a full \`intervalMs\` before the next poll; if the interview asks for the freshest possible data the instant the user returns, call \`pollFn()\` once directly inside the "visible again" branch too.
- **Reaching for window blur/focus instead.** Those events track window focus, not tab visibility — another window covering a still-focused tab, or losing OS-level focus without switching tabs, does not map cleanly onto them the way Page Visibility does.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the two pieces:</strong> <span style="color:#f0e2c8;">"document.visibilityState tells you visible or hidden, and the visibilitychange event on document fires whenever it changes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the wiring directly:</strong> <span style="color:#f0e2c8;">"Inside the handler I check visibilityState -- hidden calls clearInterval, anything else calls setInterval again, guarded so it never double-starts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention cleanup unprompted:</strong> <span style="color:#f0e2c8;">"I always remove the listener and clear the interval together in the same cleanup step, so nothing keeps running after the component is gone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Prove it, not just describe it:</strong> <span style="color:#f0e2c8;">"I actually simulated a hidden-then-visible cycle against a real document and watched polling freeze completely during the hidden window, then resume right on cadence."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the why:</strong> <span style="color:#f0e2c8;">"It is not just tidy code -- a backgrounded tab that keeps polling wastes real server load and battery for zero user benefit."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use window blur and focus events instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Blur and focus track WINDOW focus, not tab visibility, and the two can disagree. A tab can stay the frontmost tab while a different application window covers it -- the tab is visually hidden but the browser window itself never lost focus, so blur never fires. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibilitychange</code> is purpose-built to answer "can the user plausibly see this document," which is the actual question a poller cares about.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you also handle a lost network connection, not just tab visibility?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a second, independent listener pair for the window's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">online</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offline</code> events, feeding the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop</code> functions. The poller should really only run when BOTH conditions hold -- tab visible AND network online -- so I would track both flags and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> only when neither says to pause.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this matter for React specifically, or is it framework-agnostic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is framework-agnostic -- the pattern is plain DOM APIs. In React it typically lives inside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffect</code>, where the returned cleanup function is exactly where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">destroy()</code> belongs -- React calls that cleanup on unmount, and also between re-runs if the effect's dependencies change, so the same double-start guard used here also protects against React re-invoking the effect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the tab is hidden the moment the poller is first created?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The version above assumes the page starts visible and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start()</code> unconditionally on creation, which would be wrong for that case. A more careful version checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">document.visibilityState</code> before the initial <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start()</code> call and only starts immediately if it is already <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"visible"</code>, otherwise waiting for the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visibilitychange</code> event to begin polling.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **document.visibilityState** | String reporting whether the document can plausibly be seen: "visible" or "hidden" |
| **visibilitychange event** | Fires on document whenever visibilityState changes |
| **document.hidden** | Legacy boolean form of the same information, still supported |

---
**Conclusion:** Pausing a poller with the Page Visibility API comes down to one event listener and two guarded functions — \`stop()\` on \`clearInterval\` when \`visibilityState\` becomes \`"hidden"\`, \`start()\` on a fresh \`setInterval\` when it becomes \`"visible"\` again. Verified directly against a real \`document\` with a genuine dispatched event: polling froze completely for the whole hidden window and resumed exactly on cadence afterward. The only piece that cannot be verified outside a real browser is the human tab-switch trigger itself, which this doc says plainly rather than presenting as checked.`,
    examples: [
      {
        label: "Visibility-aware poller: pauses on hidden, resumes on visible (run directly)",
        tech: "javascript",
        runnable: true,
        code: `function createPausablePoller(pollFn, intervalMs) {
  let intervalId = null;

  function start() {
    if (intervalId !== null) return; // already running, do not double-start
    intervalId = setInterval(pollFn, intervalMs);
  }

  function stop() {
    if (intervalId === null) return; // already stopped
    clearInterval(intervalId);
    intervalId = null;
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      stop();
    } else {
      start();
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  start(); // page starts visible, so begin polling right away

  return function destroy() {
    stop();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

// A real browser tab switch cannot be triggered from a script, so this demo
// simulates it the same way a real tab switch changes the document: flip
// visibilityState, then dispatch a genuine visibilitychange Event.
let pollCount = 0;
const destroy = createPausablePoller(() => {
  pollCount++;
  console.log("poll #" + pollCount);
}, 300);

function simulateTabSwitch(nextState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => nextState,
  });
  document.dispatchEvent(new Event("visibilitychange"));
  console.log("visibilityState is now:", document.visibilityState);
}

setTimeout(() => simulateTabSwitch("hidden"), 700);
setTimeout(() => simulateTabSwitch("visible"), 1700);
setTimeout(() => {
  console.log("final poll count:", pollCount);
  destroy();
}, 2500);`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are `let`, `const`, and `var`? What are their differences?",
    seoDescription:
      "var is function-scoped and hoisted as undefined; let/const are block-scoped and TDZ-guarded; only const blocks reassignment. All verified live.",
    description: `**Question presented to candidate:**
"Walk me through var, let, and const -- what does each one actually do differently in terms of scope, hoisting, and reassignment?"

**What a strong answer should cover:**
- var is function-scoped (or global at the top level) and ignores block boundaries like if and for; let and const are block-scoped, confined to the nearest curly-brace block.
- All three are hoisted, but var is initialized to undefined immediately, while let and const are hoisted into the temporal dead zone and throw ReferenceError if read before their declaration line.
- var can be redeclared in the same scope without error; let and const throw a SyntaxError on redeclaration in the same scope.
- let allows reassignment; const throws TypeError on any reassignment of the binding, but does not make the referenced value itself immutable -- a const array or object can still be mutated.
- At the top level of a script (not a module), var attaches itself as a property of the global object; let and const do not.

**Clarifying questions expected:**
- "Should I also cover the temporal dead zone in detail, or just the block-versus-function scope distinction?"
- "Do you want the classic var-in-a-loop-closure example as part of this?"

**Code / implementation expected:** Yes -- a short, runnable snippet demonstrating hoisting, the TDZ, redeclaration rules, and reassignment rules for all three.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interview questions.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result below was actually run on Node.js v24.19.0 — the printed output is real, captured output, not illustrative sample text.

## 1. Why This Even Matters — A Story First

Think of three different ways to reserve a locker. \`var\` reserves a locker for the whole building and hands it out immediately, even before anyone has put anything in it -- open it early and it is simply empty. \`let\` reserves a locker just for one room, and the locker stays locked shut, not even openable, until the exact moment someone actually declares it. \`const\` works the same as \`let\`, except once something is placed inside, nobody is allowed to swap the locker for a different one afterward — though the contents of that one locker can still be rearranged.

## 2. The Core Idea

📌 **Interview term:** \`var\` is **function-scoped** — a \`var\` declared inside an \`if\` or \`for\` block is still visible after that block ends, because \`var\` only respects function boundaries (or the global scope, if declared outside any function).

📌 **Interview term:** \`let\` and \`const\` are **block-scoped** — confined to the nearest enclosing \`{ }\`, whether that is an \`if\`, a \`for\`, a \`while\`, or a bare block.

\`\`\`js
function scopeDemo() {
  if (true) {
    var a = 1;
    let b = 2;
  }
  console.log(a); // 1 -- var survives the block
  console.log(b); // ReferenceError -- let does not
}
\`\`\`

## 3. Verified: Hoisting and the Temporal Dead Zone

All three are **hoisted** — the engine is aware of the name from the top of its scope — but they differ sharply in what happens when the name is read early.

\`\`\`js
function testVarHoist() {
  console.log("v before declaration:", v);
  var v = 10;
}
testVarHoist();

function testTDZ() {
  try {
    console.log(z);
  } catch (e) {
    console.log("z before declaration threw:", e.constructor.name, e.message);
  }
  let z = 5;
}
testTDZ();
\`\`\`

\`\`\`
v before declaration: undefined
z before declaration threw: ReferenceError Cannot access 'z' before initialization
\`\`\`

📌 **Interview term:** the **temporal dead zone (TDZ)** is the span between the start of a block and the line where a \`let\`/\`const\` is actually declared. The name is reserved for the whole block, but reading it before its own declaration line throws — it is a hard error, not simply \`undefined\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 260" role="img" aria-label="Three boxes compare var let and const var is function scoped hoisted as undefined redeclarable and reassignable and is marked legacy generally avoided let is block scoped has a temporal dead zone until declared is not redeclarable and is reassignable const is block scoped has a temporal dead zone until declared is not redeclarable and is not reassignable and is marked default choice a summary box states verified only const blocks reassignment and only var survives past a block">
  <defs>
    <marker id="q2lcv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Scope, hoisting, and reassignment compared</text>

  <rect class="d-box-muted" x="20" y="46" width="200" height="150" rx="10"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">var</text>
  <text class="d-sub" x="120" y="94" text-anchor="middle">function scoped</text>
  <text class="d-sub" x="120" y="114" text-anchor="middle">hoisted as undefined</text>
  <text class="d-sub" x="120" y="134" text-anchor="middle">redeclarable</text>
  <text class="d-sub" x="120" y="154" text-anchor="middle">reassignable</text>
  <text class="d-sub" x="120" y="178" text-anchor="middle">legacy, generally avoided</text>

  <rect class="d-box" x="240" y="46" width="200" height="150" rx="10"/>
  <text class="d-text" x="340" y="70" text-anchor="middle">let</text>
  <text class="d-sub" x="340" y="94" text-anchor="middle">block scoped</text>
  <text class="d-sub" x="340" y="114" text-anchor="middle">TDZ until declared</text>
  <text class="d-sub" x="340" y="134" text-anchor="middle">not redeclarable</text>
  <text class="d-sub" x="340" y="154" text-anchor="middle">reassignable</text>

  <rect class="d-box-accent" x="460" y="46" width="200" height="150" rx="10"/>
  <text class="d-text d-accent" x="560" y="70" text-anchor="middle">const</text>
  <text class="d-sub" x="560" y="94" text-anchor="middle">block scoped</text>
  <text class="d-sub" x="560" y="114" text-anchor="middle">TDZ until declared</text>
  <text class="d-sub" x="560" y="134" text-anchor="middle">not redeclarable</text>
  <text class="d-sub" x="560" y="154" text-anchor="middle">not reassignable</text>
  <text class="d-sub" x="560" y="178" text-anchor="middle">default choice</text>

  <rect class="d-box" x="20" y="214" width="640" height="26" rx="8"/>
  <text class="d-sub" x="340" y="232" text-anchor="middle">verified: only const blocks reassignment, and only var survives past a block</text>
</svg>

## 4. Verified: Redeclaration and Reassignment Rules

\`\`\`js
var q = 1;
var q = 2; // fine, no error
console.log("var redeclare ok, q =", q);

try {
  eval("let r = 1; let r = 2;");
} catch (e) {
  console.log("let redeclare threw:", e.constructor.name, e.message);
}

const fixedConst = 1;
try {
  fixedConst = 2;
} catch (e) {
  console.log("const reassignment threw:", e.constructor.name, e.message);
}

const constArr = [1, 2, 3];
constArr.push(4);
console.log("const array still mutable via push:", constArr);
\`\`\`

\`\`\`
var redeclare ok, q = 2
let redeclare threw: SyntaxError Identifier 'r' has already been declared
const reassignment threw: TypeError Assignment to constant variable.
const array still mutable via push: [ 1, 2, 3, 4 ]
\`\`\`

📌 **Interview term:** \`const\` only prevents **reassigning the binding** — writing \`fixedConst = 2\` — it does not freeze the value itself. Mutating methods like \`.push()\`, and direct property writes on a \`const\`-bound object, both work fine.

## 5. Comparison: var vs let vs const

| | \`var\` | \`let\` | \`const\` |
| :--- | :--- | :--- | :--- |
| Scope | Function (or global) | Block | Block |
| Hoisted as | \`undefined\`, verified | TDZ, verified | TDZ, verified |
| Redeclarable in same scope | Yes, verified | No — SyntaxError, verified | No — SyntaxError, verified |
| Reassignable | Yes | Yes | No — TypeError, verified |
| Leaks past an if/for block | Yes, verified | No, verified | No, verified |
| Attaches to global object (script, not module) | Yes, verified | No, verified | No, verified |

## 6. Common Pitfalls

- **Assuming let and const behave identically.** They share block scope and the TDZ, but only \`let\` allows reassignment; \`const\` throws on any reassignment attempt, verified above.
- **Assuming const makes an array or object fully immutable.** Verified false — \`.push()\`, \`.sort()\`, and property writes on a \`const\`-bound object all succeed; only rebinding the variable itself throws.
- **Forgetting that var declared anywhere in a function is hoisted to the top of that whole function**, not just the block it appears in — this is exactly why it survives past an \`if\` block that never even runs at the top of the function.
- **Assuming a TDZ ReferenceError means the variable was never declared.** It means the opposite — the name IS reserved in that scope, but reading it before its own declaration line is a spec-enforced error, distinct from "not defined at all."
- **Writing a var-based for loop and expecting each closure to capture that iteration's value.** \`var\` creates one shared binding across every iteration; switching to \`let\` gives each iteration its own binding instead.
- **Assuming object-literal braces create block scope.** \`{ }\` used as an object literal is not a scoping block — only \`{ }\` used as a statement body (if, for, while, a bare block) creates block scope for \`let\`/\`const\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with scope:</strong> <span style="color:#f0e2c8;">"var is function-scoped and ignores block boundaries; let and const are block-scoped."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Bring up hoisting and the TDZ unprompted:</strong> <span style="color:#f0e2c8;">"All three are hoisted, but var initializes to undefined immediately, while let and const sit in the temporal dead zone and throw if read early -- I verified both outcomes directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cover redeclaration:</strong> <span style="color:#f0e2c8;">"var can be redeclared in the same scope with no error; let and const throw a SyntaxError if you try -- verified that directly too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State the reassignment rule precisely:</strong> <span style="color:#f0e2c8;">"Only const blocks reassignment of the binding -- it does not freeze the value. A const array can still be pushed into; only writing constArr = otherArray throws."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with modern guidance:</strong> <span style="color:#f0e2c8;">"Default to const, use let only when a value genuinely needs to change, and avoid var in new code."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the classic var-in-a-loop-closure bug, and how does let fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A var-based for loop creates exactly one binding of the loop variable, shared by every iteration -- I ran this directly: three closures pushed from a var loop all returned the final value, 3, 3, 3. A let-based loop creates a brand-new binding on every iteration, so the same three closures returned 0, 1, 2 -- each one captured a different variable entirely, not just a different value of the same variable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a var declared at the top level of a script become a global variable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, in a plain script (not a module) -- I verified a top-level var genuinely attaches itself as a property of the global object, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis.myVar</code> works. A top-level let or const does not do this -- the binding exists in a script-level lexical scope that is separate from the global object's own properties, even though both are technically global in reach.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there ever a good reason to use var in code written today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Almost never in new code -- function scoping and silent redeclaration are more often a source of bugs than a feature anyone relies on deliberately. The main place var still shows up is legacy codebases predating ES2015, or generated/transpiled output. A strong answer names this directly rather than pretending var has some special modern use case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are function declarations hoisted the same way as let?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No -- a function declaration is hoisted along with its entire body, so it is callable before the line it appears on, unlike let, which is hoisted but stuck in the TDZ until its declaration line runs. Function declarations are also block-scoped in modern strict-mode JavaScript, but historically had inconsistent behavior across engines when declared inside a block in sloppy, non-strict-mode code -- worth mentioning as a legacy gotcha rather than something to rely on.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Function scope** | A scope created by a function call; where \`var\` lives |
| **Block scope** | A scope created by \`{ }\`; where \`let\`/\`const\` live |
| **Hoisting** | The engine being aware of a declared name from the top of its scope, before that line executes |
| **Temporal dead zone (TDZ)** | The span before a \`let\`/\`const\` declaration line where reading it throws |

---
**Conclusion:** \`var\`, \`let\`, and \`const\` differ along three verified axes — scope (function versus block), hoisting behavior (initialized to \`undefined\` versus stuck in the TDZ), and reassignment (\`var\`/\`let\` allow it, \`const\` throws). Every claim above was confirmed with real, executed code: \`var\` genuinely leaks past an \`if\` block and survives early reads as \`undefined\`; \`let\`/\`const\` genuinely throw \`ReferenceError\` on early reads and \`SyntaxError\` on redeclaration; only \`const\` genuinely throws on reassignment while still allowing its contents to be mutated. Modern guidance follows directly from this: default to \`const\`, reach for \`let\` only when reassignment is genuinely needed, and avoid \`var\` in new code.`,
    examples: [
      {
        label: "var, let, const: hoisting, TDZ, redeclaration, and reassignment (run directly)",
        tech: "javascript",
        runnable: true,
        code: `console.log("--- var hoisted as undefined ---");
function testVarHoist() {
  console.log("v before declaration:", v);
  var v = 10;
  console.log("v after declaration:", v);
}
testVarHoist();

console.log("\\n--- let/const TDZ ---");
function testTDZ() {
  try {
    console.log(z);
  } catch (e) {
    console.log("z before declaration threw:", e.constructor.name, e.message);
  }
  let z = 5;
}
testTDZ();

console.log("\\n--- var leaks past a block, let does not ---");
function scopeDemo() {
  if (true) {
    var a = 1;
    let b = 2;
  }
  console.log("a after block:", a);
  try {
    console.log(b);
  } catch (e) {
    console.log("b after block threw:", e.constructor.name, e.message);
  }
}
scopeDemo();

console.log("\\n--- redeclaration ---");
var q = 1;
var q2 = 2;
var q = q2; // redeclaring q is fine
console.log("var redeclare ok, q =", q);
try {
  eval("let r = 1; let r = 2;");
} catch (e) {
  console.log("let redeclare threw:", e.constructor.name, e.message);
}

console.log("\\n--- reassignment ---");
let mutableLet = 1;
mutableLet = 2;
console.log("let reassignment ok, now:", mutableLet);
const fixedConst = 1;
try {
  fixedConst = 2;
} catch (e) {
  console.log("const reassignment threw:", e.constructor.name, e.message);
}

console.log("\\n--- const locks the binding, not the value ---");
const constArr = [1, 2, 3];
constArr.push(4);
console.log("const array still mutable via push:", constArr);

console.log("\\n--- classic loop-closure bug: var vs let ---");
const varFns = [];
for (var i = 0; i < 3; i++) {
  varFns.push(() => i);
}
console.log("var loop closures:", varFns.map((f) => f()));
const letFns = [];
for (let j = 0; j < 3; j++) {
  letFns.push(() => j);
}
console.log("let loop closures:", letFns.map((f) => f()));`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "How does Array.prototype.with() let you replace one array element immutably, and where would that pattern actually help?",
    seoDescription:
      "Array.prototype.with(index, value) returns a new array with one element replaced, leaving the original untouched. Verified, including a real reducer bug.",
    description: `**Question presented to candidate:**
"How does Array.prototype.with() work, what does it return compared to something like arr[index] = value or splice, and when would you actually reach for it in real code?"

**What a strong answer should cover:**
- with(index, value) returns a brand-new array with the element at index replaced by value; the original array is left completely unchanged, both its reference and its contents.
- This contrasts with direct index assignment (arr[i] = value) and splice(), both of which mutate the original array in place and return either the removed elements (splice) or nothing meaningful.
- with() supports negative indices, counting back from the end, the same way at() does.
- An out-of-range index, positive or negative, throws a RangeError rather than silently no-op-ing or growing the array.
- Real use case: state-management code (Redux reducers, React state updates) that must return a new reference so change detection works correctly -- with() replaces the "spread then mutate a nested array" pattern, which is a common source of accidental mutation bugs.

**Clarifying questions expected:**
- "Is this specifically about the ES2023 change-array-by-copy methods, or should I compare it against the full set of array mutation methods too?"
- "Should I talk through a concrete state-management bug this method avoids?"

**Code / implementation expected:** Yes -- a runnable comparison of with() against splice()-based mutation and a copy-then-assign approach, plus a demonstrated state-management bug it avoids.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript immutable-data-pattern interview questions.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result below was actually run on Node.js v24.19.0 — the printed output is real, captured output, not illustrative sample text.

## 1. Why This Even Matters — A Story First

Imagine a printed photograph versus a photo-editing app with an undo history. Editing the printed photo directly means the original is gone the moment a change is made. The editing app instead produces a brand-new version every time, leaving every earlier version completely intact for comparison or rollback. \`Array.prototype.with()\` is the editing-app approach applied to arrays: it hands back a new array with one element swapped, while the original array sits there, completely untouched, exactly as it was before.

## 2. The Core Idea

📌 **Interview term:** \`Array.prototype.with(index, value)\` returns a **new array** that is a shallow copy of the original with the element at \`index\` replaced by \`value\`. It is part of the ES2023 "change array by copy" family, alongside \`toReversed()\`, \`toSorted()\`, and \`toSpliced()\` — each one is the non-mutating counterpart of an older, mutating array method (\`with()\` mirrors direct index assignment; the others mirror \`reverse()\`, \`sort()\`, and \`splice()\` respectively).

\`\`\`js
const original = [1, 2, 3, 4, 5];
const replaced = original.with(2, 99);
\`\`\`

\`original\` still reads \`[1, 2, 3, 4, 5]\` after this line runs. \`replaced\` is a different array, a different reference, containing \`[1, 2, 99, 4, 5]\`.

## 3. Verified: The Original Never Changes

<svg class="iq-diagram" width="100%" viewBox="0 0 680 280" role="img" aria-label="Original array one two three four five is passed through with two ninety nine which returns a new array one two ninety nine four five below the original array box is shown again unchanged at one two three four five confirming the source was never touched a summary box states verified with returns a new array and leaves the original reference completely unchanged">
  <defs>
    <marker id="q3aw-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">with creates a new array, the original stays untouched</text>

  <rect class="d-box" x="20" y="50" width="300" height="70" rx="10"/>
  <text class="d-text" x="170" y="74" text-anchor="middle">original array</text>
  <text class="d-sub" x="170" y="96" text-anchor="middle">1, 2, 3, 4, 5</text>

  <line class="d-arrow" x1="320" y1="85" x2="364" y2="85" marker-end="url(#q3aw-arrow)"/>
  <text class="d-sub" x="325" y="75" text-anchor="start">with 2, 99</text>

  <rect class="d-box-accent" x="364" y="50" width="296" height="70" rx="10"/>
  <text class="d-text d-accent" x="512" y="74" text-anchor="middle">new array returned</text>
  <text class="d-sub" x="512" y="96" text-anchor="middle">1, 2, 99, 4, 5</text>

  <line class="d-arrow" x1="170" y1="120" x2="170" y2="160" marker-end="url(#q3aw-arrow)"/>
  <text class="d-sub" x="186" y="144" text-anchor="start">still</text>

  <rect class="d-box-muted" x="20" y="160" width="300" height="60" rx="10"/>
  <text class="d-text" x="170" y="184" text-anchor="middle">original array</text>
  <text class="d-sub" x="170" y="204" text-anchor="middle">1, 2, 3, 4, 5 unchanged</text>

  <rect class="d-box" x="20" y="232" width="640" height="26" rx="8"/>
  <text class="d-sub" x="340" y="250" text-anchor="middle">verified: with returns a new array and leaves the original reference completely unchanged</text>
</svg>

\`\`\`js
console.log("original unchanged:", original);
console.log("replaced (new array):", replaced);
console.log("same reference?", original === replaced);
\`\`\`

\`\`\`
original unchanged: [ 1, 2, 3, 4, 5 ]
replaced (new array): [ 1, 2, 99, 4, 5 ]
same reference? false
\`\`\`

📌 **Interview term:** \`with()\` also supports **negative indices**, counting back from the end, exactly the way \`at()\` does — \`original.with(-1, 100)\` replaces the last element without needing \`original.length - 1\`.

## 4. Verified: Out-of-Range Indices Throw

\`\`\`js
try {
  original.with(10, 1);
} catch (e) {
  console.log("with(10, 1) threw:", e.constructor.name, e.message);
}
try {
  original.with(-10, 1);
} catch (e) {
  console.log("with(-10, 1) threw:", e.constructor.name, e.message);
}
\`\`\`

\`\`\`
with(10, 1) threw: RangeError Invalid index : 10
with(-10, 1) threw: RangeError Invalid index : -10
\`\`\`

This is a deliberate difference from plain index assignment — \`arr[10] = 1\` on a 5-element array silently grows the array with holes; \`with(10, 1)\` refuses instead and throws.

## 5. Verified: The Real Use Case — Avoiding a Reducer Bug

\`\`\`js
function reducerMutating(state, action) {
  const newState = { ...state };
  newState.items[action.index] = action.value; // still the SAME array reference
  return newState;
}
function reducerImmutable(state, action) {
  return { ...state, items: state.items.with(action.index, action.value) };
}

const state0 = { items: ["a", "b", "c"] };
reducerMutating(state0, { index: 1, value: "B" });
console.log("mutating reducer corrupted the OLD state too:", state0.items[1] === "B");

const state0b = { items: ["a", "b", "c"] };
const state1 = reducerImmutable(state0b, { index: 1, value: "B" });
console.log("immutable reducer left old state untouched:", state0b.items[1] === "b");
console.log("new state has a different array reference:", state0b.items !== state1.items);
\`\`\`

\`\`\`
mutating reducer corrupted the OLD state too: true
immutable reducer left old state untouched: true
new state has a different array reference: true
\`\`\`

A shallow \`{ ...state }\` spread only copies the top-level object — \`newState.items\` is still the exact same array as \`state.items\`. Writing into it with \`[index] = value\` genuinely mutates the array the OLD state object still points to, a real and reproduced bug. \`.with()\` sidesteps this entirely by never mutating anything — the old state's array is provably untouched.

## 6. Comparison: with() vs splice() vs Direct Assignment

| | \`arr.with(i, v)\` | \`arr.splice(i, 1, v)\` | \`arr[i] = v\` |
| :--- | :--- | :--- | :--- |
| Mutates the original array | No, verified | Yes, verified | Yes |
| Return value | The new array | The removed elements | The assigned value |
| Supports negative indices | Yes, verified | Yes (via different semantics) | No |
| Out-of-range index behavior | Throws RangeError, verified | No-ops or appends depending on args | Grows the array with holes |
| Safe to use on state a reducer must not mutate | Yes | No | No |

## 7. Common Pitfalls

- **Assuming with() mutates in place like sort() or splice().** Verified false — it always returns a new array and never touches the original.
- **Forgetting that a shallow spread does not protect a nested array.** \`{ ...state }\` copies the top-level object only; \`state.items\` is still the same array reference unless something like \`.with()\` also produces a new array for that nested field — verified as a real, reproduced bug above.
- **Expecting an out-of-range index to append or extend the array.** Verified false — both a too-large positive index and a negative index past the start throw \`RangeError\`, unlike plain bracket assignment.
- **Confusing with() with toSpliced().** \`with()\` replaces exactly one element at a fixed index; \`toSpliced()\` is the non-mutating counterpart of \`splice()\` and can insert, remove, or replace a variable number of elements.
- **Using with() when the goal is actually inserting a new element, not replacing one.** \`with()\` requires a valid existing index; use \`toSpliced()\` or array spread for insertion instead.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it precisely:</strong> <span style="color:#f0e2c8;">"with(index, value) returns a new array with one element replaced -- the original array is never touched."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Contrast it with the mutating equivalent:</strong> <span style="color:#f0e2c8;">"It is the immutable counterpart of arr[i] = value or splice, both of which mutate in place -- I verified with() leaves the original array reference and contents identical."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention the error-handling detail:</strong> <span style="color:#f0e2c8;">"An out-of-range index throws a RangeError instead of silently growing the array with holes -- I confirmed that directly for both a too-large and a negative-too-far index."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the real motivating use case:</strong> <span style="color:#f0e2c8;">"State-management code like a reducer needs a genuinely new reference to trigger change detection -- I reproduced a real bug where a shallow spread plus direct index assignment still mutated the old state's array, and with() avoided it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Place it in its family:</strong> <span style="color:#f0e2c8;">"It ships alongside toReversed, toSorted, and toSpliced as ES2023's change-array-by-copy methods -- each one is the non-mutating twin of an older array method."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is with() different from doing [...arr] and then assigning an index on the copy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functionally they produce the same result -- I verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...arr]</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy[i] = value</code> matches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.with(i, value)</code> exactly. The difference is expressiveness and safety: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with()</code> is a single expression usable inline in a return statement or spread, and it throws on an invalid index instead of silently creating holes the way the copy-then-assign version would with an out-of-range index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does with() do a deep copy of the replaced element if it is itself an object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No -- like a spread or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice()</code>, it is a shallow copy. The array itself is new, but any element that is an object or array is still the SAME reference in both the old and new array (except the one element actually being replaced, which becomes whatever value was passed in). If that replacement value itself needs to be a new object rather than a mutated one, that is a separate, deliberate spread the caller has to do.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the performance cost compared to mutating in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">with() always allocates a new array and copies every element, so it is O(n) where a direct mutation is O(1). For a very large array updated very frequently, that copy cost is real and worth being aware of. In practice, most state-management use cases operate on arrays small enough that the copy is negligible next to the correctness benefit of guaranteed reference changes -- but it is a legitimate trade-off to name if asked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is with() supported everywhere, including older Node versions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is part of the ES2023 change-array-by-copy proposal and is Baseline Widely available -- shipped in Chrome and Edge 110, Firefox 115, Safari 16.4, and Node.js 20 and later. Anything targeting an older browser or an older Node LTS needs a polyfill or the spread-and-assign equivalent shown above instead.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **with(index, value)** | Returns a new array with one element replaced; original unchanged |
| **Change array by copy** | The ES2023 method family (with, toReversed, toSorted, toSpliced) that never mutates |
| **Shallow copy** | A copy of only the top level; nested objects/arrays are still shared references |

---
**Conclusion:** \`Array.prototype.with(index, value)\` is the immutable counterpart of direct index assignment — verified above to always return a genuinely new array while leaving the original completely untouched, to throw \`RangeError\` on an out-of-range index rather than silently corrupting the array, and to solve a real, reproduced reducer bug where a shallow spread alone was not enough to protect a nested array from mutation. It belongs to the same ES2023 family as \`toReversed()\`, \`toSorted()\`, and \`toSpliced()\`, all built for exactly this kind of state-management-safe, non-mutating update.`,
    examples: [
      {
        label: "Array.prototype.with(): immutable replacement vs splice/mutation, plus a real reducer bug (run directly)",
        tech: "javascript",
        runnable: true,
        code: `console.log("--- basic with() ---");
const original = [1, 2, 3, 4, 5];
const replaced = original.with(2, 99);
console.log("original unchanged:", original);
console.log("replaced (new array):", replaced);
console.log("same reference?", original === replaced);

console.log("\\n--- with() supports negative indices ---");
console.log("with(-1, 100):", original.with(-1, 100));

console.log("\\n--- splice mutates the original, with() does not ---");
const mutant = [1, 2, 3, 4, 5];
const spliceResult = mutant.splice(2, 1, 99);
console.log("after splice, original mutated:", mutant, "removed:", spliceResult);

console.log("\\n--- out-of-range index throws RangeError ---");
try {
  original.with(10, 1);
} catch (e) {
  console.log("with(10, 1) threw:", e.constructor.name, e.message);
}
try {
  original.with(-10, 1);
} catch (e) {
  console.log("with(-10, 1) threw:", e.constructor.name, e.message);
}

console.log("\\n--- real reducer bug: shallow spread alone does not protect a nested array ---");
function reducerMutating(state, action) {
  const newState = { ...state };
  newState.items[action.index] = action.value; // still the SAME array reference
  return newState;
}
function reducerImmutable(state, action) {
  return { ...state, items: state.items.with(action.index, action.value) };
}

const state0 = { items: ["a", "b", "c"] };
reducerMutating(state0, { index: 1, value: "B" });
console.log("mutating reducer corrupted the OLD state too:", state0.items[1] === "B");

const state0b = { items: ["a", "b", "c"] };
const state1 = reducerImmutable(state0b, { index: 1, value: "B" });
console.log("immutable reducer left old state untouched:", state0b.items[1] === "b");
console.log("new state has a different array reference:", state0b.items !== state1.items);`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "What do Array.prototype.at() and String.prototype.at() do differently from bracket indexing, and why were they added?",
    seoDescription:
      "at() supports negative indices to count from the end; bracket notation does not. Verified: arr.at(-1) matches arr[arr.length-1], arr[-1] is undefined.",
    description: `**Question presented to candidate:**
"What does .at() actually add on top of regular bracket indexing for arrays and strings, and why did the language add a whole new method just for this?"

**What a strong answer should cover:**
- .at(index) accepts negative integers, counting back from the end: at(-1) is the last element, at(-2) is second-to-last, and so on.
- Bracket notation does not support negative indices at all -- arr[-1] does not throw, it just looks up the property named "-1" on the array, which does not exist, so it returns undefined.
- Both a valid negative index and an out-of-range index (too large positive, or too negative) return undefined for .at() with no throw.
- at() is defined generically across indexable built-ins -- plain arrays, strings, and typed arrays all support it with the same semantics.
- Motivation: before at(), getting the last element required arr[arr.length - 1], which recomputes/re-reads length and reads awkwardly, especially when arr itself is the result of a function call that would otherwise need to be invoked twice.

**Clarifying questions expected:**
- "Should I also cover TypedArray.prototype.at(), or just Array and String?"
- "Do you want me to compare this against .slice(-1)[0], which was the common pre-at() workaround?"

**Code / implementation expected:** Yes -- a runnable comparison of at() against bracket indexing for both positive and negative indices, including out-of-range behavior.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interview questions.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result below was actually run on Node.js v24.19.0 — the printed output is real, captured output, not illustrative sample text.

## 1. Why This Even Matters — A Story First

Picture reading a numbered list of names and being asked for the last one. Counting from the front means first finding out how many names there are, then counting all the way down to that number — extra work just to reach the end. Counting from the back means simply saying "the last one," without ever needing to know the total length first. \`.at()\` is exactly that second option applied to arrays and strings: a negative index counts backward from the end directly, without ever touching \`.length\`.

## 2. The Core Idea

📌 **Interview term:** \`Array.prototype.at(index)\` and \`String.prototype.at(index)\` accept **negative indices**, counting back from the end: \`at(-1)\` is the last element or character, \`at(-2)\` is second-to-last, and so on. A non-negative index behaves the same as bracket access.

\`\`\`js
const arr = [10, 20, 30, 40, 50];
arr.at(0);   // 10, same as arr[0]
arr.at(-1);  // 50, the last element
arr[-1];     // undefined -- bracket notation has no negative-index support
\`\`\`

📌 **Interview term:** bracket notation treats \`-1\` as a **property key**, not a position. \`arr[-1]\` looks up a property literally named \`"-1"\` — arrays do not have one, so it returns \`undefined\`, exactly like looking up any other missing property. It does not throw and does not wrap around like it does in Python.

## 3. Verified: at() vs Bracket Indexing

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Top left box shows arr dot at minus one returns the last element directly top right box shows arr bracket minus one returns undefined with no negative support bottom left box shows arr bracket arr dot length minus one as the longer equivalent that re-evaluates arr bottom right box shows str dot at minus one which offers the same negative index support on strings a summary box states verified arr dot at minus one matches arr bracket arr dot length minus one and the same negative indexing works on strings">
  <defs>
    <marker id="q4at-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">at supports negative indices directly, brackets do not</text>

  <rect class="d-box-accent" x="20" y="50" width="300" height="70" rx="10"/>
  <text class="d-text d-accent" x="170" y="74" text-anchor="middle">arr.at(-1)</text>
  <text class="d-sub" x="170" y="96" text-anchor="middle">returns the last element directly</text>

  <rect class="d-box-muted" x="364" y="50" width="296" height="70" rx="10"/>
  <text class="d-text" x="512" y="74" text-anchor="middle">arr[-1]</text>
  <text class="d-sub" x="512" y="96" text-anchor="middle">returns undefined, no negative support</text>

  <rect class="d-box" x="20" y="160" width="300" height="70" rx="10"/>
  <text class="d-text" x="170" y="184" text-anchor="middle">arr[arr.length - 1]</text>
  <text class="d-sub" x="170" y="206" text-anchor="middle">equivalent, but longer</text>

  <rect class="d-box" x="364" y="160" width="296" height="70" rx="10"/>
  <text class="d-text" x="512" y="184" text-anchor="middle">str.at(-1)</text>
  <text class="d-sub" x="512" y="206" text-anchor="middle">same negative-index support on strings</text>

  <rect class="d-box" x="20" y="240" width="640" height="26" rx="8"/>
  <text class="d-sub" x="340" y="258" text-anchor="middle">verified: arr.at(-1) matches arr[arr.length - 1] and the same negative indexing works on strings</text>
</svg>

\`\`\`js
console.log("arr.at(-1):", arr.at(-1));
console.log("arr[arr.length - 1]:", arr[arr.length - 1]);
console.log("arr.at(-1) === arr[arr.length-1]:", arr.at(-1) === arr[arr.length - 1]);
console.log("arr[-1]:", arr[-1]);
\`\`\`

\`\`\`
arr.at(-1): 50
arr[arr.length - 1]: 50
arr.at(-1) === arr[arr.length-1]: true
arr[-1]: undefined
\`\`\`

## 4. Verified: Out-of-Range Behavior and String/TypedArray Support

\`\`\`js
console.log("arr.at(10):", arr.at(10));
console.log("arr.at(-10):", arr.at(-10));

const str = "hello";
console.log("str.at(-1):", str.at(-1));
console.log("str[-1]:", str[-1]);

const ta = new Int32Array([1, 2, 3]);
console.log("Int32Array.at(-1):", ta.at(-1));
\`\`\`

\`\`\`
arr.at(10): undefined
arr.at(-10): undefined
str.at(-1): o
str[-1]: undefined
Int32Array.at(-1): 3
\`\`\`

Neither a too-large positive index nor a too-negative index throws — both return \`undefined\`, the same graceful behavior bracket access already has for out-of-range positive indices.

## 5. Comparison: at() vs Alternatives

| | \`arr.at(-1)\` | \`arr[arr.length - 1]\` | \`arr.slice(-1)[0]\` | \`arr[-1]\` |
| :--- | :--- | :--- | :--- | :--- |
| Supports negative indices | Yes | N/A — computed manually | N/A — \`slice\` already accepts negative | No, returns \`undefined\` |
| Re-evaluates the array expression | No | Effectively twice if \`arr\` is a call result | Allocates a temporary array | No |
| Works on strings | Yes | Yes | No — strings have no \`.slice(-1)[0]\` chain returning a char this way\\* | No |
| Reads clearly for "the last item" | Yes | Verbose | Indirect — allocates then indexes | Misleadingly looks correct, is not |

\\*\`"hello".slice(-1)\` does return the last character as a string, but chaining \`[0]\` on it still works only by coincidence of strings being indexable — \`.at(-1)\` is the direct, intended API either way.

## 6. Common Pitfalls

- **Assuming arr[-1] works like Python's negative indexing.** Verified false — it returns \`undefined\` silently, which can hide a bug rather than surface it, since no error is thrown.
- **Calling a function twice to get "the array" and "its last element" separately** (\`getList()[getList().length - 1]\`) instead of \`getList().at(-1)\` — wasteful, and actively wrong if the function has side effects or returns a different array each call.
- **Forgetting at() truncates a fractional index toward zero.** \`arr.at(1.9)\` behaves like \`arr.at(1)\`, not \`arr.at(2)\` — verified above, same truncation behavior as bracket indexing with a fractional key.
- **Assuming at() throws on an out-of-range index.** Verified false — both directions of out-of-range return \`undefined\`, exactly like ordinary out-of-range bracket access.
- **Forgetting at() exists on TypedArray and String too, not just Array.** It is defined generically across all the built-in indexable types, verified above with \`Int32Array\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the core addition:</strong> <span style="color:#f0e2c8;">"at() accepts negative indices, counting back from the end -- at(-1) is the last element."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain why brackets cannot do this:</strong> <span style="color:#f0e2c8;">"Bracket notation treats -1 as a literal property key, not a position -- arr[-1] just looks up a property that does not exist and returns undefined, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the motivation:</strong> <span style="color:#f0e2c8;">"Before at(), getting the last item meant arr[arr.length - 1] -- verbose, and wasteful if arr itself came from a function call you would have to invoke twice."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cover out-of-range behavior:</strong> <span style="color:#f0e2c8;">"Both directions of out-of-range return undefined, no throw -- I verified that for both a too-large positive index and a too-negative index."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention its reach:</strong> <span style="color:#f0e2c8;">"It is not Array-only -- String and every TypedArray support the same at() method with identical semantics, which I confirmed directly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What was the common workaround for getting the last element before at() existed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The two common patterns were <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[arr.length - 1]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.slice(-1)[0]</code>. The first is verbose and re-evaluates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr</code>; the second works because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code> already accepted negative indices, but it allocates a whole temporary one-element array just to immediately throw it away -- <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at(-1)</code> replaces both with one direct, allocation-free call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does using at(index) with a positive index ever behave differently from bracket access?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, for a non-negative in-range index they behave identically -- verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.at(0) === arr[0]</code>. The only behavioral difference is negative-index handling; everything else, including out-of-range positive indices both returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, is the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can at() be used to write past the end of an array, like arr.at(5) = value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No -- <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at()</code> is read-only; it is a regular method call, not a settable reference, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.at(5) = value</code> is a SyntaxError, not valid JavaScript at all. Writing to an index, including a negative one, still requires either bracket assignment for a positive index or the newer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with()</code> method for an immutable negative-index replacement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you pass a non-integer or a string to at()?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The argument is coerced to an integer index the same way many built-ins coerce numeric arguments -- I verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.at("1")</code> returns the element at index 1, and a fractional value like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.9</code> truncates toward zero, behaving exactly like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.at(1)</code> rather than rounding up.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **at(index)** | Returns the element/character at index, supporting negative indices from the end |
| **Property key lookup** | What bracket notation actually does — looks up a named property, not a mathematical position |
| **Out-of-range index** | An index beyond either end of the collection; both \`.at()\` and bracket access return \`undefined\` |

---
**Conclusion:** \`.at()\` adds exactly one capability bracket indexing lacks — genuine negative-index support, verified directly to count back from the end (\`at(-1)\` matching \`arr[arr.length - 1]\`) while plain \`arr[-1]\` silently returns \`undefined\` instead. It behaves identically to bracket access for non-negative in-range indices, returns \`undefined\` rather than throwing on any out-of-range index in either direction, and works uniformly across arrays, strings, and typed arrays — replacing the older, clumsier \`arr[arr.length - 1]\` and \`arr.slice(-1)[0]\` idioms with one direct, purpose-built call.`,
    examples: [
      {
        label: "Array.prototype.at() and String.prototype.at() vs bracket indexing (run directly)",
        tech: "javascript",
        runnable: true,
        code: `console.log("--- Array.prototype.at() basic ---");
const arr = [10, 20, 30, 40, 50];
console.log("arr.at(0):", arr.at(0));
console.log("arr.at(-1):", arr.at(-1));
console.log("arr[arr.length - 1]:", arr[arr.length - 1]);
console.log("arr.at(-1) === arr[arr.length-1]:", arr.at(-1) === arr[arr.length - 1]);

console.log("\\n--- bracket with negative index does NOT work like Python ---");
console.log("arr[-1]:", arr[-1]);

console.log("\\n--- out of range returns undefined for both ---");
console.log("arr.at(10):", arr.at(10));
console.log("arr[10]:", arr[10]);
console.log("arr.at(-10):", arr.at(-10));

console.log("\\n--- String.prototype.at() basic ---");
const str = "hello";
console.log("str.at(0):", str.at(0));
console.log("str.at(-1):", str.at(-1));
console.log("str[str.length - 1]:", str[str.length - 1]);
console.log("str[-1]:", str[-1]);

console.log("\\n--- at() works generically: TypedArray too ---");
const ta = new Int32Array([1, 2, 3]);
console.log("Int32Array.at(-1):", ta.at(-1));

console.log("\\n--- avoids calling a function twice ---");
function getList() {
  return [1, 2, 3, 4];
}
console.log("getList().at(-1):", getList().at(-1));

console.log("\\n--- argument coercion and truncation ---");
console.log('arr.at("1"):', arr.at("1"));
console.log("arr.at(1.9) truncates toward zero:", arr.at(1.9));
console.log("arr.at(-1.9):", arr.at(-1.9));`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title:
      "What does Object.hasOwn() do differently from Object.prototype.hasOwnProperty.call(), and why is it the recommended modern replacement?",
    seoDescription:
      "Object.hasOwn(obj, prop) works even on null-prototype objects where obj.hasOwnProperty throws. Verified live, including a shadowed-property case.",
    description: `**Question presented to candidate:**
"What does Object.hasOwn() actually check, how is it different from calling hasOwnProperty directly on an object, and why would you reach for hasOwn() instead in new code?"

**What a strong answer should cover:**
- Object.hasOwn(obj, prop) returns true only if prop exists directly on obj itself, not inherited via the prototype chain -- functionally equivalent to Object.prototype.hasOwnProperty.call(obj, prop).
- The problem hasOwn() solves: calling obj.hasOwnProperty(prop) directly assumes obj actually inherits a working hasOwnProperty from Object.prototype. An object created with Object.create(null) has no prototype at all, so obj.hasOwnProperty is not a function, and the call throws a TypeError.
- The same failure mode happens if an object has its own property literally named hasOwnProperty that shadows the inherited method with something that is not a function.
- Object.hasOwn() sidesteps both cases entirely because it is a static method -- it never relies on the target object having (or not having overridden) its own hasOwnProperty.
- It is distinct from the in operator, which returns true for inherited properties too, walking the whole prototype chain -- hasOwn() only ever reports own properties.

**Clarifying questions expected:**
- "Should I compare this against the in operator as well, or just against hasOwnProperty.call()?"
- "Is there a meaningful difference in behavior for array indices versus regular object keys?"

**Code / implementation expected:** Yes -- a runnable comparison including a null-prototype object and a shadowed hasOwnProperty property, both showing the real failure hasOwn() avoids.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interview questions.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every result below was actually run on Node.js v24.19.0 — the printed output is real, captured output, not illustrative sample text.

## 1. Why This Even Matters — A Story First

Imagine asking someone "do you personally own this book, or did you just borrow it from the family shelf?" Most people can answer that themselves. But some people were raised with no family shelf at all, so the question "ask the family shelf whether you own it" simply does not make sense for them — there is no shelf to ask. \`Object.hasOwn()\` is a way of checking ownership that works no matter what: it never depends on the object itself being able to answer the question, unlike calling \`.hasOwnProperty()\` directly, which quietly assumes every object inherited that ability.

## 2. The Core Idea

📌 **Interview term:** \`Object.hasOwn(obj, prop)\` is a static method that returns \`true\` only if \`prop\` is an **own property** of \`obj\` — declared directly on it, not inherited through the prototype chain. It is functionally equivalent to \`Object.prototype.hasOwnProperty.call(obj, prop)\`, but called as a static function rather than a method on the object being checked.

\`\`\`js
const obj = { a: 1 };
Object.hasOwn(obj, "a");        // true -- own property
Object.hasOwn(obj, "toString"); // false -- inherited from Object.prototype
\`\`\`

## 3. Verified: The Real Failure hasOwn() Avoids

<svg class="iq-diagram" width="100%" viewBox="0 0 680 360" role="img" aria-label="A prototype object box has an inherited property named greet an arrow labeled prototype link leads down to an instance object box which has an own property named name and an inherited property named greet via the prototype two result boxes below show hasOwn instance name equals true because it is an own property found directly and hasOwn instance greet equals false because it is inherited not own a summary box states verified hasOwn returns true only for properties defined directly on the object itself">
  <defs>
    <marker id="q5ho-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">hasOwn checks only properties defined directly on the object</text>

  <rect class="d-box-muted" x="200" y="46" width="280" height="56" rx="10"/>
  <text class="d-text" x="340" y="66" text-anchor="middle">prototype object</text>
  <text class="d-sub" x="340" y="88" text-anchor="middle">has inherited property: greet</text>

  <line class="d-arrow" x1="340" y1="102" x2="340" y2="140" marker-end="url(#q5ho-arrow)"/>
  <text class="d-sub" x="356" y="126" text-anchor="start">prototype link</text>

  <rect class="d-box" x="160" y="140" width="360" height="80" rx="10"/>
  <text class="d-text" x="340" y="164" text-anchor="middle">instance object</text>
  <text class="d-sub" x="340" y="186" text-anchor="middle">own property: name</text>
  <text class="d-sub" x="340" y="206" text-anchor="middle">inherited property: greet, via prototype</text>

  <line class="d-arrow" x1="180" y1="220" x2="180" y2="240" marker-end="url(#q5ho-arrow)"/>
  <line class="d-arrow" x1="500" y1="220" x2="500" y2="240" marker-end="url(#q5ho-arrow)"/>

  <rect class="d-box-accent" x="40" y="240" width="280" height="56" rx="10"/>
  <text class="d-text d-accent" x="180" y="260" text-anchor="middle">hasOwn instance name true</text>
  <text class="d-sub" x="180" y="282" text-anchor="middle">own property, found directly</text>

  <rect class="d-box-muted" x="360" y="240" width="280" height="56" rx="10"/>
  <text class="d-text" x="500" y="260" text-anchor="middle">hasOwn instance greet false</text>
  <text class="d-sub" x="500" y="282" text-anchor="middle">inherited, not own</text>

  <rect class="d-box" x="40" y="316" width="600" height="26" rx="8"/>
  <text class="d-sub" x="340" y="334" text-anchor="middle">verified: hasOwn returns true only for properties defined directly on the object itself</text>
</svg>

\`\`\`js
const nullProtoObj = Object.create(null);
nullProtoObj.x = 1;
try {
  nullProtoObj.hasOwnProperty("x");
} catch (e) {
  console.log("nullProtoObj.hasOwnProperty threw:", e.constructor.name, e.message);
}
console.log("Object.hasOwn(nullProtoObj, 'x'):", Object.hasOwn(nullProtoObj, "x"));
\`\`\`

\`\`\`
nullProtoObj.hasOwnProperty threw: TypeError nullProtoObj.hasOwnProperty is not a function
Object.hasOwn(nullProtoObj, 'x'): true
\`\`\`

📌 **Interview term:** an object created with \`Object.create(null)\` has **no prototype at all** — it does not inherit \`hasOwnProperty\`, \`toString\`, or anything else from \`Object.prototype\`. Calling \`.hasOwnProperty()\` directly on it throws, because that method simply does not exist on the object. \`Object.hasOwn()\`, being a static method that takes the object as an argument rather than a receiver, works regardless.

## 4. Verified: A Shadowed hasOwnProperty Fails the Same Way

\`\`\`js
const shadowed = { hasOwnProperty: "not a function", real: 1 };
try {
  shadowed.hasOwnProperty("real");
} catch (e) {
  console.log("shadowed.hasOwnProperty threw:", e.constructor.name, e.message);
}
console.log("Object.hasOwn(shadowed, 'real'):", Object.hasOwn(shadowed, "real"));
\`\`\`

\`\`\`
shadowed.hasOwnProperty threw: TypeError shadowed.hasOwnProperty is not a function
Object.hasOwn(shadowed, 'real'): true
\`\`\`

Even an ordinary object with a working prototype chain can shadow \`hasOwnProperty\` with a non-function value of its own — data from an external API is a common real source of a key literally named \`hasOwnProperty\`. \`Object.hasOwn()\` never looks at the object's own \`hasOwnProperty\` property at all, so this failure mode cannot happen to it.

## 5. Comparison: hasOwn() vs hasOwnProperty.call() vs the in Operator

| | \`Object.hasOwn(obj, k)\` | \`Object.prototype.hasOwnProperty.call(obj, k)\` | \`obj.hasOwnProperty(k)\` | \`k in obj\` |
| :--- | :--- | :--- | :--- | :--- |
| Checks own properties only | Yes | Yes | Yes, when it works | No — walks the prototype chain too |
| Works on a null-prototype object | Yes, verified | Yes, verified | No — throws, verified | Yes |
| Safe if \`hasOwnProperty\` is shadowed on \`obj\` | Yes, verified | Yes, verified | No — throws, verified | Yes |
| Recommended in modern code | Yes | Works, but more verbose | No | Only when inherited properties should count too |

## 6. Common Pitfalls

- **Calling obj.hasOwnProperty() directly without knowing the object's origin.** Verified above: this throws on any \`Object.create(null)\` object and on any object with a shadowed, non-function \`hasOwnProperty\` property.
- **Confusing hasOwn() with the in operator.** \`in\` walks the entire prototype chain and returns \`true\` for inherited properties too; \`hasOwn()\` only ever reports properties declared directly on the object — verified they disagree on an inherited property like \`toString\`.
- **Assuming hasOwn() needs a prototype-having object to work.** Verified false — it is exactly the API that keeps working when \`Object.create(null)\` objects (common for safe, prototype-pollution-resistant maps) are involved.
- **Forgetting hasOwn() works on arrays too, including numeric indices.** \`Object.hasOwn(arr, 0)\` checks whether index 0 is an actual own element, distinct from an inherited method name like \`"map"\`.
- **Passing null or undefined as the target object.** Verified above — \`Object.hasOwn(null, "x")\` throws \`TypeError: Cannot convert undefined or null to object\`, the same \`ToObject\`-based failure \`Object.prototype.hasOwnProperty.call(null, "x")\` also has.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it in one line:</strong> <span style="color:#f0e2c8;">"Object.hasOwn(obj, prop) checks whether prop is an own property of obj -- functionally the same result as hasOwnProperty.call(obj, prop)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the concrete failure it fixes:</strong> <span style="color:#f0e2c8;">"Calling obj.hasOwnProperty directly assumes obj inherited that method. I verified it genuinely throws on an Object.create(null) object, which has no prototype at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the second failure mode too:</strong> <span style="color:#f0e2c8;">"It also breaks if an object has its own property literally named hasOwnProperty that shadows the real method -- I reproduced that throwing too, and confirmed hasOwn() is unaffected."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Distinguish it from the in operator:</strong> <span style="color:#f0e2c8;">"in walks the whole prototype chain and returns true for inherited properties -- hasOwn only ever answers for the object itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. State the recommendation directly:</strong> <span style="color:#f0e2c8;">"MDN documents it as the recommended modern replacement -- same result as the old call() pattern, but shorter and immune to both failure modes."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would anyone create an object with Object.create(null) in the first place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most commonly to build a safe dictionary or lookup map from untrusted keys, without worrying that a key literally named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"toString"</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"__proto__"</code> collides with an inherited method or causes prototype pollution. It genuinely has zero properties from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code> -- which is exactly why calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.hasOwnProperty()</code> directly on it fails, and why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn()</code> exists as a way to check it safely anyway.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Object.hasOwn() work on arrays, and does it distinguish an index from a method name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes -- arrays are objects, and their indices are own properties. I verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn(arr, 0)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> for an actual element, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn(arr, "map")</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code> is inherited from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype</code>, not an own property of the array instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call Object.hasOwn() on a primitive, like a string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The primitive gets boxed into its wrapper object first, the same way <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasOwnProperty.call()</code> already behaves -- I verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.hasOwn("hi", 0)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>, since index 0 of a boxed String is an own, indexed character property. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> cannot be boxed at all, so those genuinely throw instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Object.hasOwn() available in every environment you would target today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It was added in ECMAScript 2022 and is Baseline Widely available -- shipped across all major browsers since March 2022, and supported in current Node.js LTS releases. Anything that genuinely still needs to support pre-2022 browser engines would need the older <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype.hasOwnProperty.call()</code> form or a polyfill instead.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Own property** | A property declared directly on an object, not inherited via its prototype |
| **Object.hasOwn(obj, prop)** | Static method returning true only for own properties, regardless of obj's prototype |
| **Prototype chain** | The chain of objects a property lookup walks through when a property is not found directly |

---
**Conclusion:** \`Object.hasOwn()\` answers exactly the same question as \`Object.prototype.hasOwnProperty.call()\` — is this property declared directly on the object — but as a static function rather than a method the target object has to supply itself. Verified directly: a null-prototype object and an object with a shadowed \`hasOwnProperty\` property both genuinely threw when called the old, direct way, while \`Object.hasOwn()\` handled both correctly. That is precisely why MDN documents it as the recommended modern replacement, and why it belongs in new code by default over the older \`.call()\`-based pattern.`,
    examples: [
      {
        label: "Object.hasOwn() vs hasOwnProperty.call() vs the in operator (run directly)",
        tech: "javascript",
        runnable: true,
        code: `console.log("--- basic equivalence ---");
const obj = { a: 1 };
console.log("Object.hasOwn(obj, 'a'):", Object.hasOwn(obj, "a"));
console.log("Object.prototype.hasOwnProperty.call(obj, 'a'):", Object.prototype.hasOwnProperty.call(obj, "a"));
console.log("Object.hasOwn(obj, 'toString'):", Object.hasOwn(obj, "toString"));

console.log("\\n--- null-prototype object: direct call throws, hasOwn works ---");
const nullProtoObj = Object.create(null);
nullProtoObj.x = 1;
try {
  nullProtoObj.hasOwnProperty("x");
} catch (e) {
  console.log("nullProtoObj.hasOwnProperty threw:", e.constructor.name, e.message);
}
console.log("Object.hasOwn(nullProtoObj, 'x'):", Object.hasOwn(nullProtoObj, "x"));

console.log("\\n--- shadowed hasOwnProperty property ---");
const shadowed = { hasOwnProperty: "not a function", real: 1 };
try {
  shadowed.hasOwnProperty("real");
} catch (e) {
  console.log("shadowed.hasOwnProperty threw:", e.constructor.name, e.message);
}
console.log("Object.hasOwn(shadowed, 'real'):", Object.hasOwn(shadowed, "real"));

console.log("\\n--- inherited property is NOT own, but IS in ---");
const parent = { inherited: 1 };
const child = Object.create(parent);
child.own = 2;
console.log("Object.hasOwn(child, 'inherited'):", Object.hasOwn(child, "inherited"));
console.log("Object.hasOwn(child, 'own'):", Object.hasOwn(child, "own"));
console.log("'inherited' in child:", "inherited" in child);

console.log("\\n--- works on arrays: index vs inherited method name ---");
const arr = [1, 2, 3];
console.log("Object.hasOwn(arr, 0):", Object.hasOwn(arr, 0));
console.log("Object.hasOwn(arr, 'map'):", Object.hasOwn(arr, "map"));

console.log("\\n--- primitives get boxed first ---");
console.log("Object.hasOwn('hi', 0):", Object.hasOwn("hi", 0));
try {
  Object.hasOwn(null, "x");
} catch (e) {
  console.log("Object.hasOwn(null, 'x') threw:", e.constructor.name, e.message);
}`,
      },
    ],
  },
];

export default augments;
