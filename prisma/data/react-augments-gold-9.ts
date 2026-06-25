/**
 * React Phase R1 — Batch 9 (Patterns, SSR & TypeScript). Gold-standard rewrites.
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
    title: "What is `create-react-app` and when would you use it?",
    answer: `**Core concept.** Create React App (CRA) was the official **zero-config** CLI for scaffolding a single-page React app — Webpack, Babel, ESLint, and a dev server preconfigured so you could start without setup. It's now **deprecated/unmaintained**; the React team recommends a **framework** (Next.js) or **Vite** for new projects.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">CRA: easy start, now superseded</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="135" y="64" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">create-react-app</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">zero-config SPA</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">Webpack + Babel hidden</text>
  <text x="135" y="124" fill="#ef4444" font-size="9" text-anchor="middle">deprecated · slow builds</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">today instead</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">Vite (fast SPA)</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">Next.js (SSR/framework)</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">faster, maintained</text>
</svg>`)}

**How it works.** CRA bundled an opinionated toolchain behind <code>npx create-react-app my-app</code>, hiding the config so beginners could focus on React. The trade-offs that ended it: slow Webpack builds, an outdated setup, no SSR/routing story, and "ejecting" to customize was a one-way mess. The official React docs now point you to **Vite** (esbuild/Rollup, near-instant dev server) for client-only SPAs, or a **framework** like **Next.js**/**Remix** when you want routing, data loading, and server rendering out of the box. You'd only use CRA today to run/maintain an **existing** CRA project.

### CRA vs the modern options
| | CRA | Vite | Next.js |
| --- | --- | --- | --- |
| Status | deprecated | active | active |
| Dev speed | slow | very fast | fast |
| SSR/routing | no | no (SPA) | built-in |
| Use for | legacy only | new SPAs | full apps |

