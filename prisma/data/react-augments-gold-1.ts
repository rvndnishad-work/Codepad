/**
 * React Phase R1 — Batch 1 (Core hooks). Gold-standard rewrites: TL;DR + React
 * SVG diagram + comparison table + interview tip + a self-contained JSX example.
 * Picked up by `npm run augment:react` (sorts after react-augments-N.ts so it
 * overrides the older moderate answers; before react-augments-hard.json).
 *
 * Inline code uses <code> tags (rendered via rehype-raw) to keep the markdown
 * clean in TS template literals. Examples are default-exported App.js components
 * with runnable:false (React can't run in the in-page worker — they open in the
 * Sandpack playground).
 */
type Augment = {
  title: string;
  answer?: string;
  examples?: { label?: string; code: string; runnable?: boolean }[];
};

// React-themed (cyan) diagram card.
const card = (svg: string) =>
  `<div style="margin:1.25rem auto;max-width:560px;border:1px solid rgba(6,182,212,0.25);border-radius:14px;padding:14px;background:rgba(6,182,212,0.05)">\n${svg}\n</div>`;

const augments: Augment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between `useState` and `useReducer`?",
    answer: `**Core concept (TL;DR).** Both add state to a function component. <code>useState</code> is best for **simple, independent** values you update directly. <code>useReducer</code> centralises update logic in a **reducer** <code>(state, action) => newState</code> and you <code>dispatch</code> actions — better when state is **complex**, has many sub-values, or the next state depends on the previous one.

${card(`<svg viewBox="0 0 520 176" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Direct setter vs dispatch → reducer</text>
  <rect x="20" y="44" width="230" height="116" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="64" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">useState</text>
  <text x="135" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">setCount(c =&gt; c + 1)</text>
  <text x="135" y="108" fill="currentColor" font-size="9.5" text-anchor="middle">update value directly</text>
  <text x="135" y="132" fill="#06b6d4" font-size="9" text-anchor="middle">simple, independent state</text>
  <rect x="270" y="44" width="230" height="116" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="385" y="64" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">useReducer</text>
  <text x="385" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">dispatch({type:"inc"})</text>
  <text x="385" y="104" fill="currentColor" font-size="9.5" text-anchor="middle">↓ reducer(state, action)</text>
  <text x="385" y="122" fill="currentColor" font-size="9.5" text-anchor="middle">→ next state</text>
  <text x="385" y="146" fill="#8b5cf6" font-size="9" text-anchor="middle">complex transitions, testable</text>
