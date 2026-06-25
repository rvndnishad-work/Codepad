/**
 * React Phase R1 — Batch 10 (React 19 features). Gold-standard rewrites.
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
    title: "What changed with Context in React 19 (`<Context>` as a provider)?",
    answer: `**Core concept.** In React 19 you can render the context object **directly** as the provider — <code>&lt;ThemeContext value={…}&gt;</code> — instead of <code>&lt;ThemeContext.Provider value={…}&gt;</code>. It's a small ergonomics win; the old <code>.Provider</code> form still works but is deprecated. You can also read context with the new <code>use()</code> API.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Render the Context itself as the provider</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.06" stroke="#ef4444" stroke-width="1.4"/>
  <text x="135" y="64" fill="#ef4444" font-size="10.5" font-weight="700" text-anchor="middle">before (still works)</text>
  <text x="135" y="92" fill="currentColor" font-size="9" text-anchor="middle">&lt;Ctx.Provider value={v}&gt;</text>
  <text x="135" y="116" fill="#ef4444" font-size="9" text-anchor="middle">.Provider deprecated</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">React 19</text>
  <text x="385" y="92" fill="currentColor" font-size="9" text-anchor="middle">&lt;Ctx value={v}&gt;</text>
  <text x="385" y="116" fill="#22c55e" font-size="9" text-anchor="middle">cleaner, less nesting</text>
</svg>`)}

**How it works.** A context object is now directly renderable as a provider component, so you drop the <code>.Provider</code> suffix. Functionally it's identical — descendants still read the value with <code>useContext(Ctx)</code> (or <code>use(Ctx)</code>), and updating the value still re-renders all consumers (so the usual advice to memoize the value and split contexts by update frequency still applies). React 19 also adds <code>use(Context)</code>, which — unlike <code>useContext</code> — may be called **conditionally**, e.g. inside an <code>if</code>, giving more flexibility for reading context.

### Context in React 19
| | Old | React 19 |
| --- | --- | --- |
| Provider | <code>&lt;Ctx.Provider&gt;</code> | <code>&lt;Ctx&gt;</code> |
| Read | <code>useContext(Ctx)</code> | <code>useContext</code> or <code>use(Ctx)</code> |
| Conditional read | no | <code>use(Ctx)</code> yes |
| Re-render caveat | all consumers | unchanged |

> **Interview tip:** "<code>&lt;Context&gt;</code> is now the provider; <code>.Provider</code> is deprecated." Add that <code>use(Context)</code> can be called conditionally, and the "updates re-render all consumers" caveat is unchanged.`,
    examples: [
      {
        label: "Context object as the provider",
        runnable: false,
        code: `import { createContext, useContext } from "react";

const ThemeContext = createContext("light");

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <p>theme: {theme}</p>;
}

export default function App() {
  return (
    // React 19: render the context directly (no .Provider)
    <ThemeContext value="dark">
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <Toolbar />
      </div>
    </ThemeContext>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How did ref handling change in React 19 (ref as a prop, forwardRef, ref cleanup)?",
    answer: `**Core concept.** React 19 makes <code>ref</code> a **normal prop** for function components — you can accept <code>ref</code> directly in props, so <code>forwardRef</code> is **no longer needed** (and is being deprecated). It also lets a **ref callback return a cleanup function**, which React runs when the element unmounts.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">ref is just a prop now; callbacks can clean up</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#ef4444" fill-opacity="0.06" stroke="#ef4444" stroke-width="1.4"/>
  <text x="135" y="64" fill="#ef4444" font-size="10.5" font-weight="700" text-anchor="middle">before</text>
  <text x="135" y="90" fill="currentColor" font-size="8.5" text-anchor="middle">forwardRef((props, ref) =&gt; …)</text>
  <text x="135" y="114" fill="#ef4444" font-size="9" text-anchor="middle">extra wrapper</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">React 19</text>
  <text x="385" y="88" fill="currentColor" font-size="8.5" text-anchor="middle">function Input({ ref }) {…}</text>
  <text x="385" y="108" fill="currentColor" font-size="8.5" text-anchor="middle">ref={(n) =&gt; { return cleanup }}</text>
  <text x="385" y="128" fill="#22c55e" font-size="9" text-anchor="middle">simpler + cleanup support</text>
</svg>`)}

**How it works.** Previously a function component couldn't receive a <code>ref</code> like a normal prop — you had to wrap it in <code>forwardRef</code> so the ref was passed as a second argument. In React 19 you just destructure <code>ref</code> from props and attach it to a DOM node, removing the boilerplate (existing <code>forwardRef</code> code still works during the transition). Separately, **ref callbacks** can now **return a cleanup** function: <code>ref={(node) => { … ; return () => { … } }}</code> runs the returned function when the node is removed — a tidy place to undo observers/listeners you set up on the node. <code>useImperativeHandle</code> remains for exposing a custom imperative API.

### Ref changes in React 19
| Aspect | Change |
| --- | --- |
| <code>ref</code> on function components | now a regular prop |
| <code>forwardRef</code> | no longer needed (deprecating) |
| ref callback cleanup | return a function to clean up |
| <code>useImperativeHandle</code> | unchanged |

> **Interview tip:** "<code>ref</code> is a normal prop now, so <code>forwardRef</code> is going away," plus "ref callbacks can return a cleanup." Note <code>useImperativeHandle</code> still applies for exposing methods.`,
    examples: [
      {
        label: "ref as a prop + callback cleanup",
        runnable: false,
        code: `import { useRef } from "react";

// React 19: accept ref directly — no forwardRef wrapper
function TextInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />;
}

export default function App() {
  const inputRef = useRef(null);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <TextInput ref={inputRef} placeholder="type" />
      <button onClick={() => inputRef.current.focus()}>Focus</button>

      {/* ref callback returning a cleanup function */}
      <div ref={(node) => {
        if (node) node.dataset.mounted = "yes";
        return () => { /* cleanup when this node unmounts */ };
      }} />
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does React 19 handle document metadata like `<title>` and `<meta>`?",
    answer: `**Core concept.** React 19 lets you render <code>&lt;title&gt;</code>, <code>&lt;meta&gt;</code>, and <code>&lt;link&gt;</code> **anywhere** in your component tree, and it automatically **hoists them into the document <code>&lt;head&gt;</code></code>. No more <code>react-helmet</code> — metadata lives next to the component that owns it, and it works with SSR/streaming.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Tags rendered in a component → hoisted to &lt;head&gt;</text>
  <rect x="20" y="50" width="200" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/>
  <text x="120" y="72" fill="#8b5cf6" font-size="9.5" font-weight="700" text-anchor="middle">&lt;BlogPost&gt;</text>
  <text x="120" y="90" fill="currentColor" font-size="8.5" text-anchor="middle">&lt;title&gt; &lt;meta&gt; &lt;link&gt;</text>
  <rect x="310" y="50" width="190" height="56" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="405" y="72" fill="#22c55e" font-size="9.5" font-weight="700" text-anchor="middle">document &lt;head&gt;</text>
  <text x="405" y="90" fill="currentColor" font-size="8.5" text-anchor="middle">auto-hoisted</text>
  <path d="M 220 78 L 308 78" stroke="currentColor" stroke-width="1.3" marker-end="url(#md-a)"/>
  <text x="264" y="70" fill="currentColor" font-size="8" text-anchor="middle">hoist</text>
  <defs><marker id="md-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** When React 19 encounters supported metadata tags during render, it lifts them out of where they appear and places them in <code>&lt;head&gt;</code> — so a page or route component can declare its own <code>&lt;title&gt;</code> and SEO <code>&lt;meta&gt;</code> tags inline. This removes the need for third-party head managers, keeps metadata colocated with the content it describes, and integrates with **server rendering and streaming** so crawlers/social scrapers get correct tags. It also has built-in support for stylesheets (with precedence) and async scripts, deduplicating them. For complex apps a framework (Next.js) still offers a richer metadata API, but the primitive now lives in React itself.

### Metadata in React 19
| Tag | Behaviour |
| --- | --- |
| <code>&lt;title&gt;</code> | hoisted to <code>&lt;head&gt;</code> |
| <code>&lt;meta&gt;</code> | hoisted (SEO/social) |
| <code>&lt;link&gt;</code> | hoisted, dedup, precedence |
| needs | no react-helmet |

> **Interview tip:** "Render <code>&lt;title&gt;</code>/<code>&lt;meta&gt;</code> in any component and React hoists them to <code>&lt;head&gt;</code>." Mention it replaces react-helmet and works with SSR/streaming for SEO.`,
    examples: [
      {
        label: "Per-page metadata, colocated",
        runnable: false,
        code: `function BlogPost({ post }) {
  return (
    <article style={{ fontFamily: "system-ui", padding: 24 }}>
      {/* React 19 hoists these into <head> automatically */}
      <title>{post.title} — My Blog</title>
      <meta name="description" content={post.summary} />
      <link rel="canonical" href={"https://blog.example.com/" + post.slug} />

      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}

export default function App() {
  return <BlogPost post={{ title: "Hello", summary: "intro", slug: "hello", body: "…" }} />;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the resource preloading APIs in React 19 (`preload`, `preinit`, etc.)?",
    answer: `**Core concept.** React 19 (via <code>react-dom</code>) exposes functions that **hint the browser to load resources early** — <code>preload</code>, <code>preinit</code>, <code>preconnect</code>, and <code>prefetchDNS</code>. You call them during render to start fetching fonts, stylesheets, scripts, or to warm up a connection, improving load performance. React **deduplicates** the hints.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Tell the browser to fetch/connect early</text>
  <g font-size="9">
    <rect x="20" y="44" width="232" height="24" rx="5" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/><text x="32" y="60" fill="currentColor">preload(url, {as}) — fetch a resource</text>
    <rect x="20" y="74" width="232" height="24" rx="5" fill="#8b5cf6" fill-opacity="0.10" stroke="#8b5cf6"/><text x="32" y="90" fill="currentColor">preinit(url, {as}) — fetch + execute</text>
  </g>
  <g font-size="9">
    <rect x="268" y="44" width="232" height="24" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="280" y="60" fill="currentColor">preconnect(origin) — warm a connection</text>
    <rect x="268" y="74" width="232" height="24" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="280" y="90" fill="currentColor">prefetchDNS(origin) — resolve DNS</text>
  </g>
  <text x="260" y="120" fill="currentColor" font-size="9.5" text-anchor="middle">React dedupes + emits the right &lt;link&gt;/&lt;script&gt; hints</text>
</svg>`)}

**How it works.** These APIs map to browser resource hints. <code>preload(href, { as })</code> starts downloading a resource (font, style, image, script) you'll need soon. <code>preinit(href, { as })</code> goes further — it loads **and** initializes (executes a script or inserts a stylesheet) eagerly. <code>preconnect(origin)</code> opens an early connection (DNS + TCP + TLS) to a third-party origin, and <code>prefetchDNS(origin)</code> just resolves DNS. Calling them during render (even deep in a component) lets React emit the corresponding <code>&lt;link rel&gt;</code>/<code>&lt;script&gt;</code> tags and **dedupe** repeats, and it works with SSR so hints land in the initial HTML — reducing the round-trips that delay first paint.

### Preloading APIs
| API | Does |
| --- | --- |
| <code>preload</code> | fetch a resource early |
| <code>preinit</code> | fetch **and** execute/insert |
| <code>preconnect</code> | warm up a connection |
| <code>prefetchDNS</code> | resolve DNS ahead of time |

> **Interview tip:** "Imperative resource hints from <code>react-dom</code> — <code>preload</code>/<code>preinit</code> for resources, <code>preconnect</code>/<code>prefetchDNS</code> for connections." Note React dedupes them and they work with SSR to cut first-paint latency.`,
    examples: [
      {
        label: "Preload critical resources during render",
        runnable: false,
        code: `import { preload, preinit, preconnect } from "react-dom";

export default function App() {
  // hint the browser early — React emits the right tags and dedupes
  preconnect("https://cdn.example.com");
  preload("https://cdn.example.com/font.woff2", { as: "font", crossOrigin: "anonymous" });
  preinit("https://cdn.example.com/theme.css", { as: "style" });

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>Critical font/style requested ahead of time.</p>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does the `use()` hook do, and why is it special?",
    answer: `**Core concept.** <code>use()</code> reads the value of a **resource** during render: <code>use(promise)</code> unwraps a promise (suspending until it resolves), and <code>use(Context)</code> reads context. It's special because — unlike every other hook — it can be called **conditionally** (inside <code>if</code>/loops), since it doesn't rely on call-order state.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">use(): read a promise or context in render</text>
  <rect x="20" y="44" width="230" height="96" rx="10" fill="#06b6d4" fill-opacity="0.08" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="135" y="64" fill="#06b6d4" font-size="11" font-weight="700" text-anchor="middle">use(promise)</text>
  <text x="135" y="86" fill="currentColor" font-size="9" text-anchor="middle">suspends until resolved</text>
  <text x="135" y="104" fill="currentColor" font-size="9" text-anchor="middle">Suspense shows fallback</text>
  <text x="135" y="124" fill="#06b6d4" font-size="9" text-anchor="middle">declarative data reads</text>
  <rect x="270" y="44" width="230" height="96" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">special</text>
  <text x="385" y="86" fill="currentColor" font-size="9" text-anchor="middle">callable conditionally</text>
  <text x="385" y="104" fill="currentColor" font-size="9" text-anchor="middle">(inside if / loops)</text>
  <text x="385" y="124" fill="#22c55e" font-size="9" text-anchor="middle">also reads context</text>
</svg>`)}

**How it works.** The usual Rules of Hooks forbid conditional calls because React tracks hook state by call order. <code>use()</code> sidesteps that — it doesn't store hook state, it just reads a resource — so you may call it inside conditions or loops. With a **promise**, <code>use()</code> integrates with **Suspense**: it throws to suspend the component until the promise resolves, then returns the value (errors bubble to an Error Boundary). This makes data reads declarative — pair it with a Suspense fallback instead of manual loading flags. With **context**, <code>use(Context)</code> is like <code>useContext</code> but conditional-friendly. Note: don't create the promise *inside* the component on every render (it'd be new each time) — pass a cached/stable promise (from a framework or a memoized source).

### use() facts
| Aspect | Detail |
| --- | --- |
| reads | a promise or a context |
| with promise | suspends (Suspense) |
| conditional call | allowed (unlike other hooks) |
| errors | bubble to Error Boundary |

> **Interview tip:** "Reads a promise (suspends) or context, and can be called **conditionally**." Pair it with Suspense for declarative data; warn against creating the promise inline each render.`,
    examples: [
      {
        label: "use(promise) with Suspense",
        runnable: false,
        code: `import { use, Suspense } from "react";

function Greeting({ namePromise }) {
  const name = use(namePromise);     // suspends until the promise resolves
  return <h3>Hello, {name}!</h3>;
}

// the promise is created OUTSIDE render (stable), then passed in
const namePromise = new Promise((res) => setTimeout(() => res("Ada"), 500));

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Suspense fallback={<p>Loading…</p>}>
        <Greeting namePromise={namePromise} />
      </Suspense>
    </div>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does the `useActionState` hook do in React 19?",
    answer: `**Core concept.** <code>useActionState</code> manages the state of a **form Action**. You pass an async action function and an initial state; it returns <code>[state, formAction, isPending]</code>. Wire <code>formAction</code> to a <code>&lt;form action={…}&gt;</code>, and React tracks the **pending** status and the action's **returned result** for you — no manual loading/error state.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">[state, formAction, isPending] = useActionState(fn, init)</text>
  <rect x="20" y="50" width="150" height="50" rx="9" fill="#06b6d4" fill-opacity="0.10" stroke="#06b6d4"/>
  <text x="95" y="72" fill="#06b6d4" font-size="9.5" font-weight="700" text-anchor="middle">&lt;form action=</text>
  <text x="95" y="88" fill="currentColor" font-size="8.5" text-anchor="middle">{formAction}&gt;</text>
  <rect x="200" y="50" width="140" height="50" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/>
  <text x="270" y="72" fill="#f59e0b" font-size="9.5" font-weight="700" text-anchor="middle">isPending</text>
  <text x="270" y="88" fill="currentColor" font-size="8.5" text-anchor="middle">while awaiting</text>
  <rect x="370" y="50" width="130" height="50" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/>
  <text x="435" y="72" fill="#22c55e" font-size="9.5" font-weight="700" text-anchor="middle">state</text>
  <text x="435" y="88" fill="currentColor" font-size="8.5" text-anchor="middle">action result</text>
  <path d="M 170 75 L 198 75" stroke="currentColor" stroke-width="1.2" marker-end="url(#as-a)"/>
  <path d="M 340 75 L 368 75" stroke="currentColor" stroke-width="1.2" marker-end="url(#as-a)"/>
  <defs><marker id="as-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** React 19 introduces **Actions** — async functions you hand to a form's <code>action</code> prop. <code>useActionState(action, initialState)</code> wraps one: the returned <code>formAction</code> is what you pass to the form; on submit, React calls your <code>action(previousState, formData)</code>, flips <code>isPending</code> to <code>true</code> while it awaits, and stores whatever the action **returns** as the new <code>state</code> (great for validation errors or success messages). This removes the boilerplate of manual <code>loading</code>/<code>error</code>/<code>result</code> state and integrates with Server Actions. Pair it with <code>useFormStatus</code> (for nested submit buttons) and <code>useOptimistic</code> (for optimistic UI).

### useActionState returns
| Value | Meaning |
| --- | --- |
| <code>state</code> | the action's last return value |
| <code>formAction</code> | pass to <code>&lt;form action&gt;</code> |
| <code>isPending</code> | <code>true</code> while the action runs |
| action signature | <code>(prevState, formData) => newState</code> |

> **Interview tip:** "Manages a form Action's state — returns <code>[state, formAction, isPending]</code> and tracks pending + result automatically." Mention it pairs with <code>useFormStatus</code> and <code>useOptimistic</code>, and works with Server Actions.`,
    examples: [
      {
        label: "A form Action with pending + result",
        runnable: false,
        code: `import { useActionState } from "react";

async function subscribe(prevState, formData) {
  const email = formData.get("email");
  if (!email.includes("@")) return { error: "invalid email" };
  // await api.subscribe(email)
  return { message: "Subscribed " + email };
}

export default function App() {
  const [state, formAction, isPending] = useActionState(subscribe, {});
  return (
    <form action={formAction} style={{ padding: 24, fontFamily: "system-ui" }}>
      <input name="email" placeholder="email" />
      <button disabled={isPending}>{isPending ? "Submitting…" : "Subscribe"}</button>
      {state.error && <p style={{ color: "crimson" }}>{state.error}</p>}
      {state.message && <p style={{ color: "green" }}>{state.message}</p>}
    </form>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is `useFormStatus` in React 19, and why does it exist?",
    answer: `**Core concept.** <code>useFormStatus</code> (from <code>react-dom</code>) lets a component read the **submission status of the parent <code>&lt;form&gt;</code>** — most importantly <code>pending</code> — **without prop drilling**. It exists so reusable pieces like a design-system submit button can show a spinner/disable themselves during submission automatically.

${card(`<svg viewBox="0 0 520 150" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">A child reads the parent form's pending state</text>
  <rect x="160" y="38" width="200" height="34" rx="8" fill="#06b6d4" fill-opacity="0.12" stroke="#06b6d4" stroke-width="1.5"/>
  <text x="260" y="60" fill="#06b6d4" font-size="10" font-weight="700" text-anchor="middle">&lt;form action={fn}&gt;</text>
  <rect x="180" y="104" width="160" height="32" rx="7" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="260" y="124" fill="currentColor" font-size="9" text-anchor="middle">&lt;SubmitButton/&gt; reads pending</text>
  <path d="M 260 72 L 260 102" stroke="currentColor" stroke-width="1.3" marker-end="url(#fs-a)"/>
  <text x="420" y="60" fill="currentColor" font-size="9" text-anchor="middle">no props</text>
  <text x="420" y="74" fill="currentColor" font-size="9" text-anchor="middle">threaded down</text>
  <defs><marker id="fs-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** A submit button often needs to know "is the form submitting?" to disable itself and show a spinner. Passing that state down from wherever the form logic lives is tedious — especially for shared button components. <code>useFormStatus</code> reads the status of the **nearest enclosing <code>&lt;form&gt;</code>** from context-like plumbing React maintains, returning <code>{ pending, data, method, action }</code>. The component **must be rendered inside** that form (it reads the parent form, not its own). It pairs with React 19 form **Actions**/<code>useActionState</code>: the action defines what happens, and any nested control can reactively reflect the pending state. This keeps reusable form controls self-contained.

### useFormStatus
| Field | Meaning |
| --- | --- |
| <code>pending</code> | is the form submitting? |
| <code>data</code> | the submitted <code>FormData</code> |
| <code>method</code> | <code>get</code>/<code>post</code> |
| requirement | rendered inside a <code>&lt;form&gt;</code> |

> **Interview tip:** "Lets a child (e.g. a submit button) read the parent form's <code>pending</code> status without prop drilling." Must be **inside** the form; pairs with Actions/<code>useActionState</code> for self-contained form controls.`,
    examples: [
      {
        label: "A self-disabling submit button",
        runnable: false,
        code: `import { useFormStatus } from "react-dom";

// reusable button — knows nothing about the form's logic
function SubmitButton() {
  const { pending } = useFormStatus();     // reads the PARENT <form>
  return <button disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
}

export default function App() {
  async function save(formData) {
    await new Promise((r) => setTimeout(r, 800)); // pretend to submit
  }
  return (
    <form action={save} style={{ padding: 24, fontFamily: "system-ui" }}>
      <input name="name" placeholder="name" />
      <SubmitButton />                       {/* must be inside the form */}
    </form>
  );
}`,
      },
    ],
  },
];

export default augments;
