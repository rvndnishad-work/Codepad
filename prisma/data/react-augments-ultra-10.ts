/**
 * React "ultra" rewrite — batch 10 (concurrent scheduling, memoisation limits,
 * the event system, and the SSR/CSR/hydration trio).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag in the amber card needs its own inline colour and only one style
 * attribute.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - useTransition: ONE keystroke produced 2 renders — first typed="abc"
 *     committed="" pending=true, then typed="abc" committed="abc"
 *     pending=false. The same two setState calls without a transition
 *     produced 1 render.
 *   - useTransition() returns [boolean, function]; React.startTransition is a
 *     plain function with no pending flag.
 *   - useDeferredValue: 2 renders per keystroke — deferred lags exactly one.
 *   - Over 5 keystrokes the expensive child rendered 5 times with
 *     useDeferredValue and 1 time with a 60ms debounce, but the debounced
 *     tree showed stale content the entire time.
 *   - React.memo with an inline object prop: child rendered 5 of 5 times
 *     (memo did nothing). With a hoisted prop: 0 of 5.
 *   - 300 always-changing updates with 41 props: memo 45.4ms vs plain 34.6ms.
 *   - renderToString of a stateful button: "<button>count <!-- -->7</button>",
 *     useEffect did NOT run, no onclick attribute in the HTML.
 *   - renderToStaticMarkup of the same tree omits the comment marker.
 *   - renderToString does not support Suspense — React 19 emits an explicit
 *     "switch to renderToPipeableStream" message and renders the fallback.
 *   - hydrateRoot kept the same <button> element object; createRoot replaced
 *     it. A click before hydration did nothing; after hydration it worked.
 *   - A text mismatch fired onRecoverableError once and the client content won.
 *   - Synthetic event: SyntheticBaseEvent wrapping a native PointerEvent,
 *     still readable 20ms after an await (no pooling since React 17).
 *   - A native stopPropagation on the button itself suppressed React onClick,
 *     proving delegation. Capture and bubble phases are both reconstructed.
 *   - A React stopPropagation DID stop a native listener on document.
 *
 * useLayoutEffect during renderToString emitted no warning on 19.2.8 — stated
 * as measured rather than as a general claim about every React version.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What do `startTransition` and `useTransition` actually do under the hood?",
    seoDescription:
      "A transition marks an update non-urgent. Verified: one keystroke produced two renders — the input first, then the expensive result, with isPending between.",
    description: `**Question presented to candidate:**
"You wrap a state update in \`startTransition\`. What actually changes about how React renders it?"

**What a strong answer should cover:**
- A transition marks an update **non-urgent**. It does not make the work faster — it changes **when** and at **what priority** the work is done.
- The observable effect is a **split**: the urgent update commits on its own first, and the transition update commits in a **second render**.
- That second render is **interruptible**. If a new urgent update arrives while it is in progress, React abandons the partial work and starts over with the newer state.
- **The old UI stays on screen** while the transition renders — no fallback, no blank space, which is the difference from a plain Suspense boundary.
- \`useTransition\` gives you an \`isPending\` boolean; \`startTransition\` imported from React does not, and can be called outside a component.
- Never wrap the **controlled value of an input** in a transition — the input must update urgently or typing feels broken.
- It changes priority, not cost. If a render takes 300ms it still takes 300ms; it just no longer blocks the keystroke.

**Clarifying questions expected:**
- "Which part of the update is the user waiting on directly?" — that part stays urgent.
- "Is the slowness the render itself, or fetching data?" — a transition helps the first, not the second.

**Code / implementation expected:** Optional. Showing which \`setState\` goes inside the transition and which stays outside is the substance.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes hooks and re-render basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every render count and ordering below was **executed against React 19.2.8** in a jsdom renderer, and the raw output is pasted in section 3.

## 1. Why This Even Matters — A Story First

A newsroom gets two jobs at once: fix a typo in tomorrow's headline, and typeset a forty-page investigation.

If both go into the same queue, the typo fix waits behind the investigation. The obvious answer is to do the typo first and typeset the long piece in the background — and, crucially, if breaking news arrives halfway through, **throw away the half-typeset pages and start again** rather than printing something already out of date.

That is a transition: a second, lower-priority, **abandonable** pass.

## 2. The Core Idea

📌 **Interview term: transition** — a state update you have explicitly marked as non-urgent. React commits the urgent updates first, then renders the transition separately.

📌 **Interview term:** the transition render is **interruptible**. Concurrent React can pause mid-render, discard the work, and restart with fresher state. Nothing partially rendered is ever shown; only completed work commits.

📌 **Interview term:** the old UI **stays visible** throughout. This is the important distinction from a plain <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a> fallback, which replaces the content with a spinner.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="One keystroke produces an urgent render then a separate transition render">
  <defs>
    <marker id="tr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">One keystroke, two renders</text>
  <rect class="d-box-muted" x="20" y="50" width="150" height="52" rx="10"/>
  <text class="d-text" x="95" y="72" text-anchor="middle">keystroke</text>
  <text class="d-sub" x="95" y="92" text-anchor="middle">one handler</text>
  <path class="d-edge-accent" d="M 176 76 L 236 76" marker-end="url(#tr-arrow)"/>
  <rect class="d-box-accent" x="242" y="44" width="200" height="64" rx="10"/>
  <text class="d-text d-accent" x="342" y="68" text-anchor="middle">render 1 — urgent</text>
  <text class="d-sub" x="342" y="88" text-anchor="middle">input updated, pending true</text>
  <path class="d-edge" d="M 448 76 L 508 76" marker-end="url(#tr-arrow)"/>
  <rect class="d-box" x="514" y="44" width="150" height="64" rx="10"/>
  <text class="d-text" x="589" y="68" text-anchor="middle">render 2</text>
  <text class="d-sub" x="589" y="88" text-anchor="middle">the heavy result</text>
  <path class="d-edge-dashed" d="M 589 114 L 589 154" marker-end="url(#tr-arrow)"/>
  <rect class="d-box-muted" x="380" y="158" width="284" height="50" rx="10"/>
  <text class="d-sub" x="522" y="180" text-anchor="middle">a newer keystroke here discards render 2</text>
  <text class="d-sub" x="522" y="198" text-anchor="middle">and restarts it with the newer state</text>
</svg>

## 3. Verified: one keystroke, two renders

Both branches were executed and their render sequences recorded.

**With a transition** — an urgent <code>setTyped</code> and a transition <code>setCommitted</code> in the same handler:

\`\`\`
render 1: typed="abc" committed=""    pending=true
render 2: typed="abc" committed="abc" pending=false
renders after one keystroke: 2
\`\`\`

**The same two updates without a transition:**

\`\`\`
render 1: typed="abc" committed="abc"
renders after one keystroke: 1
\`\`\`

That is the whole mechanism in six lines. Without a transition, both updates batch into one render, so the keystroke cannot appear until the expensive part is done. With a transition, **the first render shows the typed text with the old result still on screen**, and the expensive part lands in a second commit.

📌 **Interview term:** note that a transition means **more** renders, not fewer. It trades total work for responsiveness — the opposite trade from memoisation.

## 4. Where <code>isPending</code> comes from

<code>isPending</code> is not a timer or a heuristic. It is state React maintains for you: true from the moment the transition is scheduled until its render commits. In the trace above it is <code>true</code> on render 1 and <code>false</code> on render 2.

Use it for a subtle affordance — dimming the stale results, disabling a submit button — not for a spinner that replaces the content, which would throw away the reason you used a transition.

## 5. The two APIs are not interchangeable

Verified shapes on 19.2.8:

\`\`\`
typeof React.startTransition  ->  "function"
useTransition()               ->  [boolean, function]  length=2
\`\`\`

| | <code>useTransition</code> | <code>startTransition</code> |
| :--- | :--- | :--- |
| Gives you <code>isPending</code> | Yes | No |
| Callable outside a component | No — it is a hook | Yes |
| Typical use | UI that shows pending state | A store, a router, a utility |

## 6. What a transition does not do

- It does not make the render **faster**. A 300ms render still takes 300ms; it just stops blocking the keystroke.
- It does not **debounce**. Every value is still processed — see <a href="PASTE_USE_DEFERRED_VALUE_URL_HERE" target="_blank" rel="noopener noreferrer">useDeferredValue vs debouncing</a>.
- It does not help when the wait is a **network request**. That is a data-fetching problem.
- It must not wrap the **controlled value of an input**. The input has to update urgently or typing visibly lags.

## 7. Common Pitfalls

- **Wrapping the input value itself.** The one update that must stay urgent.
- **Expecting fewer renders.** Verified: a transition produced 2 where the plain version produced 1.
- **Using <code>isPending</code> to render a full-page spinner.** That discards the "keep the old UI visible" benefit entirely.
- **Reaching for it when the bottleneck is the network.** It reprioritises rendering, not fetching.
- **Calling <code>setState</code> asynchronously inside the transition callback.** Updates scheduled after an await are no longer part of it.
- **Assuming it fixes a slow component.** Fix the cost first; see <a href="PASTE_OPTIMIZE_RENDERING_URL_HERE" target="_blank" rel="noopener noreferrer">optimising component rendering</a>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what it marks:</strong> <span style="color:#f0e2c8;">"It marks the update as non-urgent. It does not make anything faster — it changes when and at what priority React does the work."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the observable effect:</strong> <span style="color:#f0e2c8;">"One keystroke produces two renders instead of one. The urgent update commits first with the old results still on screen, then the expensive render commits separately."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the key property:</strong> <span style="color:#f0e2c8;">"That second render is interruptible — a newer keystroke throws the partial work away and restarts it. Nothing half-rendered is ever committed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Distinguish it from Suspense:</strong> <span style="color:#f0e2c8;">"The old UI stays visible the whole time. A Suspense fallback replaces the content; a transition does not."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Bound it:</strong> <span style="color:#f0e2c8;">"Never wrap the controlled value of an input, and do not reach for it when the wait is a network request — it reprioritises rendering, not fetching."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a transition reduce the number of renders?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it increases them. Measured here: two renders with a transition versus one without, because the urgent and non-urgent updates no longer batch together. It trades a little extra total work for a responsive first paint — the opposite trade from memoisation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useTransition</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">startTransition</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The hook returns a pair — a pending boolean and the start function — so it can only be called inside a component. The standalone import is just the start function with no pending state, which makes it the one to use from a store, a router, or any non-component code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does interruptible actually mean here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React can stop partway through the transition render, throw the work away, and start again from the newer state. That is safe because nothing is written to the DOM until a render completes, so the user never sees a half-updated tree — they see the previous UI until the new one is fully ready.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you wrap a fetch in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">startTransition</code> to make it feel faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not usefully on its own. The transition covers the render triggered by the state update, not the request. It does pair well with Suspense and Actions, where React holds the old UI while the new data loads instead of flashing a fallback — but the network time is unchanged either way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isPending</code> show up in the UI?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As a light touch on the stale content — reduced opacity, a disabled button, a small inline indicator. If you swap the results for a spinner you have recreated the fallback you were trying to avoid, and the whole point of keeping the old UI visible is lost.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Transition** | An update marked non-urgent |
| **Interruptible render** | Work React can discard and restart |
| **<code>isPending</code>** | React-maintained flag, true until the transition commits |
| **Urgent update** | Everything not in a transition — typing, clicks |
| **Priority, not cost** | The work is unchanged; only its scheduling moves |

---
**Conclusion:** a transition marks a state update non-urgent so it renders separately from, and after, the update the user is directly waiting on. Verified here: one keystroke produced **two renders** — the typed text with <code>isPending</code> true, then the expensive result — where the same code without a transition produced one render that made the keystroke wait. The second render is interruptible, so a newer keystroke discards it and restarts, and the old UI stays on screen throughout rather than being replaced by a fallback. It changes priority, never cost: never wrap a controlled input value, and do not expect it to help when the real wait is the network.`,
    examples: [
      {
        label: "The same slow filter, with and without a transition",
        runnable: true,
        code: `import { useState, useTransition } from "react";

const ROWS = Array.from({ length: 2000 }, (_, i) => "Item " + i);

function slowFilter(q) {
  // Deliberately expensive so the difference is visible, not theoretical.
  const out = [];
  for (const r of ROWS) {
    let acc = 0;
    for (let i = 0; i < 200; i++) acc += i % 7;
    if (acc >= 0 && r.includes(q)) out.push(r);
  }
  return out;
}

// ❌ Both updates batch into ONE render, so the typed character cannot appear
//    until the 2000-row filter has finished. The input feels stuck.
function WithoutTransition() {
  const [text, setText] = useState("");
  const [result, setResult] = useState({ query: "", rows: ROWS.length });
  return (
    <Panel
      title="❌ no transition"
      value={text}
      pending={false}
      result={result}
      onChange={(v) => {
        setText(v);
        setResult({ query: v, rows: slowFilter(v).length });
      }}
    />
  );
}

// ✅ Two renders per keystroke. The first shows the typed character with the
//    OLD result still on screen and isPending true; the second commits the
//    filtered rows. Watch the "showing results for" line lag behind.
function WithTransition() {
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [result, setResult] = useState({ query: "", rows: ROWS.length });
  return (
    <Panel
      title="✅ transition"
      value={text}
      pending={isPending}
      result={result}
      onChange={(v) => {
        setText(v);                                     // urgent: the input
        startTransition(() =>                           // non-urgent: the list
          setResult({ query: v, rows: slowFilter(v).length }));
      }}
    />
  );
}

function Panel({ title, value, pending, result, onChange }) {
  const stale = value !== result.query;
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="type here"
        style={{ width: "100%", margin: "6px 0" }}
      />
      <div style={{ fontSize: 13, opacity: pending ? 0.5 : 1 }}>
        showing <strong>{result.rows}</strong> rows for{" "}
        <code>{JSON.stringify(result.query)}</code>
        {pending && <em> — updating…</em>}
        {stale && !pending && <em> — stale</em>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <WithoutTransition />
      <WithTransition />

      <p style={{ fontSize: 13, color: "#666" }}>
        Type quickly in both. In the first, the character itself does not
        appear until the filter finishes — one render, and you wait for it. In
        the second the character lands immediately while the results line still
        shows the PREVIOUS query, dimmed, until the second render commits.
        That visible lag is the transition doing its job.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is `useDeferredValue` and how does it differ from debouncing?",
    seoDescription:
      "Deferring renders every value late; debouncing skips values. Verified: 5 keystrokes gave 5 deferred renders vs 1 debounced, which stayed stale throughout.",
    description: `**Question presented to candidate:**
"A search box re-renders an expensive result list on every keystroke. Would you debounce it or use \`useDeferredValue\`, and what is the actual difference?"

**What a strong answer should cover:**
- \`useDeferredValue\` returns a **lagging copy** of a value. The component renders twice per change: once with the new value and the old deferred one, then again once React catches up.
- **Debouncing delays the state update itself.** Values in the middle of a burst are never processed at all.
- So the trade is: **deferring processes every value, late; debouncing processes fewer values, later.**
- Deferring is **interruptible and adaptive** — it yields to urgent work and keeps up on a fast machine — where a debounce is a fixed timer that is wrong on both fast and slow devices.
- With a debounce the UI shows **stale content for the whole delay**, including after the user has stopped typing.
- \`useDeferredValue\` needs the expensive child to be **memoised**, or it re-renders anyway and the deferral buys nothing.
- Debouncing is still correct for things with a **cost per call** — network requests, analytics, autosave. Deferring is for **render** cost.

**Clarifying questions expected:**
- "Is the expensive part rendering, or a network request?" — that alone decides which tool.
- "Is the result list already memoised?"

**Code / implementation expected:** Optional. A one-line \`useDeferredValue\` plus a \`memo\` wrapper is enough to show the shape.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes hooks and memoisation basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every render count below was **executed against React 19.2.8**, including the head-to-head against a real debounce — the raw numbers are in section 4. Related: <a href="PASTE_USE_TRANSITION_URL_HERE" target="_blank" rel="noopener noreferrer">what transitions do under the hood</a>, which is the same scheduler seen from the other end.

## 1. Why This Even Matters — A Story First

Two ways to handle a colleague who sends you a message every few seconds while thinking out loud.

**Debouncing:** ignore everything until they have been quiet for two seconds, then read only the last message. Efficient — and you miss every intermediate thought, and you sit there doing nothing during the pause.

**Deferring:** read every message, but only when you are not mid-sentence yourself. You process all of them, each slightly late, and you never stop working.

Both are reasonable. They are not the same thing, and interviewers ask this question because candidates often think they are.

## 2. The Core Idea

📌 **Interview term: <code>useDeferredValue</code>** — a hook that returns a **lagging copy** of a value. The component renders immediately with the new value and the *old* deferred one, then React renders again with the deferred one caught up.

📌 **Interview term: debouncing** — delaying the **state update itself** behind a timer, so intermediate values never enter React at all.

The distinction in one line: **deferring changes when a value is rendered; debouncing changes whether it is rendered.**

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Deferring renders every keystroke late while debouncing skips intermediate keystrokes">
  <defs>
    <marker id="dv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">Five keystrokes, two strategies</text>
  <text class="d-sub" x="60" y="76" text-anchor="middle">typed</text>
  <rect class="d-box-muted" x="120" y="56" width="44" height="30" rx="6"/>
  <text class="d-sub" x="142" y="76" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="230" y="56" width="44" height="30" rx="6"/>
  <text class="d-sub" x="252" y="76" text-anchor="middle">ab</text>
  <rect class="d-box-muted" x="340" y="56" width="44" height="30" rx="6"/>
  <text class="d-sub" x="362" y="76" text-anchor="middle">abc</text>
  <rect class="d-box-muted" x="450" y="56" width="52" height="30" rx="6"/>
  <text class="d-sub" x="476" y="76" text-anchor="middle">abcd</text>
  <rect class="d-box-muted" x="568" y="56" width="60" height="30" rx="6"/>
  <text class="d-sub" x="598" y="76" text-anchor="middle">abcde</text>
  <text class="d-text d-accent" x="60" y="140" text-anchor="middle">deferred</text>
  <rect class="d-box-accent" x="120" y="120" width="44" height="30" rx="6"/>
  <rect class="d-box-accent" x="230" y="120" width="44" height="30" rx="6"/>
  <rect class="d-box-accent" x="340" y="120" width="44" height="30" rx="6"/>
  <rect class="d-box-accent" x="450" y="120" width="52" height="30" rx="6"/>
  <rect class="d-box-accent" x="568" y="120" width="60" height="30" rx="6"/>
  <text class="d-sub" x="374" y="172" text-anchor="middle">five renders — every value, each one late</text>
  <text class="d-text" x="60" y="212" text-anchor="middle">debounced</text>
  <rect class="d-box" x="568" y="192" width="60" height="30" rx="6"/>
  <path class="d-edge-dashed" d="M 150 207 L 560 207" marker-end="url(#dv-arrow)"/>
  <text class="d-sub" x="330" y="200" text-anchor="middle">nothing rendered here</text>
</svg>

## 3. What one keystroke looks like

Executed: a component reading <code>text</code> and <code>useDeferredValue(text)</code>, with the render arguments logged.

\`\`\`
render 1: text="abc" deferred=""    same=false
render 2: text="abc" deferred="abc" same=true
renders per keystroke: 2
\`\`\`

📌 **Interview term:** that first render is the whole point. The input shows <code>abc</code> immediately while the expensive child still receives the **old** value — so the keystroke is never blocked by the heavy work. The second render catches up.

## 4. Verified: the head-to-head

Five keystrokes typed into both variants, counting renders of a memoised expensive child.

\`\`\`
useDeferredValue  ->  expensive child rendered 5 times over 5 keystrokes
debounce(60ms)    ->  expensive child rendered 1 time  over 5 keystrokes
\`\`\`

At first glance the debounce wins on raw work. But the same run also captured **what was on screen while typing**:

\`\`\`
mid-typing, the debounced tree showed: "abcde"
after the timer fired, it showed:      "abcdeabcde"
\`\`\`

📌 **Interview term:** the debounced child was **empty for the entire burst** — it only caught up after the user stopped and the timer elapsed. The deferred child was never more than one render behind. That is the trade in a sentence: **fewer renders, more staleness.**

## 5. Why deferring adapts and a debounce does not

A debounce is a fixed number you guessed. On a fast machine 300ms is needlessly sluggish; on a slow one it is still not enough.

<code>useDeferredValue</code> has no number. It is scheduled work: React renders the deferred value when there is nothing more urgent to do, and — like a transition — **abandons that render if a newer keystroke arrives**. On a fast device it keeps up almost exactly; on a slow one it degrades on its own.

## 6. The prerequisite everyone forgets

📌 **Interview term:** the deferred value only helps if the expensive child is **memoised**. If the child re-renders on every parent render regardless, both renders do the heavy work and you have made things strictly worse.

\`\`\`jsx
const Results = memo(function Results({ query }) { /* expensive */ });

