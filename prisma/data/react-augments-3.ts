import type { ReactAugment } from "./react-augments.types";

/**
 * React augments — batch 3 (advanced internals, rendering, SSR, tooling).
 * Examples that need extra deps (TypeScript, react-router, testing libs, SSR
 * APIs) are marked runnable:false so they render as static code (no broken
 * Open-in-Playground button against the JS-only empty-react template).
 * Keep runnable `code` free of backtick template literals.
 */
const augments: ReactAugment[] = [
  {
    title: "Describe the benefits of using TypeScript with React.",
    answer:
      "TypeScript adds **static types** to React, catching a whole class of bugs at author-time instead of runtime:\n\n- **Typed props & state** — passing the wrong shape, a missing required prop, or a typo'd field is a compile error. It replaces and far exceeds `PropTypes`.\n- **Autocomplete & refactoring** — the editor knows your component APIs, hook return types, and event types (`React.ChangeEvent<HTMLInputElement>`), so renames and IntelliSense are reliable.\n- **Self-documenting contracts** — a `Props` interface is living documentation.\n- **Safer hooks** — generics like `useState<User | null>(null)` and `useRef<HTMLInputElement>(null)` make intent explicit.\n\n**Interview tip:** the trade-off is some build/config overhead and a learning curve (generics, discriminated unions for reducer actions). Net win on any non-trivial codebase, especially with multiple contributors.",
    examples: [
      {
        label: "Typed props (TSX — read-only)",
        runnable: false,
        code: `type ButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

function Button({ label, variant = 'primary', onClick }: ButtonProps) {
  return <button className={variant} onClick={onClick}>{label}</button>;
}

// <Button /> with a missing 'label' or a bad variant is a COMPILE error.`,
      },
    ],
  },
  {
    title: "Explain React Suspense and its use cases.",
    answer:
      "**Suspense** lets a component 'wait' for something (a lazily-loaded chunk, or data) and **declaratively show a fallback** in the meantime, instead of you wiring up loading flags everywhere.\n\nUse cases:\n- **Code splitting** — `React.lazy(() => import('./Heavy'))` wrapped in `<Suspense fallback={<Spinner/>}>` defers loading a component's JS until it's rendered.\n- **Data fetching** — Suspense-enabled data sources (React Query, Relay, or a framework's loaders) and React Server Components let a component suspend while data loads.\n- **Streaming SSR** — the server can stream HTML and reveal suspended sections as they resolve.\n\n**Interview tip:** the key idea is **declarative loading states** — the fallback lives at the boundary, not scattered through children. Pair it with **error boundaries** to handle the failure case.",
    examples: [
      {
        label: "Lazy load behind a Suspense boundary (read-only)",
        runnable: false,
        code: `import { Suspense, lazy } from 'react';

const Chart = lazy(() => import('./Chart')); // its JS loads only when rendered

export default function App() {
  return (
    <Suspense fallback={<p>Loading chart...</p>}>
      <Chart />
    </Suspense>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of 'composition' in React components.",
    answer:
      "**Composition** is building complex UI by **combining small, focused components** rather than via inheritance. React strongly favors composition over class-style inheritance.\n\nKey techniques:\n- **`children`** — a generic 'slot' so a container (Card, Modal, Layout) can wrap arbitrary content it doesn't know about.\n- **Named slot props** — pass elements as props (`<Page sidebar={<Nav/>} content={<Feed/>} />`) for multiple slots.\n- **Specialization** — a specific component renders a generic one with preset props.\n\n**Interview tip:** composition is the standard answer to 'how do I reuse UI without inheritance?' and it also defeats prop drilling — a parent can pass `children` straight to where they're needed, skipping intermediate layers.",
    examples: [
      {
        label: "children + a named slot",
        code: `function Panel({ title, footer, children }) {
  return (
    <section style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
      <h3>{title}</h3>
      <div>{children}</div>
      <hr />
      <small>{footer}</small>
    </section>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Panel title='Composed' footer='Footer slot'>
        <p>This body is passed via children; the footer via a named prop.</p>
      </Panel>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of reconciliation in React.",
    answer:
      "**Reconciliation** is React's algorithm for figuring out **how to update the DOM** when a component re-renders. It diffs the **new element tree** against the **previous one** and applies the minimal set of mutations.\n\nIt relies on two heuristics to stay O(n):\n1. **Different element types ⇒ rebuild.** A `<div>` becoming a `<span>` (or component A becoming B) tears down the old subtree and builds a new one.\n2. **Keys identify list children.** Stable `key`s let React match items across renders so it can move/reuse them instead of recreating — and preserve their state.\n\n**Interview tip:** connect it to keys and to *type changing resets state* — e.g. conditionally rendering `<Input/>` in two different parent positions, or swapping component types, can unexpectedly remount and lose state. React Fiber is the *implementation* that makes reconciliation interruptible.",
    examples: [
      {
        label: "Keys preserve item state across reorders",
        code: `import { useState } from 'react';

export default function App() {
  const [items, setItems] = useState([
    { id: 'a', label: 'Apple' },
    { id: 'b', label: 'Banana' },
  ]);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {items.map(it => (
        <div key={it.id}>
          {it.label}: <input placeholder='type, then reverse' />
        </div>
      ))}
      <button onClick={() => setItems(prev => [...prev].reverse())}>
        Reverse — inputs follow their keyed item
      </button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you handle asynchronous operations in React functional components?",
    answer:
      "Async work (fetches, timers, subscriptions) belongs in **`useEffect`** — never make the effect callback itself `async` (it would return a promise, which React treats as the cleanup function). Instead define an async function inside and call it.\n\nThe must-haves:\n- A **cleanup** that cancels/ignores in-flight work (`AbortController`, or an `ignore` flag) to avoid setting state after unmount and to dodge race conditions.\n- Track **loading/error/data** so the UI reflects the async lifecycle.\n\n**Interview tip:** the two gotchas interviewers look for are (1) 'don't make `useEffect`'s callback async' and (2) 'guard against stale responses / state updates after unmount'. For heavy data needs, mention React Query / SWR.",
    examples: [
      {
        label: "Async inside useEffect, with a guard",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    let ignore = false;
    async function run() {                  // async fn declared INSIDE the effect
      setStatus('loading');
      await new Promise(r => setTimeout(r, 700)); // simulate awaitable work
      if (!ignore) setStatus('done');
    }
    run();
    return () => { ignore = true; };        // ignore stale result on unmount
  }, []);

  return <p style={{ fontFamily: 'sans-serif', padding: 24 }}>Status: {status}</p>;
}`,
      },
    ],
  },
  {
    title: "How do you handle memory leaks in React?",
    answer:
      "Memory leaks in React almost always come from **side effects that outlive the component** — a timer still firing, a subscription still open, or an async callback that calls `setState` after unmount.\n\nPrevent them by **cleaning up in `useEffect`**:\n- `clearInterval`/`clearTimeout` for timers.\n- Unsubscribe from event emitters, sockets, or store listeners.\n- `removeEventListener` for any listener you added.\n- Abort fetches (`AbortController`) or use an `ignore` flag so a late response doesn't update unmounted state.\n\n**Interview tip:** name the classic warning — updating state on an unmounted component — and that the **returned cleanup function** is the fix. React 18 StrictMode's double-mount in dev is specifically designed to surface missing cleanups.",
    examples: [
      {
        label: "Clean up the timer to avoid a leak",
        code: `import { useState, useEffect } from 'react';

function Ticker() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN(v => v + 1), 500);
    return () => clearInterval(id); // without this, the timer leaks after unmount
  }, []);
  return <span>tick {n}</span>;
}

export default function App() {
  const [show, setShow] = useState(true);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {show && <Ticker />}
      <p><button onClick={() => setShow(s => !s)}>{show ? 'Unmount' : 'Mount'}</button></p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you handle routing in React applications?",
    answer:
      "React itself has no router — you add one, most commonly **React Router**. It maps **URL paths to components** and updates the view without a full page reload (client-side routing), using the History API.\n\nCore pieces (React Router v6): a `<BrowserRouter>`, `<Routes>` with nested `<Route path element>`, `<Link>`/`<NavLink>` for navigation, `useParams`/`useNavigate`/`useSearchParams` hooks, and nested routes with `<Outlet>`.\n\nAlternatives: a **framework router** — Next.js (file-system routing, server components) or Remix.\n\n**Interview tip:** be ready to contrast client-side routing (fast in-app transitions, but you handle code-splitting and SEO) with framework/file-based routing that also gives SSR and data loading. Mention lazy-loading routes with `React.lazy` + Suspense.",
    examples: [
      {
        label: "React Router v6 sketch (read-only)",
        runnable: false,
        code: `import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to='/'>Home</Link> | <Link to='/about'>About</Link>
      </nav>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/about' element={<About />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}`,
      },
    ],
  },
  {
    title: "How do you handle side effects in functional components?",
    answer:
      "Side effects — anything that reaches outside pure render: data fetching, subscriptions, timers, manual DOM work, logging — go in **`useEffect`** (or `useLayoutEffect` when you must run before paint).\n\nThe model:\n- The effect callback runs **after** the render is committed.\n- The **dependency array** declares what the effect reads, so React re-runs it only when those change.\n- The **returned cleanup** tears down the previous effect before re-running and on unmount.\n\n**Interview tip:** the modern guidance is that `useEffect` is for **synchronizing with external systems**, not for reacting to renders. If you're using an effect just to compute state from other state, you probably want a value derived during render instead — that's a frequent code-review flag.",
    examples: [
      {
        label: "An effect that syncs with an external system",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {                 // cleanup: detach the listeners
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return <p style={{ fontFamily: 'sans-serif', padding: 24 }}>You are {online ? 'online' : 'offline'}.</p>;
}`,
      },
    ],
  },
  {
    title: "How do you interact with external APIs in React?",
    answer:
      "Call the API with `fetch` or `axios` from inside a **`useEffect`** (for load-on-mount/param-change) or from an **event handler** (for user-triggered actions like submit). Track **loading / error / data**, and clean up to avoid stale updates.\n\nGood practices:\n- Centralize calls in a small **API/service module** rather than scattering `fetch` through components.\n- Handle non-2xx responses (`fetch` doesn't reject on HTTP errors — check `res.ok`).\n- Cancel in-flight requests on unmount/param change (`AbortController`).\n\n**Interview tip:** for anything beyond trivial, recommend **React Query / SWR** (caching, dedup, retries, background revalidation) or framework data loaders — hand-rolled fetch-in-effect doesn't scale well.",
    examples: [
      {
        label: "Fetch on mount with loading/error states",
        code: `import { useState, useEffect } from 'react';

// Simulated API: resolves with data, or you could reject to test errors.
function getUser() {
  return new Promise(resolve => setTimeout(() => resolve({ name: 'Hopper' }), 700));
}

export default function App() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let ignore = false;
    getUser()
      .then(data => { if (!ignore) setState({ loading: false, error: null, data }); })
      .catch(err => { if (!ignore) setState({ loading: false, error: err.message, data: null }); });
    return () => { ignore = true; };
  }, []);

  if (state.loading) return <p>Loading...</p>;
  if (state.error) return <p>Error: {state.error}</p>;
  return <p style={{ fontFamily: 'sans-serif', padding: 24 }}>User: {state.data.name}</p>;
}`,
      },
    ],
  },
  {
    title: "How do you optimize React component rendering?",
    answer:
      "The goal is to **avoid unnecessary re-renders and expensive work**. A toolkit, in rough order:\n\n1. **Measure first** with the React DevTools Profiler — don't guess.\n2. **`React.memo`** to skip re-rendering a child whose props didn't change (shallow compare).\n3. **`useMemo`** for expensive computations; **`useCallback`** to keep prop functions referentially stable so `memo` works.\n4. **Stable keys** in lists; avoid index keys on dynamic lists.\n5. **Lift state down / colocate** — keep state as local as possible so changes don't re-render large trees; split big contexts.\n6. **Virtualize** long lists (react-window) and **code-split** with `lazy`/Suspense.\n\n**Interview tip:** stress that over-memoizing is itself a cost; optimize what the profiler shows is hot, and remember an inline object/array/function prop silently defeats `memo`.",
    examples: [
      {
        label: "memo + useCallback keep a child stable",
        code: `import { useState, useCallback, memo } from 'react';

const Row = memo(function Row({ onPick, label }) {
  console.log('render', label);
  return <button onClick={onPick}>{label}</button>;
});

export default function App() {
  const [count, setCount] = useState(0);
  const pick = useCallback(() => setCount(c => c + 1), []); // stable identity
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Row onPick={pick} label='A' />
      <Row onPick={pick} label='B' />
      <p>count: {count} — console shows rows don't re-render on count change.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you optimize performance in a React application?",
    answer:
      "Split it into **render performance** and **load performance**.\n\nRender: memoize hot components (`React.memo`), memoize expensive values/functions (`useMemo`/`useCallback`), keep state local, use stable keys, and **virtualize** long lists. Profile with the DevTools Profiler before optimizing.\n\nLoad: **code-split** routes/components with `React.lazy` + Suspense, lazy-load images, and reduce bundle size (tree-shaking, analyze with a bundle analyzer). Consider **SSR/SSG** (Next.js) for faster first paint and SEO.\n\nData: cache and dedupe network requests (React Query/SWR), debounce expensive handlers.\n\n**Interview tip:** lead with 'measure first' — the Profiler and a bundle analyzer — then apply targeted fixes. Premature memoization everywhere adds complexity without proven benefit.",
    examples: [
      {
        label: "Code-split a heavy component",
        runnable: false,
        code: `import { Suspense, lazy } from 'react';

// Heavy component is split into its own chunk, loaded only when shown.
const Dashboard = lazy(() => import('./Dashboard'));

export default function App() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <Dashboard />
    </Suspense>
  );
}`,
      },
    ],
  },
  {
    title: "How do you pass data between components in React?",
    answer:
      "Depends on the relationship:\n\n- **Parent → child:** **props**.\n- **Child → parent:** pass a **callback** prop down; the child calls it with data (events bubble up as function calls).\n- **Between siblings:** **lift state up** to their common parent, then pass it (and a setter) to both.\n- **Across a deep/wide tree:** **Context** (avoid prop drilling) or a **state library** (Redux/Zustand) for large global state.\n- **Via the URL:** route params / query string for shareable state.\n\n**Interview tip:** show you reach for the *lightest* tool first — props and lifting state up handle most cases; Context and global stores are for when that becomes drilling or the state is truly app-wide.",
    examples: [
      {
        label: "Down via props, up via a callback",
        code: `import { useState } from 'react';

function AddButton({ onAdd }) {            // receives a callback prop
  return <button onClick={() => onAdd(1)}>+1</button>;
}

export default function App() {
  const [total, setTotal] = useState(0);   // parent owns the state
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>Total: {total}</p>
      <AddButton onAdd={amt => setTotal(t => t + amt)} />
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you test React components?",
    answer:
      "The mainstream stack is **Jest/Vitest** (test runner + assertions) plus **React Testing Library (RTL)**, which encourages testing **behavior the user sees**, not implementation details.\n\nApproach:\n- **Render** the component, **query** by accessible roles/text (`getByRole`, `getByText`), **interact** via `userEvent` (click/type), then **assert** on the resulting DOM.\n- Mock network/timers as needed; use `findBy*` for async UI.\n- Layer in **integration** tests for flows and **E2E** (Playwright/Cypress) for critical paths.\n\n**Interview tip:** the RTL mantra — 'the more your tests resemble how users use your app, the more confidence they give'. Avoid asserting on state/internal methods; query the way a user (and assistive tech) would.",
    examples: [
      {
        label: "React Testing Library test (read-only)",
        runnable: false,
        code: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from './Counter';

test('increments on click', async () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /increment/i });
  await userEvent.click(button);
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});`,
      },
    ],
  },
  {
    title: "How does React Fiber work?",
    answer:
      "**Fiber** is React's reconciliation engine (since React 16). It reimplemented the previous synchronous, recursive reconciler as a **linked list of 'fiber' nodes** that React can process **incrementally**.\n\nWhy that matters:\n- Work is split into **units** that can be **paused, resumed, reprioritized, or aborted** — so a long render doesn't block the main thread and the UI stays responsive.\n- It enables **concurrent features**: time-slicing, `useTransition`/`useDeferredValue` (mark updates as low priority), and Suspense.\n- It works in two phases: a **render/reconcile** phase (interruptible, no side effects) and a **commit** phase (synchronous, applies DOM changes).\n\n**Interview tip:** the headline is *interruptible, prioritized rendering*. You don't use Fiber directly — you experience it through concurrent APIs. Contrast with the old stack reconciler that couldn't be interrupted mid-tree.",
    examples: [
      {
        label: "useTransition: low-priority, interruptible update",
        code: `import { useState, useTransition } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [list, setList] = useState([]);
  const [isPending, startTransition] = useTransition();

  function onChange(e) {
    const value = e.target.value;
    setText(value); // urgent: keep the input responsive
    startTransition(() => {
      // non-urgent: heavy list update can be interrupted by typing
      setList(Array.from({ length: 5000 }, (_, i) => value + ' #' + i));
    });
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <input value={text} onChange={onChange} placeholder='Type fast' />
      {isPending && <span> updating...</span>}
      <p>{list.length} rows generated</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How does React handle security concerns like XSS?",
    answer:
      "React's biggest built-in defense is **automatic escaping in JSX**: any string you interpolate with `{ }` is rendered as **text**, not parsed as HTML, so injected `<script>`/markup is neutralized. This blocks the most common XSS vector by default.\n\nWhere you still have to be careful:\n- **`dangerouslySetInnerHTML`** bypasses escaping — only use it with **sanitized** HTML (e.g. DOMPurify). The scary name is intentional.\n- **`href`/`src` from user input** — a `javascript:` URL still executes; validate/whitelist URLs.\n- **Server data** rendered as HTML, and third-party scripts.\n\n**Interview tip:** the one-liner is 'JSX escapes by default; the escape hatch is `dangerouslySetInnerHTML`, which needs sanitization'. Also mention not trusting user-controlled URLs and setting a Content Security Policy.",
    examples: [
      {
        label: "JSX escapes; the escape hatch doesn't",
        code: `export default function App() {
  const userInput = '<img src=x onerror="alert(1)">';
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {/* Safe: rendered as literal text, the tag does NOT execute. */}
      <p>{userInput}</p>
      {/* Dangerous: only ever do this with sanitized HTML. */}
      {/* <div dangerouslySetInnerHTML={{ __html: userInput }} /> */}
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How does React's Batching work?",
    answer:
      "**Batching** means React groups multiple state updates into a **single re-render** instead of rendering once per `setState`. This avoids wasted renders and keeps the UI consistent.\n\n- Before React 18, batching happened only inside React event handlers. Updates in promises, `setTimeout`, or native event callbacks each triggered their own render.\n- **React 18 introduced automatic batching everywhere** — multiple updates in async callbacks, timeouts, and promises are now batched too (when using `createRoot`).\n- Need to force a synchronous flush? `flushSync(() => setX(...))` opts out.\n\n**Interview tip:** call out the React 18 change — 'automatic batching' now covers async contexts, which occasionally changes behavior code relied on. State updates are still asynchronous, which is why the functional updater `setX(prev => ...)` is the safe way to build on the latest value.",
    examples: [
      {
        label: "Two updates, one render",
        code: `import { useState } from 'react';

export default function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  function bump() {
    setA(x => x + 1);
    setB(x => x + 1); // both batched -> component re-renders once, not twice
  }

  console.log('render'); // logs once per click, not twice
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>a: {a}, b: {b}</p>
      <button onClick={bump}>Update both</button>
      <p>Open the console: one render per click.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How would you structure a large React application?",
    answer:
      "There's no single rule, but the proven approach is **feature/domain-based organization** over giant type-based folders.\n\nCommon structure:\n- Group by **feature** (`features/auth`, `features/cart`), each owning its components, hooks, state, and API calls.\n- Shared, reusable pieces in `components/` (design system), `hooks/`, `lib/`/`utils/`, `api/`.\n- Keep components **small and focused**; colocate tests and styles with the component.\n- A clear **state strategy**: local state by default, Context for cross-cutting config, a store (Redux/Zustand) for genuinely global state, and a data layer (React Query) for server state.\n- **Code-split** by route; enforce boundaries with lint rules / path aliases.\n\n**Interview tip:** emphasize **colocation** and **clear boundaries** — features shouldn't reach into each other's internals — plus a consistent answer for the four kinds of state (local, global client, server/cache, URL).",
    examples: [
      {
        label: "Feature-based folder layout (read-only)",
        runnable: false,
        code: `src/
  app/                 # routing, providers, shell
  features/
    auth/
      components/
      hooks/
      api.ts
      authSlice.ts
    cart/
      components/
      hooks/
      api.ts
  components/          # shared design-system UI
  hooks/               # shared hooks
  lib/                 # utils, api client, config
  types/`,
      },
    ],
  },
  {
    title: "What are Portals in React and when would you use them?",
    answer:
      "A **Portal** renders children into a **DOM node outside the parent component's DOM hierarchy**, while keeping them in the React tree (so context, events, and state still work normally). API: `createPortal(children, domNode)`.\n\nWhen to use:\n- **Modals, dialogs, tooltips, popovers, toasts** — UI that must escape a parent's `overflow: hidden`, `transform`, or `z-index` stacking context to render on top of everything.\n\nA subtle but important detail: **events still bubble through the React tree**, not the DOM tree — a click inside a portal propagates to its React parent even though it's mounted elsewhere in the DOM.\n\n**Interview tip:** the reason portals exist is **CSS containment** (overflow/stacking), and the gotcha to mention is **event bubbling following the React tree**.",
    examples: [
      {
        label: "Render a modal into document.body",
        code: `import { useState } from 'react';
import { createPortal } from 'react-dom';

function Modal({ onClose }) {
  // Mounted on document.body, escaping any parent overflow/stacking context.
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
        <p>I am rendered into document.body.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <button onClick={() => setOpen(true)}>Open modal</button>
      {open && <Modal onClose={() => setOpen(false)} />}
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are React Developer Tools and how do you use them?",
    answer:
      "**React Developer Tools** is an official browser extension (Chrome/Firefox/Edge) and standalone app that adds two panels to your devtools:\n\n- **Components** — inspect the component tree, view/edit a component's **props, state, hooks**, see which component owns a DOM node, and jump to source.\n- **Profiler** — **record** a session to see which components re-rendered, how long each render took, and **why** a component rendered ('what changed'), with flame and ranked charts.\n\nHow you use them: open browser devtools → the React tabs appear when a React app is detected. Use Components to debug state/props issues, and the Profiler to find unnecessary or slow re-renders before optimizing.\n\n**Interview tip:** tie it to optimization — you **profile before** adding `memo`/`useMemo`, and the 'why did this render' feature is how you confirm a fix actually removed re-renders.",
    // Tooling question — no runnable code example.
  },
  {
    title: "What is `PropTypes` and when would you use it?",
    answer:
      "`PropTypes` (from the separate **`prop-types`** package) is a **runtime** type-checker for component props. You declare the expected type/shape of each prop, and in **development** React logs a console warning when a component receives the wrong type or is missing a required prop.\n\nWhen to use it:\n- In **JavaScript** (non-TypeScript) codebases, to document and validate component contracts.\n- For libraries that want runtime validation regardless of the consumer's setup.\n\n**Interview tip:** the key contrasts — PropTypes is **runtime + dev-only warnings**, whereas **TypeScript is compile-time** and far more powerful. If a project uses TypeScript, you generally **don't** also use PropTypes. Also note `React.PropTypes` was removed from core long ago; it lives in `prop-types`.",
    examples: [
      {
        label: "Declaring propTypes (read-only)",
        runnable: false,
        code: `import PropTypes from 'prop-types';

function Greeting({ name, age }) {
  return <p>{name} is {age}</p>;
}

Greeting.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
};
// In dev, <Greeting name={42} /> logs a console warning about the wrong type.`,
      },
    ],
  },
  {
    title: "What is `create-react-app` and when would you use it?",
    answer:
      "**Create React App (CRA)** was the long-standing official CLI to scaffold a single-page React app with **zero build configuration** — it bundled Webpack, Babel, ESLint, and a dev server behind one command, so you could start coding immediately.\n\nWhen you'd (historically) use it: quick SPAs, prototypes, and learning, where you didn't want to configure tooling.\n\n**Important caveat for 2024+:** CRA is effectively **deprecated / no longer recommended**. The React team now points beginners to **frameworks** (Next.js, Remix) or, for a plain SPA, build tools like **Vite** — all of which are faster and better maintained.\n\n**Interview tip:** show you're current — acknowledge CRA's role historically but say you'd reach for **Vite** (lightweight SPA) or **Next.js** (SSR/routing/data) today.",
    examples: [
      {
        label: "Scaffolding commands (read-only)",
        runnable: false,
        code: `# Historical CRA (deprecated):
npx create-react-app my-app
cd my-app && npm start

# Recommended today — Vite for a plain SPA:
npm create vite@latest my-app -- --template react
# ...or a framework:
npx create-next-app@latest my-app`,
      },
    ],
  },
  {
    title: "What is hydration in React?",
    answer:
      "**Hydration** is how React takes **server-rendered HTML** and makes it interactive on the client. The server sends fully-formed HTML (fast first paint); then React loads on the client and **attaches event listeners and reconnects its internal state to that existing DOM** — rather than throwing the markup away and re-rendering it.\n\nAPI: `hydrateRoot(domNode, <App/>)` (React 18) instead of `createRoot(...).render(...)`.\n\nKey constraint: the **client's first render must match the server HTML**. A mismatch (e.g. rendering `Date.now()` or `window`-dependent output) triggers a **hydration warning/error** and React may discard and re-render that subtree.\n\n**Interview tip:** describe it as 'attaching interactivity to pre-rendered HTML', and mention the **hydration mismatch** pitfall and newer ideas — **selective/streaming hydration** (Suspense) and partial hydration / RSC that hydrate less JS.",
    examples: [
      {
        label: "hydrateRoot on the client (read-only)",
        runnable: false,
        code: `import { hydrateRoot } from 'react-dom/client';
import App from './App';

// The server already sent HTML for #root; this attaches React to it
// instead of re-rendering from scratch.
hydrateRoot(document.getElementById('root'), <App />);`,
      },
    ],
  },
  {
    title: "What is server-side rendering (SSR) and when would you use it with React?",
    answer:
      "**SSR** renders your React components to **HTML on the server** for each request and sends that markup to the browser, which displays it immediately and then **hydrates** it into a fully interactive app.\n\nWhy use it:\n- **Faster perceived first paint / First Contentful Paint** — users see content before the JS bundle finishes.\n- **SEO and social previews** — crawlers get real HTML, not an empty `<div id='root'>`.\n- Good for content-heavy or public pages.\n\nTrade-offs: server cost/complexity, a 'time to interactive' gap during hydration, and you need a server (or edge). In practice you use a framework — **Next.js** or **Remix** — rather than wiring `renderToString`/`renderToPipeableStream` by hand.\n\n**Interview tip:** contrast with CSR (blank HTML + client render) and mention SSG (pre-render at build) and streaming SSR + React Server Components as the modern evolution.",
    examples: [
      {
        label: "Low-level SSR primitive (read-only)",
        runnable: false,
        code: `import { renderToString } from 'react-dom/server';
import App from './App';

// On the server, per request:
const html = renderToString(<App />);
// send '<div id=\"root\">' + html + '</div>' + the client bundle...
// the client then calls hydrateRoot to make it interactive.`,
      },
    ],
  },
  {
    title: "What is the role of `react-dom`?",
    answer:
      "React is split into two packages: **`react`** is the renderer-agnostic core (components, hooks, elements, `createElement`), and **`react-dom`** is the **renderer that targets the browser DOM**. It's the bridge between React's virtual representation and real DOM nodes.\n\nWhat `react-dom` provides:\n- **`react-dom/client`** — `createRoot(...).render(<App/>)` to mount, and `hydrateRoot(...)` for SSR markup (React 18).\n- **`react-dom`** — `createPortal` (render into another DOM node) and `flushSync`.\n- **`react-dom/server`** — `renderToString` / `renderToPipeableStream` for SSR.\n\n**Interview tip:** the clean framing is *separation of concerns* — `react` describes UI, the renderer applies it to a target. Swap the renderer and the same React powers other targets: **React Native** (`react-native`), `react-three-fiber`, custom renderers, etc.",
    examples: [
      {
        label: "Mounting with react-dom/client (read-only)",
        runnable: false,
        code: `import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />); // react-dom turns the element tree into real DOM nodes`,
      },
    ],
  },
];

export default augments;
