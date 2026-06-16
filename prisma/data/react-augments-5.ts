import type { ReactAugment } from "./react-augments.types";

/**
 * React augments — batch 5 (final): global/local state, preventing re-renders,
 * deps-array variants, key-prop variants, design principles, tooling, CSR/SSR,
 * class-vs-function. Keep runnable `code` free of backtick template literals.
 */
const augments: ReactAugment[] = [
  {
    title: "How do you handle global state management in a large React application?",
    answer:
      "Pick the lightest tool that fits, and recognize that 'global state' is really **several kinds** of state:\n\n- **Server/cache state** (data from APIs): use **React Query / SWR / RTK Query** — they handle caching, dedup, retries, and revalidation. Most 'global state' is actually this.\n- **Client/UI global state** (theme, auth, modals): **Context** for low-frequency values; a dedicated store — **Redux Toolkit, Zustand, Jotai, Recoil** — for larger or frequently-updated state.\n- **URL state** (filters, current tab): the router/query string for shareable state.\n- **Local state**: keep it in the component; don't globalize what doesn't need to be.\n\n**Interview tip:** the strong answer **separates server state from client state** and notes that Context alone re-renders all consumers, so for hot global state you want a store with selector-based subscriptions (Zustand/Redux selectors) to scope re-renders.",
    examples: [
      {
        label: "Zustand-style store (read-only)",
        runnable: false,
        code: `import { create } from 'zustand';

// A small global store; components subscribe to slices via selectors,
// so only components reading 'count' re-render when it changes.
const useStore = create(set => ({
  count: 0,
  increment: () => set(s => ({ count: s.count + 1 })),
}));

function Counter() {
  const count = useStore(s => s.count);          // selector -> scoped re-render
  const increment = useStore(s => s.increment);
  return <button onClick={increment}>count: {count}</button>;
}`,
      },
    ],
  },
  {
    title: "How do you manage global state in a large React application?",
    answer:
      "Categorize the state first, then choose:\n\n- **Remote/server data** → a data-fetching cache: **React Query, SWR, RTK Query**. This removes most of the need for a hand-rolled global store.\n- **App-wide client state** (auth, theme, locale) → **Context** when it changes rarely; a store (**Redux Toolkit, Zustand, Jotai**) when it's large or updates often and you need **selector-scoped** re-renders.\n- **Shareable UI state** (current page, filters) → the **URL** via the router.\n- **Everything else** → keep it **local** and lift only as needed.\n\n**Interview tip:** show judgment, not dogma — name Redux Toolkit as the standard for large, structured state with devtools/time-travel, Zustand/Jotai as lighter modern alternatives, and emphasize that Context is dependency injection (re-renders all consumers), not an optimized store.",
    examples: [
      {
        label: "Redux Toolkit slice (read-only)",
        runnable: false,
        code: `import { createSlice, configureStore } from '@reduxjs/toolkit';

const counter = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1; }, // Immer makes this safe/immutable
  },
});

export const { increment } = counter.actions;
export const store = configureStore({ reducer: { counter: counter.reducer } });
// Components use useSelector(s => s.counter.value) and useDispatch().`,
      },
    ],
  },
  {
    title: "How do you manage component-level state without `useState` or `useReducer`?",
    answer:
      "It depends on whether the state needs to **trigger a re-render**:\n\n- **Mutable value that should NOT re-render** → **`useRef`**. `ref.current` persists across renders and is perfect for timers, previous values, instance-like flags, or caching.\n- **State owned elsewhere** → **`useContext`** to consume a value a provider holds, or **`useSyncExternalStore`** to subscribe to an external store (Redux/Zustand/browser APIs) and re-render on its changes.\n- **Derived data** → just compute it during render from props/other state; it doesn't need to be 'state' at all.\n- In **class** components, state lives in `this.state`/`setState`.\n\n**Interview tip:** the honest nuance is that *render-triggering* local state fundamentally comes from `useState`/`useReducer`; the alternatives either (a) don't cause renders (`useRef`), (b) read state owned elsewhere (`useContext`/`useSyncExternalStore`), or (c) are derived values you shouldn't store at all.",
    examples: [
      {
        label: "useRef holds state without re-rendering",
        code: `import { useRef } from 'react';

export default function App() {
  const clicks = useRef(0); // persists across renders, never triggers one
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <button onClick={() => { clicks.current++; console.log('clicks:', clicks.current); }}>
        Click me
      </button>
      <p>Open the console — the ref counts up without re-rendering the UI.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you prevent re-renders in functional components?",
    answer:
      "First, know **why React re-renders**: a component re-renders when its **state changes**, its **parent re-renders**, or a **context it consumes** changes. To cut unnecessary ones:\n\n- **`React.memo`** the child so it skips renders when props are shallow-equal.\n- **`useCallback`/`useMemo`** to keep function/object props referentially stable (so `memo` actually works).\n- **Lift state down / colocate** — keep state close to where it's used so a change doesn't re-render a big tree.\n- **Don't create new objects/arrays/functions inline** as props to memoized children.\n- **Split contexts** and memoize context values so unrelated consumers don't wake up.\n- Use the **`children` prop** trick: passing children through a memoized boundary avoids re-rendering them when the boundary's own state changes.\n\n**Interview tip:** profile first; most re-renders are cheap, and over-memoization adds complexity. Optimize the ones the Profiler flags as hot.",
    examples: [
      {
        label: "memo + useCallback prevent child renders",
        code: `import { useState, useCallback, memo } from 'react';

const Child = memo(function Child({ onClick }) {
  console.log('Child rendered');
  return <button onClick={onClick}>child</button>;
});

export default function App() {
  const [n, setN] = useState(0);
  const onClick = useCallback(() => {}, []); // stable identity
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Child onClick={onClick} />
      <p>n: {n}</p>
      <button onClick={() => setN(v => v + 1)}>Re-render parent</button>
      <p>Console: Child does not re-render when n changes.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you prevent unnecessary re-renders in functional components?",
    answer:
      "Target the three triggers — own state, parent re-render, consumed context — and reduce wasted work:\n\n1. **`React.memo`** for pure children that often get the same props.\n2. **`useCallback`** for handler props and **`useMemo`** for computed object/array props, so memoized children see stable references.\n3. **`useMemo`** to avoid recomputing expensive values each render.\n4. **Colocate state** (move it down to the smallest component) and **split contexts** + memoize their `value` so only relevant consumers re-render.\n5. Avoid inline literals (`style={{...}}`, `onClick={() => ...}`) as props to memoized components.\n\n**Interview tip:** the key insight is **referential equality** — `memo` is shallow, so a fresh object/function prop every render silently defeats it. And always **measure with the Profiler** before optimizing; unnecessary renders are often cheap.",
    examples: [
      {
        label: "useMemo skips expensive recompute",
        code: `import { useState, useMemo } from 'react';

export default function App() {
  const [n, setN] = useState(5);
  const [other, setOther] = useState(0);

  // Recomputes only when n changes, not when 'other' does.
  const sum = useMemo(() => {
    let s = 0; for (let i = 0; i <= n * 100000; i++) s += i; return s;
  }, [n]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>sum: {sum}</p>
      <button onClick={() => setN(v => v + 1)}>n + 1 (recompute)</button>
      <button onClick={() => setOther(v => v + 1)}>other: {other} (no recompute)</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are React Developer Tools?",
    answer:
      "**React Developer Tools** is the official browser extension (and standalone app) for inspecting and profiling React apps. It adds two devtools panels:\n\n- **Components** — view the component tree, select any component to see and **edit** its live **props, state, and hooks**, find which component renders a given DOM node, and jump to its source.\n- **Profiler** — **record** an interaction to see which components re-rendered, how long each render took, and **why** (what props/state/hooks changed), shown as flamegraphs and ranked charts.\n\n**Interview tip:** connect it to workflow — use **Components** to debug 'why is this prop/state wrong?' and the **Profiler** to find and verify fixes for unnecessary or slow re-renders before reaching for `memo`/`useMemo`. It also flags components rendered by Suspense and shows hook names.",
    // Tooling question — no runnable example.
  },
  {
    title: "What are React's design principles?",
    answer:
      "The ideas that shape React's API:\n\n- **Declarative** — describe the UI for a given state; React keeps the DOM in sync. You say *what*, not *how*.\n- **Component-based composition** — build UIs from small, reusable components combined together (composition over inheritance).\n- **Unidirectional data flow** — data flows down via props, changes flow up via callbacks; one source of truth.\n- **Just JavaScript** — logic and markup live together (JSX); no separate templating language.\n- **Learn once, write anywhere** — the same model targets web, native (React Native), and more.\n- **Stability & gradual adoption** — incremental upgrades, codemods, and interop with existing code.\n\n**Interview tip:** the most-cited trio is **declarative, component-based, unidirectional data flow**. Add 'predictability' as the through-line: these constraints make the UI a pure function of state, which is what makes React apps easy to reason about.",
    examples: [
      {
        label: "Declarative + composition in action",
        code: `import { useState } from 'react';

function Stat({ label, value }) {        // small composable component
  return <div>{label}: <strong>{value}</strong></div>;
}

export default function App() {
  const [n, setN] = useState(0);          // UI is a pure function of this state
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Stat label='Count' value={n} />
      <Stat label='Doubled' value={n * 2} />
      <button onClick={() => setN(v => v + 1)}>Increment</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are the core principles behind React's design?",
    answer:
      "React is built on a few core ideas:\n\n1. **UI as a function of state** — `view = f(state)`. Given the same state, you get the same UI, which makes rendering **declarative** and predictable.\n2. **Composition** — assemble complex interfaces from small, independent components rather than inheritance hierarchies.\n3. **Unidirectional data flow** — state flows down as props; updates are explicit ('data down, actions up'), giving a single source of truth.\n4. **The virtual DOM / reconciliation** — let developers re-describe the whole UI on each change while React efficiently computes the minimal real-DOM updates.\n5. **Abstraction over the renderer** — `react` (core) is separate from the renderer (`react-dom`, `react-native`), so the model is portable.\n\n**Interview tip:** tie them together — declarative rendering + one-way flow make the app a **pure function of state**, and the VDOM is what makes that performant. Mention React Fiber + concurrent rendering as the modern evolution.",
    examples: [
      {
        label: "view = f(state)",
        code: `import { useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('off');
  // The rendered output is entirely determined by 'status'.
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>Lamp is {status === 'on' ? 'ON' : 'OFF'}</p>
      <button onClick={() => setStatus(s => (s === 'on' ? 'off' : 'on'))}>Toggle</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are the advantages of using React over plain JavaScript?",
    answer:
      "For non-trivial UIs, React removes a lot of the toil of vanilla DOM work:\n\n- **Declarative vs imperative** — you describe the UI for a state and React updates the DOM; with plain JS you manually find nodes and mutate them, which gets error-prone fast.\n- **Component reuse & composition** — encapsulated, reusable building blocks instead of copy-pasted DOM code.\n- **Efficient updates** — the virtual DOM diffs and batches minimal real-DOM changes; hand-written DOM updates are easy to get wrong or do redundantly.\n- **State-driven UI** — predictable rendering from a single source of truth, no manual DOM/state synchronization.\n- **Huge ecosystem** — routing, forms, data fetching, dev tools, React Native.\n\n**Interview tip:** be balanced — for a tiny static page, plain JS (or no JS) is simpler and lighter; React's value shows up as **UI complexity and state interactions grow**, where manual DOM sync becomes the bug factory React was designed to eliminate.",
    examples: [
      {
        label: "Declarative React vs imperative DOM",
        code: `import { useState } from 'react';

export default function App() {
  // React: describe the UI; no manual querySelector/textContent juggling.
  const [count, setCount] = useState(0);

  // Plain JS equivalent would be something like:
  //   const el = document.querySelector('#count');
  //   button.addEventListener('click', () => { count++; el.textContent = count; });

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p id='count'>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is Strict Mode in React?",
    answer:
      "**Strict Mode** (`<React.StrictMode>`) is a **development-only** tool that wraps part of your tree to surface potential problems early. It renders nothing visible and is a **no-op in production**.\n\nIn development it:\n- Warns about **deprecated/unsafe APIs** (legacy lifecycles, string refs, old context).\n- **Intentionally double-invokes** render functions, state initializers, and effects (mount → unmount → mount) to expose **impure rendering** and **missing effect cleanup**.\n- Helps ensure components are resilient to React's **concurrent** behavior.\n\n**Interview tip:** the thing to clarify is that the **double rendering/effects in dev is intentional**, not a bug — if your code breaks or logs twice under StrictMode, it's revealing a real side-effect or cleanup issue. It never double-runs in production builds.",
    examples: [
      {
        label: "StrictMode surfaces effect issues in dev",
        code: `import { StrictMode, useState, useEffect } from 'react';

function Demo() {
  const [n, setN] = useState(0);
  useEffect(() => {
    console.log('subscribe');
    return () => console.log('unsubscribe'); // dev runs subscribe/unsubscribe/subscribe
  }, []);
  return <button onClick={() => setN(n + 1)}>n = {n}</button>;
}

export default function App() {
  return (
    <StrictMode>
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <Demo />
        <p>Console shows the dev double-invoke of effects.</p>
      </div>
    </StrictMode>
  );
}`,
      },
    ],
  },
  {
    title: "What is dependency array in `useEffect` and `useCallback`?",
    answer:
      "The **dependency array** is the second argument that tells React **which reactive values an effect or memoized callback depends on**, so React knows when to re-run or re-create it.\n\n- **`useEffect(fn, deps)`** runs `fn` after render, and **re-runs it only when a value in `deps` changes**. `[]` = once after mount; omitted = after every render.\n- **`useCallback(fn, deps)`** returns the **same function instance** until a dependency changes — useful for stable props to memoized children or stable effect deps.\n\nThe rule: include **every value from component scope that the callback reads** (props, state, derived values). Omitting one causes **stale closures** (the callback sees old values).\n\n**Interview tip:** mention the **`react-hooks/exhaustive-deps`** ESLint rule that enforces correct deps, and that the array is compared with `Object.is` — so unstable object/function deps cause unwanted re-runs (fix by memoizing them).",
    examples: [
      {
        label: "deps control when the effect re-runs",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('Ada');

  useEffect(() => {
    console.log('runs only when count changes:', count);
  }, [count]); // changing 'name' will NOT re-run this effect

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 8 }}>
      <button onClick={() => setCount(c => c + 1)}>count: {count}</button>
      <input value={name} onChange={e => setName(e.target.value)} />
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the purpose of the `deps` array in `useEffect` and `useCallback`?",
    answer:
      "The `deps` array declares the **reactive dependencies** of a hook so React can decide **when to act**:\n\n- For **`useEffect`**, it controls **when the effect re-runs** — only when a listed value changes (and the cleanup runs before each re-run). `[]` means run once on mount.\n- For **`useCallback`**, it controls **when a new function is created** — React returns the cached function until a dependency changes, preserving referential identity in between.\n\nYou must list **every value from the render scope the callback uses**; leaving one out produces a **stale closure** that reads outdated props/state.\n\n**Interview tip:** frame it as React's way of **memoizing against change**. Note `Object.is` comparison (so unstable object/function deps defeat the optimization) and the `exhaustive-deps` lint rule that keeps your arrays honest.",
    examples: [
      {
        label: "useCallback identity tied to deps",
        code: `import { useState, useCallback, memo } from 'react';

const Btn = memo(function Btn({ onClick, children }) {
  console.log('render', children);
  return <button onClick={onClick}>{children}</button>;
});

export default function App() {
  const [step, setStep] = useState(1);
  const [count, setCount] = useState(0);

  // New function only when 'step' changes -> Btn stays stable across count updates.
  const add = useCallback(() => setCount(c => c + step), [step]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>count: {count}, step: {step}</p>
      <Btn onClick={add}>+ step</Btn>
      <button onClick={() => setStep(s => s + 1)}>step + 1</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the purpose of the `deps` array in `useEffect`?",
    answer:
      "In `useEffect(setup, deps)`, the **dependency array tells React when to re-run the effect**. After each render, React compares each dependency to its previous value (`Object.is`); if any changed, it runs the **cleanup** for the old effect and then runs the effect again.\n\n- `[]` → run **once after mount** (cleanup on unmount).\n- `[a, b]` → run after mount and whenever `a` or `b` change.\n- **Omitted** → run after **every** render.\n\nList **every reactive value the effect reads** (props, state). Omitting one causes a **stale closure** where the effect uses outdated values; including unstable objects causes excess re-runs.\n\n**Interview tip:** describe it as the effect's 'when to synchronize' signal, mention the `react-hooks/exhaustive-deps` lint rule, and the classic bug — an empty `[]` on an effect that actually depends on a prop, leading to stale behavior.",
    examples: [
      {
        label: "Refetch when the id changes",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [id, setId] = useState(1);
  const [loaded, setLoaded] = useState('');

  useEffect(() => {
    setLoaded('loading id ' + id + '...');
    const t = setTimeout(() => setLoaded('loaded item ' + id), 500);
    return () => clearTimeout(t); // cleanup before the next run / on unmount
  }, [id]); // re-runs every time 'id' changes

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>{loaded}</p>
      <button onClick={() => setId(n => n + 1)}>Next id ({id})</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the significance of the `deps` array in `useEffect`?",
    answer:
      "The `deps` array is what makes `useEffect` **efficient and correct**: it scopes the effect so it only re-runs when something it actually depends on changes, instead of after every render.\n\nIts significance:\n- **Performance** — avoids redundant work (re-subscribing, refetching) on unrelated renders.\n- **Correctness** — paired with the cleanup, it ensures the effect re-synchronizes when inputs change (and tears down stale subscriptions first).\n- **Closure freshness** — the effect captures the values listed; omit a used value and you get a **stale closure** bug.\n\n**Interview tip:** the meaningful nuance is that deps aren't just an optimization — they define the effect's **synchronization boundary**. Lying about them (empty array on an effect that reads props/state) is a top source of subtle bugs; the `exhaustive-deps` rule exists precisely to prevent it.",
    examples: [
      {
        label: "Empty deps vs honest deps",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [query, setQuery] = useState('');

  useEffect(() => {
    // With [query], this logs the CURRENT query. With [] it would log only '' forever (stale).
    console.log('searching for:', query);
  }, [query]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Type to search' />
      <p>Open the console as you type.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the purpose of `key` prop when rendering lists in React?",
    answer:
      "The `key` gives each list item a **stable identity** so React's reconciliation can match items between renders. With keys, React can reuse, reorder, insert, and remove elements precisely — preserving each item's DOM and component **state** — instead of rebuilding the list.\n\nRules:\n- Unique **among siblings**.\n- Use a **stable id from the data**; avoid the **array index** when items can reorder, insert, or delete.\n\n**Interview tip:** explain the concrete failure of index keys: delete or prepend an item and every following item shifts index, so React mis-associates state (e.g. an input's text or a checkbox) with the wrong row. Keys are about identity, not just silencing the console warning.",
    examples: [
      {
        label: "Stable keys keep row state correct",
        code: `import { useState } from 'react';

export default function App() {
  const [rows, setRows] = useState([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {rows.map(r => (
        <div key={r.id}>
          {r.id}: <input placeholder='type then remove first' />
        </div>
      ))}
      <button onClick={() => setRows(rs => rs.slice(1))}>Remove first</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the purpose of the `key` prop when rendering lists in React?",
    answer:
      "When you render a list with `.map()`, the **`key`** prop tells React **which item is which** across renders. React uses keys during reconciliation to track elements so it can apply the minimal DOM changes (move/insert/remove) and keep each item's local state attached to the right item.\n\nGuidelines:\n- Keys must be **unique among siblings** and **stable** across renders.\n- Prefer a **data id**; the **array index** is only safe for static lists that never reorder or change length.\n\n**Interview tip:** if asked 'why not the index?', describe the bug: with index keys, inserting/removing/reordering makes React reuse the wrong element, so state and uncontrolled DOM values end up on the wrong row. Also note keys aren't passed to the component as a prop — they're a hint for React.",
    examples: [
      {
        label: "Keys during insert/reorder",
        code: `import { useState } from 'react';

export default function App() {
  const [items, setItems] = useState([{ id: 1, t: 'First' }, { id: 2, t: 'Second' }]);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <ul>{items.map(i => <li key={i.id}>{i.t}</li>)}</ul>
      <button onClick={() => setItems(prev => [{ id: Date.now(), t: 'Inserted' }, ...prev])}>
        Insert at top
      </button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the role of a 'key' prop when rendering lists in React?",
    answer:
      "A `key` acts as a **stable identifier** for each element in a rendered list. Its role is to let React's diffing algorithm **match elements between the previous and next render** so it can reuse existing DOM nodes and component instances where the item is 'the same', and only create/destroy/move what actually changed.\n\nWithout good keys, React falls back to comparing by position, which is wrong as soon as the list reorders or changes length — leading to lost or misplaced state and extra DOM churn.\n\n**Interview tip:** crisp summary — *keys are how React tracks list-item identity across renders*. Use stable, unique ids; reserve the index for static lists. They're consumed by React, not delivered to your component as a regular prop.",
    examples: [
      {
        label: "Reorder preserves keyed item state",
        code: `import { useState } from 'react';

export default function App() {
  const [people, setPeople] = useState([
    { id: 'x', name: 'Ada' },
    { id: 'y', name: 'Grace' },
  ]);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {people.map(p => (
        <label key={p.id} style={{ display: 'block' }}>
          <input type='checkbox' /> {p.name}
        </label>
      ))}
      <button onClick={() => setPeople(prev => [...prev].reverse())}>
        Reverse (checkboxes follow their person)
      </button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the significance of the `key` prop when rendering lists in React?",
    answer:
      "The `key` is significant because it underpins **correct and efficient list updates**. React relies on keys to give each child a persistent identity across renders; this drives the reconciliation diff for lists.\n\nWhy it matters:\n- **Correctness** — component state and uncontrolled DOM (input text, focus, checkbox) stay attached to the right item through inserts/removes/reorders.\n- **Performance** — React moves/reuses existing nodes instead of recreating the whole list.\n\nUse a **stable, unique** key (a data id). The **index** is risky for dynamic lists and is the usual cause of 'state stuck on the wrong row' bugs.\n\n**Interview tip:** the headline is that keys preserve **identity**, and the demonstrable bug from index keys (state following position instead of data) is the answer interviewers are listening for.",
    examples: [
      {
        label: "Index keys would put state on the wrong row",
        code: `import { useState } from 'react';

export default function App() {
  const [list, setList] = useState([{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {list.map(item => (
        <div key={item.id}>{/* stable id, NOT the index */}
          {item.label}: <input placeholder='type, then prepend' />
        </div>
      ))}
      <button onClick={() => setList(prev => [{ id: Date.now() + '', label: 'New' }, ...prev])}>
        Prepend
      </button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the role of a bundler like Webpack in a React project?",
    answer:
      "A **bundler** (Webpack, Vite, Rollup, esbuild, Parcel) takes your many source modules and assets and produces optimized files the browser can load efficiently. In a React project it specifically:\n\n- **Resolves the module graph** from your entry point and **bundles** it (so browsers don't make hundreds of requests).\n- **Transpiles** JSX/TypeScript/modern JS via loaders/plugins (Babel/SWC/esbuild).\n- Handles **assets** — CSS, images, fonts — as part of the graph.\n- Provides a **dev server with Hot Module Replacement** for fast feedback.\n- Optimizes for production: **minification, tree-shaking (dead-code elimination), code-splitting, and hashing** for cache-busting.\n\n**Interview tip:** show awareness that **Webpack powered CRA** historically but the ecosystem has shifted to **Vite** (esbuild dev + Rollup build) for speed. The conceptual role — transform + bundle + optimize + serve — is the same across tools.",
    examples: [
      {
        label: "Minimal Webpack config (read-only)",
        runnable: false,
        code: `module.exports = {
  entry: './src/index.js',
  output: { filename: 'bundle.[contenthash].js', path: __dirname + '/dist' },
  module: {
    rules: [
      { test: /\\.jsx?$/, use: 'babel-loader' }, // transpile JSX/ES via Babel
      { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
};`,
      },
    ],
  },
  {
    title: "What is useMemo and when should you use it?",
    answer:
      "`useMemo(factory, deps)` **caches the result of an expensive computation** and only **recomputes it when a dependency changes**. Between those changes, the same value (and same reference) is returned.\n\nUse it when:\n1. A computation is **genuinely expensive** (large list transforms, heavy math) and runs on every render.\n2. You need a **referentially stable** object/array — e.g. a prop to a `React.memo` child, a context `value`, or a dependency of another hook — so you don't trigger downstream re-renders.\n\n**Interview tip:** the important caveat is **don't over-use it**. Memoization isn't free (it stores the value and compares deps), and for cheap computations it can be net-negative. Reach for it after profiling, or when referential equality matters. It's a performance hint, not a semantic guarantee — React may discard the cache.",
    examples: [
      {
        label: "Memoize an expensive derived value",
        code: `import { useState, useMemo } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [size, setSize] = useState(1000);

  // Expensive: only recomputes when 'size' changes, not on every count click.
  const primes = useMemo(() => {
    const out = [];
    for (let n = 2; n <= size; n++) {
      let p = true;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
      if (p) out.push(n);
    }
    return out;
  }, [size]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>{primes.length} primes up to {size}</p>
      <button onClick={() => setCount(c => c + 1)}>count: {count} (no recompute)</button>
      <button onClick={() => setSize(s => s + 1000)}>increase size (recompute)</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "When would you use `useMemo` or `useCallback`?",
    answer:
      "Both are **memoization hooks** for performance; you use them when **referential stability** or an **expensive computation** matters.\n\n- **`useMemo(fn, deps)`** — when a value is **costly to compute** each render, or when you need a **stable object/array reference** (a prop to a memoized child, a context `value`, or another hook's dependency).\n- **`useCallback(fn, deps)`** — when you pass a **function** to a `React.memo` child (so it isn't re-created every render and break the memoization) or use a function as a **dependency** of `useEffect`/`useMemo`. (`useCallback(fn, d)` is just `useMemo(() => fn, d)`.)\n\n**Interview tip:** the senior answer is *don't reach for them by default*. They add complexity and a small runtime cost, and the deps array can introduce bugs. Use them when the **Profiler** shows an expensive recompute, or when a memoized child / effect dependency **requires** a stable reference — otherwise they're noise.",
    examples: [
      {
        label: "Both together: stable value + stable fn",
        code: `import { useState, useMemo, useCallback, memo } from 'react';

const List = memo(function List({ data, onPick }) {
  console.log('List rendered');
  return <ul>{data.map(d => <li key={d} onClick={() => onPick(d)}>{d}</li>)}</ul>;
});

export default function App() {
  const [tick, setTick] = useState(0);
  const data = useMemo(() => ['Ada', 'Grace', 'Katherine'], []); // stable array
  const onPick = useCallback(name => alert(name), []);            // stable fn

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <List data={data} onPick={onPick} />
      <button onClick={() => setTick(t => t + 1)}>tick: {tick}</button>
      <p>Console: List does not re-render when only tick changes.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "When would you choose a class component over a functional component with hooks?",
    answer:
      "In modern React you'd default to **function components with hooks** for essentially everything. The remaining reasons to reach for a **class** are narrow:\n\n- **Error boundaries** — `getDerivedStateFromError`/`componentDidCatch` exist **only** in classes; there's no hook equivalent (libraries like `react-error-boundary` wrap a class for you).\n- **Legacy lifecycles** — a rare need for `getSnapshotBeforeUpdate` (reading DOM info before a commit), which has no exact hook match.\n- **Working in an existing class-based codebase** for consistency, or maintaining old code.\n\n**Interview tip:** lead with 'I'd use function components + hooks by default' and name **error boundaries** as the one feature still requiring a class. Hooks give better logic reuse (custom hooks), less boilerplate, and no `this` binding pitfalls — so new code is function-first.",
    examples: [
      {
        label: "Error boundary must be a class",
        code: `import { Component } from 'react';

// The one common case where a class is still required.
class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.log(err, info); }
  render() {
    return this.state.hasError ? <p>Fallback UI</p> : this.props.children;
  }
}

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <ErrorBoundary>
        <p>Children render normally unless they throw.</p>
      </ErrorBoundary>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between client-side rendering (CSR) and server-side rendering (SSR) in React?",
    answer:
      "The difference is **where the initial HTML is produced**.\n\n- **CSR** — the server sends a near-empty HTML shell plus a JS bundle; the **browser** runs React to build the DOM. Pros: simple hosting, cheap server, app-like navigation after load. Cons: **slower first paint** (blank until JS loads/runs) and weaker SEO/social-preview out of the box.\n- **SSR** — the **server** renders components to full HTML per request and sends that; the browser shows it immediately, then **hydrates** to attach interactivity. Pros: **faster first contentful paint**, better SEO. Cons: server cost/complexity and a 'time to interactive' gap during hydration.\n\nRelated: **SSG** (pre-render at build time) and **streaming SSR + React Server Components** as modern hybrids.\n\n**Interview tip:** mention you'd use a framework (**Next.js**/Remix) rather than wiring SSR by hand, and that the choice is a trade-off — CSR for app-like, auth-gated dashboards; SSR/SSG for content/SEO-sensitive public pages.",
    examples: [
      {
        label: "CSR mount vs SSR hydrate (read-only)",
        runnable: false,
        code: `// CSR: the browser builds the DOM from scratch.
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')).render(<App />);

// SSR: server sends HTML; the client attaches to existing markup.
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);`,
      },
    ],
  },
];

export default augments;
