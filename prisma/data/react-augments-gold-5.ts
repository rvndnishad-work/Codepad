/**
 * React Phase R1 — Batch 5 (Performance & re-renders). Gold-standard rewrites.
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
    title: "What is `React.memo` and when would you use it?",
    answer: `**Core concept (TL;DR).** <code>React.memo</code> is a higher-order component that **memoizes** a component: it skips re-rendering when the new props are **shallowly equal** to the previous ones. Use it for components that render often with the **same props** and are non-trivial to render — but only when their props are referentially stable.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Parent re-renders; memoized child checks props first</text>
  <rect x="170" y="38" width="180" height="34" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="60" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">Parent re-renders</text>
  <rect x="60" y="104" width="160" height="34" rx="8" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="140" y="125" fill="currentColor" font-size="9" text-anchor="middle">props same → SKIP ✓</text>
  <rect x="300" y="104" width="160" height="34" rx="8" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/>
  <text x="380" y="125" fill="currentColor" font-size="9" text-anchor="middle">props changed → render</text>
  <path d="M 230 72 L 150 102" stroke="currentColor" stroke-width="1.3" marker-end="url(#mm-a)"/>
  <path d="M 290 72 L 370 102" stroke="currentColor" stroke-width="1.3" marker-end="url(#mm-a)"/>
  <defs><marker id="mm-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** By default a child re-renders whenever its parent does, even if its props didn't change. Wrapping it in <code>React.memo</code> makes React do a **shallow comparison** of props and bail out of the render if they're equal — saving the render + diff cost. It pairs with <code>useCallback</code>/<code>useMemo</code> in the parent to keep function/object props stable (otherwise the shallow check always fails). You can pass a custom comparison function as the second argument for fine control. Memo is an **optimization, not a guarantee** — don't rely on it for correctness.

### When memo helps
| Good fit | Poor fit |
| --- | --- |
| pure component, same props often | props change every render |
| moderately expensive render | trivially cheap component |
| stable (memoized) props | new object/fn props each render |

> **Interview tip:** Say it does a **shallow props comparison** and needs stable props to help (hence <code>useCallback</code>/<code>useMemo</code>). Don't wrap everything — profile first. (The React Compiler aims to automate most of this.)`,
    examples: [
      {
        label: "Memoized child skips needless renders",
        runnable: false,
        code: `import { memo, useState, useCallback } from "react";

const Child = memo(function Child({ onClick }) {
  console.log("Child rendered");
  return <button onClick={onClick}>Child button</button>;
});

export default function App() {
  const [count, setCount] = useState(0);
  // stable identity → memo can actually skip Child on count changes
  const onClick = useCallback(() => console.log("clicked"), []);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setCount((c) => c + 1)}>Parent count: {count}</button>
      <Child onClick={onClick} />
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When does `React.memo` do nothing — or actually hurt performance?",
    answer: `**Core concept (TL;DR).** <code>React.memo</code> only helps when props are **referentially stable**. If the parent passes a **new object, array, or function** every render (e.g. an inline <code>{}</code> or arrow), the shallow comparison always fails and the child re-renders anyway — now with the *extra* cost of the comparison. It also adds overhead for trivially cheap components.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Unstable props defeat the shallow check</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">inline prop ✗</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">&lt;Child style={{…}} /&gt;</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">new object each render</text>
  <text x="135" y="124" fill="#ef4444" font-size="9" text-anchor="middle">memo never skips + compare cost</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">stable prop ✓</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">useMemo / useCallback</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">same reference</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">memo can skip the render</text>
</svg>`)}

**How it works.** Memo compares props with <code>Object.is</code> per key. Inline objects/arrays/functions are **new references** every render, so they're never "equal" — the child renders regardless, and you've paid for a pointless comparison. The same happens if you pass <code>children</code> as freshly-created JSX. Memo is also a net loss for components that are cheaper to render than to compare (e.g. a tiny label). The fixes: stabilize props with <code>useMemo</code>/<code>useCallback</code>, lift content into stable <code>children</code>, or simply don't memoize. Always **profile** before reaching for it.

### Why memo can fail/hurt
| Cause | Effect |
| --- | --- |
| inline object/array/fn props | comparison always fails |
| fresh <code>children</code> JSX | re-renders anyway |
| trivially cheap component | compare costs more than render |
| over-memoizing everywhere | memory + comparison overhead |

> **Interview tip:** The headline: memo needs **referentially stable props**; inline objects/functions silently break it. Mention profiling and that memoizing cheap components is a net negative. (React Compiler removes most manual memoization.)`,
    examples: [
      {
        label: "An inline object prop defeats memo",
        runnable: false,
        code: `import { memo, useState } from "react";

const Box = memo(function Box({ style }) {
  console.log("Box rendered");       // logs on EVERY parent render below
  return <div style={style}>Boxed</div>;
});

export default function App() {
  const [n, setN] = useState(0);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setN((x) => x + 1)}>render {n}</button>
      {/* new object literal each render → memo can never skip Box */}
      <Box style={{ padding: 8 }} />
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you optimize performance in a React application?",
    answer: `**Core concept (TL;DR).** **Measure first** (React Profiler / DevTools), then apply targeted fixes: **code-split** with <code>lazy</code>/Suspense, **virtualize** long lists, **memoize** hot paths (<code>memo</code>/<code>useMemo</code>/<code>useCallback</code>), cut unnecessary re-renders (stable props, move state down, split context), and ship a **production build**. Don't optimize blindly.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Profile → fix the real bottleneck</text>
  <g font-size="9">
    <rect x="20" y="40" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="56" fill="currentColor">measure: Profiler / Lighthouse</text>
    <rect x="20" y="70" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="86" fill="currentColor">code-split: lazy + Suspense</text>
    <rect x="20" y="100" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="116" fill="currentColor">virtualize long lists</text>
  </g>
  <g font-size="9">
    <rect x="268" y="40" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="56" fill="currentColor">memoize hot paths</text>
    <rect x="268" y="70" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="86" fill="currentColor">cut re-renders (stable props)</text>
    <rect x="268" y="100" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="280" y="116" fill="currentColor">production build + transitions</text>
  </g>
</svg>`)}