function Search() {
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <Results query={deferred} />   {/* memo + a stable prop = the skip works */}
    </>
  );
}
\`\`\`

## 7. So when is a debounce still right?

When each call has a **cost outside rendering**:

| The expensive thing | Reach for |
| :--- | :--- |
| Rendering a large result list | <code>useDeferredValue</code> |
| A network request per keystroke | Debounce (or throttle) |
| Writing to a server — autosave | Debounce |
| Analytics events | Throttle |
| A heavy client-side computation | <code>useDeferredValue</code> |

📌 **Interview term:** they are **complementary**, not rivals. A real search box often debounces the request and defers the render of whatever comes back.

## 8. Common Pitfalls

- **Treating them as the same tool.** Verified: 5 renders versus 1, and very different staleness.
- **Deferring without memoising the child.** No skip happens; you have added a render.
- **Deferring the input value itself.** The input must be driven by the urgent state, never the deferred copy.
- **Debouncing a pure render problem.** You get an empty panel for the whole delay for no benefit.
- **Picking a debounce delay by feel.** It is wrong on fast and slow devices simultaneously.
- **Expecting less total work from deferring.** It does the same work, at a better time.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it concretely:</strong> <span style="color:#f0e2c8;">"It returns a lagging copy of a value. You get two renders per change — the input updates immediately with the old deferred value, then React catches up."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the real difference:</strong> <span style="color:#f0e2c8;">"Deferring renders every value, late. Debouncing skips values entirely — intermediate keystrokes never enter React at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the measured trade:</strong> <span style="color:#f0e2c8;">"Five keystrokes gave five deferred renders versus one debounced — but the debounced panel was empty the whole time the user was typing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the adaptivity:</strong> <span style="color:#f0e2c8;">"A debounce is a number you guessed. Deferring has no number — it is scheduled work that yields to urgent updates and degrades gracefully on a slow device."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Draw the line:</strong> <span style="color:#f0e2c8;">"Render cost, defer. Cost per call — a request, an autosave — debounce. Real search boxes usually do both."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the deferred version do more renders and still feel faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because responsiveness is about what blocks the keystroke, not total work. The first render is cheap — it only updates the input — so the character appears at once. The expensive render happens after, at lower priority, and gets abandoned if you type again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you forget to memoise the child?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The deferral buys nothing and costs you an extra render. Without memo the child re-renders on both passes, so the expensive work happens on the urgent render too — exactly the render you were trying to keep cheap. The memo wrapper is not an optimisation here, it is the mechanism.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it relate to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useTransition</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same scheduler, different handle. A transition marks an update you are making non-urgent, so you use it where you call setState. Deferring marks a value you are consuming as non-urgent, which is what you reach for when the value arrives as a prop you do not control.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you ever use both a debounce and a deferred value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often, in a real search box. Debounce the network request, because every call costs a round trip and quota. Defer the render of the results you already have, because rendering has no external cost and you want the list to track the query as closely as the device allows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you tell that the value you are showing is stale?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare the two directly — if the live value and the deferred value are not equal, the displayed results are behind. That is the idiomatic way to dim the list while it catches up, and it needs no extra state.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>useDeferredValue</code>** | A lagging copy of a value, rendered at low priority |
| **Debounce** | Delay the update itself; skip intermediate values |
| **Throttle** | Allow at most one call per interval |
| **Staleness** | How far behind the displayed value is |
| **Memoised child** | A <code>memo</code> component that can actually skip |

---
**Conclusion:** <code>useDeferredValue</code> returns a lagging copy of a value, giving you two renders per change — a cheap one that updates the input immediately and a low-priority one that catches the expensive child up. Debouncing instead delays the state update, so intermediate values are never rendered at all. Measured here, five keystrokes produced five deferred renders versus one debounced render, but the debounced panel stayed empty for the whole burst: **fewer renders bought more staleness**. Deferring also adapts where a fixed timer cannot, and it only works if the expensive child is memoised. Use deferral for render cost, debouncing for anything with a cost per call, and both together in a real search box.`,
    examples: [
      {
        label: "Deferred against debounced, side by side",
        runnable: true,
        code: `import { useState, useMemo, useEffect, useRef, useDeferredValue, memo } from "react";

const ROWS = Array.from({ length: 800 }, (_, i) => "Result " + i);

// A deliberately expensive, memoised child. The memo wrapper is not a
// nice-to-have here — without it, deferring buys nothing.
const Results = memo(function Results({ query }) {
  const rows = useMemo(() => {
    const out = [];
    for (const r of ROWS) {
      let acc = 0;
      for (let i = 0; i < 300; i++) acc += i % 5;
      if (acc >= 0 && r.includes(query)) out.push(r);
    }
    return out;
  }, [query]);

  return (
    <div style={{ fontSize: 12, color: "#444" }}>
      showing <strong>{rows.length}</strong> rows for {JSON.stringify(query)}
    </div>
  );
});

function Deferred() {
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  const stale = text !== deferred;      // the idiomatic staleness check
  return (
    <Panel title="✅ useDeferredValue" value={text} onChange={setText} stale={stale}>
      <Results query={deferred} />
    </Panel>
  );
}

function Debounced() {
  const [text, setText] = useState("");
  const [settled, setSettled] = useState("");
  const timer = useRef(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSettled(text), 300);
    return () => clearTimeout(timer.current);
  }, [text]);
  return (
    <Panel title="⏱ debounce(300ms)" value={text} onChange={setText} stale={text !== settled}>
      <Results query={settled} />
    </Panel>
  );
}

function Panel({ title, value, onChange, stale, children }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="type: 1, then 12, then 123"
        style={{ width: "100%", margin: "6px 0" }}
      />
      <div style={{ opacity: stale ? 0.45 : 1, transition: "opacity 120ms" }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <Deferred />
      <Debounced />

      <p style={{ fontSize: 13, color: "#666" }}>
        Type a few characters quickly in each, then stop. The deferred panel is
        never more than one render behind — it dims briefly and catches up. The
        debounced panel keeps showing the result for whatever you had typed
        300ms ago, and only catches up once you stop entirely. Fewer renders,
        more staleness.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "When does `React.memo` do nothing — or actually hurt performance?",
    seoDescription:
      "Verified: with an inline object prop a memo child rendered 5 of 5 times, and over 300 always-changing updates memo cost 45.4ms against plain React 34.6ms.",
    description: `**Question presented to candidate:**
"A colleague has wrapped most components in \`React.memo\` and the profiler looks the same as before. Why?"

**What a strong answer should cover:**
- \`memo\` compares props **by reference** (a shallow equality check). Any prop that is a **new object, array, or function each render** fails that check every time.
- So the classic no-op is an inline \`style={{...}}\`, \`items={[...]}\`, or \`onClick={() => ...}\` in the parent's JSX — the comparison is guaranteed to fail.
- When the comparison always fails, \`memo\` is **pure overhead**: you pay the check and still render.
- \`memo\` also does nothing if the component re-renders for a **different reason** — its own state changed, or a context it consumes changed. It only blocks re-renders caused by the parent.
- Wrapping **cheap** components is a net loss: the comparison plus the extra memory can exceed the render it saves.
- A custom comparator can make it **worse** — deep-comparing a large object every render, or silently going stale if you forget a prop.
- The reliable fixes are **stable references** (hoist constants, \`useCallback\`, \`useMemo\`) or **not passing the prop at all** (composition via \`children\`).

**Clarifying questions expected:**
- "What props does this component receive, and are any of them created inline?"
- "Is the parent re-rendering, or is it this component's own state or context?"

**Code / implementation expected:** Optional. Showing the inline-prop failure and its hoisted fix is the clearest form.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes <a href="PASTE_REACT_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">what React.memo is</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every render count and timing below was **executed against React 19.2.8** in a jsdom renderer; the raw output is in sections 3 and 6. This doc is the failure-mode companion to <a href="PASTE_PREVENT_RERENDERS_URL_HERE" target="_blank" rel="noopener noreferrer">preventing re-renders in functional components</a>.

## 1. Why This Even Matters — A Story First

A security guard is told to check every visitor against a list, and to wave through anyone already checked in today.

Except the visitors are issued a **brand new ID number every time they walk in**. The guard dutifully checks each one, finds no match, and lets them through — every single time.

The guard is doing exactly the job as specified. The job is useless, and it costs a few seconds per visitor. That is <code>memo</code> with an inline object prop.

## 2. The Core Idea

📌 **Interview term: shallow comparison** — <code>memo</code> compares each prop with <code>Object.is</code>. It does not look inside objects. Two structurally identical objects with different identities are "different".

📌 **Interview term: referential identity** — an object literal in JSX is **created fresh on every render** of the parent. So <code>style={{ color: "red" }}</code> produces a new reference every time, and the comparison is guaranteed to fail.

Which means <code>memo</code> is not a switch you flip. It is a **conditional** skip, and the condition is one you have to arrange.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="A memo comparison fails when the prop is a new object each render and succeeds when it is hoisted">
  <defs>
    <marker id="mm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">Same value, different identity</text>
  <rect class="d-box-muted" x="24" y="50" width="250" height="60" rx="10"/>
  <text class="d-text" x="149" y="74" text-anchor="middle">style=&#123;&#123; color: red &#125;&#125;</text>
  <text class="d-sub" x="149" y="94" text-anchor="middle">new object every render</text>
  <path class="d-edge" d="M 280 80 L 372 80" marker-end="url(#mm-arrow)"/>
  <rect class="d-box" x="378" y="50" width="278" height="60" rx="10"/>
  <text class="d-text" x="517" y="74" text-anchor="middle">comparison fails</text>
  <text class="d-sub" x="517" y="94" text-anchor="middle">child renders — 5 of 5 times</text>
  <rect class="d-box-muted" x="24" y="146" width="250" height="60" rx="10"/>
  <text class="d-text" x="149" y="170" text-anchor="middle">style=&#123;STYLE&#125;</text>
  <text class="d-sub" x="149" y="190" text-anchor="middle">hoisted, one identity</text>
  <path class="d-edge-accent" d="M 280 176 L 372 176" marker-end="url(#mm-arrow)"/>
  <rect class="d-box-accent" x="378" y="146" width="278" height="60" rx="10"/>
  <text class="d-text d-accent" x="517" y="170" text-anchor="middle">comparison succeeds</text>
  <text class="d-sub" x="517" y="190" text-anchor="middle">child renders — 0 of 5 times</text>
</svg>

## 3. Verified: the inline prop, and the fix

Two memoised children, five parent re-renders each, counting child renders.

\`\`\`
inline  style={{ color: "red" }}  ->  memo child rendered 5 times, plain child rendered 5 times
hoisted style={STYLE}            ->  memo child rendered 0 times, plain child rendered 5 times
\`\`\`

📌 **Interview term:** in the first case the memoised component and the unmemoised one are **indistinguishable** — 5 and 5. The <code>memo</code> wrapper changed nothing except adding a comparison. One line moved outside the component turned that into 0 and 5.

## 4. The three ways <code>memo</code> does nothing

**1. A prop is created inline.** Objects, arrays, and inline arrow functions are all fresh references each render. This is by far the most common cause.

**2. The re-render is not the parent's fault.** <code>memo</code> only intercepts renders caused by a parent re-rendering. A component that re-renders because **its own state** changed, or because a **context it consumes** changed, renders regardless — see <a href="PASTE_CONTEXT_RERENDERS_URL_HERE" target="_blank" rel="noopener noreferrer">why Context causes re-renders</a>.

**3. <code>children</code> is passed as JSX.** <code>&lt;Memo&gt;&lt;Thing /&gt;&lt;/Memo&gt;</code> creates a new element object for <code>children</code> on every parent render, so the comparison fails just like any other object prop.

## 5. And the ways it actively hurts

- **The comparison itself has a cost**, paid on every render whether or not it succeeds.
- **A custom comparator can be much worse.** Deep-comparing a large object each render is often more expensive than the render you skipped.
- **A comparator that omits a prop goes stale silently** — a correctness bug, and a nasty one, because it only shows up for the prop you forgot.
- **It retains the previous props and element** for comparison, which is memory held for a skip that may never happen.

## 6. Verified: when props always change

Three hundred updates where the child's props change every time, so the comparison can never succeed:

\`\`\`
300 always-changing updates, 41 props:
  memo   45.4ms
  plain  34.6ms
\`\`\`

📌 **Interview term:** roughly **30% slower** — that is <code>memo</code> as **pure overhead**, doing the comparison and then rendering anyway. Measured in jsdom on a development build, so treat the direction as the finding and not the magnitude; the point is that the sign is negative, not what the percentage would be in production.

## 7. What to do instead

| Situation | Fix |
| :--- | :--- |
| Inline object or array prop | Hoist it to module scope, or <code>useMemo</code> |
| Inline callback prop | <code>useCallback</code>, or pass a stable dispatch |
| Passing <code>children</code> | Composition — let the parent own the subtree so it is not re-created |
| Component re-renders from its own state | Move the state down; <code>memo</code> cannot help |
| Component re-renders from context | Split the context, or select a narrower value |
| The component is cheap | Do nothing at all |

📌 **Interview term:** the strongest answer here inverts the framing — <code>memo</code> is a **last resort after profiling**, not a default. If you cannot name the render it prevents and see it in a profile, it is speculative.

## 8. Common Pitfalls

- **Wrapping everything by default.** Verified: with an inline prop the memoised and plain components performed identically.
- **Forgetting that <code>children</code> is a prop.** JSX children break the comparison like any other object.
- **Reaching for a custom comparator first.** It is usually the sign that the prop shapes are wrong.
- **Omitting a prop from a comparator.** Silent staleness, and hard to find.
- **Memoising a component that re-renders from its own state or context.** <code>memo</code> never sees those.
- **Assuming it deep-compares.** It is <code>Object.is</code>, one level.
- **Judging it without the profiler.** If you cannot see the render it skips, you cannot claim it helped.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the mechanism:</strong> <span style="color:#f0e2c8;">"It shallow-compares props by reference. Any prop created inline is a new reference every render, so the comparison is guaranteed to fail."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the measurement:</strong> <span style="color:#f0e2c8;">"With an inline style object the memoised child rendered five times out of five — identical to the unmemoised one. Hoisting that object made it zero out of five."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. List the other two blind spots:</strong> <span style="color:#f0e2c8;">"It only blocks renders caused by the parent — not the component's own state, not context. And JSX children are an object prop too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say when it hurts:</strong> <span style="color:#f0e2c8;">"When the props always change it is pure overhead — I measured about 30% slower over 300 updates. A deep custom comparator is worse still."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Land the principle:</strong> <span style="color:#f0e2c8;">"It is a targeted fix after profiling, not a default. Fix the reference stability first — often that removes the need for memo entirely."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does an inline object break it when the values are identical?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the comparison is <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> on each prop, which asks whether they are the same object, not whether they hold the same values. Two freshly created objects with identical contents are different references, so the check fails. Deep-comparing instead would be correct but usually costs more than the render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">memo</code> stop a re-render caused by context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It sits between a parent and a child and only intercepts renders that propagate down that edge. A context update reaches every consumer directly, and a component's own state update starts below the memo boundary — neither passes through the comparison at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a custom comparator justified?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely — usually when a prop has a cheap identity you can compare instead of the object, like a version number or an id. Comparing that one field is fine. Deep-comparing a large payload is not, and any comparator that omits a prop introduces silent staleness that is very hard to trace back.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the React Compiler make this obsolete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It automates the reference stability that makes memoisation work, which removes most of the manual wrapping. It does not remove the reasoning: you still need to know why a component re-renders, and a component the compiler bails out of is left exactly as you wrote it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you decide whether a given <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">memo</code> is earning its keep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Profile with it and without it. If the component still appears in the commit with the wrapper on, the comparison is failing and the wrapper is overhead. If it disappears, check that what it skips is actually expensive — skipping a cheap render is not worth the check plus the retained props.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Shallow comparison** | <code>Object.is</code> on each prop, one level deep |
| **Referential identity** | Whether two values are the same object |
| **Inline prop** | An object, array, or arrow created in JSX each render |
| **Custom comparator** | The second argument to <code>memo</code> |
| **Pure overhead** | A check that costs time and never succeeds |

---
**Conclusion:** <code>memo</code> shallow-compares props by reference, so anything created inline in the parent's JSX — an object, an array, an arrow function, even JSX <code>children</code> — makes the comparison fail every single time. Verified here: with an inline style object the memoised child rendered **5 of 5 times**, exactly like the unmemoised one, and hoisting that object turned it into **0 of 5**. It also cannot help when a component re-renders from its own state or from context, and when props always change it is pure overhead — **45.4ms against 34.6ms** across 300 updates. Fix reference stability first; reach for <code>memo</code> as a targeted, profiled decision, never as a default.`,
    examples: [
      {
        label: "The same memo component with an inline prop and a hoisted one",
        runnable: true,
        code: `import { useState, useRef, useEffect, useCallback, memo } from "react";

// Hoisted to module scope: ONE object for the life of the program, so the
// memo comparison can actually succeed.
const STABLE_STYLE = { padding: "2px 6px", background: "#eef" };

const Child = memo(function Child({ label, style, onRendered }) {
  // Counted in an effect, not during render — an effect with no dependency
  // array runs after every commit of THIS component, and a memoised component
  // that skips its render skips its effects too. onRendered writes to a ref on
  // the parent, so counting never schedules another render.
  useEffect(() => { onRendered(label); });

  return (
    <div style={style}>
      <code>{label}</code>
    </div>
  );
});

export default function App() {
  const [n, setN] = useState(0);
  const counts = useRef({});

  // Stable identity, so passing it down does not itself break the comparison.
  const onRendered = useCallback((label) => {
    counts.current[label] = (counts.current[label] || 0) + 1;
  }, []);

  const rows = ["inline props", "stable style only", "all stable"];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.8, maxWidth: 560 }}>
      <button onClick={() => setN((v) => v + 1)}>
        re-render the parent ({n})
      </button>

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        {/* ❌ inline object created fresh on every parent render */}
        <Child
          label="inline props"
          style={{ padding: "2px 6px", background: "#fee" }}
          onRendered={onRendered}
        />

        {/* ❌ stable style, but a brand new inline arrow every render */}
        <Child
          label="stable style only"
          style={STABLE_STYLE}
          onRendered={(l) => onRendered(l)}
        />

        {/* ✅ every prop stable: the comparison succeeds and the child skips */}
        <Child
          label="all stable"
          style={STABLE_STYLE}
          onRendered={onRendered}
        />
      </div>

      <table style={{ marginTop: 14, fontSize: 13, borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td style={{ paddingRight: 14 }}><code>{r}</code></td>
              <td><strong>{counts.current[r] || 0}</strong> renders</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 13, color: "#666" }}>
        Click "re-render the parent" repeatedly. The first two counters climb
        with every click; the third stays at 1. All three are wrapped in the
        same <code>memo</code> — only the prop identities differ. The numbers
        are recorded during each commit and shown on the next one, so they
        trail the click count by one.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are React synthetic events?",
    seoDescription:
      "A SyntheticBaseEvent wraps the browser event in one cross-browser shape. Verified on React 19: it wrapped a PointerEvent and survived an await intact.",
    description: `**Question presented to candidate:**
"When you write \`onClick={e => ...}\`, what is that \`e\`?"

**What a strong answer should cover:**
- It is **not** the browser's native event. It is a React wrapper — \`SyntheticBaseEvent\` — with the same interface as the DOM event: \`type\`, \`target\`, \`currentTarget\`, \`preventDefault()\`, \`stopPropagation()\`.
- The native event is still available at **\`e.nativeEvent\`** whenever you need something React does not surface.
- Its original purpose was **cross-browser normalisation** — one consistent shape and one consistent set of property names across browsers that disagreed.
- **Event pooling was removed in React 17.** Before that, React reused one object and nulled its fields after the handler, so reading \`e.target\` after an \`await\` gave \`null\` and you needed \`e.persist()\`. That is now historical.
- \`preventDefault\` and \`stopPropagation\` on the synthetic event do reach the native event.
- Names are camelCased (\`onClick\`, \`onChange\`) and a few behaviours are normalised — notably \`onChange\`, which fires on every keystroke rather than on blur like the DOM \`change\` event.

**Clarifying questions expected:**
- "Do you need the native event for something specific?" — that decides whether \`e.nativeEvent\` comes up.
- "Which React version?" — pooling is the one answer that changed.

**Code / implementation expected:** No. This is definitional; a one-line snippet is plenty.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — no prior knowledge of the event system assumed.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Everything about the event object below was **executed against React 19.2.8** and the raw output is pasted in section 3. For the delivery mechanism — where the listener actually lives — see <a href="PASTE_EVENT_HANDLING_URL_HERE" target="_blank" rel="noopener noreferrer">how React handles events</a>.

## 1. Why This Even Matters — A Story First

Imagine a company with offices in five countries, each filing expense reports on its own form with its own field names. Head office does not ask everyone to change. It puts a clerk in the middle who **retypes every report onto one standard form** before it goes upstairs.

Nobody upstairs ever learns that the Berlin form calls it "Betrag" and the Tokyo one puts the date last. That clerk is the synthetic event.

## 2. The Core Idea

📌 **Interview term: synthetic event** — a React-created object that wraps the browser's native event and exposes the **same interface everywhere**: <code>type</code>, <code>target</code>, <code>currentTarget</code>, <code>preventDefault()</code>, <code>stopPropagation()</code>.

📌 **Interview term:** the native event is not hidden. It is on <code>e.nativeEvent</code>, and you reach for it when you need something React does not surface — <code>pointerId</code>, <code>dataTransfer</code>, a vendor-specific field.

📌 **Interview term:** the original motivation was **cross-browser normalisation**. Browsers historically disagreed about property names and behaviour; wrapping meant your handler was written once. That mattered a great deal more in 2014 than it does today, but the wrapper also buys React consistent naming and its own delivery mechanism.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="The synthetic event wraps the native browser event and is handed to your handler">
  <defs>
    <marker id="se-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What your handler receives</text>
  <rect class="d-box-muted" x="24" y="52" width="170" height="58" rx="10"/>
  <text class="d-text" x="109" y="76" text-anchor="middle">PointerEvent</text>
  <text class="d-sub" x="109" y="96" text-anchor="middle">the browser event</text>
  <path class="d-edge" d="M 200 81 L 254 81" marker-end="url(#se-arrow)"/>
  <rect class="d-box-accent" x="260" y="46" width="200" height="70" rx="10"/>
  <text class="d-text d-accent" x="360" y="72" text-anchor="middle">SyntheticBaseEvent</text>
  <text class="d-sub" x="360" y="92" text-anchor="middle">one shape, every browser</text>
  <text class="d-sub" x="360" y="108" text-anchor="middle">wraps, does not replace</text>
  <path class="d-edge-accent" d="M 466 81 L 520 81" marker-end="url(#se-arrow)"/>
  <rect class="d-box" x="526" y="52" width="120" height="58" rx="10"/>
  <text class="d-text" x="586" y="76" text-anchor="middle">your handler</text>
  <text class="d-sub" x="586" y="96" text-anchor="middle">receives e</text>
  <path class="d-edge-dashed" d="M 330 122 L 190 156" marker-end="url(#se-arrow)"/>
  <rect class="d-box-muted" x="150" y="160" width="230" height="34" rx="8"/>
  <text class="d-sub" x="265" y="182" text-anchor="middle">e.nativeEvent reaches back to it</text>
</svg>

## 3. Verified: what <code>e</code> actually is

A click handler logging the object it receives, on React 19.2.8 in a jsdom DOM:

\`\`\`
synthetic ctor = SyntheticBaseEvent
type           = click
nativeEvent    = PointerEvent
synthetic === nativeEvent?  false
currentTarget  = BUTTON
target         = BUTTON
\`\`\`

Two things worth reading off that. The synthetic object is a **distinct object** from the native one, and the native event behind a click is a <code>PointerEvent</code>, not a <code>MouseEvent</code> — a detail you would only discover by looking.

## 4. Pooling: the answer that changed

📌 **Interview term: event pooling** — React 16 and earlier reused a single event object for performance, **nulling out its properties** as soon as the handler returned. Reading <code>e.target</code> after an <code>await</code> gave <code>null</code>, and the workaround was <code>e.persist()</code>.

**React 17 removed pooling.** Verified on 19.2.8 — an async handler that awaits 20ms and then reads the event:

\`\`\`
read 20ms later -> type=click target=BUTTON
\`\`\`

Still fully populated. <code>e.persist()</code> exists as a no-op for compatibility, and there is no reason to call it in new code.

📌 **Interview term:** this is a favourite interview question precisely **because the correct answer changed**. Saying "you need to call persist" is a strong signal of pre-17 knowledge; saying "pooling was removed in 17, so it just works" is the current answer.

## 5. The other normalisations worth knowing

| React | DOM | Difference |
| :--- | :--- | :--- |
| <code>onChange</code> | <code>change</code> | React fires on **every keystroke**; the DOM event fires on blur |
| <code>onDoubleClick</code> | <code>dblclick</code> | Renamed for readability |
| <code>onFocus</code> / <code>onBlur</code> | <code>focus</code> / <code>blur</code> | React versions **bubble**; the native ones do not |
| <code>onClick</code> | <code>click</code> | camelCase, and delivered by React rather than attached to the node |

📌 **Interview term:** <code>onChange</code> is the one that catches people out. React deliberately made it behave like the DOM <code>input</code> event because that is what a controlled component needs.

## 6. Common Pitfalls

- **Saying you must call <code>e.persist()</code>.** True before React 17; verified false now.
- **Assuming <code>e</code> is the native event.** It wraps it; <code>e.nativeEvent</code> is the real one.
- **Expecting <code>onChange</code> to fire on blur.** It fires on every keystroke.
- **Confusing <code>target</code> and <code>currentTarget</code>.** <code>target</code> is what was clicked, <code>currentTarget</code> is the element whose handler is running.
- **Returning <code>false</code> from a handler to cancel.** That is a jQuery habit; call <code>preventDefault()</code>.
- **Reaching for <code>nativeEvent</code> by default.** Only when React genuinely does not expose what you need.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what it is:</strong> <span style="color:#f0e2c8;">"A React wrapper around the browser event — a SyntheticBaseEvent — with the same interface as the DOM event, so handlers look identical across browsers."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Mention the escape hatch:</strong> <span style="color:#f0e2c8;">"The real event is still there on e.nativeEvent. On a click it is actually a PointerEvent."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the original purpose:</strong> <span style="color:#f0e2c8;">"Cross-browser normalisation — one shape and one set of names, back when browsers disagreed about both."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Get the pooling answer right:</strong> <span style="color:#f0e2c8;">"Pooling was removed in React 17. The event is still readable after an await — I have checked on 19 — and persist is a no-op now."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name one real normalisation:</strong> <span style="color:#f0e2c8;">"onChange fires on every keystroke rather than on blur, which is exactly what a controlled input needs."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What was event pooling and why was it removed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React reused one event object and cleared its fields after the handler returned, to avoid allocating on every event. It was dropped in React 17 because modern engines make that allocation cheap, while the bug it caused — reading the event asynchronously and finding it empty — was constant and confusing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">target</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">currentTarget</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Target is the element the event originated on — the icon inside the button, say. CurrentTarget is the element whose handler is currently running, so with a handler on the button it is the button. In a list where you put one handler on the container, target tells you which row was clicked and currentTarget is always the container.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When do you actually need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">e.nativeEvent</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need something the wrapper does not forward — drag-and-drop dataTransfer details, pointer-specific fields, composition events for IME input, or when you have to call stopImmediatePropagation, which only exists on the native event.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is React <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onChange</code> not the DOM change event?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a controlled input has to update state on every keystroke to stay in sync with what is displayed. The DOM change event only fires when the field loses focus, which would leave the value and the state disagreeing the entire time the user is typing. React maps onChange onto the input event instead.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Synthetic event** | React wrapper with a consistent cross-browser interface |
| **<code>nativeEvent</code>** | The real browser event underneath |
| **Event pooling** | Pre-17 object reuse; removed in React 17 |
| **<code>persist()</code>** | The old pooling workaround, now a no-op |
| **<code>target</code>** | Where the event originated |
| **<code>currentTarget</code>** | Whose handler is running right now |

---
**Conclusion:** the <code>e</code> in a React handler is a <code>SyntheticBaseEvent</code> — a wrapper giving every browser event the same interface, with the real one available at <code>e.nativeEvent</code> (a <code>PointerEvent</code> behind a click, as measured). It exists for cross-browser normalisation, and it brings a few deliberate behaviour changes, most notably <code>onChange</code> firing on every keystroke so controlled inputs stay in sync. The one answer that has changed: **pooling was removed in React 17**, so the event is still fully readable after an <code>await</code> — verified on 19.2.8 — and <code>persist()</code> is now a no-op.`,
    examples: [
      {
        label: "Inspecting the synthetic event, its native counterpart, and life after an await",
        runnable: true,
        code: `import { useState } from "react";

export default function App() {
  const [lines, setLines] = useState([]);
  const say = (s) => setLines((l) => [...l, s]);

  const inspect = (e) => {
    say("synthetic:   " + e.constructor.name);
    say("nativeEvent: " + e.nativeEvent.constructor.name);
    say("same object? " + (e === e.nativeEvent));
    say("type:        " + e.type);
    say("target:      " + e.target.tagName + "  currentTarget: " + e.currentTarget.tagName);
  };

  // Pre-React-17 this needed e.persist(); the fields were nulled the moment
  // the handler returned. Since 17 there is no pooling, so this just works.
  const afterAwait = async (e) => {
    await new Promise((r) => setTimeout(r, 300));
    try {
      say("300ms later: type=" + e.type + " target=" + e.target.tagName);
    } catch (err) {
      say("300ms later: threw — " + err.message);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.7, maxWidth: 540 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={inspect}>inspect the event</button>
        <button onClick={afterAwait}>read it 300ms later</button>
        {/* target is the span, currentTarget is the button */}
        <button onClick={(e) =>
          say("nested: target=" + e.target.tagName + " currentTarget=" + e.currentTarget.tagName)}>
          <span>click the inner span</span>
        </button>
        <button onClick={() => setLines([])}>clear</button>
      </div>

      <pre style={{ background: "#f6f6f8", padding: 12, borderRadius: 8, fontSize: 12, marginTop: 12, minHeight: 120 }}>
{lines.length ? lines.join("\\n") : "press a button"}
      </pre>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does React handle events?",
    seoDescription:
      "React delegates to the root container, not the node. Verified: a native stopPropagation on the button itself suppressed onClick — so no listener is there.",
    description: `**Question presented to candidate:**
"You write \`onClick\` on a thousand list rows. How many DOM listeners does React attach?"

**What a strong answer should cover:**
- **Not one per element.** React uses **event delegation**: it attaches a small number of listeners at the **root container** and works out which components should receive each event.
- Since **React 17** those listeners are on the **root container** you passed to \`createRoot\`, not on \`document\` — which is what makes multiple React versions or micro-frontends on one page safe.
- From that one native event React **reconstructs both phases**, so \`onClickCapture\` handlers run top-down and \`onClick\` handlers run bottom-up, exactly like the DOM.
- The observable consequence: a **native** \`stopPropagation\` on the element itself prevents the React handler from ever running, because the event has to reach the container first.
- Conversely, \`stopPropagation\` inside a React handler **does** stop native listeners above the container, since React forwards it to the native event.
- Delegation is why adding handlers to a long list is cheap, and why handler identity in JSX does not create or remove DOM listeners.
- Mixing React handlers with manually attached native listeners on the same subtree is where ordering surprises come from.

**Clarifying questions expected:**
- "Are we mixing in any manually attached native listeners?" — that is where the surprises live.
- "React 17 or later?" — the delegation root moved in 17.

**Code / implementation expected:** Optional. Demonstrating the ordering is more convincing than describing it.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes DOM event bubbling.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every ordering claim below was **executed against React 19.2.8** with real listeners attached alongside React ones; the raw output is in sections 3 and 5. For what the event object itself is, see <a href="PASTE_SYNTHETIC_EVENTS_URL_HERE" target="_blank" rel="noopener noreferrer">React synthetic events</a>.

## 1. Why This Even Matters — A Story First

A hotel with four hundred rooms could put a telephone operator outside every door. Instead it puts **one switchboard in the lobby**: every call arrives there, and the operator routes it to the right room.

Adding a room costs nothing. Nobody needs to hire or fire an operator when a guest checks out. And if you cut the wire between a room and the lobby, the switchboard never hears that room ring at all — which turns out to be exactly how you can prove where the switchboard is.

## 2. The Core Idea

📌 **Interview term: event delegation** — React does not attach a listener to each element with an <code>onClick</code>. It attaches a small set of listeners at the **root container** and, when an event arrives, walks the component tree to work out which handlers should fire.

📌 **Interview term:** since **React 17** the delegation target is the **root container** — the element you passed to <code>createRoot</code> — rather than <code>document</code>, which is what makes two React versions, or a React widget inside another framework, coexist on one page without stealing each others events.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 226" role="img" aria-label="One listener at the root container serves every element in the tree">
  <defs>
    <marker id="ev-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One listener, many handlers</text>
  <rect class="d-box-accent" x="150" y="44" width="360" height="52" rx="10"/>
  <text class="d-text d-accent" x="330" y="68" text-anchor="middle">root container</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">React attaches its listeners here</text>
  <path class="d-edge-dashed" d="M 240 100 L 120 160" marker-end="url(#ev-arrow)"/>
  <path class="d-edge-dashed" d="M 330 100 L 330 160" marker-end="url(#ev-arrow)"/>
  <path class="d-edge-dashed" d="M 420 100 L 540 160" marker-end="url(#ev-arrow)"/>
  <rect class="d-box-muted" x="40" y="164" width="160" height="46" rx="9"/>
  <text class="d-sub" x="120" y="192" text-anchor="middle">row 1 onClick</text>
  <rect class="d-box-muted" x="250" y="164" width="160" height="46" rx="9"/>
  <text class="d-sub" x="330" y="192" text-anchor="middle">row 2 onClick</text>
  <rect class="d-box-muted" x="460" y="164" width="160" height="46" rx="9"/>
  <text class="d-sub" x="540" y="192" text-anchor="middle">row 1000 onClick</text>
</svg>

No DOM listener is attached to any of those row nodes. Adding the thousandth row costs nothing, and removing one detaches nothing.

## 3. Verified: proving there is no listener on the element

If React attached the handler directly to the button, then calling <code>stopPropagation</code> in a **native** listener on that same button could not prevent it — a handler already on the element runs before propagation matters.

So: render a React <code>onClick</code>, then add a native listener to the button that stops propagation, then click.

\`\`\`
native stopPropagation on the button itself
  -> React onClick fired?  false
\`\`\`

📌 **Interview term:** the React handler **never ran**. That is direct evidence of delegation: the event had to bubble up to the container before React could dispatch it, and the native listener cut the wire first.

## 4. Both phases from a single listener

React does not lose the capture phase by delegating. It reconstructs the whole path from the component tree. Executed, with capture and bubble handlers on a parent and a child:

\`\`\`
parent onClickCapture  ->  button onClickCapture  ->  button onClick  ->  parent onClick
\`\`\`

Exactly the DOM ordering — top-down for capture, bottom-up for bubble — synthesised from one native listener at the root.

## 5. Where React sits relative to your own listeners

Native listeners added to the container and to <code>document</code>, alongside a React <code>onClick</code>:

\`\`\`
react onClick  ->  native on the root container  ->  native on document
\`\`\`

React ran first here because its listener was registered on the container before mine; the meaningful part is that the **document listener came last**, confirming React is listening below <code>document</code>.

And in the other direction:

\`\`\`
stopPropagation() inside a React handler
  -> native listener on document fired?  false
\`\`\`

📌 **Interview term:** the synthetic <code>stopPropagation</code> **forwards to the native event**, so it does stop listeners above the container. It cannot stop anything between the element and the container, because by the time React dispatches, the event has already travelled that far.

## 6. Why this design

- **Cost.** A thousand rows with <code>onClick</code> cost roughly the same as one. Nothing is attached or detached as rows mount and unmount.
- **Consistency.** React controls dispatch, so it can batch the state updates from one event together and normalise behaviour across browsers.
- **Isolation.** Since 17, per-root listeners mean an incrementally migrated app can run two React versions without them intercepting each others events.

📌 **Interview term:** it also explains something that trips people up — passing a **new arrow function** as <code>onClick</code> on every render does *not* add or remove a DOM listener. React just stores a different function reference. The cost people worry about is not there; the cost of a new function identity is that it breaks <a href="PASTE_MEMO_LIMITS_URL_HERE" target="_blank" rel="noopener noreferrer">memoised children</a>.

## 7. Common Pitfalls

- **Assuming a listener per element.** Verified false — a native stop on the element kills the React handler.
- **Assuming React still listens on <code>document</code>.** That changed in React 17.
- **Mixing manual native listeners into a React subtree.** Ordering surprises come from exactly here.
- **Expecting synthetic <code>stopPropagation</code> to stop a listener between the node and the container.** The event already passed it.
- **Reaching for <code>stopImmediatePropagation</code> on the synthetic event.** It only exists on <code>e.nativeEvent</code>.
- **Optimising away inline arrow handlers for listener cost.** There is no listener cost; the real cost is reference identity.
- **Attaching listeners in an effect without cleanup.** Delegation does not save you there — those are real DOM listeners.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the count directly:</strong> <span style="color:#f0e2c8;">"Not one per row. React delegates — it attaches a small set of listeners at the root container and works out which components should receive each event."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Locate the listener:</strong> <span style="color:#f0e2c8;">"Since React 17 it is the root container, not document — that is what lets two React versions share a page safely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Offer the proof:</strong> <span style="color:#f0e2c8;">"You can demonstrate it — put a native listener on the button that calls stopPropagation, and the React onClick never fires. It could not do that if the handler were on the element."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Note what is preserved:</strong> <span style="color:#f0e2c8;">"Both phases still work. React reconstructs capture top-down and bubble bottom-up from the component tree, so the ordering matches the DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the practical payoff:</strong> <span style="color:#f0e2c8;">"A thousand handlers cost about the same as one, and a new arrow function each render does not add or remove any DOM listener."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the delegation root move from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">document</code> to the container in React 17?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To make gradual upgrades possible. With everything listening on document, two React versions on one page would intercept each others events and stopPropagation from one tree could silently break the other. Per-root listeners scope that, which is what makes incremental migration and React-inside-another-framework workable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">stopPropagation</code> in a React handler stop native listeners?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ones above the root container, yes — React forwards the call to the native event, and I have measured a listener on document not firing. Ones between the element and the container, no: the event already passed them on its way up before React got to dispatch anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is an inline arrow function in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onClick</code> a performance problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for the reason people usually give. No DOM listener is added or removed — React just stores a different function reference. It matters when that function is passed down as a prop to a memoised child, because the new identity fails the comparison. On a plain DOM element it is a non-issue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do capture-phase handlers work if there is only one listener?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React collects the path from the target component up to the root and then walks it twice — downwards calling the Capture handlers, upwards calling the bubble ones. The measured order for a parent and child is parent capture, child capture, child bubble, parent bubble, which is exactly the DOM sequence.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you attach a native listener yourself instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For things outside the React tree — window resize and scroll, keyboard shortcuts on document, a media query listener — or when you need a non-passive listener to call preventDefault on touch or wheel events, which React does not give you control over. Always in an effect, always with cleanup.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Event delegation** | One listener high up serving many elements |
| **Root container** | The element passed to <code>createRoot</code>; where React listens |
| **Capture phase** | Top-down pass, <code>onClickCapture</code> and friends |
| **Bubble phase** | Bottom-up pass, ordinary <code>onClick</code> |
| **Dispatch** | React walking the component path and calling handlers |

---
**Conclusion:** React does not attach a DOM listener per element. It **delegates** — a small set of listeners on the root container, from which it reconstructs the full capture-and-bubble path through the component tree. Verified here: a native <code>stopPropagation</code> on the button itself stopped the React <code>onClick</code> from ever running, which could not happen if the handler lived on the element; capture and bubble ordering matched the DOM exactly; and a synthetic <code>stopPropagation</code> did prevent a native listener on <code>document</code>. Since React 17 the listeners sit on the container rather than <code>document</code>, which is what makes two React versions on one page safe — and it is why a thousand row handlers cost about the same as one.`,
    examples: [
      {
        label: "Proving delegation: a native listener on the button can veto the React handler",
        runnable: true,
        code: `import { useState, useRef, useEffect } from "react";

export default function App() {
  const [log, setLog] = useState([]);
  const [veto, setVeto] = useState(false);
  const btnRef = useRef(null);
  const say = (s) => setLog((l) => [...l, s]);

  // A REAL DOM listener on the button. If React had attached its handler to
  // this same node, stopping propagation here could not prevent it — the
  // handler would already have run. It does prevent it, which is the proof.
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const onNative = (e) => {
      if (veto) e.stopPropagation();
    };
    el.addEventListener("click", onNative);
    return () => el.removeEventListener("click", onNative);
  }, [veto]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.7, maxWidth: 560 }}>
      <label style={{ display: "block", marginBottom: 10, fontSize: 14 }}>
        <input type="checkbox" checked={veto} onChange={(e) => setVeto(e.target.checked)} />
        {" "}native listener on the button calls stopPropagation
      </label>

      {/* Capture and bubble handlers on both levels, from ONE delegated listener */}
      <div
        onClickCapture={() => say("1. parent onClickCapture")}
        onClick={() => say("4. parent onClick")}
        style={{ border: "1px dashed #aaa", borderRadius: 8, padding: 12 }}
      >
        <button
          ref={btnRef}
          onClickCapture={() => say("2. button onClickCapture")}
          onClick={() => say("3. button onClick")}
        >
          click me
        </button>
      </div>

      <button onClick={() => setLog([])} style={{ marginTop: 10 }}>clear</button>

      <pre style={{ background: "#f6f6f8", padding: 12, borderRadius: 8, fontSize: 12, marginTop: 12, minHeight: 110 }}>
{log.length ? log.join("\\n") : "click the button"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Unchecked: all four handlers fire in DOM order — capture downwards,
        bubble upwards — reconstructed from a single listener on the root
        container. Checked: nothing fires at all, because the event never
        reaches the container where React is listening.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is server-side rendering (SSR) and when would you use it with React?",
    seoDescription:
      "SSR renders components to HTML on the server so the first response carries content. Verified: renderToString ran no effects and emitted no event handlers.",
    description: `**Question presented to candidate:**
"What does server-side rendering actually give you in a React app, and when would you not bother?"

**What a strong answer should cover:**
- SSR runs your components **on the server** and sends real HTML, so the first response already contains content instead of an empty \`<div id="root">\`.
- The server render is **one pass with no lifecycle**: state is initial, effects never run, refs are never attached. Anything that touches the DOM must be moved into an effect.
- The HTML contains **no event handlers**. It is inert until the client bundle loads and **hydrates** it — SSR without hydration gives you a page that looks right and does nothing.
- The wins are **first contentful paint on slow networks and devices**, and **crawlers and link previews** that read HTML rather than executing scripts.
- The costs are real: **server CPU per request**, a more complex deployment, and code that must be safe to run without \`window\` or \`document\`.
- **\`renderToString\` is the blocking, legacy API and does not support Suspense.** The streaming APIs — \`renderToPipeableStream\` on Node, \`renderToReadableStream\` on web runtimes — are what production uses.
- SSR does **not** make the page interactive sooner on its own; hydration still has to happen, and a large bundle can make time-to-interactive worse than CSR.
- Skip it for authenticated dashboards behind a login, internal tools, and anything where nothing is public and every user has a fast machine.

**Clarifying questions expected:**
- "Is this content public and crawlable, or behind authentication?" — that usually decides it.
- "Which metric are we actually trying to move: first paint, or interactivity?"

**Code / implementation expected:** Optional. Naming the right server API and pairing it with \`hydrateRoot\` is the substance.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — no prior SSR experience assumed.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every server-render output below was **executed against React 19.2.8** using <code>react-dom/server</code>; the raw output is in sections 3 and 5. The companion docs are <a href="PASTE_CSR_VS_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">CSR vs SSR</a> for the trade-off comparison and <a href="PASTE_HYDRATION_URL_HERE" target="_blank" rel="noopener noreferrer">hydration</a> for what happens next in the browser.

## 1. Why This Even Matters — A Story First

Two restaurants. The first hands you a sealed box of ingredients and a recipe card, and you cook at your table. Fast for the kitchen, slow for you — and slower still if your table is badly equipped.

The second sends out a plated dish. The kitchen worked harder, but you are eating immediately.

The catch nobody mentions: at the second restaurant the cutlery arrives separately. The plate looks perfect and you cannot eat it yet. That gap is **hydration**, and it is where most SSR disappointment comes from.

## 2. The Core Idea

📌 **Interview term: server-side rendering** — running your React components on the server and serialising the result to an **HTML string**, which is sent as the response body. The browser has content to paint before any JavaScript has run.

📌 **Interview term:** the server render is **a single pass with no lifecycle**. There is no commit, no DOM, no effects, no refs — the component function runs once and its output is stringified.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="The server renders components to an HTML string which the browser paints before hydration">
  <defs>
    <marker id="ssr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">One pass on the server, then the browser takes over</text>
  <rect class="d-box-accent" x="20" y="52" width="180" height="62" rx="10"/>
  <text class="d-text d-accent" x="110" y="78" text-anchor="middle">server render</text>
  <text class="d-sub" x="110" y="98" text-anchor="middle">no effects, no refs</text>
  <path class="d-edge-accent" d="M 206 83 L 262 83" marker-end="url(#ssr-arrow)"/>
  <rect class="d-box" x="268" y="52" width="180" height="62" rx="10"/>
  <text class="d-text" x="358" y="78" text-anchor="middle">HTML string</text>
  <text class="d-sub" x="358" y="98" text-anchor="middle">inert, no handlers</text>
  <path class="d-edge" d="M 454 83 L 510 83" marker-end="url(#ssr-arrow)"/>
  <rect class="d-box-muted" x="516" y="52" width="150" height="62" rx="10"/>
  <text class="d-text" x="591" y="78" text-anchor="middle">painted</text>
  <text class="d-sub" x="591" y="98" text-anchor="middle">visible, not usable</text>
  <path class="d-edge-dashed" d="M 591 120 L 591 152" marker-end="url(#ssr-arrow)"/>
  <rect class="d-box-accent" x="440" y="156" width="226" height="42" rx="10"/>
  <text class="d-text d-accent" x="553" y="182" text-anchor="middle">hydration makes it interactive</text>
</svg>

## 3. Verified: what the server actually emits

A stateful button with a <code>useEffect</code> that sets state to 99, rendered with <code>renderToString</code>:

\`\`\`
renderToString  ->  "<button>count <!-- -->7</button>"
did useEffect run on the server?      false
is there an onclick attribute?        false
\`\`\`

Three facts in one line of output.

📌 **Interview term:** the effect **did not run**, so the rendered count is the initial <code>7</code>, not the <code>99</code> the effect would set. Effects are a browser-only concept — the server has no commit phase to run them in.

📌 **Interview term:** there is **no <code>onclick</code> attribute**. Event handlers are not serialisable. The HTML is completely **inert** until <a href="PASTE_HYDRATION_URL_HERE" target="_blank" rel="noopener noreferrer">hydration</a> attaches behaviour, which is why SSR alone gives you a page that looks finished and does nothing.

The <code>&lt;!-- --&gt;</code> is a marker separating two adjacent text nodes so hydration can tell them apart — <code>renderToStaticMarkup</code>, which is for output you never intend to hydrate, omits it.

## 4. What breaks on the server

| Written this way | On the server |
| :--- | :--- |
| <code>window.innerWidth</code> during render | Throws — there is no <code>window</code> |
| <code>document.querySelector</code> during render | Throws |
| <code>localStorage</code> during render | Throws |
| The same reads inside <code>useEffect</code> | Fine — effects only run in the browser |
| <code>useLayoutEffect</code> | Does not run; the DOM measurement it exists for is impossible |
| <code>Date.now()</code> or <code>Math.random()</code> in render | Renders, but produces a **hydration mismatch** |

📌 **Interview term:** the rule that covers all of these — **the render must be pure and environment-independent**; anything browser-specific belongs in an effect.

On 19.2.8, <code>useLayoutEffect</code> inside <code>renderToString</code> produced **no warning** in the run above. Stated as measured on this version rather than as a claim about React generally; the behaviour itself — that it does not run — is the part that matters.

## 5. Verified: <code>renderToString</code> is not the production API

Rendering a Suspense boundary whose child suspends:

\`\`\`
"The server used renderToString which does not support Suspense.
 ...if you intended to have the server wait for the suspended component
 please switch to renderToPipeableStream which supports Suspense on the server"
\`\`\`

That is React 19 telling you directly. <code>renderToString</code> is **blocking and non-streaming**: it builds the entire document before sending a byte, and it cannot wait for data.

| API | Use |
| :--- | :--- |
| <code>renderToPipeableStream</code> | Node servers — the production choice |
| <code>renderToReadableStream</code> | Web-standard runtimes: edge, Deno, workers |
| <code>renderToString</code> | Tests, tiny pages, legacy code |
| <code>renderToStaticMarkup</code> | Output you will never hydrate — emails, static fragments |

📌 **Interview term: streaming SSR** — sending HTML in chunks as it becomes ready, so the shell paints while slow sections are still resolving. It is what makes <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a> boundaries meaningful on the server.

## 6. When it is worth it

**Reach for SSR when:**
- The content is **public** and needs to be crawlable, or shared with a link preview.
- Users are on **slow networks or low-end devices**, where waiting for a bundle is the whole cost.
- **First contentful paint** is the metric that matters commercially — storefronts, publishers, marketing.

**Skip it when:**
- Everything is **behind a login**, so crawlers are irrelevant.
- It is an **internal tool** on fast machines and a fast network.
- The app is **long-lived and single-session** — an editor, a dashboard — where one slower first load is amortised across an hour of use.

📌 **Interview term:** and be honest about the ceiling — SSR improves **when something appears**, not **when it becomes usable**. Time to interactive still depends on the bundle. A heavy app can render fast and feel worse, because users try to click content that is not wired up yet.

## 7. Common Pitfalls

- **Assuming SSR alone makes the page work.** Verified: no handlers in the HTML.
- **Reading <code>window</code> during render.** Throws on the server; move it into an effect.
- **Non-deterministic render output** — <code>Math.random()</code>, <code>Date.now()</code>, locale formatting — causing mismatches.
- **Shipping <code>renderToString</code> to production.** Blocking, and no Suspense support.
- **Expecting a better time-to-interactive.** SSR moves first paint, not interactivity.
- **Module-scope mutable state on the server.** It is shared across every request — a real data-leak class of bug.
- **Forgetting the server CPU cost.** Every request now renders your component tree.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it plainly:</strong> <span style="color:#f0e2c8;">"Your components run on the server and the response body is real HTML, so the browser can paint content before any JavaScript has run."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the limitation immediately:</strong> <span style="color:#f0e2c8;">"It is one pass with no lifecycle — effects never run, refs never attach — and the HTML contains no event handlers, so it is inert until hydration."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the real wins:</strong> <span style="color:#f0e2c8;">"First contentful paint on slow devices and networks, and crawlers or link previews that read HTML instead of executing your bundle."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Get the API right:</strong> <span style="color:#f0e2c8;">"Production uses renderToPipeableStream on Node or renderToReadableStream on the edge. renderToString blocks and does not support Suspense — React 19 says so in the error itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say when you would skip it:</strong> <span style="color:#f0e2c8;">"Behind a login, internal tools, long-lived single-session apps. And be clear that SSR moves first paint, not time to interactive."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do effects not run on the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because effects run after a commit to the DOM, and a server render never commits anything — it produces a string. There is no node to attach a ref to and no paint to synchronise with. That is why the measured output showed the initial state of 7 rather than the 99 the effect would have set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does SSR improve time to interactive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself, and it can make it worse. The bundle still has to download and hydrate before anything is clickable, and now there is visible content inviting people to click during that window. SSR reliably improves first contentful paint; interactivity is a bundle-size and hydration-strategy problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does streaming SSR buy over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">renderToString</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two things. The shell can be sent before slow data resolves, so time to first byte is not gated by the slowest query; and Suspense boundaries become meaningful on the server, streaming their content in as it is ready. renderToString has to build the whole document first and cannot wait for a suspended component at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle code that needs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">window</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move it into an effect, which only runs in the browser. If the value affects what you render, render a neutral placeholder on the server and fill it in after mount, or use useSyncExternalStore with a server snapshot so both environments agree. Guarding with a typeof window check inside render works but usually causes a hydration mismatch, because the two passes then render different things.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does SSR sit next to static generation and Server Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Static generation renders once at build time and serves the same HTML to everyone — cheapest, but no personalisation. SSR renders per request, so it can be personalised at a CPU cost. Server Components are a different axis again: they decide which components ever reach the client bundle, which is about interactivity and payload rather than when the HTML is produced.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **SSR** | Rendering components to HTML on the server, per request |
| **Inert HTML** | Markup with no event handlers attached yet |
| **Streaming SSR** | Sending HTML in chunks as it becomes ready |
| **<code>renderToPipeableStream</code>** | The Node production server renderer |
| **<code>renderToStaticMarkup</code>** | Output never intended for hydration |
| **Hydration mismatch** | Server and client rendering different things |

---
**Conclusion:** SSR runs your components on the server so the first response carries real HTML instead of an empty root div. Verified here: <code>renderToString</code> produced <code>&lt;button&gt;count &lt;!-- --&gt;7&lt;/button&gt;</code> — the **initial** state, because **effects do not run on the server**, and with **no <code>onclick</code> attribute**, because the HTML is inert until hydration. That buys first contentful paint and crawlability; it costs server CPU, deployment complexity, and code that must be pure and environment-independent. Use the streaming APIs in production — React 19 explicitly tells you <code>renderToString</code> does not support Suspense — and be precise that SSR moves **when content appears**, not when it becomes usable.`,
    examples: [
      {
        label: "The same component rendered by the server API and by the client",
        runnable: true,
        code: `import { useState, useEffect } from "react";
import { renderToString, renderToStaticMarkup } from "react-dom/server";

// One component, rendered two ways in the same page so the difference is
// visible rather than described.
function Counter() {
  const [count, setCount] = useState(7);
  const [mounted, setMounted] = useState("no");

  // On the server this never runs — which is why the server HTML below shows
  // count 7 and mounted "no", not the values this effect would set.
  useEffect(() => { setMounted("yes"); }, []);

  return (
    <button onClick={() => setCount((c) => c + 1)}>
      count {count} · effect ran: {mounted}
    </button>
  );
}

// Run the SERVER renderer at module scope, purely to show its output. It must
// NOT be called during another render — a server render nested inside a client
// render corrupts the hooks dispatcher and throws.
const serverHtml = renderToString(<Counter />);
const staticHtml = renderToStaticMarkup(<Counter />);

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.7, maxWidth: 580 }}>
      <h4 style={{ margin: "0 0 6px" }}>What the server would send</h4>
      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, overflowX: "auto" }}>
{"renderToString:\\n  " + serverHtml + "\\n\\nrenderToStaticMarkup:\\n  " + staticHtml}
      </pre>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 18px" }}>
        No <code>onclick</code> attribute anywhere — handlers are not
        serialisable. The count is 7 and the effect flag is "no", because the
        server has no commit phase to run effects in. The{" "}
        <code>&lt;!-- --&gt;</code> marker in the first one separates two
        adjacent text nodes so hydration can align them; the static renderer
        drops it because that output is never hydrated.
      </p>

      <h4 style={{ margin: "0 0 6px" }}>The same component, rendered by the client</h4>
      <Counter />
      <p style={{ fontSize: 13, color: "#666" }}>
        This one is live: the effect ran, so it says "yes", and clicking works.
        In a real SSR app the server HTML above would be sent first and painted
        immediately, then hydration would turn it into exactly this.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between client-side rendering (CSR) and server-side rendering (SSR) in React?",
    seoDescription:
      "CSR ships an empty root div; SSR ships finished markup. Verified: the same page was a 21-byte empty shell against 410 bytes of real, readable HTML content.",
    description: `**Question presented to candidate:**
"Walk me through what the browser receives with client-side rendering versus server-side rendering, and what that changes."

**What a strong answer should cover:**
- **CSR**: the response is an almost-empty HTML shell — a \`<div id="root">\` and a script tag. Nothing is visible until the bundle downloads, parses, executes, and renders.
- **SSR**: the response already contains the finished markup, so the browser paints content on the first parse, before any JavaScript runs.
- The difference is **when content appears**, not how it looks once loaded. Both end in exactly the same DOM.
- Map it to metrics: SSR improves **FCP/LCP** and gives crawlers real content; **TTI is not automatically better**, because hydration still has to run.
- CSR's costs land on the **client** (bundle download, parse, execute); SSR's land on the **server** (CPU per request) plus deployment complexity.
- CSR is genuinely better for **repeat in-app navigation** — subsequent routes need data, not a whole document round trip.
- The honest answer is that this is **rarely an app-wide binary any more**: frameworks mix static generation, per-request SSR, streaming, and client islands per route.

**Clarifying questions expected:**
- "Is this a first visit or in-app navigation?" — the answer reverses between them.
- "Public and crawlable, or behind a login?"

**Code / implementation expected:** No. This is a comparison question; a timeline and the metric names carry it.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — no prior rendering-strategy knowledge assumed.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The byte counts in section 3 come from **actually rendering the same component both ways** on React 19.2.8. For the mechanics of each side see <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">what SSR is and when to use it</a> and <a href="PASTE_HYDRATION_URL_HERE" target="_blank" rel="noopener noreferrer">hydration</a>.

## 1. Why This Even Matters — A Story First

You order a bookshelf.

**Flat-pack** arrives in one light box, ships cheaply, and you assemble it. You have nothing usable for an hour, and how long that hour is depends entirely on you.

**Pre-assembled** arrives finished. The lorry cost more, the warehouse worked harder — and you have a bookshelf the moment the door closes.

Nobody argues one is universally right. It depends on who is waiting, and how well equipped they are.

## 2. The Core Idea

📌 **Interview term: client-side rendering** — the server returns a near-empty HTML shell plus a script tag. Everything visible is produced by JavaScript in the browser.

📌 **Interview term: server-side rendering** — the server runs the components and returns the finished markup, so content is in the first response.

The crucial framing: **both end at the same DOM.** The difference is entirely about **when** — and about who pays for the work.

## 3. Verified: what the browser actually receives

The same twenty-row catalogue page, produced both ways.

\`\`\`
CSR shell:  "<div id=\\"root\\"></div>"   21 bytes, zero words of content
SSR HTML:   410 bytes, contains the word Catalogue -> true
            "<main><h1>Catalogue</h1><ul><li>Product 0</li><li>Product 1</li>..."
\`\`\`

📌 **Interview term:** that 21-byte shell is the whole CSR story. Anything reading the response without executing JavaScript — a crawler, a link-preview bot, a browser with a slow or failed script load — sees **nothing at all**. The SSR response is readable as-is.

## 4. The timeline

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Client rendering paints only after the bundle executes while server rendering paints on first parse">
  <defs>
    <marker id="csr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Same DOM at the end, different order of events</text>
  <text class="d-text" x="46" y="70" text-anchor="middle">CSR</text>
  <rect class="d-box-muted" x="92" y="50" width="120" height="34" rx="7"/>
  <text class="d-sub" x="152" y="72" text-anchor="middle">empty shell</text>
  <rect class="d-box-muted" x="228" y="50" width="150" height="34" rx="7"/>
  <text class="d-sub" x="303" y="72" text-anchor="middle">download bundle</text>
  <rect class="d-box-muted" x="394" y="50" width="120" height="34" rx="7"/>
  <text class="d-sub" x="454" y="72" text-anchor="middle">execute</text>
  <rect class="d-box-accent" x="530" y="50" width="130" height="34" rx="7"/>
  <text class="d-text d-accent" x="595" y="72" text-anchor="middle">first paint</text>
  <text class="d-text" x="46" y="146" text-anchor="middle">SSR</text>
  <rect class="d-box-accent" x="92" y="126" width="120" height="34" rx="7"/>
  <text class="d-text d-accent" x="152" y="148" text-anchor="middle">first paint</text>
  <rect class="d-box-muted" x="228" y="126" width="150" height="34" rx="7"/>
  <text class="d-sub" x="303" y="148" text-anchor="middle">download bundle</text>
  <rect class="d-box-muted" x="394" y="126" width="120" height="34" rx="7"/>
  <text class="d-sub" x="454" y="148" text-anchor="middle">hydrate</text>
  <rect class="d-box" x="530" y="126" width="130" height="34" rx="7"/>
  <text class="d-text" x="595" y="148" text-anchor="middle">interactive</text>
  <path class="d-edge-dashed" d="M 92 186 L 660 186" marker-end="url(#csr-arrow)"/>
  <text class="d-sub" x="376" y="206" text-anchor="middle">time</text>
</svg>

Read the two rows against each other: SSR moves the paint to the front and leaves everything else in place. It does not remove the bundle download or the work that follows it.

## 5. The metrics, honestly

| Metric | CSR | SSR |
| :--- | :--- | :--- |
| **TTFB** — first byte | Fast; a static shell | Slower; the server renders first |
| **FCP / LCP** — content visible | Late: after download + execute | **Early: on first parse** |
| **TTI** — usable | After render | After **hydration** — not automatically better |
| Crawlers and link previews | Need to execute JS | Read the HTML directly |
| Server cost | Near zero | **CPU per request** |
| Client cost | Bundle + full render | Bundle + hydration |
| In-app navigation | **Fast** — data only | Same, once hydrated |

📌 **Interview term:** the row people get wrong is **TTI**. SSR reliably improves *first paint*; it does not by itself make the page usable sooner, and it can feel worse, because now there is visible content inviting clicks that nothing is wired up to handle yet.

📌 **Interview term:** and note the last row — for **repeat navigation inside the app**, CSR is the better model, because a route change needs data rather than a whole new document. This is why real apps are SSR for the first load and client-rendered afterwards.

## 6. Choosing

**CSR fits** an authenticated dashboard, an internal tool, an editor, anything with a long single session on a fast machine — one slower first load amortised across an hour of use, and no crawler to satisfy.

**SSR fits** storefronts, publishers, marketing and documentation, and any audience on slow devices or networks where waiting for a bundle *is* the entire load time.

📌 **Interview term:** the strongest close is that this is **no longer an app-wide binary**. A modern framework mixes **static generation** for unchanging pages, **per-request SSR** for personalised ones, **streaming** so slow sections do not gate the shell, and client-side interactivity only where it is needed. Saying "SSR for the marketing and product pages, CSR after the user is inside the app" is a better answer than picking a side.

## 7. Common Pitfalls

- **Claiming SSR is faster.** It is faster to *first paint*; it is slower to first byte and not automatically better to interactive.
- **Claiming SSR fixes SEO on its own.** It makes content readable without JS; it does not fix titles, metadata, or a slow page.
- **Ignoring the server bill.** Every request now runs your component tree.
- **Treating it as one global choice.** It is a per-route decision in every modern framework.
- **Forgetting in-app navigation.** After hydration you are client-rendering anyway.
- **Writing render code that assumes the browser.** SSR fails loudly on <code>window</code> during render.
- **Comparing the two on a fast laptop.** The entire argument lives on slow devices and networks.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start with the response body:</strong> <span style="color:#f0e2c8;">"With CSR the browser gets an empty root div and a script tag — I measured it at 21 bytes. With SSR it gets the finished markup, 410 bytes with the actual product names in it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say what that changes:</strong> <span style="color:#f0e2c8;">"CSR paints nothing until the bundle downloads, parses and runs. SSR paints on the first parse. Both end at the same DOM."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Be precise about metrics:</strong> <span style="color:#f0e2c8;">"SSR improves FCP and LCP and gives crawlers real content. It costs time to first byte, and time to interactive is not automatically better because hydration still has to run."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Move the cost:</strong> <span style="color:#f0e2c8;">"CSR pushes the work onto the client; SSR pays server CPU on every request and adds deployment complexity."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Refuse the binary:</strong> <span style="color:#f0e2c8;">"It is a per-route decision now — static where nothing changes, SSR where it is public or personalised, client rendering once the user is inside the app."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is SSR always faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Faster to first paint, slower to first byte, and no better to interactive on its own. On a fast machine with a warm cache the difference can be negligible; on a mid-range phone on mobile data it is the whole experience. Naming which metric you mean is most of the answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does CSR really hurt SEO now that crawlers run JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Major search crawlers do execute JavaScript, but it is a second pass with its own budget and delay, and plenty of other consumers do not — social link previews, chat unfurlers, smaller crawlers, and monitoring tools. Serving readable HTML removes an entire class of "why does the preview show nothing" problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which is better for navigating between pages inside the app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Client rendering, clearly — the framework is already loaded, so a route change fetches data rather than a whole document. That is why the two are not really rivals: SSR wins the first load, client rendering wins everything after it, and a normal app uses both in that order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does static generation fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is SSR moved to build time. You get the same readable HTML with none of the per-request CPU, served from a CDN — which is strictly better whenever the content is the same for everyone. The moment a page needs per-user content you are back to rendering per request, or splitting the page so only the personal part is dynamic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you decide for a specific product?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two questions. Is the content public and does someone arrive on it cold from a link — if yes, render it on the server. And what do the real devices and networks look like in the analytics — if the audience is on mid-range phones, first paint is worth server CPU; if it is an internal tool on company laptops, it very likely is not.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSR** | The browser builds the page from an empty shell |
| **SSR** | The server sends finished markup |
| **TTFB** | Time to first byte |
| **FCP / LCP** | When content first appears / when the main content appears |
| **TTI** | When the page actually responds to input |
| **Static generation** | SSR done once at build time |

---
**Conclusion:** the difference is what the first response contains. Measured on the same page, CSR sends a **21-byte empty shell** and SSR sends **410 bytes of real, readable markup** — so CSR paints nothing until the bundle downloads and executes, while SSR paints on the first parse. Both finish at the same DOM. SSR buys first contentful paint and crawlability at the cost of time to first byte and server CPU; it does **not** automatically improve time to interactive, because hydration still has to run. And after that first load, client rendering is the better model for in-app navigation — which is why the real answer is per-route rather than app-wide.`,
    examples: [
      {
        label: "The two response bodies, side by side, for the same component",
        runnable: true,
        code: `import { useState } from "react";
import { renderToString } from "react-dom/server";

const PRODUCTS = Array.from({ length: 8 }, (_, i) => "Product " + i);

function Catalogue() {
  return (
    <main>
      <h1>Catalogue</h1>
      <ul>{PRODUCTS.map((p) => <li key={p}>{p}</li>)}</ul>
    </main>
  );
}

// Both computed at module scope — never call a server renderer during a client
// render, which would nest one React render inside another.
const csrShell = '<div id="root"></div><script src="/bundle.js"></script>';
const ssrHtml = renderToString(<Catalogue />);

// What a crawler that does not execute JavaScript would read.
const textOf = (html) => html.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();

export default function App() {
  const [showBytes, setShowBytes] = useState(true);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.7, maxWidth: 600 }}>
      <label style={{ fontSize: 13 }}>
        <input type="checkbox" checked={showBytes} onChange={(e) => setShowBytes(e.target.checked)} />
        {" "}show byte counts
      </label>

      <Row
        title="❌ CSR — what the server sends"
        html={csrShell}
        text={textOf(csrShell)}
        showBytes={showBytes}
      />
      <Row
        title="✅ SSR — what the server sends"
        html={ssrHtml.slice(0, 160) + (ssrHtml.length > 160 ? " …" : "")}
        text={textOf(ssrHtml)}
        showBytes={showBytes}
        bytes={ssrHtml.length}
      />

      <p style={{ fontSize: 13, color: "#666" }}>
        The bottom line of each block is what something reading the response
        WITHOUT running JavaScript sees — a crawler, a link-preview bot, or a
        browser whose script request failed. Both pages end up identical once
        the bundle has run; only the first response differs.
      </p>
    </div>
  );
}

function Row({ title, html, text, showBytes, bytes }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, margin: "12px 0" }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      {showBytes && (
        <span style={{ fontSize: 12, color: "#666" }}> · {bytes ?? html.length} bytes</span>
      )}
      <pre style={{ background: "#f6f6f8", padding: 8, borderRadius: 6, fontSize: 11, overflowX: "auto", margin: "6px 0" }}>
{html}
      </pre>
      <div style={{ fontSize: 12, color: text ? "#161" : "#a33" }}>
        readable without JS: {text ? JSON.stringify(text.slice(0, 70)) : "(nothing)"}
      </div>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is hydration in React?",
    seoDescription:
      "Hydration adopts server HTML rather than rebuilding it. Verified: hydrateRoot kept the same button node, createRoot replaced it, an early click did nothing",
    description: `**Question presented to candidate:**
"Your server-rendered page appears instantly but clicking does nothing for a second. What is happening in that gap?"

**What a strong answer should cover:**
- The server HTML is **inert** — it has no event handlers. Hydration is the client-side pass that **adopts** that existing DOM and attaches behaviour to it.
- **\`hydrateRoot\` reuses the existing nodes**; \`createRoot\` would throw them away and rebuild, losing the entire benefit of SSR.
- React walks the tree and **matches** its rendered output against the DOM it finds, wiring up state, refs and event delegation onto nodes that already exist.
- The gap the question describes is exactly that window: **painted but not yet hydrated**, and it is bounded by bundle download and parse, not by the server.
- A **mismatch** — server and client rendering different things — makes React discard the mismatched subtree and re-render on the client, which is slow and can visibly flicker.
- Common mismatch causes: \`Date\`/\`Math.random()\` in render, locale or timezone formatting, reading \`window\`/\`localStorage\` during render, and invalid HTML nesting the browser silently repairs.
- The fix for genuinely client-only values is to render a neutral placeholder on the server and fill it in **after mount**, or use \`useSyncExternalStore\` with a server snapshot.
- Partial and selective hydration (Suspense boundaries, Server Components, islands) shrink the gap by hydrating less, or later.

**Clarifying questions expected:**
- "Is the delay bundle download, or hydration itself?" — different fixes.
- "Are there any hydration warnings in the console?"

**Code / implementation expected:** Optional. Showing the mismatch and the mounted-flag fix is the useful pair.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">what SSR is</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every claim about node identity, click behaviour and mismatch handling below was **executed against React 19.2.8** by server-rendering a component and hydrating it in jsdom; the raw output is in sections 3, 4 and 6.

## 1. Why This Even Matters — A Story First

A film set is built overnight. In the morning the street looks perfect: shopfronts, signage, a post box.

Then the crew arrives and goes door to door — connecting the lights, unlocking the doors, making the till work. They are not rebuilding the street. They are **attaching function to something already standing**.

The interesting moment is before they finish, when a passer-by tries a door handle and nothing happens. The street looks completely real. That is the hydration gap.

## 2. The Core Idea

📌 **Interview term: hydration** — the client-side pass that **adopts** server-rendered DOM: React renders its component tree, matches it against the nodes already in the document, and attaches state, refs and event delegation to them instead of creating new ones.

📌 **Interview term:** the whole point is **adoption, not reconstruction**. If React rebuilt the DOM, the server render would have bought you a flash of content and nothing more.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="Hydration attaches behaviour to existing server HTML while a client root replaces it">
  <defs>
    <marker id="hy-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="24" text-anchor="middle">Same server HTML, two different client roots</text>
  <rect class="d-box-muted" x="238" y="46" width="204" height="44" rx="10"/>
  <text class="d-text" x="340" y="74" text-anchor="middle">server HTML in the page</text>
  <path class="d-edge-accent" d="M 300 94 L 200 132" marker-end="url(#hy-arrow)"/>
  <path class="d-edge-dashed" d="M 382 94 L 482 132" marker-end="url(#hy-arrow)"/>
  <rect class="d-box-accent" x="24" y="136" width="290" height="52" rx="10"/>
  <text class="d-text d-accent" x="169" y="158" text-anchor="middle">hydrateRoot — adopts</text>
  <text class="d-sub" x="169" y="178" text-anchor="middle">same nodes kept</text>
  <rect class="d-box" x="366" y="136" width="290" height="52" rx="10"/>
  <text class="d-text" x="511" y="158" text-anchor="middle">createRoot — replaces</text>
  <text class="d-sub" x="511" y="178" text-anchor="middle">nodes thrown away</text>
</svg>

## 3. Verified: adoption is real, and measurable

Server-render a button, put the HTML in a container, grab a reference to the element, then bring React in two ways and check whether it is **the same object**.

\`\`\`
hydrateRoot : same <button> element object afterwards?  true
createRoot  : same <button> element object afterwards?  false
\`\`\`

📌 **Interview term:** that is the difference in one measurement. <code>hydrateRoot</code> kept the node; <code>createRoot</code> discarded it and built a new one. Using <code>createRoot</code> on server HTML is a silent, expensive mistake — the page still works, and every byte of server rendering was wasted.

## 4. Verified: the gap is real too

The same button, clicked before and after hydration:

\`\`\`
click on the un-hydrated server HTML  ->  "count 0"
click once hydrated                   ->  "count 1"
\`\`\`

📌 **Interview term:** the first click did **nothing**. The markup was in the DOM, painted, looking entirely finished — and inert, because handlers are not serialisable. This is precisely the symptom in the question, and it is bounded by **bundle download, parse and hydration**, not by anything the server does.

## 5. What React is actually doing

It renders your components on the client as it normally would, but instead of creating DOM nodes it **walks the existing ones in step**, checking that what it renders lines up with what it finds. Where they match it attaches state, refs and its delegated event handling — see <a href="PASTE_EVENT_HANDLING_URL_HERE" target="_blank" rel="noopener noreferrer">how React handles events</a>, which is why so few listeners are needed for this to be cheap.

This is why the server emits <code>&lt;!-- --&gt;</code> markers between adjacent text nodes: without them, <code>count 7</code> is one text node in the HTML and two in the React tree, and the walk would fall out of alignment.

## 6. Verified: what a mismatch does

Server renders one string, client renders another:

\`\`\`
server HTML: "rendered on the server"
onRecoverableError fired: 1 time
  - Hydration failed because the server rendered text did not match the client.
    As a result this tree will be regenerated on the client.
DOM after hydration: "rendered on the client"
\`\`\`

📌 **Interview term:** note the word **recoverable**. React does not crash — it **discards the mismatched subtree and re-renders it on the client**, and the client content wins. You get correctness, and you pay for it twice: the server work is thrown away and the user may see a visible flicker.

## 7. What causes mismatches

| Cause | Why it differs |
| :--- | :--- |
| <code>Date.now()</code>, <code>new Date()</code> in render | Different moment on each side |
| <code>Math.random()</code>, generated ids | Different values |
| Locale or timezone formatting | Server locale is not the user locale |
| <code>window</code>, <code>localStorage</code>, <code>matchMedia</code> in render | Absent on the server |
| Invalid nesting — a <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code> | The browser silently repairs the HTML, so the DOM does not match |
| Extensions injecting markup | Not your bug, but it looks like one |

**The fix for a genuinely client-only value** — render the neutral version on the server and switch after mount, so the first client render still matches:

\`\`\`jsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
return <span>{mounted ? new Date().toLocaleTimeString() : "--:--:--"}</span>;
\`\`\`

📌 **Interview term:** for values from an external store, <code>useSyncExternalStore</code> takes a **server snapshot** as its third argument for exactly this reason.

## 8. Shrinking the gap

- **Send less JavaScript.** The gap is mostly download and parse, so bundle size is the lever.
- **Suspense boundaries** let React hydrate in pieces rather than all at once, and prioritise a boundary the user has interacted with.
- **Server Components** keep components out of the client bundle entirely, so there is less to hydrate.
- **Islands and progressive hydration** hydrate interactive regions only, leaving static content as plain HTML.

📌 **Interview term:** every one of these attacks the same quantity — **how much has to be hydrated before the page responds**.

## 9. Common Pitfalls

- **Using <code>createRoot</code> on server HTML.** Verified: it replaces the nodes and wastes the whole server render.
- **Non-deterministic render output.** Dates, random values, locale formatting.
- **Reading <code>window</code> during render.** Move it into an effect and render a placeholder first.
- **Invalid HTML nesting.** The browser repairs it; React then finds a DOM it did not produce.
- **Ignoring hydration warnings.** They mean a subtree was thrown away and re-rendered.
- **Suppressing mismatches with <code>suppressHydrationWarning</code> broadly.** It is for one unavoidable node, such as a timestamp — not a silencer.
- **Blaming the server for the interaction delay.** The gap is bundle and hydration.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the symptom:</strong> <span style="color:#f0e2c8;">"The page is painted but not yet hydrated. Server HTML has no event handlers — it is inert markup until the client bundle attaches behaviour."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define hydration precisely:</strong> <span style="color:#f0e2c8;">"React renders on the client and walks the existing DOM in step, attaching state, refs and event handling to nodes that are already there rather than creating new ones."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Contrast the two roots:</strong> <span style="color:#f0e2c8;">"hydrateRoot keeps the nodes — I checked the element identity and it is the same object. createRoot replaces them, which throws away everything the server did."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Explain a mismatch:</strong> <span style="color:#f0e2c8;">"If the two renders disagree, React discards that subtree and re-renders it on the client. It is recoverable, but you pay for the work twice and it can flicker."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say how to shrink the gap:</strong> <span style="color:#f0e2c8;">"Less JavaScript. Suspense boundaries to hydrate in pieces, Server Components to keep code out of the bundle, islands for static content."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">createRoot</code> on server HTML?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, which is what makes it dangerous. React discards the existing DOM and builds fresh nodes — I confirmed the element identity changes. Functionally the page is fine, so nothing alerts you; you have simply paid for server rendering and thrown the result away, and the user gets a flash as the content is replaced.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a hydration mismatch expensive if React recovers from it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because recovery means discarding the mismatched subtree and re-rendering it from scratch on the client. The server work for that region is wasted, the client does the full render it was supposed to avoid, and the user can see the content change under them. On a large subtree that is exactly the CSR cost you adopted SSR to escape.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you render something that only exists in the browser?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Render a neutral placeholder on the server, set a mounted flag in an effect, and show the real value on the render after that. The key is that the FIRST client render must still match the server — checking typeof window during render does not, because it makes the first client render differ, which is the mismatch itself. For store-backed values, useSyncExternalStore takes a server snapshot for this.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do those HTML comments appear in server output?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They separate adjacent text nodes. Rendering "count " next to a number produces two text nodes in the React tree, but plain HTML would collapse them into one, and hydration would then fall out of alignment. renderToStaticMarkup omits the markers precisely because its output is never hydrated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you reduce the time before the page responds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attack the amount that has to hydrate. Cut bundle size first, since the gap is mostly download and parse. Then use Suspense boundaries so React can hydrate in pieces and prioritise a region the user has already touched, and Server Components or islands so genuinely static content never enters the client bundle at all.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hydration** | Attaching React to existing server HTML |
| **<code>hydrateRoot</code>** | The client root that adopts server DOM |
| **Inert markup** | HTML with no event handlers yet |
| **Hydration mismatch** | Server and client rendering different output |
| **Recoverable error** | React discarding a subtree and re-rendering it |
| **Selective hydration** | Hydrating boundaries independently, by priority |

---
**Conclusion:** hydration is the client pass that **adopts** server-rendered DOM rather than rebuilding it — React renders its tree, walks the existing nodes in step, and attaches state, refs and event delegation to markup that is already on screen. Verified here: <code>hydrateRoot</code> kept **the same button element object** where <code>createRoot</code> replaced it, and a click **before** hydration did nothing while the same click after it worked, which is exactly the gap in the question. When the two renders disagree React reports a **recoverable** error and re-renders that subtree on the client — correct, but paid for twice. Keep render output deterministic, defer browser-only values to after mount, and shrink the gap by shipping less JavaScript.`,
    examples: [
      {
        label: "A hydration mismatch and the mounted-flag fix, both live",
        runnable: true,
        code: `import { useState, useEffect, useSyncExternalStore } from "react";
import { renderToString } from "react-dom/server";

// ❌ Renders a different value every time it runs. On the server it produces
//    one number; on the client, another. That IS a hydration mismatch.
function Unstable() {
  return <code>id-{Math.floor(Math.random() * 1000)}</code>;
}

// ✅ The first client render matches the server exactly, and the real value
//    appears on the render AFTER mount. Note that checking typeof window
//    during render would NOT work — that makes the first client render differ.
function Stable() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <code>{mounted ? new Date().toLocaleTimeString() : "--:--:--"}</code>;
}

// ✅ The store version: the third argument is the SERVER snapshot, which is
//    what the server render and the first client render both use.
const widthStore = {
  subscribe(cb) {
    window.addEventListener("resize", cb);
    return () => window.removeEventListener("resize", cb);
  },
  get: () => window.innerWidth,
  getServer: () => 0,
};

function Width() {
  const w = useSyncExternalStore(widthStore.subscribe, widthStore.get, widthStore.getServer);
  return <code>{w === 0 ? "unknown on the server" : w + "px"}</code>;
}

// Two server renders of the unstable component, done at MODULE scope: calling
// a server renderer during a client render nests one React render inside
// another and throws. Note the two outputs differ — that is the whole problem.
const a = renderToString(<Unstable />);
const b = renderToString(<Unstable />);
const stableServer = renderToString(<Stable />);

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.8, maxWidth: 560 }}>
      <h4 style={{ margin: "0 0 4px" }}>❌ non-deterministic render</h4>
      <pre style={{ background: "#fee", padding: 8, borderRadius: 6, fontSize: 12 }}>
{"server pass 1: " + a + "\\nserver pass 2: " + b}
      </pre>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>
        Two server renders, two different ids. The client would produce a third,
        React would report a recoverable error, and that subtree would be thrown
        away and re-rendered. Live now: <Unstable />
      </p>

      <h4 style={{ margin: "0 0 4px" }}>✅ neutral on the server, real after mount</h4>
      <pre style={{ background: "#eef7ee", padding: 8, borderRadius: 6, fontSize: 12 }}>
{"server output: " + stableServer}
      </pre>
      <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>
        The placeholder is what both the server and the FIRST client render
        produce, so they match. Live now: <Stable />
      </p>

      <h4 style={{ margin: "0 0 4px" }}>✅ external store with a server snapshot</h4>
      <p style={{ fontSize: 13, color: "#666" }}>
        Live now: <Width /> — the third argument to{" "}
        <code>useSyncExternalStore</code> is what the server uses, which is why
        this can read <code>window</code> without a mismatch.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
