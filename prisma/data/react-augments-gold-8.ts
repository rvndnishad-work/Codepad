/**
 * React Phase R1 — Batch 8 (Fundamentals & ecosystem). Gold-standard rewrites.
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
    title: "How would you structure a large React application?",
    answer: `**Core concept.** Organize by **feature/domain**, not by file type. Group each feature's components, hooks, state, and tests together (colocation), keep a shared <code>ui</code>/<code>lib</code> layer for cross-cutting pieces, isolate the **data layer**, lazy-load routes, and enforce consistent conventions. The goal is that related code changes together and the structure "screams" what the app does.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">By feature (colocated) beats by file-type</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="64" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">features/cart/</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">components · hooks</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">api · state · tests</text>
  <text x="135" y="124" fill="#22c55e" font-size="9" text-anchor="middle">changes together</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="385" y="64" fill="#ef4444" font-size="10.5" font-weight="700" text-anchor="middle">components/ hooks/ utils/</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">split by type</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">one feature = many folders</text>
  <text x="385" y="124" fill="#ef4444" font-size="9" text-anchor="middle">hard to navigate at scale</text>
</svg>`)}

**How it works.** As an app grows, type-based folders (<code>components/</code>, <code>hooks/</code>, <code>utils/</code>) scatter one feature across the tree, so a change touches many directories. **Feature folders** colocate everything a feature needs, exposing a small public surface (an index/barrel) and keeping internals private. A shared layer holds the design-system <code>ui</code> components and generic <code>lib</code> helpers; the **data layer** (API clients, query hooks) is separated so UI doesn't know transport details. Route-level **code-splitting** (<code>lazy</code>) keeps bundles small. Add guardrails — TypeScript, ESLint/Prettier, a consistent state-management choice, and path aliases — so conventions scale across a team.

### Structure principles
| Principle | Why |
| --- | --- |
| feature/domain folders | related code changes together |
| colocation | components + hooks + tests nearby |
| shared <code>ui</code>/<code>lib</code> | reuse without duplication |
| separate data layer | UI decoupled from transport |
| route code-splitting | smaller bundles |

> **Interview tip:** Say "organize by **feature**, not file type" and colocate. Mention a separate data layer, route-based code-splitting, and tooling (TS/ESLint/aliases) for consistency. Avoid one giant <code>components/</code> folder.`,
    examples: [
      {
        label: "A feature-folder layout",
        runnable: false,
        code: `// Feature-based structure (colocated, scalable):
//
// src/
//   features/
//     cart/
//       CartPage.jsx
//       CartItem.jsx
//       useCart.js          // feature hook
//       cartApi.js          // data layer for this feature
//       cart.test.js
//       index.js            // public surface (barrel)
//     auth/ ...
//   ui/        Button.jsx, Modal.jsx     // shared design system
//   lib/       http.js, formatDate.js    // generic helpers
//   app/       routes.jsx, providers.jsx
//
// Routes lazy-load each feature:
import { lazy } from "react";
const CartPage = lazy(() => import("../features/cart"));
export default CartPage;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are React Components?",
    answer: `**Core concept.** Components are the **reusable, independent building blocks** of a React UI. A component is typically a JavaScript **function** that accepts inputs (**props**) and returns **JSX** describing what to render. You compose small components into larger ones to build the whole interface.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Small components compose into a UI tree</text>
  <rect x="180" y="38" width="160" height="32" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="59" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">&lt;App /&gt;</text>
  <g font-size="9" text-anchor="middle">
    <rect x="60" y="104" width="110" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="115" y="123" fill="currentColor">&lt;Header /&gt;</text>
    <rect x="205" y="104" width="110" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="260" y="123" fill="currentColor">&lt;Feed /&gt;</text>
    <rect x="350" y="104" width="110" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="405" y="123" fill="currentColor">&lt;Sidebar /&gt;</text>
  </g>
  <path d="M 230 70 L 130 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#rc-a)"/>
  <path d="M 260 70 L 260 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#rc-a)"/>
  <path d="M 290 70 L 390 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#rc-a)"/>
  <defs><marker id="rc-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** A component encapsulates a piece of UI plus its logic, so you build and reason about the interface in small, testable units and reuse them. Modern React uses **function components** (with hooks for state/effects); **class components** are the older form, now mostly legacy. Good components are **pure** (same props → same output), have a **single responsibility**, and communicate via props down + callbacks up. Their names must be **capitalized** (so JSX treats <code>&lt;Button /&gt;</code> as a component, not an HTML tag). Composition — nesting components and passing <code>children</code> — is how you assemble complex screens from simple parts.

### Component traits
| Trait | Meaning |
| --- | --- |
| reusable | use the same component many places |
| props-driven | configured by inputs |
| pure | same props → same UI |
| composable | nest to build bigger UIs |

> **Interview tip:** "Reusable UI building blocks — functions taking props, returning JSX." Mention function vs class (function is standard), purity/single-responsibility, capitalized names, and composition via <code>children</code>.`,
    examples: [
      {
        label: "Compose small components",
        runnable: false,
        code: `function Avatar({ name }) {
  return <span style={{ marginRight: 8 }}>👤 {name}</span>;
}
function UserRow({ name, role }) {       // composes Avatar
  return <li><Avatar name={name} /> — {role}</li>;
}

export default function App() {
  const users = [{ name: "Ada", role: "Eng" }, { name: "Grace", role: "Sci" }];
  return (
    <ul style={{ padding: 24, fontFamily: "system-ui" }}>
      {users.map((u) => <UserRow key={u.name} {...u} />)}
    </ul>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is React and its main features?",
    answer: `**Core concept.** React is an open-source **JavaScript library for building user interfaces** out of components. Its defining features: a **component-based** architecture, a **declarative** programming model, a **virtual DOM** for efficient updates, **one-way data flow**, **JSX**, and **hooks** — backed by a huge ecosystem.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">A UI library: declarative, component-based</text>
  <g font-size="9">
    <rect x="20" y="44" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="60" fill="currentColor">component-based architecture</text>
    <rect x="20" y="74" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="90" fill="currentColor">declarative (describe the UI)</text>
    <rect x="20" y="104" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="120" fill="currentColor">virtual DOM → efficient updates</text>
  </g>
  <g font-size="9">
    <rect x="268" y="44" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="60" fill="currentColor">JSX + hooks</text>
    <rect x="268" y="74" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="280" y="90" fill="currentColor">one-way data flow</text>
    <rect x="268" y="104" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="280" y="120" fill="currentColor">huge ecosystem</text>
  </g>
</svg>`)}

**How it works.** You build UIs from **components** and describe *what* the UI should look like for a given state; React figures out *how* to update the DOM (via the virtual DOM and reconciliation). State changes flow **one way** (down through props), making behaviour predictable. **JSX** lets you write markup in JavaScript, and **hooks** give function components state, effects, and context. React is a **library** (focused on the view), not a full framework — you add routing, data fetching, and build tooling, or use a meta-framework like **Next.js**. Its "learn once, write anywhere" philosophy extends to **React Native** for mobile.

### Main features
| Feature | What it gives you |
| --- | --- |
| components | reusable UI units |
| declarative | describe UI, not DOM steps |
| virtual DOM | efficient updates |
| hooks + JSX | state/effects + readable markup |
| ecosystem | routing, data, Next.js, RN |

> **Interview tip:** "A **library** for building component-based UIs." List declarative rendering, virtual DOM, one-way data flow, JSX, and hooks. Distinguish library vs framework (you add routing/data; Next.js bundles them).`,
    examples: [
      {
        label: "Declarative, component-based UI",
        runnable: false,
        code: `import { useState } from "react";

// You describe the UI for a given state; React updates the DOM.
export default function App() {
  const [on, setOn] = useState(false);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setOn((v) => !v)}>
        {on ? "🟢 On" : "⚪ Off"}
      </button>
      {on && <p>Declarative rendering in action.</p>}
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the advantages of using React over plain JavaScript?",
    answer: `**Core concept.** With plain JS you **imperatively** find and mutate DOM nodes — verbose and error-prone as apps grow. React lets you write **declarative**, **component-based** UIs driven by state: you describe the result and React efficiently updates the DOM (via the virtual DOM). You gain reuse, maintainability, predictable state, and a vast ecosystem.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Imperative DOM vs declarative, state-driven UI</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">plain JS</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">querySelector + manual edits</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">spaghetti as it grows</text>
  <text x="135" y="124" fill="#ef4444" font-size="9" text-anchor="middle">hard to reuse/maintain</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">React</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">declarative, state → UI</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">reusable components</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">efficient updates + ecosystem</text>
</svg>`)}

**How it works.** In vanilla JS, keeping the DOM in sync with data means manually selecting elements and updating them on every change — the bug surface explodes with complex, interrelated state. React inverts this: you keep **state** and render a **declarative** description; when state changes, React diffs and applies the minimal DOM updates for you. Components make UI **reusable** and testable; one-way data flow makes behaviour **predictable**; and the ecosystem (Router, React Query, Next.js, React Native, DevTools) covers routing, data, SSR, and mobile. The trade-off is a build step and a learning curve — for small static pages, plain JS may be simpler.

### React vs plain JS
| Concern | Plain JS | React |
| --- | --- | --- |
| DOM updates | manual/imperative | declarative + virtual DOM |
| Reuse | ad hoc | components |
| State→UI sync | you maintain it | automatic |
| Tooling/ecosystem | minimal | rich |

> **Interview tip:** The core win is **declarative, state-driven rendering** vs manual DOM mutation, plus component reuse, predictability, and ecosystem. Be fair: for tiny/static pages plain JS is fine — React shines as complexity grows.`,
    examples: [
      {
        label: "State-driven vs manual DOM",
        runnable: false,
        code: `import { useState } from "react";

// React: change state, UI follows. (No querySelector, no manual textContent.)
export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      {/* Plain JS equivalent would be:
          document.querySelector("#count").textContent = ++count;  */}
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are React's design principles?",
    answer: `**Core concept.** React's guiding ideas: be **declarative**, **component-based**, favour **composition over inheritance**, enforce **one-way data flow**, keep rendering **pure**, and prioritize **gradual adoption** and developer experience ("learn once, write anywhere"). These principles explain most of React's APIs.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">The ideas behind the API</text>
  <g font-size="9">
    <rect x="20" y="44" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="60" fill="currentColor">declarative · component-based</text>
    <rect x="20" y="74" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="90" fill="currentColor">composition over inheritance</text>
    <rect x="20" y="104" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="120" fill="currentColor">one-way data flow</text>
  </g>
  <g font-size="9">
    <rect x="268" y="56" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="72" fill="currentColor">pure render (no side effects)</text>
    <rect x="268" y="90" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="280" y="106" fill="currentColor">gradual adoption · DX</text>
  </g>
</svg>`)}

