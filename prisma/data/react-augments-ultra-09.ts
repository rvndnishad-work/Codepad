/**
 * React "ultra" rewrite — batch 09 (advanced performance, all hard).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag in the amber card needs its own inline colour and only one style
 * attribute.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - useOptimistic showed 1 immediately after the click and settled at 1.
 *   - preload/preinit/preconnect/prefetchDNS/preloadModule/preinitModule are
 *     all functions on react-dom; preload and preconnect wrote real <link>
 *     tags into document.head.
 *   - React.cache() exists, but OUTSIDE a server render it does not dedupe:
 *     3 calls ran the underlying function 3 times.
 *   - Profiler actualDuration: a cheap render 1.34ms, a costly one 11.5ms.
 *   - A promise CREATED during render never settles — suspends forever.
 *   - Dependent/nested requests: 280ms. The same two hoisted: 129ms.
 *   - Two separate boundaries: fast section at 45ms, slow one at 264ms.
 *
 * Two docs here CANNOT be executed (no React Compiler installed, no Next.js
 * runtime). Both say so explicitly rather than implying verification.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does automatic batching work in React 18, and how do you opt out?",
    seoDescription:
      "React 18 extended batching to timeouts, promises and native handlers. Verified: flushSync opts out, turning two batched updates into two separate renders.",
    description: `**Question presented to candidate:**
"React 18 introduced automatic batching. What exactly changed, and how would you opt out of it?"

**What a strong answer should cover:**
- **Before React 18**, batching only applied inside React's own synthetic event handlers. Updates in \`setTimeout\`, promises, or native listeners each triggered their own render.
- **React 18 made it automatic everywhere** — that is the whole change, and it was one of the few genuinely observable behavioural differences in the release.
- The mechanism: updates are queued and flushed together at the end of the current work, so the component never renders with only some applied.
- Why it was safe to change: batching is semantically invisible unless you were relying on an intermediate render, which was already fragile.
- **Opting out: \`flushSync\`** — forces React to process an update synchronously before continuing. Costs an extra render and the batching you gave up.
- Legitimate uses of \`flushSync\`: measuring the DOM after a state change, or integrating with a non-React system that reads the DOM immediately.
- \`unstable_batchedUpdates\` was the pre-18 way to opt *in* manually; it still exists for compatibility but is no longer needed.
- Concurrent features build on this: transitions rely on React controlling when work is flushed.

**Clarifying questions expected:**
- "Which React version is the codebase on?" — the answer genuinely differs.
- "Do you need the DOM updated before the next line, or just eventually?"

**Code / implementation expected:** Yes — updates across contexts, plus \`flushSync\` and what it costs.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes state updates and renders.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. This doc covers the **React 18 change and the opt-out**; <a href="PASTE_BATCHING_URL_HERE" target="_blank" rel="noopener noreferrer">how batching works</a> covers the mechanism from scratch, including the measured render counts quoted below.

## 1. Why This Even Matters — A Story First

A post room used to bundle letters only when they came from one particular department. Everything else went out individually — three memos from accounts meant three separate courier trips, on the same route, ten seconds apart.

Then the policy changed: bundle everything, regardless of origin. Nothing about what gets delivered changed, and almost nobody noticed. The people who did notice were the ones who had built something on top of the old behaviour — a process that relied on seeing each memo arrive separately.

That is React 18 automatic batching, including why it was both safe and mildly disruptive.

## 2. What actually changed

📌 **Interview term: batching** — grouping multiple state updates into a single re-render so the component never renders with only some applied.

📌 **Interview term: automatic batching** — React 18 extending that to **every** context. Before 18, batching was implemented inside React's synthetic event system, so anything outside it was not covered.

| Where the updates happen | React 17 | React 18+ |
| :--- | :--- | :--- |
| A React event handler | Batched | Batched |
| <code>setTimeout</code> | **Not batched** | Batched |
| A promise <code>then</code> | **Not batched** | Batched |
| A native <code>addEventListener</code> | **Not batched** | Batched |
| After an <code>await</code> | **Not batched** | Batched (per task) |

Measured on React 19.2.8, three updates produced **one render** in a handler, inside <code>setTimeout</code>, and inside a promise alike. On React 17 the last two would each have produced three.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="React 17 batched only event handlers while React 18 batches every context">
  <defs>
    <marker id="ab-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The boundary moved outwards</text>
  <rect class="d-box-muted" x="20" y="48" width="270" height="72" rx="10"/>
  <text class="d-text" x="155" y="72" text-anchor="middle">React 17</text>
  <text class="d-sub" x="155" y="94" text-anchor="middle">only synthetic event handlers</text>
  <text class="d-sub" x="155" y="112" text-anchor="middle">timeouts and promises: 3 renders</text>
  <rect class="d-box-accent" x="370" y="48" width="270" height="72" rx="10"/>
  <text class="d-text d-accent" x="505" y="72" text-anchor="middle">React 18 and later</text>
  <text class="d-sub" x="505" y="94" text-anchor="middle">every context batches</text>
  <text class="d-sub" x="505" y="112" text-anchor="middle">timeouts and promises: 1 render</text>
  <rect class="d-box" x="180" y="152" width="300" height="56" rx="10"/>
  <text class="d-text" x="330" y="176" text-anchor="middle">flushSync</text>
  <text class="d-sub" x="330" y="196" text-anchor="middle">the deliberate way back out</text>
  <path class="d-edge" d="M 155 124 L 260 148" marker-end="url(#ab-arrow)"/>
  <path class="d-edge" d="M 505 124 L 400 148" marker-end="url(#ab-arrow)"/>
</svg>

## 3. Why it was safe to change

Batching is **semantically invisible** unless you were depending on an intermediate render — a render where some updates had landed and others had not. Code relying on that was already fragile, because the boundary was an implementation detail of React's event system rather than a documented contract.

📌 **Interview term:** the visible consequence was almost always *fewer* renders, which is why React 18 shipped it as an improvement rather than a breaking change. The migration note existed mainly for code that counted renders, or that read the DOM between two updates.

## 4. Verified: how to opt out

📌 **Interview term: <code>flushSync</code>** — takes a callback, applies the updates inside it **synchronously**, and commits to the DOM before returning. It is the documented escape hatch from batching.

Two updates, each wrapped in its own <code>flushSync</code>:

\`\`\`
2 updates wrapped in flushSync -> renders: 2   <- batching opted out
\`\`\`

Where one render would have covered both, you now get two. That is precisely the cost, and it is why <code>flushSync</code> should be rare.

\`\`\`jsx
flushSync(() => setItems([...items, newItem]));
// the DOM is updated by this line, so measuring works
listRef.current.scrollTop = listRef.current.scrollHeight;
\`\`\`

Legitimate uses are narrow: **measuring or scrolling** after a state change, and **integrating with a non-React system** that reads the DOM immediately after you tell it something changed.

## 5. The other API people mention

📌 **Interview term: <code>unstable_batchedUpdates</code>** — verified still present on <code>react-dom</code>. Before React 18 this was how you manually opted **in** to batching outside an event handler, and libraries like Redux called it internally. Since 18 it is unnecessary; it survives for compatibility.

Note the direction of travel: the pre-18 API existed to *add* batching, and the modern API exists to *remove* it. That reversal is a neat way to describe what changed.

## 6. The consequence to internalise

Because updates are queued, the state variable **does not change until the next render**. So:

\`\`\`jsx
setN(n + 1);
setN(n + 1);   // both read the same n — final result is n + 1
\`\`\`

The <a href="PASTE_BATCHING_URL_HERE" target="_blank" rel="noopener noreferrer">functional updater</a> is how you compose several updates to the same value. And <code>flushSync</code> is **not** the fix for this — reaching for it to make state feel synchronous is the classic misuse.

## 7. Common Pitfalls

- **Assuming pre-18 behaviour.** Verified: timeouts and promises batch now.
- **Using <code>flushSync</code> to make state readable immediately.** It flushes the render, not your local variable — the constant in your scope still holds this render value.
- **Calling <code>flushSync</code> in a loop.** Each call is a full synchronous render; in a loop it is pathological.
- **Calling it during render or from inside a lifecycle.** React warns; it is for event handlers and effects.
- **Expecting batching across an <code>await</code>.** Each side is a separate task and batches separately.
- **Reaching for <code>unstable_batchedUpdates</code> in new code.** Redundant since 18.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the change precisely:</strong> <span style="color:#f0e2c8;">"Before 18, batching only covered React synthetic event handlers. React 18 extended it to timeouts, promises, and native listeners — everywhere."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the before and after:</strong> <span style="color:#f0e2c8;">"Three updates in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> were three renders on 17 and are one on 18 — I have measured the modern side."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain why it was safe:</strong> <span style="color:#f0e2c8;">"Batching is invisible unless you depended on an intermediate render, and that boundary was an implementation detail rather than a contract."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Answer the opt-out with its cost:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flushSync</code> — I measured two updates becoming two renders instead of one. It is for reading the DOM before the next line, not for convenience."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Land the neat reversal:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unstable_batchedUpdates</code> used to be how you opted <em style="color:#ffe0b2;">in</em>. Now the API you need is the one that opts out."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why was this not a breaking change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the observable result is fewer renders with the same final state. It only bites code that depended on seeing an intermediate render — some updates applied, others not — and that was relying on an implementation detail of the event system rather than any documented guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When have you actually needed <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">flushSync</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Adding an item to a list and immediately scrolling to it — the node has to exist before you can scroll to it. Also when handing control to a non-React library that reads the DOM the moment you notify it. Both are measurement problems, not convenience.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">flushSync</code> make the state variable readable straight away?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and this is the common misunderstanding. It flushes the render and the DOM, but the variable in your current scope is a constant for this render and never changes. What you can read afterwards is the updated DOM — not a new value for <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unstable_batchedUpdates</code> for now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compatibility. It is still exported from <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>, but since batching is automatic it has nothing left to do. Before 18 it was how libraries such as Redux forced batching around updates fired outside React event handlers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does batching relate to concurrent rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both come from React owning <em style="color:#ffe0b2;">when</em> work happens. Once React schedules rather than reacts immediately, it can group updates, assign them priorities, and interrupt low-priority work. Automatic batching and transitions are two consequences of the same scheduling principle.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Batching** | Several state updates producing one render |
| **Automatic batching** | React 18 applying that in every context |
| **<code>flushSync</code>** | Forces a synchronous render, opting out |
| **<code>unstable_batchedUpdates</code>** | The pre-18 manual opt-in; now redundant |
| **Intermediate render** | A render with only some updates applied |

---
**Conclusion:** React 18 extended batching from its own synthetic event handlers to every context — timeouts, promises, native listeners — which is why three updates in a <code>setTimeout</code> that produced three renders on React 17 produce one now. It was safe to ship because batching is invisible unless you depended on an intermediate render, which was never a documented guarantee. The escape hatch is <code>flushSync</code>, verified as turning two batched updates into two separate renders, and it earns its place only when you must read the DOM before the next line runs. The old <code>unstable_batchedUpdates</code> still exists but now solves a problem React handles for you.`,
    examples: [
      {
        label: "Batching across contexts, and flushSync buying a DOM read",
        runnable: true,
        code: `import { useState, useRef } from "react";
import { flushSync } from "react-dom";

export default function App() {
  const [items, setItems] = useState(["first item"]);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [log, setLog] = useState([]);

  const renders = useRef(0);
  const mark = useRef(0);
  renders.current++;

  const note = (label) =>
    setLog((l) => [...l.slice(-4), label + " -> " + (renders.current - mark.current) + " render(s)"]);
  const begin = () => { mark.current = renders.current; };

  // All three of these produce ONE render on React 18+. On React 17 only the
  // first would have; the other two would have produced three each.
  const inHandler = () => {
    begin();
    setA((x) => x + 1); setB((x) => x + 1); setA((x) => x + 1);
    setTimeout(() => note("3 updates in a handler"), 0);
  };
  const inTimeout = () => {
    begin();
    setTimeout(() => {
      setA((x) => x + 1); setB((x) => x + 1); setA((x) => x + 1);
      setTimeout(() => note("3 updates in setTimeout"), 0);
    }, 0);
  };
  const inPromise = () => {
    begin();
    Promise.resolve().then(() => {
      setA((x) => x + 1); setB((x) => x + 1); setA((x) => x + 1);
      setTimeout(() => note("3 updates in a promise"), 0);
    });
  };

  // Opting out costs a render per flushSync call.
  const optOut = () => {
    begin();
    flushSync(() => setA((x) => x + 1));
    flushSync(() => setB((x) => x + 1));
    setTimeout(() => note("2 updates via flushSync"), 0);
  };

  // The legitimate use: the new row must EXIST in the DOM before we scroll.
  const listRef = useRef(null);
  const addAndScroll = () => {
    flushSync(() => setItems((prev) => [...prev, "item " + (prev.length + 1)]));
    // Without flushSync the DOM would not yet contain the new row, so
    // scrollHeight would be the old value and this would under-scroll.
    listRef.current.scrollTop = listRef.current.scrollHeight;
  };

  const btn = { marginRight: 6, marginBottom: 6 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <p style={{ fontSize: 14 }}>
        renders: <strong>{renders.current}</strong> · a={a} b={b}
      </p>
      <p>
        <button onClick={inHandler} style={btn}>handler</button>
        <button onClick={inTimeout} style={btn}>setTimeout</button>
        <button onClick={inPromise} style={btn}>promise</button>
        <button onClick={optOut} style={btn}>flushSync x2</button>
      </p>
      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12 }}>
        {log.length ? log.join("\\n") : "(press a button)"}
      </pre>

      <h4 style={{ margin: "12px 0 6px" }}>The legitimate use: add a row, then scroll to it</h4>
      <div ref={listRef} style={{ height: 90, overflow: "auto", border: "1px solid #ddd", borderRadius: 6, padding: 6 }}>
        {items.map((it, i) => <div key={i} style={{ fontSize: 13 }}>{it}</div>)}
      </div>
      <p><button onClick={addAndScroll}>add and scroll to bottom</button></p>
      <p style={{ color: "#666", fontSize: 13 }}>
        The scroll works because flushSync committed the new row to the DOM
        before the next line read scrollHeight.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you optimize React component rendering?",
    seoDescription:
      "About cost per render, not how often. Verified with the Profiler: one cheap render took 1.34ms and one costly render 11.5ms — a single render each.",
    description: `**Question presented to candidate:**
"Forget how often a component renders. When one single render is slow, what do you do?"

**What a strong answer should cover:**
- Distinguish the two axes immediately: **how often** a component renders and **how much one render costs**. They have different fixes.
- Measure the second with the Profiler's **\`actualDuration\`**, or the \`Profiler\` component's \`onRender\` callback.
- What makes a single render expensive: heavy computation in the render body, creating very large element trees, deep prop drilling causing wide subtree renders, and expensive derived data.
- **Move computation out of render**: \`useMemo\` for derived values, or compute it once outside the component if it does not depend on props.
- **Reduce the tree**: virtualise long lists — the largest single win available, since it changes the element count by orders of magnitude.
- **Split the component** so the expensive part is isolated and can be skipped independently.
- Defer rather than shrink: \`useTransition\` and \`useDeferredValue\` keep input responsive while an expensive render happens at lower priority.
- Know the difference between \`actualDuration\` and \`baseDuration\` — the latter is what it would cost with no memoisation.
- Development builds are substantially slower; profile a production-profiling build.

**Clarifying questions expected:**
- "Is one render slow, or are there too many?" — that is the whole fork in this question.
- "How large is the tree we are rendering?"

**Code / implementation expected:** Yes — a Profiler measuring an expensive render, and the fixes applied.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes profiling basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The durations in section 3 were measured with React's own <code>Profiler</code> component on React 19.2.8. This doc is about **cost per render**; <a href="PASTE_PREVENT_RERENDERS_URL_HERE" target="_blank" rel="noopener noreferrer">preventing unnecessary re-renders</a> is about frequency, and <a href="PASTE_OPTIMIZE_PERF_URL_HERE" target="_blank" rel="noopener noreferrer">optimising performance</a> is the whole-app view.

## 1. Why This Even Matters — A Story First

A delivery route is running late. There are exactly two possible reasons: too many stops, or each stop taking too long. Adding a second van fixes the first and does nothing for the second — if every delivery involves a ten-minute conversation, you now have two vans having ten-minute conversations.

Most React performance advice addresses the number of stops. This question is about the length of the conversation, and the fixes are entirely different.

## 2. The Core Idea

📌 **Interview term:** rendering performance has **two independent axes**:

- **Frequency** — how many times a component renders. Fixed by composition, state placement, and memoisation.
- **Cost** — how long **one** render takes. Fixed by doing less work inside it, or rendering fewer elements.

Memoising a slow render does not make it faster; it makes it happen less often. If it still happens once on a critical interaction, you have not fixed anything.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Two independent axes of render performance with different fixes">
  <text class="d-text" x="330" y="24" text-anchor="middle">Two problems, two sets of fixes</text>
  <rect class="d-box-muted" x="20" y="48" width="290" height="76" rx="10"/>
  <text class="d-text" x="165" y="74" text-anchor="middle">renders too often</text>
  <text class="d-sub" x="165" y="96" text-anchor="middle">composition, state placement</text>
  <text class="d-sub" x="165" y="114" text-anchor="middle">memo, context splitting</text>
  <rect class="d-box-accent" x="350" y="48" width="290" height="76" rx="10"/>
  <text class="d-text d-accent" x="495" y="74" text-anchor="middle">one render costs too much</text>
  <text class="d-sub" x="495" y="96" text-anchor="middle">move work out of render</text>
  <text class="d-sub" x="495" y="114" text-anchor="middle">shrink the tree, virtualise</text>
  <rect class="d-box" x="180" y="152" width="300" height="56" rx="10"/>
  <text class="d-text" x="330" y="176" text-anchor="middle">Profiler actualDuration</text>
  <text class="d-sub" x="330" y="196" text-anchor="middle">tells you which one you have</text>
</svg>

## 3. Verified: one render is not one cost

Two components, each rendered exactly **once**, measured with the <code>Profiler</code> component's <code>onRender</code> callback:

\`\`\`
actualDuration per render (ms): [["cheap", 1.34], ["costly", 11.5]]
\`\`\`

Same count. Roughly **nine times** the cost. A render budget of 16ms for a smooth frame means the second one has consumed most of it on its own — and memoising it would not change that number at all, only how often it is paid.

📌 **Interview term: <code>actualDuration</code>** — how long this render actually took, including children. Its sibling <code>baseDuration</code> is what it *would* have cost with no memoisation anywhere. A large gap between them means memoisation is working; a large <code>actualDuration</code> with a small gap means the render itself is genuinely expensive.

## 4. What makes a single render expensive

| Cause | Fix |
| :--- | :--- |
| Heavy computation in the render body | <code>useMemo</code>, or hoist it out of the component |
| Sorting or filtering a large array every render | <code>useMemo</code> keyed on the source |
| Rendering thousands of elements | **Virtualise** |
| A very deep or wide subtree re-rendering | Split the component; isolate the costly part |
| Creating large objects or arrays inline | Hoist constants to module scope |
| Expensive formatting per row | Precompute, or memoise the formatter |

📌 **Interview term:** the single largest available win is almost always **reducing the element count**, not speeding up the work per element. Ten thousand rows memoised is still ten thousand elements and ten thousand DOM nodes; twenty rows is a different order of magnitude.

## 5. Move the work out of render

Render should be cheap and pure. Three places work can go instead:

- **<code>useMemo</code>** — for a derived value that depends on props or state. Recomputed only when its dependencies change.
- **Module scope** — if it does not depend on anything, compute it once when the module loads. A constant array or a compiled regex does not belong in a component body.
- **An event handler** — work triggered by a user action belongs there, not in render.

## 6. Defer rather than shrink

📌 **Interview term:** <code>useTransition</code> and <code>useDeferredValue</code> do not reduce the work. They mark it **low priority**, so React can interrupt it to handle typing or clicking. The expensive render still costs 11ms; the user no longer waits for it before seeing their keystroke.

That is the right tool when the work is genuinely necessary and genuinely expensive — you have exhausted the reductions and now need the interaction to stay responsive anyway.

## 7. Measuring properly

- Use the **Profiler panel**, and the **ranked chart** to find the most expensive components in the worst commit.
- Or the **<code>&lt;Profiler&gt;</code> component** for programmatic timings, as used for the numbers above — handy in tests and CI.
- **Throttle the CPU.** Your machine is not the target device; a 4x or 6x slowdown is closer to reality.
- **Profile a production-profiling build.** Development React is meaningfully slower and includes checks that never ship, so it exaggerates render cost.

## 8. Common Pitfalls

- **Memoising a slow render.** It changes frequency, not cost. The first render still pays it.
- **Confusing the two axes.** Fixing frequency when the problem is cost, or the reverse.
- **Profiling in development.** Slower than production, so the numbers mislead.
- **Optimising a component that renders once on mount.** Its cost may be irrelevant.
- **Reaching for <code>useMemo</code> on something cheap.** The comparison plus the dependency array can cost more than the work.
- **Ignoring element count.** No per-element optimisation beats not rendering the element.
- **Treating <code>useTransition</code> as a speed-up.** It reprioritises; the work is unchanged.
- **Calling <code>setState</code> from <code>Profiler</code>s <code>onRender</code> without a guard.** Found by running the example below: storing a timing triggers a render, which fires <code>onRender</code> again, which stores a slightly different timing — "Maximum update depth exceeded". Record once per input value, or keep the timings in a ref.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Separate the axes first:</strong> <span style="color:#f0e2c8;">"There are two different problems — rendering too often, and one render costing too much. Memoisation only fixes the first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the measurement:</strong> <span style="color:#f0e2c8;">"The Profiler <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">actualDuration</code>. I have measured a cheap render at 1.3ms and a costly one at 11.5ms — same single render, nine times the cost."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the fixes in order of payoff:</strong> <span style="color:#f0e2c8;">"Reduce the element count first — virtualise. Then move computation out of render with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> or module scope. Then split the component to isolate the costly part."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention the budget:</strong> <span style="color:#f0e2c8;">"A smooth frame is about 16ms, so an 11ms render has eaten most of it before anything else happens."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Add the honest caveats:</strong> <span style="color:#f0e2c8;">"Profile a production-profiling build with the CPU throttled — development React exaggerates render cost, and my laptop is not the target device."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Will <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">React.memo</code> fix a slow render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it makes it happen less often. The render that does occur still costs the same, and there is always at least one. If that single render is 11ms on a critical interaction, memoisation has not helped at all; you need to do less work or render fewer elements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">actualDuration</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">baseDuration</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">actualDuration</code> is what this render cost; <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">baseDuration</code> is what it would have cost with no memoisation anywhere. A wide gap means your memoisation is earning its keep. A high actual with a narrow gap means the render itself is expensive and memoisation is not the answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What gives the biggest single win?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reducing the number of elements. Virtualising a long list takes you from thousands of elements and DOM nodes to a couple of dozen — no amount of per-element optimisation competes with not creating the element at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should expensive computation live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> if it depends on props or state, at module scope if it depends on nothing, and in an event handler if a user action triggers it. What it should not do is run unconditionally in the render body on every pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useDeferredValue</code> make the render cheaper?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The same work happens; React just does it at a lower priority and can interrupt it to handle input. It is the right tool once the work is genuinely necessary and you have run out of reductions — you stop the user waiting for it rather than making it smaller.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>actualDuration</code>** | How long this render took, including children |
| **<code>baseDuration</code>** | What it would cost with no memoisation |
| **Frame budget** | Roughly 16ms for smooth 60fps |
| **Virtualisation** | Rendering only the elements currently visible |
| **Deferred update** | Same work, lower priority |
| **Profiling build** | A production build keeping names and timings |

---
**Conclusion:** optimising component rendering starts by separating two independent problems — how often a component renders and what one render costs. Memoisation only addresses the first. Measured with React's own Profiler, a cheap render took 1.34ms and a costly one 11.5ms for the same single render, which against a roughly 16ms frame budget is most of the frame gone. The fixes in order of payoff are reducing the element count, moving computation out of the render body into <code>useMemo</code> or module scope, and splitting the component to isolate the costly part — with <code>useTransition</code> as the last resort that reprioritises the work rather than reducing it.`,
    examples: [
      {
        label: "Measuring render cost with Profiler, then cutting it three ways",
        runnable: true,
        code: `import { useState, useRef, useMemo, useDeferredValue, Profiler } from "react";

// Module scope: computed ONCE when the module loads, not per render.
const ROWS = Array.from({ length: 3000 }, (_, i) => ({
  id: i,
  name: "Item " + i,
  score: (i * 7919) % 1000,
}));

function expensiveScore(row) {
  let x = 0;
  for (let i = 0; i < 400; i++) x += (row.score * i) % 13;
  return x;
}

// ❌ Everything computed inline, every row rendered.
function Naive({ query }) {
  const rows = ROWS
    .filter((r) => r.name.includes(query))
    .map((r) => ({ ...r, computed: expensiveScore(r) }))
    .sort((a, b) => a.computed - b.computed);
  return <Rows rows={rows} limit={rows.length} />;
}

// ✅ Memoised derivation + a windowed slice: far less work AND far fewer
//    elements. The element-count reduction is the bigger win of the two.
function Optimised({ query }) {
  const rows = useMemo(
    () =>
      ROWS.filter((r) => r.name.includes(query))
        .map((r) => ({ ...r, computed: expensiveScore(r) }))
        .sort((a, b) => a.computed - b.computed),
    [query],
  );
  return <Rows rows={rows} limit={30} />;
}

function Rows({ rows, limit }) {
  return (
    <div style={{ height: 120, overflow: "auto", border: "1px solid #ddd", borderRadius: 6, fontSize: 12 }}>
      {rows.slice(0, limit).map((r) => (
        <div key={r.id} style={{ padding: "1px 6px" }}>{r.name} — {r.computed}</div>
      ))}
      <div style={{ padding: "2px 6px", color: "#666" }}>
        rendering {Math.min(limit, rows.length)} of {rows.length}
      </div>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [timings, setTimings] = useState({});
  // Same work, lower priority: typing stays responsive.
  const deferred = useDeferredValue(query);

  // Recording a timing into state causes another render, which fires onRender
  // again — an infinite loop unless you stop it. Record once per query value.
  const recorded = useRef({});
  const record = (id, phase, actualDuration) => {
    const key = id + ":" + deferred;
    if (recorded.current[key]) return;
    recorded.current[key] = true;
    setTimings((t) => ({ ...t, [id]: Math.round(actualDuration * 100) / 100 }));
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="filter — try typing 1, 12, 123"
        style={{ width: "100%", marginBottom: 10 }}
      />

      <h4 style={{ margin: "0 0 4px" }}>
        ❌ naive — <span style={{ color: "#a33" }}>{timings.naive ?? "…"}ms</span> per render
      </h4>
      <Profiler id="naive" onRender={record}>
        <Naive query={deferred} />
      </Profiler>

      <h4 style={{ margin: "12px 0 4px" }}>
        ✅ memoised + windowed — <span style={{ color: "#161" }}>{timings.optimised ?? "…"}ms</span> per render
      </h4>
      <Profiler id="optimised" onRender={record}>
        <Optimised query={deferred} />
      </Profiler>

      <p style={{ color: "#666", fontSize: 13 }}>
        Both render exactly once per keystroke — the difference is entirely
        cost per render. Most of the saving comes from rendering 30 elements
        instead of 3000, not from the memoisation.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do Suspense data-fetching waterfalls happen, and how do you avoid them?",
    seoDescription:
      "Fetching inside a suspended child serialises requests. Verified: two dependent reads took 280ms; the same pair hoisted and started up front took 129ms.",
    description: `**Question presented to candidate:**
"You have Suspense boundaries and the page still loads slowly, one section at a time. What is going wrong?"

**What a strong answer should cover:**
- A **waterfall** is requests running in sequence when they could overlap. Suspense does not cause it, but it makes it easy to write and easy to miss.
- The mechanism: a component suspends, so its children never render, so **their** requests never start until the parent's resolves.
- **\`use()\` reads a promise; it does not create or cache one.** A promise created during render restarts on every render attempt and can suspend forever.
- The fix is **render-as-you-fetch**: start the requests before or while rendering, and pass the promises down — rather than fetch-on-render, where each level begins only after the one above finished.
- \`Promise.all\` for independent requests within one component.
- **Separate Suspense boundaries** so an independent slow section does not delay a fast one.
- A genuine dependency — you need the user before you can fetch their orders — cannot be parallelised; contain it behind its own boundary instead.
- Framework loaders and Server Components exist largely to hoist fetching above rendering.

**Clarifying questions expected:**
- "Are these requests genuinely dependent, or just written sequentially?"
- "Where are the promises created — during render, or before it?"

**Code / implementation expected:** Yes — the sequential version and the hoisted version, with timings.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes Suspense basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every timing below was measured on React 19.2.8 by rendering and polling until the content actually appeared, rather than by a fixed sleep.

## 1. Why This Even Matters — A Story First

Three people need to be phoned before a meeting can start. Call the first, wait for them to answer and finish, then call the second, then the third — the meeting starts after all three calls end to end. Or call all three at once and start when the slowest picks up.

Nobody would deliberately choose the first. But if each call is *made by the person the previous call reached*, sequential is the only option available — and that is exactly what a component tree does when each level fetches its own data.

## 2. The Core Idea

📌 **Interview term: waterfall** — requests running in sequence when they could have overlapped, so total time is the **sum** rather than the **maximum**.

📌 **Interview term:** Suspense does not create waterfalls, but it makes them structural. When a component suspends, React stops rendering that subtree — so a child that would have started its own request never runs. The child request cannot begin until the parent resolves.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Sequential requests sum their durations while hoisted requests overlap">
  <text class="d-text" x="330" y="24" text-anchor="middle">Where the promises are created decides the total</text>
  <text class="d-sub" x="70" y="66" text-anchor="middle">fetch-on-render</text>
  <rect class="d-box-muted" x="140" y="48" width="200" height="28" rx="6"/>
  <text class="d-sub" x="240" y="67" text-anchor="middle">request A</text>
  <rect class="d-box-muted" x="346" y="48" width="200" height="28" rx="6"/>
  <text class="d-sub" x="446" y="67" text-anchor="middle">request B waits for A</text>
  <text class="d-sub" x="330" y="100" text-anchor="middle">measured: 280ms</text>
  <text class="d-sub" x="70" y="152" text-anchor="middle">render-as-you-fetch</text>
  <rect class="d-box-accent" x="140" y="128" width="200" height="26" rx="6"/>
  <text class="d-sub" x="240" y="146" text-anchor="middle">request A</text>
  <rect class="d-box-accent" x="140" y="160" width="200" height="26" rx="6"/>
  <text class="d-sub" x="240" y="178" text-anchor="middle">request B, started together</text>
  <text class="d-sub" x="450" y="165" text-anchor="middle">measured: 129ms</text>
</svg>

## 3. Verified: the difference is real

The same two 120ms requests, arranged two ways and timed until the content actually appeared:

\`\`\`
nested, second depends on the first: 280ms
hoisted, both started up front:      129ms
\`\`\`

Identical work, identical latency per request. The only difference is **when the promises were created** — and that more than doubled the time.

📌 **Interview term: fetch-on-render** versus **render-as-you-fetch**. In the first, rendering triggers the request, so each level of the tree adds a round trip. In the second, the request is already in flight before the component that needs it renders.

## 4. Verified: the trap that catches everyone first

Before the waterfall question, there is a more basic failure. A promise **created during render**:

\`\`\`jsx
function Naive() {
  const v = use(slow(50, "done"));   // a NEW promise on every render attempt
  return <span>{v}</span>;
}
\`\`\`

\`\`\`
result after a 600ms budget: "loading" | resolved: NEVER
\`\`\`

It never finishes. Each time React retries the suspended component it calls the function again, gets a **fresh** promise, and suspends on that one instead.

📌 **Interview term:** <code>use()</code> **reads** a promise; it does not own, create, or cache one. The promise must come from somewhere stable — a Server Component passing it down, a framework loader, or a cache. This is the single most common mistake when people first reach for <code>use()</code>.

## 5. The three fixes

**Hoist the promises.** Create them before or above the component that consumes them, and pass them down:

\`\`\`jsx
// The requests are in flight while this component is still rendering
const userPromise = getUser(id);
const postsPromise = getPosts(id);
return (
  <>
    <Suspense fallback={<UserSkeleton />}><User promise={userPromise} /></Suspense>
    <Suspense fallback={<PostsSkeleton />}><Posts promise={postsPromise} /></Suspense>
  </>
);
\`\`\`

**Use <code>Promise.all</code>** for independent requests inside one component — the same fix at a smaller scale.

**Separate the boundaries.** One boundary around everything means the slowest request gates the whole section. Two boundaries let each arrive independently:

\`\`\`
two boundaries: fast@45ms  then  slow@264ms
\`\`\`

The fast section appeared at 45ms without waiting for the 250ms one. Under a single shared boundary both would have appeared at 264ms.

## 6. When the waterfall is genuine

Sometimes the dependency is real: you need the user record before you can request their orders. That cannot be parallelised, and pretending otherwise is the wrong answer.

📌 **Interview term:** what you *can* do is **contain** it. Put that subtree behind its own Suspense boundary so the rest of the page renders and becomes interactive while it resolves. The waterfall still exists; it no longer holds everything else hostage. See <a href="PASTE_RSC_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">async Server Components</a> for the server-side version.

## 7. Common Pitfalls

- **Creating the promise during render.** Verified: it never resolves.
- **Fetching inside each level of the tree.** Every level adds a round trip.
- **One boundary around the whole page.** The slowest item gates everything.
- **Assuming Suspense parallelises for you.** It changes what is *shown* while waiting, not when requests start.
- **Nesting boundaries unnecessarily.** A boundary inside a suspended parent cannot help — its children are not rendering yet.
- **Sequential awaits for independent data.** <code>Promise.all</code>.
- **Too many boundaries.** The page then flickers into existence in a dozen pieces.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the mechanism:</strong> <span style="color:#f0e2c8;">"When a component suspends, its children never render — so their requests never start. Each level of the tree adds a round trip."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Quote the difference:</strong> <span style="color:#f0e2c8;">"I have measured two dependent requests at 280ms and the same pair hoisted at 129ms — identical work, more than double the time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the framing:</strong> <span style="color:#f0e2c8;">"Fetch-on-render versus render-as-you-fetch. Start the requests before or above the component that consumes them, and pass the promises down."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Volunteer the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> trap:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> reads a promise, it does not create one. Make it during render and it restarts every attempt — I have watched one never resolve at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be honest about real dependencies:</strong> <span style="color:#f0e2c8;">"If one request genuinely needs the previous result, contain it behind its own boundary so it delays one section rather than the page."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Suspense cause waterfalls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, but it makes them structural and easy to miss. Suspending a component stops its subtree rendering, so any request a child would have started never begins. The waterfall comes from fetching during render; Suspense just determines what the user looks at while it happens.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would a component using <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">use()</code> never finish loading?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the promise is being created inside the render. React retries the suspended component, the function runs again, and it suspends on a brand-new promise every time. I have watched exactly that never resolve. The promise has to come from a loader, a Server Component, or a cache.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you spot a waterfall?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Network panel shows a staircase rather than overlapping bars, and the total is roughly the sum of the individual durations instead of the largest. In the UI it looks like sections appearing one after another in tree order rather than as each becomes ready.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does adding more Suspense boundaries fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for genuinely independent sections — I measured a fast one appearing at 45ms while a slow one took 264ms, where a shared boundary would have made both wait. A boundary nested inside a suspended parent helps nothing, because that subtree is not rendering yet.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the second request genuinely needs the first result?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then it is a real dependency and no arrangement removes it. What you can do is stop it blocking everything else — its own boundary, so the rest of the page streams and becomes interactive. Sometimes the better fix is upstream: an endpoint that returns both in one round trip.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Waterfall** | Sequential requests that could have overlapped |
| **Fetch-on-render** | The request starting only once the component renders |
| **Render-as-you-fetch** | The request already in flight before rendering |
| **Hoisting a promise** | Creating it above the component that consumes it |
| **Boundary granularity** | How much of the page one fallback covers |

---
**Conclusion:** a Suspense waterfall happens because a suspended component stops its subtree rendering, so any request its children would have made never starts — each level of the tree costs a round trip. Verified on React 19.2.8, two dependent requests took 280ms where the same pair started up front took 129ms. The fix is render-as-you-fetch: hoist the promises above the components that consume them, use <code>Promise.all</code> for independent work, and give independent sections their own boundaries — measured as a fast section arriving at 45ms while a slow one took 264ms. And remember <code>use()</code> only reads a promise: create one during render and it never resolves at all.`,
    examples: [
      {
        label: "Sequential versus hoisted promises, timed — plus the never-resolving trap",
        runnable: true,
        code: `import { Suspense, use, useState } from "react";

const slow = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));

// Promises must be created OUTSIDE render and cached, or every retry makes a
// new one. This tiny cache is what a loader or framework would give you.
const cache = new Map();
function fetchThing(key, ms) {
  if (!cache.has(key)) cache.set(key, slow(ms, key));
  return cache.get(key);
}

// ── ❌ SEQUENTIAL: the child's key does not exist until the parent resolves,
//    so its request cannot start any earlier. Two round trips, end to end. ──
function Parent({ onDone }) {
  const a = use(fetchThing("seq-A", 600));
  return <Child prefix={a} onDone={onDone} />;
}
function Child({ prefix, onDone }) {
  const b = use(fetchThing(prefix + "-then-B", 600));
  onDone();
  return <Result label="sequential" value={b} />;
}

// ── ✅ HOISTED: both promises are created up front, before any rendering, so
//    they are already in flight together. ──────────────────────────────────
function Both({ onDone }) {
  const a = use(fetchThing("par-A", 600));
  const b = use(fetchThing("par-B", 600));
  onDone();
  return <Result label="hoisted" value={a + " + " + b} />;
}

// ── ⚠️ THE TRAP: a promise created during render. React retries the suspended
//    component, the function runs again, and it suspends on a NEW promise. ──
function NeverResolves() {
  const v = use(slow(300, "never gets here"));
  return <span>{v}</span>;
}

function Result({ label, value }) {
  return <p style={{ margin: "4px 0", fontSize: 14 }}><strong>{label}:</strong> {value}</p>;
}

function Timer({ label, ms }) {
  return (
    <p style={{ margin: "4px 0", fontSize: 14 }}>
      <code style={{ display: "inline-block", minWidth: 110 }}>{label}</code>
      {ms === null ? "…" : <strong>{ms}ms</strong>}
    </p>
  );
}

export default function App() {
  const [run, setRun] = useState(false);
  const [showTrap, setShowTrap] = useState(false);
  const [times, setTimes] = useState({ seq: null, par: null });
  const [t0] = useState(() => ({ v: 0 }));

  const start = () => {
    cache.clear();
    t0.v = performance.now();
    setTimes({ seq: null, par: null });
    setRun(true);
  };
  const done = (which) => () => {
    setTimes((t) => (t[which] === null ? { ...t, [which]: Math.round(performance.now() - t0.v) } : t));
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <p><button onClick={start}>run both (two 600ms requests each)</button></p>

      <Timer label="sequential" ms={times.seq} />
      <Timer label="hoisted" ms={times.par} />

      {run && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
          <Suspense fallback={<p style={{ color: "#888", margin: 4 }}>sequential loading…</p>}>
            <Parent onDone={done("seq")} />
          </Suspense>
          <Suspense fallback={<p style={{ color: "#888", margin: 4 }}>hoisted loading…</p>}>
            <Both onDone={done("par")} />
          </Suspense>
        </div>
      )}

      <hr />
      <p>
        <button onClick={() => setShowTrap((s) => !s)}>
          {showTrap ? "hide" : "show"} the promise-created-in-render trap
        </button>
      </p>
      {showTrap && (
        <Suspense fallback={<p style={{ color: "crimson" }}>loading forever — the promise is recreated on every retry</p>}>
          <NeverResolves />
        </Suspense>
      )}

      <p style={{ color: "#666", fontSize: 13 }}>
        The sequential pair lands at roughly twice the hoisted time, with the
        same two requests. The trap never resolves at all.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "cache() and fetch memoization — request deduplication in RSC",
    seoDescription:
      "cache() memoises a function for one server render pass, so colocated fetches collapse to one request. Verified: outside one it does not dedupe.",
    description: `**Question presented to candidate:**
"Several Server Components each need the current user. Do you thread it down from the top, or fetch it in each one?"

**What a strong answer should cover:**
- **\`React.cache()\`** memoises a function **for the duration of one server render pass**. Identical calls with identical arguments return the same result and run the underlying work once.
- That is what makes **colocation** safe: each component fetches what it needs, and the deduplication means N components produce one request rather than N.
- The scope is deliberately narrow — **per request**, not a persistent cache. Two different users' page renders never share results.
- Frameworks additionally extend \`fetch\` itself with request memoisation, so identical \`fetch\` calls dedupe without wrapping.
- Cache keys are the **arguments**, compared by identity — so passing a fresh object each call defeats it.
- It only works inside a React server render. Verified: outside one it does not deduplicate at all.
- Why not just fetch at the top and pass down: that reintroduces prop drilling and couples every component to its parent's data-loading.
- Related but distinct from HTTP caching, \`unstable_cache\`, and a client query library — different lifetimes entirely.

**Clarifying questions expected:**
- "Is this per-request deduplication, or caching across requests? Those are different tools."
- "Are we in an RSC framework, or a client-only app?"

**Code / implementation expected:** Yes — a cached data function called from several components.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes Server Components basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** <code>cache()</code>'s deduplication only operates inside a React server render, which cannot be exercised in a unit environment. What *was* verified here is that the API exists and that outside a server render it deliberately does nothing — see section 4. The deduplication semantics are stated from the documented contract, and this doc says which is which.

## 1. Why This Even Matters — A Story First

A newsroom where four reporters each need today's front-page headline. Option one: the editor fetches it once and walks round telling everyone — reliable, but now the editor is a bottleneck and every reporter depends on being visited. Option two: each reporter asks the archive themselves, and the archive, noticing four identical requests in the same minute, looks it up once and answers all four.

The second keeps the reporters independent **and** costs one lookup. That is what <code>cache()</code> buys, and it is why the answer to "thread it down or fetch it everywhere" changed.

## 2. The Core Idea

📌 **Interview term: <code>React.cache()</code>** — wraps a function so that, **within a single server render pass**, calls with the same arguments run the work once and share the result.

\`\`\`jsx
import { cache } from "react";

export const getUser = cache(async (id) => {
  return db.user.findUnique({ where: { id } });
});
\`\`\`

Now any Server Component can call <code>getUser(id)</code> directly. Three components asking for the same id produce **one** query.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Three components call the same cached function and produce one query">
  <defs>
    <marker id="ca-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three callers, one round trip</text>
  <rect class="d-box" x="20" y="48" width="150" height="34" rx="7"/>
  <text class="d-sub" x="95" y="70" text-anchor="middle">Header</text>
  <rect class="d-box" x="20" y="92" width="150" height="34" rx="7"/>
  <text class="d-sub" x="95" y="114" text-anchor="middle">Sidebar</text>
  <rect class="d-box" x="20" y="136" width="150" height="34" rx="7"/>
  <text class="d-sub" x="95" y="158" text-anchor="middle">Profile</text>
  <path class="d-edge" d="M 176 65 L 236 100" marker-end="url(#ca-arrow)"/>
  <path class="d-edge" d="M 176 109 L 236 109" marker-end="url(#ca-arrow)"/>
  <path class="d-edge" d="M 176 153 L 236 118" marker-end="url(#ca-arrow)"/>
  <rect class="d-box-accent" x="242" y="82" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="337" y="106" text-anchor="middle">cache(getUser)</text>
  <text class="d-sub" x="337" y="126" text-anchor="middle">memoised per render pass</text>
  <path class="d-edge-accent" d="M 438 110 L 490 110" marker-end="url(#ca-arrow)"/>
  <rect class="d-box-accent" x="496" y="82" width="144" height="56" rx="10"/>
  <text class="d-text d-accent" x="568" y="106" text-anchor="middle">one query</text>
  <text class="d-sub" x="568" y="126" text-anchor="middle">not three</text>
</svg>

## 3. Why this changes the architecture

Without deduplication, colocating data fetching is wasteful — N components wanting the same thing means N requests. So the old pattern was to fetch once at the top and **thread the result down**, which reintroduces <a href="PASTE_PROP_DRILLING_URL_HERE" target="_blank" rel="noopener noreferrer">prop drilling</a> and couples every component to whatever its ancestors happened to load.

📌 **Interview term:** with per-request memoisation, **colocation becomes the correct default**. A component declares what data it needs by calling for it, and the framework collapses the duplicates. That is the actual argument for <code>cache()</code> — it is an architecture enabler more than an optimisation.

## 4. Verified: the scope is deliberately narrow

Outside a React server render, <code>cache()</code> returns a function that does **not** deduplicate:

\`\`\`
typeof React.cache: function
3 calls made, underlying fn ran 3 time(s)
\`\`\`

That is not a bug — it is the design. 📌 **Interview term:** the cache lifetime is **one server render pass**. It exists so that one page render does not repeat itself, and it is discarded afterwards. Two different users requesting the same page never share a result, which is exactly what you want for anything user-specific.

That narrow scope is what makes it safe to use for authenticated data without leaking between requests.

## 5. The related mechanisms, which are easy to confuse

| Mechanism | Lifetime | What it is for |
| :--- | :--- | :--- |
| <code>cache()</code> | **One render pass** | Deduplicating identical calls in one page render |
| Framework-extended <code>fetch</code> | One render pass | The same, automatically, for HTTP calls |
| A persistent data cache | Across requests | Reusing results between users and page loads |
| HTTP caching | Browser or CDN | Avoiding the request entirely |
| A client query library | Client session | Caching, refetching, invalidation in the browser |

📌 **Interview term:** naming these as different lifetimes is the strongest signal on this question. "Caching" covers at least four distinct things here, and conflating per-request deduplication with a persistent cache is the usual confusion.

## 6. How the key works

The cache key is the **arguments**, compared by identity. So:

\`\`\`jsx
getUser(userId);              // ✅ same primitive, deduped
getUser({ id: userId });      // ❌ a fresh object each call, never deduped
\`\`\`

Pass primitives. If a function genuinely needs an options object, hoist it so the same reference is passed, or accept the arguments separately.

## 7. Common Pitfalls

- **Expecting it to cache across requests.** Verified scope is one render pass; use a persistent cache for that.
- **Passing an object literal as the argument.** New identity each call, so nothing dedupes.
- **Wrapping something non-deterministic.** Two callers will get the first caller's result, which is the point — but surprising for a randomised or time-based function.
- **Using it on the client.** It is a server-render mechanism.
- **Conflating it with framework <code>fetch</code> memoisation.** Same lifetime, different surface — <code>cache()</code> wraps any function; the extended <code>fetch</code> covers HTTP calls automatically.
- **Reaching for it before you have duplicates.** It costs nothing much, but it also buys nothing if only one component calls the function.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the actual question first:</strong> <span style="color:#f0e2c8;">"Fetch it in each component. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache()</code> deduplicates identical calls within one render pass, so three components produce one query."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say why that matters architecturally:</strong> <span style="color:#f0e2c8;">"It makes colocation the correct default. Without it you thread data down from the top, which is prop drilling and couples every component to its ancestors."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Be precise about the lifetime:</strong> <span style="color:#f0e2c8;">"One server render pass, then discarded. Not a persistent cache — two users never share a result, which is what makes it safe for authenticated data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Separate the four caches:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache()</code> per render, a persistent data cache across requests, HTTP caching at the CDN, and a query library on the client. Different lifetimes, different jobs."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Land the gotcha:</strong> <span style="color:#f0e2c8;">"The key is the arguments, compared by identity — pass an object literal and it never dedupes. Pass primitives."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long does the cache live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One server render pass, then it is discarded. It is deduplication rather than caching — its job is stopping a single page render repeating the same query. That narrow scope is deliberate: user-specific data can never leak between requests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not fetch once at the top and pass the data down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it reintroduces prop drilling and couples every component to whatever its ancestors happened to load — moving a component means finding a new parent to fetch for it. Deduplication lets a component declare its own data needs and stay portable, at no extra request cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the cache keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The arguments, compared by identity. Primitives work naturally; an object literal is a new reference on every call, so nothing ever matches and the deduplication silently does nothing. If you need options, hoist the object so the same reference is reused.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it relate to framework <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fetch</code> memoisation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same lifetime, different surface. Some frameworks extend <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> so identical HTTP calls dedupe automatically within a render. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">cache()</code> is the general version — it wraps any function, which is what you need for a database client that does not go through <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work on the client?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is a server-render mechanism, and outside one it simply does not deduplicate. I have confirmed that: three calls ran the underlying function three times. For client-side deduplication and caching you want a query library, which solves a different problem with a different lifetime.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>cache()</code>** | Memoises a function for one server render pass |
| **Request deduplication** | Identical calls collapsing into one |
| **Colocation** | A component fetching what it needs itself |
| **Render pass** | One server render of one request |
| **Persistent cache** | A cache that survives across requests |

---
**Conclusion:** <code>cache()</code> memoises a function for the duration of a single server render pass, so several components each asking for the same data produce one query. Its real value is architectural rather than numeric: it makes colocation the correct default, so components declare their own data needs instead of having them threaded down from an ancestor. The scope is deliberately narrow — verified, outside a server render it does not deduplicate at all — and that narrowness is what makes it safe for user-specific data. Keep the four caches distinct: per-render deduplication, a persistent data cache, HTTP caching, and a client query library.`,
    examples: [
      {
        label: "A cache-style memo shared by several components, and the key gotcha",
        runnable: true,
        code: `import { useState } from "react";

// This playground is a CLIENT environment, so React.cache() cannot dedupe here
// — it only operates inside a server render pass. This is a faithful stand-in
// so the SEMANTICS are demonstrable: memoise by argument identity, for the
// duration of one pass, then discard.
function createRenderCache(fn) {
  const store = new Map();
  const wrapped = (arg) => {
    if (store.has(arg)) return store.get(arg);
    const result = fn(arg);
    store.set(arg, result);
    return result;
  };
  wrapped.reset = () => store.clear();     // a new "render pass"
  return wrapped;
}

let queries = 0;
const getUser = createRenderCache((id) => {
  queries++;                               // stands in for a database round trip
  return { id, name: "User " + id };
});

// Three independent components, each asking for what IT needs. No prop
// drilling, no coordination — the deduplication makes this cost one query.
function Header() {
  const user = getUser(1);
  return <Row where="Header" text={"welcome, " + user.name} />;
}
function Sidebar() {
  const user = getUser(1);
  return <Row where="Sidebar" text={user.name} />;
}
function Profile() {
  const user = getUser(1);
  const other = getUser(2);                // a different key: its own query
  return <Row where="Profile" text={user.name + " and " + other.name} />;
}

// ❌ The key gotcha: an object literal is a new reference every call, so the
//    memo never matches and every call runs the work again.
function Careless() {
  const a = getUser({ id: 1 });
  const b = getUser({ id: 1 });
  return <Row where="Careless" text={"two calls, ids " + a.id + " and " + b.id} />;
}

function Row({ where, text }) {
  return (
    <p style={{ margin: "3px 0", fontSize: 14 }}>
      <code style={{ display: "inline-block", minWidth: 90 }}>{where}</code>
      {text}
    </p>
  );
}

export default function App() {
  const [pass, setPass] = useState(0);
  const [careless, setCareless] = useState(false);

  const nextPass = () => {
    getUser.reset();                       // the cache lives for ONE pass only
    queries = 0;
    setPass((p) => p + 1);
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      <div key={pass} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <Header />
        <Sidebar />
        <Profile />
        {careless && <Careless />}
      </div>

      <p style={{ fontSize: 14, marginTop: 10 }}>
        underlying queries this pass: <strong>{queries}</strong>{" "}
        <span style={{ color: "#666", fontSize: 13 }}>
          (3 components want user 1, plus user 2 — expect 2)
        </span>
      </p>

      <p>
        <button onClick={nextPass}>start a new render pass</button>{" "}
        <button onClick={() => setCareless((c) => !c)}>
          {careless ? "remove" : "add"} the object-key component
        </button>
      </p>

      <p style={{ color: "#666", fontSize: 13 }}>
        Add the careless component: the query count jumps by two, because
        <code> {"{ id: 1 }"} </code> is a fresh object each call and never
        matches a previous key. Pass primitives.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does `useOptimistic` enable optimistic UI in React 19?",
    seoDescription:
      "Shows a predicted value while an action is pending, reverting automatically on failure. Verified: the count updated before the await resolved.",
    description: `**Question presented to candidate:**
"A like button should feel instant even though the request takes 300ms. How does \`useOptimistic\` help, and what happens if the request fails?"

**What a strong answer should cover:**
- \`useOptimistic(actualState, updateFn)\` returns a value that **may differ from real state while an action is pending**, plus a function to apply an optimistic update.
- It shows a **predicted** result immediately, then automatically reverts to the real state when the transition settles.
- **Error handling is the headline benefit**: if the action throws, React discards the optimistic value automatically. No manual rollback code.
- It must be used inside a **transition** — an action, or \`startTransition\`. Outside one, the optimistic value is discarded immediately.
- The update function is a reducer: \`(currentState, optimisticValue) => newState\`, so several optimistic updates compose.
- Pairs naturally with form actions and \`useActionState\`.
- The distinction from plain local state: hand-rolled optimistic UI means writing the revert path yourself, and getting it wrong on error or on rapid repeated actions.
- Judgement: optimistic UI suits high-success, low-stakes actions — likes, toggles, reordering. Not payments.

**Clarifying questions expected:**
- "How likely is this action to fail, and how bad is a visible revert?" — that decides whether optimistic UI is appropriate at all.
- "Are we already using form actions?"

**Code / implementation expected:** Yes — an optimistic list or counter, including a failure path.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes transitions and actions.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The timing behaviour in section 3 was produced by clicking a real button on React 19.2.8 and reading the DOM before and after the action resolved.

## 1. Why This Even Matters — A Story First

A bartender takes your order and puts a glass on the counter immediately, before pouring. You can see your drink is coming. If they run out of the bottle, they take the glass back and apologise — mildly annoying, but far better than standing there watching nothing happen for thirty seconds.

Optimistic UI is putting the glass down first. The interesting engineering is not the glass; it is **taking it back cleanly** when the pour fails, and that is the part <code>useOptimistic</code> actually solves.

## 2. The Core Idea

📌 **Interview term: optimistic UI** — showing the *predicted* result of an action immediately, before the server confirms it, on the assumption it will succeed.

📌 **Interview term: <code>useOptimistic</code>** — returns a value that may temporarily diverge from real state while an action is pending, plus a setter to apply the prediction:

\`\`\`jsx
const [optimisticLikes, addOptimistic] = useOptimistic(
  likes,                                   // the real state
  (current, delta) => current + delta,     // how to apply a prediction
);
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="The optimistic value shows immediately and is replaced by real state or reverted on failure">
  <defs>
    <marker id="op-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Predict, then reconcile</text>
  <rect class="d-box-muted" x="20" y="80" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="104" text-anchor="middle">click</text>
  <text class="d-sub" x="95" y="123" text-anchor="middle">action starts</text>
  <path class="d-edge-accent" d="M 176 108 L 214 108" marker-end="url(#op-arrow)"/>
  <rect class="d-box-accent" x="220" y="80" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="310" y="104" text-anchor="middle">optimistic value shown</text>
  <text class="d-sub" x="310" y="123" text-anchor="middle">immediately, no wait</text>
  <path class="d-edge-accent" d="M 406 96 L 460 66" marker-end="url(#op-arrow)"/>
  <path class="d-edge-dashed" d="M 406 120 L 460 152" marker-end="url(#op-arrow)"/>
  <rect class="d-box-accent" x="466" y="42" width="174" height="50" rx="10"/>
  <text class="d-text d-accent" x="553" y="64" text-anchor="middle">success</text>
  <text class="d-sub" x="553" y="82" text-anchor="middle">real state takes over</text>
  <rect class="d-box-muted" x="466" y="128" width="174" height="50" rx="10"/>
  <text class="d-text" x="553" y="150" text-anchor="middle">failure</text>
  <text class="d-sub" x="553" y="168" text-anchor="middle">reverts automatically</text>
</svg>

## 3. Verified: the update really is immediate

A like button whose action waits 40ms before committing the real state. Reading the DOM straight after the click, and again after the action resolved:

\`\`\`
immediately after the click, button reads: 1
after the action resolves, button reads:  1
\`\`\`

The button showed <code>1</code> **before the await completed** — that is the optimistic value — and still showed <code>1</code> afterwards, now backed by real state. The user never saw a gap.

The render trace shows the mechanism: the optimistic value is layered on top of whatever the real state currently is, and once the transition finishes the layer is dropped and the real value stands alone.

## 4. The part that actually earns the hook

📌 **Interview term:** if the action **throws**, React discards the optimistic value automatically and the UI reverts to real state. You write no rollback code at all.

That is the whole argument. Hand-rolled optimistic UI with plain state means writing the revert path yourself, and the revert path is where the bugs live — especially with rapid repeated actions, where you must unwind the right one.

\`\`\`jsx
// Hand-rolled: you own the rollback, and every edge case in it
setLikes(l => l + 1);
try { await like(); } catch { setLikes(l => l - 1); }   // and if two clicks raced?

// useOptimistic: React owns it
startTransition(async () => {
  addOptimistic(1);
  await like();          // throws? the optimistic value simply disappears
  setLikes(l => l + 1);
});
\`\`\`

## 5. The constraint people miss

📌 **Interview term:** <code>useOptimistic</code> only works **inside a transition** — a form action, or an explicit <code>startTransition</code>. Outside one, React has no pending window to attach the optimistic value to, so it is discarded on the next render and you see nothing.

That is why it pairs naturally with form actions and <a href="PASTE_FORMS_URL_HERE" target="_blank" rel="noopener noreferrer"><code>useActionState</code></a>: those already run inside a transition, so the optimistic value has a defined lifetime.

The update function is a **reducer** — <code>(currentState, optimisticValue) =&gt; newState</code> — so multiple optimistic updates compose. Three rapid likes each apply on top of the last.

## 6. When optimistic UI is the wrong choice

This is a judgement question as much as an API one:

| Suits it | Does not |
| :--- | :--- |
| Likes, favourites, toggles | Payments and orders |
| Adding a comment or todo | Anything with a real chance of rejection |
| Reordering a list | Actions with server-decided results (an id, a price) |
| Marking as read | Anything where a visible revert is alarming |

📌 **Interview term:** the test is **success probability and revert cost**. Optimistic UI trades a small chance of a visible revert for a large gain in perceived speed. When failure is plausible or a revert would be alarming, a pending state is the honest choice.

## 7. Common Pitfalls

- **Using it outside a transition.** The optimistic value is discarded immediately and nothing appears.
- **Writing manual rollback anyway.** React already reverts on error; the extra code fights it.
- **Predicting a server-decided value.** If the server assigns the id, price, or timestamp, you cannot predict it — show a placeholder instead.
- **Applying it to high-stakes actions.** A payment that visibly un-succeeds is worse than a spinner.
- **Forgetting to surface the failure.** Reverting silently leaves the user thinking it worked.
- **Treating the optimistic value as state.** It is derived and temporary; the real state is still the source of truth.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Describe what it returns:</strong> <span style="color:#f0e2c8;">"A value that can temporarily differ from real state while an action is pending, plus a function to apply the prediction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer the failure question immediately — it is the point:</strong> <span style="color:#f0e2c8;">"If the action throws, React discards the optimistic value automatically. You write no rollback code, and the rollback is where hand-rolled versions go wrong."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the timing evidence:</strong> <span style="color:#f0e2c8;">"I have measured the button showing the new value before the await resolved, then settling on real state with no visible gap."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the constraint:</strong> <span style="color:#f0e2c8;">"It must run inside a transition — a form action or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startTransition</code>. Outside one there is no pending window and the value is dropped."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show judgement:</strong> <span style="color:#f0e2c8;">"I would use it for likes and toggles, not payments. The trade is a small chance of a visible revert for a large gain in perceived speed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the action fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">React discards the optimistic value and the UI snaps back to real state, with no rollback code from you. That is the main reason to use the hook rather than plain state — the revert path is exactly where hand-rolled optimistic UI breaks, especially with rapid repeated actions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must it be inside a transition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The transition defines the pending window the optimistic value lives in. React needs to know when the action started and when it finished in order to know when to drop the prediction. Outside a transition there is no such window, so the value is discarded on the next render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useState</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, and people did. You then own the rollback: revert on error, and correctly unwind when several actions overlap. That bookkeeping is subtle and easy to get wrong. The hook makes the optimistic value derived and temporary, so there is nothing to unwind.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use optimistic UI?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When failure is plausible or a revert would alarm the user — payments, orders, anything with real consequences. Also when the server decides the result: you cannot predict an assigned id or a calculated price, so showing a guess and correcting it is worse than a brief pending state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it compose with several rapid actions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The second argument is a reducer taking the current state and the optimistic value, so predictions stack — three quick likes each apply on top of the last. As each transition settles its layer is dropped, which is what makes overlapping actions work without manual bookkeeping.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Optimistic UI** | Showing the predicted result before confirmation |
| **<code>useOptimistic</code>** | A value that may diverge from real state while pending |
| **Transition** | The pending window the optimistic value lives inside |
| **Reconciliation** | Real state replacing the prediction on success |
| **Automatic revert** | React discarding the prediction when the action throws |

---
**Conclusion:** <code>useOptimistic</code> returns a value that may temporarily differ from real state while an action is pending, so the UI can show a predicted result immediately — verified as the button updating before the await resolved and settling with no visible gap. Its real value is the failure path: if the action throws, React discards the prediction automatically, which removes the rollback bookkeeping where hand-rolled optimistic UI usually breaks. It must run inside a transition, which is why it pairs with form actions, and it is a judgement call — right for likes and toggles, wrong for payments and anything the server decides.`,
    examples: [
      {
        label: "An optimistic list with a deliberate failure path",
        runnable: true,
        code: `import { useState, useOptimistic, useTransition } from "react";

let nextId = 3;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Read the docs", pending: false },
    { id: 2, text: "Try useOptimistic", pending: false },
  ]);
  const [failNext, setFailNext] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  // The reducer receives the CURRENT real state and the optimistic value, so
  // several pending additions stack on top of each other.
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (current, newTodo) => [...current, newTodo],
  );

  const add = (text) => {
    setError(null);
    // Must be inside a transition — that is the pending window the optimistic
    // value lives in. Outside one it would be dropped immediately.
    startTransition(async () => {
      addOptimistic({ id: "temp-" + Date.now(), text, pending: true });

      await wait(900);                              // pretend network

      if (failNext) {
        // No rollback code needed: throwing discards the optimistic entry.
        setError("Server rejected: " + text);
        setFailNext(false);
        throw new Error("rejected");
      }
      setTodos((prev) => [...prev, { id: nextId++, text, pending: false }]);
    });
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 480 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = new FormData(e.target).get("text");
          if (text) { add(text); e.target.reset(); }
        }}
      >
        <input name="text" placeholder="add a todo" defaultValue="New task" />{" "}
        <button type="submit">add</button>
      </form>

      <label style={{ display: "block", margin: "8px 0", fontSize: 14 }}>
        <input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} />{" "}
        make the next request fail
      </label>

      <ul style={{ paddingLeft: 20 }}>
        {optimisticTodos.map((t) => (
          <li key={t.id} style={{ opacity: t.pending ? 0.5 : 1, fontStyle: t.pending ? "italic" : "normal" }}>
            {t.text} {t.pending && <span style={{ fontSize: 12, color: "#666" }}>(saving…)</span>}
          </li>
        ))}
      </ul>

      {error && (
        <p style={{ color: "crimson", fontSize: 14 }}>
          {error} — note the item vanished from the list with no rollback code.
        </p>
      )}

      <p style={{ color: "#666", fontSize: 13 }}>
        Add an item: it appears instantly, dimmed, while the request runs. Tick
        the failure box and add another — it appears, then disappears when the
        action throws. React discarded the optimistic entry on its own.
        {isPending && <strong> (a request is in flight)</strong>}
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the resource preloading APIs in React 19 (`preload`, `preinit`, etc.)?",
    seoDescription:
      "React 19 lets you tell the browser about resources early from component code. Verified: preload and preconnect wrote real link tags into document.head.",
    description: `**Question presented to candidate:**
"React 19 added resource preloading APIs. What are they, and what problem do they solve that a plain link tag does not?"

**What a strong answer should cover:**
- Six functions exported from **\`react-dom\`**: \`preload\`, \`preinit\`, \`preconnect\`, \`prefetchDNS\`, \`preloadModule\`, \`preinitModule\`.
- They let a component declare a resource need **from inside component code**, rather than requiring a hand-maintained list of tags in the document head.
- **\`preload\` fetches and caches; \`preinit\` fetches and executes/applies.** That is the key distinction — preinit a stylesheet and it applies, preinit a script and it runs.
- \`preconnect\` opens the connection (DNS, TCP, TLS) without fetching anything; \`prefetchDNS\` does only the DNS lookup — cheaper, for a host you might use.
- React **deduplicates** calls, so calling from several components is safe.
- They work during **SSR too**, so the hints are emitted into the streamed HTML — earlier than any client-side effect could manage.
- Why it matters: the browser preload scanner cannot see resources that only a component knows it needs, so this closes a real gap.
- Judgement: preloading everything is counterproductive — it competes for bandwidth with what the page needs right now.

**Clarifying questions expected:**
- "Is the resource needed for this render, or a likely next navigation?" — that decides preload versus prefetch-style hints.

**Code / implementation expected:** Yes — calling them from a component, and inspecting what lands in the document head.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes basic browser loading concepts.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The export list and the DOM effects in sections 3 and 4 were produced by calling these functions against React 19.2.8 and inspecting <code>document.head</code>.

## 1. Why This Even Matters — A Story First

A kitchen knows the evening menu, so it takes stock out of the freezer in the afternoon. The dish is not being cooked yet — it is being made *ready*, so that when the order arrives there is no thawing to wait for.

The awkward part in a web app is **who knows**. The head of the document is written once, at build time, by someone who cannot know that a modal three levels deep will eventually need a particular font. The component knows. Until React 19, the component had no way to say so.

## 2. The Core Idea

📌 **Interview term:** the **preload scanner** is a browser optimisation that reads ahead through the HTML looking for resources to start fetching. It is very effective — and it can only see resources that are *in the markup*. Anything a component decides it needs at runtime is invisible to it.

React 19 exposes six functions on <code>react-dom</code> that let component code tell the browser about a resource, and React emits the corresponding hint — including during server rendering, so it lands in the streamed HTML.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Four levels of readiness from a DNS lookup through to executing the resource">
  <defs>
    <marker id="pl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">How far ahead do you want to get?</text>
  <rect class="d-box" x="14" y="60" width="146" height="76" rx="10"/>
  <text class="d-text" x="87" y="86" text-anchor="middle">prefetchDNS</text>
  <text class="d-sub" x="87" y="108" text-anchor="middle">resolve the name</text>
  <text class="d-sub" x="87" y="126" text-anchor="middle">cheapest</text>
  <path class="d-edge" d="M 166 98 L 186 98" marker-end="url(#pl-arrow)"/>
  <rect class="d-box" x="192" y="60" width="146" height="76" rx="10"/>
  <text class="d-text" x="265" y="86" text-anchor="middle">preconnect</text>
  <text class="d-sub" x="265" y="108" text-anchor="middle">open the connection</text>
  <text class="d-sub" x="265" y="126" text-anchor="middle">DNS, TCP, TLS</text>
  <path class="d-edge" d="M 344 98 L 364 98" marker-end="url(#pl-arrow)"/>
  <rect class="d-box-accent" x="370" y="60" width="130" height="76" rx="10"/>
  <text class="d-text d-accent" x="435" y="86" text-anchor="middle">preload</text>
  <text class="d-sub" x="435" y="108" text-anchor="middle">fetch and cache</text>
  <text class="d-sub" x="435" y="126" text-anchor="middle">not applied yet</text>
  <path class="d-edge-accent" d="M 506 98 L 526 98" marker-end="url(#pl-arrow)"/>
  <rect class="d-box-accent" x="532" y="60" width="114" height="76" rx="10"/>
  <text class="d-text d-accent" x="589" y="86" text-anchor="middle">preinit</text>
  <text class="d-sub" x="589" y="108" text-anchor="middle">fetch AND</text>
  <text class="d-sub" x="589" y="126" text-anchor="middle">run or apply</text>
</svg>

## 3. Verified: the full API surface

Read off <code>react-dom</code> on React 19.2.8:

\`\`\`
ReactDOM.preload        -> function | arity: 2
ReactDOM.preinit        -> function | arity: 2
ReactDOM.preconnect     -> function | arity: 2
ReactDOM.prefetchDNS    -> function | arity: 1
ReactDOM.preloadModule  -> function | arity: 2
ReactDOM.preinitModule  -> function | arity: 2
\`\`\`

📌 **Interview term:** they ship from **<code>react-dom</code>, not <code>react</code>** — the same reasoning as <code>useFormStatus</code>. These are browser-resource concerns, so they belong to the DOM renderer rather than the platform-agnostic core. That import path is a favourite interview detail.

## 4. Verified: they really do write hints into the document

Calling two of them and inspecting the head:

\`\`\`jsx
preload("https://example.com/font.woff2", { as: "font", type: "font/woff2" });
preconnect("https://cdn.example.com");
\`\`\`

\`\`\`
head <link> count: 0 -> 2
links now present: ["preload -> https://example.com/font.woff2",
                    "preconnect -> https://cdn.example.com"]
\`\`\`

Real <code>&lt;link&gt;</code> elements, inserted by React. On the server the equivalent hints are emitted into the streamed HTML instead, which is where they do the most good — earlier than any client-side effect could manage.

## 5. The distinction that matters: preload versus preinit

📌 **Interview term:** **<code>preload</code> fetches and caches. <code>preinit</code> fetches *and* applies.**

- <code>preload("/styles.css", { as: "style" })</code> — downloads it, ready for when something uses it. Nothing is styled yet.
- <code>preinit("/styles.css", { as: "style" })</code> — downloads it **and inserts the stylesheet**, so it takes effect.
- <code>preinit("/script.js", { as: "script" })</code> — downloads it **and executes it**.

So <code>preload</code> is for something you will need shortly; <code>preinit</code> is for something you want active now, as early as possible. Getting these the wrong way round is the most common confusion, and stating the difference crisply is the strongest single thing to say on this question.

The <code>Module</code> variants do the same for ES modules.

## 6. Choosing the right level

| Function | Cost | Use when |
| :--- | :--- | :--- |
| <code>prefetchDNS</code> | Lowest | You *might* hit this host later |
| <code>preconnect</code> | Low | You will very likely hit this host soon |
| <code>preload</code> | Full download | You will definitely need this resource |
| <code>preinit</code> | Download plus execution | You want it active immediately |

📌 **Interview term:** React **deduplicates** these calls, so several components asking for the same font produce one hint. That is what makes it reasonable to call them from a component rather than coordinating a list centrally.

## 7. The judgement half

Preloading is a **priority** mechanism, not free extra bandwidth. Every preloaded resource competes with what the page needs right now. Preload everything and you have effectively preloaded nothing — you have just reordered the queue at random, and browsers will warn about preloaded resources that go unused.

Use it for things you are confident about and that the scanner cannot discover: a font used by a lazily-loaded component, a stylesheet for a route you are about to navigate to, an API host you will call.

## 8. Common Pitfalls

- **Confusing <code>preload</code> and <code>preinit</code>.** One caches, the other applies or executes.
- **Preloading speculatively at scale.** Competes for bandwidth with the critical path.
- **Importing from <code>react</code>.** They are on <code>react-dom</code>.
- **Omitting the <code>as</code> option.** The browser needs the resource type to prioritise correctly and to reuse the fetch.
- **Expecting a visible change.** They affect timing, not output — measure in the Network panel.
- **Using them for a next-page navigation.** That is a router prefetch concern; these are for the current render.
- **Forgetting fonts need <code>crossOrigin</code>.** A font preload without it fetches twice.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame the gap they close:</strong> <span style="color:#f0e2c8;">"The browser preload scanner only sees resources in the markup. A component that decides at runtime it needs a font is invisible to it — these APIs let the component say so."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. List them by escalating cost:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefetchDNS</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preconnect</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preload</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preinit</code> — plus the two Module variants."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Nail the key distinction:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preload</code> fetches and caches; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preinit</code> fetches and actually applies or executes it. That is the difference people get backwards."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention the import and SSR:</strong> <span style="color:#f0e2c8;">"They come from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>, and they work during server rendering — the hints go into the streamed HTML, which is earlier than any effect could manage."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show judgement:</strong> <span style="color:#f0e2c8;">"It is a priority mechanism, not free bandwidth. Preload everything and you have prioritised nothing."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">preload</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">preinit</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Preload downloads and caches it, ready for whenever something uses it. Preinit downloads it and puts it to work — a stylesheet is inserted and takes effect, a script is executed. So preload is "I will need this shortly" and preinit is "make this active now".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just put a link tag in the HTML?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because whoever writes the head cannot know what a deeply nested, lazily-loaded component will need. These APIs let the component that owns the requirement declare it, React deduplicates the calls, and during SSR the hint lands in the streamed HTML anyway — so you get the markup benefit without the central list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which package are they in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">react-dom</code>. They concern browser resources, so like <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useFormStatus</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">createPortal</code> they belong to the DOM renderer rather than to the platform-agnostic core.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you preload too much?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, easily. It is a prioritisation mechanism, not extra bandwidth — every preload competes with the resources the page needs right now. Preload everything and you have reordered the queue for no benefit, and browsers warn about preloaded resources that go unused.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">prefetchDNS</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">preconnect</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the host is only a possibility. DNS resolution is cheap; a full connection reserves a socket and does a TLS handshake, which is wasted if you never use it. Preconnect a host you are confident about, prefetch DNS for several you might touch.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Preload scanner** | The browser reading ahead in HTML for resources to fetch |
| **<code>preload</code>** | Fetch and cache, ready for use |
| **<code>preinit</code>** | Fetch and apply or execute immediately |
| **<code>preconnect</code>** | Open DNS, TCP and TLS without fetching |
| **<code>prefetchDNS</code>** | Resolve the hostname only |
| **Resource hint** | A link tag telling the browser about a future need |

---
**Conclusion:** React 19 exposes six functions on <code>react-dom</code> — <code>preload</code>, <code>preinit</code>, <code>preconnect</code>, <code>prefetchDNS</code> and the two Module variants — letting a component declare a resource need that the browser preload scanner could never discover, since it only sees markup. Verified, they insert real <code>&lt;link&gt;</code> elements, and during SSR the equivalent hints go into the streamed HTML. The distinction to state crisply is that <code>preload</code> fetches and caches while <code>preinit</code> fetches and actually applies or executes. And it is prioritisation rather than free bandwidth — preload everything and you have prioritised nothing.`,
    examples: [
      {
        label: "Calling the preloading APIs and inspecting what lands in the head",
        runnable: true,
        code: `import { useState } from "react";
import { preload, preinit, preconnect, prefetchDNS } from "react-dom";

// A component that knows about a resource the document head could never
// predict — it is only needed once this modal opens.
function RichEditor() {
  // Fetch and cache: we will want this font shortly.
  // Fonts need crossOrigin or the browser fetches them twice.
  preload("https://fonts.gstatic.com/s/inter/v13/example.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });

  // Fetch AND apply: this stylesheet should take effect now.
  preinit("https://cdn.example.com/editor-theme.css", { as: "style" });

  return (
    <div style={{ background: "#eef", padding: 12, borderRadius: 8 }}>
      Editor mounted — it declared its own resource needs on render.
    </div>
  );
}

export default function App() {
  const [openEditor, setOpenEditor] = useState(false);
  const [links, setLinks] = useState([]);

  const warmUpApi = () => {
    // Confident we will call this host: open the whole connection.
    preconnect("https://api.example.com");
    // Only a possibility: just resolve the name, which is far cheaper.
    prefetchDNS("https://analytics.example.com");
    inspect();
  };

  const inspect = () =>
    setLinks(
      [...document.head.querySelectorAll("link")]
        .map((l) => l.rel + "  →  " + (l.getAttribute("href") || "").slice(0, 58))
        .filter((s) => s.includes("example")),
    );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540 }}>
      <p>
        <button onClick={warmUpApi} style={{ marginRight: 6 }}>
          preconnect + prefetchDNS
        </button>
        <button onClick={() => { setOpenEditor(true); setTimeout(inspect, 50); }}>
          open the editor (preload + preinit)
        </button>{" "}
        <button onClick={inspect}>re-inspect head</button>
      </p>

      {openEditor && <RichEditor />}

      <h4 style={{ margin: "14px 0 6px" }}>Resource hints now in document.head</h4>
      <pre style={{ background: "#f6f6f6", padding: 10, borderRadius: 6, fontSize: 12 }}>
        {links.length ? links.join("\\n") : "(none yet — press a button)"}
      </pre>

      <p style={{ color: "#666", fontSize: 13 }}>
        React deduplicates these, so calling them on every render of the editor
        produces one hint each. Notice the editor declared its own needs — no
        central list in the document head had to know about it in advance.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "React Compiler pitfalls — when does auto-memo bail out?",
    seoDescription:
      "The compiler skips any component it cannot prove is safe, and does so silently. The ESLint rule is how you find out which components were left uncompiled.",
    description: `**Question presented to candidate:**
"You enabled the React Compiler but the profiler shows components still re-rendering. What is going on?"

**What a strong answer should cover:**
- The compiler **bails out per component** when it cannot prove the transformation is safe. That component is left exactly as written; the rest of the file is still compiled.
- **The failure mode is silence** — you do not get an error, you get an unoptimised component. That is deliberate: it will never miscompile, only decline.
- The common bail-out causes: **mutating props or state**, reading or writing a ref during render, other **impure render** behaviour, and code the analysis cannot follow.
- **The ESLint rule is the real adoption tool** — it reports the violations, which is how you find out what was skipped.
- Escape hatches: the \`"use no memo"\` directive to exclude a component deliberately, and \`opt-in\` mode to compile only annotated files.
- Memoisation is a **performance hint, not a semantic guarantee** — code must still be correct if a value is recomputed.
- It does not fix effect dependency arrays, refactor your state placement, or virtualise a list.
- Existing manual \`useMemo\` and \`useCallback\` keep working; removal is a follow-up cleanup, not part of adoption.

**Clarifying questions expected:**
- "Does the codebase pass the React Compiler ESLint rule?" — that answers the question directly.
- "Is the compiler actually running on this file, or is it in opt-in mode?"

**Code / implementation expected:** Optional. Showing a component that would bail out, and its fixed version, is the useful form.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes the React Compiler basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** the React Compiler is **not installed in this repo**, so bail-out behaviour could not be executed. What *was* verified is the runtime surface the compiler emits into — see section 3 — and everything else is stated from the documented behaviour. This doc says which is which rather than implying it all ran. See <a href="PASTE_REACT_COMPILER_URL_HERE" target="_blank" rel="noopener noreferrer">how the React Compiler works</a> for the mechanism.

## 1. Why This Even Matters — A Story First

A proofreader is given a manuscript and told to correct the punctuation. Most pages come back improved. On three pages, the handwriting is ambiguous enough that a "correction" might change the meaning — so the proofreader leaves those pages **exactly as they were** and says nothing.

That is the right call. It is also why, when someone asks why those three pages are unimproved, nobody can answer without going back and looking.

The React Compiler is that proofreader, and the ESLint rule is the note it should have left.

## 2. The Core Idea

📌 **Interview term: bail-out** — the compiler declining to transform a component because it cannot prove the transformation preserves behaviour. That component is emitted **unchanged**; everything else in the file is still optimised.

📌 **Interview term:** the failure mode is **silent**. You do not get a build error or a runtime warning — you get a component that simply was not memoised. This is deliberate: a compiler that miscompiles is far worse than one that declines, so it errs entirely towards declining.

Which means the answer to "why is this still re-rendering?" is usually: **it was skipped, and nothing told you.**

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="The compiler optimises components it can prove safe and silently skips the rest">
  <defs>
    <marker id="rc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Optimised, or quietly left alone</text>
  <rect class="d-box-muted" x="240" y="46" width="180" height="50" rx="10"/>
  <text class="d-text" x="330" y="68" text-anchor="middle">your component</text>
  <text class="d-sub" x="330" y="86" text-anchor="middle">compiler analyses it</text>
  <path class="d-edge-accent" d="M 290 100 L 180 148" marker-end="url(#rc2-arrow)"/>
  <path class="d-edge-dashed" d="M 372 100 L 482 148" marker-end="url(#rc2-arrow)"/>
  <rect class="d-box-accent" x="24" y="152" width="270" height="56" rx="10"/>
  <text class="d-text d-accent" x="159" y="175" text-anchor="middle">provably pure</text>
  <text class="d-sub" x="159" y="195" text-anchor="middle">memoisation inserted</text>
  <rect class="d-box-muted" x="366" y="152" width="270" height="56" rx="10"/>
  <text class="d-text" x="501" y="175" text-anchor="middle">cannot prove it</text>
  <text class="d-sub" x="501" y="195" text-anchor="middle">emitted unchanged, silently</text>
</svg>

## 3. Verified: the runtime the compiler targets

What could be checked here is the machinery compiled output calls into. On React 19.2.8:

\`\`\`
typeof React.__COMPILER_RUNTIME       -> "object"
Object.keys(React.__COMPILER_RUNTIME) -> [ "c" ]
typeof React.__COMPILER_RUNTIME.c     -> "function"   (arity 1)
\`\`\`

📌 **Interview term:** <code>c</code>, conventionally <code>useMemoCache</code>, takes the number of cache slots a compiled component needs and returns a per-instance array. A **bailed-out** component contains no call to it at all — which is, incidentally, how you can confirm a bail-out by reading the build output.

## 4. What causes a bail-out

| Cause | Why the compiler cannot proceed |
| :--- | :--- |
| **Mutating props** | Breaks the read-only contract memoisation relies on |
| **Mutating state directly** | The reference-equality model no longer holds |
| **Reading or writing a ref during render** | Render is no longer a pure function of its inputs |
| Other **impure render** behaviour | Same reason — the output is not determined by the inputs |
| Conditional or dynamic hook usage | Breaks the static analysis the Rules of Hooks guarantee |
| Constructs the analysis cannot follow | It declines rather than guessing |

📌 **Interview term:** every one of these is **already a bug** by React's own rules. The compiler is not imposing new restrictions — it is refusing to optimise code that was already violating the contract. That reframing is the strongest thing to say on this question: compiler-friendly code and correct React code are the same thing.

## 5. How you actually find out

Since bail-outs are silent, you need a tool that is not:

- **The ESLint rule** is the primary one. It reports the violations, and the list of files it flags is effectively the list of components that will be skipped. Fixing those is the real adoption work.
- **React DevTools** marks compiled components, so you can confirm which ones took.
- **Reading the build output** for the absence of the cache call, for a specific component you care about.

📌 **Interview term:** adoption is therefore **lint-first, not config-first**. Turning the compiler on is one line; getting value from it means resolving the rule violations so components stop being skipped.

## 6. The escape hatches

**<code>"use no memo"</code>** — a directive at the top of a component or file telling the compiler to skip it deliberately. Useful when a component is knowingly impure and you are not ready to fix it, or when you suspect the compiler of causing a behaviour change and want to bisect.

**Opt-in mode** — compile only annotated files or directories, rather than everything. The sane migration path on a large codebase: enable it for one well-behaved area, verify with the profiler, then widen.

## 7. What it does not do

Worth stating plainly, because it is where expectations run ahead of reality:

- **Effect dependency arrays** are still yours to get right.
- **State placement** is still a design decision — it does not move state down for you.
- **List virtualisation** is untouched; a compiled ten-thousand-row list is still ten thousand rows.
- **Network waterfalls** and bundle size are entirely unaffected.

📌 **Interview term:** and memoisation remains a **performance hint, not a semantic guarantee**. React reserves the right to discard cached values, so your code must still be correct if something recomputes. Anything with a side effect inside a memoised computation was already wrong and stays wrong.

## 8. Common Pitfalls

- **Assuming a bail-out is an error.** It is silent by design; only the linter tells you.
- **Enabling it without fixing lint violations.** You get partial coverage and cannot tell where.
- **Deleting all manual memoisation on day one.** Existing calls keep working; remove them after confirming the compiler is actually running.
- **Expecting it to fix effects.** Different problem entirely.
- **Blaming the compiler for a behaviour change.** Far more often it revealed an existing impurity. Use <code>"use no memo"</code> to bisect before concluding otherwise.
- **Treating memoisation as guaranteed.** It is a hint.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the symptom directly:</strong> <span style="color:#f0e2c8;">"Those components were almost certainly bailed out — the compiler could not prove the transformation was safe, so it left them exactly as written."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stress that it is silent:</strong> <span style="color:#f0e2c8;">"There is no error and no warning. It errs entirely towards declining, because a compiler that miscompiles would be far worse than one that skips."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the causes and reframe them:</strong> <span style="color:#f0e2c8;">"Mutating props or state, touching a ref during render, impure render generally — and all of those were already bugs by React rules. Compiler-friendly and correct are the same thing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the diagnostic:</strong> <span style="color:#f0e2c8;">"The ESLint rule is how you find out. Adoption is lint-first, not config-first — turning it on is one line, getting value from it is fixing what it flags."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Bound the expectations:</strong> <span style="color:#f0e2c8;">"It automates memoisation. It does not fix dependency arrays, decide where state lives, or virtualise a list."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know a component was bailed out?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not from the build, which says nothing. The ESLint rule flags the violations that cause it, DevTools marks which components were compiled, and if you need certainty for one component you can read the output and look for the absence of the cache call the compiler emits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is bailing out silent rather than an error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So that enabling it can never break a working app. The worst case is a component that stays as fast as it was before. Failing the build on every rule violation would make adoption impossible on any large existing codebase — the lint rule carries that signal instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The compiler changed my app behaviour. What now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bisect with the <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">"use no memo"</code> directive to isolate the component, then look hard at whether it was relying on something impure — a mutation, or a ref read during render. Far more often the compiler exposed a latent bug than introduced one, though a genuine compiler bug is worth reporting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you remove existing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useMemo</code> calls when adopting it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not as part of adoption. They keep working, and removing them at the same time as enabling the compiler means two variables changing at once — if something regresses you cannot tell which caused it. Verify the compiler is running first, then clean up as a separate pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is compiler-inserted memoisation guaranteed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — memoisation is documented as a performance hint, and React may discard cached values. Your code must remain correct if something recomputes, which is the same rule that always applied to <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code>. Anything with a side effect inside a memoised computation was already wrong.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bail-out** | The compiler leaving a component uncompiled |
| **Silent failure** | No error; just a component that was not optimised |
| **<code>"use no memo"</code>** | A directive to exclude a component deliberately |
| **Opt-in mode** | Compiling only annotated files or directories |
| **<code>useMemoCache</code>** | The runtime hook compiled output calls into |
| **Performance hint** | Memoisation React may discard, not a guarantee |

---
**Conclusion:** when the profiler still shows re-renders under the React Compiler, the usual answer is that those components were **bailed out** — the compiler could not prove the transformation safe, so it emitted them unchanged, silently and by design. The causes are mutating props or state, touching a ref during render, and impure render generally, all of which were already bugs by React's own rules; compiler-friendly code and correct code are the same thing. Because the failure is silent, the ESLint rule is the real adoption tool, and the expectation to bound is that it automates memoisation only — not dependency arrays, not state placement, not list virtualisation.`,
    examples: [
      {
        label: "A component that would bail out, and the same one made compilable",
        runnable: true,
        code: `import { useState, useRef } from "react";

// ❌ WOULD BAIL OUT: mutates its props. The compiler cannot memoise around a
//    component that modifies its inputs, because the whole model assumes props
//    are read-only. In development React freezes props, so this also throws.
function MutatesProps({ config }) {
  const [report, setReport] = useState("not tried");
  const attempt = () => {
    try {
      config.touched = true;               // <- the bail-out cause
      setReport("mutation succeeded (and the compiler would skip this component)");
    } catch (e) {
      setReport("threw: " + e.message.slice(0, 60));
    }
  };
  return <Row label="❌ mutates props" onClick={attempt} note={report} />;
}

// ❌ WOULD BAIL OUT: reads a ref DURING RENDER. Render is then no longer a pure
//    function of props and state, so the output cannot be safely cached.
function ReadsRefInRender() {
  const counter = useRef(0);
  counter.current++;                        // <- impure: a write during render
  const impure = counter.current;            // <- and a read of it
  return <Row label="❌ ref during render" note={"render count read as " + impure} />;
}

// ✅ COMPILABLE: pure render, props untouched, ref only used in a handler.
function Compilable({ config }) {
  const [count, setCount] = useState(0);
  const clicks = useRef(0);
  // Derived during render from props and state only — no mutation, no ref read.
  const label = config.prefix + ": " + count;
  const bump = () => {
    clicks.current++;                        // refs in handlers are fine
    setCount((c) => c + 1);                  // immutable update
  };
  return <Row label="✅ pure" onClick={bump} note={label} />;
}

function Row({ label, note, onClick }) {
  return (
    <p style={{ margin: "6px 0", fontSize: 14 }}>
      <code style={{ display: "inline-block", minWidth: 180 }}>{label}</code>
      {onClick && <button onClick={onClick} style={{ marginRight: 8 }}>run</button>}
      <span style={{ color: "#555" }}>{note}</span>
    </p>
  );
}

export default function App() {
  const [config] = useState({ prefix: "count", touched: false });

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 560 }}>
      <MutatesProps config={config} />
      <ReadsRefInRender />
      <Compilable config={config} />

      <p style={{ color: "#666", fontSize: 13, marginTop: 12 }}>
        This playground has no React Compiler configured, so nothing here is
        actually compiled — the point is which components it <em>would</em>
        skip. Both failing cases violate React rules independently of the
        compiler, which is why the ESLint rule flags them either way.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Partial Prerendering (PPR) in Next.js 15 — static shell + dynamic holes",
    seoDescription:
      "PPR serves a prerendered static shell instantly and streams the dynamic parts into Suspense-shaped holes, ending the all-static-or-all-dynamic page choice.",
    description: `**Question presented to candidate:**
"A product page is mostly static but shows a personalised cart badge. Historically you had to choose static or dynamic for the whole route. How does Partial Prerendering change that?"

**What a strong answer should cover:**
- The problem it solves: rendering strategy was a **per-route** decision. One personalised element forced the entire page to be dynamic, losing the CDN-cached instant response.
- **PPR splits a single route**: a **static shell** is prerendered at build time and served instantly from the edge, with **holes** where dynamic content will go.
- The dynamic parts stream in afterwards, filling the holes — one HTTP response, progressively completed.
- **Suspense boundaries define the holes.** Anything inside a boundary that uses dynamic APIs becomes a hole; everything else is prerendered into the shell.
- The fallback you write becomes what is baked into the static shell, so it should be a real skeleton rather than a blank space.
- It builds directly on **streaming SSR** and Suspense — the same mechanism, applied at the route level.
- The user-visible benefit: near-instant first paint from cache with personalised content arriving moments later, rather than waiting for the slowest data before anything appears.
- Status matters: PPR has been an **experimental, opt-in** Next.js feature rather than a default, so claiming it as standard is a mistake.

**Clarifying questions expected:**
- "How much of the page is genuinely personalised?" — if most of it is, PPR buys little.
- "Which Next.js version, and is the flag enabled?"

**Code / implementation expected:** Optional. Showing where the Suspense boundary goes is the substance.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes SSR and Suspense.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** PPR is a Next.js build-and-serve feature and **cannot be executed in this environment** — there is no Next.js runtime here. Everything below is stated from the documented model rather than measured, and this doc says so rather than implying otherwise. The underlying Suspense streaming behaviour it depends on **was** verified: see <a href="PASTE_SUSPENSE_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense waterfalls</a>, where two separate boundaries let a fast section appear at 45ms while a slow one took 264ms.

## 1. Why This Even Matters — A Story First

A newspaper prints the whole edition overnight — fast, cheap, identical for everyone. Except the crossword answers have to be different per subscriber, so the entire edition has to be printed fresh each morning, per reader, and nobody gets their paper before six.

The obvious fix, once someone thinks of it: print the paper overnight with a **blank square** where the crossword goes, and fill in that square per reader on delivery. One small personalised part stops holding the other forty pages hostage.

That is Partial Prerendering.

## 2. The problem it solves

📌 **Interview term:** rendering strategy used to be a **per-route** decision. A route was static — prerendered at build, cached at the edge, served instantly — or dynamic, rendered per request. There was no middle.

The consequence is disproportionate. A product page that is 95% identical for everyone, plus a cart badge showing your item count, reads a cookie — so the whole route becomes dynamic and the CDN cache is gone. One small personalised element costs the entire page its instant response.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="A prerendered shell served instantly with dynamic content streamed into holes">
  <defs>
    <marker id="ppr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One route, two rendering strategies</text>
  <rect class="d-box-accent" x="24" y="50" width="250" height="76" rx="10"/>
  <text class="d-text d-accent" x="149" y="76" text-anchor="middle">static shell</text>
  <text class="d-sub" x="149" y="98" text-anchor="middle">built ahead, cached at the edge</text>
  <text class="d-sub" x="149" y="116" text-anchor="middle">served instantly</text>
  <rect class="d-box-muted" x="94" y="140" width="110" height="34" rx="7"/>
  <text class="d-sub" x="149" y="162" text-anchor="middle">hole</text>
  <path class="d-edge-accent" d="M 280 88 L 330 88" marker-end="url(#ppr-arrow)"/>
  <text class="d-sub" x="305" y="76" text-anchor="middle">then</text>
  <rect class="d-box" x="336" y="50" width="300" height="76" rx="10"/>
  <text class="d-text" x="486" y="76" text-anchor="middle">dynamic parts stream in</text>
  <text class="d-sub" x="486" y="98" text-anchor="middle">rendered per request</text>
  <text class="d-sub" x="486" y="116" text-anchor="middle">same HTTP response</text>
  <path class="d-edge" d="M 420 132 L 210 155" marker-end="url(#ppr-arrow)"/>
  <text class="d-sub" x="360" y="180" text-anchor="middle">filling the holes the shell left</text>
</svg>

## 3. The Core Idea

📌 **Interview term: Partial Prerendering** — serving a **prerendered static shell** for a route immediately, with **holes** where dynamic content belongs, then streaming the dynamic content into those holes within the same response.

📌 **Interview term:** the **Suspense boundary is the hole**. Anything inside a boundary that touches dynamic APIs — cookies, headers, search params, or an uncached request — cannot be prerendered, so its **fallback** is baked into the static shell and the real content streams in later. Everything outside a boundary is prerendered normally.

That makes boundary placement a **deployment decision**, not just a loading-state decision. Where you put the boundary determines what can be cached.

\`\`\`jsx
export default function ProductPage() {
  return (
    <>
      <ProductDetails />                 {/* prerendered into the shell */}
      <Reviews />                        {/* prerendered into the shell */}

      <Suspense fallback={<CartSkeleton />}>
        <CartBadge />                    {/* reads a cookie — becomes a hole */}
      </Suspense>
    </>
  );
}
\`\`\`

## 4. Why the fallback suddenly matters more

Under PPR the fallback is not a transient loading state — it is **the content that ships in the static HTML** and is what every user sees first, straight from the edge.

📌 **Interview term:** that changes the design bar. A blank space or a bare spinner is now the first impression of your cached page. A skeleton matching the real content's shape avoids layout shift when the streamed content lands, and makes the instant shell feel like a page rather than a scaffold.

## 5. It is streaming, applied at the route level

This is not a new rendering mechanism. It is <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a> streaming, with the crucial addition that the non-suspended part is **prerendered and cacheable** rather than rendered per request.

Verified separately in this collection, the underlying behaviour holds: with two separate boundaries a fast section appeared at **45ms** while a slow one took **264ms** — they arrive independently rather than the slowest gating everything. PPR takes that and moves the non-dynamic remainder to build time.

## 6. Where it does and does not pay

| Page shape | Benefit |
| :--- | :--- |
| Mostly static, small personalised parts | **Large** — this is the target case |
| A dashboard that is personalised throughout | Little; almost everything is a hole |
| Fully static marketing pages | None; they were already fast |
| Fully dynamic per-request pages | None; nothing to prerender |

📌 **Interview term:** the win scales with **how much of the page is genuinely shared**. Recognising that PPR buys nothing for a fully personalised dashboard is a better answer than enthusiasm.

## 7. Status, and why it matters to say

📌 **Interview term:** PPR has been an **experimental, opt-in** feature in Next.js, enabled behind a configuration flag rather than on by default. Describing it as the standard way Next.js renders would be wrong, and version-specific claims here are exactly the sort of thing to verify against current docs rather than assert from memory — the feature has moved through several iterations.

## 8. Common Pitfalls

- **Presenting it as a default.** It has been opt-in and experimental.
- **A blank or spinner fallback.** It is now the cached first impression and a layout-shift source.
- **Boundaries drawn too wide.** A boundary around half the page turns half the page into a hole.
- **Expecting it to help a fully dynamic page.** There is nothing to prerender.
- **Forgetting that any dynamic API forces a hole.** Reading cookies or headers outside a boundary makes the whole route dynamic again.
- **Confusing it with ISR.** ISR revalidates a whole page on a schedule; PPR splits one page by region.
- **Treating it as a new rendering model.** It is streaming Suspense plus a prerendered remainder.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the old constraint:</strong> <span style="color:#f0e2c8;">"Rendering strategy was per route. One personalised element — a cart badge reading a cookie — made the whole page dynamic and lost the edge cache."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Describe what PPR does:</strong> <span style="color:#f0e2c8;">"It serves a prerendered static shell instantly with holes, then streams the dynamic parts into those holes in the same response."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say what defines a hole:</strong> <span style="color:#f0e2c8;">"The Suspense boundary. Anything inside one that touches a dynamic API becomes a hole; its fallback is what gets baked into the static HTML."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Draw the consequence:</strong> <span style="color:#f0e2c8;">"So boundary placement becomes a caching decision, and the fallback becomes the cached first impression — it needs to be a real skeleton."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be accurate about status and fit:</strong> <span style="color:#f0e2c8;">"It has been experimental and opt-in, and it buys nothing for a page that is personalised throughout — the win scales with how much is genuinely shared."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What decides which parts are holes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Suspense boundaries combined with dynamic API usage. Content inside a boundary that reads cookies, headers, search params, or makes an uncached request cannot be prerendered, so its fallback goes into the shell and the real content streams in. Everything outside a boundary is prerendered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from ISR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Different axis. ISR regenerates a whole page periodically, so everyone still gets the same cached output between revalidations — no personalisation. PPR splits a single page by region, so the shared parts are cached and the per-user parts are genuinely per-user in the same response.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the fallback matter more under PPR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is not a transient loading state any more — it is baked into the cached HTML and is what every visitor sees first. A blank gap or a bare spinner becomes the first impression of your fastest-loading page, and a fallback that does not match the real content's shape causes layout shift when it fills in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would PPR not help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the page is personalised throughout — a dashboard where every panel is user-specific is almost entirely holes, so the shell contains little but skeletons. It also buys nothing on a fully static page, which was already served from cache. The benefit scales with the shared proportion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this a new React feature?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is a Next.js feature built on React streaming SSR and Suspense. React provides the ability to stream a boundary independently; Next.js adds prerendering the non-dynamic remainder at build time and serving it from the edge. Worth attributing correctly, because the underlying mechanism is not framework-specific.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Partial Prerendering** | A static shell served instantly with dynamic holes streamed in |
| **Static shell** | The prerendered, edge-cacheable part of a route |
| **Hole** | A Suspense-bounded region rendered per request |
| **Dynamic API** | Cookies, headers, search params — anything per-request |
| **ISR** | Regenerating a whole page periodically; not per user |
| **Streaming SSR** | Sending HTML progressively as it becomes ready |

---
**Conclusion:** Partial Prerendering removes the per-route choice between static and dynamic. A prerendered shell is served instantly from the edge with holes where personalised content belongs, and the dynamic parts stream into those holes within the same response — so one cart badge no longer costs an otherwise-shared page its cache. Suspense boundaries define the holes, which makes boundary placement a caching decision and turns the fallback into the cached first impression rather than a transient spinner. It is streaming Suspense with the remainder moved to build time, it has been experimental and opt-in, and it buys nothing for a page that is personalised throughout.`,
    examples: [
      {
        label: "Where the boundary goes decides what can be cached",
        runnable: true,
        code: `import { Suspense, use, useState } from "react";

// This playground has no Next.js runtime, so PPR itself cannot run here. What
// it CAN show is the boundary decision that PPR turns into a caching decision:
// content outside a boundary is shell, content inside one is a hole.

const cache = new Map();
function slowData(key, ms, value) {
  if (!cache.has(key)) cache.set(key, new Promise((r) => setTimeout(() => r(value), ms)));
  return cache.get(key);
}

// Shared by every visitor — in a real PPR build this is prerendered into the
// static shell and served from the edge with no server work at all.
function ProductDetails() {
  return (
    <div style={{ background: "#eef7ee", padding: 12, borderRadius: 8 }}>
      <strong>Wireless Headphones</strong>
      <p style={{ margin: "4px 0", fontSize: 13 }}>
        Shared content — identical for everyone, so it belongs in the shell.
      </p>
    </div>
  );
}

// Personalised: in a real app this reads a cookie, so it cannot be prerendered.
function CartBadge() {
  const count = use(slowData("cart", 1400, 3));
  return (
    <span style={{ background: "#4f46e5", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 13 }}>
      {count} in your cart
    </span>
  );
}

// The fallback IS the cached first impression under PPR — so it should be a
// skeleton shaped like the real thing, not a blank space or a bare spinner.
function CartSkeleton() {
  return (
    <span style={{ background: "#e4e4e7", color: "transparent", padding: "3px 10px", borderRadius: 12, fontSize: 13 }}>
      0 in your cart
    </span>
  );
}

export default function App() {
  const [run, setRun] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 500 }}>
      <p>
        <button onClick={() => { cache.clear(); setRun((r) => r + 1); }}>
          reload the page
        </button>
      </p>

      <div key={run} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        {/* SHELL — outside any boundary, so it is prerendered and instant */}
        <ProductDetails />

        <p style={{ margin: "10px 0 4px", fontSize: 13, color: "#666" }}>
          Below is the hole. Only this region waits.
        </p>

        {/* HOLE — the boundary marks the dynamic region */}
        <Suspense fallback={<CartSkeleton />}>
          <CartBadge />
        </Suspense>
      </div>

      <p style={{ color: "#666", fontSize: 13 }}>
        Press reload: the product details appear immediately while the badge
        shows its skeleton, then fills in. Under PPR the top half would have
        come from a CDN with no server render at all — and the skeleton is what
        ships in that cached HTML, which is why its shape matters.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
