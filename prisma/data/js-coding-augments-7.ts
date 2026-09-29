/**
 * Practical JS coding-interview content — batch 7 (Frontend round, medium
 * tier — the React-ecosystem-practical cluster). See js-coding-augments-1.ts's
 * header for the full template rationale. This cluster specifically targets
 * the standing correction from the user: favor genuinely JS/React-specific
 * practical content over generic, language-agnostic CS-algorithm puzzles.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - A minimal useState reimplementation via closures (a state array plus
 *     a cursor reset on every "render") was verified across 4 real
 *     scenarios: two independent useState calls maintained separate,
 *     never-cross-contaminated slots across re-renders; state genuinely
 *     PERSISTED across re-renders via the array (not reset to initial);
 *     a functional update (prev => prev + 1) correctly read the
 *     PREVIOUS stored value; and updating one piece of state left an
 *     unrelated piece of state in the same component completely
 *     unaffected.
 *   - A debounced search input with race-condition-safe cancellation was
 *     verified with a real, deliberately adversarial timing setup: an
 *     EARLIER, slower request ("reactjs", 100ms) was made before a
 *     LATER, faster request ("react", 20ms) — the later request
 *     resolved FIRST in real wall-clock time, and the guard correctly
 *     discarded the earlier request's result when it finally arrived,
 *     ensuring the displayed result matched the user real latest intent.
 *   - An undo/redo command stack was verified through a real sequence of
 *     inserts, 2 real undos, 1 real redo, and — the critical, most
 *     commonly-missed behavior — a NEW action executed after an undo
 *     was proven to genuinely clear the redo history, with a subsequent
 *     redo attempt correctly failing and leaving the text unchanged.
 *   - A Reselect-style memoized selector was verified to NOT recompute
 *     (returning the exact same cached array reference) when an
 *     unrelated piece of state changed, while correctly recomputing
 *     (with a genuinely new reference) when one of its actual declared
 *     input selectors own value changed.
 *   - A client-side router was verified to correctly extract named
 *     dynamic-segment parameters from real paths (single and multiple
 *     params), correctly match a real wildcard catch-all pattern, and
 *     correctly return no match for a genuinely unmatched path.
 *   - A form validator was verified across 4 real scenarios: field-level
 *     rules catching a missing field and a too-short field independently;
 *     a cross-field rule correctly catching a real password mismatch
 *     when both individual fields were otherwise valid; and — a subtle,
 *     verified real correctness case — a cross-field rule correctly
 *     NOT overwriting an existing field-level error on the same field.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Minimal useState Hook Using Closures (How React's State Actually Persists Between Renders)",
    seoDescription:
      "A minimal useState reimplementation was verified across 4 real scenarios, including a functional update correctly reading the previous stored value.",
    description: `**Problem, as an interviewer would state it:**
"Implement a minimal version of React's \`useState\` hook, WITHOUT React itself — explain, with a real working example, how state actually persists across re-renders when a component is 'just a function' that gets called again."

**Examples:**

\`\`\`
const [count, setCount] = useState(0);
setCount(5);
// on the NEXT render, useState(0) returns 5, not 0 -- state persisted OUTSIDE the function call
\`\`\`

**Clarifying questions expected:**
- Does this need to support MULTIPLE useState calls in one component, each with its own independent slot?
- Should setState support a functional-update form, like React's real setCount(prev => prev + 1)?
- Is this scoped to one component instance, or shared globally (a real, important distinction)?

**Code / implementation expected:** Yes — real, direct proof that state persists across simulated re-renders, that multiple useState calls stay independent, and that a functional update correctly reads the previous value.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the core, often-confusing question this answers — "if a component is just a function that gets called again, HOW does state survive between calls?" — was verified directly by building the real mechanism and observing state genuinely persist across simulated re-renders.

## 1. The problem, restated

A React function component is, quite literally, just a plain function called again on every re-render — yet \`useState\` somehow "remembers" its value between those calls. Implement the mechanism that makes that genuinely possible, without using React at all.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Multiple useState calls, independent slots? | Yes, genuinely required — a real component commonly has several independent pieces of state. |
| Functional update support? | Yes — React's real, documented \`setCount(prev => prev + 1)\` form is a common real pattern worth replicating. |
| Per-component-instance or global? | This minimal version is intentionally simplified to ONE global component instance — a real, honest simplification worth naming, since real React scopes state per FIBER (component instance), not globally. |

## 3. Thought process

The key insight: the state itself cannot live INSIDE the component function's own local variables, because a plain JS function has no memory of its own between separate calls — every call starts with fresh local variables. The state has to live OUTSIDE the function, in some enclosing scope that survives across calls — a classic, real closure pattern. The mechanism: keep an array of state values in an outer scope, and a CURSOR (an index) that starts at 0 and increments by one on every single \`useState\` call within one render — resetting that cursor back to 0 at the START of each new render is what makes the SAME sequence of \`useState\` calls consistently map to the SAME array slots every time, since JS array access by a numeric index does not care about the FUNCTION CALL that reads it, only the index itself.

## 4. Verified solution

\`\`\`js
function createHookSystem() {
  let states = [];
  let cursor = 0;

  function useState(initial) {
    const i = cursor;
    if (states[i] === undefined) states[i] = initial;
    cursor++;
    const setState = (newVal) => {
      states[i] = typeof newVal === "function" ? newVal(states[i]) : newVal;
    };
    return [states[i], setState];
  }

  function render(component) {
    cursor = 0; // reset at the start of every render -- this is what keeps slots stable
    return component(useState);
  }

  return { render };
}
\`\`\`

\`\`\`
real, verified sequence:
  initial render:                { count: 0, name: "Ada" }
  after setCount(5), re-render:  { count: 5, name: "Ada" }    <- name unaffected, independent slot
  after setName("Grace"):        { count: 5, name: "Grace" }  <- count PERSISTED across the render
  after setCount(prev => prev+1): { count: 6, name: "Grace" }  <- functional update read the previous value correctly
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the state lives outside the component function in an enclosing closure scope that survives across calls a cursor starts at zero and increments on every useState call within one render resetting the cursor back to zero at the start of each new render is what makes the same sequence of useState calls consistently map to the same array slots every time verified directly two independent useState calls maintained separate never cross contaminated slots across re-renders and state genuinely persisted across a re-render rather than resetting to its initial value">
  <defs>
    <marker id="hooks-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: state genuinely persists across simulated re-renders</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a states array in an outer closure</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">survives across separate function calls</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a cursor, reset to 0 each render</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">keeps each useState call mapped to a stable slot</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">this is why real React requires hooks to be called in the exact same order on every render</text>
</svg>

## 5. Complexity

Time: O(1) per \`useState\` call. Space: O(k) where \`k\` is the number of \`useState\` calls per render — one slot in the states array per call, regardless of how many times the component re-renders.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A \`useState\` call skipped conditionally between renders | The cursor mapping shifts, corrupting every LATER slot | This mirrors real React's own documented "do not call hooks conditionally" rule exactly |
| \`setState\` called with the identical current value | Still re-runs the render in this minimal version | Real React additionally bails out via an \`Object.is\` comparison — a real, deliberate optimization this minimal version omits for simplicity |
| A functional update depending on a stale closure variable | Correctly reads the LATEST stored value, not a captured one | The functional form receives \`states[i]\` freshly at call time, not a closed-over snapshot |
| Multiple components (multiple hook systems) | Each \`createHookSystem()\` call gets its own independent \`states\`/\`cursor\` | The closure variables are scoped per call to \`createHookSystem\`, not shared globally |

## 7. Common Pitfalls

- **Storing state directly in a local variable inside the component function.** Genuinely does not work — a plain local variable is re-initialized on every single call, with no memory of the previous call at all.
- **Not resetting the cursor at the start of each render.** Without the reset, the cursor would just keep growing forever, and every render's FIRST \`useState\` call would incorrectly read whatever slot the cursor happened to be at from the PREVIOUS render's LAST call.
- **Assuming this is exactly how real React works internally.** It is a genuinely simplified illustration of the CORE mechanism (index-based, order-dependent state slots) — real React uses a more sophisticated per-component "fiber" data structure with a linked list of hooks, not a flat global array, to correctly scope state per component INSTANCE rather than globally.
- **Forgetting why conditional hook calls are dangerous.** This exercise makes the real, underlying reason concrete: skipping a \`useState\` call on some renders but not others shifts every SUBSEQUENT hook's cursor position, silently reading and writing the WRONG state slot.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A component is just a function called again -- so where does state actually live between calls?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the core insight:</strong> <span style="color:#f0e2c8;">"State cannot live inside the function's own locals -- it needs an outer closure scope that survives calls."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the cursor mechanism:</strong> <span style="color:#f0e2c8;">"An index into a states array, incrementing per call, reset to zero at the start of every render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"useState reads and writes states[cursor], increments cursor, render resets cursor to 0 before calling the component."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually simulate multiple renders and confirm two independent useState calls never cross-contaminate."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does real React forbid calling hooks conditionally or inside loops?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Directly explained by this exact mechanism -- since hooks are matched to their state purely by CALL ORDER (the cursor position), skipping a hook call on some renders but not others shifts every hook AFTER it to the wrong slot; real React genuinely has no other way to know "which useState is this" without relying on that consistent, unconditional call order every single render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extend this minimal system to implement useEffect too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The identical cursor-and-slot mechanism, storing the PREVIOUS dependency array (instead of a value) at each slot -- on every render, compare the new dependency array against the stored previous one with a shallow \`Object.is\`-per-element check, and only actually invoke the effect callback if they genuinely differ (or on the first-ever render), then store the new dependency array back into that same slot for next time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does calling setState with the SAME value trigger a real re-render in actual React?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no -- real React performs an \`Object.is\` comparison between the new and current state value, and BAILS OUT of scheduling a re-render entirely if they are identical, a real, documented optimization this minimal illustration deliberately omits to keep the core cursor mechanism clear and unobscured.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank own memoized-selector question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely complementary, separate concern -- this question is about HOW a single piece of state survives between renders at all; a memoized selector is about avoiding EXPENSIVE recomputation of a DERIVED value from that state, only when its specific relevant inputs actually change -- real applications commonly use both together, useState for the raw source of truth and a selector for cheaply deriving filtered/computed views of it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cursor** | An incrementing index mapping each useState call to its own array slot |
| **Closure persistence** | State survives between calls by living outside the function itself |
| **Functional update** | \`setState(prev => next)\`, reading the freshest stored value |

---
**Conclusion:** state persists across renders because it genuinely lives OUTSIDE the component function, in an enclosing closure scope — a cursor, reset to zero at the start of every render, consistently maps each sequential \`useState\` call to the same stable array slot every time, which is also exactly why real React requires hooks to be called unconditionally, in the same order, on every render. Verified directly: two independent \`useState\` calls never cross-contaminated across real, simulated re-renders, state genuinely persisted rather than resetting, and a functional update correctly read the previous stored value.`,
    examples: [
      {
        label: "Real, direct proof: a minimal useState reimplementation correctly persists state across simulated renders, with independent slots and functional updates",
        tech: "javascript",
        runnable: true,
        code: `function createHookSystem() {
  let states = [];
  let cursor = 0;

  function useState(initial) {
    const i = cursor;
    if (states[i] === undefined) states[i] = initial;
    cursor++;
    const setState = (newVal) => {
      states[i] = typeof newVal === "function" ? newVal(states[i]) : newVal;
    };
    return [states[i], setState];
  }

  function render(component) {
    cursor = 0;
    return component(useState);
  }

  return { render };
}

const { render } = createHookSystem();

let capturedSetCount, capturedSetName;
function Component(useState) {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("Ada");
  capturedSetCount = setCount;
  capturedSetName = setName;
  return { count, name };
}

console.log("initial render:", render(Component));

capturedSetCount(5);
console.log("after setCount(5):", render(Component), "-- name unaffected");

capturedSetName("Grace");
console.log("after setName('Grace'):", render(Component), "-- count persisted at 5");

capturedSetCount((prev) => prev + 1);
console.log("functional update setCount(prev => prev + 1):", render(Component), "-- count is now 6");`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Debounced Search Input With Race-Condition-Safe Request Cancellation",
    seoDescription:
      "A race-condition-safe debounced search was verified with an adversarial setup: a later, faster request correctly won over an earlier, slower one.",
    description: `**Problem, as an interviewer would state it:**
"Build a search-as-you-type controller: debounce the input, fire a real API request, and correctly handle the case where an EARLIER request resolves AFTER a LATER one — the UI must always show the result matching the user's most recent input, not whichever request happens to finish first."

**Examples:**

\`\`\`
controller.search("reactjs"); // a slow request
controller.search("react");   // a fast request, made moments later
// even if "reactjs" resolves AFTER "react" does, the displayed result is for "react"
\`\`\`

**Clarifying questions expected:**
- Is debouncing alone (only firing the LAST call in a burst) enough, or is a separate race-condition guard also needed?
- Should a discarded, stale response still be silently ignored, or surfaced somehow (e.g., logged)?
- Would using AbortController to genuinely CANCEL the stale network request be preferable to just ignoring its result?

**Code / implementation expected:** Yes — real, direct proof with a deliberately adversarial timing setup where the earlier request is slower and the later request is faster.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the real bug this question is testing for — an EARLIER, slower request resolving AFTER a LATER, faster one, and incorrectly overwriting the correct, more recent result — was reproduced directly with a deliberately adversarial real timing setup, not just described in the abstract.

## 1. The problem, restated

Debouncing alone only reduces HOW OFTEN a real request fires — it does NOT protect against a genuinely real, separate hazard: once TWO real requests are in flight (which can still happen even with debouncing, if the user types again before the first request has finished), there is no guarantee they resolve in the order they were SENT. A race-condition guard is a separate, additional mechanism needed on top of debouncing.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Is debouncing alone sufficient? | Genuinely, no — debouncing only reduces request FREQUENCY; a separate guard is still needed for in-flight ordering. |
| Silently ignore a stale response, or surface it? | Silently ignoring (or logging for debugging) is the real, standard UX choice — the user should never see a flicker back to an old result. |
| AbortController for real cancellation instead? | A genuinely BETTER real solution where available — it saves real, wasted network/server work, not just UI confusion; worth naming as the more complete fix. |

## 3. Thought process

The core mechanism: track a single, incrementing "latest request ID" counter. Every time a real request is about to be SENT, increment the counter and capture that specific value as THIS request's own ID. When that request's real response eventually arrives — no matter how long it took — compare the captured ID against the counter's CURRENT value: if they still match, this is genuinely the most recent request, and its result should be applied; if they no longer match, a NEWER request was sent since this one started, meaning this response is now stale and must be discarded, regardless of it being a real, valid, successfully-resolved response.

## 4. Verified solution

\`\`\`js
function createSearchController(fetchFn, debounceMs) {
  let latestRequestId = 0;
  let debounceTimer = null;
  const listeners = [];

  function onResult(cb) { listeners.push(cb); }

  function search(query) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const requestId = ++latestRequestId;
      const result = await fetchFn(query);
      if (requestId === latestRequestId) {
        listeners.forEach((cb) => cb(result)); // still the latest -- apply it
      }
      // else: a newer request has since been sent -- this response is stale, discard it
    }, debounceMs);
  }

  return { search, onResult };
}
\`\`\`

\`\`\`
real, adversarial verified proof:
  search("reactjs") -- a SLOW request (100ms)
  search("react")   -- sent 5ms later, a FAST request (20ms)

  the FAST "react" request resolves first in real wall-clock time and IS applied
  the SLOW "reactjs" request finally resolves ~80ms later, but its requestId no longer
  matches latestRequestId, so it is correctly DISCARDED despite being a real, valid response
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="track a single incrementing latest request id counter every time a real request is about to be sent increment the counter and capture that value as this request own id when the response arrives compare the captured id against the counters current value if they match apply the result if they no longer match a newer request was sent since discard it as stale verified directly with an adversarial timing setup an earlier slower request resolving after a later faster one was correctly discarded despite being a real valid response">
  <defs>
    <marker id="race-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: an earlier, slower request that resolves later is discarded</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="65" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">request sent -&gt; captures the CURRENT counter</text>
  <text class="d-sub" x="159" y="93" text-anchor="middle">as its own fixed, permanent requestId</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="65" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">response arrives -&gt; compare requestId</text>
  <text class="d-sub" x="476" y="93" text-anchor="middle">against the counter CURRENT (possibly newer) value</text>
  <rect class="d-box" x="24" y="128" width="592" height="50" rx="8"/>
  <text class="d-sub" x="320" y="157" text-anchor="middle">debouncing alone reduces request frequency but does not guarantee response ORDER - this is a separate fix</text>
</svg>

## 5. Complexity

Time: O(1) per search call and O(1) per response received — a single integer comparison. Space: O(1) — one counter, regardless of how many overlapping in-flight requests exist at once.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Only ever one request in flight at a time | The guard is genuinely a harmless no-op | \`requestId\` always still matches \`latestRequestId\` when it resolves |
| A request that never resolves (network hang) | Correctly never applies its (nonexistent) result, and does not block later requests | Each request is independent; a hung one simply never reaches the comparison |
| Two requests sent with the identical query string | Both are real, independent requests with different IDs — only the later one's result applies | The guard does not deduplicate by QUERY, only by RECENCY |
| The debounce window is 0 (no real debouncing) | The race-condition guard still functions correctly on its own | The two mechanisms are genuinely independent and compose correctly |

## 7. Common Pitfalls

- **Assuming debouncing alone solves this.** A real, common, incorrect assumption — debouncing only reduces how OFTEN a request fires; it does nothing to guarantee the ORDER in which already-in-flight requests' responses arrive.
- **Using a boolean "isLoading" flag instead of an incrementing ID.** A boolean cannot distinguish BETWEEN multiple overlapping in-flight requests — only a monotonically increasing counter can correctly identify exactly which specific request a given response belongs to.
- **Comparing against the query string instead of a request ID.** Genuinely fragile — two DIFFERENT queries resolving out of order is exactly the real bug being guarded against, so comparing by query string does not help; the ID must track RECENCY of the REQUEST, not the content.
- **Not considering real AbortController-based cancellation as a stronger alternative.** Discarding a stale RESPONSE (as done here) still wastes real, completed network and server work; genuinely aborting the in-flight fetch itself (covered in this bank own Cancelable Promise question) is the more complete real fix where the underlying request supports it.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Debounce and guard against out-of-order responses -- is debouncing alone actually enough here?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why it is NOT enough:</strong> <span style="color:#f0e2c8;">"Debouncing only reduces frequency -- two in-flight requests can still resolve out of order."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the fix:</strong> <span style="color:#f0e2c8;">"An incrementing request ID -- each request captures it, compares it against the current value when it resolves."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"debounce the trigger, increment and capture the ID inside the timer callback, compare on response."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually make the earlier request SLOWER than the later one and confirm the stale result is genuinely discarded."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rewrite this using a real AbortController instead of just discarding the stale response?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a real, current \`AbortController\` instance alongside \`latestRequestId\`; right before sending a new request, call \`.abort()\` on the PREVIOUS controller (if any) and create a fresh one for the new request, passing its \`.signal\` into the real \`fetch\` call -- this genuinely cancels the underlying network request itself, saving real bandwidth and server work, rather than just ignoring a response that still fully completed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this compare to React Query or SWR own built-in handling of this exact problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, both real, popular libraries solve this exact same underlying race condition internally, using conceptually the same request-recency tracking (or real AbortController-based cancellation) shown here, so that switching query keys rapidly never shows a stale result -- understanding this mechanism from first principles is real, directly useful context for correctly configuring or debugging either library in practice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would useEffect own real cleanup function be a natural place to apply this guard in an actual React component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes -- a real, common real React pattern declares a local \`let ignore = false;\` flag inside the effect, sets \`ignore = true\` in the effect own cleanup function (which real React calls before running the NEXT effect, i.e. exactly when a newer request is about to start), and checks \`if (!ignore)\` before applying the response -- conceptually the SAME recency-guard idea, just expressed through React own effect lifecycle instead of a manually-managed counter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the user clears the search box entirely -- should that also be treated as a real, new request?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuine, real UX design decision -- either treat an empty query as a real request (returning, say, a default/recent-items result) going through the SAME race-condition-safe path, or special-case it to immediately clear results WITHOUT firing a real network request at all, incrementing \`latestRequestId\` anyway so any still-in-flight prior request is correctly discarded once it resolves.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Race condition** | Two async operations resolving in an order different from when they started |
| **Request ID guard** | An incrementing counter identifying, and validating recency of, each request |
| **Stale response** | A valid, successful response that is no longer the most recent, and must be discarded |

---
**Conclusion:** debouncing alone only reduces how often a request fires — it does not guarantee response ORDER, so a genuinely separate guard is needed: an incrementing request-ID counter, captured by each request when sent and compared against its CURRENT value when the response arrives, correctly discarding any response that is no longer the most recent. Verified directly with a deliberately adversarial setup: a real, earlier, SLOWER request that resolved AFTER a later, FASTER one was correctly discarded, ensuring the displayed result always matched the user actual latest intent.`,
    examples: [
      {
        label: "Real, direct proof: an earlier, slower request that resolves after a later, faster one is correctly discarded by the race-condition guard",
        tech: "javascript",
        runnable: true,
        code: `function createSearchController(fetchFn, debounceMs) {
  let latestRequestId = 0;
  let debounceTimer = null;
  const listeners = [];

  function onResult(cb) { listeners.push(cb); }

  function search(query) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const requestId = ++latestRequestId;
      const result = await fetchFn(query);
      if (requestId === latestRequestId) {
        listeners.forEach((cb) => cb(result));
      } else {
        listeners.forEach((cb) => cb({ discarded: true, query, result }));
      }
    }, debounceMs);
  }

  return { search, onResult };
}

const fakeApi = (query) => {
  const delay = query === "reactjs" ? 100 : 20;
  return new Promise((resolve) => setTimeout(() => resolve('results for "' + query + '"'), delay));
};

const controller = createSearchController(fakeApi, 0);
const applied = [];
const discarded = [];
controller.onResult((r) => { if (r.discarded) discarded.push(r); else applied.push(r); });

controller.search("reactjs");
setTimeout(() => controller.search("react"), 5);

setTimeout(() => {
  console.log("applied results (should be only 'react', the LATEST request):", applied);
  console.log("discarded, stale results (the earlier 'reactjs' request, despite resolving):", discarded);
  console.log("race condition correctly resolved:", applied.length === 1 && applied[0].includes('"react"'));
}, 200);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build an Undo/Redo Command Stack for a Text Editor",
    seoDescription:
      "An undo/redo command stack was verified through real inserts, undos, and a redo, and proven to correctly clear its redo history after a new action.",
    description: `**Problem, as an interviewer would state it:**
"Implement an undo/redo system for a text editor using the Command pattern — each edit is an object with \`do()\` and \`undo()\` methods, and the system needs to support a real, deep undo/redo history."

**Examples:**

\`\`\`
stack.execute(insertCommand("Hello", 0));
stack.undo(); // reverts the insert
stack.redo(); // re-applies it
\`\`\`

**Clarifying questions expected:**
- What should happen to the redo history if a NEW action is performed after an undo — is it cleared, or preserved as a branch?
- Does the command need to store enough information to undo itself, or does the stack manage that separately?
- Is there a maximum history depth, or unbounded?

**Code / implementation expected:** Yes — real, direct proof of a real sequence of inserts, undos, and redos, including the critical case of a new action correctly clearing the redo stack.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the single most commonly-missed real behavior — that performing a NEW action after an undo must genuinely clear the redo history, not preserve it as a branch — was verified directly: a redo attempted after a new action correctly failed and left the text unchanged.

## 1. The problem, restated

Implement undo/redo using the real, standard Command pattern: every edit is represented as an object with its own \`do()\` (apply the change) and \`undo()\` (reverse it) methods. The system maintains two stacks — one for undo history, one for redo history — and correctly manages the interaction between them as new actions, undos, and redos occur.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| New action after an undo — clear redo, or branch? | Clearing is the real, standard, expected behavior in virtually every real editor (text editors, image editors, IDEs) — branching history is a genuinely more complex, rarer feature. |
| Does the command self-contain its undo logic? | Yes, genuinely — the Command pattern's whole real point is that each command knows how to reverse ITSELF, keeping the stack manager itself generic. |
| Bounded history depth? | A real, practical concern for a long editing session — worth naming even if the base implementation is unbounded. |

## 3. Thought process

Two stacks, genuinely simple on their own: an \`undoStack\` of already-applied commands, and a \`redoStack\` of commands that were undone and could be reapplied. \`execute\` runs a NEW command's \`do()\`, pushes it onto \`undoStack\` — and, critically, CLEARS \`redoStack\` entirely, since a new action genuinely invalidates whatever "future" the old redo history represented (redoing an old command after a divergent new edit would produce an inconsistent document state). \`undo\` pops the most recent command off \`undoStack\`, calls its \`undo()\`, and pushes it onto \`redoStack\` for possible reapplication. \`redo\` is the exact mirror: pop from \`redoStack\`, call \`do()\` again, push back onto \`undoStack\`.

## 4. Verified solution

\`\`\`js
class CommandStack {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }
  execute(command) {
    command.do();
    this.undoStack.push(command);
    this.redoStack = []; // a new action invalidates the old redo history
  }
  undo() {
    if (this.undoStack.length === 0) return false;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    return true;
  }
  redo() {
    if (this.redoStack.length === 0) return false;
    const command = this.redoStack.pop();
    command.do();
    this.undoStack.push(command);
    return true;
  }
}
\`\`\`

\`\`\`
real, verified sequence:
  insert "Hello"           -> "Hello"
  insert " World"          -> "Hello World"
  undo()                   -> "Hello"
  undo()                   -> ""
  redo()                   -> "Hello"
  execute a NEW action (insert " There") -> "Hello There"
  redo() attempted          -> returns false, text UNCHANGED -- the old redo history was correctly cleared
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="two stacks an undo stack of already applied commands and a redo stack of commands that were undone execute runs a new commands do pushes it onto undo stack and critically clears redo stack entirely since a new action invalidates whatever future the old redo history represented verified directly a redo attempted after a new action following an undo correctly failed and left the text unchanged confirming the old redo history was genuinely cleared not preserved as a branch">
  <defs>
    <marker id="undo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a new action after undo genuinely clears the redo history</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">undo(): pop undoStack, call undo()</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">push the command onto redoStack</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">execute(): do() a NEW command</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">push to undoStack, CLEAR redoStack entirely</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">redoing an old command after a divergent new edit would produce an inconsistent document state</text>
</svg>

## 5. Complexity

Time: O(1) for \`execute\`/\`undo\`/\`redo\` (each is a constant number of array push/pop operations), plus whatever real time the individual command's own \`do()\`/\`undo()\` takes. Space: O(n) where \`n\` is the total number of commands currently held across both stacks.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`undo()\` with an empty undo stack | Returns \`false\`, a safe no-op | The explicit length guard at the top of \`undo\` |
| \`redo()\` with an empty redo stack | Returns \`false\`, a safe no-op | The explicit length guard at the top of \`redo\` |
| Many consecutive undos followed by many consecutive redos | Correctly replays the exact original sequence, in order | Each stack preserves strict LIFO ordering |
| A command whose \`undo()\` is not a perfect inverse of \`do()\` (a real, possible authoring bug) | The stack mechanism itself cannot detect or prevent this | Correctness of individual commands is the command author responsibility, not the stack's |

## 7. Common Pitfalls

- **Forgetting to clear the redo stack in \`execute\`.** The single most commonly-missed real behavior — without it, redoing an old, now-inconsistent command after a divergent new edit can corrupt the document state in a way that does not match either history branch cleanly.
- **Storing raw SNAPSHOTS of the entire document instead of individual reversible commands.** Works, but is genuinely far more memory-expensive for a long editing session compared to small, targeted commands that each know how to apply and reverse just their own specific change.
- **Not handling the empty-stack cases explicitly.** Calling \`.pop()\` on an empty array returns \`undefined\`, and calling \`.do()\`/\`.undo()\` on \`undefined\` would genuinely throw — the length guards prevent this real crash.
- **Conflating "redo" with simply "execute the same command again."** They are genuinely different — \`redo\` reapplies a command that was PREVIOUSLY undone (from \`redoStack\`), while \`execute\` runs a BRAND NEW command and correctly invalidates any existing redo history.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Command pattern, undo/redo stacks -- should a new action after an undo clear the redo history?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two-stack shape:</strong> <span style="color:#f0e2c8;">"An undoStack of applied commands, a redoStack of undone ones -- each command owns its do and undo logic."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the critical redo-clearing rule:</strong> <span style="color:#f0e2c8;">"A new execute() must clear redoStack, or the old redo history could produce an inconsistent document."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"execute does the command, pushes to undoStack, clears redoStack; undo/redo mirror each other, popping and pushing across stacks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually undo, execute a new action, then attempt a redo, and confirm it correctly fails."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you batch several small commands into one single undo step, like grouping every keystroke of one word into a single undo unit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Introduce a real "composite command" wrapping an array of individual commands, whose own \`do()\`/\`undo()\` simply iterate that inner array (forward for \`do\`, REVERSED for \`undo\`, since reversing a batch of edits must happen in the opposite order they were applied) -- pushed onto \`undoStack\` as ONE single entry, so a single undo reverses the whole batch together.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a bounded history depth, so memory does not grow unbounded over a very long session?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In \`execute\`, right after pushing the new command, check if \`undoStack.length\` exceeds a real, configured \`maxHistory\` -- if so, \`.shift()\` the OLDEST entry off the front, a real, deliberate trade-off that permanently forfeits the ability to undo past that point in exchange for bounded memory usage over a long editing session.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank own immutable setIn / structural-sharing questions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely alternative, real implementation STRATEGY worth naming -- instead of storing REVERSIBLE commands (this question own approach), an editor could instead store full, IMMUTABLE snapshots of its entire state at each step (using structural sharing to keep memory reasonable), with undo/redo simply moving a pointer backward/forward through that snapshot history -- a real, valid trade-off exchanging command-authoring complexity for state-snapshot memory overhead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if a command own undo() throws an error -- how should the stack handle that?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely a real, honest gap in the base implementation -- as written, a thrown error would propagate out of \`undo()\` before the command is pushed onto \`redoStack\`, potentially leaving the stacks in an inconsistent state (the command already popped from \`undoStack\` but not yet redoable); a more defensive real version would wrap the \`command.undo()\` call in a try/catch, and on failure, push the command BACK onto \`undoStack\` (as if the undo never happened) before re-throwing or reporting the error.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Command pattern** | Each edit is an object owning its own do() and undo() logic |
| **Redo-clearing on new action** | A new edit invalidates the old redo history, preventing inconsistency |
| **LIFO stack** | Last-in-first-out — the most recent action is always undone first |

---
**Conclusion:** two stacks — undo and redo — combined with a Command-pattern object per edit (each knowing how to apply and reverse ITSELF) correctly implement undo/redo, with the single most important, commonly-missed rule being that a genuinely NEW action must CLEAR the redo stack entirely, since redoing stale history after a divergent edit would produce an inconsistent document. Verified directly: a real sequence of inserts, undos, and a redo behaved correctly, and — critically — a redo attempted after a new action following an undo correctly failed and left the text unchanged.`,
    examples: [
      {
        label: "Real, direct proof: the undo/redo command stack correctly handles a real sequence of inserts and undos, and clears the redo history after a new action",
        tech: "javascript",
        runnable: true,
        code: `class CommandStack {
  constructor() { this.undoStack = []; this.redoStack = []; }
  execute(command) {
    command.do();
    this.undoStack.push(command);
    this.redoStack = [];
  }
  undo() {
    if (this.undoStack.length === 0) return false;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    return true;
  }
  redo() {
    if (this.redoStack.length === 0) return false;
    const command = this.redoStack.pop();
    command.do();
    this.undoStack.push(command);
    return true;
  }
}

let text = "";
function insertCommand(str, pos) {
  return {
    do: () => { text = text.slice(0, pos) + str + text.slice(pos); },
    undo: () => { text = text.slice(0, pos) + text.slice(pos + str.length); },
  };
}

const stack = new CommandStack();
stack.execute(insertCommand("Hello", 0));
stack.execute(insertCommand(" World", 5));
console.log("after two inserts:", JSON.stringify(text));

stack.undo();
stack.undo();
console.log("after 2 undos:", JSON.stringify(text));

stack.redo();
console.log("after 1 redo:", JSON.stringify(text));

stack.execute(insertCommand(" There", 5));
console.log("after a NEW action following the redo:", JSON.stringify(text));

const redoWorked = stack.redo();
console.log("redo attempted after the new action (should be false, redo history was cleared):", redoWorked);
console.log("text unchanged by the failed redo:", JSON.stringify(text));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a Memoized Selector That Only Recomputes When Its Specific Inputs Change (Reselect-Style)",
    seoDescription:
      "A Reselect-style memoized selector was verified to return the exact same cached reference for an unrelated state change, and recompute for a real one.",
    description: `**Problem, as an interviewer would state it:**
"Implement a Reselect-style \`createSelector(inputSelectors, resultFn)\` — a derived-state selector that only recomputes when one of its DECLARED input selectors' own output actually changes, ignoring unrelated state changes entirely."

**Examples:**

\`\`\`
const getFilteredItems = createSelector([getItems, getFilter], (items, filter) => items.filter(i => i.includes(filter)));
getFilteredItems(state); // computes
getFilteredItems({ ...state, unrelatedField: 2 }); // returns the SAME cached result, no recompute
\`\`\`

**Clarifying questions expected:**
- Does the memoization compare the FULL state object, or just the specific input selectors' own outputs?
- Should the comparison be a shallow reference check (\`===\`) or a deep equality check?
- Does the selector need to support MULTIPLE independent instances, each with their own cache?

**Code / implementation expected:** Yes — real, direct proof that an unrelated state change does not trigger recomputation (same cached reference returned), while a relevant one does.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the whole real point of this pattern — genuinely SKIPPING recomputation, verified by checking that the exact SAME array reference is returned, not merely an equal-looking new one — was confirmed directly, not assumed from the caching logic alone.

## 1. The problem, restated

\`createSelector(inputSelectors, resultFn)\` returns a memoized selector function: each call runs every \`inputSelector\` against the given state to get their CURRENT outputs, and only re-runs \`resultFn\` (the expensive derivation) if at least one of those specific outputs has genuinely CHANGED since the last call — an unrelated change elsewhere in state must not trigger a recompute.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Compare full state, or just input selector outputs? | Just the outputs, genuinely — comparing the whole state object would defeat the entire purpose, since ANY state change (even unrelated) would appear "different." |
| Reference (\`===\`) or deep equality? | Reference equality is the real, standard, fast default — it correctly assumes selectors return either primitives or NEW references only when data genuinely changed (a real convention this pattern relies on). |
| Multiple independent selector instances? | Yes, genuinely required — each \`createSelector(...)\` call must have its OWN independent cache, not a shared global one. |

## 3. Thought process

The mechanism only needs to remember TWO things between calls: the LAST array of input-selector outputs, and the LAST computed result. On each call, run every declared input selector against the CURRENT state to get a fresh array of their outputs, then compare that fresh array against the STORED previous array, element by element, using reference equality (\`!==\`). If every element is genuinely unchanged, skip recomputation entirely and return the cached result; if even ONE element differs, recompute via \`resultFn\`, and store both the new inputs and the new result for next time. This is precisely why an UNRELATED state change never triggers a recompute — that unrelated field is never even READ by any of the declared input selectors in the first place, so it cannot possibly affect the comparison.

## 4. Verified solution

\`\`\`js
function createSelector(inputSelectors, resultFn) {
  let lastInputs = null;
  let lastResult = null;
  return function (state) {
    const inputs = inputSelectors.map((sel) => sel(state));
    const changed = !lastInputs || inputs.some((val, i) => val !== lastInputs[i]);
    if (changed) {
      lastResult = resultFn(...inputs);
      lastInputs = inputs;
    }
    return lastResult;
  };
}
\`\`\`

\`\`\`
real, verified outcomes:
  getFilteredItems(state)                            -> ["apple","banana","avocado"], real recompute
  getFilteredItems({...state, unrelated: 2})          -> the SAME cached array reference, NO recompute
  getFilteredItems({...state, filter: "an"})          -> ["banana"], real recompute (relevant input changed)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="remember two things between calls the last array of input selector outputs and the last computed result run every declared input selector against the current state compare that fresh array against the stored previous one element by element using reference equality if every element is unchanged skip recomputation entirely and return the cached result verified directly an unrelated state change returned the exact same cached array reference while a change to a genuinely declared input correctly triggered a real recompute with a new reference">
  <defs>
    <marker id="sel-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: an unrelated field change returns the same cached reference</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">an unrelated field changes</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">never read by any input selector - no recompute</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a declared input selector output changes</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">reference comparison detects it - recomputes</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">only the declared input selectors outputs are compared, never the full state object</text>
</svg>

## 5. Complexity

Time: O(k) per call for running \`k\` input selectors and comparing their outputs, versus O(the real resultFn own cost) only when a genuine recompute is needed — the entire real point being that expensive derivations skip that cost on unrelated updates. Space: O(k) for the stored last-inputs array, plus whatever the cached result itself holds.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| The very first call (no cached inputs yet) | Always recomputes | The \`!lastInputs\` check correctly treats a null cache as "changed" |
| An input selector returning a NEW array/object reference every call, even with unchanged content | Incorrectly treated as "changed" every time, always recomputing | Reference equality genuinely cannot detect deep content equality — a real, known limitation of this convention, requiring INPUT selectors to themselves be reference-stable |
| Two independent \`createSelector\` instances used on the same state | Each maintains its own, fully independent cache | \`lastInputs\`/\`lastResult\` are closure variables, private to each returned selector function |
| \`resultFn\` itself is expensive (e.g., a large real filter/sort) | Its real cost is only paid on an actual, relevant change | The entire real point of the memoization |

## 7. Common Pitfalls

- **Comparing the full state object instead of just the declared input selector outputs.** Defeats the entire purpose — literally ANY state change (even a genuinely unrelated one) would make the full state object reference-unequal to the previous one, triggering a recompute every single time.
- **Using deep equality instead of reference equality.** A real, deliberate, standard trade-off — deep equality is expensive precisely in the cases where memoization matters most (large data structures), so the convention instead relies on input selectors themselves returning STABLE references for unchanged data.
- **Sharing one selector instance across genuinely different, unrelated component usages.** If two different real components use the SAME selector instance with DIFFERENT, alternating state shapes, they will constantly invalidate each other cache — Reselect real documentation explicitly warns about this exact real pitfall, recommending a fresh selector instance per real component instance in that scenario.
- **Forgetting the input selectors themselves need to be REFERENCE-STABLE for unchanged data.** If \`getItems\` itself returns a brand-new array reference every single call (even when the underlying data has not changed), the whole memoization scheme breaks down regardless of how correct \`createSelector\` itself is.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Only recompute when declared inputs change -- reference equality or deep equality for the comparison?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why comparing full state would fail:</strong> <span style="color:#f0e2c8;">"Comparing the whole state object would recompute on ANY change -- I need to compare just the input selectors own outputs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the mechanism:</strong> <span style="color:#f0e2c8;">"Run each input selector, compare the fresh outputs against the last stored ones by reference, recompute only if any differ."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"map inputSelectors over state, .some to check for any changed value, recompute and store, otherwise return the cached result."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually change an unrelated field and confirm the exact same array reference comes back, not just an equal-looking one."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does reference equality matter so much for React specifically, beyond just avoiding a slow recompute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, second, equally important benefit -- real React own \`useEffect\` dependency arrays and \`React.memo\` prop comparisons ALSO use reference equality by default, so a selector that returns a genuinely STABLE reference for unchanged derived data prevents a whole cascade of unnecessary downstream re-renders and effect re-runs, not just avoiding the selector own internal recompute cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support a selector with a variable number of input selectors passed as a flat argument list, like the real Reselect library does?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accept a real, flexible \`createSelector(...args)\` signature, taking the LAST argument as \`resultFn\` and every argument BEFORE it as an individual input selector (via \`args.slice(0, -1)\`), rather than requiring them pre-bundled into an explicit array -- a purely real ergonomic difference, with the identical underlying comparison mechanism.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you compose one memoized selector out of OTHER already-memoized selectors as its inputs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, and this is a real, common, powerful real Reselect pattern -- since a memoized selector is itself just a plain function taking state and returning a value, passing one AS an input selector to another \`createSelector\` call composes correctly, and if the INNER selector own output is reference-stable (because IT did not need to recompute), the OUTER selector also correctly skips its own recompute -- memoization benefits cascade naturally through the composition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">This only caches the SINGLE most recent call -- how would you extend it to cache multiple recent results, like for different filter values used in quick succession?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">This is genuinely the SAME real idea as this bank own memoize() question own \`maxSize\`/LRU-eviction feature -- replace the single \`lastInputs\`/\`lastResult\` pair with a real, small LRU cache keyed by a serialized (or reference-tuple) representation of the input values, at the real cost of needing a way to compare/hash a TUPLE of inputs rather than just a single value.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Input selectors** | Functions extracting the SPECIFIC pieces of state this selector cares about |
| **Result function** | The (potentially expensive) derivation run only when inputs actually change |
| **Reference-stable** | Returning the identical object/array reference when underlying data is unchanged |

---
**Conclusion:** memoizing a derived-state selector correctly means comparing only the DECLARED input selectors' own outputs by reference — never the full state object — skipping the expensive result function entirely when every input is unchanged, and relying on input selectors themselves being reference-stable for genuinely unchanged data. Verified directly: an unrelated state field change returned the EXACT SAME cached array reference with no recompute, while a change to an actual declared input correctly triggered a real recompute with a new, different reference.`,
    examples: [
      {
        label: "Real, direct proof: a memoized selector returns the same cached reference for an unrelated state change and recomputes for a relevant one",
        tech: "javascript",
        runnable: true,
        code: `function createSelectorWithCounter(inputSelectors, resultFn) {
  let lastInputs = null;
  let lastResult = null;
  let recomputeCount = 0;
  const selector = function (state) {
    const inputs = inputSelectors.map((sel) => sel(state));
    const changed = !lastInputs || inputs.some((val, i) => val !== lastInputs[i]);
    if (changed) {
      recomputeCount++;
      lastResult = resultFn(...inputs);
      lastInputs = inputs;
    }
    return lastResult;
  };
  selector.getRecomputeCount = () => recomputeCount;
  return selector;
}

const getItems = (state) => state.items;
const getFilter = (state) => state.filter;

const getFilteredItems = createSelectorWithCounter(
  [getItems, getFilter],
  (items, filter) => items.filter((i) => i.includes(filter))
);

let state = { items: ["apple", "banana", "avocado"], filter: "a", unrelated: 1 };
const r1 = getFilteredItems(state);
console.log("initial computation, recompute count:", getFilteredItems.getRecomputeCount());

state = { ...state, unrelated: 2 };
const r2 = getFilteredItems(state);
console.log("after an UNRELATED field change, recompute count (should still be 1):", getFilteredItems.getRecomputeCount());
console.log("returned the exact same cached reference:", r1 === r2);

state = { ...state, filter: "an" };
const r3 = getFilteredItems(state);
console.log("after a RELEVANT input change, recompute count (should now be 2):", getFilteredItems.getRecomputeCount());
console.log("new result, different reference:", r3, r3 !== r1);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Build a Form Validation Utility Supporting Field-Level and Cross-Field Rules",
    seoDescription:
      "A form validator was verified across 4 scenarios, including a cross-field rule correctly NOT overwriting an existing field-level error on the same field.",
    description: `**Problem, as an interviewer would state it:**
"Build a form validation utility supporting both per-field rules (required, min length) AND cross-field rules (like confirming two password fields match)."

**Examples:**

\`\`\`
validator.validate({ password: "abc12345", confirmPassword: "different" });
// { valid: false, errors: { confirmPassword: "Passwords do not match" } }
\`\`\`

**Clarifying questions expected:**
- If a field already has its own field-level error, should a cross-field rule involving that same field still be allowed to overwrite it?
- Should field-level rules stop at the FIRST failing rule per field, or collect every failing rule's message?
- Should validation run eagerly (on every keystroke) or only on submit — and does that change this utility's own design?

**Code / implementation expected:** Yes — real, direct proof of field-level errors, a cross-field mismatch error, a fully valid case, and the subtle precedence case where a cross-field rule must not overwrite an existing field-level error.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the subtlest real correctness requirement — that a cross-field rule must NOT overwrite an existing field-level error on the same field — was verified directly: an empty \`confirmPassword\` field correctly kept its own "required" message rather than being overwritten by the mismatch rule.

## 1. The problem, restated

A form validator runs two kinds of rules against a set of field values: FIELD-LEVEL rules (each concerning exactly one field, like "required" or "minimum length"), and CROSS-FIELD rules (concerning the RELATIONSHIP between two or more fields, like "these two password fields must match"). It returns whether the whole form is valid, plus a map of field name to error message for every field that failed.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Cross-field rule overwriting an existing field-level error? | Should NOT overwrite — a real, more specific, more actionable error ("this field is required") is generally more useful to show first than a broader relational one. |
| Stop at first failing rule per field, or collect all? | Stopping at the first is the real, more common UX choice — showing one clear error at a time, rather than overwhelming the user with every possible issue on one field at once. |
| Eager (every keystroke) vs. submit-only validation? | This utility's core \`validate(values)\` function is genuinely agnostic to WHEN it is called — the calling code decides the trigger; the utility itself is a pure function of the current values. |

## 3. Thought process

Two, cleanly separable passes: first, run every FIELD-LEVEL rule for every field, stopping at the first failing rule per field (an ordered array of rules per field, checked in sequence) and recording that message. Second, run every CROSS-FIELD rule — each one is given the full set of values AND the errors accumulated so far, and returns either \`null\` (no problem) or an object naming which field the error belongs to and its message. The one, genuinely important real detail: before RECORDING a cross-field rule's error, check whether that target field ALREADY has an error from the field-level pass — if it does, the cross-field rule's finding is correctly SKIPPED, since the more specific, already-found field-level issue takes precedence.

## 4. Verified solution

\`\`\`js
function createValidator({ fields = {}, crossField = [] }) {
  function validate(values) {
    const errors = {};

    for (const [fieldName, rules] of Object.entries(fields)) {
      for (const rule of rules) {
        const error = rule(values[fieldName], values);
        if (error) {
          errors[fieldName] = error;
          break; // stop at the first failing rule for this field
        }
      }
    }

    for (const rule of crossField) {
      const result = rule(values, errors);
      if (result && !errors[result.field]) {
        errors[result.field] = result.message;
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }
  return { validate };
}
\`\`\`

\`\`\`
real, verified outcomes:
  missing email + short password -> { email: "...required", password: "...at least 8 characters" }
  valid fields individually, but passwords MISMATCH -> { confirmPassword: "Passwords do not match" }
  everything valid -> { valid: true, errors: {} }
  confirmPassword EMPTY (a field-level error) -> the cross-field mismatch rule correctly did NOT
    overwrite it -- the ORIGINAL "Please confirm your password" message is kept
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="two cleanly separable passes first run every field level rule for every field stopping at the first failing rule per field second run every cross field rule before recording a cross field rules error check whether that target field already has an error from the field level pass if it does the cross field rules finding is correctly skipped verified directly an empty confirmPassword field correctly kept its own required message rather than being overwritten by the separate mismatch rule">
  <defs>
    <marker id="form-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a cross-field rule does not overwrite an existing field error</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">pass 1: field-level rules per field</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">stops at the first failing rule for that field</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">pass 2: cross-field rules</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">only record if the target field has no error yet</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a more specific field-level issue takes precedence over a broader relational one</text>
</svg>

## 5. Complexity

Time: O(f × r + c) where \`f\` is the number of fields, \`r\` is the average number of rules per field, and \`c\` is the number of cross-field rules — every rule runs at most once per \`validate\` call. Space: O(f) for the resulting errors object, at most one entry per field.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A field with no rules defined at all | Never produces an error, regardless of its value | The \`fields\` map simply has no entry to iterate for it |
| A cross-field rule referencing a field with NO field-level rules of its own | Still correctly applies, since the precedence check only looks at EXISTING errors, not existing rules | \`!errors[result.field]\` only cares whether an error was already RECORDED |
| Multiple cross-field rules targeting the SAME field | The FIRST one (in array order) whose condition is met wins; later ones are skipped by the same precedence check | Once \`errors[field]\` is set by the first cross-field rule, the check blocks any subsequent one from overwriting it too |
| Values object missing a field entirely (\`undefined\`) | Field-level rules receive \`undefined\` as the value, and a "required" rule correctly catches it | \`values[fieldName]\` on a missing key is simply \`undefined\`, which a falsy-check-based \`required\` rule correctly flags |

## 7. Common Pitfalls

- **Letting a cross-field rule unconditionally overwrite any existing error.** The single most commonly-missed real correctness requirement this question tests for — without the precedence check, a genuinely more specific and actionable field-level error (like "required") could be silently replaced by a less specific relational one (like "does not match"), confusing the user about what to actually fix.
- **Collecting every failing rule per field instead of stopping at the first.** A real, valid alternative UX choice, but genuinely different from the common convention shown here — worth explicitly confirming with the interviewer rather than silently assuming one or the other.
- **Running cross-field rules BEFORE field-level rules.** Reversing the pass order breaks the precedence logic entirely, since the \`errors\` object would still be empty when cross-field rules run, letting them always win regardless of any field-level issue.
- **Mutating the passed-in \`values\` object during validation.** The validator should be a genuinely PURE function of its input — mutating the caller's own form state as a side effect of validation is a real, surprising, hard-to-debug behavior.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Field-level plus cross-field rules -- should a cross-field rule ever overwrite an existing field-level error?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two-pass structure:</strong> <span style="color:#f0e2c8;">"Run field-level rules first, then cross-field rules -- checking existing errors before recording a cross-field finding."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the precedence rule:</strong> <span style="color:#f0e2c8;">"A more specific field-level error should take precedence over a broader relational one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop fields running each rule breaking on first failure, then loop crossField rules only recording into an empty slot."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually leave confirmPassword empty and confirm the mismatch rule does NOT overwrite its own required-field error."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support ASYNC field-level rules, like checking a username own availability against a real server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make \`validate\` itself \`async\`, and \`await\` each rule call (allowing a rule function to return either a plain value OR a promise, via \`await Promise.resolve(rule(...))\`) -- a real, meaningful design change since the synchronous version shown here genuinely cannot support this without becoming async throughout; real forms often run cheap synchronous rules first (required, format) and only trigger the async server check once those pass, to avoid real, wasted network calls on an already-invalid field.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you validate just ONE field (for real-time, per-keystroke feedback) without re-running the entire form validation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a real \`validateField(fieldName, values)\` method running just that field own rules array (the same inner loop logic), plus any cross-field rules that specifically TARGET that field -- a genuinely useful, real optimization for live, per-keystroke validation feedback where re-running every single field own rules on every keystroke would be real, unnecessary, wasted work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this compare to a real library like Zod or Yup for schema validation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, both real libraries solve the SAME underlying two-part problem (per-field constraints plus cross-field/"refine" rules) with a much richer, more declarative, type-safe API and built-in TypeScript inference -- understanding the CORE mechanism from first principles, as done here, is real, directly transferable context for correctly reasoning about WHY a real Zod \`.refine()\` or \`.superRefine()\` call needs to check existing issues before adding a new one at the same path, the identical real precedence concern.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should a cross-field rule be allowed to add an error to a field that is not literally one of the two fields it compares, like a generic "form" level error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, a real, common, useful extension -- since a cross-field rule already returns an arbitrary \`{ field, message }\` object, it can just as easily target a real, reserved synthetic key like \`"_form"\` for an error that does not cleanly belong to any single real input field, letting the UI render it as a general, top-of-form banner rather than attached to any specific real input.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Field-level rule** | Validates exactly one field in isolation (required, min length, format) |
| **Cross-field rule** | Validates the relationship between two or more fields (password match) |
| **Precedence check** | Ensures a cross-field rule never overwrites an existing field-level error |

---
**Conclusion:** the validator runs two cleanly separable passes — field-level rules first (stopping at the first failing rule per field), then cross-field rules, each of which must check whether its TARGET field already has an error before recording its own finding, so a more specific field-level issue always takes precedence over a broader relational one. Verified directly across 4 real scenarios, including the subtlest correctness case: an empty \`confirmPassword\` field correctly kept its own "required" message, rather than being overwritten by the separate password-mismatch cross-field rule.`,
    examples: [
      {
        label: "Real, direct proof: field-level and cross-field validation both work correctly, and a cross-field rule does not overwrite an existing field-level error",
        tech: "javascript",
        runnable: true,
        code: `function createValidator({ fields = {}, crossField = [] }) {
  function validate(values) {
    const errors = {};
    for (const [fieldName, rules] of Object.entries(fields)) {
      for (const rule of rules) {
        const error = rule(values[fieldName], values);
        if (error) { errors[fieldName] = error; break; }
      }
    }
    for (const rule of crossField) {
      const result = rule(values, errors);
      if (result && !errors[result.field]) errors[result.field] = result.message;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }
  return { validate };
}

const required = (message) => (value) => (!value ? message : null);
const minLength = (n, message) => (value) => (value && value.length < n ? message : null);

const validator = createValidator({
  fields: {
    email: [required("Email is required")],
    password: [required("Password is required"), minLength(8, "Password must be at least 8 characters")],
    confirmPassword: [required("Please confirm your password")],
  },
  crossField: [
    (values) => {
      if (values.password && values.confirmPassword && values.password !== values.confirmPassword) {
        return { field: "confirmPassword", message: "Passwords do not match" };
      }
      return null;
    },
  ],
});

console.log("missing email + short password:", JSON.stringify(validator.validate({ email: "", password: "short", confirmPassword: "short" })));
console.log("valid individually, but MISMATCHED passwords:", JSON.stringify(validator.validate({ email: "a@b.com", password: "longenough", confirmPassword: "different" })));
console.log("everything valid:", JSON.stringify(validator.validate({ email: "a@b.com", password: "longenough", confirmPassword: "longenough" })));
console.log("confirmPassword EMPTY -- cross-field rule must not overwrite its own required error:", JSON.stringify(validator.validate({ email: "a@b.com", password: "longenough", confirmPassword: "" })));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Async reduce utility",
    seoDescription:
      "An async reduce utility was verified to correctly thread an awaited accumulator through each step in order, matching sequential real async execution.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`reduceAsync(array, reducer, initial)\` — like \`Array.prototype.reduce\`, but the reducer function returns a promise, and each step must genuinely wait for the previous one before starting."

**Examples:**

\`\`\`
await reduceAsync([1, 2, 3], async (acc, n) => acc + n, 0); // 6, computed sequentially
\`\`\`

**Clarifying questions expected:**
- Must this genuinely run sequentially (each step awaiting the previous), or would running reducer calls concurrently and combining results differently be acceptable?
- What should happen with an empty array and an explicit initial value?
- Should the reducer also receive the index and the original array, matching the real synchronous \`reduce\` signature?

**Code / implementation expected:** Yes — real, direct proof that the accumulator is correctly threaded through each step in strict sequential order, verified via a real, logged execution order.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the sequential-execution claim was verified directly with a real, logged start/end order across steps with different simulated delays — matching the exact same verification technique this bank own Promise Waterfall question uses for an analogous inherent-sequentiality claim.

## 1. The problem, restated

\`reduceAsync(array, reducer, initial)\` mirrors \`Array.prototype.reduce\`, except the reducer returns a PROMISE — each call must genuinely wait for the PREVIOUS reducer call to resolve before starting the next one, since each step real input (the accumulator) depends on the previous step real output.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Must this genuinely be sequential? | Yes, by definition — the accumulator threading creates a real, inherent data dependency between steps, identical in shape to this bank own Promise Waterfall question. |
| Empty array with an explicit initial value? | Returns the initial value directly, with the reducer never called — matching real, synchronous \`reduce\`'s own documented behavior. |
| Index and array passed to the reducer? | A real, reasonable parity feature with synchronous \`reduce\`, worth adding for a more complete real implementation. |

## 3. Thought process

This is genuinely the SAME underlying shape as a Promise Waterfall (already covered elsewhere in this bank) — a \`for\` loop with an \`await\`ed accumulator reassigned on each iteration, since each step real input IS the previous step real output. The one addition beyond a plain waterfall: the reducer also receives the CURRENT array element (and, for a more complete real version, its index and the original array), not just the running accumulator.

## 4. Verified solution

\`\`\`js
async function reduceAsync(array, reducer, initial) {
  let acc = initial;
  for (let i = 0; i < array.length; i++) {
    acc = await reducer(acc, array[i], i, array);
  }
  return acc;
}
\`\`\`

\`\`\`
real, verified outcomes:
  reduceAsync([1, 2, 3], async (acc, n) => acc + n, 0) -> 6

  real, logged execution order across 3 differently-timed real async steps:
    ["step 0 start", "step 0 end", "step 1 start", "step 1 end", "step 2 start", "step 2 end"]
    -- confirms genuinely sequential execution, a later step never starting before an earlier one ends
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="the same underlying shape as a Promise Waterfall a for loop with an awaited accumulator reassigned on each iteration since each steps input is the previous steps output verified directly with a real logged execution order across three differently timed real async steps confirming genuinely sequential execution a later step never starting before an earlier one ends">
  <defs>
    <marker id="rasync-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a later step genuinely never starts before the earlier ends</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">await reducer(acc, item)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">fully completes before the loop continues</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the next iteration receives the new acc</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely cannot start any earlier</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">the identical inherent data-dependency shape as this bank own Promise Waterfall question</text>
</svg>

## 5. Complexity

Time: O(n) real, sequential steps — total wall-clock time is the SUM of every step real duration, unlike a parallel operation. Space: O(1) beyond the array itself, holding only one accumulator value at a time.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Empty array, explicit initial value | Returns \`initial\` unchanged, reducer never called | The loop body never runs |
| Empty array, NO initial value | Should throw, matching real synchronous \`reduce\`'s own documented behavior | A real, honest gap in the minimal version shown, worth adding a guard for |
| A reducer step rejects | The whole operation genuinely stops, propagating that rejection | An unhandled \`await\` rejection inside an \`async\` function rejects its own returned promise |
| A single-element array | Behaves identically to just \`await\`ing that one reducer call directly | The loop runs exactly once |

## 7. Common Pitfalls

- **Trying to "optimize" this with Promise.all.** Genuinely, structurally wrong — each step real input depends on the previous step real output, an inherent data dependency that cannot be parallelized no matter how it is coded.
- **Forgetting the reducer needs the CURRENT array element, not just the accumulator.** Unlike a plain waterfall (which only threads one value), reduce genuinely needs BOTH the running accumulator AND the current item at each step.
- **Not handling the no-initial-value case.** Real, synchronous \`reduce\` throws a real \`TypeError\` for an empty array with no initial value — a complete async version should replicate that same real, documented behavior rather than silently returning \`undefined\`.
- **Assuming this needs entirely new logic distinct from the Promise Waterfall question.** Missing the genuinely strong real insight that this is the identical inherent-sequentiality shape, just with an additional per-step argument.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Async reduce, threading an awaited accumulator -- must this genuinely be sequential, given the data dependency?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the shape it shares with Promise Waterfall:</strong> <span style="color:#f0e2c8;">"Same inherent sequentiality -- each step's input is the previous step's output, so it cannot parallelize."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"a for loop, await reducer with the accumulator and current item, reassign acc each iteration."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Note the no-initial-value edge case:</strong> <span style="color:#f0e2c8;">"Real reduce throws on an empty array with no initial value -- I should replicate that, not silently return undefined."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually log each step's start and end and confirm this is genuinely sequential, not just correct by coincidence."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you genuinely reach for this instead of Array.prototype.reduce with synchronous logic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: building up an accumulated real value where EACH step genuinely needs a real async operation -- for instance, sequentially uploading files and building up a running total of uploaded bytes, where each individual upload must genuinely wait for the PREVIOUS one to be confirmed by the server before starting the next, matching a real, deliberate rate-limiting or ordering requirement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank own Async map limit concurrency question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely important, real contrast -- async map (even a concurrency-limited one) processes each element INDEPENDENTLY, so its individual calls CAN genuinely run concurrently; async reduce cannot, by definition, since each step real input depends on the accumulated real output of every PRIOR step -- recognizing which real shape a given problem has (independent items vs. a threaded accumulator) is the real, core skill this pair of questions is testing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add real support for the no-initial-value case, matching synchronous reduce.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If \`initial\` is \`undefined\` AND the array is empty, throw a real \`TypeError\`, matching synchronous reduce own documented behavior; if \`initial\` is \`undefined\` but the array is non-empty, use the array first element as the real starting accumulator and begin the loop from index 1 instead of 0 -- the identical real convention synchronous \`reduce\` already follows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you implement this using .reduce() itself, chaining Promises, instead of an explicit for loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes -- the identical real technique this bank own Promise Waterfall question own follow-up covers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array.reduce((accPromise, item, i, arr) =&gt; accPromise.then(acc =&gt; reducer(acc, item, i, arr)), Promise.resolve(initial))\` -- each real \`.then\` callback only runs once the PREVIOUS promise in the chain has genuinely settled, achieving the identical sequential guarantee purely through Promise chaining rather than an explicit \`for\`/\`await\` loop.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Threaded accumulator** | Each step real input is literally the previous step real output |
| **Inherent sequentiality** | A genuine data dependency, not a style choice, preventing parallelization |
| **Reducer signature parity** | Matching sync reduce own \`(acc, item, index, array)\` argument shape |

---
**Conclusion:** async reduce shares the identical inherent-sequentiality shape as this bank own Promise Waterfall question — a \`for\` loop threading an \`await\`ed accumulator, reassigned on each iteration, since each step real input is literally the previous step real output, making parallelization genuinely impossible without breaking correctness. Verified directly: the correct final accumulated result, PLUS a real, logged execution order across 3 differently-timed steps confirming genuinely sequential execution, not just a correct result by coincidence.`,
    examples: [
      {
        label: "Real, direct proof: reduceAsync() produces the correct accumulated result and is verified genuinely sequential via a real logged execution order",
        tech: "javascript",
        runnable: true,
        code: `async function reduceAsync(array, reducer, initial) {
  let acc = initial;
  for (let i = 0; i < array.length; i++) {
    acc = await reducer(acc, array[i], i, array);
  }
  return acc;
}

(async () => {
  const sum = await reduceAsync([1, 2, 3], async (acc, n) => acc + n, 0);
  console.log("reduceAsync([1,2,3], sum, 0):", sum);

  const order = [];
  const delays = [30, 10, 20];
  const loggedReducer = async (acc, n, i) => {
    order.push("step " + i + " start");
    await new Promise((r) => setTimeout(r, delays[i]));
    order.push("step " + i + " end");
    return acc + n;
  };
  await reduceAsync([1, 2, 3], loggedReducer, 0);
  console.log("real execution order (a later step never starts before the earlier one ends):", order);
})();`,
      },
    ],
  },
];

export default augments;
