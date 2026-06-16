import type { ReactAugment } from "./react-augments.types";

/**
 * React augments — batch 2 (fundamentals, events, data/forms, patterns).
 * Keep example `code` free of backtick template literals (use string
 * concatenation) so this outer template literal needs no escaping.
 */
const augments: ReactAugment[] = [
  {
    title: "Describe the React component lifecycle.",
    answer:
      "A component goes through three phases: **mounting** (added to the DOM), **updating** (re-rendering after props/state change), and **unmounting** (removed).\n\n- In **class** components these map to `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount`.\n- In **function** components there are no lifecycle methods — you express the same things with `useEffect`: `[]` deps ≈ mount (and the returned cleanup ≈ unmount), deps `[a]` ≈ run on changes to `a` (≈ update), and the returned function runs on unmount + before each re-run.\n\n**Interview tip:** the modern framing the React team prefers is *synchronization*, not lifecycle. Rather than 'do X on mount, undo on unmount', think 'this effect keeps the component in sync with an external system, and here's how to set up and tear down that connection'.",
    examples: [
      {
        label: "Mount / update / unmount via effects",
        code: `import { useState, useEffect } from 'react';

function Widget() {
  const [n, setN] = useState(0);

  useEffect(() => {
    console.log('mounted');
    return () => console.log('unmounted (cleanup)');
  }, []); // mount + unmount

  useEffect(() => {
    console.log('updated: n =', n);
  }, [n]); // runs on every change to n

  return <button onClick={() => setN(v => v + 1)}>n = {n}</button>;
}

export default function App() {
  const [show, setShow] = useState(true);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {show && <Widget />}
      <p><button onClick={() => setShow(s => !s)}>{show ? 'Unmount' : 'Mount'} Widget</button></p>
      <p>Watch the console for mount / update / unmount.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you fetch data in React?",
    answer:
      "The classic approach is to call `fetch`/`axios` inside a `useEffect`, tracking three pieces of state: **loading**, **error**, and **data**.\n\nThings to get right:\n- Trigger the request in an effect with the right dependencies (e.g. `[id]` to refetch when the id changes).\n- **Guard against race conditions / stale updates** with an `ignore` flag or an `AbortController` in the cleanup, so a slow earlier request can't overwrite a newer one (or set state after unmount).\n- Render loading and error states, not just the happy path.\n\n**Interview tip:** in real apps you'd usually reach for a data library — **React Query / SWR** (caching, dedup, retries, revalidation) — or a framework's data layer (Next.js server components / route loaders) and **Suspense**, rather than hand-rolling fetch-in-effect everywhere.",
    examples: [
      {
        label: "fetch-in-effect with a stale-response guard",
        code: `import { useState, useEffect } from 'react';

// Stands in for a network request; resolves after 800ms.
function fakeApi() {
  return new Promise(resolve =>
    setTimeout(() => resolve({ name: 'Ada Lovelace' }), 800)
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false; // ignore the result if a newer effect/unmount happened
    setLoading(true);
    fakeApi().then(res => {
      if (!ignore) { setData(res); setLoading(false); }
    });
    return () => { ignore = true; };
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {loading ? <p>Loading...</p> : <p>Fetched user: {data.name}</p>}
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you handle forms in React?",
    answer:
      "Most React forms are **controlled**: each field's `value` comes from state and an `onChange` writes back. A single `onSubmit` handler calls `e.preventDefault()` (to stop the browser's full-page reload) and then does the work.\n\nPractical tips:\n- Use one state object and a generic handler keyed by the input's `name` attribute to avoid a setter per field.\n- Do validation in the change/submit handlers; derive error messages during render.\n\n**Interview tip:** for anything beyond a few fields, mention a form library — **React Hook Form** (uncontrolled + refs, minimal re-renders) or **Formik** — which handle validation, touched/dirty state, and submission for you. Note that `<input type='file'>` is always uncontrolled.",
    examples: [
      {
        label: "Controlled form with one handler",
        code: `import { useState } from 'react';

export default function App() {
  const [form, setForm] = useState({ name: '', email: '' });

  const update = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const submit = e => {
    e.preventDefault(); // stop the browser's default full-page reload
    alert('Submitting: ' + JSON.stringify(form));
  };

  return (
    <form onSubmit={submit} style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 8 }}>
      <input name='name' value={form.name} onChange={update} placeholder='Name' />
      <input name='email' value={form.email} onChange={update} placeholder='Email' />
      <button type='submit'>Submit</button>
      <pre>{JSON.stringify(form, null, 2)}</pre>
    </form>
  );
}`,
      },
    ],
  },
  {
    title: "Explain 'prop drilling' and how to mitigate it.",
    answer:
      "**Prop drilling** is passing a prop down through several layers of components that don't actually use it, only so a deeply-nested descendant can receive it. It makes intermediate components noisy and refactors brittle.\n\nWays to mitigate it:\n1. **Component composition** — pass elements as `children` (or named slot props) so the data-owner renders the consumer directly, skipping the middle layers entirely. Often the simplest fix.\n2. **Context API** — `createContext` + `Provider` + `useContext` to broadcast a value to any descendant.\n3. **A state library** — Redux, Zustand, Jotai — for genuinely global, frequently-updated state.\n\n**Interview tip:** reach for composition *before* Context — a lot of 'drilling' disappears once you let parents pass `children`. Context is great but re-renders all consumers when its value changes.",
    examples: [
      {
        label: "Context removes the drilled prop",
        code: `import { createContext, useContext } from 'react';

const UserContext = createContext(null);

// Deep consumer reads context instead of receiving a drilled prop.
function Avatar() {
  const user = useContext(UserContext);
  return <span>Signed in as {user.name}</span>;
}

function Header() {
  // No 'user' prop has to be threaded through here anymore.
  return <header><Avatar /></header>;
}

export default function App() {
  const user = { name: 'Grace' };
  return (
    <UserContext.Provider value={user}>
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <Header />
      </div>
    </UserContext.Provider>
  );
}`,
      },
    ],
  },
  {
    title: "What are Higher-Order Components (HOCs) in React?",
    answer:
      "A **Higher-Order Component** is a function that **takes a component and returns a new component** with extra behavior or injected props — e.g. `withRouter`, `connect` (Redux). It's a composition pattern for reusing cross-cutting logic, built on the idea that components are just values.\n\nConventions: name it `withX`, pass through unrelated props (`{...props}`), don't mutate the input component, forward refs with `forwardRef`, and copy static methods if needed.\n\n**Interview tip:** HOCs (and render props) have largely been **replaced by custom hooks**, which avoid 'wrapper hell', prop-name collisions, and ref-forwarding ceremony. Be ready to say you'd prefer a hook today, but recognize HOCs in older codebases and libraries.",
    examples: [
      {
        label: "withHighlight HOC",
        code: `// A HOC: takes a component, returns an enhanced one.
function withHighlight(Wrapped) {
  return function Highlighted(props) {
    return (
      <div style={{ border: '2px solid gold', padding: 8, borderRadius: 8 }}>
        <Wrapped {...props} />
      </div>
    );
  };
}

function Hello({ name }) {
  return <p>Hello, {name}!</p>;
}

const HighlightedHello = withHighlight(Hello);

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <HighlightedHello name='Linus' />
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are render props and how do they work?",
    answer:
      "A **render prop** is a prop whose value is a **function that returns JSX**; the component calls it to decide what to render. It lets a component own some logic/state while letting the *caller* control the markup. The function is often passed as `children` (a 'function-as-child').\n\nThis solved the same reuse problem as HOCs — share behavior, vary the UI — without wrapping the component tree.\n\n**Interview tip:** like HOCs, render props are mostly **superseded by custom hooks**, which deliver the same logic-sharing without the nesting/callback indentation. Still worth recognizing (e.g. older `react-router`, `Downshift`, `react-virtualized`).",
    examples: [
      {
        label: "Function-as-child render prop",
        code: `import { useState } from 'react';

// Owns the toggle logic; the caller decides the UI via a function child.
function Toggle({ children }) {
  const [on, setOn] = useState(false);
  return children({ on, toggle: () => setOn(v => !v) });
}

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Toggle>
        {({ on, toggle }) => (
          <button onClick={toggle}>The switch is {on ? 'ON' : 'OFF'}</button>
        )}
      </Toggle>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are React synthetic events?",
    answer:
      "A **SyntheticEvent** is React's lightweight, **cross-browser wrapper** around the native DOM event. It exposes the same interface (`preventDefault()`, `stopPropagation()`, `target`, etc.) but normalizes differences between browsers, so your handlers behave consistently everywhere.\n\nUnder the hood React uses **event delegation**: instead of attaching a listener to every node, it attaches a few listeners at the **root container** (since React 17 — it was `document` before) and dispatches synthetic events from there.\n\n**Interview tip:** two facts that score points: (1) since **React 17** the event-pooling optimization was removed, so you no longer need `e.persist()` to use an event asynchronously; (2) React's delegation root changed from `document` to the **app root**, which matters when embedding multiple React roots or mixing with non-React code.",
    examples: [
      {
        label: "Inspecting a synthetic event",
        code: `export default function App() {
  const handle = e => {
    e.preventDefault(); // normalized across browsers
    console.log('type:', e.type, '| wrapper:', e.constructor.name);
  };
  return (
    <form onSubmit={handle} style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <button type='submit'>Submit (no page reload)</button>
      <p>Check the console for the SyntheticEvent details.</p>
    </form>
  );
}`,
      },
    ],
  },
  {
    title: "How does React handle events?",
    answer:
      "In JSX you attach handlers with **camelCase props** (`onClick`, `onChange`) and pass a **function reference**, not a string. React wraps the native event in a **SyntheticEvent** and dispatches it through **event delegation**: a small number of listeners at the app root handle events for the whole tree, rather than one listener per element.\n\nDifferences from raw DOM:\n- You can't `return false` to prevent default — call `e.preventDefault()`.\n- Handler names are camelCase and values are functions.\n\n**Interview tip:** delegation is why adding thousands of clickable rows doesn't add thousands of DOM listeners. Mention that since React 17 the delegation target is the root container, not `document`.",
    examples: [
      {
        label: "One delegated handler for many buttons",
        code: `export default function App() {
  // A single handler; React delegates from one root-level listener.
  const handleClick = e => alert('You clicked: ' + e.target.textContent);
  return (
    <div
      onClick={handleClick}
      style={{ fontFamily: 'sans-serif', padding: 24, display: 'flex', gap: 8 }}
    >
      <button>One</button>
      <button>Two</button>
      <button>Three</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between state and props?",
    answer:
      "Both are plain data that influence what a component renders, but ownership differs:\n\n- **Props** are **inputs passed in from the parent**. They are **read-only** inside the receiving component — it must never modify them. They flow **down** the tree (unidirectional).\n- **State** is data the component **owns and manages internally**, created with `useState`/`useReducer`. It's private and can change over time; updating it (via the setter) triggers a re-render.\n\n**Interview tip:** crisp summary — *props are passed to a component; state is managed within a component*. When two components need the same data, **lift state up** to a common parent and pass it back down as props.",
    examples: [
      {
        label: "Owned state passed down as a prop",
        code: `import { useState } from 'react';

function Display({ value }) { // 'value' is a read-only prop
  return <p>Prop received: {value}</p>;
}

export default function App() {
  const [count, setCount] = useState(0); // state owned here
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Display value={count} />
      <button onClick={() => setCount(c => c + 1)}>Update state</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between element and component in React?",
    answer:
      "A **React element** is a plain, **immutable** JavaScript object that *describes* what you want on screen — its `type` (a tag string or a component) and its `props`. It's what JSX (`<App />`) and `React.createElement(...)` produce. Elements are cheap to create and are thrown away/recreated each render.\n\nA **component** is a **function (or class)** that takes props and **returns elements** — a reusable template/factory.\n\n**Interview tip:** the one-liner: *components are the recipe, elements are the description React uses to cook*. `<Profile />` is an element whose `type` is the `Profile` component. React reconciles by comparing element trees, not component source.",
    examples: [
      {
        label: "Element is an object; component is a function",
        code: `import { createElement } from 'react';

// A component: a function that returns elements.
function Badge({ label }) {
  return <span>{label}</span>;
}

export default function App() {
  // An element: a lightweight object describing what to render.
  const element = <Badge label='I am an element' />;
  console.log('element.type === Badge ?', createElement(Badge, {}).type === Badge);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {element}
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are React Components?",
    answer:
      "**Components** are the building blocks of a React UI: independent, reusable pieces that take **props**, optionally manage **state**, and return **elements** describing what to render. You compose small components into larger ones to build the whole interface.\n\nTwo kinds: **function components** (the modern default — plain functions that use Hooks) and **class components** (legacy, using lifecycle methods).\n\nRules: a component's name must be **capitalized** (so JSX treats it as a component, not a DOM tag), and ideally it's as **pure** as possible — same props/state produce the same output.\n\n**Interview tip:** emphasize **composition** — passing `children` and combining small focused components is how React scales, rather than deep inheritance hierarchies.",
    examples: [
      {
        label: "Composition with children",
        code: `function Card({ title, children }) {
  return (
    <section style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Card title='Reusable card'>
        <p>This paragraph is passed in as children and composed inside Card.</p>
      </Card>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is React and its main features?",
    answer:
      "**React** is an open-source JavaScript **library** for building user interfaces out of components, maintained by Meta.\n\nMain features:\n- **Declarative** — you describe the UI for a given state and React updates the DOM to match.\n- **Component-based** — compose encapsulated components into complex UIs.\n- **Virtual DOM + reconciliation** — efficient, minimal real-DOM updates.\n- **Unidirectional data flow** — predictable state changes.\n- **JSX** — markup-like syntax that compiles to `createElement`.\n- **Hooks** — state and side effects in function components.\n- **Huge ecosystem** and 'learn once, write anywhere' (React Native).\n\n**Interview tip:** call it a **library, not a framework** — it owns the view layer; you add routing, data fetching, etc. yourself, or adopt a framework like **Next.js** that builds on it.",
    examples: [
      {
        label: "React in a nutshell: UI as a function of state",
        code: `import { useState } from 'react';

export default function App() {
  const [liked, setLiked] = useState(false);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <button onClick={() => setLiked(l => !l)}>{liked ? 'Liked' : 'Like'}</button>
      <p>Declarative + component-based + state-driven.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are React Hooks? Name a few common ones.",
    answer:
      "**Hooks** are functions (named `use*`) that let **function components** use React features — state, lifecycle-style side effects, context — without writing classes. Introduced in **React 16.8**.\n\nCommon ones:\n- `useState` — local state.\n- `useEffect` — side effects / external synchronization.\n- `useContext` — read context.\n- `useRef` — mutable value / DOM access without re-render.\n- `useReducer` — state via a reducer.\n- `useMemo` / `useCallback` — memoize a value / a function.\n- `useLayoutEffect`, `useId`, `useTransition` — more specialized.\n\n**Rules of Hooks:** call them only **at the top level** (never in loops/conditions) and only from **components or other hooks**.\n\n**Interview tip:** the big motivation was reusing **stateful logic** across components (via custom hooks) — something HOCs/render props did awkwardly.",
    examples: [
      {
        label: "Several hooks together",
        code: `import { useState, useEffect, useRef } from 'react';

export default function App() {
  const [count, setCount] = useState(0);   // useState
  const prev = useRef(0);                   // useRef

  useEffect(() => { prev.current = count; }, [count]); // useEffect

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>Now: {count}, previous: {prev.current}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the purpose of `React.StrictMode`?",
    answer:
      "`<React.StrictMode>` is a **development-only** helper that wraps part of your tree and turns on extra checks. It renders no visible UI and has **zero effect in production**.\n\nWhat it does in dev:\n- Warns about **deprecated/unsafe lifecycles** and legacy APIs (string refs, legacy context).\n- **Double-invokes** render functions, initializers, and effects (mount → unmount → mount) to help you catch **impure renders** and **missing effect cleanup**.\n- Helps you find code that isn't resilient to React's concurrent behavior.\n\n**Interview tip:** the double-rendering/effects in dev is **intentional**, not a bug — if something breaks or logs twice, it's surfacing a real side-effect or cleanup problem. It never doubles in production.",
    examples: [
      {
        label: "Effects run twice in dev StrictMode",
        code: `import { StrictMode, useEffect, useState } from 'react';

function Demo() {
  useEffect(() => { console.log('effect ran'); }, []);
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>n = {n}</button>;
}

export default function App() {
  return (
    <StrictMode>
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <Demo />
        <p>Open the console: the effect runs twice on mount in dev.</p>
      </div>
    </StrictMode>
  );
}`,
      },
    ],
  },
  {
    title: "Why should we not update state directly?",
    answer:
      "From your code's point of view, React state is **immutable**: you should always update it through the setter (`setState` / the `useState` updater), never by mutating the existing value.\n\nIf you mutate directly (e.g. `state.items.push(x)` then `setState(state.items)`):\n- React compares the **reference** with `Object.is`; since it's the **same array/object**, it may **bail out and skip the re-render**.\n- You break features that rely on a stable previous snapshot (concurrent rendering, `React.memo`, `useMemo` deps).\n- It makes bugs non-deterministic.\n\nInstead, produce a **new** object/array (`[...prev, x]`, `{ ...prev, k: v }`, `map`, `filter`).\n\n**Interview tip:** the crisp reason is *referential equality* — React decides whether to re-render by comparing references, so a brand-new reference is what signals 'something changed'.",
    examples: [
      {
        label: "Mutation is ignored; immutable update re-renders",
        code: `import { useState } from 'react';

export default function App() {
  const [list, setList] = useState(['a', 'b']);

  const wrong = () => {
    list.push('c');   // mutates in place -> same reference -> no re-render
    setList(list);
  };
  const right = () => setList(prev => [...prev, 'c']); // new array -> re-renders

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>{list.join(', ')}</p>
      <button onClick={wrong}>Mutate (broken)</button>
      <button onClick={right}>Immutable update (works)</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "When would you use `useLayoutEffect` instead of `useEffect`?",
    answer:
      "Both run after render, but at different times:\n- **`useEffect`** runs **asynchronously, after the browser paints**. The user may briefly see the pre-effect frame.\n- **`useLayoutEffect`** runs **synchronously, after the DOM is mutated but before paint**. React will flush its work and re-render before the browser shows anything.\n\nUse `useLayoutEffect` when you must **read layout** (measure size/position) and then **mutate it synchronously** to avoid a visible flicker — e.g. positioning a tooltip/popover relative to a target, or measuring before paint.\n\n**Interview tip:** default to `useEffect`; reach for `useLayoutEffect` only to prevent a flash, because it **blocks painting** (overuse hurts perf). Also note it doesn't run during SSR and warns there — guard or use `useEffect` on the server.",
    examples: [
      {
        label: "Measure the DOM before paint",
        code: `import { useLayoutEffect, useRef, useState } from 'react';

export default function App() {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Reads layout and updates state BEFORE the browser paints -> no flicker.
  useLayoutEffect(() => {
    setWidth(boxRef.current.getBoundingClientRect().width);
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <div ref={boxRef} style={{ background: '#eee', padding: 16, borderRadius: 8 }}>
        This box was measured synchronously: {Math.round(width)}px wide.
      </div>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