**How it works.** Most perf problems are one of: a huge initial bundle, re-rendering too much, or rendering too many DOM nodes. **Code-splitting** (<code>React.lazy</code> + <code>Suspense</code>, route-based chunks) shrinks the first load. **List virtualization** (react-window/virtuoso) renders only visible rows. **Memoization** avoids redundant work, but only with stable props. Marking non-urgent updates with <code>useTransition</code>/<code>useDeferredValue</code> keeps the UI responsive. Beyond React: debounce expensive handlers, lazy-load images, and always test the **production** build (dev is much slower). The cardinal rule is to profile and fix the *actual* bottleneck rather than memoizing everything.

### Optimization toolbox
| Problem | Fix |
| --- | --- |
| big initial bundle | code-split (<code>lazy</code> + Suspense) |
| long lists | virtualization |
| excessive re-renders | <code>memo</code> + stable props, move state down |
| janky heavy updates | <code>useTransition</code> / <code>useDeferredValue</code> |

> **Interview tip:** Lead with "measure first (Profiler)." Then group fixes into bundle (code-split), render count (memo/stable props), and node count (virtualize). Mention <code>useTransition</code> and testing the production build.`,
    examples: [
      {
        label: "Route-level code splitting",
        runnable: false,
        code: `import { lazy, Suspense, useState } from "react";

// each lazy import becomes its own chunk, loaded on demand
const Settings = lazy(() => import("./Settings.js"));

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setOpen(true)}>Open settings</button>
      {open && (
        <Suspense fallback={<p>Loading…</p>}>
          <Settings />              {/* code for Settings loads only now */}
        </Suspense>
      )}
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you optimize React component rendering?",
    answer: `**Core concept (TL;DR).** Reduce both **how often** a component renders and **how much** each render costs. Skip needless renders with <code>React.memo</code> + stable props, **move state down** so updates touch a small subtree, **lift slow content into <code>children</code>**, memoize expensive calculations with <code>useMemo</code>, keep **stable keys**, and avoid creating new objects/functions inline.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Render less often · render less work</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="64" fill="#06b6d4" font-size="10.5" font-weight="700" text-anchor="middle">fewer renders</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">memo + stable props</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">move state down / colocate</text>
  <text x="135" y="124" fill="currentColor" font-size="9" text-anchor="middle">children to skip subtrees</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="385" y="64" fill="#8b5cf6" font-size="10.5" font-weight="700" text-anchor="middle">cheaper renders</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">useMemo expensive calc</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">stable keys, no inline objects</text>
  <text x="385" y="124" fill="currentColor" font-size="9" text-anchor="middle">virtualize big lists</text>
</svg>`)}

