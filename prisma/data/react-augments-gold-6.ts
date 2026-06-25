/**
 * React Phase R1 — Batch 6 (Hooks/effects & lifecycle). Gold-standard rewrites.
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
    title: "Describe the React component lifecycle.",
    answer: `**Core concept.** A component passes through three phases: **mounting** (added to the DOM), **updating** (re-rendered due to prop/state changes), and **unmounting** (removed). In function components these map to <code>useEffect</code> — the effect body runs on mount/update, and the returned cleanup runs before the next effect and on unmount.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Mount → Update(s) → Unmount</text>
  <rect x="20" y="56" width="140" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="90" y="74" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">Mount</text>
  <text x="90" y="89" fill="currentColor" font-size="8" text-anchor="middle">useEffect(…, [])</text>
  <rect x="190" y="56" width="140" height="40" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/>
  <text x="260" y="74" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">Update</text>
  <text x="260" y="89" fill="currentColor" font-size="8" text-anchor="middle">useEffect(…, [deps])</text>
  <rect x="360" y="56" width="140" height="40" rx="8" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444"/>
  <text x="430" y="74" fill="#ef4444" font-size="10" font-weight="700" text-anchor="middle">Unmount</text>
  <text x="430" y="89" fill="currentColor" font-size="8" text-anchor="middle">cleanup()</text>
  <path d="M 160 76 L 188 76" stroke="currentColor" stroke-width="1.3" marker-end="url(#lc-a)"/>
  <path d="M 330 76 L 358 76" stroke="currentColor" stroke-width="1.3" marker-end="url(#lc-a)"/>
  <defs><marker id="lc-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** With hooks you don't think in named lifecycle methods — you think in **synchronization**. An effect with <code>[]</code> runs once after mount (its cleanup runs on unmount); an effect with <code>[deps]</code> re-runs whenever those deps change (cleanup runs before each re-run); an effect with no array runs after every render. This replaces the class trio of <code>componentDidMount</code>, <code>componentDidUpdate</code>, and <code>componentWillUnmount</code> with one consistent model. Rendering itself stays pure — side effects belong in effects, not in the render body.

### Class lifecycle → hooks
| Class method | Hooks equivalent |
| --- | --- |
| <code>componentDidMount</code> | <code>useEffect(fn, [])</code> |
| <code>componentDidUpdate</code> | <code>useEffect(fn, [deps])</code> |
| <code>componentWillUnmount</code> | cleanup returned from <code>useEffect</code> |
| <code>render</code> | the function body (pure) |

> **Interview tip:** Frame hooks as "synchronize with deps," not "lifecycle methods." Map mount/update/unmount to the three <code>useEffect</code> forms, and note Error Boundaries still need a class (<code>componentDidCatch</code>).`,
    examples: [
      {
        label: "Mount, update, and unmount with one effect",
        runnable: false,
        code: `import { useState, useEffect } from "react";

function Child({ id }) {
  useEffect(() => {
    console.log("mount/update for id", id);   // runs on mount + when id changes
    return () => console.log("cleanup for id", id); // before next run + on unmount
  }, [id]);
  return <p>Item {id}</p>;
}

export default function App() {
  const [id, setId] = useState(1);
  const [shown, setShown] = useState(true);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      {shown && <Child id={id} />}
      <button onClick={() => setId((n) => n + 1)}>Update id</button>
      <button onClick={() => setShown((s) => !s)}>Mount/Unmount</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle side effects in functional components?",
    answer: `**Core concept.** Keep rendering pure and put side effects where they belong: **user-driven** effects (a click that saves data) go in **event handlers**; effects that **synchronize with an external system** (subscriptions, fetching for the current props, manual DOM) go in <code>useEffect</code>. Anything you can **derive during render**, derive — don't store it in state via an effect.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Right home for each kind of work</text>
  <rect x="20" y="44" width="152" height="96" rx="9" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.4"/>
  <text x="96" y="64" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">render</text>
  <text x="96" y="88" fill="currentColor" font-size="9" text-anchor="middle">pure · derive values</text>
  <text x="96" y="108" fill="currentColor" font-size="9" text-anchor="middle">no side effects</text>
  <rect x="184" y="44" width="152" height="96" rx="9" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="260" y="64" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">event handler</text>
  <text x="260" y="88" fill="currentColor" font-size="9" text-anchor="middle">user actions</text>
  <text x="260" y="108" fill="currentColor" font-size="9" text-anchor="middle">submit, save</text>
  <rect x="348" y="44" width="152" height="96" rx="9" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="424" y="64" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">useEffect</text>
  <text x="424" y="88" fill="currentColor" font-size="9" text-anchor="middle">sync w/ external</text>
  <text x="424" y="108" fill="currentColor" font-size="9" text-anchor="middle">subs, fetch, DOM</text>
</svg>`)}

**How it works.** Modern React guidance pushes back on overusing effects. If a value can be computed from props/state, compute it inline (or with <code>useMemo</code>) — don't mirror it into state inside an effect (that causes extra renders and bugs). If something happens because the **user did something**, handle it in the event handler. Reserve <code>useEffect</code> for genuine **synchronization** with systems outside React: subscribing to a store, setting up a timer, fetching data for the current inputs, or imperatively touching the DOM. Always return a **cleanup** for anything that needs teardown, and list **exhaustive deps**.

### Where effects go
| Work | Put it in |
| --- | --- |
| derive a value | render (or <code>useMemo</code>) |
| respond to a user action | event handler |
| subscribe / fetch / timer / DOM | <code>useEffect</code> + cleanup |
| reset state on prop change | a <code>key</code>, not an effect |

> **Interview tip:** "You might not need an effect." Lead with: derive in render, handle user actions in handlers, and use effects only to **synchronize with external systems** — always with cleanup and exhaustive deps.`,
    examples: [
      {
        label: "Derive in render; effect only for sync",
        runnable: false,
        code: `import { useState, useEffect } from "react";

export default function App() {
  const [first, setFirst] = useState("Ada");
  const [last, setLast] = useState("Lovelace");
  const fullName = first + " " + last;        // ✅ derived, not state-in-effect

  useEffect(() => {
    document.title = fullName;                 // ✅ sync with an external system
  }, [fullName]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input value={first} onChange={(e) => setFirst(e.target.value)} />
      <input value={last} onChange={(e) => setLast(e.target.value)} />
      <p>{fullName} (also the tab title)</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you safely handle async work and race conditions inside effects?",
    answer: `**Core concept.** An effect callback can't be <code>async</code> directly (its return value is the **cleanup**, not a promise), so define an async function *inside* and call it. The real hazard is a **race condition**: if inputs change quickly, an older request can resolve **after** a newer one and overwrite fresh data. Guard with an <code>ignore</code> flag or an <code>AbortController</code> in the cleanup.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Discard stale responses on re-run/unmount</text>
  <line x1="30" y1="70" x2="360" y2="70" stroke="currentColor" stroke-opacity="0.3"/>
  <circle cx="70" cy="70" r="5" fill="#ef4444"/><text x="70" y="58" fill="#ef4444" font-size="8" text-anchor="middle">req A (slow)</text>
  <circle cx="150" cy="70" r="5" fill="#22c55e"/><text x="150" y="58" fill="#22c55e" font-size="8" text-anchor="middle">req B (new)</text>
  <circle cx="240" cy="70" r="5" fill="#22c55e"/><text x="240" y="92" fill="#22c55e" font-size="8" text-anchor="middle">B resolves ✓</text>
  <circle cx="330" cy="70" r="5" fill="#ef4444"/><text x="330" y="92" fill="#ef4444" font-size="8" text-anchor="middle">A resolves → ignored</text>
  <rect x="380" y="52" width="120" height="36" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/>
  <text x="440" y="74" fill="#06b6d4" font-size="9" font-weight="700" text-anchor="middle">ignore flag / abort</text>
</svg>`)}

**How it works.** When a dependency (say a selected <code>id</code>) changes, React runs the effect's cleanup, then the new effect. By setting a local <code>ignore = false</code> and flipping it to <code>true</code> in the cleanup, the previous request's <code>.then</code> checks the flag and **skips** calling <code>setState</code> if it's stale — so only the latest response wins. <code>AbortController</code> goes further by actually cancelling the in-flight <code>fetch</code> (and avoids the "setState on unmounted component" warning). This pattern is exactly what data libraries like React Query handle for you, which is why they're preferred for non-trivial fetching.

### Safe async in effects
| Need | Technique |
| --- | --- |
| async in effect | define + call inside; don't make the effect async |
| ignore stale result | <code>let ignore=false</code>; set true in cleanup |
| cancel the request | <code>AbortController</code> + <code>signal</code> |
| avoid all this | use React Query / SWR |

> **Interview tip:** Two points: effects can't be <code>async</code> (return is cleanup), and **race conditions** need an ignore flag or AbortController in cleanup so a slow earlier request can't clobber newer data. Mention React Query as the production answer.`,
    examples: [
      {
        label: "Ignore-flag guards against the race",
        runnable: false,
        code: `import { useState, useEffect } from "react";

function fakeFetch(id) {
  return new Promise((res) => setTimeout(() => res("user " + id), 100));
}

export default function App() {
  const [id, setId] = useState(1);
  const [data, setData] = useState("");

  useEffect(() => {
    let ignore = false;                         // guard
    fakeFetch(id).then((u) => {
      if (!ignore) setData(u);                  // only latest request wins
    });
    return () => { ignore = true; };            // stale request is discarded
  }, [id]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setId((n) => n + 1)}>Next user ({id})</button>
      <p>{data}</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle memory leaks in React?",
    answer: `**Core concept.** Memory leaks come from **work that outlives the component**: uncleaned timers, subscriptions, event listeners, or a pending request that calls <code>setState</code> after unmount. The fix is to **clean up in <code>useEffect</code>'s return**: clear timers, unsubscribe, remove listeners, and abort/ignore in-flight requests.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Tear down everything the effect set up</text>
  <g font-size="9">
    <rect x="20" y="44" width="232" height="24" rx="5" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/><text x="32" y="60" fill="currentColor">setInterval → clearInterval</text>
    <rect x="20" y="74" width="232" height="24" rx="5" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/><text x="32" y="90" fill="currentColor">addEventListener → remove</text>
    <rect x="20" y="104" width="232" height="24" rx="5" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/><text x="32" y="120" fill="currentColor">subscribe → unsubscribe</text>
  </g>
  <rect x="280" y="62" width="220" height="48" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="390" y="82" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">all in the cleanup</text>
  <text x="390" y="100" fill="currentColor" font-size="9" text-anchor="middle">return () =&gt; { … }</text>
</svg>`)}

**How it works.** Every effect that creates something with a lifetime must dispose of it in its cleanup, which React runs on unmount (and before re-running the effect). A classic leak is an async request that resolves after the component is gone and calls <code>setState</code> — guard it with an <code>ignore</code> flag or an <code>AbortController</code> so the stale update is skipped/cancelled. Other common sources: forgetting <code>removeEventListener</code> (and passing a different function reference so removal silently fails), leaving WebSocket/store subscriptions open, and holding references in long-lived closures. In dev, **StrictMode** mounts → unmounts → remounts components to surface missing cleanup.

### Leak sources and fixes
| Source | Cleanup |
| --- | --- |
| timers | <code>clearTimeout</code>/<code>clearInterval</code> |
| listeners | <code>removeEventListener</code> (same ref) |
| subscriptions | unsubscribe |
| pending fetch | abort / ignore flag |

> **Interview tip:** "Anything an effect starts, the cleanup must stop." Call out the async-setState-after-unmount leak and the <code>removeEventListener</code> same-reference rule. Mention StrictMode's double-invoke as the dev-time detector.`,
    examples: [
      {
        label: "Cleanup prevents the timer leak",
        runnable: false,
        code: `import { useState, useEffect } from "react";

export default function App() {
  const [show, setShow] = useState(true);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setShow((s) => !s)}>Toggle</button>
      {show && <Ticker />}
    </div>
  );
}

function Ticker() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), 500);
    return () => clearInterval(id);   // without this, the timer leaks after unmount
  }, []);
  return <p>tick: {n}</p>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are React Hooks? Name a few common ones.",
    answer: `**Core concept.** Hooks are special functions (named <code>use*</code>) that let **function components** use React features — state, lifecycle/side effects, context — that previously required class components. The everyday ones are <code>useState</code>, <code>useEffect</code>, <code>useContext</code>, <code>useRef</code>, <code>useReducer</code>, <code>useMemo</code>, and <code>useCallback</code>.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Common hooks by purpose</text>
  <g font-size="9">
    <rect x="20" y="42" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="58" fill="currentColor">state: useState · useReducer</text>
    <rect x="20" y="72" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="88" fill="currentColor">effects: useEffect · useLayoutEffect</text>
    <rect x="20" y="102" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="118" fill="currentColor">refs: useRef · useImperativeHandle</text>
  </g>
  <g font-size="9">
    <rect x="268" y="42" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="58" fill="currentColor">perf: useMemo · useCallback</text>
    <rect x="268" y="72" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="280" y="88" fill="currentColor">context: useContext</text>
    <rect x="268" y="102" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="280" y="118" fill="currentColor">concurrent: useTransition · useId</text>
  </g>
</svg>`)}

**How it works.** Hooks let you "hook into" React's state and lifecycle from plain functions, and they compose into **custom hooks** for reusing logic. They obey the **Rules of Hooks**: call them only at the **top level** (never inside conditions, loops, or nested functions) and only from **React function components or other hooks**. This is because React tracks hooks by **call order** between renders — a conditional hook would shift the order and corrupt state. The <code>use</code> prefix lets React and the linter enforce these rules.

### Common hooks
| Hook | Purpose |
| --- | --- |
| <code>useState</code> / <code>useReducer</code> | local state |
| <code>useEffect</code> | side effects / sync |
| <code>useContext</code> | read context |
| <code>useRef</code> | DOM/mutable value |
| <code>useMemo</code> / <code>useCallback</code> | memoize value/function |

> **Interview tip:** Define hooks as "use React features from function components," then recite the **Rules of Hooks** (top level only, components/hooks only) and *why* — React tracks hooks by call order.`,
    examples: [
      {
        label: "Several hooks together",
        runnable: false,
        code: `import { useState, useEffect, useRef, useMemo } from "react";

export default function App() {
  const [q, setQ] = useState("");
  const renders = useRef(0);
  renders.current++;
  const upper = useMemo(() => q.toUpperCase(), [q]); // memoized derivation

  useEffect(() => { document.title = q || "empty"; }, [q]); // effect

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="type" />
      <p>UPPER: {upper}</p>
      <small>renders: {renders.current}</small>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you manage component-level state without `useState` or `useReducer`?",
    answer: `**Core concept.** Often you don't need state at all. **Derive** values from existing props/state during render; use a **<code>ref</code>** for mutable data that shouldn't trigger re-renders (timers, previous value); read shared data from **Context**; subscribe to an external store with **<code>useSyncExternalStore</code>**; or reset a subtree with a **<code>key</code>**. Reach for <code>useState</code> only for data the UI must render *and* that changes over time.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Alternatives to component state</text>
  <g font-size="9">
    <rect x="20" y="44" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="60" fill="currentColor">derive from props/state (no state)</text>
    <rect x="20" y="74" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="90" fill="currentColor">useRef: mutable, no re-render</text>
    <rect x="20" y="104" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="120" fill="currentColor">useContext: read from above</text>
  </g>
  <g font-size="9">
    <rect x="268" y="56" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="72" fill="currentColor">useSyncExternalStore: store</text>
    <rect x="268" y="90" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="106" fill="currentColor">key: reset a subtree's state</text>
  </g>
</svg>`)}

**How it works.** A surprising amount of "state" is really **derived** — e.g. <code>isValid = email.includes("@")</code> shouldn't be its own state; compute it. For values you must remember but that don't affect output (a timeout id, whether you've scrolled), a <code>ref</code> is right: it persists without causing renders. Truly shared values come from **Context** or a **store** (read efficiently via <code>useSyncExternalStore</code> or a library's selector). And to *reset* a child's internal state when an identity changes, give it a different <code>key</code> instead of syncing via effects. <code>useState</code> remains the tool for local, render-affecting, time-varying data — these alternatives just keep you from overusing it.

### Pick the right tool
| Need | Use |
| --- | --- |
| value computable from inputs | derive in render |
| mutable, non-visual data | <code>useRef</code> |
| shared across tree | Context / store |
| external store subscription | <code>useSyncExternalStore</code> |
| reset child state | a changing <code>key</code> |

> **Interview tip:** Lead with "derive, don't store" and <code>useRef</code> for non-rendering values. Mention <code>useSyncExternalStore</code> for external stores and the <code>key</code> trick to reset state — showing you don't reach for <code>useState</code> reflexively.`,
    examples: [
      {
        label: "Derived value + ref instead of state",
        runnable: false,
        code: `import { useState, useRef } from "react";

export default function App() {
  const [email, setEmail] = useState("");
  const isValid = email.includes("@");        // ✅ derived, not separate state
  const typedCount = useRef(0);               // ✅ mutable, no re-render
  typedCount.current = email.length;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <p style={{ color: isValid ? "green" : "crimson" }}>
        {isValid ? "looks valid" : "needs an @"}
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When and why do you use `forwardRef` with `useImperativeHandle`?",
    answer: `**Core concept.** <code>forwardRef</code> lets a parent pass a <code>ref</code> *through* a component to something inside it (usually a DOM node). <code>useImperativeHandle</code> customizes **what that ref exposes** — instead of the raw DOM node, you expose a small, intentional imperative API (e.g. <code>focus()</code>, <code>reset()</code>). Use it sparingly, for imperative actions that don't fit the declarative model.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Expose a limited imperative API via a ref</text>
  <rect x="30" y="52" width="150" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="105" y="72" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">Parent</text>
  <text x="105" y="88" fill="currentColor" font-size="8.5" text-anchor="middle">inputRef.current.focus()</text>
  <rect x="320" y="52" width="170" height="44" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="405" y="72" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">Child (forwardRef)</text>
  <text x="405" y="88" fill="currentColor" font-size="8.5" text-anchor="middle">exposes { focus, clear }</text>
  <path d="M 180 74 L 318 74" stroke="currentColor" stroke-width="1.4" marker-end="url(#fr-a)"/>
  <text x="249" y="66" fill="currentColor" font-size="8" text-anchor="middle">ref</text>
  <defs><marker id="fr-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** By default <code>ref</code> isn't a normal prop — a parent can't ref a child component's internals. <code>forwardRef</code> opts in, receiving the ref as a second argument so you can attach it to a DOM node. <code>useImperativeHandle(ref, () => ({ … }))</code> then lets you expose only specific methods rather than the whole node, keeping encapsulation. Reach for this when you need imperative control that's awkward to express with props/state — focusing an input, triggering an animation, scrolling, controlling a media element. Prefer declarative props first; imperative handles are the escape hatch. **React 19** makes <code>ref</code> a regular prop for function components, so <code>forwardRef</code> is becoming unnecessary (though <code>useImperativeHandle</code> stays).

### When to use it
| Use for | Avoid for |
| --- | --- |
| focus / select / scroll | passing data (use props) |
| play/pause media | derived UI (use state) |
| trigger animations | anything declarative-friendly |

> **Interview tip:** "<code>forwardRef</code> passes a ref through; <code>useImperativeHandle</code> narrows what it exposes." Use only for imperative actions (focus, scroll, media). Note **React 19** treats <code>ref</code> as a prop, so <code>forwardRef</code> is largely retired.`,
    examples: [
      {
        label: "Expose focus() and clear() to the parent",
        runnable: false,
        code: `import { forwardRef, useImperativeHandle, useRef } from "react";

const FancyInput = forwardRef(function FancyInput(props, ref) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),     // expose a small API…
    clear: () => { inputRef.current.value = ""; }, // …not the raw node
  }));
  return <input ref={inputRef} placeholder="type" />;
});

export default function App() {
  const apiRef = useRef(null);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <FancyInput ref={apiRef} />
      <button onClick={() => apiRef.current.focus()}>Focus</button>
      <button onClick={() => apiRef.current.clear()}>Clear</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When would you choose a class component over a functional component with hooks?",
    answer: `**Core concept.** Almost never for new code — **function components with hooks** are the modern standard. The one thing classes still do that hooks can't is be an **Error Boundary** (which needs <code>componentDidCatch</code>/<code>getDerivedStateFromError</code>). Otherwise you'd only touch classes to maintain **legacy** code.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Hooks are default; classes are the exception</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">function + hooks</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">less boilerplate, no 'this'</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">easy logic reuse (custom hooks)</text>
  <text x="135" y="124" fill="#22c55e" font-size="9" text-anchor="middle">the default for all new code</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="385" y="64" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">class</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">Error Boundaries (only option)</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">legacy codebases</text>
  <text x="385" y="124" fill="#f59e0b" font-size="9" text-anchor="middle">otherwise: avoid</text>
</svg>`)}

**How it works.** Hooks gave function components everything classes had (state, lifecycle, context) while removing their pain points: confusing <code>this</code> binding, scattered lifecycle logic, and hard-to-reuse stateful code (HOCs/render props). Custom hooks reuse logic without wrapper nesting, and effects co-locate related setup/teardown. The sole gap is **Error Boundaries** — there's no hook for catching render errors yet, so a class is still required (or a wrapper library). You'll also meet classes in older codebases. For anything new, default to function components.

### Class vs hooks
| | function + hooks | class |
| --- | --- | --- |
| Boilerplate | low | higher (<code>this</code>, binding) |
| Logic reuse | custom hooks | HOC/render props |
| Lifecycle | one effect model | scattered methods |
| Error Boundary | ✗ (needs class) | ✓ |

> **Interview tip:** Say "hooks for everything new; classes only for Error Boundaries or legacy." Name the class pain points hooks fixed (<code>this</code> binding, scattered lifecycle, awkward reuse) and the one remaining class-only feature.`,
    examples: [
      {
        label: "The one class you still write: an Error Boundary",
        runnable: false,
        code: `import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    return this.state.hasError ? <p>Something went wrong.</p> : this.props.children;
  }
}

function Boom() { throw new Error("render error"); }

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <ErrorBoundary><Boom /></ErrorBoundary>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