**How it works.** **Declarative** rendering means you describe the UI for a state and React handles DOM updates. **Component-based** structure makes UIs modular and reusable. **Composition over inheritance** is how you reuse and customize behaviour (children, props, hooks) rather than class hierarchies. **Unidirectional data flow** keeps state predictable and debuggable. Render functions are expected to be **pure** (same inputs → same output, no side effects), which is what enables features like concurrent rendering and StrictMode's checks. React also values **stability and incremental adoption** — you can add it to part of a page — and a strong developer experience (clear errors, DevTools, hooks ergonomics).

### Principles → APIs
| Principle | Shows up as |
| --- | --- |
| declarative | JSX, state→render |
| composition | <code>children</code>, hooks, render props |
| one-way flow | props down, callbacks up |
| pure render | hooks rules, StrictMode |

> **Interview tip:** Name the big four — declarative, component-based, **composition over inheritance**, unidirectional flow — plus **pure render** (why hooks rules + StrictMode exist) and gradual adoption.`,
    examples: [
      {
        label: "Composition over inheritance, in practice",
        runnable: false,
        code: `// React reuses behaviour by COMPOSING, not subclassing.
function Panel({ title, children }) {       // generic, declarative
  return (
    <section style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
      <strong>{title}</strong>
      {children}                              {/* composition */}
    </section>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Panel title="Profile"><p>Composed, not inherited.</p></Panel>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of `React.StrictMode`?",
    answer: `**Core concept.** <code>&lt;StrictMode&gt;</code> is a **development-only** helper that surfaces potential problems in your app. It intentionally **double-invokes** renders and effects (mount → unmount → remount) to expose impure renders and missing effect cleanup, and it warns about deprecated/unsafe APIs. It renders **no visible UI** and has **zero effect in production**.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Dev-only checks; no output, no prod impact</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="64" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">double-invoke (dev)</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">render + effects run twice</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">exposes impurity</text>
  <text x="135" y="124" fill="#06b6d4" font-size="9" text-anchor="middle">+ missing cleanup</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">warnings</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">deprecated/unsafe APIs</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">no UI rendered</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">stripped in production</text>
</svg>`)}