**How it works.** A parent's render re-renders all its children by default. The cheapest win is **structural**: keep state as close as possible to where it's used (colocation) so a change re-renders a small subtree, not the whole page. When a heavy child genuinely shouldn't re-render, <code>memo</code> it and feed it stable props, or pass it through <code>children</code> from a parent that doesn't change. For costly computations during render, cache them with <code>useMemo</code>. Use stable, unique **keys** so list reconciliation moves nodes instead of rebuilding them, and avoid inline object/function props that break memoization. Measure with the Profiler's "why did this render" highlights.

### Rendering wins
| Lever | Technique |
| --- | --- |
| fewer renders | colocate state, <code>memo</code>, stable props |
| skip subtrees | pass them as <code>children</code> |
| cheaper render | <code>useMemo</code> for heavy calc |
| big lists | virtualization + stable keys |

> **Interview tip:** Start with **state colocation** (move state down) before memoizing — it's the highest-leverage fix. Then memo + stable props, <code>children</code> to skip subtrees, and <code>useMemo</code>/virtualization for render cost.`,
    examples: [
      {
        label: "Move state down so siblings don't re-render",
        runnable: false,
        code: `import { useState } from "react";

// ✅ state lives inside SearchBox, so typing doesn't re-render <ExpensiveList/>
function SearchBox() {
  const [q, setQ] = useState("");
  return <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search" />;
}
function ExpensiveList() {
  console.log("list rendered");        // not re-rendered on each keystroke
  return <ul><li>item</li></ul>;
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <SearchBox />
      <ExpensiveList />
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you prevent unnecessary re-renders in functional components?",
    answer: `**Core concept (TL;DR).** Stop a render before it starts, or stop it from cascading. Wrap pure children in <code>React.memo</code> and feed them **stable props** (<code>useCallback</code>/<code>useMemo</code>); **colocate** state so changes touch a small subtree; pass slow subtrees as <code>children</code>; and **split or memoize Context** so consumers don't all re-render. Don't over-optimize cheap components.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Four levers against needless renders</text>
  <g font-size="9" text-anchor="middle">
    <rect x="20" y="44" width="115" height="44" rx="8" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="77" y="63" fill="currentColor">memo +</text><text x="77" y="77" fill="currentColor">stable props</text>
    <rect x="143" y="44" width="115" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="200" y="63" fill="currentColor">colocate</text><text x="200" y="77" fill="currentColor">state down</text>
    <rect x="266" y="44" width="115" height="44" rx="8" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="323" y="63" fill="currentColor">children to</text><text x="323" y="77" fill="currentColor">skip subtree</text>
    <rect x="389" y="44" width="111" height="44" rx="8" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="444" y="63" fill="currentColor">split/memo</text><text x="444" y="77" fill="currentColor">context</text>
  </g>
  <text x="260" y="118" fill="currentColor" font-size="9.5" text-anchor="middle">profile first — don't memoize cheap components</text>
</svg>`)}

**How it works.** Children re-render when their parent does. <code>React.memo</code> bails out when props are shallowly equal — but only if those props keep the same identity, which is why callbacks/objects need <code>useCallback</code>/<code>useMemo</code>. The most robust fix is structural: **colocate** state so the re-render scope is small, and hand expensive subtrees to a component via <code>children</code> so they keep a stable element reference. For Context, remember updating a value re-renders **every** consumer — so split contexts by update frequency and memoize the provided value. Use functional state updates (<code>setX(x =&gt; …)</code>) to avoid stale-value-driven extra renders. Always confirm with the Profiler.

### Prevention techniques
| Technique | Stops |
| --- | --- |
| <code>memo</code> + stable props | parent-driven child renders |
| state colocation | wide re-render scope |
| <code>children</code> passthrough | re-rendering a stable subtree |
| split/memoize Context | all-consumer re-renders |

> **Interview tip:** Emphasise that memo needs **stable props** (so <code>useCallback</code>/<code>useMemo</code>), and that **moving state down** and **passing children** often beat memoization. Call out the Context "re-renders all consumers" trap.`,
    examples: [
      {
        label: "Stable callback lets memo skip the child",
        runnable: false,
        code: `import { memo, useState, useCallback } from "react";

const Row = memo(function Row({ onSelect, label }) {
  console.log("Row rendered:", label);
  return <button onClick={() => onSelect(label)}>{label}</button>;
});

export default function App() {
  const [count, setCount] = useState(0);
  const onSelect = useCallback((l) => console.log("selected", l), []); // stable
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setCount((c) => c + 1)}>count {count}</button>
      <Row onSelect={onSelect} label="A" />   {/* skipped on count change */}
      <Row onSelect={onSelect} label="B" />
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you avoid re-renders with composition instead of memoization?",
    answer: `**Core concept (TL;DR).** If a component holds state but also renders an expensive subtree that doesn't depend on that state, pass the subtree in as <code>children</code> (or a prop). Because the element is created by the **parent above the state**, its reference stays the same across the stateful component's renders — so React skips re-rendering it, **without any <code>memo</code>**.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Stable children element → React reuses it</text>
  <rect x="160" y="38" width="200" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="260" y="60" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">App (creates children once)</text>
  <rect x="40" y="104" width="180" height="34" rx="8" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/>
  <text x="130" y="125" fill="currentColor" font-size="9" text-anchor="middle">Counter (state) — re-renders</text>
  <rect x="300" y="104" width="180" height="34" rx="8" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="390" y="125" fill="currentColor" font-size="9" text-anchor="middle">{children} — same ref, skipped</text>
  <path d="M 230 72 L 130 102" stroke="currentColor" stroke-width="1.3" marker-end="url(#co-a)"/>
  <path d="M 290 72 L 390 102" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#co-a)"/>
  <defs><marker id="co-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** React only re-renders a child when its element is **newly created** during the parent's render. When you move the stateful logic into a wrapper that renders <code>{children}</code>, the children element is produced one level up (in a component that *isn't* re-rendering), so its reference is unchanged when the wrapper's state updates — React reuses the previous result and skips it. This "lift content up, push state down" pattern gives you memo-like behaviour with zero memoization API, and it composes cleanly. It's the idiomatic alternative to wrapping the expensive child in <code>React.memo</code>.

### Composition vs memo
| | composition (children) | <code>React.memo</code> |
| --- | --- | --- |
| API needed | none | wrap + stable props |
| Mechanism | stable element reference | shallow props compare |
| Fragility | robust | breaks on inline props |
| Bonus | cleaner component structure | per-component opt-in |

> **Interview tip:** The key sentence: "children created above the state keep a stable reference, so React skips them." It's a free, robust alternative to <code>memo</code> — "move state down, pass content as children."`,
    examples: [
      {
        label: "Expensive child untouched by state changes",
        runnable: false,
        code: `import { useState } from "react";

function Expensive() {
  console.log("Expensive rendered");   // logs ONCE, not on each count change
  return <p>Heavy subtree</p>;
}

function Counter({ children }) {
  const [n, setN] = useState(0);
  return (
    <div>
      <button onClick={() => setN(n + 1)}>count {n}</button>
      {children}                         {/* same element ref across renders */}
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Counter><Expensive /></Counter>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What causes stale closures in React hooks, and how do you fix them correctly?",
    answer: `**Core concept (TL;DR).** A stale closure happens when a function created during one render **captures** the props/state from that render and is later called when those values are outdated — so it "sees" old data. The usual culprits are effects/callbacks with **missing or wrong dependencies**. Fix with correct deps, **functional state updates**, or a **ref** holding the latest value.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Closure captures the render it was created in</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">stale ✗</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">setInterval reads count</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">deps [] → captures count=0</text>
  <text x="135" y="124" fill="#ef4444" font-size="9" text-anchor="middle">always logs the old value</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">fixed ✓</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">setCount(c =&gt; c + 1)</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">or correct deps / ref</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">sees the latest value</text>
</svg>`)}

**How it works.** Every render creates fresh functions that close over that render's variables. If an effect with <code>[]</code> sets up a <code>setInterval</code> that reads <code>count</code>, it forever sees the initial <code>count</code> — a stale closure. The correct fixes, in order of preference: (1) include the value in the dependency array (the effect re-subscribes with fresh values — let <code>exhaustive-deps</code> guide you); (2) use a **functional updater** (<code>setCount(c =&gt; c + 1)</code>) so you don't need to read the current value at all; (3) when you need the latest value but don't want to re-run the effect, keep it in a **ref** that you update each render and read inside the callback. Avoid the anti-pattern of silencing the lint rule.

### Fixes
| Approach | Use when |
| --- | --- |
| correct deps | effect should react to the value |
| functional update <code>setX(x => …)</code> | next state depends on previous |
| ref (<code>ref.current = latest</code>) | need latest without re-subscribing |
| <code>useEffectEvent</code> (RFC) | separate "latest" reads from deps |

> **Interview tip:** Explain capture: functions close over the render that made them. Prefer **functional updates** and **correct deps**; use a **ref** for "latest value without re-running." Don't disable <code>exhaustive-deps</code> to hide the bug.`,
    examples: [
      {
        label: "Functional update beats the stale closure",
        runnable: false,
        code: `import { useState, useEffect } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // ❌ const id = setInterval(() => setCount(count + 1), 1000);
    //    captures count=0 forever → stuck at 1
    // ✅ functional update reads the latest value, no dependency needed
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []); // safe: we never read 'count' directly here

  return <h3 style={{ fontFamily: "system-ui", padding: 24 }}>Count: {count}</h3>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When would you use `useLayoutEffect` instead of `useEffect`?",
    answer: `**Core concept (TL;DR).** Use <code>useLayoutEffect</code> when you must **read or change the DOM before the browser paints** — typically measuring layout (size/position) and synchronously adjusting it to avoid a visible flicker. It runs **synchronously after DOM mutations but before paint**; <code>useEffect</code> runs **after** paint (asynchronously). Default to <code>useEffect</code>.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Before paint (layout) vs after paint (effect)</text>
  <g font-size="9" text-anchor="middle">
    <rect x="20" y="58" width="110" height="34" rx="7" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/><text x="75" y="78" fill="currentColor">DOM mutated</text>
    <rect x="150" y="58" width="130" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><text x="215" y="73" fill="currentColor">useLayoutEffect</text><text x="215" y="85" fill="currentColor" font-size="7.5">sync, measure/adjust</text>
    <rect x="300" y="58" width="80" height="34" rx="7" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="340" y="78" fill="currentColor">paint</text>
    <rect x="400" y="58" width="100" height="34" rx="7" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/><text x="450" y="73" fill="currentColor">useEffect</text><text x="450" y="85" fill="currentColor" font-size="7.5">async, after</text>
  </g>
  <path d="M 130 75 L 148 75" stroke="currentColor" stroke-width="1.2" marker-end="url(#le-a)"/>
  <path d="M 280 75 L 298 75" stroke="currentColor" stroke-width="1.2" marker-end="url(#le-a)"/>
  <path d="M 380 75 L 398 75" stroke="currentColor" stroke-width="1.2" marker-end="url(#le-a)"/>
  <defs><marker id="le-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Both run after React updates the DOM, but timing differs. <code>useEffect</code> is deferred until **after** the browser paints, so if your effect repositions an element, the user may see it jump (a flash of the wrong layout). <code>useLayoutEffect</code> runs **before** paint, letting you measure with <code>getBoundingClientRect</code> and mutate synchronously so the user only sees the final result — ideal for tooltips/popovers positioning, measuring text, or syncing scroll. The trade-off: it **blocks painting**, so heavy work hurts perceived performance, and it doesn't run during server rendering (use <code>useEffect</code> or guard for SSR). Rule of thumb: reach for <code>useEffect</code> first; switch only to fix a visible flicker.

### useEffect vs useLayoutEffect
| | <code>useEffect</code> | <code>useLayoutEffect</code> |
| --- | --- | --- |
| Timing | after paint (async) | before paint (sync) |
| Blocks paint | no | yes |
| Use for | most effects, data, subscriptions | DOM measure/mutate, no flicker |
| SSR | runs on client | warns on server |

> **Interview tip:** "Layout effect runs **before paint** — use it to measure/mutate the DOM and avoid flicker; everything else uses <code>useEffect</code>." Note it blocks paint (perf cost) and doesn't run during SSR.`,
    examples: [
      {
        label: "Measure before paint to avoid flicker",
        runnable: false,
        code: `import { useRef, useState, useLayoutEffect } from "react";

export default function App() {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    // measured before the browser paints → no visible jump
    setWidth(boxRef.current.getBoundingClientRect().width);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div ref={boxRef} style={{ width: "60%", background: "#def" }}>Resize me</div>
      <p>Measured width: {Math.round(width)}px</p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
