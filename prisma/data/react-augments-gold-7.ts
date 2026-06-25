/**
 * React Phase R1 — Batch 7 (Data, async & meta). Gold-standard rewrites.
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
    title: "How do you fetch data in React?",
    answer: `**Core concept.** The basic approach is to fetch inside <code>useEffect</code> and track **loading / error / data** state, with cleanup to avoid race conditions. For anything real, prefer a **data library** (React Query / SWR) that adds caching, deduping, and revalidation — or a framework's data loaders. React 19's <code>use()</code> can unwrap a promise directly with Suspense.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Track loading / error / data; prefer a cache</text>
  <g font-size="9" text-anchor="middle">
    <rect x="30" y="56" width="100" height="40" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/><text x="80" y="80" fill="currentColor">loading</text>
    <rect x="160" y="56" width="100" height="40" rx="8" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444"/><text x="210" y="80" fill="currentColor">error</text>
    <rect x="290" y="56" width="100" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="340" y="80" fill="currentColor">data</text>
  </g>
  <rect x="410" y="56" width="90" height="40" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/>
  <text x="455" y="74" fill="#06b6d4" font-size="9" font-weight="700" text-anchor="middle">React Query</text>
  <text x="455" y="88" fill="currentColor" font-size="7.5" text-anchor="middle">caches all this</text>
</svg>`)}

**How it works.** A manual fetch lives in an effect keyed by its inputs: set <code>loading</code>, call the API, then store <code>data</code> or <code>error</code>, and use an <code>ignore</code>/<code>AbortController</code> guard in the cleanup so a stale response can't overwrite a newer one. This is fine for simple cases but you quickly re-implement caching, refetch-on-focus, retries, and pagination — which is exactly what **React Query**/**SWR** give you, keyed by a query key. In frameworks (Next.js, Remix) data is often loaded on the server. React 19 adds <code>use(promise)</code> to read a promise inside render with a Suspense boundary handling the pending state.

### Data-fetching options
| Approach | Notes |
| --- | --- |
| <code>useEffect</code> + state | manual loading/error/race handling |
| React Query / SWR | caching, dedup, revalidation (recommended) |
| framework loaders | server-side, Next/Remix |
| <code>use(promise)</code> + Suspense | React 19, declarative |