**How it works.** Wrapping part of the tree in <code>&lt;StrictMode&gt;</code> tells React to run extra checks during development. The most visible is **double-invoking** component render functions and effect setup/cleanup, which reveals bugs that rely on impure renders or effects that don't clean up (e.g. duplicate subscriptions). It also flags legacy string refs, deprecated lifecycle methods, and unexpected side effects. None of this changes what users see, and React **removes** the behaviour in production builds — so a state value appearing to increment twice in dev is StrictMode, not a real bug. It's how React nudges your code toward the purity that concurrent features require.

### What StrictMode checks
| Check | Catches |
| --- | --- |
| double render | impure render logic |
| double effect mount | missing cleanup |
| deprecation warnings | unsafe/legacy APIs |
| prod behaviour | none (dev-only) |

> **Interview tip:** "Dev-only; double-invokes render/effects to expose impurity and missing cleanup, warns on legacy APIs, **no prod effect**." Reassure that the dev double-render is expected — it prepares code for concurrent rendering.`,
    examples: [
      {
        label: "Wrapping the app in StrictMode",
        runnable: false,
        code: `import { StrictMode, useState, useEffect } from "react";

function Demo() {
  const [n] = useState(0);
  useEffect(() => {
    console.log("effect ran");          // logs TWICE in dev under StrictMode
    return () => console.log("cleanup"); // verifying your cleanup is correct
  }, []);
  return <p>n={n}</p>;
}

