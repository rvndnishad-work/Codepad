/**
 * React Phase R1 — Batch 4 (Rendering internals). Gold-standard rewrites.
 * Conventions as in react-augments-gold-1.ts.
 */
type Augment = {
  title: string;
  answer?: string;
  examples?: { label?: string; code: string; runnable?: boolean }[];
};

const card = (svg: string) =>
  `<div style="margin:1.25rem auto;max-width:560px;border:1px solid rgba(6,182,212,0.25);border-radius:14px;padding:14px;background:rgba(6,182,212,0.05)">\n${svg}\n</div>`;

const augments: Augment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Virtual DOM in React?",
    answer: `**Core concept.** The Virtual DOM is a lightweight **in-memory tree of plain JavaScript objects** (React elements) describing the UI. On a state change React builds a **new** tree, **diffs** it against the previous one (reconciliation), and applies only the **minimal set of real-DOM mutations** — avoiding slow, manual DOM work.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Diff two virtual trees, patch only the difference</text>
  <rect x="20" y="46" width="130" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="85" y="70" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">old vDOM</text>
  <text x="85" y="90" fill="currentColor" font-size="8.5" text-anchor="middle">previous render</text>
  <rect x="20" y="106" width="130" height="40" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="85" y="130" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">new vDOM</text>
  <rect x="200" y="70" width="130" height="50" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-width="1.4"/>
  <text x="265" y="92" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="middle">diff</text>
  <text x="265" y="108" fill="currentColor" font-size="8" text-anchor="middle">find changes</text>
  <rect x="380" y="70" width="120" height="50" rx="9" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e" stroke-width="1.4"/>
  <text x="440" y="92" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">patch</text>
  <text x="440" y="108" fill="currentColor" font-size="8" text-anchor="middle">minimal DOM ops</text>
  <path d="M 150 90 L 198 92" stroke="currentColor" stroke-width="1.3" marker-end="url(#vd-a)"/>
  <path d="M 330 95 L 378 95" stroke="currentColor" stroke-width="1.3" marker-end="url(#vd-a)"/>
  <defs><marker id="vd-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Direct DOM updates are expensive (layout/reflow), and hand-writing them is error-prone. React instead lets you describe the UI declaratively; each render produces a cheap virtual tree. React compares the new tree to the old using its reconciliation heuristics and batches the necessary changes into one efficient DOM update. The virtual DOM isn't "faster than the DOM" in the abstract — it's a **programming model** that makes declarative UIs feasible while keeping updates reasonably efficient. (Some frameworks like Svelte/SolidJS skip it via compile-time reactivity.)

### Virtual DOM vs real DOM
| | Virtual DOM | Real DOM |
| --- | --- | --- |
| What | JS object tree | browser's live tree |
| Cost to create/compare | cheap | expensive to mutate |
| Update strategy | diff → minimal patch | direct manipulation |
| You write | declarative UI | imperative updates |

> **Interview tip:** Don't oversell "it's faster" — frame it as a **declarative model** that batches minimal DOM updates via diffing. Mention reconciliation + keys, and that newer libs (Solid/Svelte) achieve similar results without a vDOM.`,
    examples: [
      {
        label: "Declarative re-render → minimal DOM update",
        runnable: false,
        code: `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  // You never touch the DOM. Each click produces a NEW virtual tree;
  // React diffs it and updates only the text node that changed.
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h3>Count: {count}</h3>
      <p>This paragraph is untouched on each update.</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the concept of reconciliation in React.",
    answer: `**Core concept.** Reconciliation is the **diffing algorithm** React uses to compare the newly rendered element tree with the previous one and figure out the minimal DOM changes. To stay fast (roughly O(n)), it relies on two heuristics: elements of **different types** replace the whole subtree, and **keys** identify which list children moved.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Heuristic diff: type changes & keys</text>
  <rect x="20" y="44" width="230" height="100" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="64" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">same type</text>
  <text x="135" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">&lt;div&gt; → &lt;div&gt;</text>
  <text x="135" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">keep node, update props</text>
  <text x="135" y="130" fill="#22c55e" font-size="9" text-anchor="middle">cheap</text>
  <rect x="270" y="44" width="230" height="100" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="385" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">different type</text>
  <text x="385" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">&lt;div&gt; → &lt;span&gt;</text>
  <text x="385" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">unmount + rebuild subtree</text>
  <text x="385" y="130" fill="#ef4444" font-size="9" text-anchor="middle">state lost</text>
</svg>`)}

**How it works.** A general tree-diff is O(n³); React makes it practical with assumptions. (1) If two elements have **different types** at the same position (a <code>div</code> becomes a <code>span</code>, or one component becomes another), React tears down the old subtree and builds a new one — so its state is lost. (2) If the type is the **same**, React keeps the DOM node and just updates changed props, then recurses into children. (3) For lists, **keys** tell React which items are the same across renders so it can move rather than recreate them. This is why stable keys matter and why conditionally swapping component types resets state.

### Reconciliation rules
| Situation | React does |
| --- | --- |
| same element type | update props, recurse |
| different type | replace subtree (state lost) |
| list with keys | match by key, reorder |
| list without keys | match by index (risky) |

> **Interview tip:** Name the heuristics (type comparison + keys) and the consequence: changing an element's **type** unmounts its subtree and loses state. Tie it back to why keys must be stable. The modern engine implementing this is **Fiber**.`,
    examples: [
      {
        label: "Type change unmounts; same type preserves",
        runnable: false,
        code: `import { useState } from "react";

function Box({ children }) {
  // input state lives in the DOM of this subtree
  return <div style={{ border: "1px solid #ccc", padding: 12 }}>{children}<input /></div>;
}

export default function App() {
  const [asSection, setAsSection] = useState(false);
  // Toggling the WRAPPER type (div ↔ section) changes the element type at this
  // position → React rebuilds the subtree and the <input> resets.
  const Wrapper = asSection ? "section" : "div";
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Wrapper><Box>Type some text, then toggle:</Box></Wrapper>
      <button onClick={() => setAsSection((s) => !s)}>Toggle wrapper type</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does React Fiber work?",
    answer: `**Core concept.** Fiber is React's reconciliation **engine** (since React 16). It re-implements reconciliation as small, **interruptible units of work** ("fibers") that React can pause, resume, reprioritize, or abandon — which is what makes **concurrent rendering** (time-slicing, Suspense, transitions) possible. Work happens in two phases: an interruptible **render** phase and a synchronous **commit** phase.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Two phases: interruptible render, atomic commit</text>
  <rect x="20" y="46" width="280" height="100" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="160" y="66" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">render phase</text>
  <text x="160" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">build/compare fibers in chunks</text>
  <text x="160" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">can pause / resume / abort</text>
  <text x="160" y="130" fill="#06b6d4" font-size="9" text-anchor="middle">prioritizes urgent updates</text>
  <rect x="320" y="46" width="180" height="100" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="410" y="66" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">commit phase</text>
  <text x="410" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">apply DOM changes</text>
  <text x="410" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">synchronous, atomic</text>
  <text x="410" y="130" fill="#22c55e" font-size="9" text-anchor="middle">run effects</text>
</svg>`)}

**How it works.** Before Fiber, reconciliation was recursive and **synchronous** — once it started it ran to completion, potentially blocking the main thread and dropping frames. Fiber represents each element as a node with pointers and a unit of work, so React can process them incrementally and yield to the browser between chunks (cooperative scheduling). Urgent updates (typing) can jump ahead of non-urgent ones (rendering a big list). The **render** phase is interruptible and must stay side-effect-free (which is why StrictMode double-invokes to catch impurity); the **commit** phase, where the DOM actually changes, is fast and synchronous. Fiber is the foundation for Suspense, <code>useTransition</code>, and selective hydration.

### Why Fiber
| Capability | Enabled by Fiber |
| --- | --- |
| Time-slicing | interruptible work units |
| Priorities | urgent vs transition updates |
| Suspense | pause for async, show fallback |
| Concurrent features | <code>useTransition</code>, <code>useDeferredValue</code> |

> **Interview tip:** Two phases (interruptible render + synchronous commit) and "interruptible units of work" are the keywords. Connect Fiber to concurrent features (transitions, Suspense) and to why render must be pure.`,
    examples: [
      {
        label: "Concurrent priority with useTransition",
        runnable: false,
        code: `import { useState, useTransition } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [list, setList] = useState([]);
  const [isPending, startTransition] = useTransition();

  const onChange = (e) => {
    setText(e.target.value);                 // urgent: keep input responsive
    startTransition(() => {                   // non-urgent: Fiber can interrupt
      setList(Array.from({ length: 5000 }, (_, i) => e.target.value + " " + i));
    });
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input value={text} onChange={onChange} placeholder="type fast" />
      {isPending && <span> updating…</span>}
      <p>{list.length} rows</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does React's Batching work?",
    answer: `**Core concept.** Batching means React groups **multiple state updates** that happen in the same tick into a **single re-render**, instead of re-rendering once per <code>setState</code>. React 18's **automatic batching** extends this beyond event handlers to updates inside promises, <code>setTimeout</code>, and native callbacks. <code>flushSync</code> opts out when you need a synchronous update.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Many setState calls → one render</text>
  <g font-size="9" text-anchor="middle">
    <rect x="30" y="50" width="90" height="26" rx="5" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/><text x="75" y="67" fill="currentColor">setA()</text>
    <rect x="30" y="84" width="90" height="26" rx="5" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/><text x="75" y="101" fill="currentColor">setB()</text>
  </g>
  <path d="M 120 80 L 220 80" stroke="currentColor" stroke-width="1.4" marker-end="url(#ba-a)"/>
  <text x="170" y="72" fill="currentColor" font-size="9" text-anchor="middle">batched</text>
  <rect x="230" y="62" width="130" height="36" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="295" y="85" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">ONE re-render</text>
  <text x="440" y="78" fill="#ef4444" font-size="9" text-anchor="middle">flushSync</text>
  <text x="440" y="92" fill="currentColor" font-size="8" text-anchor="middle">= opt out</text>
  <defs><marker id="ba-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** If a click handler calls <code>setCount</code> and <code>setName</code>, React doesn't render twice — it queues both and renders once with the final values, which is faster and avoids intermediate UI flicker. Before React 18, batching only happened inside React event handlers; updates in async callbacks (a <code>fetch</code> <code>.then</code>, a <code>setTimeout</code>) each triggered their own render. React 18's **automatic batching** (with <code>createRoot</code>) batches those too. When you genuinely need the DOM updated synchronously between two updates (e.g. measuring layout), wrap an update in <code>flushSync</code> to flush it immediately.

### Batching behaviour
| Context | Pre-18 | React 18 |
| --- | --- | --- |
| React event handler | batched | batched |
| promise / <code>setTimeout</code> | not batched | **batched** |
| native event handler | not batched | batched |
| <code>flushSync(fn)</code> | — | force a sync render |

> **Interview tip:** Lead with "multiple updates → one render." The 18 upgrade is **automatic batching everywhere** (async too). Mention <code>flushSync</code> as the escape hatch and functional updates (<code>setX(x => x + 1)</code>) so batched updates compose correctly.`,
    examples: [
      {
        label: "Two updates, one render",
        runnable: false,
        code: `import { useState, useRef } from "react";

export default function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const renders = useRef(0);
  renders.current++;                          // counts actual renders

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>a={a} b={b} — total renders: {renders.current}</p>
      <button onClick={() => { setA((x) => x + 1); setB((x) => x + 1); }}>
        Update both (batched → +1 render)
      </button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is hydration in React?",
    answer: `**Core concept.** Hydration is the process of **attaching React to server-rendered HTML** — wiring up event handlers and internal state so the static markup becomes interactive — **without rebuilding** the DOM. The client renders the same tree and "adopts" the existing nodes via <code>hydrateRoot</code>.

${card(`<svg viewBox="0 0 520 152" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Server HTML + JS → interactive app (reuse the DOM)</text>
  <rect x="20" y="46" width="150" height="62" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="95" y="70" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">SSR HTML</text>
  <text x="95" y="90" fill="currentColor" font-size="8.5" text-anchor="middle">visible, not interactive</text>
  <rect x="200" y="46" width="130" height="62" rx="9" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="265" y="70" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">hydrateRoot</text>
  <text x="265" y="90" fill="currentColor" font-size="8.5" text-anchor="middle">attach handlers/state</text>
  <rect x="360" y="46" width="140" height="62" rx="9" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e" stroke-width="1.4"/>
  <text x="430" y="70" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">interactive</text>
  <text x="430" y="90" fill="currentColor" font-size="8.5" text-anchor="middle">no DOM rebuild</text>
  <path d="M 170 77 L 198 77" stroke="currentColor" stroke-width="1.3" marker-end="url(#hy-a)"/>
  <path d="M 330 77 L 358 77" stroke="currentColor" stroke-width="1.3" marker-end="url(#hy-a)"/>
  <defs><marker id="hy-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** With SSR/SSG the server sends fully-formed HTML so users see content fast and crawlers get real markup. That HTML is inert until JavaScript loads; hydration then renders the component tree on the client and matches it against the existing DOM, attaching listeners instead of recreating elements. The catch is **hydration mismatches**: if the server and client render different markup (from <code>Date.now()</code>, <code>window</code> checks, random values, or locale differences), React warns and may discard the server HTML. Avoid by rendering deterministically and deferring browser-only values to an effect. React 18 adds **streaming SSR + selective hydration** so parts of the page become interactive independently.

### Hydration essentials
| Concept | Detail |
| --- | --- |
| API | <code>hydrateRoot(el, &lt;App /&gt;)</code> |
| Goal | reuse server DOM, attach interactivity |
| Risk | server/client markup **mismatch** |
| React 18 | streaming + selective hydration |

> **Interview tip:** The thing to volunteer is **hydration mismatches** and their causes (non-deterministic render, browser-only APIs). Mention that the HTML is visible but inert until hydrated, and React 18's selective/streaming hydration.`,
    examples: [
      {
        label: "Avoiding a hydration mismatch",
        runnable: false,
        code: `import { useState, useEffect } from "react";

// ❌ rendering Date.now() directly differs between server and client → mismatch
// ✅ render a stable placeholder on the server, fill in after mount
export default function Clock() {
  const [time, setTime] = useState(null);     // same on server & first client render
  useEffect(() => {
    setTime(new Date().toLocaleTimeString()); // browser-only, after hydration
  }, []);
  return (
    <p style={{ fontFamily: "system-ui" }}>
      Time: {time ?? "loading…"}
    </p>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are React synthetic events?",
    answer: `**Core concept.** A SyntheticEvent is React's **cross-browser wrapper** around the native DOM event. It gives every event a consistent API (<code>preventDefault</code>, <code>stopPropagation</code>, <code>target</code>) regardless of browser quirks, and you can always reach the underlying event via <code>e.nativeEvent</code>.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">A normalized wrapper over the native event</text>
  <rect x="30" y="48" width="160" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="110" y="72" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">native event</text>
  <text x="110" y="92" fill="currentColor" font-size="8.5" text-anchor="middle">browser-specific</text>
  <rect x="320" y="48" width="170" height="58" rx="9" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="405" y="72" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">SyntheticEvent</text>
  <text x="405" y="92" fill="currentColor" font-size="8.5" text-anchor="middle">consistent API · e.nativeEvent</text>
  <path d="M 190 77 L 318 77" stroke="currentColor" stroke-width="1.4" marker-end="url(#se-a)"/>
  <text x="254" y="69" fill="currentColor" font-size="9" text-anchor="middle">wraps</text>
  <defs><marker id="se-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** React attaches **one** listener per event type at the root container and routes events to your handlers (delegation), wrapping each in a SyntheticEvent so behaviour is identical across browsers. You call <code>e.preventDefault()</code>/<code>e.stopPropagation()</code> on the synthetic event just like native. A historical note: before React 17 synthetic events were **pooled** (reused and nulled out after the handler), so reading them asynchronously required <code>e.persist()</code> — pooling was **removed in React 17**, so today you can use the event normally in async code. To access anything React doesn't expose, use <code>e.nativeEvent</code>.

### SyntheticEvent facts
| Aspect | Detail |
| --- | --- |
| Purpose | cross-browser consistency |
| Underlying event | <code>e.nativeEvent</code> |
| Delegation | one root listener per type |
| Pooling | removed in React 17 |

> **Interview tip:** Define it as a cross-browser wrapper with a consistent API, mention <code>e.nativeEvent</code>, and that **pooling was removed in React 17** (so <code>e.persist()</code> is no longer needed). Bonus: React 17+ attaches the root listener to the app container, not <code>document</code>.`,
    examples: [
      {
        label: "Synthetic vs native event",
        runnable: false,
        code: `export default function App() {
  const handle = (e) => {
    e.preventDefault();                       // works cross-browser
    console.log("synthetic type:", e.type);
    console.log("native type:", e.nativeEvent.type); // underlying DOM event
  };
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <a href="https://example.com" onClick={handle}>
        Click (preventDefault stops navigation)
      </a>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does React handle events?",
    answer: `**Core concept.** You attach handlers in JSX with **camelCase** props (<code>onClick</code>, <code>onChange</code>) that take a **function**, not a string. Under the hood React uses **event delegation** — a single listener per event type at the root container — and dispatches a normalized **SyntheticEvent** to your handler.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">One root listener delegates to your handlers</text>
  <rect x="170" y="40" width="180" height="34" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="62" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">root: one "click" listener</text>
  <g font-size="9" text-anchor="middle">
    <rect x="60" y="106" width="120" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="120" y="125" fill="currentColor">onClick={fn}</text>
    <rect x="340" y="106" width="120" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="400" y="125" fill="currentColor">onClick={fn}</text>
  </g>
  <path d="M 230 74 L 130 104" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#he-a)"/>
  <path d="M 290 74 L 390 104" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#he-a)"/>
  <defs><marker id="he-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Rather than binding a separate DOM listener to every element, React registers one listener per event type at the root and figures out which component's handler to call when an event bubbles up — efficient and automatic. Your handler receives a SyntheticEvent; call <code>e.preventDefault()</code> to cancel default behaviour and <code>e.stopPropagation()</code> to stop React's propagation. Note that <code>return false</code> does **not** prevent default in React (unlike inline HTML). Pass a function reference (<code>onClick={handleClick}</code>), not a call (<code>onClick={handleClick()}</code>), and avoid recreating inline handlers in hot paths if it causes memoized children to re-render.

### Event handling rules
| Do | Don't |
| --- | --- |
| <code>onClick={fn}</code> (camelCase, fn) | <code>onclick="fn()"</code> (string) |
| <code>e.preventDefault()</code> | <code>return false</code> |
| pass a reference | call it inline (<code>fn()</code>) |
| use <code>e.nativeEvent</code> if needed | rely on pooling (gone in 17) |

> **Interview tip:** Hit three points: camelCase handlers taking a **function**, **delegation** at the root (one listener per type), and <code>preventDefault</code>/<code>stopPropagation</code> on the SyntheticEvent (<code>return false</code> doesn't work in React).`,
    examples: [
      {
        label: "Handlers, preventDefault, passing args",
        runnable: false,
        code: `export default function App() {
  const onSubmit = (e) => { e.preventDefault(); console.log("submitted"); };
  const onPick = (id) => console.log("picked", id);

  return (
    <form onSubmit={onSubmit} style={{ padding: 24, fontFamily: "system-ui" }}>
      {/* pass a reference, not a call */}
      <button type="button" onClick={() => onPick(1)}>Pick #1</button>
      <button type="submit">Submit (preventDefault)</button>
    </form>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between shadow DOM and virtual DOM?",
    answer: `**Core concept.** Despite the similar names they're unrelated. The **Shadow DOM** is a **browser standard** for *encapsulation* — it scopes a component's DOM and CSS so they don't leak in or out (the backbone of Web Components). The **Virtual DOM** is React's in-memory *optimization* for computing efficient UI updates. One isolates; the other diffs.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Encapsulation (browser) vs efficient updates (React)</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="135" y="64" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">Shadow DOM</text>
  <text x="135" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">browser standard</text>
  <text x="135" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">scoped DOM + CSS</text>
  <text x="135" y="126" fill="#8b5cf6" font-size="9" text-anchor="middle">Web Components</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="385" y="64" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">Virtual DOM</text>
  <text x="385" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">React concept</text>
  <text x="385" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">diff → minimal DOM patch</text>
  <text x="385" y="126" fill="#06b6d4" font-size="9" text-anchor="middle">efficient updates</text>
</svg>`)}

**How it works.** The Shadow DOM lets an element host a separate, **encapsulated** DOM subtree with its own scoped styles — so a custom element's internals and CSS can't clash with the page. It's about **isolation**. The Virtual DOM is a JavaScript representation React diffs between renders to decide the minimal real-DOM changes — it's about **update efficiency** and a declarative programming model. They operate at different layers and can even coexist (a React app could use a Web Component). The shared word "DOM" is the only real connection.

### Shadow vs Virtual DOM
| | Shadow DOM | Virtual DOM |
| --- | --- | --- |
| Origin | browser web standard | React (library concept) |
| Purpose | encapsulate DOM + styles | efficient diffing/updates |
| Lives | in the real DOM | in memory (JS objects) |
| Used by | Web Components | React/Preact |

> **Interview tip:** Say plainly "they're unrelated despite the name." Shadow DOM = **style/DOM encapsulation** (Web Components); Virtual DOM = **in-memory diffing** for efficient updates. Different layers, different goals.`,
    examples: [
      {
        label: "Virtual DOM (React) vs Shadow DOM (native)",
        runnable: false,
        code: `// Virtual DOM — React diffs this in memory and patches the real DOM
export default function App() {
  return <p style={{ fontFamily: "system-ui", padding: 24 }}>React uses a virtual DOM.</p>;
}

// Shadow DOM — a browser API for encapsulation (no React involved):
//   const host = document.querySelector("#host");
//   const shadow = host.attachShadow({ mode: "open" });
//   shadow.innerHTML = "<style>p{color:red}</style><p>Scoped — styles can't leak out</p>";
// The <style> above only affects nodes INSIDE this shadow root.`,
      },
    ],
  },
];

export default augments;
