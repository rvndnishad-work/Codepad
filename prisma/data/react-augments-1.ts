import type { ReactAugment } from "./react-augments.types";

/**
 * React augments — batch 1 (core hooks + fundamentals).
 * `code` examples avoid backtick template literals on purpose so this outer
 * template literal needs no escaping; use string concatenation instead.
 */
const augments: ReactAugment[] = [
  {
    title: "Explain the purpose of `useEffect`.",
    answer:
      "`useEffect` lets a function component run **side effects** — work that reaches outside React's render output: data fetching, subscriptions, timers, logging, or manually touching the DOM.\n\n- It runs **after** the render is committed to the screen (asynchronously, after paint), so it never blocks the browser from showing the UI.\n- The **dependency array** controls *when* it re-runs: `[]` = once after mount; `[a, b]` = whenever `a` or `b` change; omitted = after every render.\n- Returning a function gives you a **cleanup** that runs before the next effect and on unmount.\n\n**Interview tip:** the mental model React pushes is *synchronization with an external system*, not 'lifecycle'. Don't use it to compute values you can derive during render — that's an extra render and a common anti-pattern.",
    examples: [
      {
        label: "Sync document.title with state",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  // Side effect: keep the tab title in sync after each commit.
  useEffect(() => {
    document.title = 'Count: ' + count;
  }, [count]); // re-run only when count changes

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>The browser tab title now reads: Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between `useState` and `useReducer`?",
    answer:
      "Both store local state; they differ in *how you update it*.\n\n- **`useState`** is best for simple, independent values (`const [open, setOpen] = useState(false)`). You set the next value directly.\n- **`useReducer`** centralizes update logic in a pure `reducer(state, action)` function and gives you `dispatch(action)`. Reach for it when state has **multiple sub-values that change together**, when the **next state depends on the previous** in non-trivial ways, or when you want update logic that's easy to **test in isolation**.\n\nThey're interchangeable in power — `useState` is literally a `useReducer` under the hood.\n\n**Interview tip:** a good signal to switch is 'I have five `setX` calls that always fire together' or 'transitions are better described as named actions'. `dispatch` is also stable, so passing it deep down avoids the stale-callback problems plain setters can cause.",
    examples: [
      {
        label: "Counter as a reducer",
        code: `import { useReducer } from 'react';

function reducer(state, action) {
  switch (action.type) {
    case 'inc':   return { count: state.count + 1 };
    case 'dec':   return { count: state.count - 1 };
    case 'reset': return { count: 0 };
    default:      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h2>{state.count}</h2>
      <button onClick={() => dispatch({ type: 'dec' })}>-</button>
      <button onClick={() => dispatch({ type: 'inc' })}>+</button>
      <button onClick={() => dispatch({ type: 'reset' })}>reset</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Describe the `useRef` hook and its typical use cases.",
    answer:
      "`useRef(initial)` returns a stable, mutable object `{ current }` that **persists across renders** and — crucially — **does not trigger a re-render** when you change it.\n\nTwo main uses:\n1. **Accessing a DOM node** imperatively: attach `ref={myRef}` and read `myRef.current` (focus an input, measure size, integrate a non-React widget).\n2. **Holding a mutable value** between renders without rendering on change: timer/interval IDs, the previous value of a prop, a 'has-mounted' flag.\n\n**Interview tip:** the headline is *refs are escape hatches*. Mutating `ref.current` is invisible to React's render cycle, so never store render-affecting data there — use state for that. Also don't read/write DOM refs during render; do it in effects or event handlers.",
    examples: [
      {
        label: "DOM access + a render-silent counter",
        code: `import { useRef, useEffect, useState } from 'react';

export default function App() {
  const inputRef = useRef(null);
  const renderCount = useRef(0);
  const [, force] = useState(0);

  renderCount.current++; // mutating a ref does NOT cause a re-render

  useEffect(() => {
    inputRef.current.focus(); // imperative DOM access after mount
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <input ref={inputRef} placeholder='Auto-focused on mount' />
      <p>This component has rendered {renderCount.current} time(s).</p>
      <button onClick={() => force(n => n + 1)}>Force re-render</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between useMemo and useCallback?",
    answer:
      "Both cache something between renders based on a dependency array; they differ in *what* they cache.\n\n- **`useMemo(fn, deps)`** caches the **return value** of `fn`. Use it to skip an expensive recomputation, or to keep a referentially-stable object/array.\n- **`useCallback(fn, deps)`** caches the **function itself**. It's exactly `useMemo(() => fn, deps)`. Use it to keep a stable function identity so a `React.memo` child doesn't re-render, or so a function is a stable `useEffect` dependency.\n\n**Interview tip:** don't sprinkle these everywhere — memoization has its own cost and the deps array can introduce bugs. Add them when you've measured an expensive computation, or when referential equality actually matters (memoized children, effect deps).",
    examples: [
      {
        label: "Memoized value + stable callback",
        code: `import { useState, useMemo, useCallback, memo } from 'react';

const Child = memo(function Child({ onClick }) {
  console.log('Child rendered');
  return <button onClick={onClick}>Increment via child</button>;
});

export default function App() {
  const [count, setCount] = useState(0);
  const [n, setN] = useState(10);

  // useMemo: cache an expensive computed value, recompute only when n changes.
  const factorial = useMemo(() => {
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
  }, [n]);

  // useCallback: stable identity so memo(Child) skips re-render on count change.
  const handleChild = useCallback(() => setCount(c => c + 1), []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>{n}! = {factorial}</p>
      <p>count: {count}</p>
      <button onClick={() => setN(x => x + 1)}>n + 1</button>
      <Child onClick={handleChild} />
      <p>Open the console: Child logs only when its props actually change.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is `React.memo` and when would you use it?",
    answer:
      "`React.memo(Component)` is a higher-order component that **memoizes the rendered output**: if the new props are **shallow-equal** to the previous props, React reuses the last render and skips re-rendering the component (and its subtree).\n\nUse it for a presentational/pure component that:\n- renders often because a parent re-renders, but\n- usually receives the **same props**.\n\nYou can pass a custom comparator as the second argument for non-shallow checks.\n\n**Interview tip:** `memo` only helps if props are *stable*. An inline object, array, or arrow-function prop is a new reference every render and silently defeats it — that's why `memo` is usually paired with `useCallback`/`useMemo` for those props. Don't wrap everything; profile first.",
    examples: [
      {
        label: "Memoized child skips parent re-renders",
        code: `import { useState, memo } from 'react';

const Greeting = memo(function Greeting({ name }) {
  console.log('Greeting rendered for ' + name);
  return <p>Hello, {name}!</p>;
});

export default function App() {
  const [tick, setTick] = useState(0);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Greeting name='Ada' />
      <p>tick: {tick}</p>
      <button onClick={() => setTick(t => t + 1)}>Re-render parent</button>
      <p>Console: Greeting logs once even as the parent re-renders.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the Context API in React?",
    answer:
      "The Context API shares a value with a whole subtree **without passing props through every level** (it solves prop drilling). Three pieces: `createContext(default)`, a `<Context.Provider value={...}>` wrapping the tree, and `useContext(Context)` to read it in any descendant.\n\nGood for relatively **stable, app-wide** data: theme, current user/auth, locale, a design-system config.\n\n**Interview tip:** the key caveat is performance — **every consumer re-renders when the provider's `value` changes**, and passing a fresh object literal as `value` re-renders consumers every render. Memoize the value, and split into multiple small contexts so unrelated consumers aren't woken up. Context is a transport mechanism, not a full state manager.",
    examples: [
      {
        label: "Theme via context (no prop drilling)",
        code: `import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext('light');

function Toolbar() {
  // Reads context directly — no props threaded through intermediate components.
  const theme = useContext(ThemeContext);
  return <p>Current theme: <strong>{theme}</strong></p>;
}

export default function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <Toolbar />
        <button onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
          Toggle theme
        </button>
      </div>
    </ThemeContext.Provider>
  );
}`,
      },
    ],
  },
  {
    title: "What are keys in React lists?",
    answer:
      "A `key` is a special prop that gives each element in a list a **stable identity** across renders. During reconciliation React uses keys to match the new children against the previous ones, so it can reuse, reorder, insert, or remove DOM nodes (and preserve each item's component state) instead of rebuilding the list.\n\nRules:\n- Keys must be **unique among siblings** (not globally).\n- Use a **stable id from your data**. Avoid the **array index** when the list can reorder, insert, or delete — index keys make React associate the wrong state/DOM with the wrong item.\n\n**Interview tip:** be ready to explain the concrete bug: with index keys, deleting the first item makes every following item shift up and inherit the previous item's local state (e.g. an input's text), because React thinks index 0 is still 'the same' element.",
    examples: [
      {
        label: "Stable ids, not array index",
        code: `import { useState } from 'react';

export default function App() {
  const [items, setItems] = useState([
    { id: 1, text: 'Use stable ids' },
    { id: 2, text: 'Avoid index keys when reordering' },
  ]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
      <button onClick={() => setItems(prev => [{ id: Date.now(), text: 'New item' }, ...prev])}>
        Prepend item
      </button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between a controlled and an uncontrolled component?",
    answer:
      "It's about **who owns the form element's value**.\n\n- **Controlled:** React state is the single source of truth. You set `value={state}` and update it in `onChange`. The DOM only ever shows what state says. Easy to validate, transform, disable, or reset programmatically.\n- **Uncontrolled:** the DOM keeps its own internal value; React doesn't track it. You set an initial `defaultValue` and read the current value imperatively via a `ref` when you need it (e.g. on submit).\n\n**Interview tip:** default to controlled for anything with validation, conditional UI, or formatting. Uncontrolled is fine for simple forms, file inputs (`<input type='file'>` is always uncontrolled), or wrapping non-React widgets — and it avoids a re-render per keystroke.",
    examples: [
      {
        label: "Controlled vs uncontrolled side by side",
        code: `import { useState, useRef } from 'react';

export default function App() {
  const [controlled, setControlled] = useState('');
  const uncontrolledRef = useRef(null);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 12 }}>
      <div>
        <label>Controlled: </label>
        <input value={controlled} onChange={e => setControlled(e.target.value)} />
        <p>React state sees: {controlled || '(empty)'}</p>
      </div>
      <div>
        <label>Uncontrolled: </label>
        <input defaultValue='hi' ref={uncontrolledRef} />
        <button onClick={() => alert(uncontrolledRef.current.value)}>Read DOM value</button>
      </div>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are React custom hooks and when should you use them?",
    answer:
      "A **custom hook** is just a function whose name starts with `use` and which calls other hooks. It lets you **extract and reuse stateful logic** — subscriptions, timers, form handling, data fetching — across components.\n\nKey points:\n- It shares **logic, not state**: each component that calls the hook gets its own independent state.\n- The `use` prefix is what lets the linter enforce the Rules of Hooks (call at top level, not in loops/conditions).\n\n**Interview tip:** the win over the old HOC/render-props patterns is no 'wrapper hell' and a flat, composable API. A good custom hook has a focused responsibility and returns a small, ergonomic interface (a value + a couple of actions).",
    examples: [
      {
        label: "useToggle custom hook",
        code: `import { useState, useCallback } from 'react';

// Reusable stateful logic extracted into a custom hook.
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn(v => !v), []);
  return [on, toggle];
}

export default function App() {
  const [open, toggleOpen] = useToggle();
  const [dark, toggleDark] = useToggle(true);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 8 }}>
      <button onClick={toggleOpen}>Panel is {open ? 'open' : 'closed'}</button>
      <button onClick={toggleDark}>Mode is {dark ? 'dark' : 'light'}</button>
      <p>Each useToggle() call keeps its own independent state.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of 'lifting state up' in React.",
    answer:
      "When two or more components need to reflect or change the **same data**, you move that state **up to their closest common ancestor** and pass it down as props — along with callbacks to update it. The ancestor becomes the single source of truth and the children become controlled.\n\nThis keeps siblings in sync without duplicated, drifting copies of the same state.\n\n**Interview tip:** lifting state up is the *first* tool to mention for shared state, before Context or a global store. The trade-off is that it can lead to prop drilling if the common ancestor is far away — which is exactly when Context or a state library starts to earn its keep.",
    examples: [
      {
        label: "Two inputs sharing one source of truth",
        code: `import { useState } from 'react';

function Field({ label, value, onChange }) {
  return (
    <div>
      <label>{label}: </label>
      <input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export default function App() {
  // State lives in the common ancestor; both children stay in sync.
  const [text, setText] = useState('');
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 8 }}>
      <Field label='Field A' value={text} onChange={setText} />
      <Field label='Field B' value={text} onChange={setText} />
      <p>Shared value: {text || '(type in either box)'}</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is JSX?",
    answer:
      "JSX is a **syntax extension** to JavaScript that lets you write markup-like code inside JS. It is *not* HTML and is not understood by browsers — a compiler (Babel / the TypeScript or SWC toolchain) transforms each tag into a `React.createElement(...)` call (or the modern `jsx()` runtime), which returns a plain **React element object** describing what to render.\n\nNotables:\n- Embed JS expressions with `{ }`.\n- Attributes are camelCase: `className`, `onClick`, `htmlFor`.\n- A component must return a **single root** (use a Fragment to group siblings).\n\n**Interview tip:** the one-liner is 'JSX is syntactic sugar for `createElement`'. It's optional — you could write `createElement` by hand — but it makes UI declarative and readable, and the `{}` expression escape hatch is plain JavaScript, not a templating language.",
    examples: [
      {
        label: "JSX compiles to createElement",
        code: `import { createElement } from 'react';

export default function App() {
  // These two produce the exact same React element.
  const withJsx = <h3 className='title'>Hello from JSX</h3>;
  const withoutJsx = createElement(
    'h3',
    { className: 'title' },
    'Hello from createElement'
  );

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {withJsx}
      {withoutJsx}
      <p>{1 + 2} — any JS expression fits inside braces</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are fragments in React?",
    answer:
      "A **Fragment** lets a component return **multiple children without adding an extra DOM node**. Write it as the shorthand `<>...</>` or the explicit `<React.Fragment>...</React.Fragment>`.\n\nWhy it matters:\n- A component can only return one root element; a Fragment groups siblings without a wrapper `<div>`.\n- It avoids 'div soup' that can break CSS flexbox/grid or produce invalid HTML (e.g. extra wrappers inside a `<table>`/`<tr>`).\n- The **explicit** form accepts a `key`, which the shorthand can't — useful when mapping to groups of elements.\n\n**Interview tip:** mention the keyed-fragment case; it's the one thing `<>...</>` can't do.",
    examples: [
      {
        label: "Keyed fragments in a list",
        code: `import { Fragment } from 'react';

const glossary = [
  { id: 1, term: 'JSX', def: 'Syntax that compiles to createElement' },
  { id: 2, term: 'Hook', def: 'Reusable stateful logic in a function' },
];

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <dl>
        {glossary.map(item => (
          // Group two nodes per item with no extra wrapper element.
          <Fragment key={item.id}>
            <dt><strong>{item.term}</strong></dt>
            <dd>{item.def}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are Error Boundaries in React?",
    answer:
      "An **error boundary** is a component that **catches JavaScript errors thrown during rendering, in lifecycle methods, and in the constructors of its child tree**, logs them, and renders a fallback UI instead of letting the whole component tree unmount (a blank screen).\n\nIt must be a **class component** that implements `static getDerivedStateFromError()` (to render the fallback) and/or `componentDidCatch(error, info)` (to log). There's no Hook equivalent yet.\n\nWhat it does **not** catch: errors inside **event handlers**, **asynchronous** code (timeouts, promises), and **server-side rendering**, and errors thrown in the boundary itself.\n\n**Interview tip:** wrap independent sections (a widget, a route) in their own boundaries so one failure degrades gracefully instead of taking down the page. In practice many teams use the `react-error-boundary` library to get a hook-friendly API.",
    examples: [
      {
        label: "Boundary catching a child that throws",
        code: `import { Component, useState } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.log('Boundary caught:', error.message); }
  render() {
    if (this.state.hasError) return <p style={{ color: 'crimson' }}>Something went wrong.</p>;
    return this.props.children;
  }
}

function Boom() {
  const [explode, setExplode] = useState(false);
  if (explode) throw new Error('Kaboom during render');
  return <button onClick={() => setExplode(true)}>Trigger a render error</button>;
}

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the Virtual DOM in React.",
    answer:
      "The **Virtual DOM (VDOM)** is a lightweight in-memory tree of plain JavaScript objects (React elements) that describes what the UI should look like. When state changes, React builds a **new** VDOM tree, **diffs** it against the previous one (a process called reconciliation), and then applies the **minimal set of real-DOM mutations** needed to match it.\n\nWhy it helps: direct DOM manipulation is verbose and the real DOM is expensive to mutate/layout. The VDOM lets you write **declarative** code ('UI as a function of state') while React figures out the efficient imperative updates and **batches** them.\n\n**Interview tip:** correct the myth — the VDOM isn't inherently 'faster than the DOM'. Its value is letting you program declaratively while minimizing and batching costly real-DOM writes. Keys are what make the diff for lists efficient.",
    examples: [
      {
        label: "React patches only what changed",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>Static label — never touched in the real DOM after first paint.</p>
      {/* Each tick: React diffs the new VDOM and patches ONLY this text node. */}
      <p>Tick: {new Date(time).toLocaleTimeString()}</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the purpose of the cleanup function in useEffect?",
    answer:
      "The function you **return** from a `useEffect` callback is its **cleanup**. React runs it (a) right **before re-running** the effect because a dependency changed, and (b) when the component **unmounts**.\n\nIts job is to undo what the effect set up so you don't leak resources or act on a stale render: clear timers/intervals, unsubscribe from stores or sockets, remove event listeners, abort in-flight fetches.\n\n**Interview tip:** the subtlety interviewers probe is that cleanup runs **before every re-run**, not only on unmount — so each effect/cleanup pair is matched. Also, in React 18 **StrictMode (dev only)** mounts, unmounts, and remounts components once on purpose, running effect→cleanup→effect, which surfaces missing or incorrect cleanup.",
    examples: [
      {
        label: "Interval with cleanup",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    // Cleanup: clear the previous timer before re-running or on unmount.
    return () => clearInterval(id);
  }, [running]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>Seconds: {seconds}</p>
      <button onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Resume'}</button>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