// In real apps this wraps the root render.
export default function App() {
  return (
    <StrictMode>
      <div style={{ padding: 24, fontFamily: "system-ui" }}><Demo /></div>
    </StrictMode>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the role of `react-dom`?",
    answer: `**Core concept.** <code>react</code> is the renderer-agnostic core (components, hooks, elements); <code>react-dom</code> is the package that **renders React to the browser DOM**. It provides <code>createRoot</code>/<code>render</code> (mount an app), <code>hydrateRoot</code> (attach to SSR HTML), <code>createPortal</code>, and <code>flushSync</code>.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">One core, many renderers</text>
  <rect x="180" y="38" width="160" height="32" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="59" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">react (core)</text>
  <g font-size="9" text-anchor="middle">
    <rect x="60" y="104" width="120" height="30" rx="6" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="120" y="123" fill="currentColor">react-dom (web)</text>
    <rect x="205" y="104" width="120" height="30" rx="6" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="265" y="123" fill="currentColor">react-native</text>
    <rect x="350" y="104" width="120" height="30" rx="6" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="410" y="123" fill="currentColor">react-three-fiber</text>
  </g>
  <path d="M 230 70 L 130 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#rd-a)"/>
  <path d="M 260 70 L 262 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#rd-a)"/>
  <path d="M 290 70 L 400 102" stroke="currentColor" stroke-width="1.2" marker-end="url(#rd-a)"/>
  <defs><marker id="rd-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** React's core only knows about components and elements — it doesn't know about the DOM. A **renderer** turns React's element tree into a target: <code>react-dom</code> targets the browser DOM, <code>react-native</code> targets native views, and others target canvas/3D. In a web app you call <code>createRoot(document.getElementById("root")).render(&lt;App /&gt;)</code> to mount, or <code>hydrateRoot</code> to make server-rendered HTML interactive. <code>react-dom</code> also exposes <code>createPortal</code> (render into a different DOM node, for modals/tooltips) and <code>flushSync</code> (force a synchronous update). Server rendering lives in <code>react-dom/server</code> (<code>renderToString</code>/<code>renderToPipeableStream</code>).

### react-dom APIs
| API | Purpose |
| --- | --- |
| <code>createRoot().render()</code> | mount an app (React 18) |
| <code>hydrateRoot()</code> | attach to SSR HTML |
| <code>createPortal()</code> | render into another DOM node |
| <code>flushSync()</code> | force a sync update |

> **Interview tip:** "react = core (renderer-agnostic); react-dom = the **web renderer**." Name <code>createRoot</code>/<code>hydrateRoot</code>/<code>createPortal</code> and that other renderers (React Native) reuse the same core.`,
    examples: [
      {
        label: "Mounting with react-dom",
        runnable: false,
        code: `import { createRoot } from "react-dom/client";

function App() {
  return <h1 style={{ fontFamily: "system-ui" }}>Hello from react-dom</h1>;
}

// react-dom turns the React tree into real DOM and mounts it:
//   const root = createRoot(document.getElementById("root"));
//   root.render(<App />);
// (hydrateRoot(...) would be used instead for server-rendered HTML.)

export default App;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the role of a bundler like Webpack in a React project?",
    answer: `**Core concept.** Browsers can't run JSX/TypeScript or efficiently load hundreds of separate module files. A **bundler** (Webpack, **Vite**, esbuild, Rollup) **transpiles** your JSX/TS (via Babel/SWC), **bundles** modules into optimized files, processes assets (CSS/images), enables **code-splitting** and **tree-shaking**, and runs a dev server with **hot module replacement**.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Source modules → transpile + bundle → browser assets</text>
  <rect x="20" y="56" width="140" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="90" y="76" fill="#8b5cf6" font-size="9.5" font-weight="700" text-anchor="middle">JSX / TS / CSS</text>
  <text x="90" y="90" fill="currentColor" font-size="8" text-anchor="middle">many modules</text>
  <rect x="200" y="56" width="130" height="44" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/>
  <text x="265" y="76" fill="#06b6d4" font-size="9.5" font-weight="700" text-anchor="middle">bundler</text>
  <text x="265" y="90" fill="currentColor" font-size="8" text-anchor="middle">Babel/SWC + split</text>
  <rect x="370" y="56" width="130" height="44" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="435" y="76" fill="#22c55e" font-size="9.5" font-weight="700" text-anchor="middle">optimized JS/CSS</text>
  <text x="435" y="90" fill="currentColor" font-size="8" text-anchor="middle">chunks, minified</text>
  <path d="M 160 78 L 198 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#bu-a)"/>
  <path d="M 330 78 L 368 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#bu-a)"/>
  <defs><marker id="bu-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** You author code in JSX/TS across many files; the bundler builds a dependency graph and produces a few optimized assets the browser can load. Along the way it **transpiles** modern syntax/JSX (Babel or SWC) for browser compatibility, **minifies**, **tree-shakes** unused exports, splits code into **chunks** (so routes load on demand), fingerprints filenames for caching, and inlines/loads assets. In development it serves the app with **HMR**, updating modules without a full reload. Webpack is the long-time standard (and what Create React App used); **Vite** (esbuild + Rollup) is now the popular default for its near-instant dev server. Meta-frameworks (Next.js) wrap all of this for you.

### What the bundler does
| Job | Benefit |
| --- | --- |
| transpile JSX/TS | browser-compatible JS |
| bundle modules | fewer requests |
| code-split | load routes on demand |
| tree-shake/minify | smaller bundles |
| dev server + HMR | fast feedback |

> **Interview tip:** "Browsers don't run JSX or load hundreds of modules well — the bundler transpiles, bundles, code-splits, tree-shakes, and serves HMR." Mention Webpack vs **Vite** (esbuild/Rollup) and that Next.js wraps the toolchain.`,
    examples: [
      {
        label: "What the bundler turns your entry into",
        runnable: false,
        code: `// You write modular JSX/TS:
//   src/index.jsx → imports App → imports Button, api, styles.css …
//
// The bundler (Webpack/Vite) produces browser-ready output:
//   dist/
//     index.html
//     assets/index-a1b2c3.js     (your app, transpiled + minified)
//     assets/vendor-d4e5f6.js    (React etc., split for caching)
//     assets/Settings-7890.js    (lazy route chunk, loaded on demand)
//
// Transpilation example (Babel/SWC): JSX → React.createElement
const el = <h1>Hi</h1>;             // becomes createElement("h1", null, "Hi")
export default function App() { return el; }`,
      },
    ],
  },
];

export default augments;