> **Interview tip:** Know it's **deprecated** — the modern answer is "**Vite** for a SPA, **Next.js** for a full framework." Mention CRA hid Webpack/Babel and that "ejecting" was its escape hatch.`,
    examples: [
      {
        label: "Scaffolding then vs now",
        runnable: false,
        code: `// Legacy (deprecated):
//   npx create-react-app my-app
//   cd my-app && npm start
//
// Modern SPA with Vite:
//   npm create vite@latest my-app -- --template react
//   cd my-app && npm install && npm run dev
//
// Full framework (routing, SSR, data) with Next.js:
//   npx create-next-app@latest my-app

export default function App() {
  return <p style={{ fontFamily: "system-ui", padding: 24 }}>Scaffolded app entry</p>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Error Boundaries in React?",
    answer: `**Core concept.** An Error Boundary is a **class component** that **catches JavaScript errors in its child tree** during rendering, lifecycle methods, and constructors — then renders a **fallback UI** instead of letting the whole app crash (an unmounted white screen). It implements <code>getDerivedStateFromError</code> and/or <code>componentDidCatch</code>.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Catch render errors, show a fallback</text>
  <rect x="120" y="38" width="280" height="34" rx="8" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444" stroke-width="1.5"/>
  <text x="260" y="60" fill="#ef4444" font-size="10" font-weight="700" text-anchor="middle">&lt;ErrorBoundary&gt;</text>
  <rect x="160" y="104" width="200" height="32" rx="7" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="260" y="124" fill="currentColor" font-size="9" text-anchor="middle">child throws → fallback shown</text>
  <path d="M 260 72 L 260 102" stroke="currentColor" stroke-width="1.3" marker-end="url(#eb-a)"/>
  <text x="430" y="60" fill="#22c55e" font-size="9" text-anchor="middle">rest of app</text>
  <text x="430" y="74" fill="#22c55e" font-size="9" text-anchor="middle">stays alive</text>
  <defs><marker id="eb-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Place a boundary around a risky subtree; if any descendant throws while rendering, React unmounts that subtree and shows the boundary's fallback, keeping the rest of the app working. <code>getDerivedStateFromError</code> updates state to trigger the fallback; <code>componentDidCatch(error, info)</code> is for **logging** to a service like Sentry. There's **no hook** equivalent yet, so boundaries must be classes (or use a wrapper library like <code>react-error-boundary</code>). Important limits: boundaries do **not** catch errors in **event handlers** (use <code>try/catch</code> there), **async** code, **SSR**, or errors thrown in the boundary itself. Put boundaries at strategic levels (per route/widget) so one failure doesn't take down everything.

### Caught vs not caught
| Caught | Not caught |
| --- | --- |
| render errors | event handlers |
| lifecycle methods | async (<code>setTimeout</code>/fetch) |
| constructors | server-side rendering |
| child components | the boundary itself |

> **Interview tip:** "Class component that catches **render** errors and shows a fallback." Name <code>getDerivedStateFromError</code> (fallback) + <code>componentDidCatch</code> (logging), that there's **no hook** for it, and that it does **not** catch event-handler/async errors.`,
    examples: [
      {
        label: "A reusable Error Boundary",
        runnable: false,
        code: `import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; } // show fallback
  componentDidCatch(error, info) { /* log to Sentry, etc. */ }
  render() {
    if (this.state.hasError) return <p>⚠️ Something went wrong.</p>;
    return this.props.children;
  }
}

function Broken() { throw new Error("render crash"); }

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>App still runs ↓</p>
      <ErrorBoundary><Broken /></ErrorBoundary>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Portals in React and when would you use them?",
    answer: `**Core concept.** A portal renders a component's children into a **DOM node outside the parent's hierarchy** (e.g. <code>document.body</code>) while keeping it in the **React tree** — so context and event bubbling still work normally. Use portals for **modals, tooltips, dropdowns, and toasts** that must escape a parent's <code>overflow</code>/<code>z-index</code>/clipping.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">React tree stays; DOM node moves elsewhere</text>
  <rect x="20" y="44" width="220" height="96" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="130" y="64" fill="#8b5cf6" font-size="10" font-weight="700" text-anchor="middle">React tree</text>
  <text x="130" y="86" fill="currentColor" font-size="9" text-anchor="middle">&lt;Card&gt;&lt;Modal/&gt;&lt;/Card&gt;</text>
  <text x="130" y="106" fill="currentColor" font-size="9" text-anchor="middle">context + events normal</text>
  <rect x="290" y="44" width="210" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="395" y="64" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">DOM output</text>
  <text x="395" y="86" fill="currentColor" font-size="9" text-anchor="middle">portal → document.body</text>
  <text x="395" y="106" fill="currentColor" font-size="9" text-anchor="middle">escapes overflow/z-index</text>
  <path d="M 240 92 L 288 92" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 3" marker-end="url(#po-a)"/>
  <defs><marker id="po-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** <code>createPortal(children, domNode)</code> tells React to render <code>children</code> into <code>domNode</code> (often a top-level <code>#modal-root</code>) instead of the parent's DOM position. Crucially, the component stays in React's tree where you wrote it, so it still receives **context**, and events **bubble through the React tree** (not the DOM tree) — a click inside a portaled modal still reaches an <code>onClick</code> on the logical parent. This solves the common CSS trap where a modal gets clipped by an ancestor's <code>overflow: hidden</code> or trapped under a low <code>z-index</code>. Remember accessibility (focus trap, <code>aria</code>, Escape to close).

### Portal facts
| Aspect | Detail |
| --- | --- |
| API | <code>createPortal(children, node)</code> |
| DOM position | the target node (e.g. body) |
| React tree | unchanged (context works) |
| Events | bubble via React tree |

> **Interview tip:** "Renders into a different DOM node but stays in the React tree — so context + event bubbling still work." Use case: modals/tooltips escaping <code>overflow</code>/<code>z-index</code>. Mention accessibility (focus management).`,
    examples: [
      {
        label: "A modal via createPortal",
        runnable: false,
        code: `import { useState } from "react";
import { createPortal } from "react-dom";

function Modal({ onClose, children }) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)" }}
         onClick={onClose}>
      <div style={{ background: "#fff", margin: "10% auto", padding: 24, width: 280 }}>
        {children}
      </div>
    </div>,
    document.body                       // rendered here, not in the parent DOM
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", overflow: "hidden" }}>
      <button onClick={() => setOpen(true)}>Open modal</button>
      {open && <Modal onClose={() => setOpen(false)}>Hi from a portal!</Modal>}
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain React Suspense and its use cases.",
    answer: `**Core concept.** Suspense lets a component **"wait" for something** before rendering and show a **fallback** (a spinner/skeleton) meanwhile — declaratively, without manual loading flags. You wrap part of the tree in <code>&lt;Suspense fallback={…}&gt;</code>; anything inside that "suspends" (lazy-loaded code, or data via a Suspense-enabled source) triggers the fallback until ready.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Show a fallback while children load</text>
  <rect x="120" y="38" width="280" height="34" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="60" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">&lt;Suspense fallback={spinner}&gt;</text>
  <rect x="60" y="104" width="180" height="32" rx="7" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/>
  <text x="150" y="124" fill="currentColor" font-size="9" text-anchor="middle">loading → fallback</text>
  <rect x="280" y="104" width="180" height="32" rx="7" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="370" y="124" fill="currentColor" font-size="9" text-anchor="middle">ready → real content</text>
  <path d="M 220 72 L 150 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#su-a)"/>
  <path d="M 300 72 L 370 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#su-a)"/>
  <defs><marker id="su-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** When a component "suspends," React pauses rendering that subtree and displays the nearest <code>Suspense</code> fallback, then swaps in the real content once the resource resolves. The original, stable use case is **code-splitting** with <code>React.lazy</code> (wait for the chunk). With React 18+/19 it also covers **data**: a Suspense-enabled fetch, the <code>use(promise)</code> hook, or framework loaders let you express loading states declaratively and even **stream** server-rendered HTML with **selective hydration**. You can nest boundaries for granular loading UIs and pair Suspense with an Error Boundary to handle failures. <code>useTransition</code>/<code>useDeferredValue</code> work with it to avoid jarring fallback flashes.

### Suspense use cases
| Use case | Trigger |
| --- | --- |
| code-splitting | <code>React.lazy(() => import(...))</code> |
| data fetching | <code>use(promise)</code> / framework loaders |
| streaming SSR | server components + selective hydration |
| granular loading | nested <code>Suspense</code> boundaries |

> **Interview tip:** "Declarative loading state — wrap in <code>Suspense</code>, children that suspend show the fallback." Cite <code>React.lazy</code> (stable) and data/streaming (React 18/19, <code>use()</code>), and pairing with an Error Boundary.`,
    examples: [
      {
        label: "Suspense with a lazy component",
        runnable: false,
        code: `import { lazy, Suspense } from "react";

// the chunk for Heavy loads on demand; Suspense shows the fallback meanwhile
const Heavy = lazy(() => import("./Heavy.js"));

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Suspense fallback={<p>Loading…</p>}>
        <Heavy />
      </Suspense>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Describe the benefits of using TypeScript with React.",
    answer: `**Core concept.** TypeScript adds **static typing** to React: you type props, state, hooks, events, and context, so mistakes (wrong prop, missing field, bad event handler) are caught at **compile time** instead of crashing at runtime. You also get far better **autocomplete**, **refactoring**, and self-documenting components.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Catch prop/state mistakes before runtime</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">plain JS</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">wrong prop → runtime crash</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">weak autocomplete</text>
  <text x="135" y="124" fill="#ef4444" font-size="9" text-anchor="middle">refactors are risky</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">TypeScript + React</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">errors at compile time</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">rich IntelliSense</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">safe refactors, self-docs</text>
</svg>`)}

**How it works.** You describe a component's contract with a props type/interface, and the compiler enforces every usage — passing the wrong type, forgetting a required prop, or accessing a field that might be <code>undefined</code> all become red squiggles, not production bugs. Generics make hooks precise: <code>useState&lt;User | null&gt;(null)</code>, typed <code>useReducer</code> actions, and typed context. React ships types for events (<code>React.ChangeEvent&lt;HTMLInputElement&gt;</code>) and children (<code>React.ReactNode</code>). The payoff compounds on large teams: editor autocomplete, confident refactoring, and types acting as living documentation. The cost is a learning curve and some boilerplate — usually well worth it beyond toy apps.

### What you gain
| Benefit | Example |
| --- | --- |
| typed props | required/optional fields enforced |
| typed hooks | <code>useState&lt;T&gt;</code>, typed reducers |
| typed events | <code>ChangeEvent&lt;HTMLInputElement&gt;</code> |
| tooling | autocomplete, safe refactors |

> **Interview tip:** Lead with **compile-time safety** for props/state/events plus tooling (autocomplete, refactoring) and self-documentation. Note TS replaces runtime **PropTypes**, and mention typing hooks via generics.`,
    examples: [
      {
        label: "A typed component + hook (TSX)",
        runnable: false,
        code: `import { useState } from "react";

type User = { id: number; name: string };
type Props = { user: User; onSelect?: (id: number) => void };

// props are checked at compile time; missing/extra props won't compile
export default function UserCard({ user, onSelect }: Props) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => { setOpen(o => !o); onSelect?.(user.id); }}>
        {user.name}
      </button>
      {open && <p>id: {user.id}</p>}
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is `PropTypes` and when would you use it?",
    answer: `**Core concept.** <code>PropTypes</code> (the <code>prop-types</code> package) is a **runtime** type-checker for component props: in **development** it warns in the console when a prop is the wrong type or a required prop is missing. It predates TypeScript adoption — today TS is preferred (compile-time), but PropTypes is still useful in **plain-JS** codebases or libraries.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Runtime prop validation (dev warnings)</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="135" y="64" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">PropTypes</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">checks at runtime (dev)</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">console warning</text>
  <text x="135" y="124" fill="#f59e0b" font-size="9" text-anchor="middle">good for JS projects</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">TypeScript</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">checks at compile time</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">blocks the build</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">preferred today</text>
</svg>`)}

**How it works.** You declare <code>Component.propTypes = { name: PropTypes.string.isRequired, age: PropTypes.number }</code>; in development React validates incoming props and logs a warning for mismatches (it does **not** throw or run in production). It supports primitives, arrays/objects with shapes, enums (<code>oneOf</code>), required flags, and <code>defaultProps</code>. The key difference from TypeScript is **timing**: PropTypes catches issues only when the component actually renders with bad props at runtime, while TS catches them as you type/compile. For new code, prefer TypeScript; reach for PropTypes when you can't adopt TS (a JS-only repo) or want a lightweight runtime guard at a library boundary.

### PropTypes vs TypeScript
| | PropTypes | TypeScript |
| --- | --- | --- |
| When checked | runtime (dev only) | compile time |
| Blocks build | no (warns) | yes |
| Coverage | props only | whole codebase |
| Today | legacy/JS projects | preferred |

> **Interview tip:** "Runtime prop validation that warns in dev." Contrast with TypeScript (compile-time, preferred). Use PropTypes only in JS-only codebases or as a runtime guard — and know it's dev-only.`,
    examples: [
      {
        label: "Declaring propTypes",
        runnable: false,
        code: `import PropTypes from "prop-types";

function Greeting({ name, age }) {
  return <p style={{ fontFamily: "system-ui" }}>Hi {name}, age {age}</p>;
}

Greeting.propTypes = {
  name: PropTypes.string.isRequired,   // warns in dev if missing/wrong type
  age: PropTypes.number,
};
Greeting.defaultProps = { age: 0 };

export default function App() {
  // Passing age="oops" would log a dev warning (string, not number)
  return <Greeting name="Ada" age={36} />;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is server-side rendering (SSR) and when would you use it with React?",
    answer: `**Core concept.** SSR renders your React components to **HTML on the server** for each request and sends ready-to-display markup; the client then **hydrates** it to add interactivity. Use it when you need a **fast first paint** and strong **SEO** — content/marketing sites, e-commerce, anything indexed or latency-sensitive. In practice you use a framework like **Next.js**.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Server renders HTML → client hydrates</text>
  <rect x="20" y="56" width="150" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="95" y="76" fill="#8b5cf6" font-size="9.5" font-weight="700" text-anchor="middle">server</text>
  <text x="95" y="90" fill="currentColor" font-size="8" text-anchor="middle">renderToString → HTML</text>
  <rect x="200" y="56" width="130" height="44" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="265" y="76" fill="#22c55e" font-size="9.5" font-weight="700" text-anchor="middle">browser</text>
  <text x="265" y="90" fill="currentColor" font-size="8" text-anchor="middle">shows content fast</text>
  <rect x="360" y="56" width="140" height="44" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/>
  <text x="430" y="76" fill="#06b6d4" font-size="9.5" font-weight="700" text-anchor="middle">hydrate</text>
  <text x="430" y="90" fill="currentColor" font-size="8" text-anchor="middle">attach interactivity</text>
  <path d="M 170 78 L 198 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#sr-a)"/>
  <path d="M 330 78 L 358 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#sr-a)"/>
  <defs><marker id="sr-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Instead of shipping an empty shell that the browser must fill in (CSR), the server runs React (<code>renderToString</code>/<code>renderToPipeableStream</code>) to produce the page's HTML, so users — and crawlers — get real content immediately. The same component tree then **hydrates** on the client to wire up events and state. Benefits: better **perceived performance** (faster first contentful paint), **SEO** (indexable markup), and good social/link previews. Costs: a Node server (or edge runtime), per-request compute, and care to avoid **hydration mismatches**. Often you don't need SSR for every page — frameworks let you mix **SSG** (pre-render at build), **ISR**, SSR, and CSR per route. React Server Components + streaming push even more work to the server.

### When SSR fits
| Use SSR when | Skip it when |
| --- | --- |
| SEO matters | internal dashboard/app |
| fast first paint needed | content is fully dynamic per user |
| social previews | no server available |
| content-heavy pages | tiny static site (SSG instead) |

> **Interview tip:** "Render HTML on the server per request, then hydrate." Sell SEO + fast first paint; mention the cost (server, hydration mismatches) and that frameworks mix SSG/ISR/SSR/CSR per route. Name **Next.js**.`,
    examples: [
      {
        label: "The server-render → hydrate shape",
        runnable: false,
        code: `// SERVER (Node): produce HTML from the React tree
//   import { renderToString } from "react-dom/server";
//   const html = renderToString(<App />);
//   res.send('<div id="root">' + html + '</div><script src="/client.js">');

// CLIENT: adopt that HTML instead of rebuilding it
//   import { hydrateRoot } from "react-dom/client";
//   hydrateRoot(document.getElementById("root"), <App />);

// In practice a framework (Next.js) does all of this for you.
export default function App() {
  return <h1 style={{ fontFamily: "system-ui" }}>Rendered on the server, hydrated on the client.</h1>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between client-side rendering (CSR) and server-side rendering (SSR) in React?",
    answer: `**Core concept.** With **CSR**, the server sends a near-empty HTML shell plus a JS bundle and the **browser** builds the page. With **SSR**, the **server** renders full HTML per request (fast first paint + SEO), then the client **hydrates** it. CSR is app-like and cheap to host but slower to first paint and weaker for SEO; SSR is the reverse trade-off.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Where the first HTML is built</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="64" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">CSR</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">empty shell + JS → browser</text>
  <text x="135" y="104" fill="#ef4444" font-size="9" text-anchor="middle">slower first paint, weak SEO</text>
  <text x="135" y="124" fill="#22c55e" font-size="9" text-anchor="middle">cheap host, app-like nav</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">SSR</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">full HTML per request → hydrate</text>
  <text x="385" y="104" fill="#22c55e" font-size="9" text-anchor="middle">fast first paint, strong SEO</text>
  <text x="385" y="124" fill="#ef4444" font-size="9" text-anchor="middle">more server cost</text>
</svg>`)}

**How it works.** In **CSR**, first load waits on downloading and executing JavaScript before anything meaningful appears, and crawlers initially see little markup — but subsequent navigation is instant and you can host static files cheaply. In **SSR**, the server does the initial render so content (and SEO) is ready immediately; the client then hydrates to take over interactivity, at the cost of per-request server work and care around hydration mismatches. It's not binary: frameworks like **Next.js** choose per route, mixing **SSG** (build-time), **ISR**, SSR, and CSR, and React Server Components + streaming blur the line further. Pick based on SEO needs, time-to-first-paint targets, and infrastructure.

### CSR vs SSR
| | CSR | SSR |
| --- | --- | --- |
| HTML built | browser | server |
| First paint | slower (after JS) | fast (ready HTML) |
| SEO | weaker | strong |
| Server cost | low | higher |
| Then | hydrate not needed | hydrate to interact |

> **Interview tip:** Map each to where HTML is built and the trade-offs (first paint + SEO vs server cost). Add **SSG**/hydration and that frameworks pick per-route — it's a spectrum, not either/or.`,
    examples: [
      {
        label: "CSR mount vs SSR render+hydrate",
        runnable: false,
        code: `// CSR — browser builds the UI from an empty shell:
//   createRoot(document.getElementById("root")).render(<App />);
//   (initial HTML: <div id="root"></div>)

// SSR — server sends full HTML, client hydrates it:
//   server:  const html = renderToString(<App />);
//   client:  hydrateRoot(document.getElementById("root"), <App />);

// SSG is the same server render done once at BUILD time.
export default function App() {
  return <p style={{ fontFamily: "system-ui", padding: 24 }}>CSR vs SSR vs SSG</p>;
}`,
      },
    ],
  },
];

export default augments;
