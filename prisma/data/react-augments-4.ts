import type { ReactAugment } from "./react-augments.types";

/**
 * React augments — batch 4 (concept variants + a few distinct topics).
 * Many titles here are alternate phrasings of earlier concepts; answers are
 * written fresh for the specific wording. Keep runnable `code` backtick-free.
 */
const augments: ReactAugment[] = [
  {
    title: "Describe the concept of unidirectional data flow in React.",
    answer:
      "**Unidirectional (one-way) data flow** means data moves in a single direction: **state lives in a parent and flows down to children as props**. Children never mutate the data they receive — to change something, they call a **callback** passed down from the owner, which updates the state at the source; the new state then flows back down.\n\nWhy it matters: there's a **single source of truth** for any piece of data, so the UI is predictable and easy to debug — you can trace any value to the component that owns it.\n\n**Interview tip:** contrast with two-way binding (e.g. classic Angular) where the view can directly mutate the model. React's 'data down, actions up' makes state changes explicit and traceable, which is why controlled inputs feel slightly more verbose but are far easier to reason about.",
    examples: [
      {
        label: "Data down, actions up",
        code: `import { useState } from 'react';

function Child({ value, onIncrement }) {
  return <button onClick={onIncrement}>child sees {value}</button>;
}

export default function App() {
  const [count, setCount] = useState(0); // single source of truth
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {/* data flows DOWN as a prop, the action flows UP as a callback */}
      <Child value={count} onIncrement={() => setCount(c => c + 1)} />
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of 'unidirectional data flow' in React.",
    answer:
      "In React, data flows **one way — top to bottom**. A component owns some **state** and passes it to its children as **props**; children treat props as read-only. When a child needs to change something, it invokes a **handler** it received from above, and the owning component updates its state. The change then re-renders and flows back down.\n\nThis 'data down, events up' model gives every value a **single owner**, making the app's behavior predictable and bugs easier to localize.\n\n**Interview tip:** mention that even Context and Redux preserve this direction — components *read* state and *dispatch* actions; they don't mutate shared state directly. The discipline is what makes time-travel debugging and predictable re-renders possible.",
    examples: [
      {
        label: "One-way flow with a callback up",
        code: `import { useState } from 'react';

function NameInput({ name, onChange }) {
  // Receives state via props; reports changes upward via a callback.
  return <input value={name} onChange={e => onChange(e.target.value)} />;
}

export default function App() {
  const [name, setName] = useState('');
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <NameInput name={name} onChange={setName} />
      <p>Owner state: {name || '(empty)'}</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Differentiate between `useState` and `useReducer` hooks.",
    answer:
      "Both manage local state; they differ in how updates are expressed.\n\n- **`useState`** — you store a value and call a setter with the next value. Ideal for simple, independent pieces of state.\n- **`useReducer`** — you store state plus a pure `reducer(state, action)` and call `dispatch(action)`. The update logic is centralized and described as **named actions**.\n\nPrefer `useReducer` when state is an **object with interdependent fields**, when the **next state depends on the previous** in non-trivial ways, when there are **many related transitions**, or when you want **testable** update logic and a **stable `dispatch`** to pass down.\n\n**Interview tip:** they're equivalent in power (`useState` is a thin `useReducer`). The deciding factor is complexity of the *transitions*, not the size of the value.",
    examples: [
      {
        label: "Same feature, two styles",
        code: `import { useState, useReducer } from 'react';

function reducer(s, a) {
  return a === 'inc' ? s + 1 : a === 'dec' ? s - 1 : s;
}

export default function App() {
  const [a, setA] = useState(0);            // useState style
  const [b, dispatch] = useReducer(reducer, 0); // useReducer style
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 8 }}>
      <div>useState: {a} <button onClick={() => setA(x => x + 1)}>+1</button></div>
      <div>useReducer: {b} <button onClick={() => dispatch('inc')}>+1</button></div>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the difference between `useState` and `useReducer`.",
    answer:
      "`useState` and `useReducer` both hold component state; the difference is **where the update logic lives**.\n\n- With **`useState`**, the component computes and sets the next value inline. Great for booleans, strings, counters, and other simple state.\n- With **`useReducer`**, you move transitions into a **pure reducer** and trigger them with `dispatch({ type })`. This shines when updates are **complex, interrelated, or numerous**, because the logic is in one place, easy to test, and decoupled from the UI.\n\nA practical bonus: `dispatch` has a **stable identity**, so passing it deep (or into `useEffect`/`useCallback` deps) avoids stale-closure issues that raw setters can introduce.\n\n**Interview tip:** the signal to migrate is 'several `setX` calls that always change together' or 'transitions are clearer as named actions'.",
    examples: [
      {
        label: "Reducer centralizes complex transitions",
        code: `import { useReducer } from 'react';

const initial = { count: 0, step: 1 };
function reducer(state, action) {
  switch (action.type) {
    case 'inc':      return { ...state, count: state.count + state.step };
    case 'setStep':  return { ...state, step: action.value };
    case 'reset':    return initial;
    default:         return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>count: {state.count} (step {state.step})</p>
      <button onClick={() => dispatch({ type: 'inc' })}>+ step</button>
      <button onClick={() => dispatch({ type: 'setStep', value: 5 })}>step = 5</button>
      <button onClick={() => dispatch({ type: 'reset' })}>reset</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Differentiate between controlled and uncontrolled components.",
    answer:
      "The distinction is **who holds the input's current value**.\n\n- **Controlled:** React state owns the value (`value={state}` + `onChange`). The component is the single source of truth — easy validation, formatting, conditional disabling, and programmatic reset, at the cost of a re-render per keystroke.\n- **Uncontrolled:** the DOM owns the value; React only sets an initial `defaultValue` and reads the current value on demand via a **ref**.\n\n**Interview tip:** default to controlled when you need to react to input (validation, derived UI). Choose uncontrolled for simple forms, performance-sensitive inputs, or integrating third-party/non-React widgets. Note `<input type='file'>` is inherently uncontrolled.",
    examples: [
      {
        label: "Controlled vs uncontrolled",
        code: `import { useState, useRef } from 'react';

export default function App() {
  const [text, setText] = useState('');   // controlled: state owns it
  const ref = useRef(null);                // uncontrolled: DOM owns it

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 10 }}>
      <input value={text} onChange={e => setText(e.target.value)} placeholder='Controlled' />
      <input defaultValue='start' ref={ref} placeholder='Uncontrolled' />
      <button onClick={() => alert('controlled=' + text + ' | uncontrolled=' + ref.current.value)}>
        Read both
      </button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between controlled and uncontrolled components?",
    answer:
      "A **controlled** component's form value is driven by React **state** — you bind `value` and handle `onChange`, so state is the single source of truth. An **uncontrolled** component lets the **DOM** keep the value internally; you provide an initial `defaultValue` and read the live value imperatively through a **ref**.\n\nControlled gives you full control (instant validation, formatting, enabling/disabling, resetting) but re-renders on every change. Uncontrolled is simpler and avoids per-keystroke renders, useful for basic forms or wrapping non-React inputs.\n\n**Interview tip:** be ready with the rule of thumb — *prefer controlled*, drop to uncontrolled for simple or perf-sensitive cases. And remember file inputs are always uncontrolled because their value can't be set programmatically for security reasons.",
    examples: [
      {
        label: "Validation needs a controlled input",
        code: `import { useState } from 'react';

export default function App() {
  const [email, setEmail] = useState('');
  const valid = email.includes('@');
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder='you@example.com' />
      <p style={{ color: valid ? 'green' : 'crimson' }}>
        {valid ? 'Looks valid' : 'Needs an @'}
      </p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of 'uncontrolled components'.",
    answer:
      "An **uncontrolled component** lets the **DOM keep its own state** for a form element, rather than mirroring it in React state. You don't pass `value`/`onChange`; instead you set an optional initial **`defaultValue`** (or `defaultChecked`) and read the current value when you need it via a **ref**.\n\nWhen it's a good fit:\n- Simple forms where you only need values at submit time.\n- Performance-sensitive inputs (no re-render per keystroke).\n- Integrating non-React widgets or `<input type='file'>` (which is always uncontrolled).\n\n**Interview tip:** the trade-off is less control — you can't easily validate-as-you-type or conditionally transform input without reading the ref. It's 'let the platform handle it', whereas controlled is 'React is the source of truth'.",
    examples: [
      {
        label: "Read values from refs on submit",
        code: `import { useRef } from 'react';

export default function App() {
  const nameRef = useRef(null);
  const agreeRef = useRef(null);

  const submit = e => {
    e.preventDefault();
    alert('name=' + nameRef.current.value + ' | agreed=' + agreeRef.current.checked);
  };

  return (
    <form onSubmit={submit} style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 8 }}>
      <input defaultValue='Ada' ref={nameRef} />
      <label><input type='checkbox' defaultChecked ref={agreeRef} /> Agree</label>
      <button type='submit'>Submit</button>
    </form>
  );
}`,
      },
    ],
  },
  {
    title: "Explain how React handles events.",
    answer:
      "You attach handlers in JSX with **camelCase props** (`onClick`, `onChange`) and pass a **function**. React doesn't bind a listener to each DOM node — it uses **event delegation**, attaching a handful of listeners at the **app root** (since React 17; `document` before) and dispatching to your handlers.\n\nEach handler receives a **SyntheticEvent** — a cross-browser wrapper around the native event with the familiar API (`preventDefault`, `stopPropagation`, `target`).\n\n**Interview tip:** two points score well: (1) since React 17 events delegate to the root container, not `document`, which matters for multiple roots / embedding; (2) since React 17 there's no more event pooling, so `e.persist()` is no longer needed. Remember `return false` doesn't prevent default — call `e.preventDefault()`.",
    examples: [
      {
        label: "Synthetic event + preventDefault",
        code: `export default function App() {
  const onSubmit = e => {
    e.preventDefault();           // stop the native form submission
    console.log('SyntheticEvent:', e.type);
  };
  return (
    <form onSubmit={onSubmit} style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <input placeholder='press Enter or click' />
      <button type='submit'>Go</button>
    </form>
  );
}`,
      },
    ],
  },
  {
    title: "Explain how event handling works in React.",
    answer:
      "Event handling in React looks like HTML but differs in three ways:\n1. **camelCase** event names (`onClick`, not `onclick`).\n2. You pass a **function reference**, not a string of code.\n3. To stop default behavior you call **`e.preventDefault()`** (returning `false` does nothing).\n\nBehind the scenes React wraps native events in a **SyntheticEvent** for cross-browser consistency and uses **event delegation** — listeners live at the root container and React routes events to the right handler. This keeps the DOM light even with many interactive elements.\n\n**Interview tip:** mention passing arguments to handlers (`onClick={() => handle(id)}`), the perf note that inline arrows create a new function each render (usually fine; use `useCallback` only when it matters for a memoized child), and the React 17 delegation/pooling changes.",
    examples: [
      {
        label: "Passing an argument to a handler",
        code: `export default function App() {
  const items = ['Edit', 'Delete', 'Share'];
  const handle = action => alert('Action: ' + action);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'flex', gap: 8 }}>
      {items.map(label => (
        <button key={label} onClick={() => handle(label)}>{label}</button>
      ))}
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain how to debug React applications.",
    answer:
      "A layered toolkit:\n- **React DevTools — Components** tab: inspect the tree and a component's live props/state/hooks, and confirm what re-rendered.\n- **React DevTools — Profiler**: record interactions to see which components rendered, how long, and **why**.\n- **Browser devtools**: breakpoints and the call stack, `console.log`/`console.table`, and the Network tab for API issues.\n- **Error boundaries** and the console for runtime errors; the **StrictMode** dev double-render to surface impure effects.\n- **Source maps** to debug original (pre-transpile) code.\n\n**Interview tip:** tie debugging to a method — reproduce, isolate (binary-search the component tree / comment out), inspect state vs props in DevTools, then use the Profiler for performance bugs. Mention `why-did-you-render` and ESLint's `react-hooks/exhaustive-deps` for stale-closure bugs.",
    examples: [
      {
        label: "Trace a render with logging",
        code: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  console.log('App render, count =', count); // see render frequency in the console
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <button onClick={() => setCount(c => c + 1)}>count = {count}</button>
      <p>Open DevTools console; inspect this component in the Components tab.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "How do you debug React applications?",
    answer:
      "Start with the **React Developer Tools** extension: the **Components** panel lets you inspect and even edit a component's props, state, and hooks live, and the **Profiler** shows which components re-rendered, how long they took, and what triggered it.\n\nAround that, use standard web debugging: **breakpoints** and the call stack in the browser's Sources panel, targeted `console.log`/`console.table`, the **Network** tab for API/CORS problems, and **error boundaries** to capture runtime errors gracefully. **Source maps** let you debug your original code.\n\n**Interview tip:** describe a process, not just tools — reproduce reliably, isolate by narrowing the tree, inspect state vs props to find where data goes wrong, and use the Profiler for 'it's slow / re-rendering too much' bugs. The `react-hooks/exhaustive-deps` lint rule catches a lot of effect/closure bugs before runtime.",
    examples: [
      {
        label: "console.table for structured state",
        code: `import { useState } from 'react';

export default function App() {
  const [rows] = useState([
    { id: 1, name: 'Ada', score: 90 },
    { id: 2, name: 'Grace', score: 95 },
  ]);
  console.table(rows); // inspect arrays/objects clearly in the console
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>Open the console: state is logged as a table.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of 'lifting state up'.",
    answer:
      "**Lifting state up** means moving shared state **out of sibling components and into their nearest common ancestor**, then passing it down as props (with callbacks to update it). The ancestor becomes the single owner, so the siblings stay in sync instead of holding diverging copies.\n\nIt's React's idiomatic answer to 'two components need the same data'. The children become **controlled** by the parent.\n\n**Interview tip:** mention the natural progression — start with local state, lift it up when it must be shared, and only move to **Context** or a **global store** when lifting causes deep prop drilling or the state is genuinely app-wide. Lifting too high (putting everything at the top) hurts performance and readability, so lift only as far as necessary.",
    examples: [
      {
        label: "Shared total across two children",
        code: `import { useState } from 'react';

function Adder({ onAdd }) {
  return <button onClick={() => onAdd(1)}>+1</button>;
}
function Total({ value }) {
  return <strong>Total: {value}</strong>;
}

export default function App() {
  const [total, setTotal] = useState(0); // lifted to the common ancestor
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'grid', gap: 8 }}>
      <Total value={total} />
      <Adder onAdd={n => setTotal(t => t + n)} />
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of 'prop drilling' and how can it be avoided?",
    answer:
      "**Prop drilling** is when you pass a prop through several intermediate components that don't use it, just to deliver it to a deeply-nested child. Those middle components get cluttered with props they only forward, and refactors become fragile.\n\nHow to avoid it:\n1. **Composition** — pass UI as `children`/slots so the owner renders the consumer directly, bypassing the middle layers (often the cleanest fix).\n2. **Context API** — `createContext` + `Provider` + `useContext` to broadcast a value to any descendant.\n3. **A state-management library** — Redux, Zustand, Jotai — for large, frequently-changing global state.\n\n**Interview tip:** call out that Context isn't free — every consumer re-renders when the value changes, so memoize the value and split contexts; and try composition first, since a lot of drilling vanishes once parents pass `children`.",
    examples: [
      {
        label: "Composition avoids threading props",
        code: `// Instead of <Page user={user}> -> <Header user={user}> -> <Avatar user={user}>,
// let the owner render the consumer and pass it as children.
function Page({ children }) {
  return <div style={{ fontFamily: 'sans-serif', padding: 24 }}>{children}</div>;
}
function Header({ children }) {
  return <header>{children}</header>;
}

export default function App() {
  const user = { name: 'Margaret' };
  return (
    <Page>
      <Header>
        <span>Signed in as {user.name}</span>
      </Header>
    </Page>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of 'prop drilling' and how to mitigate it.",
    answer:
      "**Prop drilling** describes passing data down through many layers of components that merely relay it to reach a far descendant. It bloats intermediate component signatures and tightly couples the tree.\n\nMitigations, lightest first:\n1. **Component composition** (`children`/render slots) so the data owner places the consumer directly.\n2. **React Context** for values many components need (theme, auth, locale).\n3. **A store** (Redux/Zustand/Jotai) or a **server-state library** (React Query) for app-wide or server data.\n\n**Interview tip:** the nuance that impresses: Context solves *drilling* but not *re-render scope* — all consumers re-render on value change — so keep contexts small and memoize their values. Composition is underrated and frequently removes the need for Context entirely.",
    examples: [
      {
        label: "Context for app-wide values",
        code: `import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

function ProfileBadge() {
  const auth = useContext(AuthContext); // reaches the value without drilling
  return <span>Hello, {auth.user}</span>;
}

export default function App() {
  return (
    <AuthContext.Provider value={{ user: 'Katherine' }}>
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <ProfileBadge />
      </div>
    </AuthContext.Provider>
  );
}`,
      },
    ],
  },
  {
    title: "What is 'prop drilling' and how can it be avoided?",
    answer:
      "**Prop drilling** is the pattern of forwarding a prop through multiple nested components that don't need it themselves, solely to hand it to a deep child. It makes intermediate components noisy and changes ripple through every layer.\n\nAvoid it with:\n- **Composition** — pass elements via `children`, letting the owner render the consumer where the data already exists.\n- **Context API** — share a value with an entire subtree via a Provider, read with `useContext`.\n- **Global state** — Redux/Zustand/Jotai for genuinely shared, dynamic state.\n\n**Interview tip:** a short, ranked answer wins: *composition → context → store*. And the caveat that Context re-renders all consumers on change, so it's a transport mechanism, not a performance optimization.",
    examples: [
      {
        label: "useContext reads past the middle layers",
        code: `import { createContext, useContext } from 'react';

const ThemeContext = createContext('light');

function DeepChild() {
  const theme = useContext(ThemeContext);
  return <p>theme deep down: {theme}</p>;
}
function Middle() { return <DeepChild />; } // no theme prop threaded here

export default function App() {
  return (
    <ThemeContext.Provider value='dark'>
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <Middle />
      </div>
    </ThemeContext.Provider>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of Higher-Order Components (HOCs) in React.",
    answer:
      "A **Higher-Order Component** is a function that **takes a component and returns a new, enhanced component**: `const Enhanced = withX(Component)`. It's a way to reuse cross-cutting logic (auth checks, data injection, styling, logging) by wrapping components — built on the fact that components are just values.\n\nConventions: name it `withSomething`, pass through unrelated props (`{...props}`), don't mutate the wrapped component, and forward refs (`forwardRef`) plus copy static methods when needed.\n\n**Interview tip:** be current — HOCs and render props have largely been **replaced by custom hooks**, which avoid wrapper nesting, prop collisions, and ref ceremony. Recognize HOCs in older code and libraries (`connect`, `withRouter`), but say you'd reach for a hook today.",
    examples: [
      {
        label: "withLogger HOC",
        code: `// Wraps any component to log each render.
function withLogger(Wrapped, name) {
  return function Logged(props) {
    console.log('rendering', name);
    return <Wrapped {...props} />;
  };
}

function Hello({ who }) {
  return <p>Hello, {who}!</p>;
}

const LoggedHello = withLogger(Hello, 'Hello');

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <LoggedHello who='World' />
      <p>Check the console for the HOC log.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the concept of immutability in React state management.",
    answer:
      "**Immutability** means you never mutate existing state in place — you create a **new** object/array with the change applied. React decides whether to re-render by comparing the **reference** of the new state to the old one (`Object.is`); mutating in place keeps the same reference, so React may skip the update.\n\nPractically:\n- Arrays: use `[...arr, x]`, `map`, `filter` — not `push`/`splice`.\n- Objects: use `{ ...obj, key: value }` — not `obj.key = value`.\n- For deep nesting, spread each level or use a helper like **Immer** (which lets you write 'mutating' code that produces an immutable copy).\n\n**Interview tip:** the why is **referential equality** — it powers React's bailouts, `React.memo`, `useMemo` deps, and concurrent features. Immutable updates also make features like undo/redo and predictable debugging possible.",
    examples: [
      {
        label: "Immutable nested update",
        code: `import { useState } from 'react';

export default function App() {
  const [user, setUser] = useState({ name: 'Ada', prefs: { dark: false } });

  // New object at every level we change — no in-place mutation.
  const toggleDark = () =>
    setUser(u => ({ ...u, prefs: { ...u.prefs, dark: !u.prefs.dark } }));

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>{user.name} prefers {user.prefs.dark ? 'dark' : 'light'} mode</p>
      <button onClick={toggleDark}>Toggle (immutably)</button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the concept of immutability in React state management?",
    answer:
      "Immutability is the practice of treating state as **read-only**: instead of changing the current state object, you **replace it with a new copy** that has your change. Because React compares state by **reference** to decide whether to re-render (and to power `React.memo`/`useMemo` bailouts), a fresh reference is what signals 'this changed'.\n\nMutating in place (`arr.push(x)`, `obj.k = v`) can leave the reference unchanged and **silently skip a render**, or corrupt assumptions in concurrent rendering.\n\nUse spreads (`[...]`, `{...}`), array methods that return new arrays (`map`/`filter`/`concat`), or **Immer** for ergonomic deep updates.\n\n**Interview tip:** summarize it as *new reference = React notices; same reference = React might not*. Immutability is also what makes time-travel debugging and predictable diffs possible.",
    examples: [
      {
        label: "Update one item immutably",
        code: `import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn immutability', done: false },
    { id: 2, text: 'Avoid mutation', done: false },
  ]);

  const toggle = id =>
    setTodos(list => list.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <ul style={{ fontFamily: 'sans-serif', padding: 24 }}>
      {todos.map(t => (
        <li key={t.id} onClick={() => toggle(t.id)} style={{ textDecoration: t.done ? 'line-through' : 'none', cursor: 'pointer' }}>
          {t.text}
        </li>
      ))}
    </ul>
  );
}`,
      },
    ],
  },
  {
    title: "Explain the virtual DOM and how React uses it",
    answer:
      "The **virtual DOM** is an in-memory description of your UI — a tree of plain JavaScript objects (React elements). When state or props change, React renders a **new** virtual tree, **diffs** it against the previous one (reconciliation), and computes the **smallest set of real-DOM operations** needed to bring the actual DOM in line. Then it commits just those changes.\n\nThis lets you write **declarative** UI ('what it should look like for this state') while React handles the imperative, expensive DOM updates efficiently — and **batches** them.\n\n**Interview tip:** dispel the myth that the VDOM is 'faster than the DOM' — manipulating the real DOM is what's expensive; the VDOM's job is to **minimize and batch** those manipulations. Keys are what make the list diff efficient and correct.",
    examples: [
      {
        label: "Declarative UI; React patches the diff",
        code: `import { useState } from 'react';

export default function App() {
  const [items, setItems] = useState(['One']);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
      {/* On click React diffs old vs new tree and only appends the new <li>. */}
      <button onClick={() => setItems(prev => [...prev, 'Item ' + (prev.length + 1)])}>
        Add
      </button>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the Virtual DOM in React?",
    answer:
      "The **Virtual DOM (VDOM)** is a lightweight JavaScript representation of the real DOM — a tree of React elements kept in memory. React uses it as a staging area: on each update it builds a new VDOM, **diffs** it against the previous version, and applies only the **necessary changes** to the real DOM.\n\nThe benefit is a clean programming model: you describe the UI declaratively and let React figure out the minimal, batched DOM mutations, instead of manually doing `document.createElement`/`appendChild`/`textContent` updates.\n\n**Interview tip:** key talking points — (1) it enables **declarative** UI; (2) it **minimizes/batches** costly real-DOM writes via the diff (reconciliation); (3) it's an abstraction, not inherently faster than well-written manual DOM code; (4) **Fiber** is the engine that makes the reconciliation interruptible.",
    examples: [
      {
        label: "Only the changed node updates",
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p>This sentence is never re-touched in the real DOM.</p>
      <p>Auto-updating count (only this text node is patched): {count}</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What is the difference between shadow DOM and virtual DOM?",
    answer:
      "They sound alike but are **unrelated concepts**:\n\n- **Virtual DOM** is a **React (library) technique**: an in-memory JS tree React diffs against the previous render to compute minimal real-DOM updates. It's about **efficient rendering**.\n- **Shadow DOM** is a **browser/Web Components standard**: it attaches a **separate, encapsulated DOM subtree** (a 'shadow tree') to an element so its markup and **styles are scoped/isolated** from the rest of the page. It's about **encapsulation**, not diffing.\n\n**Interview tip:** the crisp distinction — *virtual DOM = performance abstraction in React; shadow DOM = native style/markup encapsulation for web components*. They can even coexist (a React app can use elements that have a shadow root). Don't let the similar names trick you into conflating them.",
    examples: [
      {
        label: "Shadow DOM is a browser API (read-only)",
        runnable: false,
        code: `// Shadow DOM: native encapsulation, nothing to do with React's diffing.
class FancyBox extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' }); // isolated subtree
    shadow.innerHTML = '<style>p { color: red; }</style><p>Scoped styles</p>';
  }
}
customElements.define('fancy-box', FancyBox);
// The <style> above leaks to nothing outside this component's shadow tree.`,
      },
    ],
  },
  {
    title: "What is the purpose of `React.memo`?",
    answer:
      "`React.memo` **memoizes a function component** so it **skips re-rendering when its props haven't changed** (shallow comparison). When a parent re-renders, a memoized child reuses its previous output if every prop is referentially equal to last time.\n\nIts purpose is a **performance optimization**: avoid wasted renders of pure, presentational components that get the same props repeatedly.\n\n**Interview tip:** two caveats interviewers want: (1) it's a **shallow** compare, so a new object/array/function prop each render defeats it — pair with `useMemo`/`useCallback`; (2) it has a cost (the comparison + memory), so apply it where profiling shows frequent same-prop re-renders, not everywhere. You can pass a custom `areEqual` comparator as the second argument.",
    examples: [
      {
        label: "Memoized child skips re-render",
        code: `import { useState, memo } from 'react';

const Label = memo(function Label({ text }) {
  console.log('Label rendered');
  return <span>{text}</span>;
});

export default function App() {
  const [n, setN] = useState(0);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <Label text='constant prop' />
      <p>n: {n}</p>
      <button onClick={() => setN(v => v + 1)}>Re-render parent</button>
      <p>Console: Label logs once despite parent re-renders.</p>
    </div>
  );
}`,
      },
    ],
  },
  {
    title: "What are custom hooks and why would you create one?",
    answer:
      "A **custom hook** is a function whose name starts with `use` and that calls other hooks, letting you **extract reusable stateful logic** out of components. You create one to **share behavior** — a subscription, a debounced value, form handling, fetching, media-query tracking — across multiple components without duplicating code or resorting to HOCs/render props.\n\nIt shares **logic, not state**: each call gets its own independent state.\n\n**Interview tip:** good reasons to create one: (1) the same `useState`+`useEffect` pattern appears in several places; (2) a component is getting complex and a named hook clarifies intent (`useOnlineStatus()`); (3) you want to unit-test logic in isolation. Keep the returned API small and focused, and obey the Rules of Hooks (top-level only).",
    examples: [
      {
        label: "useWindowWidth custom hook",
        code: `import { useState, useEffect } from 'react';

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function App() {
  const width = useWindowWidth(); // reusable logic, isolated state
  return (
    <p style={{ fontFamily: 'sans-serif', padding: 24 }}>
      Window width: {width}px {width < 600 ? '(narrow)' : '(wide)'} — try resizing.
    </p>
  );
}`,
      },
    ],
  },
  {
    title: "What is the Context API in React and when would you use it?",
    answer:
      "The **Context API** lets you share a value with an entire subtree **without passing props through every level**. You `createContext`, wrap part of the tree in a `<Context.Provider value={...}>`, and read it anywhere below with `useContext`.\n\n**When to use it:** relatively **stable, broadly-needed** data — current **theme**, **authenticated user**, **locale/i18n**, feature flags, a design-system config. Basically, anything many components at different depths need.\n\n**When not to:** high-frequency updates or large app state — every consumer re-renders when the provider's `value` changes, so it can cause broad re-renders. For that, prefer a dedicated store (Redux/Zustand) or server-state lib (React Query).\n\n**Interview tip:** show the trade-off awareness — memoize the `value`, split into focused contexts, and treat Context as a **dependency-injection/transport** mechanism, not a performance-optimized state manager.",
    examples: [
      {
        label: "Auth context consumed deep in the tree",
        code: `import { createContext, useContext, useState, useMemo } from 'react';

const AuthContext = createContext(null);

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav>
      <span>Hi, {user}</span> <button onClick={logout}>Log out</button>
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState('Ada');
  // Memoize so consumers don't re-render from a new object each render.
  const value = useMemo(() => ({ user, logout: () => setUser('guest') }), [user]);
  return (
    <AuthContext.Provider value={value}>
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <Navbar />
      </div>
    </AuthContext.Provider>
  );
}`,
      },
    ],
  },
];

export default augments;