> **Interview tip:** Show the manual pattern (loading/error/data + race guard) but recommend **React Query/SWR** for real apps — emphasise that fetched data is *server state* and shouldn't sit in Redux. Mention React 19 <code>use()</code> + Suspense.`,
    examples: [
      {
        label: "Manual fetch with loading/error/race guard",
        runnable: false,
        code: `import { useState, useEffect } from "react";

export default function App() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let ignore = false;
    fetch("https://api.example.com/user/1")
      .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then((data) => { if (!ignore) setState({ loading: false, error: null, data }); })
      .catch((error) => { if (!ignore) setState({ loading: false, error, data: null }); });
    return () => { ignore = true; };   // discard stale response
  }, []);

  if (state.loading) return <p>Loading…</p>;
  if (state.error) return <p>Error: {state.error.message}</p>;
  return <pre style={{ fontFamily: "system-ui" }}>{JSON.stringify(state.data, null, 2)}</pre>;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle asynchronous operations in React functional components?",
    answer: `**Core concept.** Put async work where it belongs: **user-triggered** async (submitting a form) in **event handlers**; async that **synchronizes** with external data (fetching for current props) in <code>useEffect</code>. Effects can't be <code>async</code> themselves, so define an async function inside. Track pending/error state, use <code>try/catch</code> with <code>async/await</code>, and guard against races/unmount.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Async in handlers vs effects (with pending UI)</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.4"/>
  <text x="135" y="64" fill="#06b6d4" font-size="10.5" font-weight="700" text-anchor="middle">event handler</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">await on submit/click</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">setPending → try/catch</text>
  <text x="135" y="124" fill="currentColor" font-size="9" text-anchor="middle">React 19: Actions</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.4"/>
  <text x="385" y="64" fill="#8b5cf6" font-size="10.5" font-weight="700" text-anchor="middle">useEffect</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">async fn defined inside</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">race/abort guard in cleanup</text>
  <text x="385" y="124" fill="currentColor" font-size="9" text-anchor="middle">re-run on deps</text>
</svg>`)}

**How it works.** Because an effect's return value is its **cleanup**, you can't mark the effect <code>async</code> (that returns a promise) — instead declare <code>async function run() { … }</code> inside and call <code>run()</code>. With <code>async/await</code>, wrap calls in <code>try/catch</code> and reflect status in state so the UI can show spinners and errors. For user-driven async (saving, deleting), do it in the handler and optionally <code>useTransition</code> to keep the UI responsive. **React 19 Actions** (<code>&lt;form action={asyncFn}&gt;</code> with <code>useActionState</code>/<code>useFormStatus</code>) bake pending/error handling in. As always, guard async results against stale state and unmounts.

### Async placement
| Trigger | Where |
| --- | --- |
| user action | event handler / Action |
| sync with data | <code>useEffect</code> (async fn inside) |
| keep UI responsive | <code>useTransition</code> |
| caching/retries | React Query / SWR |

> **Interview tip:** "Effects can't be <code>async</code> — define the async fn inside." Split async by trigger (handler vs effect), always manage pending/error state, and guard races. Bonus: React 19 form Actions for built-in pending state.`,
    examples: [
      {
        label: "Async in a handler with pending + try/catch",
        runnable: false,
        code: `import { useState } from "react";

export default function App() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");

  async function save() {
    setPending(true);
    try {
      const res = await fetch("/api/save", { method: "POST" });
      setResult(res.ok ? "saved" : "failed");
    } catch (e) {
      setResult("error: " + e.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      <p>{result}</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you interact with external APIs in React?",
    answer: `**Core concept.** Call REST or GraphQL endpoints with <code>fetch</code>/<code>axios</code> from an **event handler** (for actions) or a <code>useEffect</code>/data-library (for loading), and manage **loading / error / data**. Keep base URLs and keys in **environment variables**, handle auth headers, and prefer **React Query** (or Apollo/urql for GraphQL) for caching and revalidation.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Component ↔ API: fetch/axios + cache layer</text>
  <rect x="20" y="56" width="140" height="44" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/>
  <text x="90" y="82" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">component</text>
  <rect x="200" y="56" width="130" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="265" y="76" fill="#8b5cf6" font-size="9.5" font-weight="700" text-anchor="middle">fetch / axios</text>
  <text x="265" y="90" fill="currentColor" font-size="8" text-anchor="middle">+ React Query cache</text>
  <rect x="370" y="56" width="130" height="44" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="435" y="82" fill="#22c55e" font-size="10" font-weight="700" text-anchor="middle">REST / GraphQL</text>
  <path d="M 160 78 L 198 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#ia-a)"/>
  <path d="M 330 78 L 368 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#ia-a)"/>
  <defs><marker id="ia-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** The mechanics are standard HTTP: set the method, headers (<code>Content-Type</code>, <code>Authorization</code>), and a JSON body; check <code>res.ok</code> because <code>fetch</code> doesn't reject on 4xx/5xx; parse the response. Centralize this in a small **API client** module (base URL from <code>import.meta.env</code>/<code>process.env</code>, shared error handling, token injection) so components stay clean. For caching, retries, optimistic updates, and avoiding waterfalls, wrap calls in **React Query**; for GraphQL use **Apollo Client** or **urql**, which add normalized caching. Always handle loading/error in the UI and cancel in-flight requests on unmount.

### Interacting with APIs
| Concern | Approach |
| --- | --- |
| transport | <code>fetch</code> / <code>axios</code> (REST), GraphQL client |
| config/secrets | env vars, central API client |
| caching/retries | React Query / SWR / Apollo |
| errors | check <code>res.ok</code>, try/catch |

> **Interview tip:** Mention centralizing calls in an API client, env vars for config, checking <code>res.ok</code>, and caching via React Query/Apollo. Note CORS is a server concern and never put secrets in client code.`,
    examples: [
      {
        label: "A small typed API client",
        runnable: false,
        code: `const BASE = "https://api.example.com"; // from import.meta.env in real apps

async function api(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

import { useState } from "react";
export default function App() {
  const [user, setUser] = useState(null);
  const load = () => api("/users/1").then(setUser).catch(console.error);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={load}>Load user</button>
      <pre>{user && JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle routing in React applications?",
    answer: `**Core concept.** React has **no built-in router** — you add one. **React Router** is the common library: you map URL paths to components, navigate with <code>&lt;Link&gt;</code> (no full page reload), read URL params with hooks, and nest routes. Frameworks like **Next.js**/**Remix** provide file-based routing instead.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">URL → matched component (client-side, no reload)</text>
  <g font-size="9" text-anchor="middle">
    <rect x="30" y="56" width="120" height="40" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/><text x="90" y="74" fill="currentColor">/users/42</text><text x="90" y="88" fill="currentColor" font-size="8">URL</text>
    <rect x="200" y="56" width="120" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="260" y="74" fill="currentColor">&lt;Routes&gt;</text><text x="260" y="88" fill="currentColor" font-size="8">match path</text>
    <rect x="370" y="56" width="130" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="435" y="74" fill="currentColor">&lt;UserPage/&gt;</text><text x="435" y="88" fill="currentColor" font-size="8">render</text>
  </g>
  <path d="M 150 76 L 198 76" stroke="currentColor" stroke-width="1.3" marker-end="url(#ro-a)"/>
  <path d="M 320 76 L 368 76" stroke="currentColor" stroke-width="1.3" marker-end="url(#ro-a)"/>
  <defs><marker id="ro-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** A client-side router intercepts navigation, updates the URL via the History API, and swaps the rendered component **without a full reload** — giving an app-like feel. With React Router you declare <code>&lt;Route path="/users/:id" element={&lt;User /&gt;} /&gt;</code>, link with <code>&lt;Link to="…"&gt;</code>, read params with <code>useParams</code>, and navigate programmatically with <code>useNavigate</code>. **Nested routes** + <code>&lt;Outlet /&gt;</code> compose shared layouts; loaders/actions (v6.4+) handle data. File-based frameworks map folders/files to routes and add SSR. For SPAs, configure the server to serve <code>index.html</code> for unknown paths so deep links work.

### Routing essentials
| Need | React Router |
| --- | --- |
| define routes | <code>&lt;Routes&gt;</code> / <code>&lt;Route&gt;</code> |
| navigate | <code>&lt;Link&gt;</code>, <code>useNavigate</code> |
| URL params | <code>useParams</code> |
| nested layouts | <code>&lt;Outlet /&gt;</code> |

> **Interview tip:** State that routing isn't built in (React Router or a framework). Hit client-side navigation (History API, no reload), <code>Link</code> vs <code>&lt;a&gt;</code>, params, nested routes/<code>Outlet</code>, and the SPA fallback-to-index server config.`,
    examples: [
      {
        label: "Routes, Link, and URL params",
        runnable: false,
        code: `import { BrowserRouter, Routes, Route, Link, useParams } from "react-router-dom";

function User() {
  const { id } = useParams();           // read :id from the URL
  return <h3>User #{id}</h3>;
}

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ fontFamily: "system-ui", padding: 16 }}>
        <Link to="/">Home</Link> | <Link to="/users/42">User 42</Link>
      </nav>
      <Routes>
        <Route path="/" element={<h3>Home</h3>} />
        <Route path="/users/:id" element={<User />} />
      </Routes>
    </BrowserRouter>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you test React components?",
    answer: `**Core concept.** Use **React Testing Library** (RTL) with a runner like **Jest** or **Vitest**. RTL's philosophy is to test **behaviour the user sees**, not implementation details: render the component, query elements by role/text, simulate user interactions, and assert on the resulting output. Add **Playwright/Cypress** for end-to-end flows.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Render → query → interact → assert</text>
  <g font-size="9" text-anchor="middle">
    <rect x="20" y="58" width="110" height="40" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4"/><text x="75" y="82" fill="currentColor">render()</text>
    <rect x="148" y="58" width="110" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.12" stroke="#8b5cf6"/><text x="203" y="76" fill="currentColor">getByRole</text><text x="203" y="89" fill="currentColor" font-size="8">/ getByText</text>
    <rect x="276" y="58" width="110" height="40" rx="8" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b"/><text x="331" y="76" fill="currentColor">userEvent</text><text x="331" y="89" fill="currentColor" font-size="8">click/type</text>
    <rect x="404" y="58" width="96" height="40" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/><text x="452" y="82" fill="currentColor">expect()</text>
  </g>
  <path d="M 130 78 L 146 78" stroke="currentColor" stroke-width="1.2" marker-end="url(#te-a)"/>
  <path d="M 258 78 L 274 78" stroke="currentColor" stroke-width="1.2" marker-end="url(#te-a)"/>
  <path d="M 386 78 L 402 78" stroke="currentColor" stroke-width="1.2" marker-end="url(#te-a)"/>
  <defs><marker id="te-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** RTL renders the component into a test DOM and gives you queries that mirror how users (and assistive tech) find things — <code>getByRole</code>, <code>getByLabelText</code>, <code>getByText</code> — discouraging brittle tests tied to class names or internal state. You drive interactions with <code>@testing-library/user-event</code> (realistic clicks/typing) and assert on visible results with <code>jest-dom</code> matchers (<code>toBeInTheDocument</code>, <code>toHaveTextContent</code>). For async UI, use <code>findBy*</code>/<code>waitFor</code>. Mock network with **MSW** rather than stubbing <code>fetch</code>. Reserve full **E2E** (Playwright/Cypress) for critical user journeys; keep most tests at the component/integration level.

### Testing stack
| Layer | Tool |
| --- | --- |
| runner | Jest / Vitest |
| component tests | React Testing Library |
| interactions | <code>user-event</code> |
| network mocking | MSW |
| end-to-end | Playwright / Cypress |

> **Interview tip:** Quote RTL's mantra: "test behaviour, not implementation." Query by **role/text**, use <code>user-event</code>, prefer <code>findBy</code>/<code>waitFor</code> for async, and MSW for network. Avoid asserting on internal state.`,
    examples: [
      {
        label: "A behaviour-focused RTL test",
        runnable: false,
        code: `import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>Count: {n}</button>;
}

// the test (runs under Jest/Vitest):
test("increments on click", async () => {
  render(<Counter />);
  const btn = screen.getByRole("button", { name: /count: 0/i });
  await userEvent.click(btn);
  expect(screen.getByRole("button")).toHaveTextContent("Count: 1");
});

export default Counter; // (component under test)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you debug React applications?",
    answer: `**Core concept.** Reach for **React DevTools** first — inspect the component tree, view/edit props/state/hooks, and use the **Profiler** to see what rendered and why. Combine with browser breakpoints, <code>console</code> logging, <code>StrictMode</code> (surfaces side-effect bugs), and **Error Boundaries** for runtime errors.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Tools for React-specific bugs</text>
  <g font-size="9">
    <rect x="20" y="44" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="60" fill="currentColor">React DevTools: tree + props/state</text>
    <rect x="20" y="74" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="90" fill="currentColor">Profiler: why/how long it rendered</text>
    <rect x="20" y="104" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="120" fill="currentColor">StrictMode: surfaces impurity</text>
  </g>
  <g font-size="9">
    <rect x="268" y="56" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="72" fill="currentColor">breakpoints + source maps</text>
    <rect x="268" y="90" width="232" height="24" rx="5" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/><text x="280" y="106" fill="currentColor">Error Boundaries catch crashes</text>
  </g>
</svg>`)}

**How it works.** Many React bugs are about **renders and state**: a component re-rendering too often, stale state, or a prop that's not what you expect. React DevTools shows the live tree with each component's props/state/hooks (editable) so you can confirm assumptions, and its **Profiler** records commits and flags *why* each component rendered and how long it took. For logic bugs, set breakpoints in the Sources panel (source maps map back to your JSX/TS). Wrap risky subtrees in **Error Boundaries** to catch and display render-time crashes. **StrictMode**'s double-invocation in dev exposes effects with missing cleanup or impure renders. Libraries like *why-did-you-render* can pinpoint avoidable re-renders.

### Debugging toolkit
| Symptom | Tool |
| --- | --- |
| wrong props/state | React DevTools inspector |
| too many renders | Profiler / why-did-you-render |
| logic bug | breakpoints + source maps |
| runtime crash | Error Boundary, console |
| effect bugs | StrictMode double-invoke |

> **Interview tip:** Lead with **React DevTools + Profiler** (renders/state are the React-specific concern), then general tools (breakpoints, Error Boundaries). Mention StrictMode as a dev-time bug detector.`,
    examples: [
      {
        label: "Error Boundary surfaces a crash while debugging",
        runnable: false,
        code: `import { Component } from "react";

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    return this.state.error
      ? <pre style={{ color: "crimson" }}>{String(this.state.error)}</pre>
      : this.props.children;
  }
}

function Buggy() { return <div>{undefined.oops}</div>; } // throws

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <ErrorBoundary><Buggy /></ErrorBoundary>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are React Developer Tools and how do you use them?",
    answer: `**Core concept.** React DevTools is a **browser extension** (and standalone app) that adds two panels: **Components** — inspect the component tree with each node's props, state, and hooks (editable live) — and **Profiler** — record renders to see **which** components rendered, **why**, and **how long** they took.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Two panels: inspect tree · profile renders</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="64" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">Components</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">tree + props/state/hooks</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">edit values live</text>
  <text x="135" y="124" fill="currentColor" font-size="9" text-anchor="middle">search, source jump</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="385" y="64" fill="#8b5cf6" font-size="11" font-weight="700" text-anchor="middle">Profiler</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">flamegraph of commits</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">why each render happened</text>
  <text x="385" y="124" fill="currentColor" font-size="9" text-anchor="middle">render durations</text>
</svg>`)}

**How it works.** Install the extension for Chrome/Firefox/Edge (or run the standalone app for React Native). The **Components** tab mirrors your render tree; selecting a component reveals its current props, state, and hook values, which you can **edit** to test behaviour without changing code. You can search components by name and jump to source. The **Profiler** tab records a session: each commit appears as a flamegraph showing render durations, and enabling "highlight updates" / "why did this render" reveals **unnecessary** re-renders — the starting point for memoization or state-colocation fixes. It also marks components using Suspense/transitions.

### DevTools panels
| Panel | Use it for |
| --- | --- |
| Components | inspect/edit props, state, hooks |
| Profiler | render timings + why-rendered |
| highlight updates | spot needless re-renders |
| search | find a component fast |

> **Interview tip:** Two panels: **Components** (inspect/edit props, state, hooks) and **Profiler** (render timings + *why* a component rendered). Mention "highlight updates" for catching wasteful re-renders.`,
    examples: [
      {
        label: "A component whose state you'd inspect in DevTools",
        runnable: false,
        code: `import { useState } from "react";

// In the Components panel you'd see App's hooks: [count, theme].
// In the Profiler you'd see only the text node update each click.
export default function App() {
  const [count, setCount] = useState(0);
  const [theme] = useState("dark");
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>count={count} theme={theme}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does React handle security concerns like XSS?",
    answer: `**Core concept.** React **auto-escapes** any value you interpolate in JSX, rendering it as text rather than HTML — which prevents most cross-site-scripting (XSS). The main ways you can *reintroduce* XSS are <code>dangerouslySetInnerHTML</code> (raw HTML), unsafe URLs (<code>javascript:</code> in <code>href</code>/<code>src</code>), and injecting untrusted data into the DOM outside React.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">JSX escapes by default; opt-outs are the risk</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">safe by default</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">{userInput} → escaped text</text>
  <text x="135" y="106" fill="currentColor" font-size="9" text-anchor="middle">&lt;script&gt; shown literally</text>
  <text x="135" y="126" fill="#22c55e" font-size="9" text-anchor="middle">no HTML injection</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="385" y="64" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">danger zones</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">dangerouslySetInnerHTML</text>
  <text x="385" y="106" fill="currentColor" font-size="9" text-anchor="middle">javascript: in href/src</text>
  <text x="385" y="126" fill="#ef4444" font-size="9" text-anchor="middle">sanitize / validate first</text>
</svg>`)}

**How it works.** When you write <code>{value}</code>, React converts it to a text node, so even <code>&lt;script&gt;</code> shows up as literal characters — attackers can't inject markup. The escape hatches require care: only use <code>dangerouslySetInnerHTML</code> with HTML you've **sanitized** (e.g. **DOMPurify**); validate URL schemes before putting user data in <code>href</code>/<code>src</code> to block <code>javascript:</code> payloads; and avoid bypassing React with raw DOM APIs on untrusted input. Defense in depth helps too: a **Content-Security-Policy**, <code>HttpOnly</code> cookies for tokens (so XSS can't steal them), and server-side validation. React reduces XSS risk dramatically, but it's not a license to render untrusted HTML.

### XSS in React
| Safe | Risky (sanitize!) |
| --- | --- |
| <code>{userInput}</code> (escaped) | <code>dangerouslySetInnerHTML</code> |
| text content | user URLs in <code>href</code>/<code>src</code> |
| attributes via JSX | raw DOM injection |

> **Interview tip:** "JSX auto-escapes interpolated values, preventing most XSS." Then name the opt-outs — <code>dangerouslySetInnerHTML</code> (sanitize with DOMPurify), <code>javascript:</code> URLs — plus CSP and <code>HttpOnly</code> cookies as defense in depth.`,
    examples: [
      {
        label: "Escaped by default; sanitize raw HTML",
        runnable: false,
        code: `export default function App() {
  const userInput = '<img src=x onerror="alert(1)">';

  // ✅ SAFE: rendered as literal text, the tag does not execute
  const safe = <p>{userInput}</p>;

  // ⚠️ ONLY with sanitized HTML (e.g. DOMPurify.sanitize(html)):
  //   <div dangerouslySetInnerHTML={{ __html: clean }} />

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      {safe}
      <small>The markup above is shown as text, not executed.</small>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
