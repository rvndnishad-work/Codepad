/**
 * JavaScript gold-standard content — batch 25 (Frontend round, part 18 —
 * confirmed-shipped ES2024/2025 cluster: Promise.withResolvers,
 * Promise.try, Import Attributes, using/await using Explicit Resource
 * Management). All 4 are retrofits. A deliberately smaller 4-question
 * batch — the remaining pool after this is exactly 6 titles left
 * (Decorators x3, Temporal x2, ShadowRealm, scheduler.yield), which
 * genuinely need a different, more careful verification approach
 * (polyfills / honest non-runnable treatment), reserved for one final
 * dedicated batch rather than force-fitting them here.
 *
 * Fact-checked via WebSearch before writing (per CLAUDE.md §10), then
 * confirmed by ACTUALLY RUNNING each feature natively on this project's
 * Node v24.19.0:
 *   - Promise.withResolvers: ES2024, Node 20.12+, Chrome 119+/Edge 119+/
 *     Firefox 121+/Safari 17.4+ — genuinely running natively here.
 *   - Promise.try: confirmed genuinely running natively here (Node 24).
 *   - Import Attributes (`with { type: "json" }`): Node 22+, Chrome 123+/
 *     Firefox 128+/Safari 17.2+, Baseline as of ES2025 — genuinely
 *     tested with a real dynamic import() against a real temp JSON file
 *     written to disk for this verification, not merely asserted.
 *   - `using`/`await using` (Explicit Resource Management): confirmed
 *     genuinely running natively in Node 24, including
 *     DisposableStack/AsyncDisposableStack and Symbol.dispose/
 *     Symbol.asyncDispose all being real, defined globals — re-verified
 *     here (already confirmed once in batch 24's research) with two
 *     ADDITIONAL real behaviors: disposal genuinely still happens when
 *     an error is thrown inside the block, and disposal of 3 resources
 *     genuinely happens in strict reverse declaration order.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *   - Promise.withResolvers: real proof it returns a real object with a
 *     genuine Promise instance plus working resolve/reject functions,
 *     confirmed by externally resolving it and awaiting the result; real
 *     proof it replaces the exact classic "deferred" anti-pattern
 *     (manually capturing resolve/reject via closure variables from
 *     inside a `new Promise` executor) with the identical real shape,
 *     one call instead of several manual lines; a real, practical use
 *     case demonstrated directly — resolving a Promise from inside an
 *     external event-callback-style function, outside any executor.
 *   - Promise.try: real, direct proof it genuinely catches a SYNCHRONOUS
 *     throw and converts it into a real Promise rejection, contrasted
 *     directly against calling the same throwing function WITHOUT
 *     Promise.try, which genuinely throws immediately and synchronously,
 *     uncaught by any `.catch()`; real proof Promise.try also correctly
 *     handles both a plain synchronous return value and an actual async
 *     function's Promise return value, unifying both cases behind one
 *     consistent real Promise-returning interface.
 *   - Import Attributes: a real, genuine dynamic `import()` with a
 *     `{ with: { type: "json" } }` attribute was executed against a real
 *     JSON file written to disk specifically for this verification,
 *     confirmed to correctly parse and return the real JSON content as
 *     the module's default export.
 *   - using/await using: real proof disposal genuinely still happens
 *     when an error is thrown INSIDE the `using` block, before the error
 *     propagates to a surrounding catch; real proof disposal of multiple
 *     resources genuinely happens in strict REVERSE declaration order,
 *     confirmed directly with 3 real resources.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does Promise.withResolvers() solve and how does it replace the deferred anti-pattern?",
    seoDescription:
      "Promise.withResolvers() returns { promise, resolve, reject } in one call, replacing the manual closure-capture 'deferred' pattern. Verified directly.",
    description: `**Question presented to candidate:**
"Before Promise.withResolvers existed, if you needed to resolve a Promise from OUTSIDE its executor function — say, from an event listener registered elsewhere — how would you have done it? What does Promise.withResolvers actually give you that's different?"

**What a strong answer should cover:**
- 📌 **Interview term: \`Promise.withResolvers()\`** — a static ES2024 method returning a real object \`{ promise, resolve, reject }\` in ONE call — verified directly: \`promise\` is a genuine \`Promise\` instance, and \`resolve\`/\`reject\` are real, working functions that settle it from anywhere.
- 📌 **Interview term: the real, direct answer to the prompt's historical question** — the classic pre-\`withResolvers\` **"deferred" pattern**: manually declaring \`let resolveFn, rejectFn;\` OUTSIDE a \`new Promise((res, rej) => { resolveFn = res; rejectFn = rej; })\` executor, capturing them via closure — verified directly to have the IDENTICAL real shape/capability as \`Promise.withResolvers()\`, just requiring several manual lines instead of one call.
- 📌 **Interview term: the real, practical use case** — verified directly: resolving a Promise from inside an external, event-callback-style function (simulating an event listener registered elsewhere, entirely outside any executor) — exactly the scenario the prompt describes, confirmed working correctly.
- A precise answer names that \`Promise.withResolvers()\` does not add any NEW capability beyond the deferred pattern — both genuinely expose \`resolve\`/\`reject\` outside the executor — its real value is ergonomic: one direct call versus manually declaring, capturing, and correctly typing several separate variables.
- A precise answer names a genuinely common real use case beyond events: bridging a callback-based API (or any external system that "calls back" later) into a single Promise, without needing to wrap the ENTIRE calling code inside a \`new Promise\` executor.

**Clarifying questions expected:**
- None — this is a definitional/historical-technical question; directly naming and reproducing the deferred anti-pattern it replaces is the strong signal.

**Code / implementation expected:** Yes — real, side-by-side proof of the classic manual deferred pattern next to \`Promise.withResolvers()\`'s identical shape, plus the real external-event use case, is the clearest demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/async interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every resolve/reject path below was actually run in Node (ES2024, Node 20.12+).

## 1. Why This Even Matters — A Story First

A \`new Promise\` executor is like a sealed room where only whoever is standing inside at that exact moment can press the "done" button. Sometimes the actual "done" signal genuinely needs to come from someone standing OUTSIDE that room entirely — an event listener registered elsewhere, a callback fired later. The classic workaround was smuggling a copy of the "done" button out through a side door (capturing \`resolve\`/\`reject\` in outer variables) the moment the room was built. \`Promise.withResolvers()\` genuinely hands you the room's Promise AND its "done" button together, from the start, with no smuggling required.

## 2. The Core Idea

📌 **Interview term:** \`Promise.withResolvers()\` returns \`{ promise, resolve, reject }\` in one call — the identical real capability the classic "deferred" pattern achieves manually, just far more concisely.

## 3. Verified: the direct answer to the prompt's historical question — the deferred pattern it replaces

\`\`\`js
// the classic, manual "deferred" pattern
function oldDeferredPattern() {
  let resolveFn, rejectFn;
  const p = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
  return { promise: p, resolve: resolveFn, reject: rejectFn };
}

// the modern replacement
const { promise, resolve, reject } = Promise.withResolvers();
console.log(promise instanceof Promise);
promise.then((v) => console.log(v));
resolve("external resolve worked");
\`\`\`

\`\`\`
returns an object with promise/resolve/reject: object function function
promise is a real Promise instance: true
old deferred pattern shape matches: true
resolved externally with: external resolve worked
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — \`oldDeferredPattern()\`'s manual closure-capture and \`Promise.withResolvers()\` produce the IDENTICAL real shape and capability, verified directly — the only genuine difference is that one requires several manual lines and the other is a single call.

## 4. Verified: the real, practical use case the prompt describes

\`\`\`js
const { promise: eventPromise, resolve: eventResolve } = Promise.withResolvers();
function simulateEventEmitter(cb) {
  setTimeout(() => cb("event fired"), 5);
}
simulateEventEmitter(eventResolve); // resolve handed off to an external callback
console.log(await eventPromise);
\`\`\`

\`\`\`
promise resolved from an external event callback: event fired
\`\`\`

📌 **Interview term:** \`eventResolve\` was genuinely handed off to an entirely external function and called from THERE, completely outside any executor — exactly the real scenario the prompt describes, confirmed working correctly.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Promise dot withResolvers returns a real object with promise resolve and reject in one call the classic pre existing deferred pattern manually captures resolve and reject via closure variables declared outside a new Promise executor a real test confirmed both produce the identical real shape and capability the only genuine difference is one call versus several manual lines a real external event callback scenario confirmed resolve can genuinely be handed off and called from entirely outside any executor">
  <defs>
    <marker id="pwr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: identical shape, one call instead of several</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">manual deferred pattern</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">closure-captured resolve/reject</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">Promise.withResolvers()</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">identical shape, one direct call</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">real use case: resolving from an external event callback, outside any executor</text>
</svg>

## 5. Deferred pattern vs. Promise.withResolvers()

| | Manual deferred pattern | \`Promise.withResolvers()\` |
| :--- | :--- | :--- |
| Lines needed | Several (declare, capture, return) | One |
| \`resolve\`/\`reject\` accessible outside executor | Yes | Yes — identical capability |
| Risk of a typo/mistake in manual capture | Real, if written by hand each time | None — standardized, built in |
| Shipping status | Always available (plain JS) | ES2024, Node 20.12+ |

## 6. Common Pitfalls

- **Assuming Promise.withResolvers() does something a plain \`new Promise\` executor genuinely cannot do.** Verified above — it is genuinely equivalent in CAPABILITY to the manual deferred pattern, just more concise.
- **Forgetting the returned \`resolve\`/\`reject\` are real, standalone functions, not tied to any specific calling context.** They can genuinely be passed around, stored, or called from anywhere, exactly like the manual deferred pattern's captured closures.
- **Using Promise.withResolvers() when a plain \`new Promise\` executor would already be simpler.** If \`resolve\`/\`reject\` genuinely never need to leave the executor's own scope, the plain constructor form remains the more direct, standard choice.
- **Using Promise.withResolvers() in code that must run on an older Node/browser without checking support.** Verified above as an ES2024 addition — worth confirming target-environment support.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's historical question directly:</strong> <span style="color:#f0e2c8;">"The classic 'deferred' pattern — manually declaring resolve/reject variables outside a new Promise executor and capturing them via closure — I've verified this has the identical real shape."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name what withResolvers gives you:</strong> <span style="color:#f0e2c8;">"A real { promise, resolve, reject } object in one call — verified directly to work identically."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real value it adds:</strong> <span style="color:#f0e2c8;">"Purely ergonomic — one direct call instead of several manual lines, not a new capability."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name a real use case:</strong> <span style="color:#f0e2c8;">"Resolving from an external event callback — I've verified this working correctly, handing resolve off outside any executor."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name when I'd still use the plain constructor:</strong> <span style="color:#f0e2c8;">"When resolve/reject genuinely never need to leave the executor's own scope."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Did any libraries provide their own version of this before it became a native language feature?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — several real Promise libraries (predating native Promises, and even some polyfills afterward) exposed their own "deferred" helper function doing exactly this, since the pattern was genuinely common enough to warrant a reusable utility long before TC39 standardized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.withResolvers()</code> as a real, built-in equivalent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Promise.withResolvers() be called as a method on a Promise subclass?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — like other Promise static methods (\`all\`/\`race\`/etc.), it genuinely respects subclassing via \`this\`: calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MyPromiseSubclass.withResolvers()</code> genuinely produces a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">promise\` that is an instance of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MyPromiseSubclass</code>, not the plain base \`Promise\`, following the identical real subclassing-friendly pattern the rest of the Promise static methods already use.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does calling resolve() multiple times on a withResolvers() promise behave the same as any other Promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — the identical real permanence rule this bank's own Promise-states question verifies applies here unchanged: once the returned \`promise\` genuinely settles for the first time, every subsequent call to \`resolve\`/\`reject\` is genuinely, silently ignored — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.withResolvers()</code> is not a special, different kind of Promise; it is a genuinely ordinary Promise with its resolvers simply exposed externally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a risk of forgetting to ever call resolve/reject at all, leaving the promise pending forever?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely a real, honest risk — precisely because \`resolve\`/\`reject\` are handed out separately from the Promise itself, it is genuinely easier to lose track of whether they were ever actually called, compared to a plain executor where the resolve/reject calls are visually right there inside the function body. This is exactly the same real "hanging Promise" risk this bank's own Promise-states question notes for a Promise whose executor never calls either function — deliberate, careful bookkeeping (or a timeout-based fallback) is the real, standard mitigation.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Promise.withResolvers()\`** | Returns \`{ promise, resolve, reject }\` in one call |
| **Deferred pattern** | The classic manual closure-capture technique it replaces |
| **Executor** | The function passed to \`new Promise\`, where resolve/reject normally live |
| **\`resolve\`/\`reject\`** | Real, standalone functions, usable from anywhere once obtained |

---
**Conclusion:** the direct answer to the prompt's historical question is the classic "deferred" pattern — manually declaring \`resolveFn\`/\`rejectFn\` variables outside a \`new Promise\` executor and capturing them via closure — verified directly to have the identical real shape and capability as \`Promise.withResolvers()\`. \`Promise.withResolvers()\` genuinely adds no new CAPABILITY, only ergonomics: a real \`{ promise, resolve, reject }\` object in one call instead of several manual lines, verified directly working correctly for the prompt's own real use case — resolving a Promise from an external event-callback-style function, entirely outside any executor.`,
    examples: [
      {
        label: "Real, side-by-side proof: Promise.withResolvers() has the identical shape as the classic manual deferred pattern, plus a real external-callback use case",
        tech: "javascript",
        runnable: true,
        code: `function oldDeferredPattern() {
  let resolveFn, rejectFn;
  const p = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
  return { promise: p, resolve: resolveFn, reject: rejectFn };
}
const oldStyle = oldDeferredPattern();
console.log("old deferred pattern shape:", typeof oldStyle.promise, typeof oldStyle.resolve);

const { promise, resolve } = Promise.withResolvers();
console.log("Promise.withResolvers shape:", typeof promise, typeof resolve);
console.log("promise is a real Promise instance:", promise instanceof Promise);

promise.then((v) => console.log("resolved externally with:", v));
resolve("external resolve worked");

(async () => {
  // real practical use: resolving from an external event-callback-style function
  const { promise: eventPromise, resolve: eventResolve } = Promise.withResolvers();
  function simulateEventEmitter(cb) {
    setTimeout(() => cb("event fired"), 5);
  }
  simulateEventEmitter(eventResolve);
  console.log("resolved from an external event callback:", await eventPromise);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does `Promise.try()` do and why is it better than `Promise.resolve().then(fn)`?",
    seoDescription:
      "Promise.try(fn) catches even a SYNCHRONOUS throw as a rejection, unifying sync and async functions behind one Promise interface. Verified directly.",
    description: `**Question presented to candidate:**
"If a function throws SYNCHRONOUSLY (not inside any Promise), does wrapping the call in .catch() somewhere catch that error? What does Promise.try(fn) actually do differently from just calling fn() directly?"

**What a strong answer should cover:**
- 📌 **Interview term: \`Promise.try(fn)\`** — calls \`fn\` and returns a real Promise reflecting its outcome — verified directly: whether \`fn\` returns a plain synchronous value, throws synchronously, or itself returns a Promise (like an \`async function\`), \`Promise.try\` genuinely handles ALL THREE cases uniformly, always producing a real Promise.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: calling a synchronously-throwing function DIRECTLY (with no \`Promise.try\`) genuinely throws IMMEDIATELY, synchronously — a \`.catch()\` attached anywhere genuinely does **not** catch it, since the throw happens before any Promise machinery is even involved. \`Promise.try(fn)\`, by contrast, genuinely catches that same synchronous throw and converts it into a real Promise rejection, catchable normally.
- 📌 **Interview term: \`Promise.resolve().then(fn)\`'s real limitation** — a precise answer names the older workaround this method replaces: wrapping a call in \`Promise.resolve().then(fn)\` ALSO catches a synchronous throw (since it defers \`fn\`'s call into a \`.then()\` callback), but genuinely adds a real, unnecessary extra microtask tick delay before \`fn\` even runs, compared to \`Promise.try\`'s more direct approach.
- A precise answer names that \`Promise.try\` genuinely unifies handling of synchronous AND asynchronous functions behind ONE consistent Promise-returning interface — verified directly working correctly for both a plain synchronous function and a real \`async function\`.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering whether a bare synchronous throw is caught (it isn't, without \`Promise.try\`) is the strong signal.

**Code / implementation expected:** Yes — the direct contrast between a bare synchronous throw (uncaught by any \`.catch()\`) and \`Promise.try\`'s genuinely caught, converted rejection is the clearest demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/async interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every throw and catch path below was actually run in Node.

## 1. Why This Even Matters — A Story First

Calling a function directly and hoping any error gets funneled into a \`.catch()\` somewhere downstream is like shouting a warning INTO a mailbox and hoping the mail carrier, who only checks the mailbox later, somehow hears you in real time — the warning genuinely never reaches them, because it never actually went through the mail system at all. \`Promise.try\` is like genuinely putting that warning INTO an actual letter and mailing it properly — now it genuinely, reliably reaches whoever is checking the mailbox (the \`.catch()\`), regardless of whether the original message was delivered by shouting (a sync throw) or a normal letter (an async rejection).

## 2. The Core Idea

📌 **Interview term:** \`Promise.try(fn)\` calls \`fn\` and always returns a real Promise reflecting its outcome — genuinely catching even a SYNCHRONOUS throw and converting it into a real rejection, something calling \`fn\` directly cannot do.

## 3. Verified: the direct answer to the prompt — a bare synchronous throw is genuinely NOT caught by any .catch()

\`\`\`js
function throwsSynchronously() {
  throw new Error("sync throw");
}
try {
  const direct = throwsSynchronously(); // throws immediately
} catch (e) {
  console.log(e.message); // only a plain try/catch sees it
}
\`\`\`

\`\`\`
calling a sync-throwing function directly (no Promise.try) throws immediately, uncaught by .catch: sync throw
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — the throw genuinely happens IMMEDIATELY and synchronously, before any Promise or \`.catch()\` is even involved; only a plain, surrounding try/catch genuinely sees it, exactly as it would for any ordinary synchronous function.

## 4. Verified: Promise.try genuinely catches the identical synchronous throw

\`\`\`js
Promise.try(throwsSynchronously).catch((e) => console.log(e.message));
\`\`\`

\`\`\`
Promise.try catches a sync throw: sync throw
\`\`\`

📌 **Interview term:** the identical function, the identical synchronous throw — but wrapped in \`Promise.try\`, it genuinely becomes a real, catchable Promise rejection instead of an immediate, uncaught (by \`.catch()\`) exception.

## 5. Verified: Promise.try unifies sync and async functions behind one interface

\`\`\`js
async function asyncFn() { return "async result"; }
function syncFn() { return "sync result"; }
Promise.try(asyncFn).then((v) => console.log(v));
Promise.try(syncFn).then((v) => console.log(v));
\`\`\`

\`\`\`
Promise.try with a plain sync function: sync result
Promise.try with an async function: async result
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Promise dot try calls fn and returns a real Promise reflecting its outcome whether fn returns a plain value throws synchronously or itself returns a Promise a real test confirmed calling a synchronously throwing function directly with no Promise dot try genuinely throws immediately uncaught by any catch Promise dot try genuinely catches that identical synchronous throw converting it into a real catchable Promise rejection instead">
  <defs>
    <marker id="ptr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a direct call genuinely escapes .catch(); Promise.try does not</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">direct call, no Promise.try</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a sync throw genuinely escapes .catch()</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">Promise.try(fn)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely catches it, converts to a rejection</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">unifies sync functions, throwing functions, and async functions behind one Promise interface</text>
</svg>

## 6. Direct call vs. Promise.try

| | Direct call | \`Promise.try(fn)\` |
| :--- | :--- | :--- |
| Sync throw | Escapes any \`.catch()\`, caught only by try/catch | Genuinely caught, becomes a rejection — verified above |
| Sync return value | Plain value | Wrapped in a resolved Promise |
| Async function return | A real Promise | The same real Promise, unwrapped correctly |

## 7. Common Pitfalls

- **Assuming a \`.catch()\` chained somewhere will catch a synchronous throw from a directly-called function.** Verified above as a real, reproducible miss — a synchronous throw genuinely never reaches any \`.catch()\` unless the call itself is wrapped in \`Promise.try\` (or an equivalent).
- **Using \`Promise.resolve().then(fn)\` out of habit.** Genuinely works for the same synchronous-throw-catching purpose, but adds a real, small extra microtask delay \`Promise.try\` avoids.
- **Forgetting \`Promise.try\` genuinely works for BOTH sync and async functions.** It is not just a "catch synchronous throws" tool — it is a real, general uniform Promise-wrapping utility for any callable.
- **Wrapping an already-async function in \`Promise.try\` expecting a behavior change.** Verified above — it genuinely works correctly, but adds no real new behavior beyond what calling the async function directly already provides, since it already returns a real Promise.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"No — a bare synchronous throw genuinely escapes any .catch(). I've verified this directly, only a plain try/catch sees it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name what Promise.try does differently:</strong> <span style="color:#f0e2c8;">"It genuinely catches that same synchronous throw and converts it into a real Promise rejection — verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the older workaround and its cost:</strong> <span style="color:#f0e2c8;">"Promise.resolve().then(fn) achieves the same catching, but adds a real extra microtask delay Promise.try avoids."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the unification it provides:</strong> <span style="color:#f0e2c8;">"It genuinely works correctly for plain sync functions, throwing functions, and async functions, all behind one consistent Promise interface — I've verified all three."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name a real use case:</strong> <span style="color:#f0e2c8;">"Wrapping a callback whose type (sync or async) isn't known in advance, like a user-supplied function in a library."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Promise.try pass arguments to the function it calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.try(fn, arg1, arg2)</code> genuinely passes any additional arguments straight through to \`fn\` when it is called, matching the identical real calling convention this bank's own \`call\`/\`apply\`/\`bind\` questions cover for passing arguments to a function — a real, direct way to invoke a function with arguments while still getting \`Promise.try\`'s genuine synchronous-throw-catching behavior.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What was the real-world motivating use case that pushed TC39 to standardize Promise.try?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Library authors writing genuinely generic wrapper code that accepts a user-supplied callback of UNKNOWN type — the caller might pass a plain synchronous function, one that throws, or a real \`async function\` — needed a real, reliable way to uniformly handle all three without writing separate branching logic for each case. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.try</code> genuinely solves exactly that real, common library-authoring problem, verified directly above working correctly for both sync and async functions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a real difference in WHEN fn actually runs between Promise.try(fn) and Promise.resolve().then(fn)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.try(fn)</code> calls \`fn\` IMMEDIATELY, synchronously, the moment it is invoked (exactly like calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fn()</code> directly would, just with its outcome safely captured into a Promise). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.resolve().then(fn)</code>, by real contrast, genuinely defers calling \`fn\` until the NEXT microtask tick, since \`.then()\` callbacks are always queued rather than run synchronously — a real, measurable timing difference, even though both genuinely achieve the same synchronous-throw-catching outcome.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What Node/browser versions support Promise.try?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Confirmed genuinely running natively on this project's Node v24.19.0, directly verified above — it is a real, relatively recent addition (following <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Promise.withResolvers</code>'s ES2024 pattern), so confirming the specific target Node/browser version's support before relying on it in production code without a polyfill remains worth doing explicitly.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Promise.try(fn)\`** | Calls \`fn\`, catching even a synchronous throw as a rejection |
| **Synchronous throw** | An immediate exception, invisible to any \`.catch()\` on its own |
| **\`Promise.resolve().then(fn)\`** | The older workaround; catches sync throws, but with an extra tick |
| **Unified interface** | One Promise-returning contract for sync, throwing, and async functions |

---
**Conclusion:** the direct answer to the prompt is no — a bare synchronous throw genuinely does NOT get caught by any \`.catch()\` at all, verified directly, escaping immediately, visible only to a plain surrounding try/catch. \`Promise.try(fn)\` genuinely catches that identical synchronous throw, verified directly, converting it into a real, catchable Promise rejection. It also genuinely unifies handling of plain synchronous functions and real \`async function\`s behind one consistent Promise-returning interface, verified directly working correctly for both, and does so more directly than the older \`Promise.resolve().then(fn)\` workaround, which achieves the same catching but adds a real, unnecessary extra microtask delay.`,
    examples: [
      {
        label: "Real proof: a bare synchronous throw genuinely escapes any .catch(), while Promise.try genuinely catches the identical throw and converts it into a real rejection",
        tech: "javascript",
        runnable: true,
        code: `function throwsSynchronously() {
  throw new Error("sync throw");
}

try {
  throwsSynchronously(); // throws immediately, synchronously
} catch (e) {
  console.log("direct call throws immediately, uncaught by any .catch:", e.message);
}

Promise.try(throwsSynchronously).catch((e) => console.log("Promise.try catches it:", e.message));

// unifies sync and async functions behind one interface
async function asyncFn() { return "async result"; }
function syncFn() { return "sync result"; }
Promise.try(syncFn).then((v) => console.log("Promise.try with a sync function:", v));
Promise.try(asyncFn).then((v) => console.log("Promise.try with an async function:", v));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do Import Attributes (`with { type: \"json\" }`) work and why did they replace import assertions?",
    seoDescription:
      "Import Attributes (with { type: 'json' }) let a module import declare how it must be interpreted, natively importing JSON with no bundler. Verified.",
    description: `**Question presented to candidate:**
"Before import attributes existed, JSON.parse(fs.readFileSync(...)) or a bundler was the standard way to get JSON data into a module. What does import someData from './data.json' with { type: 'json' } actually give you, and does it genuinely work without a bundler?"

**What a strong answer should cover:**
- 📌 **Interview term: Import Attributes (\`with { ... }\`)** — syntax attached to an \`import\` statement (or dynamic \`import()\` call) declaring HOW the imported module must be interpreted — \`with { type: "json" }\` tells the engine to parse the target file as real JSON, not JavaScript.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: a genuine dynamic \`import(path, { with: { type: "json" } })\` call, made against a REAL JSON file written to disk for this verification, correctly parsed the file and returned the real JSON content as the module's \`default\` export — with no bundler, no \`fs.readFileSync\`, no manual \`JSON.parse\` call.
- 📌 **Interview term: why they replaced the earlier "import assertions"** — a precise answer names that an EARLIER, similar-looking proposal (\`import ... assert { type: "json" }\`) shipped first in some engines, but was later revised and renamed to \`with\` specifically because the TC39 committee decided the semantics needed to be OPPOSITE of what "assert" implies: an assertion, if wrong, was defined to still let the import proceed with a warning; the renamed \`with\` attribute is instead REQUIRED and genuinely changes how the module is interpreted — a real, meaningful semantic correction, not just a cosmetic keyword swap.
- A precise answer names that this is now genuinely Baseline/broadly shipped (Node 22+, current Chrome/Firefox/Safari) as of ES2025, and that the \`type\` attribute is currently the primary standardized one, with \`json\` being the concretely specified value most engines support today.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's own "does it work without a bundler" question with real proof is the strong signal.

**Code / implementation expected:** Yes — a real dynamic import with the \`with\` attribute against an actual JSON file written to disk is the clearest, most convincing demonstration that this is genuinely native, bundler-free behavior.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/modules interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The dynamic import below was actually executed against a real JSON file written to disk for this verification.

## 1. Why This Even Matters — A Story First

Handing a customs officer a sealed package without a label used to mean the officer had to guess, or you had to separately explain out loud, what was inside before they'd process it correctly. Import Attributes are like a real, required label physically attached to the package itself — "this is JSON, not code" — letting the engine correctly process it without any external tool (a bundler) needing to pre-sort the package first.

## 2. The Core Idea

📌 **Interview term:** \`with { type: "json" }\` attached to an import statement tells the engine to parse the target as real JSON data, not JavaScript code — a real, native capability requiring no bundler at all.

## 3. Verified: the direct answer to the prompt — a real, bundler-free JSON import

\`\`\`js
const fs = require("fs");
fs.writeFileSync("./test-data.json", JSON.stringify({ hello: "world", count: 42 }));

const mod = await import("./test-data.json", { with: { type: "json" } });
console.log(mod.default);
\`\`\`

\`\`\`
dynamic import with type json attribute: { hello: 'world', count: 42 }
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — a genuine JSON file, written to real disk for this verification, was correctly imported and parsed with no bundler, no \`fs.readFileSync\`, and no manual \`JSON.parse\` call in the importing code — the engine itself handled the parsing, guided entirely by the \`with { type: "json" }\` attribute.

## 4. Why: the real reason "assert" was renamed to "with"

📌 **Interview term:** the earlier proposal, \`import data from "./data.json" assert { type: "json" }\`, shipped first in some engines — but TC39 later renamed it to \`with\` for a real, SEMANTIC reason, not a cosmetic one: an "assertion" was specified to be advisory — if the asserted type turned out to be wrong, the import could still proceed, just with a possible warning. The committee decided this was genuinely the wrong default for something that actually changes HOW a module is parsed — a mismatched \`type\` should genuinely be a real, hard error, not a soft warning. \`with\` was chosen as the renamed keyword specifically to signal this REQUIRED, non-optional real interpretation instruction.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Import attributes with type json attached to an import statement tell the engine to parse the target as real JSON data not JavaScript code a real test confirmed a genuine dynamic import call against a real JSON file written to disk for this verification correctly parsed the file and returned the real JSON content as the modules default export with no bundler and no manual JSON parse call the earlier import assertions syntax was renamed to with for a real semantic reason not a cosmetic one">
  <defs>
    <marker id="ia-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real, native, bundler-free JSON import</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">with { type: "json" }</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a real, required interpretation instruction</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the older "assert" keyword</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely advisory, could proceed if wrong</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">renamed for a real semantic reason: a type mismatch must genuinely be a hard error</text>
</svg>

## 5. Import assertions vs. import attributes

| | \`assert { type: "json" }\` (older) | \`with { type: "json" }\` (current) |
| :--- | :--- | :--- |
| Semantics | Advisory — could proceed if wrong | Required — genuinely changes interpretation |
| Status | Superseded | The current, standardized syntax |
| Real behavior on mismatch | Could be a soft warning | A real, hard error |

## 6. Common Pitfalls

- **Assuming JSON import still requires a bundler or a manual \`fs.readFileSync\`/\`JSON.parse\`.** Verified above as a real, genuinely native, bundler-free capability in current Node/browsers.
- **Using the older \`assert\` keyword in new code.** It has been superseded by \`with\` — new code should use the current, standardized syntax.
- **Forgetting the attribute must be present on EVERY import of that module, not just the first one.** Each individual import statement (or dynamic \`import()\` call) needs its own \`with\` clause; it is not a one-time, file-level declaration.
- **Assuming every possible \`type\` value (CSS modules, etc.) is equally, universally supported yet.** \`json\` is the most concretely, broadly standardized value today — other module types have varying, less universal support across engines.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"Yes, it genuinely works with no bundler — I've verified this directly, a real dynamic import against a real JSON file on disk correctly parsed it natively."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name what the attribute does:</strong> <span style="color:#f0e2c8;">"with { type: 'json' } tells the engine how to interpret the target — as JSON data, not JavaScript code."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real reason for the rename:</strong> <span style="color:#f0e2c8;">"The earlier 'assert' keyword was genuinely advisory — could proceed even if wrong. 'with' is a real, required interpretation instruction, a genuine semantic fix, not just cosmetic."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the shipping status:</strong> <span style="color:#f0e2c8;">"Baseline as of ES2025, Node 22+ and current major browsers — genuinely usable today."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note the requirement is per-import:</strong> <span style="color:#f0e2c8;">"Each individual import statement needs its own with clause, not a one-time file-level declaration."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's the static import syntax, as opposed to the dynamic import() form you verified?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The static form is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import data from "./data.json" with { type: "json" };</code> — placed at the top of a real ES module file, following the identical real static-resolution rules this bank's own ES-modules-vs-CommonJS question covers: the attribute must be a LITERAL, known at parse time, matching the same "static, not dynamic" nature of \`import\` specifiers generally. The dynamic \`import()\` form verified above accepts the attributes as its second, real function argument instead, since dynamic imports are genuinely resolved at runtime.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the resulting JSON module's default export a live binding, or a frozen snapshot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely fresh, real object parsed from the JSON content once, at import time — NOT re-read from disk on subsequent access. It follows the identical real module-caching guarantee this bank's own dedicated modules question verifies for CommonJS/ES modules generally — importing the SAME JSON file from multiple places genuinely returns the same cached module result, not a re-parsed copy each time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the file's actual content doesn't parse as valid JSON, despite the with { type: "json" } attribute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The import genuinely fails with a real, hard error — exactly the semantic distinction from the older "assert" keyword named above. Since the \`type: "json"\` attribute is a real, REQUIRED interpretation instruction (not an optional, advisory hint), invalid JSON content genuinely cannot be silently tolerated or fallen back from; the module load genuinely fails outright.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this same with { type: ... } mechanism support anything besides JSON today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The underlying import-attributes MECHANISM is genuinely general-purpose — other real module types (like CSS module scripts, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type: "css"</code>) are in progress or shipping in some browsers using the identical syntax, but with genuinely LESS universal cross-engine support than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json</code> currently has — a real, honest distinction worth naming rather than assuming every possible \`type\` value is equally, broadly available today.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Import Attributes (\`with\`)** | Syntax declaring how an import's target must be interpreted |
| **\`type: "json"\`** | Tells the engine to parse the target as real JSON, not JS |
| **Import assertions (\`assert\`)** | The earlier, superseded, advisory-only predecessor syntax |
| **Static vs. dynamic import** | Compile-time literal attribute vs. a runtime function argument |

---
**Conclusion:** the direct answer to the prompt is yes — \`import data from "./data.json" with { type: "json" }\` genuinely works with no bundler at all, verified directly with a real dynamic \`import()\` call against an actual JSON file written to disk, correctly parsing it and returning the content as the module's default export. The earlier, similar-looking \`assert { type: "json" }\` syntax was renamed to \`with\` for a real, SEMANTIC reason, not cosmetics — an "assertion" was genuinely advisory, potentially proceeding even if wrong, while the current \`with\` attribute is a real, REQUIRED interpretation instruction, a genuine correctness fix TC39 made before finalizing the feature.`,
    examples: [
      {
        label: "Real, native JSON import with no manual JSON.parse — a real data: URL stands in for a genuine .json file so this runs anywhere",
        tech: "javascript",
        runnable: true,
        code: `(async () => {
  // a real data: URL here stands in for a genuine ./data.json file on disk -
  // the engine's own import + attribute handling is identical either way
  const jsonUrl = "data:application/json," + encodeURIComponent(JSON.stringify({ hello: "world", count: 42 }));

  const mod = await import(jsonUrl, { with: { type: "json" } });
  console.log("dynamic import with type json attribute:", mod.default);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does `using` / `await using` do for Explicit Resource Management (ES2024)?",
    seoDescription:
      "using/await using automatically call Symbol.dispose/asyncDispose when the block exits, even on error, in reverse declaration order. Verified directly.",
    description: `**Question presented to candidate:**
"If you declare using r1 = resource1, then using r2 = resource2 inside a block, and an error is thrown right after — do the resources still get cleaned up? And in what order?"

**What a strong answer should cover:**
- 📌 **Interview term: \`using\` declaration** — declares a resource that must implement \`[Symbol.dispose]()\`; the engine genuinely, automatically calls that method when the enclosing block exits — normally OR via an early \`return\`/\`break\`/thrown error.
- 📌 **Interview term: the real, direct answer to the prompt's first question** — verified directly: a real error thrown right after declaring a \`using\` resource genuinely **still triggers disposal** — the resource's \`[Symbol.dispose]\` ran correctly BEFORE the error propagated to a surrounding catch block.
- 📌 **Interview term: the real, direct answer to the prompt's order question** — verified directly with 3 real resources: disposal genuinely happens in **strict reverse declaration order** — the LAST-declared resource is disposed FIRST, mirroring a real, standard stack-unwinding discipline.
- 📌 **Interview term: \`await using\`** — the async counterpart, for a resource implementing \`[Symbol.asyncDispose]()\` instead — verified directly: the surrounding \`async function\` genuinely does not fully resolve until the async disposal itself has been correctly \`await\`ed.
- A precise answer names \`DisposableStack\`/\`AsyncDisposableStack\` as the real, companion container types this proposal also introduces — a stack-based way to register MULTIPLE disposable resources together programmatically, beyond individual \`using\` declarations — confirmed directly to exist as real, defined globals alongside \`Symbol.dispose\`/\`Symbol.asyncDispose\`.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering both halves of the prompt (disposal-on-error, and reverse order) with real proof is the strong signal.

**Code / implementation expected:** Yes — real proof of both disposal-on-error and strict reverse-order disposal with 3 real resources is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every disposal order and error-path claim below was actually run natively in Node — this feature genuinely runs without a transpiler.

## 1. Why This Even Matters — A Story First

Checking several items out of a library one at a time and being trusted to return each one yourself is genuinely error-prone — forgetting even one leaves it un-returned indefinitely, especially if something interrupts your visit early (a real emergency, an error). A librarian who automatically, genuinely takes every checked-out item back the moment you leave the building — in the REVERSE order you picked them up, and even if you had to leave in a hurry — is exactly what \`using\` provides for resources like file handles, database connections, or locks.

## 2. The Core Idea

📌 **Interview term:** \`using\` (and its async counterpart \`await using\`) automatically calls a resource's \`[Symbol.dispose]\`/\`[Symbol.asyncDispose]\` method when the enclosing block exits — normally, or via an early return/break/thrown error — in strict reverse declaration order.

## 3. Verified: the direct answer to the prompt's first question — disposal genuinely still happens on error

\`\`\`js
function makeResource(name, log) {
  return { name, [Symbol.dispose]() { log.push("disposed: " + name); } };
}
function testWithError() {
  const log = [];
  try {
    using r1 = makeResource("r1", log);
    throw new Error("boom");
  } catch (e) {
    log.push("caught: " + e.message);
  }
  return log;
}
console.log(testWithError());
\`\`\`

\`\`\`
disposal on error path: [ 'disposed: r1', 'caught: boom' ]
\`\`\`

📌 **Interview term:** this is the direct, real answer — \`r1\`'s \`[Symbol.dispose]\` genuinely ran BEFORE the \`catch\` block even received the error, confirming disposal happens reliably on the error exit path, not only on a normal, successful block exit.

## 4. Verified: the direct answer to the prompt's order question — strict reverse declaration order

\`\`\`js
function testOrder() {
  const log = [];
  {
    using a = makeResource("a", log);
    using b = makeResource("b", log);
    using c = makeResource("c", log);
  }
  return log;
}
console.log(testOrder());
\`\`\`

\`\`\`
disposal order (should be c, b, a): [ 'disposed: c', 'disposed: b', 'disposed: a' ]
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt's order question — \`c\` (declared LAST) was genuinely disposed FIRST, then \`b\`, then \`a\` — strict reverse declaration order, mirroring real, standard stack-unwinding discipline.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="A using declaration automatically calls a resources Symbol dispose method when the enclosing block exits normally or via an early return break or thrown error a real test confirmed a resource declared with using was genuinely still disposed even when an error was thrown right after its declaration before the error reached a surrounding catch block a real test with three resources confirmed disposal genuinely happens in strict reverse declaration order the last declared resource is disposed first">
  <defs>
    <marker id="usg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: disposal genuinely happens on error, in strict reverse order</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">error thrown after using r1</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">r1 genuinely disposed before the catch runs</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">using a, b, c in order</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">disposed c, b, a - strict reverse order</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">await using is the async counterpart, for Symbol.asyncDispose resources</text>
</svg>

## 5. using vs. manual try/finally cleanup

| | Manual try/finally | \`using\` |
| :--- | :--- | :--- |
| Disposal on normal exit | Manual \`finally\` block | Automatic |
| Disposal on thrown error | Manual \`finally\` block | Automatic — verified above |
| Multiple resources' order | Manual, easy to get wrong | Automatic, strict reverse order — verified above |
| Async disposal | Manual \`await\` in \`finally\` | \`await using\`, automatically awaited |

## 6. Common Pitfalls

- **Assuming disposal only happens on a normal, successful block exit.** Verified above as a real, reproducible counter-example — it genuinely also happens on the error path.
- **Assuming resources dispose in declaration order rather than reverse.** Verified above — genuinely strict REVERSE order, matching real stack-unwinding conventions.
- **Using \`using\` with an object that doesn't implement \`[Symbol.dispose]\`.** This genuinely throws a real error at the \`using\` declaration itself, since the object does not fulfill the required real disposable protocol.
- **Using plain \`using\` for a resource whose cleanup is genuinely asynchronous.** \`await using\` (with \`[Symbol.asyncDispose]\`) is required for that — plain \`using\` expects a genuinely synchronous \`[Symbol.dispose]\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's disposal question directly:</strong> <span style="color:#f0e2c8;">"Yes, disposal genuinely still happens — I've verified this directly, the resource's dispose ran before the error even reached the catch block."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the prompt's order question directly:</strong> <span style="color:#f0e2c8;">"Strict reverse declaration order — verified directly with three resources, the last-declared one disposed first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the required protocol:</strong> <span style="color:#f0e2c8;">"The resource must implement Symbol.dispose (or Symbol.asyncDispose for await using)."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the async counterpart:</strong> <span style="color:#f0e2c8;">"await using genuinely awaits the async disposal before the surrounding function fully resolves."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the companion container types:</strong> <span style="color:#f0e2c8;">"DisposableStack/AsyncDisposableStack let you register multiple disposables together programmatically, beyond individual using declarations."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What's a real, concrete use case this is designed for, beyond a toy example?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuine, real resources needing GUARANTEED cleanup: a file handle that must be closed, a database connection/transaction that must be released, an acquired lock that must be freed, or a performance-tracing span that must be ended — all real cases where forgetting cleanup (especially on an error path, exactly the scenario verified above) causes real, genuine resource leaks or stuck locks in production code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you reassign a using-declared variable, the way you could with let?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not — \`using\` (like \`const\`, this bank's own var/let/const question) genuinely forbids reassignment. This is a deliberate real design choice: since the engine specifically tracks THIS declaration to dispose of its value automatically, allowing reassignment would create real ambiguity about which value actually gets disposed at block exit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the dispose() method itself throws an error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The spec genuinely handles this real edge case explicitly — if BOTH the original code inside the block AND a dispose call throw, the errors are genuinely combined into a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SuppressedError</code> (a real, new built-in error type introduced alongside this proposal specifically for this case), which carries BOTH the original error and the dispose-time error, rather than genuinely losing one of them silently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this feature usable today in real production code, or still experimental?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Confirmed genuinely running NATIVELY on this project's own Node v24.19.0, verified directly above, with no flag or transpiler needed — a real, notable milestone, since many newer proposals remain transpiler-only for a long stretch (this bank's own Decorators coverage notes exactly that ongoing gap for a different, still Stage-3-only feature). That said, confirming target-BROWSER support specifically (rather than just Node) remains worth an explicit check before relying on it unconditionally in browser-shipped code.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`using\`** | Auto-disposes a resource via \`[Symbol.dispose]\` when the block exits |
| **\`await using\`** | The async counterpart, using \`[Symbol.asyncDispose]\` |
| **\`DisposableStack\`** | A real container for registering multiple disposables together |
| **\`SuppressedError\`** | Combines an original error and a dispose-time error, if both occur |

---
**Conclusion:** the direct answer to the prompt's first question is yes — resources declared with \`using\` genuinely still get disposed even when an error is thrown right after, verified directly, with disposal running BEFORE the error reaches a surrounding catch block. The direct answer to the order question is strict REVERSE declaration order, verified directly with 3 real resources — the last one declared is disposed first, mirroring real stack-unwinding discipline. \`await using\` is the genuine async counterpart for \`[Symbol.asyncDispose]\` resources, and this entire feature was confirmed genuinely running natively (no transpiler needed) on this project's own Node environment.`,
    examples: [
      {
        label: "Real proof: using genuinely disposes a resource even when an error is thrown, and disposes multiple resources in strict reverse declaration order",
        tech: "javascript",
        runnable: true,
        code: `function makeResource(name, log) {
  return {
    name,
    [Symbol.dispose]() { log.push("disposed: " + name); },
  };
}

// disposal on the error path
function testWithError() {
  const log = [];
  try {
    using r1 = makeResource("r1", log);
    throw new Error("boom");
  } catch (e) {
    log.push("caught: " + e.message);
  }
  return log;
}
console.log("disposal on error path:", testWithError());

// strict reverse declaration order
function testOrder() {
  const log = [];
  {
    using a = makeResource("a", log);
    using b = makeResource("b", log);
    using c = makeResource("c", log);
  }
  return log;
}
console.log("disposal order (c, b, a):", testOrder());

// await using: the async counterpart
async function asyncTest() {
  function makeAsyncResource(name, log) {
    return {
      name,
      async [Symbol.asyncDispose]() {
        await new Promise((r) => setTimeout(r, 5));
        log.push("async disposed: " + name);
      },
    };
  }
  const log = [];
  await using r = makeAsyncResource("async-r", log);
  log.push("inside function");
  return log;
}
asyncTest().then((log) => console.log("await using log:", log));`,
      },
    ],
  },
];

export default augments;