</svg>`)}

**How it works.** <code>useReducer</code> moves all transition logic into one pure function, so components just <code>dispatch</code> intent ("increment", "reset"). That centralisation makes complex updates predictable and easy to unit-test (the reducer is a pure function), and it avoids bugs from juggling several <code>useState</code> calls that must change together. Both are equivalent in power — <code>useState</code> is actually built on <code>useReducer</code> internally — so reach for the reducer only when the extra structure pays off.

### When to use which
| | <code>useState</code> | <code>useReducer</code> |
| --- | --- | --- |
| State shape | one/few simple values | complex or related fields |
| Update logic | inline setters | centralised reducer |
| Next-from-previous | functional updater | natural fit |
| Testability | n/a | pure reducer is easy to test |

> **Interview tip:** Say <code>useState</code> is sugar over <code>useReducer</code>. Switch to a reducer when multiple values change together or transitions get branchy — and pass the **dispatch** function down (it's stable) instead of many setters.`,
    examples: [
      {
        label: "A counter with useReducer",
        runnable: false,
        code: `import { useReducer } from "react";

function reducer(state, action) {
  switch (action.type) {
    case "inc":   return { count: state.count + 1 };
    case "dec":   return { count: state.count - 1 };
    case "reset": return { count: 0 };
    default:      throw new Error("unknown action");
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h3>Count: {state.count}</h3>
      <button onClick={() => dispatch({ type: "dec" })}>-</button>
      <button onClick={() => dispatch({ type: "inc" })}>+</button>
      <button onClick={() => dispatch({ type: "reset" })}>reset</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the purpose of `useEffect`.",
    answer: `**Core concept (TL;DR).** <code>useEffect</code> lets a component run **side effects** — work outside rendering, like data fetching, subscriptions, timers, or manual DOM changes. It runs **after** React commits to the screen; its **dependency array** controls when it re-runs; and the function it returns is a **cleanup** that undoes the previous effect.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Effects run after render/paint, not during</text>
  <rect x="20" y="48" width="120" height="44" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/>
  <text x="80" y="68" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">render</text>
  <text x="80" y="84" fill="currentColor" font-size="8.5" text-anchor="middle">pure, no effects</text>
  <rect x="170" y="48" width="120" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/>
  <text x="230" y="68" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">commit → paint</text>
  <rect x="320" y="48" width="180" height="44" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="410" y="68" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">useEffect runs</text>
  <text x="410" y="84" fill="currentColor" font-size="8.5" text-anchor="middle">fetch / subscribe / timer</text>
  <path d="M 140 70 L 168 70" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#ue-a)"/>
  <path d="M 290 70 L 318 70" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#ue-a)"/>
  <text x="260" y="126" fill="currentColor" font-size="9.5" text-anchor="middle">deps decide re-runs · returned fn cleans up before the next run / unmount</text>
  <defs><marker id="ue-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Rendering must stay pure, so anything that reaches outside React (network, DOM, subscriptions) belongs in an effect. After the DOM updates, React runs your effect; before running it again — or when the component unmounts — it runs the cleanup you returned. The dependency array tells React which reactive values the effect depends on: <code>[]</code> runs it once on mount, <code>[a, b]</code> re-runs when <code>a</code>/<code>b</code> change, and omitting it runs after every render. Modern React guidance: don't overuse effects — derive values during render and handle user events in handlers; reserve effects for genuine *synchronization with external systems*.

### Dependency array behaviour
| Deps | Effect runs |
| --- | --- |
| <code>[]</code> | once, on mount (cleanup on unmount) |
| <code>[a, b]</code> | on mount + whenever <code>a</code>/<code>b</code> change |
| omitted | after **every** render |

> **Interview tip:** Stress "effects are for synchronizing with external systems," not for transforming data (do that in render). Mention the cleanup function and that StrictMode double-invokes effects in dev to surface missing cleanup.`,
    examples: [
      {
        label: "Effect with cleanup (subscription)",
        runnable: false,
        code: `import { useState, useEffect } from "react";

export default function App() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize); // subscribe
    return () => window.removeEventListener("resize", onResize); // cleanup
  }, []); // [] → subscribe once, clean up on unmount

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      Window width: <strong>{width}px</strong> — try resizing.
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the cleanup function in useEffect?",
    answer: `**Core concept (TL;DR).** The **cleanup** is the function you return from <code>useEffect</code>. React runs it **before re-running the effect** and **when the component unmounts**, so it can undo whatever the previous effect set up — unsubscribe, <code>clearInterval</code>, abort a request, remove a listener. Without it you get memory leaks and stale, duplicated subscriptions.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Each effect cleans up the previous one</text>
  <rect x="20" y="46" width="130" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="85" y="64" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">effect (deps A)</text>
  <text x="85" y="79" fill="currentColor" font-size="8.5" text-anchor="middle">subscribe</text>
  <rect x="195" y="46" width="130" height="40" rx="8" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444"/>
  <text x="260" y="64" fill="#ef4444" font-size="10" font-weight="700" text-anchor="middle">cleanup</text>
  <text x="260" y="79" fill="currentColor" font-size="8.5" text-anchor="middle">unsubscribe</text>
  <rect x="370" y="46" width="130" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="435" y="64" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">effect (deps B)</text>
  <text x="435" y="79" fill="currentColor" font-size="8.5" text-anchor="middle">re-subscribe</text>
  <path d="M 150 66 L 193 66" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#cu-a)"/>
  <path d="M 325 66 L 368 66" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#cu-a)"/>
  <text x="260" y="124" fill="currentColor" font-size="9.5" text-anchor="middle">runs on dependency change AND on unmount</text>
  <defs><marker id="cu-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** When dependencies change, React first runs the **old** effect's cleanup, then runs the new effect — so a subscription always tears down before a fresh one starts. On unmount, only the cleanup runs. This is what prevents the classic leaks: timers that keep firing, event listeners that pile up, or a resolved fetch calling <code>setState</code> on an unmounted component. For async effects, use an <code>AbortController</code> or an <code>ignore</code> flag in the cleanup to discard stale results and avoid race conditions.

### What cleanup undoes
| Effect set up | Cleanup should |
| --- | --- |
| <code>setInterval</code> / <code>setTimeout</code> | <code>clearInterval</code> / <code>clearTimeout</code> |
| <code>addEventListener</code> | <code>removeEventListener</code> |
| subscription | unsubscribe |
| <code>fetch</code> | <code>abort()</code> / ignore stale result |

> **Interview tip:** Tie it to leaks and race conditions: the cleanup runs *before* the next effect and on unmount. In dev, StrictMode mounts → unmounts → remounts to verify your cleanup is correct.`,
    examples: [
      {
        label: "clearInterval in cleanup",
        runnable: false,
        code: `import { useState, useEffect } from "react";

export default function App() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id); // cleanup → no leaked timer
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      Elapsed: <strong>{seconds}s</strong>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the `deps` array in `useEffect` and `useCallback`?",
    answer: `**Core concept (TL;DR).** The dependency array tells React **when to act**. For <code>useEffect</code> it decides when the effect re-runs; for <code>useCallback</code>/<code>useMemo</code> it decides when the memoized function/value is recreated. React shallowly compares the array between renders and only re-runs/recomputes when a dependency changed.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">React compares deps; acts only on change</text>
  <rect x="18" y="46" width="152" height="100" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="94" y="68" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">[]</text>
  <text x="94" y="92" fill="currentColor" font-size="9.5" text-anchor="middle">run once (mount)</text>
  <text x="94" y="112" fill="currentColor" font-size="9.5" text-anchor="middle">never re-runs</text>
  <rect x="184" y="46" width="152" height="100" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="260" y="68" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">[a, b]</text>
  <text x="260" y="92" fill="currentColor" font-size="9.5" text-anchor="middle">re-run when a/b</text>
  <text x="260" y="112" fill="currentColor" font-size="9.5" text-anchor="middle">change (Object.is)</text>
  <rect x="350" y="46" width="152" height="100" rx="9" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444" stroke-width="1.4"/>
  <text x="426" y="68" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">(omitted)</text>
  <text x="426" y="92" fill="currentColor" font-size="9.5" text-anchor="middle">every render</text>
  <text x="426" y="112" fill="currentColor" font-size="9.5" text-anchor="middle">usually a bug</text>
</svg>`)}

**How it works.** Between renders React compares each dependency with <code>Object.is</code>. If all are equal, it skips the effect / reuses the memoized value; if any changed, it re-runs. The golden rule is **exhaustive deps**: include *every* reactive value (props, state, derived functions) the effect or callback reads, or you'll capture **stale** values in a closure. The <code>react-hooks/exhaustive-deps</code> lint rule enforces this. A common trap is passing a new object/array/function inline as a dep — it's a different reference every render, so the effect runs constantly; stabilise it with <code>useMemo</code>/<code>useCallback</code> or move it inside.

### Deps semantics
| Deps | Behaviour |
| --- | --- |
| <code>[]</code> | act once (mount) |
| <code>[a, b]</code> | act when <code>a</code> or <code>b</code> change |
| omitted | act on every render |
| missing a used value | stale closure bug |

> **Interview tip:** Lead with "exhaustive deps" and stale closures. Explain reference identity — inline objects/functions change every render — and that <code>useCallback</code>/<code>useMemo</code> exist to keep deps stable, not as a blanket optimization.`,
    examples: [
      {
        label: "Deps drive re-runs",
        runnable: false,
        code: `import { useState, useEffect, useCallback } from "react";

export default function App() {
  const [query, setQuery] = useState("react");
  const [runs, setRuns] = useState(0);

  // recreated only when 'query' changes (stable reference otherwise)
  const search = useCallback(() => "results for: " + query, [query]);

  useEffect(() => {
    setRuns((r) => r + 1);            // effect re-runs whenever search changes
  }, [search]);                       // search depends on query → exhaustive deps

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>{search()}</p>
      <small>effect runs: {runs}</small>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between useMemo and useCallback?",
    answer: `**Core concept (TL;DR).** Both memoize across renders to preserve **referential stability**, keyed by a dependency array. <code>useMemo</code> caches a computed **value**; <code>useCallback</code> caches a **function**. In fact <code>useCallback(fn, deps)</code> is exactly <code>useMemo(() => fn, deps)</code>.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Cache a value vs cache a function</text>
  <rect x="20" y="46" width="230" height="104" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="66" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">useMemo(fn, deps)</text>
  <text x="135" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">caches the RETURN value</text>
  <text x="135" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">skips expensive recompute</text>
  <text x="135" y="134" fill="#06b6d4" font-size="9" text-anchor="middle">e.g. heavy filtered list</text>
  <rect x="270" y="46" width="230" height="104" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="385" y="66" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">useCallback(fn, deps)</text>
  <text x="385" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">caches the FUNCTION itself</text>
  <text x="385" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">stable identity for children</text>
  <text x="385" y="134" fill="#8b5cf6" font-size="9" text-anchor="middle">= useMemo(() =&gt; fn, deps)</text>
</svg>`)}

**How it works.** Each render normally creates brand-new objects and functions. That's fine until a new reference forces work: a <code>React.memo</code> child re-renders because its callback prop changed identity, or an effect re-runs because a dependency object is "new." <code>useMemo</code> caches an expensive computed value so it isn't recalculated every render; <code>useCallback</code> caches a function so its identity stays stable for memoized children and effect deps. Both are **optimizations, not guarantees** — React may discard the cache — so don't rely on them for correctness, and don't sprinkle them everywhere (the comparison + memory cost can exceed the savings).

### useMemo vs useCallback
| | <code>useMemo</code> | <code>useCallback</code> |
| --- | --- | --- |
| Caches | a value | a function |
| Typical use | costly computation | stable prop for memoized child |
| Returns | <code>fn()</code>'s result | the <code>fn</code> itself |
| Equivalent | — | <code>useMemo(() => fn, deps)</code> |

> **Interview tip:** State the identity <code>useCallback(fn, d) === useMemo(() => fn, d)</code>. Emphasise they only help alongside <code>React.memo</code> or as effect deps; otherwise they often add overhead. (React Compiler aims to make most of these automatic.)`,
    examples: [
      {
        label: "Memoize a value and a callback",
        runnable: false,
        code: `import { useState, useMemo, useCallback } from "react";

export default function App() {
  const [nums] = useState([5, 2, 8, 1, 9, 3]);
  const [tick, setTick] = useState(0);

  // value cache: only re-sorts when 'nums' changes, not when 'tick' does
  const sorted = useMemo(() => [...nums].sort((a, b) => a - b), [nums]);

  // function cache: stable identity across renders (deps [])
  const onClick = useCallback(() => setTick((t) => t + 1), []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>sorted: {sorted.join(", ")}</p>
      <button onClick={onClick}>re-render ({tick})</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Describe the `useRef` hook and its typical use cases.",
    answer: `**Core concept (TL;DR).** <code>useRef</code> returns a mutable object — <code>{ current }</code> — that **persists across renders** but does **not** trigger a re-render when you change it. Two main uses: (1) get a handle to a **DOM node**, and (2) store a **mutable value** that should survive renders without being state (timer ids, the previous value, instance-like data).

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">A persistent box that doesn't cause re-renders</text>
  <rect x="20" y="46" width="230" height="100" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="66" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">DOM ref</text>
  <text x="135" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">&lt;input ref={inputRef} /&gt;</text>
  <text x="135" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">inputRef.current.focus()</text>
  <text x="135" y="132" fill="#06b6d4" font-size="9" text-anchor="middle">imperative DOM access</text>
  <rect x="270" y="46" width="230" height="100" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="385" y="66" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">mutable value</text>
  <text x="385" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">ref.current = timerId</text>
  <text x="385" y="110" fill="currentColor" font-size="9.5" text-anchor="middle">survives renders</text>
  <text x="385" y="132" fill="#8b5cf6" font-size="9" text-anchor="middle">changing it ≠ re-render</text>
</svg>`)}

**How it works.** Unlike a normal variable (reset every render) or state (changing it re-renders), a ref keeps the **same object** for the component's lifetime and mutating <code>.current</code> is invisible to React's render cycle. That's exactly what you want for storing a <code>setInterval</code> id, the previous prop/state value, or a "has mounted" flag. For DOM access, pass the ref to an element's <code>ref</code> attribute and React sets <code>.current</code> to the node after mount. The rule: **don't read or write <code>.current</code> during render** (it's a side effect) — do it in effects or event handlers.

### Ref vs state
| | <code>useRef</code> | <code>useState</code> |
| --- | --- | --- |
| Persists across renders | yes | yes |
| Change triggers re-render | **no** | yes |
| Read during render | avoid | yes |
| Use for | DOM nodes, timers, prev value | UI-visible data |

> **Interview tip:** The one-liner: "state is for values the UI renders; refs are for values you need to remember but that shouldn't trigger a render." Mention that mutating <code>ref.current</code> does **not** re-render, and avoid touching it during render.`,
    examples: [
      {
        label: "DOM focus + render-independent counter",
        runnable: false,
        code: `import { useRef, useState } from "react";

export default function App() {
  const inputRef = useRef(null);   // DOM handle
  const renders = useRef(0);       // mutable value, no re-render
  const [, force] = useState(0);
  renders.current++;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <input ref={inputRef} placeholder="type here" />
      <button onClick={() => inputRef.current.focus()}>Focus input</button>
      <p>render count (via ref): {renders.current}</p>
      <button onClick={() => force((n) => n + 1)}>Re-render</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are React custom hooks and when should you use them?",
    answer: `**Core concept (TL;DR).** A custom hook is a function whose name starts with <code>use</code> and which calls other hooks to **extract and reuse stateful logic** across components. It shares the **logic**, not the state — each component that calls the hook gets its own independent state.

${card(`<svg viewBox="0 0 520 162" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Extract reusable logic; each caller gets its own state</text>
  <rect x="180" y="40" width="160" height="38" rx="9" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="58" fill="#06b6d4" font-size="10.5" font-weight="700" text-anchor="middle">useToggle()</text>
  <text x="260" y="72" fill="currentColor" font-size="8.5" text-anchor="middle">useState + handlers</text>
  <rect x="40" y="116" width="130" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="105" y="137" fill="currentColor" font-size="9" text-anchor="middle">Modal (own state)</text>
  <rect x="195" y="116" width="130" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="260" y="137" fill="currentColor" font-size="9" text-anchor="middle">Sidebar (own state)</text>
  <rect x="350" y="116" width="130" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="415" y="137" fill="currentColor" font-size="9" text-anchor="middle">Dropdown (own state)</text>
  <path d="M 230 78 L 120 114" fill="none" stroke="currentColor" stroke-width="1.3" marker-end="url(#ch-a)"/>
  <path d="M 260 78 L 260 114" fill="none" stroke="currentColor" stroke-width="1.3" marker-end="url(#ch-a)"/>
  <path d="M 290 78 L 400 114" fill="none" stroke="currentColor" stroke-width="1.3" marker-end="url(#ch-a)"/>
  <defs><marker id="ch-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Because hooks compose, you can pull repeated logic (toggle, fetch, debounce, form, localStorage sync) into a function that calls <code>useState</code>/<code>useEffect</code>/etc. and returns whatever the caller needs. The <code>use</code> prefix isn't cosmetic — it's how React (and the linter) know to apply the Rules of Hooks. Crucially, calling a custom hook from two components creates **two separate states**; it's a way to reuse behaviour, not to share a single state (that's Context or a store). Custom hooks keep components small and make logic independently testable.

### Why custom hooks
| Benefit | How |
| --- | --- |
| Reuse logic | one hook, many components |
| Cleaner components | move effects/state out of the UI |
| Testable | test the hook in isolation |
| Composable | hooks can call other hooks |

> **Interview tip:** Emphasise "shares logic, not state — each call is isolated." Name the <code>use</code> prefix requirement (Rules of Hooks) and give a concrete example (<code>useFetch</code>, <code>useDebounce</code>, <code>useLocalStorage</code>).`,
    examples: [
      {
        label: "A useToggle custom hook",
        runnable: false,
        code: `import { useState, useCallback } from "react";

function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle];
}

export default function App() {
  const [open, toggleOpen] = useToggle();   // each caller → its own state
  const [dark, toggleDark] = useToggle(true);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", background: dark ? "#111" : "#fff", color: dark ? "#fff" : "#111" }}>
      <button onClick={toggleOpen}>{open ? "Close" : "Open"} panel</button>
      <button onClick={toggleDark}>Toggle theme</button>
      {open && <p>Panel content</p>}
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Context API in React and when would you use it?",
    answer: `**Core concept (TL;DR).** Context lets you pass data through the component tree **without prop drilling**. You <code>createContext</code>, wrap a subtree in its <code>&lt;Provider value={...}&gt;</code>, and any descendant reads it with <code>useContext</code> — no manual passing through every intermediate component. It's ideal for **global-ish** data: theme, current user/auth, locale.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Provider broadcasts; any descendant consumes directly</text>
  <rect x="180" y="38" width="160" height="36" rx="9" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="61" fill="#06b6d4" font-size="10.5" font-weight="700" text-anchor="middle">ThemeProvider value</text>
  <rect x="60" y="118" width="120" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="120" y="139" fill="currentColor" font-size="9" text-anchor="middle">useContext ✓</text>
  <rect x="340" y="118" width="120" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="400" y="139" fill="currentColor" font-size="9" text-anchor="middle">useContext ✓</text>
  <text x="260" y="100" fill="currentColor" font-size="9" text-anchor="middle">skips the props in between</text>
  <path d="M 230 74 L 130 116" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#cx-a)"/>
  <path d="M 290 74 L 390 116" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#cx-a)"/>
  <defs><marker id="cx-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** <code>createContext(default)</code> returns a context object with a <code>Provider</code>. Components below the provider call <code>useContext(MyContext)</code> to read the current <code>value</code>; when that value changes, **every** consumer re-renders. That last point is the main caveat — Context is a propagation mechanism, not an optimized store, so a frequently-changing value re-renders all consumers. Mitigate by splitting into multiple contexts, memoizing the <code>value</code> object, or moving high-frequency state to a dedicated store (Zustand/Redux). In React 19 you can also render <code>&lt;MyContext&gt;</code> directly as the provider.

### Context fit
| Good for | Reach elsewhere for |
| --- | --- |
| theme, auth, locale, i18n | high-frequency updates |
| low-churn global config | large app-wide state (use a store) |
| avoiding deep prop drilling | server cache (use React Query) |

> **Interview tip:** The key caveat to volunteer: updating a context value re-renders **all** consumers — so memoize the value and split contexts by update frequency. Context solves prop drilling, but it isn't a performance-optimized state manager.`,
    examples: [
      {
        label: "Theme via createContext + useContext",
        runnable: false,
        code: `import { createContext, useContext, useState, useMemo } from "react";

const ThemeContext = createContext("light");

function Toolbar() {
  const theme = useContext(ThemeContext);   // read without props
  return <p>Current theme: <strong>{theme}</strong></p>;
}

export default function App() {
  const [theme, setTheme] = useState("light");
  const value = useMemo(() => theme, [theme]); // memoize the provided value
  return (
    <ThemeContext.Provider value={value}>
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <Toolbar />
        <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
          Toggle
        </button>
      </div>
    </ThemeContext.Provider>
  );
}`,
      },
    ],
  },
];

export default augments;
